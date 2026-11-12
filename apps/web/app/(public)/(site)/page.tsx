import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PracticeClient } from "@/features/practice/PracticeClient";

export const metadata: Metadata = {
  title: { absolute: "TypeMaster — Learn to type faster and see why you’re slow" },
  description: "Free typing lessons, a 30-second speed test, weak-key drills and games. Find out exactly which keys slow you down.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: "chart", title: "Find your weak keys", text: "See exactly which keys and fingers cost you speed, with a heatmap on the keyboard and a drill built around them." },
  { icon: "book", title: "Learn the right way", text: "Twenty short lessons take you from the home row to full sentences, with a clear pass mark and stars for mastery." },
  { icon: "game", title: "Practise with games", text: "Word Rush turns repetition into a race against the clock, and every game counts toward your stats and XP." },
];
const STEPS = ["Take a 30-second test", "See your weak keys", "Follow your lessons", "Watch your speed climb"];
const FAQ = [
  ["Is TypeMaster free?", "Yes. Taking the test, the lessons, the drills and the game are all free in this version."],
  ["Do I need an account?", "Not for the speed test. An account saves your history and unlocks lessons, games, progress and achievements. A test you take before signing up is added to your account when you register."],
  ["How is my speed calculated?", "Words per minute counts every 5 correct characters as one word, over the time you typed. Accuracy is correct keystrokes divided by all keystrokes, so fixing a mistake with backspace still costs accuracy."],
  ["Does it work on a phone?", "You can browse your progress and play on a phone, but touch-typing lessons work best with a physical keyboard."],
  ["Which keyboard layouts are supported?", "QWERTY for now. Other layouts are planned."],
  ["What happens to my data?", "We keep only what the app needs: your account, your typing results and your settings. You can export or delete everything yourself from your profile. See the privacy page for details."],
];

export default function Landing() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebApplication", name: "TypeMaster", applicationCategory: "EducationalApplication",
    operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Typing lessons, speed test, weak-key drills and games.",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="px-4 pb-10 pt-14 text-center md:px-6 md:pt-20" aria-labelledby="hero">
        <p className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent"><Icon name="flame" className="h-3.5 w-3.5" /> Free · no sign-up to try</p>
        <h1 id="hero" className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">Type faster. <span className="text-accent">Understand why</span> you’re slow.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Structured lessons, honest per-key analytics and quick games, in one calm and fast typing app.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button href="#try" size="lg">Try a 30-second test</Button>
          <Button href="/register" variant="secondary" size="lg">Start learning</Button>
        </div>
      </section>

      <section id="try" className="mx-auto max-w-4xl scroll-mt-20 px-4 pb-16 md:px-6" aria-labelledby="try-h">
        <h2 id="try-h" className="sr-only">30-second typing test</h2>
        <PracticeClient signedIn={false} showKeyboard={false} compact lockedSeconds={30} />
        <p className="mt-3 text-center text-xs text-muted">The timer starts on your first key. Click the text box if keys aren’t registering.</p>
      </section>

      <section id="features" className="scroll-mt-20 border-y border-line bg-surface px-4 py-14 md:px-6" aria-labelledby="features-h">
        <div className="mx-auto max-w-6xl">
          <h2 id="features-h" className="mb-8 text-center text-2xl font-bold md:text-3xl">Everything you need to type better</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="space-y-3">
                <div className="grid h-10 w-10 place-items-center rounded-token bg-accent-soft text-accent"><Icon name={f.icon} /></div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-muted">{f.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-14 md:px-6" aria-labelledby="how-h">
        <h2 id="how-h" className="mb-8 text-center text-2xl font-bold md:text-3xl">How it works</h2>
        <ol className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {STEPS.map((t, i) => (
            <li key={t} className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-accent font-bold text-white [[data-theme=dark]_&]:text-bg" aria-hidden="true">{i + 1}</span>
              <span className="font-semibold">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-14 md:px-6" aria-labelledby="faq-h">
        <h2 id="faq-h" className="mb-6 text-center text-2xl font-bold md:text-3xl">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-token border border-line bg-surface p-4">
              <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden"><span className="mr-2 inline-block text-accent transition-transform group-open:rotate-90" aria-hidden="true">›</span>{q}</summary>
              <p className="mt-2 pl-5 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface px-4 py-14 text-center md:px-6" aria-labelledby="cta-h">
        <h2 id="cta-h" className="text-2xl font-bold md:text-3xl">Ready to find your rhythm?</h2>
        <p className="mx-auto mb-6 mt-2 max-w-md text-muted">Create a free account to save your results and start the lessons.</p>
        <Button href="/register" size="lg">Create free account</Button>
        <p className="mt-4 text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-accent underline">Log in</Link></p>
      </section>
    </>
  );
}
