import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  await import("../db/seed");
}

void main();
