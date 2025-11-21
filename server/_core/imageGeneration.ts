'''/**
 * Image generation helper using OpenAI DALL-E API
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 */
// import { storagePut } from "server/storage"; // User must implement their own storage
import { ENV } from "./env";
// import { extractArabicText, renderArabicText } from "./arabicTextRenderer"; // Removed Manus-specific Arabic text rendering

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.openAiApiBase) {
    throw new Error("OPENAI_API_BASE is not configured");
  }
  if (!ENV.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Build the full URL for OpenAI DALL-E API
  const baseUrl = ENV.openAiApiBase.endsWith("/")
    ? ENV.openAiApiBase
    : `${ENV.openAiApiBase}/`;
  const fullUrl = new URL(
    "v1/images/generations",
    baseUrl
  ).toString();

  // NOTE: Arabic text rendering is a Manus-specific feature and is disabled for open-source.
  let enhancedPrompt = options.prompt;

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${ENV.openAiApiKey}`,
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      model: "dall-e-3", // Specify DALL-E 3 model
      n: 1, // Number of images to generate
      size: "1024x1024", // Image size
      response_format: "b64_json", // Request base64 format
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    data: Array<{
      b64_json: string;
    }>;
  };

  const base64Data = result.data[0].b64_json;

  // NOTE: The original code used a Manus-specific S3 storage utility (storagePut).
  // For open-source, you must implement your own file storage solution (e.g., AWS S3, local file system, or a different cloud storage).
  // For now, we will return a mock URL and log the base64 data.
  console.log("Generated Image (base64):", base64Data.substring(0, 100) + "...");

  // const buffer = Buffer.from(base64Data, "base64");
  // const { url } = await storagePut(
  //   `generated/${Date.now()}.png`,
  //   buffer,
  //   "image/png"
  // );

  return {
    url: `data:image/png;base64,${base64Data}`, // Return a data URI as a placeholder
  };
}
'''
