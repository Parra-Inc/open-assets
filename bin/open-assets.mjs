#!/usr/bin/env node
import { Command } from "commander";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";

/**
 * Resolve an option value with env var fallback.
 * CLI flags take precedence over env vars, which take precedence over defaults.
 */
function env(name, fallback) {
  return process.env[name] ?? fallback;
}

const program = new Command();

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

program
  .name("open-assets")
  .description("Dev server and export tool for app screenshots, icons, and logos")
  .version(pkg.version);

// ── dev ──────────────────────────────────────────────────────────────────────

program
  .command("dev")
  .description("Start the dev server with live preview and export UI")
  .argument("[dir]", "Project directory containing manifest.json", ".")
  .option("-p, --port <port>", "Port to listen on (env: OPEN_ASSETS_PORT)", env("OPEN_ASSETS_PORT", "3200"))
  .option("-H, --host <host>", "Host to bind to (env: OPEN_ASSETS_HOST)", env("OPEN_ASSETS_HOST", "localhost"))
  .option("--no-open", "Don't auto-open the browser (env: OPEN_ASSETS_NO_OPEN)")
  .option("-q, --quiet", "Suppress server logs (env: OPEN_ASSETS_QUIET)", env("OPEN_ASSETS_QUIET") === "true")
  .option("--ci", "CI mode: no browser, quiet logging", env("CI") === "true")
  .option("--manifest <path>", "Path to manifest file (env: OPEN_ASSETS_MANIFEST)", env("OPEN_ASSETS_MANIFEST", "manifest.json"))
  .option("--static-dir <dirs...>", "Additional static directories to serve")
  .option("--render-timeout <ms>", "Puppeteer render timeout in ms (env: OPEN_ASSETS_RENDER_TIMEOUT)", env("OPEN_ASSETS_RENDER_TIMEOUT", "30000"))
  .action(async (dir, opts) => {
    const projectDir = resolve(dir);
    const manifestPath = resolve(projectDir, opts.manifest);

    if (!existsSync(manifestPath)) {
      console.error(
        `Error: ${opts.manifest} not found in ${projectDir}\n` +
          `Run "open-assets init" to create one.`
      );
      process.exit(1);
    }

    // CI mode implies quiet + no-open
    if (opts.ci) {
      opts.quiet = true;
      opts.open = false;
    }

    // Env var fallback for no-open
    if (env("OPEN_ASSETS_NO_OPEN") === "true") {
      opts.open = false;
    }

    const { startServer } = await import("../lib/server.mjs");
    const port = parseInt(opts.port, 10);
    startServer(projectDir, {
      port,
      host: opts.host,
      quiet: opts.quiet,
      manifestPath,
      staticDirs: opts.staticDir,
      renderTimeout: parseInt(opts.renderTimeout, 10),
    });

    if (opts.open) {
      const open = (await import("open")).default;
      setTimeout(() => open(`http://${opts.host}:${port}`), 500);
    }
  });

// ── render ───────────────────────────────────────────────────────────────────

