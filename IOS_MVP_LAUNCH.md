# Elemental Gold Rush iPhone MVP

## Native Build Path

- Ship the MVP as a Capacitor iOS app around the existing Vite/TanStack web game.
- Use a cloud Mac builder such as Codemagic, Ionic Appflow, Bitrise, GitHub Actions macOS, or a rented Mac for TestFlight/App Store builds.
- Current bundle id placeholder: `com.elementalgoldrush.game`.
- Production build flow:
  - `npm run build`
  - `npm run cap:add:ios` once
  - `npm run cap:sync`
  - Build/sign/upload from the cloud Mac service.

## RevenueCat and App Store Products

Create these product ids in App Store Connect, then mirror them in RevenueCat:

- `pro_lab_pack_lifetime`: non-consumable, $4.99, attached to entitlement `pro`.
- `coins_1`: consumable, grants 1 gold coin.
- `coins_5`: consumable, grants 5 gold coins.
- `coins_20`: consumable, grants 20 gold coins.

Set `VITE_REVENUECAT_IOS_API_KEY` for iOS builds. The browser build keeps purchases as safe no-op fallbacks.

## Ads

- AdMob interstitials are loaded through `src/game/ads.ts`.
- Set `VITE_ADMOB_IOS_INTERSTITIAL_ID` for production.
- The fallback id is Google's test interstitial id.
- Forced ads are skipped for users with the `pro` entitlement.
- Ads are only attempted after a cleared-stage result action, never during active gameplay.

## Consent and Store Readiness

- Add a privacy policy URL and support URL before App Store submission.
- Configure App Privacy labels for purchases, ads, diagnostics, and any analytics/crash reporting added later.
- Add GDPR/EEA consent messaging before production AdMob traffic.
- Use TestFlight sandbox accounts to verify Pro purchase, restore, coin pack delivery, and ad removal.
