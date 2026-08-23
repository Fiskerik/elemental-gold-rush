# App Store Release Notes Workflow

Use this workflow for every Atomic Fusion Rush release.

## Required steps

1. Copy `release-notes/TEMPLATE.md` to `release-notes/<version>.md`.
2. Compare against the previous App Store version and record meaningful gameplay, rewards, progression, leaderboard, purchase, localization, accessibility, performance, and major UI changes.
3. Provide both fields for all 29 configured locales:
   - Promotional Text: maximum 170 characters.
   - What's New: maximum 4,000 characters.
4. Keep sections in the exact order used by `appstore.config.json`.
5. Keep product names unchanged, omit quotation marks around store copy, and review every translation before upload.
6. Validate before uploading:

```bash
npm run appstore:validate -- --version <version>
```

## Supported locale codes

| Display name        | App Store locale |
| ------------------- | ---------------- |
| English (UK)        | `en-GB`          |
| English (Australia) | `en-AU`          |
| Arabic              | `ar-SA`          |
| Chinese Simplified  | `zh-Hans`        |
| Chinese Traditional | `zh-Hant`        |
| Czech               | `cs`             |
| Danish              | `da`             |
| Dutch               | `nl-NL`          |
| English             | `en-US`          |
| Finnish             | `fi`             |
| French              | `fr-FR`          |
| German              | `de-DE`          |
| Hindi               | `hi`             |
| Indonesian          | `id`             |
| Italian             | `it`             |
| Japanese            | `ja`             |
| Korean              | `ko`             |
| Malay               | `ms`             |
| Norwegian           | `no`             |
| Polish              | `pl`             |
| Portuguese (Brazil) | `pt-BR`          |
| Russian             | `ru`             |
| Spanish             | `es-ES`          |
| Swedish             | `sv`             |
| Tamil               | `ta-IN`          |
| Thai                | `th`             |
| Turkish             | `tr`             |
| Ukrainian           | `uk`             |
| Vietnamese          | `vi`             |
