"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SIDEBAR, TABS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

/** Authenticated app shell: sidebar on desktop, bottom tabs on mobile. Focus routes hide the shell. */
export function AppShell({ children, user, streak = 0, level }: { children: ReactNode; user: { name: string } | null; streak?: number; level?: number }) {
  const path = usePathname();
  const focus = path.startsWith("/app/practice/run") || path.startsWith("/app/lesson") || path.startsWith("/app/games/word-rush");
  if (focus) return <>{children}</>;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[236px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-1 border-r border-line bg-surface p-4 md:flex" aria-label="Main">
        <Link href="/app" className="mb-4 flex items-center gap-2.5 px-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent font-mono text-sm text-white [[data-theme=dark]_&]:text-bg">tm</span>
          TypeMaster
        </Link>
        {SIDEBAR.map((n) => (
          <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-token px-3 py-2.5 font-semibold",
              isActive(path, n.href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface2 hover:text-fg")}>
            <Icon name={n.icon} />{n.label}
          </Link>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Link href="/app/profile" className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-token px-3 py-2.5 font-semibold",
            path.startsWith("/app/profile") ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface2 hover:text-fg")}>
            <Icon name="user" /><span className="truncate">{user ? user.name : "Profile"}</span>
          </Link>
          {user && (
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} aria-label="Log out" title="Log out"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-token text-bad hover:bg-bad/10">
              <Icon name="logout" />
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 px-4 pt-4 md:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold">
            <Icon name="flame" className="h-4 w-4 text-warn" /><span className="text-warn" aria-label={`${streak} day streak`}>{streak}</span>
          </span>
          {level !== undefined && (
            <Link href="/app/achievements" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold" aria-label={`Lv ${level}, level ${level}`}>
              <Icon name="trophy" className="h-4 w-4 text-accent" />Lv {level}
            </Link>
          )}
          {!user && (
            <>
              <Button href="/login" variant="ghost" size="sm">Log in</Button>
              <Button href="/register" size="sm">Sign up</Button>
            </>
          )}
          <ThemeToggle />
        </header>
        <main id="main" tabIndex={-1} className="px-4 pb-28 pt-4 outline-none md:px-8 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-line bg-surface px-1 pb-3 pt-2 md:hidden" aria-label="Tabs">
        {TABS.map((n) => (
          <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}
            className={cn("flex min-h-11 min-w-14 flex-col items-center gap-0.5 rounded-token px-2 py-1 text-[10px] font-bold",
              isActive(path, n.href) ? "text-accent" : "text-muted")}>
            <Icon name={n.icon} />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
