/**
 * Centralized dotenv loader.
 *
 * MUST be the very first import in server.ts (and wsServer.ts) so that
 * process.env is populated before any other module reads it.
 *
 * Uses import.meta.url to resolve the .env path relative to this file,
 * so it works regardless of what directory tsx/node is launched from.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This file lives at backend/src/config/env.ts → backend is two levels up
const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

console.log(`✅ dotenv loaded from ${envPath}`);
