import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, createConversation, getConversations, getConversation, deleteConversation, createMessage, getMessages, deleteMessage, createFile, getFiles, createImageReference, getImageReferences } from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { generateImage, GenerateImageOptions } from "../_core/imageGeneration";
import { transcribeAudio, analyzeFile, generateReport, extractStructuredData } from "../_core/advancedCapabilities";
import { files } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const aiRouter = router({
  // Health check endpoint
  healthCheck: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return { status: "error", message: "Database not available" };
      }
      return { status: "ok", message: "Database connection successful" };
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  // Create a new conversation
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        console.log("Creating conversation for user:", ctx.user.id);
        const conversation = await createConversation(
          ctx.user.id,
          input.title,
          input.description
        );

        if (!conversation) {
          throw new Error("Failed to create conversation: database returned null");
        }

        console.log("Conversation created:", conversation);
        return conversation;
      } catch (error) {
        console.error("Error creating conversation:", error);
        throw error;
      }
    }),

  // Get all conversations for the current user
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user || !ctx.user.id) {
        throw new Error("User not authenticated");
      }

      const convs = await getConversations(ctx.user.id);
      return convs;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  }),

  // Get a specific conversation
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        return conv;
      } catch (error) {
        console.error("Error fetching conversation:", error);
        throw error;
      }
    }),

  // Delete a conversation
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const result = await deleteConversation(input.conversationId, ctx.user.id);
        return result;
      } catch (error) {
        console.error("Error deleting conversation:", error);
        throw error;
      }
    }),

  // Get messages for a conversation
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        // Verify user owns this conversation
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        const msgs = await getMessages(input.conversationId);
        return msgs;
      } catch (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }
    }),

  // Delete a file
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        // Verify user owns this file
        const file = await db
          .select()
          .from(files)
          .where(eq(files.id, input.fileId))
          .limit(1);

        if (!file || file.length === 0 || file[0].userId !== ctx.user.id) {
          throw new Error("File not found or unauthorized");
        }

        // Delete from database
        await db.delete(files).where(eq(files.id, input.fileId));

        return { success: true };
      } catch (error) {
        console.error("[Database] Failed to delete file:", error);
        throw error;
      }
    }),

  // Delete a message
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        const result = await deleteMessage(input.messageId, ctx.user.id);
        return result;
      } catch (error) {
        console.error("Error deleting message:", error);
        throw error;
      }
    }),

  // Send a message and get AI response
  chat: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        message: z.string().min(1),
        files: z.array(z.number()).optional(),
        imageReferences: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        // Verify user owns this conversation
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        // Save user message
        const userMsg = await createMessage(
          input.conversationId,
          ctx.user.id,
          "user",
          input.message
        );

        if (!userMsg) {
          throw new Error("Failed to save user message");
        }

        // Get conversation history for context
        const history = await getMessages(input.conversationId);

        // Build message array for LLM
        const llmMessages = history.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));

        // Call LLM for response
        console.log("Calling LLM with", llmMessages.length, "messages");
        const llmResponse = await invokeLLM({
          messages: llmMessages,
        });

        let responseContent = "I could not generate a response.";
        const content = llmResponse.choices[0]?.message?.content;
        if (typeof content === "string") {
          responseContent = content;
        } else if (Array.isArray(content) && content.length > 0) {
          // Handle array of content items
          const textContent = content.find((c: any) => c.type === "text");
          if (textContent && "text" in textContent) {
            responseContent = textContent.text;
          }
        }

        // Save AI response
        const aiMsg = await createMessage(
          input.conversationId,
          ctx.user.id,
          "assistant",
          responseContent
        );

        if (!aiMsg) {
          throw new Error("Failed to save AI response");
        }

        return {
          message: responseContent,
          messageId: aiMsg.id,
        };
      } catch (error) {
        console.error("Error in chat:", error);
        throw error;
      }
    }),

  // Upload a file
  uploadFile: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        filename: z.string(),
        fileData: z.string(), // base64 encoded file data
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        // Verify user owns this conversation
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        // Convert base64 string to Buffer
        const buffer = Buffer.from(input.fileData, 'base64');

        // Check file size (10MB limit)
        const MAX_FILE_SIZE = 100 * 1024 * 1024;
        if (buffer.length > MAX_FILE_SIZE) {
          throw new Error(`File is too large. Maximum size is 100MB, got ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        }

        // Upload to S3
        const fileKey = `${ctx.user.id}/files/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(
          fileKey,
          buffer,
          input.mimeType || "application/octet-stream"
        );

        // Save file metadata
        const file = await createFile(
          ctx.user.id,
          input.filename,
          fileKey,
          url,
          input.mimeType,
          buffer.length,
          input.conversationId
        );

        if (!file) {
          throw new Error("Failed to save file metadata");
        }

        return file;
      } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
      }
    }),

  // Get files for a conversation
  getFiles: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        // Verify user owns this conversation
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        const fileList = await getFiles(input.conversationId);
        return fileList;
      } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
      }
    }),

  // Generate image (supports both text-to-image and image-to-image editing)
  generateImage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        prompt: z.string().min(1),
        imageReferenceIds: z.array(z.number()).optional(), // IDs of images to edit
        originalImages: z.array(z.object({
          url: z.string(),
          mimeType: z.string().optional(),
        })).optional(), // Direct image URLs for editing uploaded files
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        // Verify user owns this conversation
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        // Get original images if editing
        let originalImages: Array<{ url: string; mimeType?: string }> = [];
        
        // Use provided originalImages if available (for editing uploaded files)
        if (input.originalImages && input.originalImages.length > 0) {
          originalImages = input.originalImages;
        } else if (input.imageReferenceIds && input.imageReferenceIds.length > 0) {
          const allImageRefs = await getImageReferences(input.conversationId);
          originalImages = allImageRefs
            .filter((img) => input.imageReferenceIds!.includes(img.id))
            .map((img) => ({
              url: img.imageUrl,
              mimeType: img.mimeType || "image/png", // Use actual mimeType if available, otherwise default
            }));
        }
        
        if (originalImages.length > 0) {
          console.log("Editing images, found", originalImages.length, "images");
        }

        // Generate image (with editing support if originalImages provided)
        console.log("Generating image with prompt:", input.prompt);
        const generateParams: GenerateImageOptions = {
          prompt: input.prompt,
          originalImages: originalImages.length > 0 ? originalImages : undefined,
        };
        const result = await generateImage(generateParams);
        const imageUrl = result?.url || "";
        if (!imageUrl) {
          throw new Error("Failed to generate image");
        }

        // Save image reference
        const imageKey = `${ctx.user.id}/images/${Date.now()}.png`;
        const imageRef = await createImageReference(
          ctx.user.id,
          input.conversationId,
          imageUrl,
          imageKey,
          input.prompt
        );

        if (!imageRef) {
          throw new Error("Failed to save image reference");
        }

        return imageRef;
      } catch (error) {
        console.error("Error generating image:", error);
        throw error;
      }
    }),

  // Get image references for a conversation
  getImageReferences: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || !ctx.user.id) {
          throw new Error("User not authenticated");
        }

        // Verify user owns this conversation
        const conv = await getConversation(input.conversationId, ctx.user.id);
        if (!conv) {
          throw new Error("Conversation not found");
        }

        const refs = await getImageReferences(input.conversationId);
        return refs;
      } catch (error) {
        console.error("Error fetching image references:", error);
        throw error;
      }
    }),
});
