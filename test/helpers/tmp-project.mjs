import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { dirname } from "path";

/**
 * Create a temporary project directory with a config and optional files.
 * @param {object} manifest - The config object to write as assets.json
 * @param {Record<string, string>} [files] - Additional files to create { relativePath: content }
 * @returns {{ dir: string, cleanup: () => void }}
 */
export function createTmpProject(manifest, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "oa-test-"));
  if (manifest) {
    writeFileSync(join(dir, "assets.json"), JSON.stringify(manifest, null, 2));
  }
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(dir, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
