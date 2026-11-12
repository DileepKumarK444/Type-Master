import type { Metadata } from "next";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "About", description: "What TypeMaster is and how it works.", alternates: { canonical: "/about" } };

export default function About() {
  return (
    <Prose title="About TypeMaster">
      <p>TypeMaster is a typing app that teaches you <em>why</em> you’re slow, not only <em>how</em> slow you are. Most typing tools either measure you or teach you. TypeMaster does both, and connects them.</p>
      <h2>How it fits together</h2>
      <ul>
        <li>A <strong>timed test</strong> measures speed, accuracy and consistency.</li>
        <li><strong>Per-key analytics</strong> show which keys cost you accuracy, on a keyboard heatmap.</li>
        <li><strong>Lessons</strong> take you from the home row to full sentences, with a clear pass mark.</li>
        <li><strong>Weak-key drills</strong> turn your worst keys into practice text.</li>
        <li><strong>Games</strong> make repetition fun, and count toward the same stats.</li>
      </ul>
      <h2>How speed is measured</h2>
      <p>Words per minute counts every five correct characters as one word. Accuracy is correct keystrokes divided by all keystrokes; correcting a mistake with backspace does not erase it from your accuracy. Consistency compares your speed from second to second.</p>
      <h2>Rewards without noise</h2>
      <p>You earn XP only when your accuracy is 90% or better, replays are worth little, and there is a daily cap on practice XP. The aim is to reward careful practice rather than grinding.</p>
    </Prose>
  );
}
