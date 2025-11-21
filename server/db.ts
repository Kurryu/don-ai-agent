import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

import { desc } from "drizzle-orm";
import { conversations, messages, files, imageReferences, InsertConversation, InsertMessage, InsertFile, InsertImageReference } from "../drizzle/schema";

// Conversation queries
export async function createConversation(
  userId: number,
  title: string,
  description?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.insert(conversations).values({
      userId,
      title,
      description: description || null,
    });

    const created = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    return created[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create conversation:", error);
    throw error;
  }
}

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conversations: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.updatedAt);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get conversations:", error);
    return [];
  }
}

export async function getConversation(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conversation: database not available");
    return null;
  }

  try {
    const { and } = await import("drizzle-orm");
    const result = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get conversation:", error);
    return null;
  }
}

export async function deleteConversation(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const conv = await getConversation(conversationId, userId);
    if (!conv) {
      throw new Error("Conversation not found or not owned by user");
    }

    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(files).where(eq(files.conversationId, conversationId));
    await db
      .delete(imageReferences)
      .where(eq(imageReferences.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete conversation:", error);
    throw error;
  }
}

// Message queries
export async function createMessage(
  conversationId: number,
  userId: number,
  role: "user" | "assistant" | "system",
  content: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.insert(messages).values({
      conversationId,
      userId,
      role,
      content,
    });

    const created = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return created[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create message:", error);
    throw error;
  }
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get messages: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get messages:", error);
    return [];
  }
}

// File queries
export async function createFile(
  userId: number,
  filename: string,
  fileKey: string,
  url: string,
  mimeType?: string,
  size?: number,
  conversationId?: number,
  messageId?: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.insert(files).values({
      userId,
      filename,
      fileKey,
      url,
      mimeType: mimeType || null,
      size: size || null,
      conversationId: conversationId || null,
      messageId: messageId || null,
    });

    const created = await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt))
      .limit(1);

    return created[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create file:", error);
    throw error;
  }
}

export async function getFiles(conversationId?: number, messageId?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get files: database not available");
    return [];
  }

  try {
    if (conversationId) {
      const result = await db
        .select()
        .from(files)
        .where(eq(files.conversationId, conversationId))
        .orderBy(files.createdAt);
      return result;
    } else if (messageId) {
      const result = await db
        .select()
        .from(files)
        .where(eq(files.messageId, messageId))
        .orderBy(files.createdAt);
      return result;
    } else {
      const result = await db
        .select()
        .from(files)
        .orderBy(files.createdAt);
      return result;
    }
  } catch (error) {
    console.error("[Database] Failed to get files:", error);
    return [];
  }
}

// Image reference queries
export async function createImageReference(
  userId: number,
  conversationId: number,
  imageUrl: string,
  imageKey: string,
  description?: string,
  messageId?: number,
  mimeType?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.insert(imageReferences).values({
      userId,
      conversationId,
      imageUrl,
      imageKey,
      mimeType: mimeType || "image/png",
      description: description || null,
      messageId: messageId || null,
    });

    const created = await db
      .select()
      .from(imageReferences)
      .where(eq(imageReferences.conversationId, conversationId))
      .orderBy(desc(imageReferences.createdAt))
      .limit(1);

    return created[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create image reference:", error);
    throw error;
  }
}

export async function getImageReferences(conversationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get image references: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(imageReferences)
      .where(eq(imageReferences.conversationId, conversationId))
      .orderBy(imageReferences.createdAt);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get image references:", error);
    return [];
  }
}

export async function deleteMessage(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const message = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    if (!message || message.length === 0) {
      throw new Error("Message not found");
    }

    if (message[0].userId !== userId) {
      throw new Error("Message not owned by user");
    }

    await db.delete(messages).where(eq(messages.id, messageId));

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete message:", error);
    throw error;
  }
}
