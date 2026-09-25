import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur.");
}

const pool = new Pool({ connectionString, max: 1 });
const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";

async function main() {
  let stage = "schema";
  try {
    const schemaResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_type = 'BASE TABLE'
         AND table_name = ANY($2::text[])`,
      [
        "public",
        [
          "events",
          "participants",
          "access_codes",
          "sessions",
          "login_attempts",
          "audit_logs",
        ],
      ],
    );
    stage = "event";
    const eventResult = await pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM events WHERE slug = $1",
      [eventSlug],
    );
    stage = "participant columns";
    const columnsResult = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'participants'
         AND column_name = ANY($1::text[])`,
      [["registration_mode", "category", "mupel", "participant_type", "registration_channel"]],
    );
    stage = "participant list";
    await pool.query(
      `SELECT id, registration_code, name, whatsapp_e164, church,
              registration_mode, category, mupel, participant_type,
              registration_channel, checked_in_at, whatsapp_opened_at,
              whatsapp_confirmed_at, created_at, deleted_at
       FROM participants
       WHERE event_id = (SELECT id FROM events WHERE slug = $1)
         AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 51`,
      [eventSlug],
    );
    const tableCount = schemaResult.rows[0]?.count ?? 0;
    const eventCount = eventResult.rows[0]?.count ?? 0;
    const columnCount = columnsResult.rows.length;

    if (tableCount !== 6 || eventCount !== 1 || columnCount !== 5) {
      console.error("Database connected, but schema or default event verification failed.", {
        tables: tableCount, event: eventCount, participantDetailColumns: columnCount,
      });
      process.exitCode = 2;
    } else {
      console.info("Database connected; schema, default event, and participant list query verified.");
    }
  } catch (error) {
    const details = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : null;
    console.error("Database check failed", {
      stage,
      type: error?.constructor?.name ?? typeof error,
      ...(typeof details?.name === "string" ? { name: details.name } : {}),
      ...(typeof details?.code === "string" ? { code: details.code } : {}),
    });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
