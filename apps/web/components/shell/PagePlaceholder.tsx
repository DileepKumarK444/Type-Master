import { Card } from "@/components/ui/Card";

/** Temporary page body for routes that arrive in later milestones. Not a feature. */
export function PagePlaceholder({ title, blurb, milestone }: { title: string; blurb: string; milestone: string }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-muted">{blurb}</p>
      <Card className="mt-6 grid place-items-center gap-2 border-dashed py-16 text-center">
        <p className="font-semibold">Coming in {milestone}</p>
        <p className="text-sm text-muted">This route exists so navigation and layout can be verified in M0.</p>
      </Card>
    </div>
  );
}
