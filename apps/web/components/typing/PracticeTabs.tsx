import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "timed", label: "Timed test", href: "/app/practice" },
  { id: "keys", label: "By key", href: "/app/practice/keys" },
  { id: "weak", label: "Weak keys", href: "/app/practice?drill=weak" },
] as const;

/** Switches between the three ways to practise. Shown to signed-in users (the other two need their key history). */
export function PracticeTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Practice type" className="mb-4 inline-flex gap-0.5 rounded-token bg-surface2 p-1">
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}
          className={cn("rounded-[7px] px-4 py-1.5 text-sm font-semibold", t.id === active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
