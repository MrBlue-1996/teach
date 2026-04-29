DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'user_role_new'
	) THEN
		CREATE TYPE "public"."user_role_new" AS ENUM(
			'learner',
			'staff',
			'manager',
			'instructor',
			'content_author',
			'school_admin',
			'district_admin',
			'system_admin'
		);
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "role" TYPE "public"."user_role_new"
USING ("role"::text::"public"."user_role_new");
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_role";
--> statement-breakpoint
ALTER TYPE "public"."user_role_new" RENAME TO "user_role";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'learner'::"public"."user_role";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manager_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'users_manager_id_users_id_fk'
	) THEN
		ALTER TABLE "users"
		ADD CONSTRAINT "users_manager_id_users_id_fk"
		FOREIGN KEY ("manager_id")
		REFERENCES "public"."users"("id")
		ON DELETE no action
		ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_manager_idx" ON "users" USING btree ("manager_id");
