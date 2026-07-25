import { resolve, join, relative } from "path";
import { mkdirSync, copyFileSync, existsSync } from "fs";
import { writeFile } from "fs/promises";
import { cpus } from "os";
import { filterCollections, filterTemplates, resolveRenderSizes, flatOutputs } from "./manifest.mjs";
import { computeExportChecksum } from "./lockfile.mjs";
import { loadLocalizations, resolveStrings, getLocales, getDirection } from "./localization.mjs";

// Renders overlap because per-image time is dominated by page load waits,
// not CPU. Each in-flight unit holds one Puppeteer page.
const CONCURRENCY = Math.max(1, Math.min(4, cpus().length - 1));

/**
 * @typedef {object} RenderDeps
 * @property {(projectDir: string, htmlFile: string, sourceW: number, sourceH: number, variants: {width: number, height: number, format?: string}[], options?: object) => Promise<Buffer[]>} renderVariants
 * @property {(projectDir: string, collection: object, outputConfig: object) => Promise<string>} runXcodeOutput
 * @property {() => Promise<void>} closeBrowser
 * @property {(projectDir: string) => object} readLockfile
 * @property {(projectDir: string, data: object) => void} writeLockfile
 * @property {(filePath: string) => string|null} computeChecksum
 * @property {(lockData: object, assetKey: string, variantKey: string, checksum: string, outputPath: string, exportChecksum?: string, projectDir?: string) => boolean} isUpToDate
 * @property {(lockData: object, assetKey: string, variantKey: string, checksum: string, outputPath: string, exportChecksum?: string) => void} recordExport
 */

/**
 * Render assets according to the manifest and options.
 *
 * Work is grouped into units of one (template, locale) pair: each unit
 * navigates its page once and screenshots every export size from that single
 * load. Units render concurrently on a small internal pool.
 *
 * @param {string} projectDir - Absolute path to the project directory
 * @param {object} manifest - Parsed manifest object
 * @param {object} options - Render options from CLI
 * @param {string} [options.collection] - Filter by collection ID
 * @param {string} [options.tag] - Filter by tag
 * @param {string} [options.template] - Filter by template name/label
 * @param {string} [options.size] - Named export size
 * @param {string} [options.locale] - Filter to a single locale
 * @param {string} [options.format] - Output format override (png or jpg)
 * @param {string|number} [options.width] - Custom width
 * @param {string|number} [options.height] - Custom height
 * @param {boolean} [options.force] - Re-render all assets, ignoring the incremental cache
 * @param {string} [options.output] - Output directory path
 * @param {string|number} [options.renderTimeout] - Puppeteer render timeout in ms
 * @param {boolean} [options.quiet] - Suppress logs
 * @param {RenderDeps} deps - Injected dependencies
 * @param {(msg: string) => void} [log] - Optional log function
 * @returns {Promise<{ results: object[], skipped: number, elapsed: string, error?: string }>}
 */
