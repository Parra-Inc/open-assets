import { existsSync } from "fs";
import { join } from "path";
import { FileHasher, loadLock, LOCK_FILENAME, LOCKFILE_VERSION } from "./cache.mjs";
import { planAssets, explain } from "./plan.mjs";

/**
 * Drift detection for CI. Recomputes every render key from the inputs and
 * compares it with assets.lock, without rendering or launching a browser.
 *
 * Fails when:
 *  - assets.lock is missing, corrupt, older than this CLI (needs upgrading)
 *    or newer than it (the CLI needs bumping)
 *  - an input changed and the output was not re-rendered (key mismatch)
 *  - an output is not in the lock at all
 *  - an output file exists but differs from the hash in the lock (edited by
 *    hand). Missing output files are fine by default, since exports/ is
 *    usually gitignored; pass requireOutputs to fail on them too.
 *
 * @param {string} projectDir
 * @param {object} manifest
 * @param {{ requireOutputs?: boolean, output?: string, collection?: string, tag?: string }} options
 * @param {string} toolVersion
 * @returns {{ ok: boolean, problems: { path: string, reasons: string[] }[], message?: string, checked: number }}
 */
export function checkAssets(projectDir, manifest, options, toolVersion) {
  if (!existsSync(join(projectDir, LOCK_FILENAME))) {
    return {
      ok: false,
      problems: [],
      checked: 0,
      message: `No ${LOCK_FILENAME} in ${projectDir}. Run \`open-assets render\` and commit ${LOCK_FILENAME}.`,
    };
  }

  let lock, from;
  try {
    ({ lock, from } = loadLock(projectDir, toolVersion));
  } catch (err) {
    return { ok: false, problems: [], checked: 0, message: err.message };
  }
  if (from !== null) {
    return {
      ok: false,
      problems: [],
      checked: 0,
      message:
        `${LOCK_FILENAME} is lockfile v${from}; this open-assets writes v${LOCKFILE_VERSION}. ` +
        `It needs upgrading: run \`open-assets render\` and commit ${LOCK_FILENAME}.`,
    };
  }

  // Never persist the stat cache from CI runs.
  const hasher = new FileHasher(projectDir, { persist: false });
  const plan = planAssets(projectDir, manifest, { ...options, force: false }, { lock, hasher });
  if (plan.error) return { ok: false, problems: [], checked: 0, message: plan.error };

  const previous = { files: lock.files || {}, strings: lock.strings || {} };
  const problems = [];
  for (const item of plan.planned) {
    const prev = item.lockEntry;
    let reasons;
    if (!prev || prev.key !== item.key) {
      reasons = explain({ ...item, status: "render" }, previous, plan);
    } else if (item.onDisk === null) {
      if (options.requireOutputs) reasons = ["output file is missing"];
    } else if (item.onDisk !== prev.png) {
      reasons = ["output file differs from assets.lock (edited by hand?)"];
    }
    if (reasons && reasons.length > 0) problems.push({ path: item.relOut, reasons });
  }

  return { ok: problems.length === 0, problems, checked: plan.planned.length };
}

/** Render a check result as the text CI prints. */
export function formatCheck(result) {
  if (result.message) return `✗ ${result.message}`;
  if (result.ok) return `✓ ${result.checked} output(s) match ${LOCK_FILENAME}`;
  const width = Math.max(...result.problems.map((p) => p.path.length));
  const lines = [`✗ ${result.problems.length} output(s) are out of date with ${LOCK_FILENAME}`];
  for (const p of result.problems) {
    lines.push(`  ${p.path.padEnd(width)}   ${p.reasons.join("; ")}`);
  }
  lines.push(`Run \`npx open-assets render\` and commit ${LOCK_FILENAME}.`);
  return lines.join("\n");
}
