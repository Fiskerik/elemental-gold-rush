# Atomic Fusion Rush TikTok slideshow

This is a ready-to-upload, five-slide carousel designed for TikTok Photo Mode. The game name is held until slide 5 on purpose: the earlier slides read like native puzzle-game discovery content instead of an ad.

## Upload order

1. `slide-01-hook.png`
2. `slide-02-merge.png`
3. `slide-03-danger-line.png`
4. `slide-04-collect.png`
5. `slide-05-search.png`

Slide 5 now uses a simple **Now on App Store** CTA. Use `slide-05-live-store-card.png` only if you prefer the older, more branded end card.

`carousel-preview.png` is just a review sheet; do not upload it.

## Caption

> A tiny chemistry puzzle for when your brain wants one satisfying win. Match atoms, build chain reactions, and see how far up the periodic table you can get. ✨ Atomic Fusion Rush is in bio.

Suggested tags: `#puzzlegame #mobilegame #satisfying #cozygaming #chemistry #indiegame`

## TikTok posting notes

- Upload the five PNGs as a native **Photo Mode** post, in order. Add music natively; do not bake TikTok audio into the images.
- Use an atmospheric, slow-building sound. The slide copy should still make sense with sound off.
- Add a short per-image alt description; a ready-to-paste set is in `POSTING.md`.
- Keep the account itself low-brand, but retain the game name/icon on the final slide. It is the bridge from views to installs.

## Cross-platform reuse

- **Instagram:** export these five slides as a 10–15 second 9:16 Reel with a gentle 1.5–2 second pan/zoom per image, then add audio natively.
- **YouTube:** test both a normal 9:16 Short and its image-carousel post (where available to the channel). Put the game name in the title or first description line.
- **Pinterest:** use the same 9:16 motion version as a Video Pin with a direct store or landing-page link. Make a separate 2:3 static Pin from slide 1 for search.

## Regenerate

The source file is `scripts/generate-tiktok-slideshow.mjs`.

```powershell
node scripts/generate-tiktok-slideshow.mjs
```

It uses the canonical game screenshots, so it is safe to rerun after those screenshots are refreshed. It does not edit game code.

The slide 3 showcase is rendered from the live `PowerUpBadge` components. Refresh it after icon artwork changes, then regenerate the carousel:

```powershell
node scripts/render-tiktok-powerups.mjs
node scripts/generate-tiktok-slideshow.mjs
```
