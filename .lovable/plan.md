# Web Info Landing Page + Game at /game

## Goal
On the **web** build, make `/` a concise info/marketing one-pager with a prominent **Play** button in the hero, plus short mechanics and powerups sections and a footer with Terms / Privacy / Copyright. The full game moves to **`/game`**. The **mobile (Capacitor) build must be completely unaffected** — it keeps booting straight into the game.

## How mobile stays safe
Both web and mobile load the same router and both boot at `/`. To avoid the info page ever showing on mobile, the `/` route detects the native platform (`Capacitor.isNativePlatform()`) and renders the game exactly as today. Only true web browsers see the new landing page. No changes to `capacitor.config.ts`, the Capacitor entry, or the iOS project.

## Changes

### 1. Extract the game shell into a reusable component
- Move the current game UI logic from `src/routes/index.tsx` (the `Index` component: launch screen, `Screen` state machine, menu/levels/game/collection/etc., resume-run prompt) into a new component `src/game/GameApp.tsx`, exported as `GameApp`.
- Keep all existing behavior identical (theme effect, status bar, launch screen, resume prompt). This is a pure move/rename, no logic change.

### 2. New `/game` route
- Create `src/routes/game.tsx` → `createFileRoute("/game")` that renders `<GameApp />`.
- Give it the game-focused `head()` metadata currently on the index route (the "Atomic Fusion Rush — Periodic Table Merge Puzzle" title/description).

### 3. Rewrite `/` (`src/routes/index.tsx`) as the landing page
- At the top of the component: `if (Capacitor.isNativePlatform()) return <GameApp />;` so mobile renders the game unchanged.
- Otherwise render a new `LandingPage` component containing:
  - **Hero**: game name, tagline, the game icon, and a prominent **Play Now** button that navigates to `/game` (using TanStack `Link to="/game"`). Secondary "Learn more" anchor scrolling down.
  - **Mechanics section**: 3–4 short cards explaining the core loop (drop atoms, merge identical elements to climb the periodic table, chase Gold, 118 real elements with chemistry facts).
  - **Powerups section**: a compact showcase pulling a handful from `src/game/powerUps.ts` (e.g. Shimmer Atom, Grab, E-Gun, Gravity) with name + short effect.
  - **Footer**: links to `/terms`, `/privacy`, `/support`, and copyright line "© EA Consulting 2026". 
- Update the index `head()` for SEO as an info page (distinct title/description, e.g. "Atomic Fusion Rush — Merge the Periodic Table" + a one-line description), keeping og tags.
- Styling uses existing semantic design tokens from `src/styles.css` (no hard-coded colors), matching the game's dark aesthetic.

### 4. Cleanup / consistency
- Ensure the launch screen only runs inside `GameApp` (so the web landing page renders immediately without the "Loading compounds..." splash).
- No edits to `routeTree.gen.ts` (auto-generated), no edits to mobile entry/config files.

## Technical notes
- New files: `src/game/GameApp.tsx`, `src/routes/game.tsx`. Rewritten: `src/routes/index.tsx`.
- `GameApp.tsx` will contain everything the current `Index` component has, including `LaunchScreen`, `ResumeRunPrompt`, and the button style consts.
- Platform detection via `@capacitor/core` (already a dependency and already imported in the current index route), so SSR-safe — `isNativePlatform()` returns false on the server/web, true only in the native webview.
- Footer legal pages already exist as routes (`/terms`, `/privacy`, `/support`), so footer just links to them.

## Out of scope
- No gameplay/logic changes.
- No backend, no new dependencies.
- No changes to the iOS build pipeline, Capacitor config, or screenshot scripts.
