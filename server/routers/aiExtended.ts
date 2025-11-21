import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getConversation, createMessage, getFiles } from "../db";
import { transcribeAudio, analyzeFile, generateReport, extractStructuredData } from "../_core/advancedCapabilities";

export const aiExtendedRouter = router({
  // Transcribe audio file
  transcribeAudioFile: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        fileUrl: z.string().url(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        console.log("Transcribing audio file:", input.fileUrl);
        const result = await transcribeAudio(input.fileUrl, input.mimeType);

        const message = await createMessage(
          input.conversationId,
          ctx.user.id,
          "assistant",
          `Audio Transcription:\n\n${result.text}`
        );

        return {
          success: true,
          transcription: result.text,
          messageId: message?.id,
        };
      } catch (error) {
        console.error("Error transcribing audio:", error);
        throw error;
      }
    }),

  // Analyze file content
  analyzeFileContent: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        fileUrl: z.string().url(),
        filename: z.string(),
        mimeType: z.string(),
        userPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        console.log("Analyzing file:", input.filename);
        const analysis = await analyzeFile(
          input.fileUrl,
          input.filename,
          input.mimeType,
          input.userPrompt
        );

        const message = await createMessage(
          input.conversationId,
          ctx.user.id,
          "assistant",
          `File Analysis: ${input.filename}\n\n${analysis.summary}`
        );

        return {
          success: true,
          analysis,
          messageId: message?.id,
        };
      } catch (error) {
        console.error("Error analyzing file:", error);
        throw error;
      }
    }),

  // Generate report from multiple files
  generateReportFromFiles: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        fileIds: z.array(z.number()),
        reportPrompt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        const allFiles = await getFiles(input.conversationId, undefined);
        const selectedFiles = allFiles.filter((f) => input.fileIds.includes(f.id));

        if (selectedFiles.length === 0) {
          throw new Error("No files found for report generation");
        }

        console.log("Generating report from", selectedFiles.length, "files");
        const report = await generateReport(
          selectedFiles.map((f) => ({
            url: f.url,
            filename: f.filename,
            mimeType: f.mimeType || "application/octet-stream",
          })),
          input.reportPrompt
        );

        const message = await createMessage(
          input.conversationId,
          ctx.user.id,
          "assistant",
          `Generated Report\n\n${report}`
        );

        return {
          success: true,
          report,
          messageId: message?.id,
        };
      } catch (error) {
        console.error("Error generating report:", error);
        throw error;
      }
    }),

  // Extract structured data from file
  extractDataFromFile: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        fileUrl: z.string().url(),
        filename: z.string(),
        mimeType: z.string(),
        schema: z.record(z.string(), z.unknown()),
        schemaName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        console.log("Extracting data from:", input.filename);
        const extractedData = await extractStructuredData(
          input.fileUrl,
          input.filename,
          input.mimeType,
          input.schema,
          input.schemaName
        );

        const message = await createMessage(
          input.conversationId,
          ctx.user.id,
          "assistant",
          `Data Extraction from ${input.filename}\n\n\`\`\`json\n${JSON.stringify(extractedData, null, 2)}\n\`\`\``
        );

        return {
          success: true,
          data: extractedData,
          messageId: message?.id,
        };
      } catch (error) {
        console.error("Error extracting data:", error);
        throw error;
      }
    }),
});
