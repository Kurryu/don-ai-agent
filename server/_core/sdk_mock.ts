import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Mock user data for a public, unauthenticated demo
const MOCK_USER_OPEN_ID = "mock-user-123";
const MOCK_USER_NAME = "OpenSource User";
const MOCK_USER_EMAIL = "opensource@example.com";

class SDKServerMock {
  /**
   * Mock authentication: always returns a mock user.
   * In a real-world self-hosted application, this would be replaced with a
   * standard authentication method (e.g., username/password, OAuth with a
   * third-party provider like Google, or a simple API key check).
   */
  async authenticateRequest(req: Request): Promise<User> {
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(MOCK_USER_OPEN_ID);

    if (!user) {
      // Create the mock user if they don't exist in the database
      await db.upsertUser({
        openId: MOCK_USER_OPEN_ID,
        name: MOCK_USER_NAME,
        email: MOCK_USER_EMAIL,
        loginMethod: "mock",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(MOCK_USER_OPEN_ID);
    }

    if (!user) {
      throw ForbiddenError("Mock user creation failed");
    }

    // Update last signed in time
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServerMock();

// Export the original file's types for compatibility
export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

export type ExchangeTokenResponse = {
  accessToken: string;
};

export type GetUserInfoResponse = {
  openId: string;
  name: string;
  email: string;
  platform: string;
  loginMethod: string;
};

export type GetUserInfoWithJwtResponse = GetUserInfoResponse;

// The original SDK is no longer needed
// export const sdk = new SDKServer();
