import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-3 border-dashed py-12 text-center">
        <p className="text-lg font-bold">We couldn’t find that</p>
        <p className="text-sm text-muted">It may have been removed, or it belongs to a different account.</p>
        <div className="flex justify-center gap-3"><Button href="/app">Dashboard</Button><Button variant="secondary" href="/app/progress">Progress</Button></div>
      </Card>
    </div>
  );
}
