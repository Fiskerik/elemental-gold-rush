# Firebase push notifications

The iOS client obtains an FCM token and uploads it to the HTTP functions when
`VITE_FIREBASE_FUNCTIONS_BASE_URL` is configured. The functions send:

- Daily Board reminder at 09:00 Europe/Stockholm.
- Daily Compound reminder at 18:00 Europe/Stockholm.
- Streak reminder after 24 hours without activity, at most once per day.

## Deploy

1. Install or open the Firebase CLI and log in to the Firebase account that
   owns the `atomicfusionrush` project.
2. Enable Cloud Firestore and switch the project to the Blaze plan. Scheduled
   functions use Cloud Scheduler.
3. From the repository root run:

   ```text
   cd functions
   npm install
   npm run deploy
   ```

4. Copy the deployed HTTPS function base URL into the CodeMagic environment as
   `VITE_FIREBASE_FUNCTIONS_BASE_URL`. It should look like:

   ```text
   https://europe-west1-atomicfusionrush.cloudfunctions.net
   ```

5. Build a new TestFlight version. The app will register each device token in
   Firestore under `fcmRegistrations`.

To test the HTTP registration endpoint, use a POST request to
`https://europe-west1-atomicfusionrush.cloudfunctions.net/registerFcmToken`.
Opening the base domain in a browser is not a valid function request and may
show `Error: Page not found`.

The notification functions are intentionally server-side. Do not put Firebase
Admin credentials or FCM sending credentials in the app bundle.