export async function renderAssets(projectDir, manifest, options, deps, log) {
  const noop = () => {};
  const _log = log || noop;

  // Filter collections
  const { collections, error } = filterCollections(manifest.collections, {
    collection: options.collection,
    tag: options.tag,
  });

  if (error) {
    return { results: [], skipped: 0, elapsed: "0.0s", error };
  }

  const outputDir = resolve(options.output || "./exports");
  mkdirSync(outputDir, { recursive: true });

  const renderTimeout = options.renderTimeout
    ? parseInt(options.renderTimeout, 10)
    : undefined;

  const lockData = deps.readLockfile(projectDir);
  const results = [];
  let skipped = 0;
  const startTime = Date.now();

  // Source checksums are memoized for the run: a template is hashed once no
  // matter how many sizes and locales it renders to.
  const checksumCache = new Map();
  const checksumOf = (srcPath) => {
    if (!checksumCache.has(srcPath)) {
      checksumCache.set(srcPath, deps.computeChecksum(srcPath));
    }
    return checksumCache.get(srcPath);
  };

  // The lockfile and browser are handled in finally so a mid-run failure
  // still persists completed work and never leaks a Chromium process.
  try {
    for (const col of collections) {
      const sourceW = col.sourceSize.width;
      const sourceH = col.sourceSize.height;

      const templates = filterTemplates(col.templates, options.template);

      const { sizes: sizesToRender, warning } = resolveRenderSizes(col, {
        width: options.width,
        height: options.height,
        size: options.size,
      });

      if (warning) {
        _log(`  Warning: ${warning}`);
        continue;
      }

      if (sizesToRender.length === 0) {
        _log(`  No export sizes found for collection "${col.id}"`);
        continue;
      }

      // Resolve locales for this collection
      let locales = [null]; // null = no localization
      let localizations = null;

      if (col.localizations) {
        localizations = loadLocalizations(projectDir, col.localizations);
        locales = getLocales(localizations, col.locales);
        if (options.locale) {
          locales = locales.filter((l) => l === options.locale);
          if (locales.length === 0) {
            _log(`  Warning: locale "${options.locale}" not found in collection "${col.id}", skipping`);
            continue;
          }
        }
      }

      // Layout is decided by the collection's full template list, not the
      // filtered one, so --template renders land in the same paths as full runs
      const singleTemplate = col.templates.length === 1;
      // Single-template collections use flat layout with entry.name as filename
      // Multi-template collections use subdirs per size
      const useSubDirs = !singleTemplate;
      const hasLocales = locales.length > 0 && locales[0] !== null;

      // Enumerate render units: one per (locale, template), each carrying
      // its non-skipped size variants. Skip checks run up front so units
      // whose variants are all cached never open a page.
      const units = [];

      for (const locale of locales) {
        const strings = locale ? resolveStrings(localizations, locale) : null;
        const direction = locale ? getDirection(locale) : null;
        const localization = locale ? { strings, locale, direction } : undefined;

        if (locale) {
          _log(`\n  Locale: ${locale} (${direction})`);
        }

        for (const template of templates) {
          const srcPath = resolve(projectDir, template.src);
          const checksum = checksumOf(srcPath);
          const assetKey = locale
            ? `${col.id}/${locale}/${template.name}`
            : `${col.id}/${template.name}`;

          const variants = [];

          for (const entry of sizesToRender) {
            const w = entry.size.width;
            const h = entry.size.height;

            // Build output directory: insert locale level when localizations are active
            let sizeDir;
            if (hasLocales) {
              sizeDir = useSubDirs
                ? join(outputDir, col.id, locale, entry.name)
                : join(outputDir, col.id, locale);
            } else {
              sizeDir = useSubDirs
                ? join(outputDir, col.id, entry.name)
                : join(outputDir, col.id);
            }

            // Determine output format from outFile extension or default to png
            const outExt = entry.outFile
              ? entry.outFile.split(".").pop().toLowerCase()
              : "png";
            const format = outExt === "jpg" || outExt === "jpeg" ? "jpeg" : "png";
            const defaultExt = format === "jpeg" ? "jpg" : "png";

            // Single-template: use entry.name as filename (e.g. logo/1024.png)
            // Multi-template: use template.name as filename (e.g. 01-hero.png)
            const fileName = singleTemplate
              ? `${entry.name}.${defaultExt}`
              : `${template.name}.${defaultExt}`;

            let outPath;
            if (entry.outFile) {
              let resolved = entry.outFile.replace(/\{template\}/g, template.name);
              if (locale) {
                resolved = resolved.replace(/\{locale\}/g, locale);
              }
              outPath = resolve(projectDir, resolved);
              // Create the destination directory now, before any render or
              // SVG source copy targets it.
              mkdirSync(resolve(projectDir, join(outPath, "..")), { recursive: true });
            } else {
              mkdirSync(sizeDir, { recursive: true });
              outPath = join(sizeDir, fileName);
            }

            const exportCksum = computeExportChecksum(entry, locale);
            // Lockfile paths are stored relative to the project so the cache
            // is portable across machines. The variant is keyed by output path,
            // so the same template rendered to different destinations gets its
            // own cache entry per destination.
            const lockOutPath = relative(projectDir, outPath);
            const variantKey = lockOutPath;

            // Skip if unchanged
            if (
              !options.force &&
              checksum &&
              deps.isUpToDate(lockData, assetKey, variantKey, checksum, lockOutPath, exportCksum, projectDir)
            ) {
              _log(
                `  Skipping ${template.name}${locale ? ` [${locale}]` : ""} at ${w}x${h} (unchanged)`
              );
              skipped++;
              continue;
            }

            variants.push({
              w,
              h,
              format,
              defaultExt,
              outPath,
              lockOutPath,
              exportCksum,
            });
          }

          if (variants.length > 0) {
            units.push({
              template,
              locale,
              localization,
              srcPath,
              checksum,
              assetKey,
              variants,
              logs: [],
              results: [],
              completed: false,
            });
          }
        }
      }

      // Drain units through a small worker pool. Logs are buffered per unit
      // and flushed in enumeration order so output stays deterministic.
      let nextUnit = 0;
      let nextFlush = 0;
      const errors = [];

      const flushLogs = () => {
        while (nextFlush < units.length && units[nextFlush].completed) {
          for (const line of units[nextFlush].logs) _log(line);
          nextFlush++;
        }
      };

      const runUnit = async (unit) => {
        const isSvg = unit.template.src.endsWith(".svg");
        unit.logs.push(
          `  Rendering ${unit.template.name}${unit.locale ? ` [${unit.locale}]` : ""} (${unit.variants.length} size${unit.variants.length === 1 ? "" : "s"})...`
        );

        const buffers = await deps.renderVariants(
          projectDir,
          unit.template.src,
          sourceW,
          sourceH,
          unit.variants.map((v) => ({ width: v.w, height: v.h, format: v.format })),
          {
            background: col.background,
            localization: unit.localization,
            timeout: renderTimeout,
          }
        );

        for (let i = 0; i < unit.variants.length; i++) {
          const v = unit.variants[i];
          const buffer = buffers[i];

          if (isSvg && v.w === sourceW && v.h === sourceH) {
            copyFileSync(unit.srcPath, v.outPath.replace(`.${v.defaultExt}`, ".svg"));
          }

          await writeFile(v.outPath, buffer);
          // The output write above must complete before the variant is
          // marked rendered; recordExport keys off this flag.
          v.rendered = true;
          unit.results.push({
            collection: col.id,
            template: unit.template.name,
            locale: unit.locale || undefined,
            path: v.outPath,
            width: v.w,
            height: v.h,
            size: buffer.length,
          });
          unit.logs.push(`    → ${v.outPath} (${v.w}x${v.h})`);
        }
      };

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, units.length) },
        async () => {
          while (nextUnit < units.length && errors.length === 0) {
            const unit = units[nextUnit++];
            try {
              await runUnit(unit);
            } catch (err) {
              unit.logs.push(`  Error rendering ${unit.template.name}${unit.locale ? ` [${unit.locale}]` : ""}: ${err.message}`);
              errors.push(err);
            }
            unit.completed = true;
            flushLogs();
          }
        }
      );
      await Promise.all(workers);
      flushLogs();

      // Collect results and lockfile records in enumeration order so the
      // output arrays and lockfile bytes are stable across runs.
      for (const unit of units) {
        results.push(...unit.results);
        if (!unit.checksum) continue;
        for (const v of unit.variants) {
          if (v.rendered) {
            deps.recordExport(lockData, unit.assetKey, v.lockOutPath, unit.checksum, v.lockOutPath, v.exportCksum);
          }
        }
      }

      if (errors.length > 0) {
        throw errors[0];
      }

      // Handle outputs (xcode, copy-source, etc.)
      const outputs = flatOutputs(col);
      if (outputs.length > 0) {
        for (const output of outputs) {
          if (output.type === "xcode") {
            _log(`\n  Exporting to Xcode: ${output.path}`);
            const path = await deps.runXcodeOutput(projectDir, col, output);
            results.push({ collection: col.id, type: "xcode", path });
          } else if (output.type === "copy-source") {
            const format = output.format || "svg";
            const copyDir = join(outputDir, col.id);
            mkdirSync(copyDir, { recursive: true });
            const matchingTemplates = templates.filter((t) => t.src.endsWith(`.${format}`));
            // Naming follows the collection's full match count so --template
            // runs produce the same filenames as full runs
            const collectionMatches = col.templates.filter((t) => t.src.endsWith(`.${format}`));
            for (const template of matchingTemplates) {
              const srcPath = resolve(projectDir, template.src);
              // Use entry name when single match, template name when multiple
              const baseName = output.name && collectionMatches.length === 1
                ? output.name
                : template.name;
              const destPath = join(copyDir, `${baseName}.${format}`);
              if (existsSync(srcPath)) {
                copyFileSync(srcPath, destPath);
                results.push({
                  collection: col.id,
                  template: template.name,
                  type: `copy-${format}`,
                  path: destPath,
                });
                _log(`    → ${destPath}`);
              }
            }
          }
        }
      }
    }
  } finally {
    // Persist whatever completed, even when a render failed mid-run
    deps.writeLockfile(projectDir, lockData);
    try {
      await deps.closeBrowser();
    } catch {
      // A browser-close failure must not mask the original render error
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return { results, skipped, elapsed: `${elapsed}s` };
}
