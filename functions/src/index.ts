import { getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
  getMessaging,
  type BatchResponse,
  type MulticastMessage,
} from "firebase-admin/messaging";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (getApps().length === 0) initializeApp();

const db = getFirestore();
const REGISTRATION_COLLECTION = "fcmRegistrations";
const FUNCTION_REGION = "europe-west1";

type Registration = {
  token: string;
  platform: "ios";
  locale?: string;
  timeZone?: string;
  notificationsEnabled: boolean;
  dailyBoardReminders: boolean;
  dailyCompoundReminders: boolean;
  streakReminders: boolean;
  lastSeenAt: Timestamp;
  lastPlayedAt: Timestamp;
  lastStreakReminderAt?: Timestamp;
};

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{8,120}$/.test(value);
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 20 && value.length <= 4096;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function timestamp(value: unknown): Timestamp {
  const date = typeof value === "string" ? new Date(value) : new Date();
  return Timestamp.fromDate(Number.isNaN(date.getTime()) ? new Date() : date);
}

type JsonResponse = {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => void;
};

function json(res: JsonResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export const registerFcmToken = onRequest({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST required" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!validId(body.installationId) || !validToken(body.token)) {
    json(res, 400, { error: "Invalid installationId or FCM token" });
    return;
  }

  const record: Registration = {
    token: body.token,
    platform: "ios",
    locale: typeof body.locale === "string" ? body.locale.slice(0, 20) : undefined,
    timeZone: typeof body.timeZone === "string" ? body.timeZone.slice(0, 80) : undefined,
    notificationsEnabled: bool(body.notificationsEnabled, true),
    dailyBoardReminders: bool(body.dailyBoardReminders, true),
    dailyCompoundReminders: bool(body.dailyCompoundReminders, true),
    streakReminders: bool(body.streakReminders, true),
    lastSeenAt: timestamp(body.lastSeenAt),
    lastPlayedAt: timestamp(body.lastPlayedAt),
  };
  await db.collection(REGISTRATION_COLLECTION).doc(body.installationId).set(record, { merge: true });
  json(res, 200, { ok: true });
});

export const recordPlayerActivity = onRequest({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST required" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (!validId(body.installationId)) {
    json(res, 400, { error: "Invalid installationId" });
    return;
  }
  await db.collection(REGISTRATION_COLLECTION).doc(body.installationId).set(
    {
      lastSeenAt: timestamp(body.lastSeenAt),
      lastPlayedAt: timestamp(body.lastPlayedAt),
    },
    { merge: true },
  );
  json(res, 200, { ok: true });
});

async function sendToRegistrations(
  docs: QueryDocumentSnapshot[],
  message: Omit<MulticastMessage, "tokens">,
): Promise<BatchResponse[]> {
  const validDocs = docs.filter((doc) => validToken(doc.data().token));
  const responses: BatchResponse[] = [];
  for (let offset = 0; offset < validDocs.length; offset += 500) {
    const batch = validDocs.slice(offset, offset + 500);
    const result = await getMessaging().sendEachForMulticast({
      ...message,
      tokens: batch.map((doc) => doc.data().token as string),
    });
    responses.push(result);
    const removals = batch.filter((_, index) => {
      const errorCode = result.responses[index]?.error?.code ?? "";
      return errorCode.includes("registration-token-not-registered") || errorCode.includes("invalid-registration-token");
    });
    await Promise.all(removals.map((doc) => doc.ref.delete()));
  }
  return responses;
}

const iosNotification = (title: string, body: string, route: string): Omit<MulticastMessage, "tokens"> => ({
  notification: { title, body },
  data: { route },
  apns: { payload: { aps: { sound: "default" } } },
});

export const sendDailyBoardReminder = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Stockholm", region: FUNCTION_REGION },
  async () => {
    const snapshot = await db
      .collection(REGISTRATION_COLLECTION)
      .where("notificationsEnabled", "==", true)
      .where("dailyBoardReminders", "==", true)
      .get();
    await sendToRegistrations(
      snapshot.docs,
      iosNotification("A new Daily Board is ready", "Can you beat yesterday’s score?", "daily-board"),
    );
  },
);

export const sendDailyCompoundReminder = onSchedule(
  { schedule: "0 18 * * *", timeZone: "Europe/Stockholm", region: FUNCTION_REGION },
  async () => {
    const snapshot = await db
      .collection(REGISTRATION_COLLECTION)
      .where("notificationsEnabled", "==", true)
      .where("dailyCompoundReminders", "==", true)
      .get();
    await sendToRegistrations(
      snapshot.docs,
      iosNotification("Today’s Daily Compound is waiting", "Find the hidden molecule before the timer runs out.", "daily-compound"),
    );
  },
);

export const sendStreakReminders = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Europe/Stockholm", region: FUNCTION_REGION },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const snapshot = await db
      .collection(REGISTRATION_COLLECTION)
      .where("notificationsEnabled", "==", true)
      .where("streakReminders", "==", true)
      .where("lastPlayedAt", "<", cutoff)
      .get();
    const eligible = snapshot.docs.filter((doc) => {
      const lastReminder = doc.data().lastStreakReminderAt as Timestamp | undefined;
      return !lastReminder || lastReminder.toMillis() < Date.now() - 24 * 60 * 60 * 1000;
    });
    await sendToRegistrations(
      eligible,
      iosNotification("Keep your fusion streak alive", "Your lab is ready for another short run.", "menu"),
    );
    await Promise.all(
      eligible.map((doc) => doc.ref.set({ lastStreakReminderAt: Timestamp.now() }, { merge: true })),
    );
  },
);
