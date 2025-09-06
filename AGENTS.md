# Repository Guidelines

## Project Structure & Modules
- `miniprogram/`: WeChat Mini Program UI
  - `pages/<page>/{index.js,json,wxml,wxss}`
  - `services/{api.js,upload.js}`, `utils/`
- `functions/<domain>/`: Cloud Functions (TypeScript)
  - `index.ts` (dispatcher), `schema.ts` (zod validation), `service.ts` (logic), build to `dist/`
- `docs/`: Architecture, specs, QA, testing plans
- `scripts/`: Data tooling and docs helpers (e.g., `gen-source-tree.sh`)
- Config: `project.config.json`, `project.private.config.json`, `.env.local`

## Build, Test, and Dev Commands
- `pnpm run build:functions`: Build all cloud functions via tsup
- `pnpm run deploy:<name>`: Deploy one function (e.g., `deploy:patients`)
- `pnpm run deploy:all`: Deploy core functions set
- `pnpm run init:db`: Deploy `init-db` and invoke once to seed
- `pnpm run docs:source-tree`: Generate `docs/source-tree.md`
Notes: Requires `pnpm`, `tcb` CLI, and WeChat DevTools CLI (`wx`). Open `miniprogram/` in WeChat DevTools for local run.

## Coding Style & Naming
- Files/dirs: `kebab-case`; constants: `UPPER_SNAKE`
- Vars/functions: `camelCase`; types/classes: `PascalCase`
- Frontend: async with `await` + `try/catch`; use `services/api.js` wrappers (e.g., `callWithRetry`)
- Backend: Return `{ ok:true,data } | { ok:false,error:{code,msg,details?} }`; validate inputs in `schema.ts` with zod
- Reference: `docs/process/coding-standards.md`

## Testing Guidelines
- Strategy: unit (functions logic), integration (DB), E2E (Mini Program flows)
- Coverage target for core modules: ≥70% (see `docs/testing/test-plan.md`)
- Place future unit tests at `functions/<domain>/__tests__/*.test.ts`
- Manual E2E via WeChat DevTools; automate when feasible

## Commit & Pull Requests
- Conventional Commits: `type(scope): subject` (e.g., `feat(patients): add create form`)
- Types: `feat|fix|docs|refactor|test|chore|perf|revert`
- PRs: concise description, linked Issue/Epic, screenshots for UI, note API/DB changes; prefer squash merge
- Size: keep diffs reasonable; add/adjust tests and docs as needed

## Security & Config
- Do not commit secrets; manage ENV/AppID/ENV_ID locally
- Mask sensitive fields server-side; log with `requestId`, avoid PII
- Follow indexes defined in `indexes.schema.json` for queries

For deeper context, start with `docs/docs-index.md` and `docs/architecture.md`.

