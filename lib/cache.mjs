import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, renameSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname, relative, join, sep, isAbsolute } from "path";

/**
 * Content-addressed render cache.
 *
 * Every output image gets a render key: a hash of everything that can change
 * its pixels. The template and its dependencies (recursively), the resolved
 * strings it uses in its locale, the per-locale files it loads, the export
 * settings, and the renderer version. When the key recorded in assets.lock
 * matches and the file on disk is the one that was written, the render is
 * skipped.
 */

/** Shape of assets.lock. Bump when the JSON layout changes; add a migration. */
export const LOCKFILE_VERSION = 2;

/**
 * Bump when a change alters rendered pixels (settle logic, zoom, Chromium
 * major, screenshot encoding). Every render key changes and everything
 * re-renders once. Releases that do not change pixels leave this alone, so a
 * patch upgrade never re-renders a whole project.
 */
export const RENDERER_VERSION = 1;

export const LOCK_FILENAME = "assets.lock";
const STAT_CACHE_PATH = join(".open-assets", "cache.json");

const PLACEHOLDER = /\{\{([a-zA-Z_][\w.]*)\}\}/g;
const NUMBER_PLACEHOLDER = /\{\{n:\d/;

export class LockfileError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "LockfileError";
    this.code = code;
  }
}

// ── hashing primitives ──────────────────────────────────────────────────────

export function sha256(data) {
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

/** Short hash used only for --explain diffs, never for skip decisions. */
function shortHash(data) {
  return createHash("sha256").update(data).digest("hex").slice(0, 12);
}

/** JSON with object keys sorted at every level, so hashes ignore key order. */
export function canonicalJson(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (value[k] !== undefined) out[k] = sortDeep(value[k]);
    }
    return out;
  }
  return value;
}

/** Project-relative path with forward slashes, so locks are portable. */
export function toRel(projectDir, abs) {
  return relative(projectDir, abs).split(sep).join("/");
}

/**
 * Hashes files, remembering results for the run and, across runs, by
 * (mtime, size) in an uncommitted .open-assets/cache.json. A file whose stat
 * has not moved is not re-read.
 */
export class FileHasher {
  constructor(projectDir, { persist = true } = {}) {
    this.projectDir = projectDir;
    this.persist = persist;
    this.memo = new Map();
    this.stats = {};
    this.dirty = false;
    this.reads = 0;
    if (persist) {
      try {
        const raw = JSON.parse(readFileSync(join(projectDir, STAT_CACHE_PATH), "utf-8"));
        if (raw && raw.version === 1 && raw.files) this.stats = raw.files;
      } catch {
        // Missing or unreadable: start empty.
      }
    }
  }

  /** @returns {string|null} "sha256:..." or null when the file does not exist */
  hash(abs) {
    if (this.memo.has(abs)) return this.memo.get(abs);
    let st;
    try {
      st = statSync(abs);
    } catch {
      this.memo.set(abs, null);
      return null;
    }
    if (!st.isFile()) {
      this.memo.set(abs, null);
      return null;
    }
    const rel = toRel(this.projectDir, abs);
    const cached = this.stats[rel];
    let h;
    if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
      h = cached.hash;
    } else {
      this.reads++;
      h = sha256(readFileSync(abs));
      this.stats[rel] = { mtimeMs: st.mtimeMs, size: st.size, hash: h };
      this.dirty = true;
    }
    this.memo.set(abs, h);
    return h;
  }

  /** Forget a file, e.g. after this process rewrote it. */
  invalidate(abs) {
    this.memo.delete(abs);
  }

  save() {
    if (!this.persist || !this.dirty) return;
    try {
      const path = join(this.projectDir, STAT_CACHE_PATH);
      mkdirSync(dirname(path), { recursive: true });
      atomicWrite(path, JSON.stringify({ version: 1, files: this.stats }) + "\n");
      this.dirty = false;
    } catch {
      // The stat cache is an optimisation; failing to save it is harmless.
    }
  }
}

