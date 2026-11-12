import { runMigrations } from "./migrate";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
runMigrations(url).then(() => console.log("migrations applied"), (e) => { console.error(e); process.exit(1); });
