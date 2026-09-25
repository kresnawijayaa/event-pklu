CREATE TYPE "public"."access_role" AS ENUM('STAFF', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."participant_source" AS ENUM('MANUAL', 'IMPORT', 'LEGACY');--> statement-breakpoint
CREATE TABLE "access_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "access_role" NOT NULL,
	"pin_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_codes_role_unique" UNIQUE("role")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid,
	"participant_id" uuid,
	"actor_role" "access_role",
	"actor_session_id" uuid,
	"action" varchar(80) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"event_date" date NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Jakarta' NOT NULL,
	"target_participants" integer DEFAULT 645 NOT NULL,
	"registration_prefix" varchar(20) DEFAULT 'PKLU-' NOT NULL,
	"registration_padding" integer DEFAULT 3 NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"whatsapp_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_target_participants_positive" CHECK ("events"."target_participants" > 0),
	CONSTRAINT "events_registration_padding_positive" CHECK ("events"."registration_padding" > 0),
	CONSTRAINT "events_next_sequence_positive" CHECK ("events"."next_sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"ip_hash" char(64) PRIMARY KEY NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"registration_code" varchar(40) NOT NULL,
	"name" varchar(120) NOT NULL,
	"name_normalized" varchar(120) NOT NULL,
	"whatsapp_e164" varchar(20) NOT NULL,
	"church" varchar(120),
	"church_normalized" varchar(120),
	"source" "participant_source" NOT NULL,
	"source_request_id" uuid NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_in_by_session_id" uuid,
	"whatsapp_opened_at" timestamp with time zone,
	"whatsapp_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_session_id" uuid,
	CONSTRAINT "participants_source_request_id_unique" UNIQUE("source_request_id"),
	CONSTRAINT "participants_event_sequence_unique" UNIQUE("event_id","sequence_number"),
	CONSTRAINT "participants_event_registration_code_unique" UNIQUE("event_id","registration_code"),
	CONSTRAINT "participants_sequence_positive" CHECK ("participants"."sequence_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" char(64) NOT NULL,
	"role" "access_role" NOT NULL,
	"access_code_version" integer NOT NULL,
	"ip_hash" char(64),
	"user_agent" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_session_id_sessions_id_fk" FOREIGN KEY ("actor_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_checked_in_by_session_id_sessions_id_fk" FOREIGN KEY ("checked_in_by_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_deleted_by_session_id_sessions_id_fk" FOREIGN KEY ("deleted_by_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_event_created_at_idx" ON "audit_logs" USING btree ("event_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_participant_created_at_idx" ON "audit_logs" USING btree ("participant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "participants_event_deleted_at_idx" ON "participants" USING btree ("event_id","deleted_at");--> statement-breakpoint
CREATE INDEX "participants_event_registration_code_idx" ON "participants" USING btree ("event_id","registration_code");--> statement-breakpoint
CREATE INDEX "participants_event_name_normalized_idx" ON "participants" USING btree ("event_id","name_normalized");--> statement-breakpoint
CREATE INDEX "participants_event_whatsapp_e164_idx" ON "participants" USING btree ("event_id","whatsapp_e164");--> statement-breakpoint
CREATE INDEX "participants_event_checked_in_at_idx" ON "participants" USING btree ("event_id","checked_in_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_revoked_at_idx" ON "sessions" USING btree ("revoked_at");