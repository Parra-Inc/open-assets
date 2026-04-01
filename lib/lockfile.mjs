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
 * Check if an asset variant is up-to-date based on its stored checksums.
 * Returns true if both source and export config checksums match and the output file exists.
 */
export function isUpToDate(lockData, assetKey, variantKey, currentChecksum, outputPath, exportChecksum) {
  const entry = lockData.assets?.[assetKey]?.[variantKey];
  if (!entry) return false;
  if (entry.sourceChecksum !== currentChecksum) return false;
  if (exportChecksum && entry.exportChecksum !== exportChecksum) return false;
  if (!existsSync(resolve(outputPath))) return false;
  return true;
}

/**
 * Record an export in the lockfile data (in memory — call writeLockfile to persist).
 */
export function recordExport(lockData, assetKey, variantKey, checksum, outputPath, exportChecksum) {
  if (!lockData.assets[assetKey]) {
    lockData.assets[assetKey] = {};
  }
  const entry = {
    sourceChecksum: checksum,
    outputPath,
    exportedAt: new Date().toISOString(),
  };
  if (exportChecksum) {
    entry.exportChecksum = exportChecksum;
  }
  lockData.assets[assetKey][variantKey] = entry;
}

/**
 * Compute a checksum for the export configuration of a variant.
 * Captures size dimensions, outFile path, and locale so that config changes trigger re-export.
 */
export function computeExportChecksum(entry, locale) {
  const config = {
    width: entry.size.width,
    height: entry.size.height,
  };
  if (entry.outFile) {
    config.outFile = entry.outFile;
  }
  if (locale) {
    config.locale = locale;
  }
  const hash = createHash("sha256").update(JSON.stringify(config)).digest("hex");
  return `sha256:${hash}`;
}
