import { resolve, join } from "path";
import { readFileSync, existsSync } from "fs";
import { filterCollections, filterTemplates, resolveRenderSizes, flatOutputs } from "./manifest.mjs";
import { loadLocalizations, resolveStrings, getLocales, getDirection } from "./localization.mjs";
import {
  RENDERER_VERSION,
  sha256,
  canonicalJson,
  toRel,
  collectDeps,
  extractKeys,
  isReusableTemplate,
  localeAssets,
  localeClass,
  stringDigests,
  v1SourceChecksum,
  v1ExportChecksum,
} from "./cache.mjs";

/**
 * Work out every output a render would produce, its render key, and whether
 * it is fresh, needs rendering, or can be copied from an identical output.
 * Pure planning: reads source files and the lock, writes nothing, never
 * launches a browser. Shared by `render` and `check`.
 *
 * @param {string} projectDir
 * @param {object} manifest
 * @param {object} options - render CLI options (filters, force, output, size...)
 * @param {{ lock: object, hasher: import("./cache.mjs").FileHasher }} ctx
 */
export function planAssets(projectDir, manifest, options, { lock, hasher }) {
  const { collections, error } = filterCollections(manifest.collections, {
    collection: options.collection,
    tag: options.tag,
  });
  if (error) return { error };

  const outputDir = resolve(options.output || "./exports");
  const files = {};
  const strings = {};
  const warnings = [];
  const planned = [];
  const lockOutputs = lock.outputs || {};

  // check runs where gitignored inputs (UI-test captures, a built
  // stylesheet) are absent. With trustLockForMissing, an input the lock
  // recorded but the checkout lacks keeps its recorded hash, so only inputs
  // that are present are verified.
  const trust = Boolean(options.trustLockForMissing);
  const lockFiles = lock.files || {};
  const trusted = new Set();
  const isTrusted = (abs) => trust && !existsSync(abs) && Boolean(lockFiles[toRel(projectDir, abs)]);
  const exists = (abs) => existsSync(abs) || isTrusted(abs);
  const templatesDeps = {};

  const hashRel = (abs) => {
    const rel = toRel(projectDir, abs);
    let h = hasher.hash(abs);
    if (!h && isTrusted(abs)) {
      h = lockFiles[rel];
      trusted.add(rel);
    }
    if (h) files[rel] = h;
    return h;
  };

  // Templates are analysed once per run, whatever their locale and size count.
  const templateInfo = new Map();
  const analyse = (template) => {
    const srcAbs = resolve(projectDir, template.src);
    if (templateInfo.has(srcAbs)) return templateInfo.get(srcAbs);
    let { deps, missing } = collectDeps(srcAbs);
    const srcRel = toRel(projectDir, srcAbs);
    if (trust) {
      // Dependencies reached through an absent file (its own url() refs)
      // cannot be discovered here; take them from the lock's record.
      const recorded = ((lock.templates || {})[srcRel] || []).map((r) => resolve(projectDir, r));
      deps = [...new Set([...deps, ...recorded.filter(isTrusted)])].sort();
      missing = missing.filter((m) => !isTrusted(m));
    }
    const contents = [];
    for (const f of [srcAbs, ...deps]) {
      if (/\.(html?|svg)$/i.test(f)) {
        try {
          contents.push(readFileSync(f, "utf-8"));
        } catch {
          // Unreadable files are covered by the null hash below.
        }
      }
    }
    const entries = [srcAbs, ...deps].map((f) => [toRel(projectDir, f), hashRel(f)]);
    templatesDeps[srcRel] = entries.slice(1).map((e) => e[0]);
    const info = {
      srcAbs,
      deps,
      keys: extractKeys(contents),
      reusable: isReusableTemplate(contents),
      depRels: entries.map((e) => e[0]),
      source: sha256(canonicalJson({ files: entries, missing: missing.map((m) => toRel(projectDir, m)) })),
    };
    templateInfo.set(srcAbs, info);
    return info;
  };

  for (const col of collections) {
    const templates = filterTemplates(col.templates, options.template);
    const { sizes, warning } = resolveRenderSizes(col, {
      width: options.width,
      height: options.height,
      size: options.size,
    });
    if (warning) {
      warnings.push(warning);
      continue;
    }
    if (sizes.length === 0) {
      warnings.push(`No export sizes found for collection "${col.id}"`);
      continue;
    }

    let locales = [null];
    let localizations = null;
    let sourceLanguage = "en";
    if (col.localizations) {
      localizations = loadLocalizations(projectDir, col.localizations);
      hashRel(resolve(projectDir, col.localizations));
      sourceLanguage = localizations.sourceLanguage || "en";
      locales = getLocales(localizations, col.locales);
      if (options.locale) {
        locales = locales.filter((l) => l === options.locale);
        if (locales.length === 0) {
          warnings.push(`locale "${options.locale}" not found in collection "${col.id}", skipping`);
          continue;
        }
      }
    }

    // Layout is decided by the full template list so filtered runs land in
    // the same paths as full runs.
    const singleTemplate = col.templates.length === 1;
    const hasLocales = locales[0] !== null;
    const dedupe = col.dedupeLocales !== false && process.env.OPEN_ASSETS_NO_DEDUPE !== "1";

    for (const locale of locales) {
      const resolved = locale ? resolveStrings(localizations, locale) : null;
      const direction = locale ? getDirection(locale) : null;
      const localization = locale ? { strings: resolved, locale, direction } : undefined;
      if (locale) strings[col.id] ??= {};

      for (const template of templates) {
        const info = analyse(template);
        const used = locale ? Object.fromEntries(info.keys.map((k) => [k, resolved[k] ?? null])) : null;
        const digests = locale ? stringDigests(resolved, info.keys) : {};
        if (locale) {
          strings[col.id][locale] = { ...(strings[col.id][locale] || {}), ...digests };
        }
        const assetFiles = localeAssets(projectDir, info.deps, locale, sourceLanguage, template, col.inputs, exists);
        const assetEntries = assetFiles.map((f) => [toRel(projectDir, f), hashRel(f)]);
        const stringsHash = locale ? sha256(canonicalJson(used)) : null;
        const assetsHash = sha256(canonicalJson(assetEntries));
        const lclass = locale ? localeClass(locale, direction, used) : null;

        for (const entry of sizes) {
          const w = entry.size.width;
          const h = entry.size.height;
          const outExt = entry.outFile ? entry.outFile.split(".").pop().toLowerCase() : "png";
          const format = outExt === "jpg" || outExt === "jpeg" ? "jpeg" : "png";
          const defaultExt = format === "jpeg" ? "jpg" : "png";
          const fileName = singleTemplate ? `${entry.name}.${defaultExt}` : `${template.name}.${defaultExt}`;

          let outPath;
          if (entry.outFile) {
            let p = entry.outFile.replace(/\{template\}/g, template.name);
            if (locale) p = p.replace(/\{locale\}/g, locale);
            outPath = resolve(projectDir, p);
          } else {
            const parts = [outputDir, col.id];
            if (hasLocales) parts.push(locale);
            if (!singleTemplate) parts.push(entry.name);
            outPath = join(...parts, fileName);
          }

          const config = {
            width: w,
            height: h,
            format,
            background: col.background ?? null,
            sourceSize: col.sourceSize,
          };
          const configHash = sha256(canonicalJson(config));
          const key = sha256(
            canonicalJson({
              renderer: RENDERER_VERSION,
              source: info.source,
              strings: stringsHash,
              assets: assetsHash,
              config: configHash,
              // Without dedupe the exact locale is part of the key, so no two
              // locales ever share a render.
              locale: dedupe ? lclass : locale,
            })
          );

          planned.push({
            kind: "image",
            collection: col,
            template,
            locale,
            localization,
            direction,
            srcPath: info.srcAbs,
            outPath,
            relOut: toRel(projectDir, outPath),
            w,
            h,
            format,
            defaultExt,
            key,
            parts: { source: info.source, strings: stringsHash, assets: assetsHash, config: configHash },
            depRels: info.depRels,
            keys: info.keys,
            reusable: info.reusable,
            assetRels: assetEntries.map((e) => e[0]),
            v1Export: v1ExportChecksum(w, h, entry.outFile, locale),
            isSvg: template.src.endsWith(".svg"),
            sourceW: col.sourceSize.width,
            sourceH: col.sourceSize.height,
          });
        }
      }
    }

    // Xcode app icon outputs are cached like any image.
    for (const output of flatOutputs(col)) {
      if (output.type !== "xcode" || !col.templates[0]) continue;
      if (options.template && !templates.includes(col.templates[0])) continue;
      const info = analyse(col.templates[0]);
      const outPath = resolve(projectDir, output.path, "AppIcon.png");
      const configHash = sha256(canonicalJson({ type: "xcode", sourceSize: col.sourceSize }));
      planned.push({
        kind: "xcode",
        collection: col,
        output,
        template: col.templates[0],
        locale: null,
        outPath,
        relOut: toRel(projectDir, outPath),
        key: sha256(canonicalJson({ renderer: RENDERER_VERSION, source: info.source, config: configHash })),
        parts: { source: info.source, strings: null, assets: null, config: configHash },
        depRels: info.depRels,
        keys: [],
        assetRels: [],
      });
    }
  }

  // Entries carried over from a v1 lock, including early absolute paths
  // that are matched to project-relative outputs by suffix.
  const migrated = Object.entries(lockOutputs).filter(([, o]) => o && o.migratedFrom === 1);
  const absMigrated = migrated.filter(([p]) => p.startsWith("/"));
  const legacyFor = (relOut) => {
    const direct = lockOutputs[relOut];
    if (direct) return direct;
    const hit = absMigrated.find(([p]) => p.endsWith(`/${relOut}`));
    return hit ? hit[1] : null;
  };
  const v1Source = new Map();
  const adoptedTemplates = new Set();

  // Decide each output's status.
  const byKey = new Map();
  for (const item of planned) {
    const prev = item.kind === "image" ? legacyFor(item.relOut) : lockOutputs[item.relOut];
    const onDisk = hasher.hash(item.outPath);
    item.lockEntry = prev || null;
    item.onDisk = onDisk;
    let fresh =
      !options.force &&
      prev &&
      prev.key === item.key &&
      onDisk !== null &&
      prev.png === onDisk;
    if (!fresh && !options.force && item.kind === "image" && adoptable(item, prev, onDisk, v1Source)) {
      fresh = true;
      item.adopted = true;
      adoptedTemplates.add(`${item.collection.id}\0${item.template.name}`);
    }
    item.status = fresh ? "fresh" : "render";
    if (item.kind === "image") {
      const group = byKey.get(item.key) || [];
      group.push(item);
      byKey.set(item.key, group);
    }
  }

  // v1 re-ran the xcode output on every render, so AppIcon.png matched the
  // template as of the last render. If that template's images were adopted
  // (unchanged since then), the icon is current too.
  if (migrated.length > 0 && !options.force) {
    for (const item of planned) {
      if (item.kind !== "xcode" || item.status === "fresh" || item.onDisk === null) continue;
      if (adoptedTemplates.has(`${item.collection.id}\0${item.template.name}`)) {
        item.status = "fresh";
        item.adopted = true;
      }
    }
  }

  // --accept-existing: declare the files on disk current without rendering.
  // Used to adopt the lockfile in a project whose committed images must not
  // change (e.g. rendered from captures that are not in the repo). Missing
  // outputs are recorded with png null, so a later render produces them.
  if (options.acceptExisting && !options.force) {
    for (const item of planned) {
      if (item.status === "fresh") continue;
      item.status = "fresh";
      item.adopted = true;
      item.accepted = true;
    }
  }

  // Identical outputs render once. A fresh twin on disk is copied with no
  // render at all; otherwise the first one renders and the rest copy it.
  for (const group of byKey.values()) {
    const stale = group.filter((i) => i.status === "render");
    if (stale.length === 0 || group.length === 1) continue;
    const leader = group.find((i) => i.status === "fresh") || stale[0];
    for (const item of stale) {
      if (item === leader) continue;
      // Copies must match format; same key implies same config, so they do.
      item.status = "copy";
      item.copyFrom = leader;
    }
  }

  return { planned, files, strings, templates: templatesDeps, trusted: [...trusted].sort(), warnings, outputDir, collections };
}

