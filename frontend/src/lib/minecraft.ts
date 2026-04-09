const RELEASE_VERSION_REGEX = /^\d+\.\d+(\.\d+)?$/;
const SNAPSHOT_VERSION_REGEX = /^\d{2}w\d{2}[a-z_]+$/i;
const PRE_RELEASE_VERSION_REGEX = /^\d+\.\d+(\.\d+)?-(pre|pre-release)[-]?\d+$/i;
const RELEASE_CANDIDATE_VERSION_REGEX = /^\d+\.\d+(\.\d+)?-rc[-]?\d+$/i;
const EXPERIMENTAL_SNAPSHOT_VERSION_REGEX = /^\d+\.\d+(\.\d+)?-snapshot-\d+$/i;

export function normalizeMcVersionId(value: string): string {
  return value.trim().toLowerCase();
}

export function isLikelyMcVersion(value: string): boolean {
  const normalized = normalizeMcVersionId(value);
  return (
    RELEASE_VERSION_REGEX.test(normalized) ||
    SNAPSHOT_VERSION_REGEX.test(normalized) ||
    PRE_RELEASE_VERSION_REGEX.test(normalized) ||
    RELEASE_CANDIDATE_VERSION_REGEX.test(normalized) ||
    EXPERIMENTAL_SNAPSHOT_VERSION_REGEX.test(normalized)
  );
}

export const MC_VERSION_INPUT_PATTERN =
  /^\d+\.\d+(\.\d+)?$|^\d{2}w\d{2}[a-z_]+$|^\d+\.\d+(\.\d+)?-(pre|pre-release)[-]?\d+$|^\d+\.\d+(\.\d+)?-rc[-]?\d+$|^\d+\.\d+(\.\d+)?-snapshot-\d+$/i;
