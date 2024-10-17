const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const sharp = require("sharp");
const { GoogleAuth } = require("google-auth-library");

admin.initializeApp();

const COLLECTION_AI_REQUESTS = "aiRequests";
const AI_API_URL = "https://fruit-detection-yolov9-test-6486616464.us-central1.run.app/predict";  // Your Cloud Run service URL
const STORAGE_FOLDER = "firefolder"; // The folder in the bucket where processed images will be stored

/**
 * Updates a Firestore document with the given data.
 * @param {FirebaseFirestore.DocumentReference} docRef - The document reference.
 * @param {Object} data - The data to update.
 * @return {Promise<void>}
 */
async function updateFirestore(docRef, data) {
  await docRef.set(data, { merge: true });
}

/**
 * Encodes an image buffer to base64.
 * @param {Buffer} imageBuffer - The image buffer to encode.
 * @return {Promise<string>} The base64 encoded image.
 */
async function encodeImage(imageBuffer) {
  const img = sharp(imageBuffer);
  const metadata = await img.metadata();

  const newWidth = Math.floor(metadata.width / 32) * 32;
  const newHeight = Math.floor(metadata.height / 32) * 32;

  const resizedBuffer = await img
    .resize(newWidth, newHeight)
    .toFormat("jpeg")
    .toBuffer();

  return resizedBuffer.toString("base64");
}

/**
 * Gets an identity token for authentication with the correct audience.
 * @return {Promise<string>} The identity token.
 */
async function getIdentityToken() {
  const auth = new GoogleAuth();

  // Use the AI_API_BASE_URL as the target audience
  const client = await auth.getIdTokenClient(AI_API_BASE_URL);

  // Fetch the headers which contain the Authorization token
  const headers = await client.getRequestHeaders();

  // Log the Authorization header and token for debugging
  console.log("Authorization Header:", headers.Authorization);

  // Extract the token part from the Bearer Authorization header
  return headers.Authorization.split(' ')[1];
}

/**
 * Processes an image using the AI API.
 * @param {string} imageUrl - The URL of the image to process.
 * @param {string} fileName - The name of the image file.
 * @return {Promise<Object>} The processing result.
 */
