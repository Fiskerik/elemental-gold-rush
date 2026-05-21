type HapticsModule = {
  Haptics: {
    impact: (options: { style: string }) => Promise<void>;
    vibrate: (options?: { duration?: number }) => Promise<void>;
  };
  ImpactStyle?: {
    Light?: string;
    Medium?: string;
    Heavy?: string;
  };
};

const HAPTICS_MODULE = "@capacitor/haptics";

async function loadHaptics(): Promise<HapticsModule | null> {
  try {
    return (await import(/* @vite-ignore */ HAPTICS_MODULE)) as HapticsModule;
  } catch {
    return null;
  }
}

export async function triggerNativeHaptic(ms: number | number[]): Promise<boolean> {
  const haptics = await loadHaptics();
  if (!haptics) return false;
  const duration = Array.isArray(ms) ? Math.max(...ms) : ms;
  const style =
    duration >= 70
      ? (haptics.ImpactStyle?.Heavy ?? "HEAVY")
      : duration >= 30
        ? (haptics.ImpactStyle?.Medium ?? "MEDIUM")
        : (haptics.ImpactStyle?.Light ?? "LIGHT");

  try {
    await haptics.Haptics.impact({ style });
    return true;
  } catch {
    try {
      await haptics.Haptics.vibrate({ duration: Math.max(10, duration) });
      return true;
    } catch {
      return false;
    }
  }
}
