# Repository Guidelines

## Project Structure & Module Organization
- `miniprogram/`: WeChat Mini Program UI
  - `pages/<page>/{index.js,json,wxml,wxss}` (screens)
  - `components/` (reusable UI)
  - `services/{api.js,upload.js,theme.js}` (calls, uploads, theming)
  - `styles/tokens.wxss` + `app.wxss` (design tokens + utilities)
- `functions/<domain>/`: Cloud Functions (TypeScript)
  - `index.ts` (dispatcher), `schema.ts` (zod validation), `service.ts` (logic), build to `dist/`
- `docs/`: Architecture, specs, QA, testing plans
- `scripts/`: Tooling (build, deploy, docs)

## Build, Test, and Development Commands
- `pnpm run build:functions`: Build all cloud functions via tsup
- `pnpm run deploy:<name>`: Deploy one function (e.g., `deploy:patients`)
- `pnpm run deploy:all`: Deploy core functions set
- `pnpm run init:db`: Deploy `init-db` then invoke once to seed
- `pnpm run docs:source-tree`: Generate `docs/source-tree.md`
Notes: Requires `pnpm`, `tcb` CLI, and WeChat DevTools CLI (`wx`). Open `miniprogram/` in WeChat DevTools for local preview.

## Coding Style & Naming Conventions
- Files/dirs: kebab-case (`patients-list`); constants: UPPER_SNAKE
- Vars/functions: camelCase; types/classes: PascalCase
- Frontend: use `await` + `try/catch`; call backends via `services/api.js`
- Backend: return `{ ok:true,data } | { ok:false,error:{ code,msg,details? } }`; validate inputs in `schema.ts` (zod)
- Keep tokens/utilities in `tokens.wxss`/`app.wxss`; prefer utilities over ad‑hoc styles

## Testing Guidelines
- Unit (functions logic), integration (DB), E2E (Mini Program flows)
- Place unit tests at `functions/<domain>/__tests__/*.test.ts`
- Target coverage (core modules): ≥70%
- Manual E2E via WeChat DevTools; automate when feasible

## Commit & Pull Request Guidelines
- Conventional Commits: `type(scope): subject` (e.g., `feat(patients): add create form`)
- Types: `feat|fix|docs|refactor|test|chore|perf|revert`
- PRs: concise description, linked Issue/Epic, screenshots for UI, note API/DB changes; prefer squash merge

## Security & Configuration
- Do not commit secrets; manage AppID/ENV_ID locally (`.env.local`, DevTools)
- Mask sensitive fields server‑side; log with `requestId`, avoid PII
- Follow indexes defined in `indexes.schema.json` for queries

## Tips for Agents
- Respect project returns/validation shape; reuse `services/theme.applyThemeByRole`
- Use `rg` to find pages; adhere to directory and naming rules when adding modules

