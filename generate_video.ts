import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function main() {
  try {
    console.log("Reading poster image...");
    const imagePath = path.join(process.cwd(), 'public', 'logo-dark.jpg');
    let imageObject;
    
    if (fs.existsSync(imagePath)) {
      const imageBytes = fs.readFileSync(imagePath).toString('base64');
      imageObject = {
        imageBytes: imageBytes,
        mimeType: 'image/jpeg'
      };
      console.log("Image loaded successfully.");
    } else {
      console.log("No poster image found, using text-only generation.");
    }

    console.log("Generating video outline...");
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: 'A futuristic, hyper-realistic cinematic promo video for an AI marketing platform called AnunciaMarket. Glowing golden neural networks and data streams integrating with a business dashboard, showing autonomous decision making and symbiotic growth. Sleek dark aesthetic with neon gold accents.',
      image: imageObject,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    console.log("Operation created. Polling for completion...");
    while (!operation.done) {
      console.log("Still generating... waiting 10s");
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        console.error("No video URI in response:", JSON.stringify(operation.response, null, 2));
        process.exit(1);
    }

    console.log("Video generated! Downloading from", downloadLink);
    const downloadRes = await fetch(downloadLink, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!downloadRes.ok) {
        console.error("Failed to download video:", downloadRes.statusText);
        process.exit(1);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const outputPath = path.join(process.cwd(), 'public', 'promo-video.mp4');
    fs.writeFileSync(outputPath, buffer);
    console.log("Video saved to", outputPath);
  } catch (error) {
    console.error("Error during generation:", error);
    process.exit(1);
  }
}

main();
