const fetch = require('node-fetch');

const PROJECT = process.env.PROJECT || 'serverless-com-demo';
const LOCATION = process.env.LOCATION || 'us-central1';


async function analyzeImage(imageUrl) {
  

  const imageParts = [
    {
      inlineData: {
        data: await fileToGenerativePart(imageUrl, "image/png"),
        mimeType: "image/png",
      },
    },
  ];

  const response = await fetch(`https://${LOCATION}-aiplatform.googleapis.com/v1/${PROJECT}/locations/${LOCATION}/publishers/google/models/gemini-2.0-flash-001:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
    })
  })

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  const text = json.candidates[0].content.parts[0].text;
  return text;
}

async function fileToGenerativePart(path, mimeType) {
  const response = await fetch(path);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

module.exports.analyzeImage = analyzeImage;
