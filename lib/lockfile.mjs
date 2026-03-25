import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { resolve, join } from "path";

const LOCK_FILENAME = "manifest.lock";

/**
 * Read the lockfile from disk, or return an empty structure.
 */
export function readLockfile(projectDir) {
  const lockPath = join(projectDir, LOCK_FILENAME);
  if (!existsSync(lockPath)) {
    return { version: 1, assets: {} };
  }
  try {
    return JSON.parse(readFileSync(lockPath, "utf-8"));
  } catch {
    return { version: 1, assets: {} };
  }
}

/**
 * Write the lockfile to disk as formatted JSON.
 */
export function writeLockfile(projectDir, lockData) {
  const lockPath = join(projectDir, LOCK_FILENAME);
  writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + "\n");
}

/**
 * Compute SHA256 checksum of a file's contents.
 * Returns "sha256:<hex>" or null if file doesn't exist.
 */
export function computeChecksum(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath);
  const hash = createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

/**
 * Check if an asset variant is up-to-date based on its stored checksum.
 * Returns true if the stored checksum matches and the output file exists.
 */
export function isUpToDate(lockData, assetKey, variantKey, currentChecksum, outputPath) {
  const entry = lockData.assets?.[assetKey]?.[variantKey];
  if (!entry) return false;
  if (entry.sourceChecksum !== currentChecksum) return false;
  if (!existsSync(resolve(outputPath))) return false;
  return true;
}

/**
 * Record an export in the lockfile data (in memory — call writeLockfile to persist).
 */
export function recordExport(lockData, assetKey, variantKey, checksum, outputPath) {
  if (!lockData.assets[assetKey]) {
    lockData.assets[assetKey] = {};
  }
  lockData.assets[assetKey][variantKey] = {
    sourceChecksum: checksum,
    outputPath,
    exportedAt: new Date().toISOString(),
  };
}
