import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface Email { to: string; subject: string; text: string; html: string }

export class EmailNotConfiguredError extends Error {}

type Env = Record<string, string | undefined>;

/**
 * Which transport to use:
 *  - EMAIL_TRANSPORT=resend (or RESEND_API_KEY set): real delivery through Resend's HTTP API.
 *  - EMAIL_TRANSPORT=file: append JSON lines to EMAIL_OUTBOX_FILE (used by the e2e tests).
 *  - EMAIL_TRANSPORT=console, or nothing configured outside production: print to the server log (development only).
 *  In production with nothing configured we refuse to send rather than quietly logging a reset link.
 */
export function pickTransport(env: Env = process.env): "resend" | "file" | "console" {
  const t = env.EMAIL_TRANSPORT;
  if (t === "resend" || (!t && env.RESEND_API_KEY)) return "resend";
  if (t === "file") return "file";
  if (t === "console" || (!t && env.NODE_ENV !== "production")) return "console";
  throw new EmailNotConfiguredError("No email transport configured (set RESEND_API_KEY and EMAIL_FROM)");
}

export async function sendEmail(email: Email, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<void> {
  const transport = pickTransport(env);
  if (transport === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new EmailNotConfiguredError("RESEND_API_KEY and EMAIL_FROM are required");
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!res.ok) throw new Error(`Email provider rejected the message (${res.status})`);
    return;
  }
  if (transport === "file") {
    const file = env.EMAIL_OUTBOX_FILE;
    if (!file) throw new EmailNotConfiguredError("EMAIL_OUTBOX_FILE is required for the file transport");
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify({ ...email, at: new Date().toISOString() }) + "\n");
    return;
  }
  console.log(`[email:console] to=${email.to} subject="${email.subject}"\n${email.text}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resetEmail(to: string, link: string, minutes: number): Email {
  return {
    to,
    subject: "Reset your TypeMaster password",
    text: `Someone (hopefully you) asked to reset the password for this TypeMaster account.\n\nChoose a new password here (the link works once and expires in ${minutes} minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password won't change.`,
    html: `<p>Someone (hopefully you) asked to reset the password for this TypeMaster account.</p><p><a href="${esc(link)}">Choose a new password</a><br><small>The link works once and expires in ${minutes} minutes.</small></p><p>If you didn't ask for this, you can ignore this email; your password won't change.</p>`,
  };
}
