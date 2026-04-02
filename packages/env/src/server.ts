import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).default("postgresql://postgres:password@localhost:5432/hitachi2"),
    BETTER_AUTH_SECRET: z.string().min(32).default("build-time-secret-min-32-chars-long-not-for-runtime"),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3001"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    API_DOMAIN: z.string().default(".jayllyz.fr"),
    USESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.email().default("noreply@yourdomain.com"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
