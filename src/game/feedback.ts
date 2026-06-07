import {
  playComboSound,
  playDangerSound,
  playDropSound,
  playGameOverSound,
  playMergeSound,
  playMilestoneSound,
  playWinSound,
} from "./audio";
import { triggerNativeHaptic, triggerNativeNotificationHaptic } from "./nativeHaptics";

export type FeedbackEvent =
  | { type: "drop" }
  | { type: "merge"; chainDepth: number; atomicNumber: number; isotope?: boolean }
  | { type: "combo"; mergeCount: number }
  | { type: "milestone"; atomicNumber: number }
  | { type: "danger"; severity: "low" | "high" }
  | { type: "game-over" }
  | { type: "win" };

export type FeedbackOptions = {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
};

function fallbackVibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function runImpact(pattern: number | number[]) {
  void triggerNativeHaptic(pattern)
    .then((handled) => {
      if (!handled) fallbackVibrate(pattern);
    })
    .catch(() => fallbackVibrate(pattern));
}

function runNotification(type: "success" | "warning" | "error", pattern: number | number[]) {
  void triggerNativeNotificationHaptic(type, pattern)
    .then((handled) => {
      if (!handled) fallbackVibrate(pattern);
    })
    .catch(() => fallbackVibrate(pattern));
}

export function playFeedback(event: FeedbackEvent, options: FeedbackOptions) {
  if (options.soundEnabled) {
    switch (event.type) {
      case "drop":
        playDropSound();
        break;
      case "merge":
        playMergeSound(event.chainDepth);
        break;
      case "combo":
        playComboSound(event.mergeCount);
        break;
      case "milestone":
        playMilestoneSound(event.atomicNumber);
        break;
      case "danger":
        playDangerSound(event.severity);
        break;
      case "game-over":
        playGameOverSound();
        break;
      case "win":
        playWinSound();
        break;
    }
  }

  if (!options.hapticsEnabled) return;

  switch (event.type) {
    case "drop":
      runImpact(12);
      break;
    case "merge":
      runImpact(event.isotope ? [18, 28, 18] : event.chainDepth >= 2 ? [14, 24, 14] : 30);
      break;
    case "combo":
      runImpact(event.mergeCount >= 4 ? [18, 28, 18, 38] : [16, 24, 16]);
      break;
    case "milestone":
      runNotification("success", [30, 60, 30, 80]);
      break;
    case "danger":
      runNotification(event.severity === "high" ? "warning" : "warning", event.severity === "high" ? [24, 48, 24] : 28);
      break;
    case "game-over":
      runNotification("error", [50, 80, 50, 80, 200]);
      break;
    case "win":
      runNotification("success", [30, 60, 30, 60, 80]);
      break;
  }
}