function atomicWrite(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

// ── dependency graph ────────────────────────────────────────────────────────

const REF_PATTERNS = {
  html: [
    /(?:src|href|xlink:href|poster)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+?)["']?\s*\)/gi,
  ],
  css: [
    /url\(\s*["']?([^"')]+?)["']?\s*\)/gi,
    /@import\s+["']([^"']+)["']/gi,
  ],
};

function kindOf(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".svg")) return "html";
  return null;
}

function localRefs(abs, content, kind) {
  const dir = dirname(abs);
  const out = [];
  for (const pattern of REF_PATTERNS[kind]) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(content)) !== null) {
      let ref = m[1].trim();
      if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
      ref = ref.split(/[?#]/)[0];
      if (!ref) continue;
      try {
        ref = decodeURI(ref);
      } catch {
        // Keep the raw reference.
      }
      out.push(resolve(dir, ref));
    }
  }
  return out;
}

/**
 * Every local file an entry depends on, following CSS url() and @import and
 * nested HTML/SVG references to any depth. Cycles terminate. Remote, data:
 * and fragment references are ignored.
 *
 * @returns {{ deps: string[], missing: string[] }} sorted absolute paths,
 *   excluding the entry itself
 */
export function collectDeps(entryAbs) {
  const seen = new Set([entryAbs]);
  const deps = new Set();
  const missing = new Set();
  const queue = [entryAbs];
  while (queue.length > 0) {
    const file = queue.shift();
    const kind = kindOf(file);
    if (!kind) continue;
    let content;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    for (const ref of localRefs(file, content, kind)) {
      if (seen.has(ref)) continue;
      seen.add(ref);
      if (existsSync(ref) && statSync(ref).isFile()) {
        deps.add(ref);
        queue.push(ref);
      } else {
        missing.add(ref);
      }
    }
  }
  return { deps: [...deps].sort(), missing: [...missing].sort() };
}

/**
 * Localization keys a template uses: {{key}} placeholders in the template and
 * in any HTML/SVG it pulls in. {{n:123}} number placeholders are not keys.
 */
export function extractKeys(contents) {
  const keys = new Set();
  for (const content of contents) {
    PLACEHOLDER.lastIndex = 0;
    let m;
    while ((m = PLACEHOLDER.exec(content)) !== null) keys.add(m[1]);
  }
  return [...keys].sort();
}

// ── per-locale inputs ───────────────────────────────────────────────────────

/**
 * Files a template loads for a specific locale.
 *
 * Convention: templates reference the source-language capture literally
 * (e.g. public/screenshots/en/01.png) and swap the path segment at runtime
 * (data-locale-img). Any dependency with a path segment equal to the source
 * language is mapped to the same path under the locale, falling back to the
 * base language, and finally to the source-language file, matching what the
 * template script would load.
 *
 * Collections may also declare `inputs`: project-relative paths with
 * {locale} and {template} placeholders, for files the convention cannot see.
 *
 * @returns {string[]} sorted absolute paths that exist
 */
export function localeAssets(projectDir, deps, locale, sourceLanguage, template, inputs = [], exists = existsSync) {
  const out = new Set();
  if (locale && locale !== sourceLanguage) {
    const base = locale.split("-")[0];
    for (const dep of deps) {
      const parts = toRel(projectDir, dep).split("/");
      const idx = parts.lastIndexOf(sourceLanguage);
      if (idx === -1 || idx === parts.length - 1) continue;
      for (const candidate of [locale, base]) {
        // The source-language file is already part of the template's deps.
        if (candidate === sourceLanguage) break;
        const swapped = [...parts];
        swapped[idx] = candidate;
        const abs = resolve(projectDir, swapped.join("/"));
        if (exists(abs)) {
          out.add(abs);
          break;
        }
      }
    }
  }
  for (const pattern of inputs) {
    let p = pattern.replace(/\{template\}/g, template.name);
    if (locale) p = p.replace(/\{locale\}/g, locale);
    const abs = resolve(projectDir, p);
    if (exists(abs)) out.add(abs);
  }
  return [...out].sort();
}

