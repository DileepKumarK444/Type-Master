import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Privacy", description: "What TypeMaster collects, why, and how you can export or delete it.", alternates: { canonical: "/privacy" } };
const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Privacy() {
  return (
    <Prose title="Privacy policy" updated="12 November 2026">
      <p>This page explains, in plain language, what TypeMaster stores and why. We keep it deliberately small.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name and email address, and a password stored only as a salted hash (we cannot read it). If you sign in with Google, we receive your name, email address and Google account identifier.</li>
        <li><strong>Typing data:</strong> the results of your tests, lessons and games (speed, accuracy, consistency, duration, score, timestamp), per-key hit and miss counts, lesson progress, XP, level and badges.</li>
        <li><strong>Settings:</strong> your goals and preferences, such as showing the on-screen keyboard.</li>
      </ul>
      <p>We do not store the text you type, only the statistics derived from it.</p>
      <h2>Cookies and browser storage</h2>
      <ul>
        <li>A <strong>sign-in cookie</strong> (HTTP-only) keeps you logged in. It is essential to the service.</li>
        <li><strong>Local storage</strong> in your browser remembers your light/dark choice, and holds test results taken before you sign up, or not yet sent, until they can be saved.</li>
      </ul>
      <p>We do not use advertising or tracking cookies, and this version does not include third-party analytics.</p>
      <h2>How we use your data</h2>
      <p>Only to run TypeMaster: to sign you in, show your progress, award XP and badges, and keep the service secure and working. We do not sell your data.</p>
      <h2>Email</h2>
      <p>We send an email only when you ask for a password reset. Your email address is passed to our email delivery provider for that purpose. Reset links work once, expire after 60 minutes, and are stored only as a one-way hash. Resetting a password signs you out everywhere else.</p>
      <h2>Your choices</h2>
      <ul>
        <li><strong>Export:</strong> download everything we hold about you from your <Link href="/app/profile">profile</Link>.</li>
        <li><strong>Delete:</strong> delete your account and all of its typing history from the same page. This is permanent.</li>
      </ul>
      <h2>Security</h2>
      <p>Passwords are hashed, sign-in cookies are HTTP-only, and each account can only read and write its own data. No system is perfectly secure, so please choose a strong, unique password.</p>
      <h2>Age</h2>
      <p>TypeMaster is intended for people aged 13 and over. If you are younger, please use it only with the permission and supervision of a parent or guardian.</p>
      <h2>Changes</h2>
      <p>If this policy changes in a meaningful way, we will update the date above.</p>
      {contact && <><h2>Contact</h2><p>Questions about your data: <a href={`mailto:${contact}`}>{contact}</a>.</p></>}
    </Prose>
  );
}
