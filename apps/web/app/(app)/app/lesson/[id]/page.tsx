import { notFound, redirect } from "next/navigation";
import { LESSONS, buildLesson, getLesson, isUnlocked } from "@typemaster/content";
import { auth } from "@/auth";
import { LessonPlayer } from "@/features/learn/LessonPlayer";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { getProgress, starsMap } from "@/lib/server/lessons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const def = getLesson(Number((await params).id));
  return { title: def ? `Lesson ${def.id}: ${def.title}` : "Lesson" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const def = Number.isInteger(id) ? getLesson(id) : undefined;
  if (!def) notFound();
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");

  const db = getDb();
  const [rows, profile] = await Promise.all([getProgress(db, user.id), getProfile(db, user.id)]);
  if (!profile) redirect("/login");
  if (!isUnlocked(id, starsMap(rows))) redirect("/app/learn");

  return (
    <LessonPlayer
      lesson={{ id: def.id, title: def.title, level: def.level, tip: def.tip, newKeys: def.newKeys, passAccuracy: def.passAccuracy, targetWpm: def.targetWpm }}
      steps={buildLesson(def)}
      nextLessonId={LESSONS.some((l) => l.id === id + 1) ? id + 1 : null}
      bestStars={rows.find((r) => r.lessonId === id)?.stars ?? 0}
      showKeyboard={profile.prefs?.showKeyboard ?? true}
    />
  );
}
