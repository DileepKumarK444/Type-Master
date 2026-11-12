import { type Db } from "@typemaster/db";
import { UserGoneError, pgCode, saveSessionIn, type SaveOutcome } from "./sessions";
import { applyProgression } from "./progression";
import type { GameInput, SessionInput } from "./validation";

/** Practice test or weak-key drill: save the session and apply XP/badges atomically. Duplicates return no rewards. */
export async function recordPractice(db: Db, userId: string, input: SessionInput): Promise<SaveOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const out = await saveSessionIn(tx, userId, input, { type: input.kind });
      if (out.duplicate) return out;
      out.rewards = await applyProgression(tx, userId, out.id, { kind: input.kind, durationS: input.durationS, accuracy: input.accuracy });
      return out;
    });
  } catch (e) {
    if (pgCode(e) === "23503") throw new UserGoneError();
    throw e;
  }
}

export async function recordGame(db: Db, userId: string, input: GameInput): Promise<SaveOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const out = await saveSessionIn(
        tx, userId, { ...input, mode: { game: "word-rush", seconds: Math.round(input.durationS) } }, { type: "game", score: input.score },
      );
      if (out.duplicate) return out;
      out.rewards = await applyProgression(tx, userId, out.id, { kind: "game", durationS: input.durationS, accuracy: input.accuracy });
      return out;
    });
  } catch (e) {
    if (pgCode(e) === "23503") throw new UserGoneError();
    throw e;
  }
}
