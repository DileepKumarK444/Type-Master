import type { ReactNode } from "react";

/** Readable long-form text for legal/about pages. */
export function Prose({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>}
      <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_a]:font-semibold [&_a]:text-accent [&_a]:underline">{children}</div>
    </article>
  );
}
