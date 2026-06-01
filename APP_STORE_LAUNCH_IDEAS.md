# Atomic Fusion Rush: Gamification, Monetization, and App Store Launch Ideas

## Overview

This document captures feature ideas and implementation directions for improving **Atomic Fusion Rush** before an App Store launch. The current game already has a strong foundation: level progression, element discovery, persistent progress, sound/haptics toggles, a collection screen with periodic-table facts, scoring, and a physics-style merge board.

The biggest pre-launch opportunities are:

1. Retention loops that bring players back daily.
2. Clearer short-term and long-term goals.
3. Better replayability after levels are completed.
4. Fair monetization that does not damage puzzle balance.
5. App Store/mobile packaging and compliance preparation.

For App Store distribution, digital goods, premium unlocks, consumables, subscriptions, and game content should be planned around Apple In-App Purchase / StoreKit rather than external checkout.

Useful Apple references:

- [Apple App Review Guidelines](https://developer.apple.com/appstore/resources/approval/guidelines.html)
- [Apple App Store Get Started](https://developer.apple.com/app-store/get-started/)
- [Apple Human Interface Guidelines: In-App Purchase](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase?language=_5)

---

## Gamification Ideas

### 1. Add Daily Quests and Streak Rewards

The game currently tracks persistent progress such as unlocked level, highest element, total score, discovered elements, sound, and haptics. Add a daily reason to return that does not block normal play.

#### Implementation direction

Add a daily quest system to `src/game/store.ts` with persisted fields such as:

- `dailyQuestDate`
- `dailyQuests`
- `dailyStreak`
- `claimedDailyReward`

Create quest generation helpers in a new file such as `src/game/quests.ts`.

Suggested quest types:

1. Merge 25 atoms.
2. Discover 1 new element.
3. Reach an early element milestone, such as Helium, Lithium, or Beryllium, so the quest is achievable in 1–2 games.
4. Clear a level without game over.
5. Trigger a 3-step chain merge.

Update `src/game/GameBoard.tsx` to report quest progress when:

- Shots are fired.
- Merges happen.
- New elements are discovered.
- Levels are won.

Add a **Daily Lab** button or card to `src/game/MainMenu.tsx` showing:

- Today's quests.
- Current streak count.
- Claimable rewards.

Persist all quest data through the existing Zustand persisted store named `elemental-gold-rush`.

---

### 2. Add Combo Names, Merge Streaks, and Chain Rewards

The merge logic already tracks merge events and chain depth. Turn chain reactions into a major feedback loop.

#### Implementation direction

Extend `src/game/GameBoard.tsx` so each shot tracks the number of merge events returned from `placeAndMerge`.

Display combo labels near the board:

| Merge Count | Combo Label     |
| ----------- | --------------- |
| 2 merges    | Catalyst!       |
| 3 merges    | Reaction Chain! |
| 4+ merges   | Atomic Cascade! |
| 6+ merges   | Nuclear Rush!   |

Use the existing popup pattern in `src/game/GameBoard.tsx` for combo feedback.

Add a persisted `bestCombo` field to `src/game/store.ts`.

Update the main menu stat grid in `src/game/MainMenu.tsx` to optionally show **Best Combo** alongside or instead of the existing stats.

---

### 3. Turn the Collection Screen into a Completionist Loop

The collection screen already has a periodic table layout and element facts. Add collectible goals around categories, periods, and milestones.

#### Implementation direction

Create badge definitions in a new file such as `src/game/badges.ts`.

Suggested badges:

1. **Noble Collector** — discover all noble gases.
2. **Alchemist** — reach Gold.
3. **Radioactive Pioneer** — discover Uranium.
4. **Full Period 2** — discover all Period 2 elements.
5. **Transition Master** — discover all transition metals.

Add a persisted `earnedBadges` array to `src/game/store.ts`.

Add a helper that checks badge completion whenever `recordDiscovery` is called.

Update `src/game/Collection.tsx` to show a **Badges** section above or below the category legend, with locked and unlocked states.

---

### 4. Add Three-Star Level Mastery

The existing campaign has a strong level progression, but players need more reasons to replay completed levels.

#### Implementation direction

Extend the `Level` interface in `src/game/levels.ts` with optional mastery fields:

- `parShots`
- `scoreGoal`
- `comboGoal`

Add shot counting to `src/game/GameBoard.tsx`.

When a level is completed, calculate 1–3 stars:

1. **1 star** — reach the target element.
2. **2 stars** — reach the target plus score goal or par shots.
3. **3 stars** — reach the target plus score goal, par shots, and combo goal.

Persist level star results in `src/game/store.ts` with a map such as:

```ts
levelStars: Record<number, number>;
```

Update `src/game/LevelSelect.tsx` to display stars on completed levels.

---

### 5. Add Lab Experiment Challenge Modes

The chemistry theme supports special rules that make the board feel fresh without building an entirely new game.

#### Implementation direction

Create challenge mode configuration in a new file such as `src/game/challenges.ts`. Keep challenge-mode scores separate from campaign progression.

Suggested challenge modifiers:

1. **Unstable Isotopes** — random balls decay down by 1 after several shots.
2. **Gravity Surge** — after every 5 shots, all balls shift slightly downward.
3. **Pure Hydrogen Run** — the queue starts with mostly Hydrogen and Helium.
4. **Noble Gas Lock** — noble gases cannot merge unless activated by a power-up.
5. **Fusion Rush Timer** — reach the target before a countdown expires.

Add a `mode` prop to `src/game/GameBoard.tsx`, defaulting to normal level play.

Add a **Lab** screen option in `src/routes/index.tsx` and a **Lab Experiments** button in `src/game/MainMenu.tsx`.

Keep challenge results separate from campaign progression in `src/game/store.ts`.

---

## Monetization Ideas

### 6. Prepare Rewarded Ads and Free/Pro Tiers Carefully

A fair model for this game is a free tier with optional rewarded ads, plus a one-time Pro tier purchase that removes forced/interstitial ads and unlocks premium quality-of-life/cosmetic benefits. Rewarded ads should help players recover or boost rewards without making the game feel pay-to-win.

#### Implementation direction

Create an abstraction file such as `src/game/monetization.ts` with functions like:

```ts
export function isRewardedAdAvailable(): boolean;
export async function showRewardedAd(rewardType: RewardType): Promise<boolean>;
export function grantReward(rewardType: RewardType): void;
```

Do not hard-code a specific ad SDK in `GameBoard.tsx`. Keep the UI calling the abstraction. Gate forced/interstitial ad calls behind a `hasProPack` or equivalent entitlement check so the Pro tier can remove them cleanly without scattering purchase logic through gameplay code.

Suggested rewarded ad placements:

1. Continue once after game over.
2. Double post-level coins or points.
3. Refresh daily quest rewards.
4. Reveal one suggested shot trajectory.

Update the game-over UI in `src/game/GameBoard.tsx` to show **Watch Ad to Continue** only when available.

Update `src/game/store.ts` to track whether a rewarded continue was already used during the current run, and keep free/pro ad behavior in a small monetization layer so future ad SDK and one-time purchase integrations stay isolated.

---

### 7. Sell Cosmetics Instead of Pay-to-Win Boosts

Cosmetic monetization is the safest fit for a puzzle game. It preserves fairness while giving players reasons to customize.

#### Implementation direction

Create `src/game/cosmetics.ts` with cosmetic definitions for:

1. Board themes.
2. Element ball skins.
3. Projectile trails.
4. Merge explosion effects.
5. Menu background variants.

Add persisted fields to `src/game/store.ts`:

- `ownedCosmetics`
- `activeBoardTheme`
- `activeBallSkin`
- `activeProjectileTrail`

Update `src/game/ElementBall.tsx` and `src/game/GameBoard.tsx` to read active cosmetics and alter visuals without changing game logic.

Add a **Shop** screen in `src/routes/index.tsx` and a **Shop** button in `src/game/MainMenu.tsx`.

---

### 8. Add a One-Time Premium Upgrade

A simple premium upgrade is easier to explain than a subscription and fits a casual puzzle launch.

Suggested product: **Pro Lab Pack**.

#### Possible benefits

1. Remove forced/interstitial ads if those are added later.
2. Unlock exclusive board themes.
3. Unlock advanced stats.
4. Unlock extra challenge modes.
5. Support future updates.

#### Implementation direction

Add a persisted entitlement field in `src/game/store.ts`, such as:

```ts
hasProPack: boolean;
```

Create a `src/game/products.ts` file listing product identifiers:

- `pro_lab_pack`
- `theme_gold_lab`
- `theme_neon_periodic`
- Optional consumable coin packs if coins are added later.

Add a paywall/shop card describing the Pro Lab Pack benefits.

Implement native purchase integration through a platform layer rather than direct calls from UI components. For App Store distribution, use Apple In-App Purchase / StoreKit for digital content.

---

### 9. Keep Core Educational Facts Free

The periodic table facts are part of the game's core charm. Locking basic facts too aggressively could hurt reviews.

#### Implementation direction

Leave the existing unlocked element facts free once discovered.

Add optional premium encyclopedia fields to element data in `src/game/elements.ts`, such as:

- `deepFact`
- `realWorldUses`
- `history`
- `quizQuestion`
- `quizAnswer`

Only show premium/enhanced content if `hasProPack` is true.

Add a non-blocking upgrade prompt inside the selected element modal in `src/game/Collection.tsx`, below the free fact.

---

## Other Pre-Launch Features

### 10. Add Mobile Packaging for App Store Release

The repository currently appears to be a Vite/TanStack web app. Before launch, choose a mobile packaging strategy.

Recommended path for this codebase:

1. Add Capacitor to wrap the existing Vite/TanStack web app.
2. Create `capacitor.config.ts`.
3. Generate `ios/` and optionally `android/` native projects.
4. Configure app name, bundle identifier, icons, splash screens, and safe-area behavior.
5. Verify the game works offline inside the iOS WebView.
6. Add native bridges for haptics, ads, purchases, and analytics only behind abstraction files.

Keep all current game code under `src/game/` and avoid mixing native purchase/ad SDK calls directly into React components.

---

### 11. Add First-Run Onboarding

The current game would benefit from an interactive tutorial before the first full level. This should reduce early confusion and improve retention.

#### Implementation direction

Add a persisted `hasCompletedTutorial` boolean to `src/game/store.ts`.

Create a tutorial overlay component in `src/game/TutorialOverlay.tsx`.

In `src/game/GameBoard.tsx`, show tutorial steps on Level 1 until completed:

1. Explain the current element queue.
2. Show how aiming works.
3. Show what matching atoms does.
4. Show the target element.
5. Explain the danger line.

Add a **Replay Tutorial** button to `src/game/Settings.tsx`.

---

### 12. Add Off-Game Power-Up Inventory

Power-ups should become a lightweight meta-progression loop instead of disappearing between levels. Players can save unused run power-ups into an off-game inventory, then choose up to 3 inventory power-ups when a new level starts.

#### Implementation direction

Add a persisted inventory map in `src/game/store.ts`, such as:

```ts
powerUpInventory: Record<PowerUpId, number>;
```

When a level ends, collect unused eligible power-ups from the current run and add them to the inventory.

At the beginning of a level, show a small inventory picker if the player has saved power-ups:

1. Display owned counts for each saved power-up.
2. Let the player select up to 3 total power-ups.
3. Consume selected inventory counts only when the level starts.
4. Add the selected power-ups to the run's starting charges.
5. Let the player skip selection and start normally.

Add a shop section where saved-score purchases can add inventory power-ups. Keep this balanced as optional preparation, not mandatory progression.

---

### 13. Add a Detailed Level-Complete Summary Screen

A richer win screen would support mastery, rewards, discoveries, and monetization.

#### Implementation direction

Modify `src/game/GameBoard.tsx` so level completion opens a summary overlay before calling `onWin`.

The overlay should show:

1. Target element reached.
2. Score earned.
3. New discoveries.
4. Best combo.
5. Stars earned if mastery goals are added.
6. Buttons for **Next Level**, **Replay**, and **Main Menu**.

Trigger `unlockLevel`, `addScore`, `recordDiscovery`, and `setHighestElement` before displaying the overlay, but delay navigation until the user taps a button.

---

### 14. Add Privacy-Conscious Gameplay Analytics

Before tuning monetization, the game needs visibility into where players fail, quit, win, and replay.

#### Implementation direction

Create `src/game/analytics.ts` with functions such as:

```ts
export function trackGameStart(levelId: number): void;
export function trackShot(levelId: number, atom: number, aimDeg: number): void;
export function trackMerge(levelId: number, resultAtomicNumber: number, chainDepth: number): void;
export function trackLevelWin(
  levelId: number,
  score: number,
  shots: number,
  highestElement: number,
): void;
export function trackGameOver(
  levelId: number,
  score: number,
  shots: number,
  highestElement: number,
): void;
export function trackPurchaseStarted(productId: string): void;
export function trackPurchaseCompleted(productId: string): void;
```

Call these functions from:

- `src/game/GameBoard.tsx`
- `src/game/MainMenu.tsx`
- Any future shop/paywall screen

Keep the initial implementation as no-op console-safe functions so the game works without an analytics provider.

Before App Store submission, ensure any analytics SDK use is reflected accurately in privacy disclosures.

---

### 15. Add Progress Export/Import and Prepare for Cloud Save

Progress is currently persisted locally. If the app is deleted or installed on another device, progress may be lost.

#### Implementation direction

Add versioned progress serialization helpers in `src/game/progressBackup.ts`.

Support:

1. Export progress to a compact JSON string.
2. Import progress with schema validation.
3. Reject invalid or future-version backups safely.
4. Merge discoveries and keep the higher unlocked level/highest element.

Add buttons to `src/game/Settings.tsx`:

- **Export Save**
- **Import Save**
- **Copy Backup Code**
- **Restore From Backup Code**

Keep this independent from future iCloud/Game Center integration.

---

## Suggested Launch Priority

For the strongest App Store launch without overbuilding, prioritize:

1. First-run tutorial.
2. Level-complete summary screen.
3. Three-star level mastery.
4. Daily quests and streaks.
5. Cosmetics shop.
6. Rewarded-ad abstraction.
7. App Store/mobile packaging.
8. Basic analytics.
9. Privacy and purchase compliance review.
10. Icons, screenshots, splash screen, and onboarding copy polish.

---

## Implementation Principles

Use these principles while implementing the ideas above:

1. Keep game logic and monetization SDKs separated behind abstraction files.
2. Avoid pay-to-win mechanics that make level completion dependent on purchases.
3. Keep core educational content available through gameplay.
4. Add retention loops that reward playing, not just paying.
5. Prefer small persisted state additions over large rewrites.
6. Keep UI feedback immediate, especially for combos, discoveries, and wins.
7. Use analytics to validate which features actually improve retention and conversion.
