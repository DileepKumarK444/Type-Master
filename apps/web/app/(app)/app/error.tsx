"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error, "app-segment"), [error]);
  return (
    <div className="mx-auto max-w-xl">
      <Card role="alert" className="space-y-3 border-dashed py-12 text-center">
        <p className="text-lg font-bold">Couldn’t load your data</p>
        <p className="text-sm text-muted">Something went wrong on our side. Your typing history is safe. Try again in a moment.</p>
        <div className="flex justify-center gap-3"><Button onClick={reset}>Retry</Button><Button variant="secondary" href="/app/practice">Practice instead</Button></div>
      </Card>
    </div>
  );
}
