# Repository Guidelines

## Project Structure & Module Organization
- `miniprogram/`: WeChat Mini Program UI
  - `pages/<page>/{index.js,json,wxml,wxss}` for screens
  - `components/` for reusable UI blocks
  - `services/{api.js,upload.js,theme.js}` for API calls, uploads, theming
  - `styles/tokens.wxss` + `app.wxss` for design tokens/utilities
- `functions/<domain>/`: Cloud Functions (TypeScript)
  - `index.ts` (dispatcher), `schema.ts` (zod validation), `service.ts` (logic); build outputs to `dist/`
- `docs/`: Architecture, specs, QA, testing plans
- `scripts/`: Tooling (build, deploy, docs)

## Build, Test, and Development Commands
- `pnpm run build:functions`: Build all cloud functions via tsup
- `pnpm run deploy:<name>`: Deploy one function (e.g., `deploy:patients`)
- `pnpm run deploy:all`: Deploy the core functions set
- `pnpm run init:db`: Deploy `init-db`, then invoke once to seed
- `pnpm run docs:source-tree`: Generate `docs/source-tree.md`
Notes: Requires `pnpm`, `tcb` CLI, and WeChat DevTools CLI (`wx`). Open `miniprogram/` in WeChat DevTools for local preview.

## Coding Style & Naming Conventions
- Files/dirs: kebab-case (e.g., `patients-list`); constants: `UPPER_SNAKE`
- Vars/functions: camelCase; types/classes: PascalCase
- Frontend: use `await` + `try/catch`; call backends via `services/api.js`; prefer utilities from `tokens.wxss`/`app.wxss` over ad‑hoc styles
- Backend: return `{ ok: true, data } | { ok: false, error: { code, msg, details? } }`; validate inputs in `schema.ts` (zod)
- Keep changes minimal and consistent with existing patterns

## Testing Guidelines
- Unit (functions logic), integration (DB), E2E (Mini Program flows)
- Place unit tests at `functions/<domain>/__tests__/*.test.ts`
- Target coverage for core modules: ≥70%
- E2E runs manually via WeChat DevTools; automate when feasible

## Commit & Pull Request Guidelines
- Conventional Commits: `type(scope): subject` (e.g., `feat(patients): add create form`)
- Types: `feat|fix|docs|refactor|test|chore|perf|revert`
- PRs: concise description, linked Issue/Epic, screenshots for UI, note API/DB changes; prefer squash merge

## Security & Configuration
- Do not commit secrets; manage AppID/ENV_ID locally (`.env.local`, DevTools)
- Mask sensitive fields server‑side; log with `requestId`, avoid PII
- Follow `indexes.schema.json` for query indexes

## Tips for Agents
- Use `rg` to navigate pages/files quickly; adhere to directory and naming rules
- Reuse `services/theme.applyThemeByRole` where applicable
- Respect backend return/validation shapes; avoid broad refactors without need