/**
 * The part of a locale that affects rendering beyond its strings. Locales
 * that resolve to the same strings and assets and share this class render
 * identical pixels, so one render can serve all of them.
 *
 * lang drives font selection, which is per base language except Chinese
 * (zh-Hans and zh-Hant use different glyphs). {{n:}} placeholders format
 * numbers with the full locale (en-US 1,000 vs en-IN 1,000 vs de 1.000).
 */
export function localeClass(locale, direction, strings) {
  if (!locale) return null;
  const base = locale.split("-")[0];
  const usesNumbers = Object.values(strings || {}).some((v) => NUMBER_PLACEHOLDER.test(v));
  const lang = base === "zh" || usesNumbers ? locale : base;
  return `${lang}:${direction}`;
}

/** Per-key short hashes of resolved strings, for keys the template uses. */
export function stringDigests(strings, keys) {
  const out = {};
  for (const key of keys) {
    out[key] = strings && strings[key] !== undefined ? shortHash(strings[key]) : null;
  }
  return out;
}

// ── lockfile ────────────────────────────────────────────────────────────────

export function emptyLock(toolVersion) {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    renderer: RENDERER_VERSION,
    tool: toolVersion || null,
    fingerprint: null,
    files: {},
    templates: {},
    strings: {},
    outputs: {},
  };
}

/** The lock version a parsed lock declares (v1 used `version`). */
export function lockVersionOf(data) {
  if (data && Number.isInteger(data.lockfileVersion)) return data.lockfileVersion;
  if (data && Number.isInteger(data.version)) return data.version;
  return null;
}

/**
 * v1 → v2. v1 recorded a source checksum that ignored strings, per-locale
 * captures and nested deps, so its entries cannot prove an output is current
 * under v2 rules. Each output is carried over with a null key plus its v1
 * checksums. The next render adopts an output without re-rendering it when
 * the v1 checksums still match (it was current by the rules it was rendered
 * under) and re-renders the rest. See adoptable() in plan.mjs.
 *
 * Early v1 locks stored absolute output paths; those are kept as-is and
 * matched to project-relative outputs by suffix.
 */
function migrateV1toV2(v1, toolVersion) {
  const lock = emptyLock(toolVersion);
  for (const variants of Object.values(v1.assets || {})) {
    for (const entry of Object.values(variants || {})) {
      if (!entry || !entry.outputPath) continue;
      const path = entry.outputPath.split(sep).join("/");
      const out = { key: null, migratedFrom: 1 };
      if (entry.sourceChecksum) {
        out.v1 = { source: entry.sourceChecksum };
        if (entry.exportChecksum) out.v1.export = entry.exportChecksum;
      }
      lock.outputs[path] = out;
    }
  }
  return lock;
}

/**
 * The v1 source checksum, reproduced exactly: the file, plus for .html the
 * files it references directly through src/href/url() that exist, sorted,
 * each preceded by a NUL byte. Used only to adopt outputs from v1 locks.
 */
