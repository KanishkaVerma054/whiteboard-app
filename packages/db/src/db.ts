import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

// Prisma 7 no longer loads .env automatically. The servers run from their own folders,
// so load packages/db/.env by an absolute path. A DATABASE_URL already set in the environment wins.
try {
  process.loadEnvFile(path.join(import.meta.dirname, "..", ".env"));
} catch {
  // no .env file: rely on DATABASE_URL already being set in the environment
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prismaClient = new PrismaClient({ adapter });
