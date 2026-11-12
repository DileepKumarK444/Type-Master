import { index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/** See docs/07-technical-architecture.md §7. Ownership is enforced in the query layer (every query is scoped by user id). */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(), // always stored lowercase
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"), // null for Google-only accounts
  googleSub: text("google_sub").unique(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  timezone: text("timezone").notNull().default("UTC"),
  /** Bumped when the password is reset: every older session (JWT) stops being valid. */
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserPrefs = { sound?: boolean; showKeyboard?: boolean };

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  prefs: jsonb("prefs").$type<UserPrefs>().notNull().default({}),
  goalWpm: integer("goal_wpm").notNull().default(40),
  dailyMinutes: integer("daily_minutes").notNull().default(10),
  layout: text("layout").notNull().default("qwerty"),
});

export type SessionMode =
  | { seconds: number; punctuation: boolean; numbers: boolean }
  | { lessonId: number }
  | { game: "word-rush"; seconds: number };

export const typingSessions = pgTable(
  "typing_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-generated id; makes retries and guest imports idempotent. */
    clientId: uuid("client_id").notNull(),
    type: text("type").notNull().default("test"), // "test" | "drill" | "lesson" | "game"
    lessonId: integer("lesson_id"),
    durationS: integer("duration_s").notNull(),
    wpm: real("wpm").notNull(),
    rawWpm: real("raw_wpm").notNull(),
    accuracy: real("accuracy").notNull(),
    consistency: real("consistency").notNull(),
    errors: integer("errors").notNull(),
    mode: jsonb("mode").$type<SessionMode>().notNull(),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    /** games only */
    score: integer("score"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("typing_sessions_user_client").on(t.userId, t.clientId), index("typing_sessions_user_created").on(t.userId, t.createdAt.desc())],
);

export const keyStats = pgTable(
  "key_stats",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    hits: integer("hits").notNull().default(0),
    misses: integer("misses").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id").notNull(),
    bestWpm: real("best_wpm").notNull().default(0),
    bestAccuracy: real("best_accuracy").notNull().default(0),
    /** 0 = attempted but not passed */
    stars: integer("stars").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

/** One-time password reset links. Only a SHA-256 hash of the token is stored, so a database leak does not expose usable links. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_user").on(t.userId)],
);
