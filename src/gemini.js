const fetch = require('node-fetch');

const PROJECT = process.env.PROJECT || 'vertex-playground-450820';
const LOCATION = process.env.LOCATION || 'us-central1';


async function analyzeImage(imageUrl) {
  

  const imageParts = [
    {
      inlineData: {
        url: imageUrl,
        mimeType: "image/jpeg",
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

// async function fileToGenerativePart(path, mimeType) {
//   const response = await fetch(path);
//   const arrayBuffer = await response.arrayBuffer();
//   return Buffer.from(arrayBuffer).toString("base64");
// }

module.exports.analyzeImage = async (req, res) => {
  const url = req.query.url;
  if (!url) return res.send({error: 'No ?id='});
  const summary = await analyzeImage(url);
  await firestore.storeAiOutput(url, summary);
  res.send(summary);
};


// Returns a list of map names in the Firestore database.
module.exports.listnames = async (req, res) => {
  const images = await firestore.getImages();
  res.send(images);
};


module.exports.get = async (req, res) => {
  const imageUrl = req.query.id;
  if (!imageUrl) return res.send({error: 'No ?url='});
  const aiOutput = await firestore.getAiOutput(imageUrl);
  res.send(aiOutput);
};