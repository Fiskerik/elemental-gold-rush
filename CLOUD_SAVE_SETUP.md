# Cloud save setup

The iOS build now uses Game Center authentication as the player gate and CloudKit's private database for progress saves.

Before shipping an iOS build with cloud saves:

1. In Apple Developer/App Store Connect, create or enable the iCloud container `iCloud.com.eaconsulting.atomicfusion` for the app identifier.
2. Enable iCloud/CloudKit and Game Center for the app target. The checked-in `App.entitlements` file contains the required capabilities.
3. Run a development build and create a `GameSave` record. CloudKit will create the development schema from these fields:
   - `payload`: String
   - `version`: Int64
   - `gameCenterPlayerID`: String
   - `updatedAt`: Date/Time
4. Deploy the CloudKit schema from Development to Production before the App Store build is released.

Cloud saves use the player's private CloudKit database and are associated with the signed-in Game Center `gamePlayerID`. The same Apple/iCloud account and Game Center account are required on a replacement install. If the player is offline or not signed in, local persistence continues to work and sync retries after sign-in.

The existing RevenueCat/App Store restore flow remains the authority for paid entitlements. Cloud save preserves the local purchase flags as a convenience, but it does not replace receipt validation.
