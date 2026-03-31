import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env file only if it exists (for local development)
// In CI, environment variables are set directly in the workflow
const envPath = path.join(__dirname, "../../apps/server/.env");
if (existsSync(envPath)) {
  dotenv.config({
    path: envPath,
  });
}
export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
