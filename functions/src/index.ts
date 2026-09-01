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
  researchReminders: boolean;
  reminderHour?: number;
  lastResearchDate?: string;
  lastSeenAt: Timestamp;
  lastPlayedAt: Timestamp;
  lastResearchReminderAt?: Timestamp;
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

function localHour(timeZone = "Europe/Stockholm"): number {
  try {
    const value = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).find((part) => part.type === "hour")?.value;
    return Number(value ?? 19);
  } catch {
    return 19;
  }
}

function localDate(timeZone = "Europe/Stockholm"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
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
    researchReminders: bool(body.researchReminders, false),
    reminderHour: typeof body.reminderHour === "number" ? Math.max(0, Math.min(23, Math.floor(body.reminderHour))) : 19,
    ...(typeof body.lastResearchDate === "string" ? { lastResearchDate: body.lastResearchDate.slice(0, 20) } : {}),
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
      ...(typeof body.lastResearchDate === "string" ? { lastResearchDate: body.lastResearchDate.slice(0, 20) } : {}),
    },
    { merge: true },
  );
  json(res, 200, { ok: true });
});

const REFERRAL_REWARD_COINS = 20;
const referralCodeValid = (value: unknown): value is string => typeof value === "string" && /^AFR-[A-Z0-9]{7}$/.test(value);
const playerIdValid = (value: unknown): value is string => typeof value === "string" && value.length >= 8 && value.length <= 200;

export const createReferralCode = onRequest({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "POST required" });
  const { playerId, code } = req.body as Record<string, unknown>;
  if (!playerIdValid(playerId) || !referralCodeValid(code)) return json(res, 400, { error: "Invalid referral data" });
  await db.collection("referralCodes").doc(code).set({ playerId, createdAt: Timestamp.now() }, { merge: true });
  return json(res, 200, { ok: true, code });
});

export const redeemReferral = onRequest({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "POST required" });
  const { playerId, code } = req.body as Record<string, unknown>;
  if (!playerIdValid(playerId) || !referralCodeValid(code)) return json(res, 400, { error: "Invalid referral data" });
  const owner = await db.collection("referralCodes").doc(code).get();
  const referrerId = owner.data()?.playerId;
  if (!owner.exists || !playerIdValid(referrerId) || referrerId === playerId) return json(res, 400, { error: "Referral code unavailable" });
  await db.collection("referrals").doc(playerId).create({ code, referrerId, referredId: playerId, completed: false, createdAt: Timestamp.now() }).catch(() => undefined);
  return json(res, 200, { ok: true });
});

export const completeReferral = onRequest({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "POST required" });
  const { playerId } = req.body as Record<string, unknown>;
  if (!playerIdValid(playerId)) return json(res, 400, { error: "Invalid playerId" });
  const referralRef = db.collection("referrals").doc(playerId);
  const result = await db.runTransaction(async (tx) => {
    const referral = await tx.get(referralRef);
    if (!referral.exists || referral.data()?.completed) return false;
    const data = referral.data()!;
    tx.update(referralRef, { completed: true, completedAt: Timestamp.now() });
    const referrerReward = db.collection("referralRewards").doc(data.referrerId);
    const referredReward = db.collection("referralRewards").doc(playerId);
    const [referrer, referred] = await Promise.all([tx.get(referrerReward), tx.get(referredReward)]);
    tx.set(referrerReward, { pendingCoins: (referrer.data()?.pendingCoins ?? 0) + REFERRAL_REWARD_COINS }, { merge: true });
    tx.set(referredReward, { pendingCoins: (referred.data()?.pendingCoins ?? 0) + REFERRAL_REWARD_COINS }, { merge: true });
    return true;
  });
  return json(res, 200, { awarded: result });
});

export const claimReferralRewards = onRequest({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "POST required" });
  const { playerId } = req.body as Record<string, unknown>;
  if (!playerIdValid(playerId)) return json(res, 400, { error: "Invalid playerId" });
  const rewardRef = db.collection("referralRewards").doc(playerId);
  const coins = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(rewardRef);
    const pendingCoins = Math.max(0, Math.floor(snapshot.data()?.pendingCoins ?? 0));
    tx.set(rewardRef, { pendingCoins: 0 }, { merge: true });
    return pendingCoins;
  });
  return json(res, 200, { coins });
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

export const sendResearchReminder = onSchedule(
  { schedule: "0 * * * *", timeZone: "Europe/Stockholm", region: FUNCTION_REGION },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const snapshot = await db
      .collection(REGISTRATION_COLLECTION)
      .where("notificationsEnabled", "==", true)
      .where("researchReminders", "==", true)
      .where("lastPlayedAt", "<", cutoff)
      .get();
    const eligible = snapshot.docs.filter((doc) => {
      const data = doc.data() as Registration;
      if (data.lastResearchDate === localDate(data.timeZone)) return false;
      if (localHour(data.timeZone) !== Math.max(0, Math.min(23, Math.floor(data.reminderHour ?? 19)))) return false;
      const lastReminder = doc.data().lastResearchReminderAt as Timestamp | undefined;
      return !lastReminder || lastReminder.toMillis() < Date.now() - 24 * 60 * 60 * 1000;
    });
    await sendToRegistrations(
      eligible,
      iosNotification("Your research project is waiting", "Complete today’s research day to keep the table moving.", "menu"),
    );
    await Promise.all(
      eligible.map((doc) => doc.ref.set({ lastResearchReminderAt: Timestamp.now() }, { merge: true })),
    );
  },
);