export function v1SourceChecksum(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath);
  if (filePath.endsWith(".html")) {
    const text = content.toString("utf-8");
    const dir = dirname(filePath);
    const refs = new Set();
    for (const pattern of [/(?:src|href)=["']([^"']+)["']/gi, /url\(["']?([^"')]+)["']?\)/gi]) {
      let m;
      while ((m = pattern.exec(text)) !== null) refs.add(m[1]);
    }
    const deps = [];
    for (const ref of refs) {
      if (!ref || /^(https?:\/\/|data:|\/\/|#)/.test(ref)) continue;
      const abs = resolve(dir, ref);
      if (existsSync(abs)) deps.push(abs);
    }
    const sorted = [...new Set(deps)].sort();
    if (sorted.length > 0) {
      const hash = createHash("sha256");
      hash.update(content);
      for (const dep of sorted) {
        hash.update("\0");
        hash.update(readFileSync(dep));
      }
      return `sha256:${hash.digest("hex")}`;
    }
  }
  return sha256(content);
}

/** The v1 export checksum, reproduced exactly (key order matters). */
export function v1ExportChecksum(width, height, outFile, locale) {
  const config = { width, height };
  if (outFile) config.outFile = outFile;
  if (locale) config.locale = locale;
  return sha256(JSON.stringify(config));
}

/** Ordered migration steps: MIGRATIONS[n] upgrades a version-n lock to n+1. */
export const MIGRATIONS = {
  1: migrateV1toV2,
};

/**
 * Upgrade a parsed lock to LOCKFILE_VERSION by running each step in order.
 * @returns {{ lock: object, from: number }}
 */
export function migrateLock(data, toolVersion) {
  const from = lockVersionOf(data);
  let lock = data;
  for (let v = from; v < LOCKFILE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) {
      throw new LockfileError(`No migration from lockfile v${v}.`, "NO_MIGRATION");
    }
    lock = step(lock, toolVersion);
  }
  lock.lockfileVersion = LOCKFILE_VERSION;
  return { lock, from };
}

/**
 * Read assets.lock, migrating older versions in memory.
 *
 * Throws LockfileError when the lock is corrupt (never silently discarded,
 * since that would re-render everything and hide a merge conflict) or was
 * written by a newer open-assets than this one.
 *
 * @returns {{ lock: object, from: number|null, exists: boolean }}
 *   `from` is the on-disk version when a migration ran, else null
 */
export function loadLock(projectDir, toolVersion) {
  const path = join(projectDir, LOCK_FILENAME);
  if (!existsSync(path)) {
    return { lock: emptyLock(toolVersion), from: null, exists: false };
  }
  const raw = readFileSync(path, "utf-8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    const conflict = /^(<{7}|={7}|>{7})/m.test(raw) ? " It contains git merge conflict markers." : "";
    throw new LockfileError(
      `${LOCK_FILENAME} is not valid JSON (${err.message}).${conflict} ` +
        `Resolve it, or delete it and run \`open-assets render\` to rebuild it.`,
      "CORRUPT"
    );
  }
  const version = lockVersionOf(data);
  if (version === null) {
    throw new LockfileError(
      `${LOCK_FILENAME} has no lockfileVersion. Delete it and run \`open-assets render\` to rebuild it.`,
      "CORRUPT"
    );
  }
  if (version > LOCKFILE_VERSION) {
    const by = data.tool ? `open-assets ${data.tool}` : "a newer open-assets";
    throw new LockfileError(
      `${LOCK_FILENAME} was written by ${by} (lockfile v${version}). ` +
        `This is open-assets ${toolVersion || "(unknown)"}, which reads up to v${LOCKFILE_VERSION}. ` +
        `Run npx @open-assets/open-assets@latest.`,
      "NEWER"
    );
  }
  if (version < LOCKFILE_VERSION) {
    const { lock } = migrateLock(data, toolVersion);
    return { lock, from: version, exists: true };
  }
  const lock = { ...emptyLock(toolVersion), ...data };
  return { lock, from: null, exists: true };
}

/** Serialize a lock deterministically: sorted keys, no timestamps. */
export function serializeLock(lock) {
  const ordered = {
    lockfileVersion: LOCKFILE_VERSION,
    renderer: lock.renderer,
    tool: lock.tool,
    fingerprint: lock.fingerprint,
    files: sortDeep(lock.files || {}),
    templates: sortDeep(lock.templates || {}),
    strings: sortDeep(lock.strings || {}),
    outputs: sortDeep(lock.outputs || {}),
  };
  return JSON.stringify(ordered, null, 2) + "\n";
}

/** Write assets.lock atomically (temp file + rename). */
export function saveLock(projectDir, lock) {
  atomicWrite(join(projectDir, LOCK_FILENAME), serializeLock(lock));
}
