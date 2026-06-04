let logs: string[] = [];

export function logDebug(message: string, data?: unknown): void {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${message}`;
  const details = data === undefined ? "" : ` ${stringifyDebugData(data)}`;
  console.log(line, data ?? "");
  logs.push(`${line}${details}`);
  if (logs.length > 40) logs = logs.slice(-40);
}

export function getLogs(): string[] {
  return [...logs];
}

export function clearLogs(): void {
  logs = [];
}

function stringifyDebugData(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
