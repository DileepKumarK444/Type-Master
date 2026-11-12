// Usage: npm run setup:env
// Creates apps/web/.env.local if needed and fills any EMPTY (or placeholder) required values (never overwrites real values you set).
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";

const dir = new URL("../apps/web/", import.meta.url);
const target = new URL(".env.local", dir);
const example = new URL(".env.example", dir);

const defaults = {
  DATABASE_URL: `postgres://${userInfo().username}@localhost:5432/typemaster_dev`,
  AUTH_SECRET: randomBytes(32).toString("base64"),
  AUTH_TRUST_HOST: "true",
};

let text = existsSync(target) ? readFileSync(target, "utf8") : readFileSync(example, "utf8");
const filled = [];
for (const [key, value] of Object.entries(defaults)) {
  const re = new RegExp(`^${key}=.*$`, "m");
  const m = text.match(re);
  const current = m ? m[0].slice(key.length + 1).trim() : "";
  const isPlaceholder = key === "DATABASE_URL" && /\/\/user(:[^@]*)?@/.test(current); // the example file's "user" is not a real role
  if (current !== "" && !isPlaceholder) continue; // already set to a real value: keep it
  text = m ? text.replace(re, `${key}=${value}`) : `${text.replace(/\n?$/, "\n")}${key}=${value}\n`;
  filled.push(key);
}
writeFileSync(target, text);
console.log(filled.length ? `apps/web/.env.local updated. Filled: ${filled.join(", ")}` : "apps/web/.env.local already has all required values.");
