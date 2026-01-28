# Repository Guidelines

## Project Structure & Module Organization
- `packages/core`: shared UI, state, services, and the Moondown editor. Most business logic lives here.
- `packages/web`: Vite web entrypoint and web-only wiring.
- `packages/desktop`: Tauri desktop entrypoint, Rust integration in `src-tauri`, and desktop-specific scripts.
- `scripts`: repo-level tooling (e.g., version bumping).
- Root config: `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`.

## Build, Test, and Development Commands
- `pnpm dev`: run the web app via `@tada/web` (Vite dev server).
- `pnpm dev:desktop`: run the Tauri desktop app.
- `pnpm build`: build the web app into `packages/web/dist`.
- `pnpm build:desktop`: build desktop binaries using the custom script.
- `pnpm lint`: run ESLint across all packages.
- `pnpm bump`: update versions via `scripts/update-version.js`.

## Coding Style & Naming Conventions
- TypeScript/React with ESM modules; prefer named exports in shared modules.
- Indentation: 4 spaces; strings use single quotes.
- Components and React files use PascalCase (e.g., `App.tsx`, `GlobalStatusDisplay.tsx`).
- Hooks use `useX` naming (e.g., `useIcsAutoSync`).
- Core path alias: `@/` maps to `packages/core/src`.
- Run `pnpm lint` before pushing; keep changes minimal and focused.

## Testing Guidelines
- No automated test runner is configured yet (no `test` script in any package).
- If you add tests, document the command here and keep tests co-located with the owning package.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits observed in history: `feat:`, `fix:`, `chore:`, `refactor:`.
- PRs should include a clear description, linked issues (e.g., “fix #123”), and screenshots for UI changes.
- Ensure `pnpm lint` passes and update README/changelog docs when behavior changes.

## Configuration & Security Notes
- AI keys are configured in-app (Settings > AI Settings); avoid hardcoding secrets.
- Desktop-specific settings live under `packages/desktop/src-tauri` and should stay platform-scoped.
