# TypeMaster
Planning docs: [docs/](docs/README.md). App: `apps/web` (Next.js 15, TypeScript, Tailwind, Auth.js, Postgres + Drizzle).

## Setup
```bash
npm install
createdb typemaster_dev && createdb typemaster_test      # or: docker compose up -d (creates typemaster_dev)
npm run setup:env                                        # creates apps/web/.env.local and fills DATABASE_URL + AUTH_SECRET
DATABASE_URL=postgres://localhost:5432/typemaster_dev npm run migrate -w packages/db
npm run dev                                              # http://localhost:3000
```
Checks: `npm run lint && npm run typecheck && DATABASE_URL_TEST=postgres://localhost:5432/typemaster_test npm test && npm run build`
(DB integration tests are skipped when `DATABASE_URL_TEST` is unset.)
Schema changes: edit `packages/db/src/schema.ts`, then `npm run generate -w packages/db` and migrate.
In development, password-reset links are printed in the server log (no email provider needed). Google sign-in appears only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.

## More checks
```bash
npm run build:test -w apps/web && npm run e2e -w apps/web   # Playwright + axe accessibility, on a throwaway DB (needs Google Chrome)
npm run build:test -w apps/web && npm run lighthouse -w apps/web   # Lighthouse mobile audit of 12 pages; fails below 90
# (build:test writes to apps/web/.next-test, so it never disturbs a running `npm run dev`)
```
Launch status, deployment steps and env vars: [docs/10-launch-readiness.md](docs/10-launch-readiness.md).
