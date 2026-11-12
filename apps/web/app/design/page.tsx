import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Tabs } from "@/components/ui/Tabs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Toggle } from "@/components/ui/Toggle";

export const metadata = { title: "UI kit" };

/** Internal page to eyeball primitives in both themes. */
export default function Kit() {
  if (process.env.NODE_ENV === "production") notFound(); // internal UI kit, development only
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">UI kit</h1><ThemeToggle /></div>
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button disabled>Disabled</Button></div>
        <Tabs items={["15s", "30s", "60s", "120s"]} defaultIndex={2} />
        <div className="flex items-center gap-3"><Toggle label="Sound" defaultOn /><span>Keyboard sound</span></div>
        <Progress value={64} label="Lesson progress" />
        <p className="font-mono text-xl"><span className="text-fg">Typing is a skill </span><span className="text-bad underline">th</span><span className="text-muted">at rewards patience.</span></p>
      </Card>
    </main>
  );
}
