import { config } from "dotenv";

config({ path: ".env.test.local", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("Isi DATABASE_URL test pada .env.test.local sebelum menjalankan integration test.");
}

if (!process.env.AUTH_PEPPER || !process.env.IP_HASH_SECRET) {
  throw new Error("Isi AUTH_PEPPER dan IP_HASH_SECRET khusus test pada .env.test.local.");
}
