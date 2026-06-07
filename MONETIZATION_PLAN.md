# Monetization Plan

This plan turns the Gemini product blueprint into a staged release roadmap for Atomic Fusion Rush. The guiding idea is to improve trust, feel, and retention before expanding monetization pressure.

## Next Release Goal

Ship a version that feels more polished, is App Store-safe, has cleaner web/legal routing, and gives players a reason to come back without risking the whole game loop.

## Release Segment 1: Ship Blockers And Trust

Priority: must-have.

- Fix `/privacy`, `/terms`, and `/support` deployment behavior permanently.
- Keep legal/support links on stable `.html` pages until clean URLs are proven stable.
- Confirm App Store listing link, support email, privacy policy, and terms are consistent everywhere.
- Verify purchase restore, App Store purchase messages, and RevenueCat states.
- Add or maintain a small diagnostics checklist for ad and purchase readiness.

Outcome: prevent App Store, legal, and player trust issues from blocking future monetization.

## Release Segment 2: Game Feel Upgrade

Priority: next-release centerpiece.

- Add merge particles, burst animation, and score popups.
- Add squash/stretch or pulse on atom merge.
- Add haptic tiers:
  - Light: drop/contact.
  - Medium: normal merge.
  - Heavy: milestone/new element.
  - Warning: near game-over.
- Add stronger audio feedback for merge chains and rare unlocks.
- Add danger-state feedback when the board is close to overflowing.

Outcome: make the core loop feel satisfying enough to support retention and later monetization.

## Release Segment 3: Retention MVP

Priority: ship a small version first.

- Add a simple Daily Research lite panel.
- Give 2-3 daily tasks, such as reaching Carbon, triggering 5 merges, or discovering 1 compound.
- Reward gold, one power-up, or a temporary booster.
- Add a visible come-back-tomorrow state.

Outcome: prove a daily habit loop before building a full battle pass.

## Release Segment 4: Strategic Depth MVP

Priority: one mechanic only.

First candidate: Plus Atom Catalyst.

- Rarely appears or can be bought with gold.
- Lets two matching nearby elements jump to the next element.
- Gives players an escape tool when the board gets congested.

Deferred: Dark Plus, Minus Atom, and full dual-mode gameplay.

Outcome: increase player agency without adding too many new rules at once.

## Release Segment 5: Monetization Hygiene

Priority: only after stability.

- Rewarded ad for save-run or continue-after-Big-Crunch.
- Interstitial only after natural breaks, never during active play.
- Keep banners off the active playfield unless layout is rock solid.
- Make ATT/ad consent behavior correct before loading monetized ads.

Outcome: introduce revenue without damaging trust or retention.

## Release Segment 6: Store And Landing Polish

Priority: quick win.

- Update App Store metadata around keywords such as periodic table game, element merge puzzle, chemistry puzzle, and atom fusion.
- Use real gameplay screenshots and short preview clips.
- Keep landing page focused on App Store download, web game, power-ups, and compound examples.

Outcome: improve conversion once the game feel is stronger.

## Deferred To Later Releases

- Full WebGL/Pixi/Phaser rewrite.
- Full Battle Pass / premium Research Grid.
- Cross-platform Supabase account sync.
- Full dual-mode gameplay with Addition Mode.
- Multiple new catalysts at once.
- Large-scale TikTok or influencer campaign before game feel improves.

## Recommended Next Release Scope

1. Legal/web routing hardening.
2. App Store and landing page cleanup.
3. Segment 2 game-feel upgrade.
4. Daily Research lite.
5. One catalyst: Plus Atom.
6. Optional rewarded continue if ads are technically ready.

# Segment 2 Implementation Plan

Segment 2 should build on the feedback systems already present in the codebase instead of introducing a separate engine. Current useful foundations:

- `src/game/audio.ts` already has WebAudio merge, shoot, win, ambient music, and haptic fallback helpers.
- `src/game/nativeHaptics.ts` already maps vibration durations to Capacitor haptic impact styles.
- `src/game/GameBoard.tsx` already tracks merge events, combo labels, danger-zone shading, score history, stage-clear effects, and power-up visual effects.
- `src/styles.css` already contains merge-combo, compound, gravity, fusion-jump, danger-zone, and stage-clear animation styles.

## Segment 2A: Feedback Event Helpers

Create a small feedback layer that standardizes game-feel events.

Suggested file:

- `src/game/feedback.ts`

Suggested API:

```ts
export type FeedbackEvent =
  | { type: "drop" }
  | { type: "merge"; chainDepth: number; atomicNumber: number; isotope?: boolean }
  | { type: "combo"; mergeCount: number }
  | { type: "milestone"; atomicNumber: number }
  | { type: "danger"; severity: "low" | "high" }
  | { type: "game-over" }
  | { type: "win" };

export function playFeedback(event: FeedbackEvent, options: { hapticsEnabled: boolean; soundEnabled: boolean }): void;
```

Implementation notes:

- Route audio through existing functions in `audio.ts`.
- Route haptics through `vibrate(...)` initially, or typed wrappers added to `nativeHaptics.ts`.
- Keep this helper side-effect only; do not mutate game state here.

Why: the board currently calls `sfx`, `haptic`, `playMergeSound`, and `spawnPopup` directly in many places. A feedback helper makes later tuning much easier.

