/**
 * Advanced AI capabilities module
 * Integrates voice transcription, file analysis, and enhanced processing
 */

import { ENV } from "./env";
import { invokeLLM, Message } from "./llm";

export type TranscriptionResult = {
  text: string;
  duration?: number;
  language?: string;
};

export type FileAnalysisResult = {
  summary: string;
  keyPoints: string[];
  fileType: string;
  metadata?: Record<string, unknown>;
};

/**
 * Transcribe audio/video files to text using Manus voice transcription
 */
export async function transcribeAudio(
  fileUrl: string,
  mimeType: string = "audio/mpeg"
): Promise<TranscriptionResult> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error("Manus API credentials not configured");
  }

  try {
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    
    const fullUrl = new URL(
      "voice.v1.VoiceService/TranscribeAudio",
      baseUrl
    ).toString();

    console.log("Transcribing audio from URL:", fileUrl);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        "authorization": `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        audio_url: fileUrl,
        language: "auto",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Transcription failed (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
    }

    const result = (await response.json()) as {
      text: string;
      duration?: number;
      language?: string;
    };

    console.log("Transcription completed, text length:", result.text.length);

    return {
      text: result.text,
      duration: result.duration,
      language: result.language,
    };
  } catch (error) {
    console.error("Audio transcription error:", error);
    throw error;
  }
}

/**
 * Analyze file content using AI
 * Supports PDFs, documents, code files, and more
 */
export async function analyzeFile(
  fileUrl: string,
  filename: string,
  mimeType: string,
  userPrompt?: string
): Promise<FileAnalysisResult> {
  try {
    console.log("Analyzing file:", filename, "Type:", mimeType);

    // Build analysis prompt based on file type
    let analysisPrompt = userPrompt || buildDefaultAnalysisPrompt(filename, mimeType);

    // For PDFs and documents, we'll use the LLM with file_url content
    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are an expert file analyzer. Analyze the provided file and give a comprehensive summary with key points.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: analysisPrompt,
          },
          {
            type: "file_url",
            file_url: {
              url: fileUrl,
              mime_type: normalizeMimeType(mimeType),
            },
          },
        ],
      },
    ];

    const result = await invokeLLM({
      messages,
      maxTokens: 2000,
    });

    const responseContent = result.choices[0]?.message?.content;
    let analysisText = "";

    if (typeof responseContent === "string") {
      analysisText = responseContent;
    } else if (Array.isArray(responseContent)) {
      const textContent = responseContent.find((c: any) => c.type === "text");
      if (textContent && "text" in textContent) {
        analysisText = textContent.text;
      }
    }

    // Parse the analysis to extract key points
    const keyPoints = extractKeyPoints(analysisText);

    return {
      summary: analysisText,
      keyPoints,
      fileType: mimeType,
    };
  } catch (error) {
    console.error("File analysis error:", error);
    throw error;
  }
}

/**
 * Generate a comprehensive report from multiple files
 */
export async function generateReport(
  files: Array<{
    url: string;
    filename: string;
    mimeType: string;
  }>,
  reportPrompt: string
): Promise<string> {
  try {
    console.log("Generating report from", files.length, "files");

    // Build content array with all files
    const contentParts: any[] = [
      {
        type: "text",
        text: reportPrompt,
      },
    ];

    for (const file of files) {
      contentParts.push({
        type: "file_url",
        file_url: {
          url: file.url,
          mime_type: normalizeMimeType(file.mimeType),
        },
      });
    }

    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are an expert report generator. Create a comprehensive, well-structured report based on the provided files and instructions.",
      },
      {
        role: "user",
        content: contentParts,
      },
    ];

    const result = await invokeLLM({
      messages,
      maxTokens: 4000,
    });

    const responseContent = result.choices[0]?.message?.content;
    let reportText = "";

    if (typeof responseContent === "string") {
      reportText = responseContent;
    } else if (Array.isArray(responseContent)) {
      const textContent = responseContent.find((c: any) => c.type === "text");
      if (textContent && "text" in textContent) {
        reportText = textContent.text;
      }
    }

    return reportText;
  } catch (error) {
    console.error("Report generation error:", error);
    throw error;
  }
}

/**
 * Extract structured data from files using JSON schema
 */
export async function extractStructuredData(
  fileUrl: string,
  filename: string,
  mimeType: string,
  schema: Record<string, unknown>,
  schemaName: string = "ExtractedData"
): Promise<Record<string, unknown>> {
  try {
    console.log("Extracting structured data from:", filename);

    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are an expert data extraction specialist. Extract data from the provided file according to the specified schema.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all relevant data from this file according to the provided schema.",
          },
          {
            type: "file_url",
            file_url: {
              url: fileUrl,
              mime_type: normalizeMimeType(mimeType),
            },
          },
        ],
      },
    ];

    const result = await invokeLLM({
      messages,
      outputSchema: {
        name: schemaName,
        schema,
      },
    });

    const responseContent = result.choices[0]?.message?.content;
    let jsonText = "";

    if (typeof responseContent === "string") {
      jsonText = responseContent;
    } else if (Array.isArray(responseContent)) {
      const textContent = responseContent.find((c: any) => c.type === "text");
      if (textContent && "text" in textContent) {
        jsonText = textContent.text;
      }
    }

    try {
      return JSON.parse(jsonText);
    } catch {
      console.warn("Failed to parse JSON response, returning raw text");
      return { raw_response: jsonText };
    }
  } catch (error) {
    console.error("Data extraction error:", error);
    throw error;
  }
}

// Helper functions

function buildDefaultAnalysisPrompt(filename: string, mimeType: string): string {
  const fileType = getFileTypeDescription(mimeType);
  return `Please analyze this ${fileType} file (${filename}) and provide:
1. A comprehensive summary of the content
2. Key points and important information
3. Any notable patterns or insights
4. Recommendations if applicable`;
}

function getFileTypeDescription(mimeType: string): string {
  if (mimeType.includes("pdf")) return "PDF document";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "Word document";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "spreadsheet";
  if (mimeType.includes("text")) return "text file";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("audio")) return "audio file";
  if (mimeType.includes("video")) return "video file";
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return "archive file";
  return "file";
}

function normalizeMimeType(
  mimeType: string
): "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" {
  const normalized = mimeType.toLowerCase();

  if (normalized.includes("pdf")) return "application/pdf";
  if (normalized.includes("mp3") || normalized.includes("mpeg"))
    return "audio/mpeg";
  if (normalized.includes("wav")) return "audio/wav";
  if (normalized.includes("mp4")) {
    if (normalized.includes("audio")) return "audio/mp4";
    return "video/mp4";
  }

  // Default to audio/mpeg for unknown audio types
  if (normalized.includes("audio")) return "audio/mpeg";
  if (normalized.includes("video")) return "video/mp4";

  return "application/pdf";
}

function extractKeyPoints(text: string): string[] {
  const keyPoints: string[] = [];

  // Split by common delimiters
  const lines = text.split(/[\n•\-*]/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Extract lines that look like key points (not too short, not too long)
    if (trimmed.length > 10 && trimmed.length < 200 && !trimmed.includes("http")) {
      keyPoints.push(trimmed);
    }
  }

  // Return top 5 key points
  return keyPoints.slice(0, 5);
}
