# App Store Release Notes Workflow

This is the standing workflow for Atomic Fusion Rush releases after 1.1.0.

## Required for every release

1. Create `localization/app-store/release-notes/<version>.md`.
2. Compare the release with the previous App Store version and log all meaningful changes:
   - new gameplay, modes, compounds, power-ups, rewards, or progression;
   - important bug fixes, including leaderboard and purchase fixes;
   - App Store, coupon, promotional-code, or monetization support;
   - localization, accessibility, performance, and major UI improvements.
3. Write both fields in all 27 supported locales:
   - Promotional Text: maximum 170 characters per locale;
   - What's New: maximum 4,000 characters per locale.
4. Keep the locale sections in the configured display-name order:
   Arabic, Chinese Simplified, Chinese Traditional, Czech, Danish, Dutch, English, Finnish, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Norwegian, Polish, Portuguese (Brazil), Russian, Spanish, Swedish, Tamil, Thai, Turkish, Ukrainian, Vietnamese.
5. Do not put quotation marks around copy in the release-notes file. Each field must be ready to paste directly into App Store Connect.
6. Review every translation for meaning, product names, character limits, and text overflow before publishing.

## Supported locale codes

| Display name | App Store locale |
| --- | --- |
| Arabic | `ar-SA` |
| Chinese Simplified | `zh-Hans` |
| Chinese Traditional | `zh-Hant` |
| Czech | `cs` |
| Danish | `da` |
| Dutch | `nl-NL` |
| English | `en-US` |
| Finnish | `fi` |
| French | `fr-FR` |
| German | `de-DE` |
| Hindi | `hi` |
| Indonesian | `id` |
| Italian | `it` |
| Japanese | `ja` |
| Korean | `ko` |
| Malay | `ms` |
| Norwegian | `no` |
| Polish | `pl` |
| Portuguese (Brazil) | `pt-BR` |
| Russian | `ru` |
| Spanish | `es-ES` |
| Swedish | `sv` |
| Tamil | `ta-IN` |
| Thai | `th` |
| Turkish | `tr` |
| Ukrainian | `uk` |
| Vietnamese | `vi` |

## File template

Copy this structure for the next version. Replace every placeholder and remove any section that is not needed only after confirming that the locale still has both fields.

```text
# Atomic Fusion Rush <version> Release Notes

Compared with <previous version>

## Arabic (العربية) — ar-SA

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Chinese Simplified (简体中文) — zh-Hans

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## English — en-US

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## French (Français) — fr-FR

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## German (Deutsch) — de-DE

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Hindi (हिन्दी) — hi

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Indonesian (Bahasa Indonesia) — id

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Italian (Italiano) — it

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Japanese (日本語) — ja

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Korean (한국어) — ko

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Portuguese (Brazil) (Português do Brasil) — pt-BR

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Russian (Русский) — ru

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Spanish (Español) — es-ES

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Turkish (Türkçe) — tr

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>

## Vietnamese (Tiếng Việt) — vi

Promotional Text:
<maximum 170 characters>

What's New:
<maximum 4,000 characters>
```

The 1.1.0 copy is the baseline for the first release using this workflow. Future release files should explicitly state the previous version they were compared against.