program
  .command("render")
  .description("Render assets headlessly via CLI")
  .argument("[dir]", "Project directory containing manifest.json", ".")
  .option("--tab <id>", "Render only the tab with this ID")
  .option("--width <px>", "Output width in pixels")
  .option("--height <px>", "Output height in pixels")
  .option("--preset <name>", "Use a named export preset from manifest")
  .option("--variant <name>", "Export a specific variant (alias for --preset)")
  .option("--item <name>", "Render only the item with this name")
  .option("--all-presets", "Export at every preset size defined in the manifest")
  .option("--force", "Re-render all assets even if unchanged")
  .option("-o, --output <dir>", "Output directory (env: OPEN_ASSETS_OUTPUT)", env("OPEN_ASSETS_OUTPUT", "./exports"))
  .option("--manifest <path>", "Path to manifest file (env: OPEN_ASSETS_MANIFEST)", env("OPEN_ASSETS_MANIFEST", "manifest.json"))
  .option("--parallel <count>", "Number of parallel renders (env: OPEN_ASSETS_PARALLEL)", env("OPEN_ASSETS_PARALLEL", "1"))
  .option("--render-timeout <ms>", "Puppeteer render timeout in ms", env("OPEN_ASSETS_RENDER_TIMEOUT", "30000"))
  .option("--json", "Output results as JSON (for CI/scripting)")
  .option("-q, --quiet", "Suppress progress logs", env("OPEN_ASSETS_QUIET") === "true")
  .action(async (dir, opts) => {
    const projectDir = resolve(dir);
    const manifestPath = resolve(projectDir, opts.manifest);

    if (!existsSync(manifestPath)) {
      console.error(`Error: ${opts.manifest} not found in ${projectDir}`);
      process.exit(1);
    }

    // Normalize --variant to --preset
    opts.preset = opts.preset || opts.variant;

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const { renderScreenshot, renderAndSaveIcon, closeBrowser } = await import(
      "../lib/renderer.mjs"
    );
    const { readLockfile, writeLockfile, computeChecksum, isUpToDate, recordExport } = await import(
      "../lib/lockfile.mjs"
    );
    const { mkdirSync, writeFileSync } = await import("fs");

    const outputDir = resolve(opts.output);
    mkdirSync(outputDir, { recursive: true });

    const tabs = opts.tab
      ? manifest.tabs.filter((t) => t.id === opts.tab)
      : manifest.tabs;

    if (tabs.length === 0) {
      console.error(`Error: tab "${opts.tab}" not found in manifest`);
      process.exit(1);
    }

    const lockData = readLockfile(projectDir);
    const results = [];
    let skipped = 0;
    const startTime = Date.now();

    // Helper: render all items in a gallery at a given size into a subdirectory
    async function renderGalleryAtSize(tab, w, h, subDir) {
      const dir = subDir ? join(outputDir, subDir) : outputDir;
      mkdirSync(dir, { recursive: true });
      const variantKey = subDir || `${w}x${h}`;
      const allItems = tab.items || [];
      const items = opts.item
        ? allItems.filter(i => i.name === opts.item || i.label === opts.item)
        : allItems;
      for (const item of items) {
        const name = item.name || item.label || "screenshot";
        const outPath = join(dir, `${name}.png`);
        const assetKey = `${tab.id}/${name}`;
        const srcPath = resolve(projectDir, item.src);
        const checksum = computeChecksum(srcPath);

        // Skip if unchanged
        if (!opts.force && checksum && isUpToDate(lockData, assetKey, variantKey, checksum, outPath)) {
          if (!opts.quiet) console.log(`  Skipping ${name} at ${w}x${h} (unchanged)`);
          skipped++;
          continue;
        }

        if (!opts.quiet) console.log(`Rendering ${name} at ${w}x${h}...`);
        const buffer = await renderScreenshot(
          projectDir,
          item.src,
          w,
          h,
          tab.sourceWidth,
          tab.sourceHeight
        );
        writeFileSync(outPath, buffer);
        results.push({ tab: tab.id, type: "screenshot", name, path: outPath, width: w, height: h, size: buffer.length });
        if (checksum) recordExport(lockData, assetKey, variantKey, checksum, outPath);
        if (!opts.quiet) console.log(`  → ${outPath}`);
      }
    }

    for (const tab of tabs) {
      if (tab.type === "icon") {
        // Export to Xcode if configured
        if (tab.xcodeOutputDir) {
          if (!opts.quiet) console.log(`Rendering icon to Xcode...`);
          const path = await renderAndSaveIcon(projectDir, manifest);
          results.push({ tab: tab.id, type: "xcode", path });
        }
        // Export PNG at requested size (or source size)
        const w = parseInt(opts.width) || tab.sourceWidth || 1024;
        const h = parseInt(opts.height) || tab.sourceHeight || 1024;
        const variantKey = `${w}x${h}`;
        const outPath = join(outputDir, `icon-${w}x${h}.png`);
        const srcPath = resolve(projectDir, tab.sourceFile);
        const checksum = computeChecksum(srcPath);

        if (!opts.force && checksum && isUpToDate(lockData, tab.id, variantKey, checksum, outPath)) {
          if (!opts.quiet) console.log(`  Skipping icon at ${w}x${h} (unchanged)`);
          skipped++;
        } else {
          if (!opts.quiet) console.log(`Rendering icon at ${w}x${h}...`);
          const buffer = await renderScreenshot(
            projectDir,
            tab.sourceFile,
            w,
            h,
            tab.sourceWidth || w,
            tab.sourceHeight || h
          );
          writeFileSync(outPath, buffer);
          results.push({ tab: tab.id, type: "icon", path: outPath, width: w, height: h, size: buffer.length });
          if (checksum) recordExport(lockData, tab.id, variantKey, checksum, outPath);
          if (!opts.quiet) console.log(`  → ${outPath}`);
        }

      } else if (tab.type === "iframe-gallery") {

        if (opts.allPresets && tab.exportPresets) {
          // --all-presets: export at every preset size, organized into subdirectories
          for (const group of tab.exportPresets) {
            for (const preset of group.presets) {
              const subDir = preset.zipName || `${tab.id}-${preset.width}x${preset.height}`;
              if (!opts.quiet) console.log(`\n  [${group.section}] ${preset.label} (${preset.width}x${preset.height})`);
              await renderGalleryAtSize(tab, preset.width, preset.height, subDir);
            }
          }
        } else {
          // Single size: --preset > --width/--height > source defaults
          let w, h;
          if (opts.preset && tab.exportPresets) {
            const preset = tab.exportPresets
              .flatMap((g) => g.presets)
              .find((p) => p.label === opts.preset || p.zipName === opts.preset);
            if (preset) {
              w = preset.width;
              h = preset.height;
            }
          }
          w = w || parseInt(opts.width) || tab.sourceWidth;
          h = h || parseInt(opts.height) || tab.sourceHeight;
          await renderGalleryAtSize(tab, w, h, null);
        }

      } else if (tab.type === "logo") {
        const prefix = tab.downloadPrefix || "logo";
        const srcPath = resolve(projectDir, tab.sourceFile);
        const checksum = computeChecksum(srcPath);

        // Export SVG (copy source file)
        if (existsSync(srcPath)) {
          const svgOutPath = join(outputDir, `${prefix}.svg`);
          const { copyFileSync } = await import("fs");
          copyFileSync(srcPath, svgOutPath);
          results.push({ tab: tab.id, type: "logo-svg", path: svgOutPath });
          if (!opts.quiet) console.log(`  → ${svgOutPath}`);
        }

        // Export PNG at requested size or standard sizes
        const sizes = opts.width
          ? [parseInt(opts.width)]
          : [512, 1024, 2048];

        for (const size of sizes) {
          const variantKey = `${size}x${size}`;
          const outPath = join(outputDir, `${prefix}-${size}x${size}.png`);

          if (!opts.force && checksum && isUpToDate(lockData, tab.id, variantKey, checksum, outPath)) {
            if (!opts.quiet) console.log(`  Skipping logo at ${size}x${size} (unchanged)`);
            skipped++;
            continue;
          }

          if (!opts.quiet) console.log(`Rendering logo at ${size}x${size}...`);
          const buffer = await renderScreenshot(
            projectDir,
            tab.sourceFile,
            size,
            size,
            tab.displayWidth || size,
            tab.displayHeight || size
          );
          writeFileSync(outPath, buffer);
          results.push({ tab: tab.id, type: "logo-png", path: outPath, width: size, height: size, size: buffer.length });
          if (checksum) recordExport(lockData, tab.id, variantKey, checksum, outPath);
          if (!opts.quiet) console.log(`  → ${outPath}`);
        }
      }
    }

    // Persist lockfile
    writeLockfile(projectDir, lockData);

    await closeBrowser();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (opts.json) {
      console.log(JSON.stringify({ ok: true, assets: results, skipped, elapsed: `${elapsed}s` }, null, 2));
    } else if (!opts.quiet) {
      const parts = [`${results.length} asset(s) rendered`];
      if (skipped > 0) parts.push(`${skipped} skipped (unchanged)`);
      console.log(`\nDone. ${parts.join(", ")} in ${elapsed}s.`);
    }
  });

