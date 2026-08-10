"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStreakReminders = exports.sendDailyCompoundReminder = exports.sendDailyBoardReminder = exports.recordPlayerActivity = exports.registerFcmToken = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const REGISTRATION_COLLECTION = "fcmRegistrations";
const FUNCTION_REGION = "europe-west1";
function validId(value) {
    return typeof value === "string" && /^[A-Za-z0-9._:-]{8,120}$/.test(value);
}
function validToken(value) {
    return typeof value === "string" && value.length >= 20 && value.length <= 4096;
}
function bool(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
}
function timestamp(value) {
    const date = typeof value === "string" ? new Date(value) : new Date();
    return firestore_1.Timestamp.fromDate(Number.isNaN(date.getTime()) ? new Date() : date);
}
function json(res, status, body) {
    res.status(status).json(body);
}
exports.registerFcmToken = (0, https_1.onRequest)({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
    if (req.method !== "POST") {
        json(res, 405, { error: "POST required" });
        return;
    }
    const body = req.body;
    if (!validId(body.installationId) || !validToken(body.token)) {
        json(res, 400, { error: "Invalid installationId or FCM token" });
        return;
    }
    const record = {
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
exports.recordPlayerActivity = (0, https_1.onRequest)({ cors: true, region: FUNCTION_REGION }, async (req, res) => {
    if (req.method !== "POST") {
        json(res, 405, { error: "POST required" });
        return;
    }
    const body = req.body;
    if (!validId(body.installationId)) {
        json(res, 400, { error: "Invalid installationId" });
        return;
    }
    await db.collection(REGISTRATION_COLLECTION).doc(body.installationId).set({
        lastSeenAt: timestamp(body.lastSeenAt),
        lastPlayedAt: timestamp(body.lastPlayedAt),
    }, { merge: true });
    json(res, 200, { ok: true });
});
async function sendToRegistrations(docs, message) {
    const validDocs = docs.filter((doc) => validToken(doc.data().token));
    const responses = [];
    for (let offset = 0; offset < validDocs.length; offset += 500) {
        const batch = validDocs.slice(offset, offset + 500);
        const result = await (0, messaging_1.getMessaging)().sendEachForMulticast({
            ...message,
            tokens: batch.map((doc) => doc.data().token),
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
const iosNotification = (title, body, route) => ({
    notification: { title, body },
    data: { route },
    apns: { payload: { aps: { sound: "default" } } },
});
exports.sendDailyBoardReminder = (0, scheduler_1.onSchedule)({ schedule: "0 9 * * *", timeZone: "Europe/Stockholm", region: FUNCTION_REGION }, async () => {
    const snapshot = await db
        .collection(REGISTRATION_COLLECTION)
        .where("notificationsEnabled", "==", true)
        .where("dailyBoardReminders", "==", true)
        .get();
    await sendToRegistrations(snapshot.docs, iosNotification("A new Daily Board is ready", "Can you beat yesterday’s score?", "daily-board"));
});
exports.sendDailyCompoundReminder = (0, scheduler_1.onSchedule)({ schedule: "0 18 * * *", timeZone: "Europe/Stockholm", region: FUNCTION_REGION }, async () => {
    const snapshot = await db
        .collection(REGISTRATION_COLLECTION)
        .where("notificationsEnabled", "==", true)
        .where("dailyCompoundReminders", "==", true)
        .get();
    await sendToRegistrations(snapshot.docs, iosNotification("Today’s Daily Compound is waiting", "Find the hidden molecule before the timer runs out.", "daily-compound"));
});
exports.sendStreakReminders = (0, scheduler_1.onSchedule)({ schedule: "every 60 minutes", timeZone: "Europe/Stockholm", region: FUNCTION_REGION }, async () => {
    const cutoff = firestore_1.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const snapshot = await db
        .collection(REGISTRATION_COLLECTION)
        .where("notificationsEnabled", "==", true)
        .where("streakReminders", "==", true)
        .where("lastPlayedAt", "<", cutoff)
        .get();
    const eligible = snapshot.docs.filter((doc) => {
        const lastReminder = doc.data().lastStreakReminderAt;
        return !lastReminder || lastReminder.toMillis() < Date.now() - 24 * 60 * 60 * 1000;
    });
    await sendToRegistrations(eligible, iosNotification("Keep your fusion streak alive", "Your lab is ready for another short run.", "menu"));
    await Promise.all(eligible.map((doc) => doc.ref.set({ lastStreakReminderAt: firestore_1.Timestamp.now() }, { merge: true })));
});
