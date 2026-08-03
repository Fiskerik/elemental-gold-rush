# Atomic Fusion Rush App Store Localization Package

This package contains first-pass App Store Connect metadata for 15 high-reach locales:

`en-US`, `zh-Hans`, `es-ES`, `hi`, `ar`, `pt-BR`, `fr-FR`, `de-DE`, `ja`, `ko`, `ru`, `id`, `tr`, `it`, and `vi`.

Use `packages.json` as the source for each App Store localization:

- App name
- Subtitle
- Promotional text
- Description
- Keywords
- App Review notes
- In-App Purchase display names and descriptions

English remains the primary/default language in the app. The in-app language picker is available from `Profile -> Display -> Language`.

Before submitting, quickly review screenshots and text overflow in the App Store preview, especially for Arabic, German, Russian, Turkish, Hindi, and Vietnamese.

## Release notes

For releases after 1.1.1, copy `release-notes/TEMPLATE.md` to `release-notes/<version>.md`, replace every placeholder, and validate it:

```bash
npm run appstore:validate -- --version 1.1.2
```

The validator checks all 15 locales, alphabetical locale order, required fields, Promotional Text’s 170-character limit, and What’s New’s 4,000-character limit.

After the 1.1.2 version exists in App Store Connect and the release notes are approved locally, upload them with:

```bash
npm run appstore:upload -- --version 1.1.2 --dry-run
npm run appstore:upload -- --version 1.1.2
```

The uploader updates existing App Store version localizations and creates missing version and app-information localizations from `packages.json`. It uses App Store Connect API credentials supplied through environment variables:

```text
ASC_ISSUER_ID
ASC_KEY_ID
ASC_PRIVATE_KEY       # PEM contents; use \\n for line breaks in CI variables
```

Alternatively, set `ASC_PRIVATE_KEY_PATH` to a local `.p8` file. Never commit the key or put it in a Vite environment file.

Follow [RELEASE_NOTES_WORKFLOW.md](./RELEASE_NOTES_WORKFLOW.md) for every release after 1.1.0. Create one release-notes file per version, record all major additions and fixes since the previous release, and localize both Promotional Text and What's New into all 15 locales.