async function processImage(imageUrl, fileName) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data, "binary");
    const encodedImage = await encodeImage(imageBuffer);

    const payload = [{
      img: encodedImage,
      name: fileName,
    }];

    console.log(`Sending request for file: ${fileName}, payload size: ${JSON.stringify(payload).length} bytes`);

    const predictUrl = `${AI_API_BASE_URL}${PREDICT_ROUTE}`;
    console.log(`Sending request for file: ${fileName}, to URL: ${predictUrl}`);

    const identityToken = await getIdentityToken();

    const { data } = await axios.post(predictUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${identityToken}`,
      },
      timeout: 300000, // 5 minutes timeout
    });

    // Log the entire response for debugging
    console.log(`Received AI response for file: ${fileName}:`, JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error(`Error processing image ${fileName}:`, error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

/**
 * Converts base64 to image and uploads to Firebase Storage.
 * @param {string} base64Image - The base64 encoded image.
 * @param {string} fileName - The name of the image file.
 * @return {Promise<string>} The public URL of the uploaded image.
 */
async function uploadImageToStorage(base64Image, fileName) {
  const bucket = admin.storage().bucket(); // Use default bucket
  const imageBuffer = Buffer.from(base64Image, 'base64');
  const file = bucket.file(`${STORAGE_FOLDER}/${fileName}`);

  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/jpeg',
    },
  });

  await file.makePublic();

  return file.publicUrl(); // Use the built-in method to get the public URL
}

exports.processAiRequest = functions
  .runWith({ memory: "1GB", timeoutSeconds: 540 }) // 9 minutes timeout
  .firestore.document(`${COLLECTION_AI_REQUESTS}/{requestId}`)
  .onCreate(async (snap, context) => {
    const { requestId } = context.params;
    const requestData = snap.data();
    const { fileName, downloadURL, tokenId } = requestData;

    console.log(`[${requestId}] AI request received. File Name: ${fileName}, Token ID: ${tokenId}`);

    const docRef = snap.ref;

    try {
      await updateFirestore(docRef, {
        status: "processing",
        processingStartTime: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[${requestId}] Status updated to 'processing'`);

      console.log(`[${requestId}] Starting image processing`);
      const result = await processImage(downloadURL, fileName);
      console.log(`[${requestId}] Image processing completed`);

      let processedResult = {
        trees: [],
        visualizations: [],
        treeAppleCounts: {} // Object to store raw apple counts per tree
      };

      let rawDetectedCount = 0;

      if (result && result.predictions && result.predictions.length > 0) {
        const prediction = result.predictions[0];
        console.log(`[${requestId}] Processing prediction results`);

        if (prediction.tree_detections && prediction.tree_detections.length > 0) {
          processedResult.trees = prediction.tree_detections;
          console.log(`[${requestId}] ${prediction.tree_detections.length} trees detected`);
        }

        if (prediction.detections && prediction.detections.length > 0) {
          rawDetectedCount = prediction.detections.length;
          console.log(`[${requestId}] Raw detected apple count: ${rawDetectedCount}`);

          // Count apples per tree
          prediction.detections.forEach(detection => {
            const treeId = detection.assigned_tree;
            if (treeId !== undefined) {
              if (!processedResult.treeAppleCounts[treeId]) {
                processedResult.treeAppleCounts[treeId] = 0;
              }
              processedResult.treeAppleCounts[treeId]++;
            }
          });

          console.log(`[${requestId}] Raw apple counts per tree:`, JSON.stringify(processedResult.treeAppleCounts, null, 2));
        }

        if (prediction.visualization) {
          console.log(`[${requestId}] Uploading visualization image to Storage`);
          const visualizationUrl = await uploadImageToStorage(prediction.visualization, `${fileName}_processed.jpg`);
          processedResult.visualizations.push(visualizationUrl);
          console.log(`[${requestId}] Visualization image uploaded: ${visualizationUrl}`);
        }

        console.log(`[${requestId}] Calibrating apple counts`);
        const calibrationResult = await calibrateAppleCount(processedResult.treeAppleCounts);
        console.log(`[${requestId}] Calibration completed. Result:`, JSON.stringify(calibrationResult));

        let totalCalibratedCount = 0;
        for (const treeId in calibrationResult.calibrations) {
          totalCalibratedCount += calibrationResult.calibrations[treeId];
        }

        console.log(`[${requestId}] Updating Firestore with processed results`);
        await updateFirestore(docRef, {
          status: "completed",
          rawDetectedCount: rawDetectedCount,
          calibratedAppleCount: totalCalibratedCount,
          appleDetections: calibrationResult.calibrations,
          treeDetections: processedResult.trees,
          rawTreeAppleCounts: processedResult.treeAppleCounts,
          visualizations: processedResult.visualizations,
          processingEndTime: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[${requestId}] Firestore update completed`);

        console.log(`[${requestId}] Processing completed successfully for File Name: ${fileName}`);
      } else {
        console.log(`[${requestId}] No predictions found in the result`);
      }
    } catch (error) {
      console.error(`[${requestId}] Error processing File Name: ${fileName}`, error);
      console.error(`[${requestId}] Error stack:`, error.stack);
      if (error.response) {
        console.error(`[${requestId}] Error response data:`, error.response.data);
        console.error(`[${requestId}] Error response status:`, error.response.status);
      }
      await updateFirestore(docRef, {
        status: "error",
        error: error.message,
        errorStack: error.stack,
        processingEndTime: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[${requestId}] Firestore updated with error status`);
    }
  });

const AI_API_BASE_URL = "https://fruit-detection-yolov9-test-6486616464.us-central1.run.app";
const PREDICT_ROUTE = "/predict";
const CALIBRATE_ROUTE = "/calibrate";

/**
 * Calibrates the apple count using the AI API.
 * @param {Object} treeAppleCounts - Object containing raw apple counts per tree.
 * @return {Promise<Object>} The calibration result.
 */
async function calibrateAppleCount(treeAppleCounts) {
  try {
    const payload = Object.entries(treeAppleCounts).map(([treeId, count]) => ({
      tree_id: treeId,
      detected: count
    }));

    console.log(`Sending calibration request for tree counts:`, JSON.stringify(payload));

    const identityToken = await getIdentityToken();

    const calibrationUrl = `${AI_API_BASE_URL}${CALIBRATE_ROUTE}`;
    console.log(`Calibration URL: ${calibrationUrl}`);

    const { data } = await axios.post(calibrationUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${identityToken}`,
      },
      timeout: 300000, // 5 minutes timeout
    });

    console.log(`Received calibration response:`, JSON.stringify(data, null, 2));

    // Process the calibration response
    const calibrations = {};
    if (data && data.calibrations && Array.isArray(data.calibrations)) {
      Object.keys(treeAppleCounts).forEach((treeId, index) => {
        if (index < data.calibrations.length) {
          calibrations[treeId] = data.calibrations[index];
        }
      });
    } else {
      console.error("Unexpected calibration response format:", data);
      throw new Error("Unexpected calibration response format");
    }

    return { calibrations };
  } catch (error) {
    console.error(`Error calibrating apple count:`, error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    console.error("Error config:", error.config);

    throw error;
  }
}
