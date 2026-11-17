import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads .env by itself. The CLI runs from packages/db, so load the .env here.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file: rely on DATABASE_URL already being set in the environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
