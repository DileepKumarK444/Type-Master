import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EmailNotConfiguredError, pickTransport, resetEmail, sendEmail } from "./email";

const mail = resetEmail("a@b.example", "https://x.example/reset-password?token=abc&x=1", 60);

describe("pickTransport", () => {
  it("prefers resend when configured, honours explicit choices, and defaults to console outside production", () => {
    expect(pickTransport({ RESEND_API_KEY: "k" })).toBe("resend");
    expect(pickTransport({ EMAIL_TRANSPORT: "file" })).toBe("file");
    expect(pickTransport({ EMAIL_TRANSPORT: "console", NODE_ENV: "production" })).toBe("console");
    expect(pickTransport({ NODE_ENV: "development" })).toBe("console");
  });
  it("refuses to guess in production", () => {
    expect(() => pickTransport({ NODE_ENV: "production" })).toThrow(EmailNotConfiguredError);
    expect(() => pickTransport({ NODE_ENV: "production", EMAIL_TRANSPORT: "smtp" })).toThrow(EmailNotConfiguredError);
  });
});

describe("resend transport", () => {
  const env = { RESEND_API_KEY: "re_test", EMAIL_FROM: "TypeMaster <no-reply@x.example>" };
  it("posts the message with the API key", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendEmail(mail, env, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toMatchObject({ from: env.EMAIL_FROM, to: ["a@b.example"], subject: mail.subject });
  });
  it("fails loudly when the provider rejects, and when EMAIL_FROM is missing", async () => {
    await expect(sendEmail(mail, env, (async () => new Response("no", { status: 422 })) as unknown as typeof fetch)).rejects.toThrow(/rejected/);
    await expect(sendEmail(mail, { RESEND_API_KEY: "k" }, vi.fn() as unknown as typeof fetch)).rejects.toBeInstanceOf(EmailNotConfiguredError);
  });
});

describe("file and console transports", () => {
  it("appends JSON lines to the outbox file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tm-mail-"));
    const file = join(dir, "nested", "out.jsonl");
    await sendEmail(mail, { EMAIL_TRANSPORT: "file", EMAIL_OUTBOX_FILE: file });
    await sendEmail({ ...mail, to: "c@d.example" }, { EMAIL_TRANSPORT: "file", EMAIL_OUTBOX_FILE: file });
    const lines = (await readFile(file, "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.to)).toEqual(["a@b.example", "c@d.example"]);
    expect(lines[0].text).toContain("token=abc");
  });
  it("requires an outbox path for the file transport", async () => {
    await expect(sendEmail(mail, { EMAIL_TRANSPORT: "file" })).rejects.toBeInstanceOf(EmailNotConfiguredError);
  });
  it("prints to the log for console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail(mail, { EMAIL_TRANSPORT: "console" });
    expect(log.mock.calls[0][0]).toContain("a@b.example");
    log.mockRestore();
  });
});

describe("resetEmail", () => {
  it("includes the link in both parts and escapes it in HTML", () => {
    expect(mail.text).toContain("token=abc&x=1");
    expect(mail.html).toContain("token=abc&amp;x=1");
    expect(mail.text).toContain("60 minutes");
  });
});