/**
 * An output recorded by a v1 lock is adopted (kept without re-rendering)
 * when the file exists and the v1 checksums, recomputed with the v1
 * algorithm, still match: it is exactly as current as v1 believed.
 */
function adoptable(item, prev, onDisk, memo) {
  if (!prev || prev.migratedFrom !== 1 || !prev.v1 || onDisk === null) return false;
  if (!memo.has(item.srcPath)) memo.set(item.srcPath, v1SourceChecksum(item.srcPath));
  if (memo.get(item.srcPath) !== prev.v1.source) return false;
  if (prev.v1.export && prev.v1.export !== item.v1Export) return false;
  return true;
}

/** Did this run cover every output, so the lock can be pruned and fingerprinted? */
export function isFullRun(options) {
  return !(
    options.collection ||
    options.tag ||
    options.template ||
    options.locale ||
    options.size ||
    options.width ||
    options.height
  );
}

/** Fingerprint of a full plan: every output path and its render key. */
export function fingerprintOf(planned) {
  return sha256(canonicalJson(planned.map((i) => [i.relOut, i.key]).sort((a, b) => (a[0] < b[0] ? -1 : 1))));
}

/**
 * Human-readable reasons an output is not fresh, for --explain and check.
 * Compares against the lock's recorded parts, file hashes and string digests.
 */
