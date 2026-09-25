import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur.");
}

const globalForDatabase = globalThis as typeof globalThis & {
  databasePool?: Pool;
};

const pool =
  globalForDatabase.databasePool ??
  new Pool({ connectionString, max: 5, idleTimeoutMillis: 20_000 });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.databasePool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
