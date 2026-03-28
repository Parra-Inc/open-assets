import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { resolve, join, dirname } from "path";

const LOCK_FILENAME = "assets.lock";

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
 * Extract local file dependencies referenced by an HTML file.
 * Parses src="...", href="...", and url(...) references, filtering out
 * remote URLs and returning only paths that exist on disk.
 * Returns a sorted, deduplicated array of absolute paths.
 */
export function extractLocalDeps(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8");
  const dir = dirname(filePath);

  const refs = new Set();
  const srcHrefPattern = /(?:src|href)=["']([^"']+)["']/gi;
  const cssUrlPattern = /url\(["']?([^"')]+)["']?\)/gi;

  for (const pattern of [srcHrefPattern, cssUrlPattern]) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      refs.add(match[1]);
    }
  }

  const localPaths = [];
  for (const ref of refs) {
    if (/^(https?:\/\/|data:|\/\/|#)/.test(ref)) continue;
    if (!ref) continue;
    const abs = resolve(dir, ref);
    if (existsSync(abs)) {
      localPaths.push(abs);
    }
  }

  return [...new Set(localPaths)].sort();
}

/**
 * Compute SHA256 checksum of a file's contents.
 * For .html files, includes the content of all local dependencies
 * (images, SVGs, etc.) referenced via src/href/url() attributes.
 * Returns "sha256:<hex>" or null if file doesn't exist.
 */
export function computeChecksum(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath);

  if (filePath.endsWith(".html")) {
    const deps = extractLocalDeps(filePath);
    if (deps.length > 0) {
      const hash = createHash("sha256");
      hash.update(content);
      for (const dep of deps) {
        hash.update("\0");
        hash.update(readFileSync(dep));
      }
      return `sha256:${hash.digest("hex")}`;
    }
  }

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
