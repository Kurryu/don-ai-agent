export const ENV = {
  // appId: process.env.VITE_APP_ID ?? "", // Removed Manus-specific ID
  cookieSecret: process.env.JWT_SECRET ?? "a-strong-default-secret-for-jwt",
  databaseUrl: process.env.DATABASE_URL ?? "",
  // oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "", // Removed Manus-specific OAuth
  // ownerOpenId: process.env.OWNER_OPEN_ID ?? "", // Removed Manus-specific owner ID
  isProduction: process.env.NODE_ENV === "production",
  openAiApiBase: process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
};
