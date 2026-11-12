import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

/** Header + footer for the public marketing and legal pages. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent font-mono text-sm text-white [[data-theme=dark]_&]:text-bg" aria-hidden="true">tm</span>
            TypeMaster
          </Link>
          <nav aria-label="Site" className="hidden gap-6 font-semibold text-muted md:flex">
            <Link href="/#features" className="hover:text-fg">Features</Link>
            <Link href="/#how" className="hover:text-fg">How it works</Link>
            <Link href="/#faq" className="hover:text-fg">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button href="/login" variant="ghost" size="sm">Log in</Button>
            <Button href="/register" size="sm">Sign up free</Button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted md:px-6">
          <span>© {new Date().getFullYear()} TypeMaster</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/about" className="hover:text-fg">About</Link>
            <Link href="/privacy" className="hover:text-fg">Privacy</Link>
            <Link href="/terms" className="hover:text-fg">Terms</Link>
            {contact && <a href={`mailto:${contact}`} className="hover:text-fg">Contact</a>}
          </nav>
        </div>
      </footer>
    </div>
  );
}
