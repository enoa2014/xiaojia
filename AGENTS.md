# Repository Guidelines

This guide helps contributors work effectively in this WeChat Mini Program + Cloud Functions repo.

## Project Structure & Module Organization
- `miniprogram/`: UI code
  - `pages/<page>/{index.js,json,wxml,wxss}` for screens
  - `components/` reusable UI blocks
  - `services/{api.js,upload.js,theme.js}` API calls, uploads, theming
  - `styles/{tokens.wxss}` + `app.wxss` design tokens/utilities
- `functions/<domain>/`: Cloud Functions (TypeScript)
  - `index.ts` dispatcher, `schema.ts` zod validation, `service.ts` logic; build outputs to `dist/`
- `docs/`: Architecture, specs, QA/testing plans
- `scripts/`: Tooling (build, deploy, docs)
- `.bmad-core/agents/`: Agent role definitions and configs (e.g., `po.md`)

## Build, Test, and Development Commands
- Prereqs: `pnpm`, `tcb` CLI, WeChat DevTools CLI (`wx`).
- Build functions: `pnpm run build:functions` — tsup build for all functions.
- Deploy single: `pnpm run deploy:<name>` (e.g., `deploy:patients`).
- Deploy core set: `pnpm run deploy:all`.
- Init database: `pnpm run init:db` — deploy `init-db` and invoke once to seed.
- Generate source tree: `pnpm run docs:source-tree`.
- Local preview: open `miniprogram/` in WeChat DevTools.

## Coding Style & Naming Conventions
- Files/dirs: kebab-case (e.g., `patients-list`). Constants: `UPPER_SNAKE`.
- Variables/functions: camelCase. Types/classes: PascalCase.
- Frontend: use `await` + `try/catch`; call backends via `services/api.js`; prefer utilities from `styles/tokens.wxss`/`app.wxss` over ad‑hoc styles.
- Backend: return `{ ok: true, data }` or `{ ok: false, error: { code, msg, details? } }`; validate inputs in `schema.ts` with zod.

## Testing Guidelines
- Unit: Function logic under `functions/<domain>/__tests__/*.test.ts`; target ≥70% coverage for core modules.
- Integration: Database-focused tests; ensure required indexes exist.
- E2E: Manual flows via WeChat DevTools; automate when feasible.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits — `type(scope): subject` (types: `feat|fix|docs|refactor|test|chore|perf|revert`).
- PRs: concise description, link Issue/Epic, screenshots for UI changes, note API/DB impacts; prefer squash merge.

## Security & Configuration Tips
- Never commit secrets; manage `AppID`/`ENV_ID` locally (`.env.local`, DevTools settings).
- Mask sensitive fields server‑side; include `requestId` in logs; avoid PII.
- Follow `indexes.schema.json` for query indexes.

## Agent‑Specific Tips
- Agents live in `.bmad-core/agents/`; use kebab-case for filenames.
- PO reference: `.bmad-core/agents/po.md` (Product Owner workflows/commands).
- Use `rg` to navigate quickly; keep changes minimal and consistent.
- Reuse `services/theme.applyThemeByRole` when theming.
- Respect backend return/validation shapes; avoid broad refactors without need.