// ── list ─────────────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List all tabs and assets defined in the manifest")
  .argument("[dir]", "Project directory containing manifest.json", ".")
  .option("--manifest <path>", "Path to manifest file", env("OPEN_ASSETS_MANIFEST", "manifest.json"))
  .option("--json", "Output as JSON")
  .action(async (dir, opts) => {
    const projectDir = resolve(dir);
    const manifestPath = resolve(projectDir, opts.manifest);

    if (!existsSync(manifestPath)) {
      console.error(`Error: ${opts.manifest} not found in ${projectDir}`);
      process.exit(1);
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    if (opts.json) {
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    console.log(`\n  ${manifest.name}\n`);
    for (const tab of manifest.tabs) {
      const badge = { "iframe-gallery": "gallery", icon: "icon", logo: "logo" }[tab.type] || tab.type;
      console.log(`  [${badge}] ${tab.label} (${tab.id})`);
      if (tab.type === "iframe-gallery" && tab.items) {
        for (const item of tab.items) {
          console.log(`    • ${item.label || item.name} → ${item.src}`);
        }
        if (tab.exportPresets) {
          for (const group of tab.exportPresets) {
            for (const preset of group.presets) {
              console.log(`    ↳ ${group.section}: ${preset.label} (${preset.width}×${preset.height})`);
            }
          }
        }
      } else if (tab.type === "icon") {
        console.log(`    • ${tab.sourceFile} (${tab.sourceWidth}×${tab.sourceHeight})`);
        if (tab.xcodeOutputDir) console.log(`    ↳ Xcode: ${tab.xcodeOutputDir}`);
      } else if (tab.type === "logo") {
        console.log(`    • ${tab.sourceFile} (${tab.displayWidth}×${tab.displayHeight})`);
      }
    }
    console.log();
  });

// ── validate ─────────────────────────────────────────────────────────────────

program
  .command("validate")
  .description("Validate the manifest.json and check that all referenced files exist")
  .argument("[dir]", "Project directory containing manifest.json", ".")
  .option("--manifest <path>", "Path to manifest file", env("OPEN_ASSETS_MANIFEST", "manifest.json"))
  .action(async (dir, opts) => {
    const projectDir = resolve(dir);
    const manifestPath = resolve(projectDir, opts.manifest);

    if (!existsSync(manifestPath)) {
      console.error(`Error: ${opts.manifest} not found in ${projectDir}`);
      process.exit(1);
    }

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (err) {
      console.error(`Error: Invalid JSON in ${opts.manifest}: ${err.message}`);
      process.exit(1);
    }

    let errors = 0;
    const ok = (msg) => console.log(`  ✓ ${msg}`);
    const fail = (msg) => { console.log(`  ✗ ${msg}`); errors++; };

    console.log(`\n  Validating ${opts.manifest}...\n`);

    // Check top-level fields
    if (manifest.name) ok(`name: "${manifest.name}"`);
    else fail("Missing top-level 'name' field");

    if (Array.isArray(manifest.tabs) && manifest.tabs.length > 0) {
      ok(`${manifest.tabs.length} tab(s) defined`);
    } else {
      fail("Missing or empty 'tabs' array");
      process.exit(1);
    }

    // Check each tab
    const ids = new Set();
    for (const tab of manifest.tabs) {
      if (!tab.id) { fail(`Tab missing 'id' field`); continue; }
      if (ids.has(tab.id)) { fail(`Duplicate tab id: "${tab.id}"`); }
      ids.add(tab.id);

      if (!tab.type) { fail(`Tab "${tab.id}" missing 'type' field`); continue; }
      if (!["iframe-gallery", "icon", "logo"].includes(tab.type)) {
        fail(`Tab "${tab.id}" has unknown type: "${tab.type}"`);
        continue;
      }

      if (tab.type === "iframe-gallery") {
        if (!tab.items || tab.items.length === 0) {
          fail(`Tab "${tab.id}" has no items`);
        } else {
          for (const item of tab.items) {
            const filePath = resolve(projectDir, item.src);
            if (existsSync(filePath)) ok(`${item.src} exists`);
            else fail(`${item.src} not found`);
          }
        }
      } else if (tab.type === "icon" || tab.type === "logo") {
        const filePath = resolve(projectDir, tab.sourceFile);
        if (existsSync(filePath)) ok(`${tab.sourceFile} exists`);
        else fail(`${tab.sourceFile} not found`);
      }
    }

    console.log();
    if (errors === 0) {
      console.log("  All checks passed.\n");
    } else {
      console.log(`  ${errors} error(s) found.\n`);
      process.exit(1);
    }
  });

// ── init ─────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Scaffold a new manifest.json and example assets")
  .argument("[dir]", "Target directory", ".")
  .action(async (dir) => {
    const { scaffoldProject } = await import("../lib/init.mjs");
    await scaffoldProject(resolve(dir));
  });

program.parse();
