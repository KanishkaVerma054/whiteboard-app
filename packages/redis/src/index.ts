import path from "path";
import { createClient } from "redis";

try {
    process.loadEnvFile(path.join(import.meta.dirname, "..", ".env"))
} catch {}

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"

export const CHANNELS = {
    broadcast: "whiteboard:broadcast",
} as const

export const redis = createClient({url: REDIS_URL});
redis.on("error", (err) => console.error("Redis error:", err));

export async function connectRedis() {
    if(!redis.isOpen) await redis.connect();
}