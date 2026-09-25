import {
  bigserial,
  boolean,
  check,
  char,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accessRole = pgEnum("access_role", ["STAFF", "ADMIN"]);
export const participantSource = pgEnum("participant_source", [
  "MANUAL",
  "IMPORT",
  "LEGACY",
]);

export const accessCodes = pgTable("access_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: accessRole("role").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    role: accessRole("role").notNull(),
    accessCodeVersion: integer("access_code_version").notNull(),
    ipHash: char("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_expires_at_idx").on(table.expiresAt),
    index("sessions_revoked_at_idx").on(table.revokedAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    timezone: varchar("timezone", { length: 64 })
      .notNull()
      .default("Asia/Jakarta"),
    targetParticipants: integer("target_participants").notNull().default(645),
    registrationPrefix: varchar("registration_prefix", { length: 20 })
      .notNull()
      .default("PKLU-"),
    registrationPadding: integer("registration_padding").notNull().default(3),
    nextSequence: integer("next_sequence").notNull().default(1),
    whatsappTemplate: text("whatsapp_template").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "events_target_participants_positive",
      sql`${table.targetParticipants} > 0`,
    ),
    check(
      "events_registration_padding_positive",
      sql`${table.registrationPadding} > 0`,
    ),
    check("events_next_sequence_positive", sql`${table.nextSequence} > 0`),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    sequenceNumber: integer("sequence_number").notNull(),
    registrationCode: varchar("registration_code", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 120 }).notNull(),
    whatsappE164: varchar("whatsapp_e164", { length: 20 }).notNull(),
    church: varchar("church", { length: 120 }),
    churchNormalized: varchar("church_normalized", { length: 120 }),
    registrationMode: varchar("registration_mode", { length: 120 }),
    category: varchar("category", { length: 120 }),
    mupel: varchar("mupel", { length: 120 }),
    participantType: varchar("participant_type", { length: 120 }),
    registrationChannel: varchar("registration_channel", { length: 120 }),
    source: participantSource("source").notNull(),
    sourceRequestId: uuid("source_request_id").notNull().unique(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBySessionId: uuid("checked_in_by_session_id").references(
      () => sessions.id,
    ),
    whatsappOpenedAt: timestamp("whatsapp_opened_at", { withTimezone: true }),
    whatsappConfirmedAt: timestamp("whatsapp_confirmed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBySessionId: uuid("deleted_by_session_id").references(
      () => sessions.id,
    ),
  },
  (table) => [
    unique("participants_event_sequence_unique").on(
      table.eventId,
      table.sequenceNumber,
    ),
    unique("participants_event_registration_code_unique").on(
      table.eventId,
      table.registrationCode,
    ),
    check("participants_sequence_positive", sql`${table.sequenceNumber} > 0`),
    index("participants_event_deleted_at_idx").on(
      table.eventId,
      table.deletedAt,
    ),
    index("participants_event_registration_code_idx").on(
      table.eventId,
      table.registrationCode,
    ),
    index("participants_event_name_normalized_idx").on(
      table.eventId,
      table.nameNormalized,
    ),
    index("participants_event_whatsapp_e164_idx").on(
      table.eventId,
      table.whatsappE164,
    ),
    index("participants_event_checked_in_at_idx").on(
      table.eventId,
      table.checkedInAt,
    ),
  ],
);

export const loginAttempts = pgTable("login_attempts", {
  ipHash: char("ip_hash", { length: 64 }).primaryKey(),
  failureCount: integer("failure_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", {
    withTimezone: true,
  }).notNull(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").references(() => events.id),
    participantId: uuid("participant_id").references(() => participants.id),
    actorRole: accessRole("actor_role"),
    actorSessionId: uuid("actor_session_id").references(() => sessions.id),
    action: varchar("action", { length: 80 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_event_created_at_idx").on(
      table.eventId,
      table.createdAt.desc(),
    ),
    index("audit_logs_participant_created_at_idx").on(
      table.participantId,
      table.createdAt.desc(),
    ),
  ],
);
