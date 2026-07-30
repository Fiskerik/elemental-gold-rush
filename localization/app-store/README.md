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

Before submitting, paste each locale into App Store Connect and quickly review screenshots/text overflow in the App Store preview, especially for Arabic, German, Russian, Turkish, Hindi, and Vietnamese.

## Release notes

Follow [RELEASE_NOTES_WORKFLOW.md](./RELEASE_NOTES_WORKFLOW.md) for every release after 1.1.0. Create one release-notes file per version, record all major additions and fixes since the previous release, and localize both Promotional Text and What's New into all 15 locales.
