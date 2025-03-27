// Copyright 2019 Google LLC
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     https://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const fetch = require('node-fetch');
const {v2beta3} = require('@google-cloud/tasks'); // Must be v2beta3 or else tasks creation fails
const client = new v2beta3.CloudTasksClient();

// Application configuration
const PROJECT = process.env.PROJECT || 'vertex-playground-450820';
const QUEUE = process.env.QUEUE || 'my-queue';
const LOCATION = process.env.LOCATION || 'us-central1';

// Construct the fully qualified queue name.
const parent = client.queuePath(PROJECT, LOCATION, QUEUE);

/**
 * Gets a list of cities.
 * @returns {string[]} A list of city names.
 */
async function getFileNames(gcsBucket) {
  const GET_API_BASE_URL = () => {
    let URL = 'http://localhost:8080';
    const isLocalhost = true;
    const isRun = false;
    if (!isLocalhost && !isRun) {
      // include project ID in URL if GCF (e.g. not localhost or Run)
      // TODO(developer) Change the project ID to your project if deploying to GCF.
      URL += '/tasks-pizza';
    }
    return URL;
  };
  const URL_LOCATIONS = `${GET_API_BASE_URL()}/gcs/list?bucket=${gcsBucket}`;
  const response = await fetch(URL_LOCATIONS, {method: 'GET'});
  const json = await response.json();
  if (json.error) throw new Error(json.error);
  return json;ß

}


/**
 * Creates a Task Queue with rate limits.
 * @param {string} queueName The Cloud Tasks queue name.
 */
async function createQueue(queueName) {
  const request = {
    parent: client.locationPath(PROJECT, LOCATION),
    queue: {
      name: client.queuePath(PROJECT, LOCATION, queueName),
      rateLimits: {
        maxConcurrentDispatches: 100,
        maxDispatchesPerSecond: 500,
      },
      retryConfig: {
        maxAttempts: 5,
        maxRetryDuration: {seconds: 3600},
        minBackoff: {seconds: 0, nanos: 10000000},
        maxBackoff: {seconds: 100},
      },
    },
  };
  const res = await client.createQueue(request);
  return res;
}


/**
 * Returns `true` if a queue with `queueName` exists.
 * @param {string} queueName The queue name to check.
 * @returns `true` if the queue exists.
 */
async function queueExists(queueName) {
  const queuePath = client.queuePath(PROJECT, LOCATION, queueName);
  const request = {
    parent: client.locationPath(PROJECT, LOCATION),
  };
  try {
    const [response] = await client.listQueues(request);
    const queueExists = response.some(queue => queue.name === queuePath);
    return queueExists;
  } catch (error) {
    console.error(`Error listing queues:`, error);
    throw error;
  }
}

/**
 * Creates a named Cloud Task.
 * Note: The the placeName can't be added frequently as the Task de-duplication window is ~1h.
 * @param {string} placeName The name of the city/place to target for our HTTP request.
 * @see https://cloud.google.com/tasks/docs/quotas
 */
async function createTask(url) {
  // const normalizedName = placeName.normalize('NFD')
  //     .replace(/[\u0300-\u036f]/g, '') // Remove accents
  //     .replace(/[^a-zA-Z]+/g, "-"); // Only keep [a-zA-Z]
  // const name = client.taskPath(PROJECT, LOCATION, QUEUE, normalizedName);
  const GET_API_BASE_URL = () => {
    let URL = `https://${K_SERVICE}-${K_REVISION}-${PROJECT.replace(/-/g, "")}.a.run.app`;
  
    const isLocalhost = true;
    const isRun = true;
    if (isLocalhost) { URL = `http://localhost:8080`}
    if (isLocalhost || isRun) {
      // include project ID in URL if GCF (e.g. not localhost or Run)
      // TODO(developer) Change the project ID to your project if deploying to GCF.
      URL += '/gemini/analyze?url=';
    }
    return URL;
  };
  const parts = url.split('/');
  const normalizedName = parts[parts.length-1].normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '') // Remove accents
  .replace(/[^a-zA-Z]+/g, ""); 
  const index = `1`;
  const name = client.taskPath(PROJECT, LOCATION, QUEUE, `${normalizedName}${index}`);
  const imageParts = [
    {
      uri: `${url}`,
        mimeType: "image/jpeg",
      
    },
  ];
  // const task = {
  //   name,
  //   httpRequest: {
  //     httpMethod: 'POST',      
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
      
  //     // url: `${GET_API_BASE_URL()}/gemini/analyze?url=${url}`,
  //     url: `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/gemini-2.0-flash-001:generateContent`,
  //   },
  // };
  const task = {
    name,
    httpRequest: {
      httpMethod: 'GET',      
      headers: {
        'Content-Type': 'application/json',
      },
      url: `${GET_API_BASE_URL()}${url}`
    }
  }
  const payload = JSON.stringify({
    "contents": [
      {
        "parts": [
          {
            "text": "What is this image about?"
          },
           ...imageParts
        ]
      }
    ]
  });
  task.httpRequest.body = Buffer.from(payload).toString('base64');
  

  // Send create task request.
  
  // const task = {
  //   name,
  //   httpRequest: {
  //     httpMethod: 'GET',
  //     url: `${GET_API_BASE_URL()}/gemini/analyze?url=${url}`,
  //   },
  // }
  const request = {parent, task};
  try {
    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);  
  } catch (e) {
    console.error(`ERROR: ${e} (${name})`);
  }
}

/**
 * Runs the program.
 * - Creates Cloud Tasks Queue if needed
 * - Creates N Cloud Tasks
 */
async function run(gcs) {
  console.log('Starting...');

  console.log('Checking if queue exists...');
  if (!(await queueExists(QUEUE))) {
    console.log(`Creating queue "${QUEUE}"...`);
    await createQueue(QUEUE);

  } else {
    console.log(`Queue "${QUEUE}" exists.`);
  }

  console.log('Creating Tasks...');
  const files = await getFileNames(gcs);
  for (const loc of files) {
    await createTask(loc);
  }
  console.log('Done.');
}

// Export routes for Express app
module.exports.listnames = async (req, res) => {
  const fileList = await getFileNames(gcs);
  res.send(fileList);
}
module.exports.start = async (req, res) => {
  const gcsBucket = req.query.bucket;
  await run(gcsBucket);
  res.sendStatus(200);
}
