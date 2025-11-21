/**
 * Arabic Text Rendering Utility
 * 
 * This utility pre-renders Arabic text to an image using Node.js canvas
 * Then the image can be used with image-to-image generation to properly
 * incorporate Arabic text into generated images.
 */

import { createCanvas } from "canvas";

export interface TextRenderOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  width?: number;
  height?: number;
}

/**
 * Render Arabic text to a PNG image buffer
 * Returns base64 encoded PNG that can be used with image generation
 */
export async function renderArabicText(
  options: TextRenderOptions
): Promise<string> {
  const {
    text,
    fontSize = 48,
    fontFamily = "Arial",
    backgroundColor = "transparent",
    textColor = "#000000",
    padding = 20,
    width = 800,
    height = 200,
  } = options;

  try {
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Set background
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Set text properties
    ctx.font = `${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Measure text to center it properly
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Calculate position to center text
    const x = width / 2;
    const y = height / 2;

    // Draw text
    ctx.fillText(text, x, y);

    // Convert to base64 PNG
    const buffer = canvas.toBuffer("image/png");
    const base64 = buffer.toString("base64");

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Error rendering Arabic text:", error);
    throw new Error(`Failed to render Arabic text: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract Arabic text from a prompt
 * Returns the Arabic text and the modified prompt
 */
export function extractArabicText(prompt: string): {
  arabicText: string | null;
  modifiedPrompt: string;
} {
  // Match Arabic text patterns like "word 'عربي'" or "text: عربي"
  const arabicMatch = prompt.match(/['\"]([^\'"]*[\u0600-\u06FF]+[^\'"]*)['\"]|:\s*([\u0600-\u06FF]+)/);

  if (arabicMatch) {
    const arabicText = arabicMatch[1] || arabicMatch[2];
    // Remove the Arabic text from prompt for the AI model
    const modifiedPrompt = prompt
      .replace(/['\"]([^\'"]*[\u0600-\u06FF]+[^\'"]*)['\"]/, "")
      .replace(/:\s*([\u0600-\u06FF]+)/, "")
      .trim();

    return {
      arabicText: arabicText.trim(),
      modifiedPrompt: modifiedPrompt || prompt,
    };
  }

  return {
    arabicText: null,
    modifiedPrompt: prompt,
  };
}