## Segment 2B: Audio Upgrade

Extend `src/game/audio.ts` with more specific one-shot sounds.

Add:

- `playDropSound()`: short low-volume contact click.
- `playComboSound(mergeCount: number)`: layered arpeggio or rising sparkle for 2+ merges.
- `playMilestoneSound(atomicNumber: number)`: brighter unlock cue for new element or target.
- `playDangerSound(severity: "low" | "high")`: subtle warning pulse, rate-limited.
- `playGameOverSound()`: short falling tone.

Rules:

- Keep sounds synthesized with WebAudio, no asset dependency yet.
- Rate-limit danger audio so it does not nag every render.
- Respect the existing `sfxEnabled` setting.

## Segment 2C: Haptic Tiering

Improve haptic semantics without changing settings UX.

Add wrappers in `src/game/nativeHaptics.ts` or `src/game/audio.ts`:

- `triggerSoftImpact()`
- `triggerMergeHaptic(chainDepth: number)`
- `triggerMilestoneHaptic()`
- `triggerDangerWarning()`
- `triggerGameOverHaptic()`

Initial mapping:

- Drop/contact: `12` or light impact.
- Standard merge: `25-35` or medium impact.
- Combo chain: `[15, 25, 15]`, scaling lightly by merge count.
- Milestone/new element: `[30, 60, 30, 80]`.
- Danger: warning notification if Capacitor supports it, otherwise `[20, 40, 20]`.
- Game over: existing heavy pattern.

## Segment 2D: Merge Burst Particles

Add board-local particle state in `GameBoard.tsx`.

Suggested type:

```ts
type MergeBurstFx = {
  id: number;
  x: number;
  y: number;
  atom: number;
  chainDepth: number;
  particles: Array<{ angle: number; distance: number; delay: number }>;
};
```

Implementation:

- Spawn one burst per merge in the existing `result.merges.forEach(...)` flow.
- Use atom glow color from `ELEMENTS[atom - 1]?.glowColor`.
- Render small absolutely positioned spans inside the board overlay.
- CSS animates particles outward and fades them.
- Cap total live bursts to avoid clutter and performance spikes.

Suggested CSS:

- `.merge-burst-fx`
- `.merge-burst-particle`
- `@keyframes merge-particle-pop`

## Segment 2E: Atom Squash/Pulse On Merge

Current `highlightId` marks the final ball. Improve the visual by adding a short merge class to recently merged balls.

Implementation options:

1. Add `mergePulseIds: Set<number>` state and apply a class to matching `ElementBall` containers.
2. Or add `lastMergedAt`/`mergePulseId` metadata in render-only state, not persisted board data.

Preferred: option 1, because it avoids changing the core `Ball` model.

CSS:

- `.atom-merge-pulse`
- `@keyframes atom-merge-squash`

Animation:

- Scale `1 -> 1.16 -> 0.94 -> 1`.
- Add brightness/drop-shadow pulse.
- Duration around 360-480 ms.

## Segment 2F: Score Popups

The game already has generic `spawnPopup(...)` and shot history. Add board-positioned score popups for merge points.

Implementation:

- New state `scorePopups` with `x`, `y`, `points`, `chainDepth`, `isotope`.
- Spawn from each `MergeEvent` using `m.scoreGained` after multiplier calculation where possible.
- Use `formatScore(...)`.
- Make popups board-local instead of global random-position text.

CSS:

- `.score-popup-fx`
- `@keyframes score-popup-rise`

## Segment 2G: Danger Feedback

The danger zone already has visual shading. Add threshold-based feedback.

Implementation:

- Compute highest atom top/stack pressure against `geo.dangerY`.
- Track previous danger state in a ref so warnings fire only on transitions.
- Trigger:
  - low danger: subtle pulse and light warning haptic.
  - high danger: stronger pulse, warning haptic, maybe one audio ping.

Avoid:

- Triggering haptics every render.
- Making the danger sound loop continuously.

## Segment 2H: Verification Plan

Manual checks:

- Start a normal campaign level and fire a non-merging shot: drop sound/haptic only.
- Trigger one merge: medium haptic, merge sound, particle burst, atom pulse.
- Trigger 2+ chain: combo rings still work, new particles do not obscure gameplay.
- Reach target/new element: milestone sound/haptic plays once.
- Fill board near danger line: warning feedback fires once per threshold.
- Toggle haptics off: no haptics.
- Toggle sound off: no sounds.

Automated checks:

- Run TypeScript/Vite web build.
- Run Capacitor build.
- Add small unit tests only if a feedback helper has pure mapping logic.

## Segment 2 Delivery Order

1. Add typed feedback helper and audio/haptic wrappers.
2. Wire normal drop, merge, combo, milestone, and game-over calls through it.
3. Add merge particle state/render/CSS.
4. Add atom pulse state/render/CSS.
5. Add board-positioned score popups.
6. Add danger threshold feedback.
7. Tune timings and reduce clutter on mobile.

## Segment 2 Release Acceptance Criteria

- Merges feel visibly and audibly stronger than the current build.
- Haptic and audio settings are respected.
- No gameplay rule changes are introduced.
- No new monetization prompts are introduced in this segment.
- Mobile layout remains stable.
- Web and Capacitor builds pass.