export function explain(item, lock, current) {
  if (item.status === "fresh") return [];
  const prev = item.lockEntry;
  const reasons = [];
  if (!prev) return ["not in assets.lock (new output)"];
  if (prev.migratedFrom) return [`recorded by lockfile v${prev.migratedFrom}, re-rendered once to verify`];
  if (prev.key !== item.key) {
    if (prev.renderer !== undefined && prev.renderer !== RENDERER_VERSION) {
      reasons.push(`renderer changed (${prev.renderer} → ${RENDERER_VERSION})`);
    }
    if (prev.source !== item.parts.source) {
      const changed = item.depRels.filter((rel) => (lock.files || {})[rel] !== current.files[rel]);
      reasons.push(changed.length > 0 ? `${changed.join(", ")} changed` : "template dependencies changed");
    }
    if (prev.strings !== item.parts.strings && item.locale) {
      const was = lock.strings?.[item.collection.id]?.[item.locale] || {};
      const now = current.strings?.[item.collection.id]?.[item.locale] || {};
      const keys = item.keys.filter((k) => was[k] !== now[k]);
      reasons.push(
        keys.length > 0
          ? keys.map((k) => `strings[${item.locale}].${k} changed`).join(", ")
          : `strings[${item.locale}] changed`
      );
    }
    if (prev.assets !== item.parts.assets) {
      const changed = item.assetRels.filter((rel) => (lock.files || {})[rel] !== current.files[rel]);
      reasons.push(changed.length > 0 ? `${changed.join(", ")} changed` : `locale files for ${item.locale} changed`);
    }
    if (prev.config !== item.parts.config) {
      reasons.push("export settings changed (size, format, background or sourceSize)");
    }
    if (reasons.length === 0) reasons.push("render key changed");
  }
  if (prev.key === item.key) {
    if (item.onDisk === null) reasons.push("output file is missing");
    else if (prev.png !== item.onDisk) reasons.push("output file differs from assets.lock (edited by hand?)");
  }
  return reasons;
}

/** The lock entry recorded for an output once it is on disk. */
export function lockEntryFor(item, png) {
  const entry = {
    collection: item.collection.id,
    template: item.template.name,
    key: item.key,
    png,
    renderer: RENDERER_VERSION,
    ...item.parts,
  };
  if (item.locale) entry.locale = item.locale;
  return entry;
}

