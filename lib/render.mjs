import { resolve, join } from "path";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { filterCollections, filterTemplates, resolveRenderSizes, flatOutputs } from "./manifest.mjs";
import { computeExportChecksum } from "./lockfile.mjs";
import { loadLocalizations, resolveStrings, getLocales, getDirection } from "./localization.mjs";

/**
 * @typedef {object} RenderDeps
 * @property {(projectDir: string, htmlFile: string, w: number, h: number, sw: number, sh: number) => Promise<Buffer>} renderScreenshot
 * @property {(projectDir: string, collection: object, outputConfig: object) => Promise<string>} runXcodeOutput
 * @property {() => Promise<void>} closeBrowser
 * @property {(projectDir: string) => object} readLockfile
 * @property {(projectDir: string, data: object) => void} writeLockfile
 * @property {(filePath: string) => string|null} computeChecksum
 * @property {(lockData: object, assetKey: string, variantKey: string, checksum: string, outputPath: string, exportChecksum?: string) => boolean} isUpToDate
 * @property {(lockData: object, assetKey: string, variantKey: string, checksum: string, outputPath: string, exportChecksum?: string) => void} recordExport
 */

/**
 * Render assets according to the manifest and options.
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
 * @param {boolean} [options.force] - Export at all sizes and re-render (ignores cache)
 * @param {string} [options.output] - Output directory path
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

  const lockData = deps.readLockfile(projectDir);
  const results = [];
  let skipped = 0;
  const startTime = Date.now();

  for (const col of collections) {
    const sourceW = col.sourceSize.width;
    const sourceH = col.sourceSize.height;

    const templates = filterTemplates(col.templates, options.template);

    const { sizes: sizesToRender, warning } = resolveRenderSizes(col, {
      width: options.width,
      height: options.height,
      size: options.size,
      force: options.force,
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

    const singleTemplate = templates.length === 1;
    const multipleSizes = sizesToRender.length > 1 || options.force;
    // Single-template collections use flat layout with entry.name as filename
    // Multi-template collections use subdirs per size
    const useSubDirs = multipleSizes && !singleTemplate;
    const hasLocales = locales.length > 0 && locales[0] !== null;

    for (const locale of locales) {
      const strings = locale ? resolveStrings(localizations, locale) : null;
      const direction = locale ? getDirection(locale) : null;
      const localization = locale ? { strings, locale, direction } : undefined;

      if (locale) {
        _log(`\n  Locale: ${locale} (${direction})`);
      }

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
        mkdirSync(sizeDir, { recursive: true });

        if (sizesToRender.length > 1) {
          _log(`\n  ${entry.label} (${w}x${h})`);
        }

        for (const template of templates) {
          // Determine output format from outFile extension or default to png
          const outExt = entry.outFile
            ? entry.outFile.split(".").pop().toLowerCase()
            : "png";
          const format = outExt === "jpg" || outExt === "jpeg" ? "jpeg" : "png";
          const defaultExt = format === "jpeg" ? "jpg" : "png";

          // Single-template: use entry.name as filename (e.g. logo-1024.png)
          // Multi-template: use template.name as filename (e.g. 01-hero.png)
          const fileName = singleTemplate && multipleSizes
            ? `${entry.name}.${defaultExt}`
            : `${template.name}.${defaultExt}`;

          let outPath;
          if (entry.outFile) {
            let resolved = entry.outFile.replace(/\{template\}/g, template.name);
            if (locale) {
              resolved = resolved.replace(/\{locale\}/g, locale);
            }
            outPath = resolve(projectDir, resolved);
          } else {
            outPath = join(sizeDir, fileName);
          }

          // Asset key and variant key include locale for cache isolation
          const assetKey = locale
            ? `${col.id}/${locale}/${template.name}`
            : `${col.id}/${template.name}`;
          const variantKey = entry.name;
          const srcPath = resolve(projectDir, template.src);
          const checksum = deps.computeChecksum(srcPath);
          const exportCksum = computeExportChecksum(entry, locale);

          // Skip if unchanged
          if (
            !options.force &&
            checksum &&
            deps.isUpToDate(lockData, assetKey, variantKey, checksum, outPath, exportCksum)
          ) {
            _log(
              `  Skipping ${template.name}${locale ? ` [${locale}]` : ""} at ${w}x${h} (unchanged)`
            );
            skipped++;
            continue;
          }

          _log(
            `  Rendering ${template.name}${locale ? ` [${locale}]` : ""} at ${w}x${h}...`
          );

          const isSvg = template.src.endsWith(".svg");
          if (isSvg && w === sourceW && h === sourceH) {
            copyFileSync(srcPath, outPath.replace(`.${defaultExt}`, ".svg"));
          }

          // Ensure output directory exists when using outFile
          if (entry.outFile) {
            mkdirSync(resolve(projectDir, join(outPath, "..")), { recursive: true });
          }

          const buffer = await deps.renderScreenshot(
            projectDir,
            template.src,
            w,
            h,
            sourceW,
            sourceH,
            { format, background: col.background, localization }
          );
          writeFileSync(outPath, buffer);
          results.push({
            collection: col.id,
            template: template.name,
            locale: locale || undefined,
            path: outPath,
            width: w,
            height: h,
            size: buffer.length,
          });
          if (checksum) {
            deps.recordExport(lockData, assetKey, variantKey, checksum, outPath, exportCksum);
          }
          _log(`    → ${outPath}`);
        }
      }
    }

    // Handle outputs (xcode, copy-source, etc.)
    const outputs = flatOutputs(col);
    if (outputs.length > 0 && options.force) {
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
          for (const template of matchingTemplates) {
            const srcPath = resolve(projectDir, template.src);
            // Use entry name when single match, template name when multiple
            const baseName = output.name && matchingTemplates.length === 1
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

  // Persist lockfile
  deps.writeLockfile(projectDir, lockData);

  await deps.closeBrowser();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return { results, skipped, elapsed: `${elapsed}s` };
}
