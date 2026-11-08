import { resolve, join, dirname } from "path";
import { mkdirSync, copyFileSync, existsSync, readFileSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { cpus } from "os";
import { filterTemplates, flatOutputs } from "./manifest.mjs";
import { PngPool, keepExisting } from "./png-pool.mjs";
import { FileHasher, loadLock, saveLock, sha256, RENDERER_VERSION } from "./cache.mjs";
import { planAssets, isFullRun, fingerprintOf, explain, lockEntryFor } from "./plan.mjs";

// Chromium serializes the capture path, so a unit's screenshots cannot overlap
// each other no matter how many workers ask. A second worker still pays off: it
// navigates and lays out its page while the first is capturing. A third has
// nothing left to hide, and each one past that adds a renderer process and a
// full set of framebuffers while screenshot latency grows in proportion.
//
// Measured on a 10-core M-series Mac, 8 templates, median of 5 runs:
//   4 App Store sizes  1:9.2s  2:9.4s  3:9.7s  4:9.6s  6:9.9s  8:10.4s
//   1 small size       1:2.0s  2:1.8s  3:2.0s  4:2.0s  6:2.5s  8:3.5s
const CONCURRENCY_CAP = 2;

let toolVersionCache;
export function toolVersion() {
  if (toolVersionCache === undefined) {
    try {
      toolVersionCache = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")).version;
    } catch {
      toolVersionCache = null;
    }
  }
  return toolVersionCache;
}

/**
 * Pick how many render units run concurrently.
 *
 * The smallest of three ceilings wins: the work actually available, the CPU
 * count (leaving a core for this process and Chromium's browser process), and
 * the cap above. OPEN_ASSETS_CONCURRENCY overrides the result, which is the
 * escape hatch for templates heavy enough to change the arithmetic.
 *
 * @param {unknown[]} units - Render units to be drained by the worker pool
 * @param {{ override?: string|number, cores?: number }} [opts]
 * @returns {number}
 */
export function resolveConcurrency(units, opts = {}) {
  if (units.length === 0) return 1;

  const raw = opts.override ?? process.env.OPEN_ASSETS_CONCURRENCY;
  const override = parseInt(raw, 10);
  if (Number.isFinite(override) && override > 0) {
    return Math.min(override, units.length);
  }

  const cores = opts.cores ?? cpus().length;
  return Math.max(1, Math.min(units.length, cores - 1, CONCURRENCY_CAP));
}

/**
 * @typedef {object} RenderDeps
 * @property {(projectDir: string, htmlFile: string, sourceW: number, sourceH: number, variants: {width: number, height: number, format?: string}[], options?: object) => Promise<Buffer[]>} renderVariants
 * @property {(projectDir: string, collection: object, outputConfig: object) => Promise<string>} runXcodeOutput
 * @property {() => Promise<void>} closeBrowser
 * @property {(projectDir: string, toolVersion: string) => { lock: object, from: number|null }} [loadLock]
 * @property {(projectDir: string, lock: object) => void} [saveLock]
 * @property {string} [toolVersion]
 * @property {boolean} [persistStatCache] - Keep .open-assets/cache.json between runs (default true)
 */

/**
 * Render assets according to the manifest and options.
 *
 * Every output gets a render key covering everything that can change its
 * pixels (see lib/cache.mjs). Outputs whose key matches assets.lock and whose
 * file on disk is the one recorded are skipped; identical outputs (locales
 * that resolve to the same strings and assets) render once and are copied.
 * Remaining work is grouped into units of one (template, locale) pair that
 * load the page once and screenshot every size, drained by a small pool.
 *
 * @param {string} projectDir - Absolute path to the project directory
 * @param {object} manifest - Parsed manifest object
 * @param {object} options - Render options from CLI (filters, force, output, explain, quiet...)
 * @param {RenderDeps} deps - Injected dependencies
 * @param {(msg: string) => void} [log] - Optional log function
 * @returns {Promise<{ results: object[], skipped: number, copied: number, adopted: number, elapsed: string, migratedFrom?: number, error?: string }>}
 */
export async function renderAssets(projectDir, manifest, options, deps, log) {
  const _log = log || (() => {});
  const startTime = Date.now();
  const version = deps.toolVersion ?? toolVersion();
  const load = deps.loadLock || loadLock;
  const save = deps.saveLock || saveLock;

  let lock, from;
  try {
    ({ lock, from } = load(projectDir, version));
  } catch (err) {
    return { results: [], skipped: 0, copied: 0, elapsed: "0.0s", error: err.message };
  }
  if (from !== null && from !== undefined) {
    _log(`  Upgrading assets.lock v${from} → v${lock.lockfileVersion}`);
  }

  const hasher = new FileHasher(projectDir, { persist: deps.persistStatCache !== false });
  const plan = planAssets(projectDir, manifest, options, { lock, hasher });
  if (plan.error) {
    return { results: [], skipped: 0, copied: 0, elapsed: "0.0s", error: plan.error };
  }
  for (const w of plan.warnings) _log(`  Warning: ${w}`);

  if (options.dryRun) {
    const count = (st) => plan.planned.filter((i) => i.status === st).length;
    const adopted = plan.planned.filter((i) => i.adopted).length;
    const previous = { files: lock.files || {}, strings: lock.strings || {} };
    for (const item of plan.planned) {
      if (item.status === "fresh") continue;
      _log(`  would ${item.status} ${item.relOut}: ${explain(item, previous, plan).join("; ") || "forced"}`);
    }
    return {
      results: [],
      dryRun: true,
      wouldRender: count("render"),
      wouldCopy: count("copy"),
      skipped: count("fresh") - adopted,
      adopted,
      copied: 0,
      migratedFrom: from ?? undefined,
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    };
  }

  mkdirSync(plan.outputDir, { recursive: true });

  // Merge this run's file and string hashes into the lock. A full run
  // replaces them, so files no longer used drop out.
  const full = isFullRun(options);
  const previous = { files: lock.files || {}, strings: lock.strings || {} };
  if (full) {
    lock.files = plan.files;
    lock.templates = plan.templates;
    lock.strings = plan.strings;
  } else {
    lock.files = { ...(lock.files || {}), ...plan.files };
    lock.templates = { ...(lock.templates || {}), ...plan.templates };
    lock.strings = { ...(lock.strings || {}) };
    for (const [col, locales] of Object.entries(plan.strings)) {
      lock.strings[col] = { ...(lock.strings[col] || {}), ...locales };
    }
  }
  lock.renderer = RENDERER_VERSION;
  lock.tool = version;
  const outputs = { ...(lock.outputs || {}) };
  lock.outputs = outputs;

  const record = (item, png) => {
    outputs[item.relOut] = lockEntryFor(item, png);
  };
  const persist = () => {
    try {
      save(projectDir, lock);
    } catch (err) {
      _log(`  Warning: could not write assets.lock: ${err.message}`);
    }
  };

  const pngPool = new PngPool();
  // If a PNG on disk has the pixels just rendered, keep it untouched and
  // return its hash, so committed images change only when the picture does.
  const keepIfSamePixels = async (item, buffer) => {
    if (item.format !== "png" || item.onDisk === null) return null;
    let existing;
    try {
      existing = await readFile(item.outPath);
    } catch {
      return null;
    }
    const same = await pngPool.same(existing, buffer);
    return keepExisting(existing, buffer, same, Boolean(options.fast)) ? sha256(existing) : null;
  };

  const results = [];
  let unchanged = 0;
  let skipped = 0;
  let copied = 0;
  let renderedAny = false;

  let adopted = 0;
  for (const item of plan.planned) {
    if (item.status !== "fresh") continue;
    if (item.adopted) adopted++;
    else skipped++;
    // Fresh entries are rewritten so their recorded parts stay current.
    record(item, item.onDisk);
    if (item.kind === "image") {
      _log(`  ${item.accepted ? "Accepting" : item.adopted ? "Adopting" : "Skipping"} ${item.template.name}${item.locale ? ` [${item.locale}]` : ""} at ${item.w}x${item.h} (${item.accepted ? (item.onDisk ? "existing file recorded as current" : "missing, recorded for a later render") : item.adopted ? "unchanged since the v1 lock" : "unchanged"})`);
    }
  }

  if (options.explain) {
    for (const item of plan.planned) {
      if (item.status === "fresh") continue;
      const why = explain(item, previous, plan);
      _log(`  ${item.status === "copy" ? "copy  " : "render"} ${item.relOut}: ${why.join("; ") || "forced"}`);
    }
  }

  try {
    // Group images to render by (collection, template, locale): one page load
    // serves every size.
    const units = [];
    const unitIndex = new Map();
    for (const item of plan.planned) {
      if (item.kind !== "image" || item.status !== "render") continue;
      const id = `${item.collection.id}\0${item.template.name}\0${item.locale ?? ""}`;
      let unit = unitIndex.get(id);
      if (!unit) {
        unit = { items: [], logs: [], results: [], completed: false };
        unitIndex.set(id, unit);
        units.push(unit);
      }
      unit.items.push(item);
    }

    // With page reuse, consecutive locales of one template share a loaded
    // page, so run units template by template.
    if (process.env.OPEN_ASSETS_REUSE_PAGES !== "0") {
      const order = (u) => `${u.items[0].collection.id}\0${u.items[0].template.name}`;
      units.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
    }

    let nextUnit = 0;
    let nextFlush = 0;
    const errors = [];
    const flushLogs = () => {
      while (nextFlush < units.length && units[nextFlush].completed) {
        for (const line of units[nextFlush].logs) _log(line);
        nextFlush++;
      }
    };

    const renderTimeout = options.renderTimeout ? parseInt(options.renderTimeout, 10) : undefined;

    const runUnit = async (unit) => {
      const first = unit.items[0];
      unit.logs.push(
        `  Rendering ${first.template.name}${first.locale ? ` [${first.locale}]` : ""} (${unit.items.length} size${unit.items.length === 1 ? "" : "s"})...`
      );
      const buffers = await deps.renderVariants(
        projectDir,
        first.template.src,
        first.sourceW,
        first.sourceH,
        unit.items.map((v) => ({ width: v.w, height: v.h, format: v.format })),
        {
          background: first.collection.background,
          localization: first.localization,
          timeout: renderTimeout,
          reusable: first.reusable,
          fast: Boolean(options.fast),
        }
      );
      const keeps = await Promise.all(unit.items.map((item, i) => keepIfSamePixels(item, buffers[i])));
      for (let i = 0; i < unit.items.length; i++) {
        const item = unit.items[i];
        const buffer = buffers[i];
        mkdirSync(dirname(item.outPath), { recursive: true });
        if (item.isSvg && item.w === item.sourceW && item.h === item.sourceH) {
          copyFileSync(item.srcPath, item.outPath.replace(`.${item.defaultExt}`, ".svg"));
        }
        const kept = keeps[i];
        if (kept) {
          item.png = kept;
          unchanged++;
          unit.logs.push(`    → ${item.outPath} (${item.w}x${item.h}, pixels unchanged, kept existing file)`);
        } else {
          await writeFile(item.outPath, buffer);
          hasher.invalidate(item.outPath);
          item.png = sha256(buffer);
          unit.logs.push(`    → ${item.outPath} (${item.w}x${item.h})`);
        }
        item.done = true;
        record(item, item.png);
        unit.results.push({ ...resultFor(item, buffer.length), ...(kept ? { unchanged: true } : {}) });
      }
    };

    const workers = Array.from({ length: resolveConcurrency(units) }, async () => {
      while (nextUnit < units.length && errors.length === 0) {
        const unit = units[nextUnit++];
        try {
          await runUnit(unit);
          renderedAny = true;
        } catch (err) {
          const first = unit.items[0];
          unit.logs.push(`  Error rendering ${first.template.name}${first.locale ? ` [${first.locale}]` : ""}: ${err.message}`);
          errors.push(err);
        }
        unit.completed = true;
        flushLogs();
        // Save after every unit so a killed run keeps its progress.
        persist();
      }
    });
    await Promise.all(workers);
    flushLogs();

    for (const unit of units) results.push(...unit.results);

    // Copies: identical outputs take the leader's bytes.
    for (const item of plan.planned) {
      if (item.status !== "copy") continue;
      const leader = item.copyFrom;
      if (leader.status === "render" && !leader.done) continue; // leader failed
      mkdirSync(dirname(item.outPath), { recursive: true });
      const leaderBytes = readFileSync(leader.outPath);
      const kept = await keepIfSamePixels(item, leaderBytes);
      if (kept) {
        unchanged++;
      } else {
        copyFileSync(leader.outPath, item.outPath);
        hasher.invalidate(item.outPath);
      }
      const png = kept || leader.png || leader.onDisk;
      record(item, png);
      copied++;
      results.push({ ...resultFor(item), copiedFrom: leader.outPath });
      _log(`    → ${item.outPath} (copied from ${leader.relOut}, identical render)`);
    }

    if (errors.length > 0) throw errors[0];

    // Xcode app icons and copy-source outputs.
    for (const item of plan.planned) {
      if (item.kind !== "xcode" || item.status === "fresh") continue;
      _log(`\n  Exporting to Xcode: ${item.output.path}`);
      const path = await deps.runXcodeOutput(projectDir, item.collection, item.output, { fast: Boolean(options.fast) });
      hasher.invalidate(item.outPath);
      const png = hasher.hash(item.outPath);
      if (png) record(item, png);
      results.push({ collection: item.collection.id, type: "xcode", path });
      renderedAny = true;
    }
    for (const col of plan.collections) {
      copySourceOutputs(projectDir, col, filterTemplates(col.templates, options.template), plan.outputDir, results, _log);
    }

    if (full) {
      // Drop entries for outputs this project no longer produces.
      const live = new Set(plan.planned.map((i) => i.relOut));
      for (const rel of Object.keys(outputs)) {
        if (!live.has(rel)) delete outputs[rel];
      }
      lock.fingerprint = fingerprintOf(plan.planned);
    } else if (renderedAny || copied > 0) {
      lock.fingerprint = null;
    }
  } finally {
    await pngPool.close();
    persist();
    hasher.save();
    try {
      await deps.closeBrowser();
    } catch {
      // A browser-close failure must not mask the original render error
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const out = { results, skipped, copied, adopted, unchanged, elapsed: `${elapsed}s` };
  if (from !== null && from !== undefined) out.migratedFrom = from;
  return out;
}

function resultFor(item, size) {
  const r = {
    collection: item.collection.id,
    template: item.template.name,
    locale: item.locale || undefined,
    path: item.outPath,
    width: item.w,
    height: item.h,
  };
  if (size !== undefined) r.size = size;
  return r;
}

function copySourceOutputs(projectDir, col, templates, outputDir, results, _log) {
  for (const output of flatOutputs(col)) {
    if (output.type !== "copy-source") continue;
    const format = output.format || "svg";
    const copyDir = join(outputDir, col.id);
    mkdirSync(copyDir, { recursive: true });
    const matching = templates.filter((t) => t.src.endsWith(`.${format}`));
    // Naming follows the collection's full match count so --template runs
    // produce the same filenames as full runs
    const collectionMatches = col.templates.filter((t) => t.src.endsWith(`.${format}`));
    for (const template of matching) {
      const srcPath = resolve(projectDir, template.src);
      const baseName = output.name && collectionMatches.length === 1 ? output.name : template.name;
      const destPath = join(copyDir, `${baseName}.${format}`);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        results.push({ collection: col.id, template: template.name, type: `copy-${format}`, path: destPath });
        _log(`    → ${destPath}`);
      }
    }
  }
}
