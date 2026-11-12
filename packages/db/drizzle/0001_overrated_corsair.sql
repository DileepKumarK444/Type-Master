CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" integer NOT NULL,
	"best_wpm" real DEFAULT 0 NOT NULL,
	"best_accuracy" real DEFAULT 0 NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
ALTER TABLE "typing_sessions" ADD COLUMN "lesson_id" integer;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;