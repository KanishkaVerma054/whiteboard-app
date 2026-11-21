import path from "node:path";

// Load packages/backend-common/.env by an absolute path, so it's found no matter which
// server (http-server, ws-server) imports this or which folder it runs from — same as
// packages/db/src/db.ts does for DATABASE_URL. A JWT_SECRET already set in the environment
// (e.g. on a production host) wins, because loadEnvFile never overwrites existing variables.
try {
  process.loadEnvFile(path.join(import.meta.dirname, "..", ".env"));
} catch {
  // no .env file: rely on JWT_SECRET already being set in the environment
}

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is required and not set");
}

export const JWT_SECRET: string = secret;
