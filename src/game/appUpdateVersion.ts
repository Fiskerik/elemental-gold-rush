export function shouldOfferAppUpdate(
  storeVersion: string,
  currentVersion: string,
  dismissedVersion?: string | null,
): boolean {
  if (!storeVersion.trim() || !currentVersion.trim()) return false;
  if (compareVersions(storeVersion, currentVersion) <= 0) return false;

  return !dismissedVersion || compareVersions(storeVersion, dismissedVersion) > 0;
}

export function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function normalizeVersion(version: string): number[] {
  return version
    .split(/[+-]/, 1)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}
