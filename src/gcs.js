// /Users/liaurora/git/cloud-tasks-pizza-map/src/gcs.js

/**
 * Interacts with Google Cloud Storage (GCS) to list objects in a bucket.
 */

const { Storage } = require('@google-cloud/storage');

// Creates a client
const storage = new Storage();

/**
 * Lists objects in the specified GCS bucket, with pagination.
 *
 * @param {string} bucketName The name of the GCS bucket.
 * @param {number} [pageSize=50] The number of objects to list per page.
 * @param {string} [pageToken] The token for the next page of results.
 * @returns {Promise<{fileNames: string[], nextPageToken: string | null}>} A promise that resolves to an object containing:
 *   - fileNames: An array of object names (filenames) in the current page.
 *   - nextPageToken: A token for the next page of results, or null if there are no more pages.
 * @throws {Error} If there's an error listing the objects.
 */
async function listObjects(bucketName, pageSize = 50, pageToken = null) {
  try {
    if (bucketName.startsWith('gs://') ){
      bucketName = bucketName.slice(5);
    }
    
    const [bucket, prefix] = bucketName.split(/\/(.*)/s);


    // Lists files in the bucket
    const [files] = await storage.bucket(bucket).getFiles({prefix: prefix,});

    // Extract the names of the files
    const fileNames = files.map(file => `gs://${bucket}/${file.name}`);

    // Get the next page token from the API response
    // const nextPageToken = files.nextPageToken || null;

    return  fileNames;
  } catch (error) {
    console.error('Error listing objects in GCS bucket:', error);
    throw new Error(`Failed to list objects in bucket ${bucketName}: ${error.message}`);
  }
}

module.exports.listObjects = async (req, res) => {
      // Only handle valid requests
  const bucket = req.query.bucket;
  if (!bucket) return res.send({error: 'No ?bucket='});
  const fileList = await listObjects(bucket);
  res.send(fileList);
}
