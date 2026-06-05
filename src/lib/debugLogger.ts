const STORAGE_KEY = "atomic-fusion-debug-logs";
const MAX_LOG_LINES = 80;

let logs: string[] = loadStoredLogs();

export function logDebug(message: string, data?: unknown): void {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${message}`;
  const details = data === undefined ? "" : ` ${stringifyDebugData(data)}`;
  console.log(line, data ?? "");
  logs.push(`${line}${details}`);
  if (logs.length > MAX_LOG_LINES) logs = logs.slice(-MAX_LOG_LINES);
  persistLogs();
}

export function getLogs(): string[] {
  return [...logs];
}

export function getDebugReport(): string {
  const runtime = getRuntimeDetails();
  return [
    "Atomic Fusion Rush purchase diagnostics",
    `Generated: ${new Date().toISOString()}`,
    `Platform: ${runtime.platform}`,
    `User agent: ${runtime.userAgent}`,
    `URL: ${runtime.url}`,
    "",
    "Logs:",
    ...(logs.length ? logs : ["No purchase logs recorded yet."]),
  ].join("\n");
}

export async function copyDebugReport(): Promise<boolean> {
  const report = getDebugReport();
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(report);
    return true;
  } catch {
    return false;
  }
}

export function clearLogs(): void {
  logs = [];
  persistLogs();
}

function stringifyDebugData(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function loadStoredLogs(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string").slice(-MAX_LOG_LINES)
      : [];
  } catch {
    return [];
  }
}

function persistLogs(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOG_LINES)));
  } catch {
    // Logging should never break gameplay or purchases.
  }
}

function getRuntimeDetails(): { platform: string; userAgent: string; url: string } {
  if (typeof window === "undefined") {
    return { platform: "server", userAgent: "server", url: "server" };
  }
  return {
    platform: navigator.platform || "unknown",
    userAgent: navigator.userAgent || "unknown",
    url: window.location.href,
  };
}
