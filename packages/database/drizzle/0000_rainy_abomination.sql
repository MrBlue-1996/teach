CREATE TYPE "public"."badge_status" AS ENUM('pending', 'issued', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'review', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."learning_mode" AS ENUM('L1_RECALL', 'L2_EXPLAIN', 'L3_APPLY', 'L4_ANALYZE', 'L5_EXPERT');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('individual', 'school', 'district', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."policy_decision" AS ENUM('promote', 'demote', 'hold', 'defer');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'paused', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('learner', 'instructor', 'content_author', 'school_admin', 'district_admin', 'system_admin');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" uuid,
	"previous_state" jsonb,
	"new_state" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"refresh_token" varchar(500),
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token"),
	CONSTRAINT "auth_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_pack_id" uuid NOT NULL,
	"badge_type" varchar(50) NOT NULL,
	"level" "learning_mode" NOT NULL,
	"status" "badge_status" DEFAULT 'pending' NOT NULL,
	"mastery_score" real NOT NULL,
	"total_time_spent" integer NOT NULL,
	"benchmarks_passed" integer NOT NULL,
	"signature" text,
	"verification_hash" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"issued_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learner_state_id" uuid NOT NULL,
	"content_pack_id" uuid NOT NULL,
	"target_mode" "learning_mode" NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer DEFAULT 0,
	"score" real,
	"passed" boolean,
	"time_limit_seconds" integer,
	"time_spent_seconds" integer,
	"responses" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"block_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"objective" text,
	"target_mode" "learning_mode" NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"time_budget_seconds" integer,
	"content" jsonb NOT NULL,
	"hints" jsonb DEFAULT '[]'::jsonb,
	"variants" jsonb DEFAULT '[]'::jsonb,
	"sequence_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"version" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"certification_target" varchar(100),
	"author_id" uuid,
	"organization_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"signature" text,
	"signed_at" timestamp,
	"signed_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "content_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "data_export_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"download_url" text,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid,
	"stripe_invoice_id" varchar(255),
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"invoice_pdf" text,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "learner_progress_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learner_state_id" uuid NOT NULL,
	"block_id" varchar(100) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"response_data" jsonb,
	"correctness" real,
	"time_spent_seconds" integer,
	"mode" "learning_mode",
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "learner_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_pack_id" uuid NOT NULL,
	"current_mode" "learning_mode" DEFAULT 'L1_RECALL' NOT NULL,
	"overall_mastery" real DEFAULT 0 NOT NULL,
	"total_time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"blocks_completed" integer DEFAULT 0 NOT NULL,
	"current_block_id" varchar(100),
	"skill_estimates" jsonb DEFAULT '{}'::jsonb,
	"retention_history" jsonb DEFAULT '[]'::jsonb,
	"transfer_scores" jsonb DEFAULT '{}'::jsonb,
	"in_probation" boolean DEFAULT false,
	"probation_started_at" timestamp,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learner_state_id" uuid NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"device_info" jsonb,
	"teaching_mode" integer DEFAULT 2,
	"device_profile" varchar(30) DEFAULT 'chromebook_standard',
	"errors_encountered" integer DEFAULT 0,
	"problems_solved" integer DEFAULT 0,
	"triggers_fired" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"paused_duration_seconds" integer DEFAULT 0,
	"blocks_attempted" integer DEFAULT 0,
	"blocks_completed" integer DEFAULT 0,
	"average_correctness" real,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"parent_id" uuid,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "policy_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learner_state_id" uuid NOT NULL,
	"session_id" uuid,
	"decision" "policy_decision" NOT NULL,
	"from_mode" "learning_mode" NOT NULL,
	"to_mode" "learning_mode",
	"signals" jsonb NOT NULL,
	"reasoning" text,
	"policy_version" varchar(50),
	"chain_hash" varchar(128),
	"previous_hash" varchar(128),
	"signature" text,
	"evaluated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255),
	"plan" "plan_tier" NOT NULL,
	"interval" varchar(20) NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"used_seats" integer DEFAULT 0 NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"trial_end" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"display_name" varchar(200),
	"role" "user_role" DEFAULT 'learner' NOT NULL,
	"organization_id" uuid,
	"email_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(255) NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_content_pack_id_content_packs_id_fk" FOREIGN KEY ("content_pack_id") REFERENCES "public"."content_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_learner_state_id_learner_states_id_fk" FOREIGN KEY ("learner_state_id") REFERENCES "public"."learner_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_content_pack_id_content_packs_id_fk" FOREIGN KEY ("content_pack_id") REFERENCES "public"."content_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_progress_events" ADD CONSTRAINT "learner_progress_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_progress_events" ADD CONSTRAINT "learner_progress_events_learner_state_id_learner_states_id_fk" FOREIGN KEY ("learner_state_id") REFERENCES "public"."learner_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_states" ADD CONSTRAINT "learner_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_states" ADD CONSTRAINT "learner_states_content_pack_id_content_packs_id_fk" FOREIGN KEY ("content_pack_id") REFERENCES "public"."content_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_learner_state_id_learner_states_id_fk" FOREIGN KEY ("learner_state_id") REFERENCES "public"."learner_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_id_organizations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_learner_state_id_learner_states_id_fk" FOREIGN KEY ("learner_state_id") REFERENCES "public"."learner_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_logs" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE INDEX "audit_occurred_idx" ON "audit_logs" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_token_idx" ON "auth_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_session_expires_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "badge_user_idx" ON "badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "badge_pack_idx" ON "badges" USING btree ("content_pack_id");--> statement-breakpoint
CREATE INDEX "badge_status_idx" ON "badges" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "badge_hash_idx" ON "badges" USING btree ("verification_hash");--> statement-breakpoint
CREATE INDEX "benchmark_user_idx" ON "benchmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "benchmark_state_idx" ON "benchmarks" USING btree ("learner_state_id");--> statement-breakpoint
CREATE INDEX "benchmark_status_idx" ON "benchmarks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_block_pack_idx" ON "content_blocks" USING btree ("pack_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_block_id_idx" ON "content_blocks" USING btree ("pack_id","block_id");--> statement-breakpoint
CREATE INDEX "content_block_mode_idx" ON "content_blocks" USING btree ("target_mode");--> statement-breakpoint
CREATE INDEX "content_block_sequence_idx" ON "content_blocks" USING btree ("pack_id","sequence_order");--> statement-breakpoint
CREATE UNIQUE INDEX "content_pack_slug_version_idx" ON "content_packs" USING btree ("slug","version");--> statement-breakpoint
CREATE INDEX "content_pack_status_idx" ON "content_packs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_pack_cert_idx" ON "content_packs" USING btree ("certification_target");--> statement-breakpoint
CREATE INDEX "export_user_idx" ON "data_export_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "export_status_idx" ON "data_export_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_stripe_idx" ON "invoices" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "progress_event_user_idx" ON "learner_progress_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "progress_event_state_idx" ON "learner_progress_events" USING btree ("learner_state_id");--> statement-breakpoint
CREATE INDEX "progress_event_type_idx" ON "learner_progress_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "progress_event_occurred_idx" ON "learner_progress_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_state_user_pack_idx" ON "learner_states" USING btree ("user_id","content_pack_id");--> statement-breakpoint
CREATE INDEX "learner_state_mode_idx" ON "learner_states" USING btree ("current_mode");--> statement-breakpoint
CREATE INDEX "learner_state_activity_idx" ON "learner_states" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "learning_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_state_idx" ON "learning_sessions" USING btree ("learner_state_id");--> statement-breakpoint
CREATE INDEX "session_status_idx" ON "learning_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_started_idx" ON "learning_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "oauth_user_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_provider_idx" ON "oauth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "org_parent_idx" ON "organizations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "policy_eval_user_idx" ON "policy_evaluations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "policy_eval_state_idx" ON "policy_evaluations" USING btree ("learner_state_id");--> statement-breakpoint
CREATE INDEX "policy_eval_decision_idx" ON "policy_evaluations" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "policy_eval_evaluated_idx" ON "policy_evaluations" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "seat_subscription_idx" ON "seat_assignments" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seat_user_idx" ON "seat_assignments" USING btree ("subscription_id","user_id");--> statement-breakpoint
CREATE INDEX "subscription_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_stripe_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "webhook_delivery_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_event_idx" ON "webhook_deliveries" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_delivery_retry_idx" ON "webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "webhook_org_idx" ON "webhook_endpoints" USING btree ("organization_id");