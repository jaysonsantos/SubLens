# Repository Guidelines

## Project Overview

**SubLens** is a browser-based SRT subtitle comparison tool built with Vue 3 + TypeScript + Vite. Users upload or paste two `.srt` files and see a side-by-side diff with character-level highlighting, stats, and search.

## Project Structure & Module Organization

```
src/
  main.ts                  # App entry point
  App.vue                  # Root component (renders SubLens)
  style.css                # Global styles & CSS variables
  components/
    SubLens.vue            # Main component: upload UI, diff view, toolbar
  lib/
    srt-parser.ts          # SRT parsing and time formatting
    diff.ts                # Line diff and character-level diff (LCS/DP)
public/
  favicon.svg, icons.svg   # Static assets
tests/
  app.spec.ts              # Playwright end-to-end tests
```

## Build, Test, and Development Commands

- `bun run dev` — Start Vite dev server with HMR
- `bun run build` — Type-check with `vue-tsc` then build for production
- `bun run preview` — Preview the production build locally
- `npx playwright test` — Run end-to-end tests via Playwright (headless, 30s timeout)

The package manager is **bun** (see `bun.lock`). Install dependencies with `bun install`.

## Coding Style & Naming Conventions

- **Language:** TypeScript with strict mode via `vue-tsc`
- **Framework:** Vue 3 `<script setup lang="ts">` SFCs — use Composition API exclusively
- **Formatting:** 2-space indentation, no semicolons, single quotes
- **CSS:** Component-scoped styles in `<style>` blocks; global variables defined in `src/style.css` using `--var-name` convention (e.g., `--accent`, `--surface`)
- **Naming:** `camelCase` for functions and variables, `PascalCase` for components and TypeScript interfaces
- **Exports:** Prefer named exports; no default exports except for Vue components

## Testing Guidelines

- **Framework:** Playwright for E2E tests (`tests/` directory)
- **Server setup:** Tests spin up a Vite dev server programmatically (`createServer`) in `beforeAll`
- **Test naming:** Descriptive lowercase sentences (e.g., `app loads and shows upload state`)
- **Assertions:** Use Playwright's `expect` locators for DOM checks; also assert zero console errors/warnings
- **Test data:** Inline SRT strings in tests; use the "Load sample" button for integration flows

## Commit & Pull Request Guidelines

- Commit messages follow **conventional commits** style: `feat:`, `fix:`, `chore:`, etc. (see git history)
- Keep PRs focused on a single concern
- Include a clear description of what changed and why
- Verify `bun run build` passes before opening a PR
- Run `npx playwright test` to ensure E2E tests pass

## Architecture Notes

- The app is a single-page client-only tool — no backend or API calls
- `SubLens.vue` handles all state via Vue `ref`/`computed` — no external state management
- Diffing is performed client-side using dynamic programming (`diff.ts`): line-level alignment plus character-level LCS for inline highlighting
- SRT parsing (`srt-parser.ts`) normalizes line endings and extracts index/timestamp/text from each block
