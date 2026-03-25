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

/**
 * Get all export sizes from a collection, flattened.
 */
function flatSizes(col) {
  return (col.exportSizes || []).flatMap((group) => group.sizes || []);
}

const program = new Command();

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

program
  .name("open-assets")
  .description("Dev server and export tool for app marketing assets")
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
  .option("--collection <id>", "Render only the collection with this ID")
  .option("--tag <tag>", "Render only collections with this tag")
  .option("--template <name>", "Render only the template with this name")
  .option("--size <name>", "Use a named export size from manifest")
  .option("--platform <name>", "Render only sizes for this platform")
  .option("--width <px>", "Output width in pixels (custom size)")
  .option("--height <px>", "Output height in pixels (custom size)")
  .option("--all", "Export at every size defined in the manifest")
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

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    const { renderScreenshot, runXcodeOutput, closeBrowser } = await import(
      "../lib/renderer.mjs"
    );
    const { readLockfile, writeLockfile, computeChecksum, isUpToDate, recordExport } = await import(
      "../lib/lockfile.mjs"
    );
    const { mkdirSync, writeFileSync, copyFileSync } = await import("fs");

    const outputDir = resolve(opts.output);
    mkdirSync(outputDir, { recursive: true });

    let collections = manifest.collections;
    if (opts.collection) {
      collections = collections.filter((c) => c.id === opts.collection);
    }
    if (opts.tag) {
      collections = collections.filter((c) => (c.tags || []).includes(opts.tag));
    }

    if (collections.length === 0) {
      const filter = opts.collection ? `collection "${opts.collection}"` : `tag "${opts.tag}"`;
      console.error(`Error: no collections matched ${filter} in manifest`);
      process.exit(1);
    }

    const lockData = readLockfile(projectDir);
    const results = [];
    let skipped = 0;
    const startTime = Date.now();

    for (const col of collections) {
      const sourceW = col.sourceSize.width;
      const sourceH = col.sourceSize.height;

      // Filter templates
      const templates = opts.template
        ? col.templates.filter((t) => t.name === opts.template || t.label === opts.template)
        : col.templates;

      // Determine which sizes to render
      let sizesToRender = [];

      if (opts.width && opts.height) {
        // Custom size from CLI
        sizesToRender = [{
          name: `${opts.width}x${opts.height}`,
          label: `${opts.width}x${opts.height}`,
          width: parseInt(opts.width),
          height: parseInt(opts.height),
        }];
      } else if (opts.size) {
        // Specific named size
        const found = flatSizes(col).find((s) => s.name === opts.size || s.label === opts.size);
        if (found) {
          sizesToRender = [found];
        } else {
          if (!opts.quiet) console.log(`  Warning: size "${opts.size}" not found in collection "${col.id}", skipping`);
          continue;
        }
      } else if (opts.all) {
        // All sizes
        sizesToRender = flatSizes(col);
        // Filter by platform if specified
        if (opts.platform) {
          sizesToRender = (col.exportSizes || [])
            .filter((g) => g.platform && g.platform.toLowerCase().includes(opts.platform.toLowerCase()))
            .flatMap((g) => g.sizes || []);
        }
      } else {
        // Default: render at source size
        sizesToRender = [{
          name: `${sourceW}x${sourceH}`,
          label: `${sourceW}x${sourceH}`,
          width: sourceW,
          height: sourceH,
        }];
      }

      if (sizesToRender.length === 0) {
        if (!opts.quiet) console.log(`  No export sizes found for collection "${col.id}"`);
        continue;
      }

      // Determine if we need subdirectories (multiple sizes = subdirs)
      const useSubDirs = sizesToRender.length > 1 || opts.all;

      for (const size of sizesToRender) {
        const sizeDir = useSubDirs
          ? join(outputDir, col.id, size.name)
          : join(outputDir, col.id);
        mkdirSync(sizeDir, { recursive: true });

        if (!opts.quiet && sizesToRender.length > 1) {
          const platformInfo = (col.exportSizes || [])
            .find((g) => (g.sizes || []).some((s) => s.name === size.name));
          const platform = platformInfo?.platform ? `[${platformInfo.platform}] ` : '';
          console.log(`\n  ${platform}${size.label} (${size.width}x${size.height})`);
        }

        for (const template of templates) {
          const outPath = join(sizeDir, `${template.name}.png`);
          const assetKey = `${col.id}/${template.name}`;
          const variantKey = size.name;
          const srcPath = resolve(projectDir, template.src);
          const checksum = computeChecksum(srcPath);

          // Skip if unchanged
          if (!opts.force && checksum && isUpToDate(lockData, assetKey, variantKey, checksum, outPath)) {
            if (!opts.quiet) console.log(`  Skipping ${template.name} at ${size.width}x${size.height} (unchanged)`);
            skipped++;
            continue;
          }

          if (!opts.quiet) console.log(`  Rendering ${template.name} at ${size.width}x${size.height}...`);

          // Detect SVG source → use copy-source approach for SVG outputs
          const isSvg = template.src.endsWith(".svg");

          if (isSvg && size.width === sourceW && size.height === sourceH) {
            // For SVGs at source size, just copy the source
            copyFileSync(srcPath, outPath.replace(".png", ".svg"));
          }

          const buffer = await renderScreenshot(
            projectDir,
            template.src,
            size.width,
            size.height,
            sourceW,
            sourceH
          );
          writeFileSync(outPath, buffer);
          results.push({
            collection: col.id,
            template: template.name,
            path: outPath,
            width: size.width,
            height: size.height,
            size: buffer.length,
          });
          if (checksum) recordExport(lockData, assetKey, variantKey, checksum, outPath);
          if (!opts.quiet) console.log(`    → ${outPath}`);
        }
      }

      // Handle outputs (xcode, copy-source, etc.)
      if (col.outputs && opts.all) {
        for (const output of col.outputs) {
          if (output.type === "xcode") {
            if (!opts.quiet) console.log(`\n  Exporting to Xcode: ${output.path}`);
            const path = await runXcodeOutput(projectDir, col, output);
            results.push({ collection: col.id, type: "xcode", path });
          } else if (output.type === "copy-source") {
            // Copy source files (e.g., SVG originals)
            const format = output.format || "svg";
            const copyDir = join(outputDir, col.id, format);
            mkdirSync(copyDir, { recursive: true });
            for (const template of templates) {
              if (template.src.endsWith(`.${format}`)) {
                const srcPath = resolve(projectDir, template.src);
                const destPath = join(copyDir, `${template.name}.${format}`);
                if (existsSync(srcPath)) {
                  copyFileSync(srcPath, destPath);
                  results.push({ collection: col.id, template: template.name, type: `copy-${format}`, path: destPath });
                  if (!opts.quiet) console.log(`    → ${destPath}`);
                }
              }
            }
          }
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
  .description("List all collections and templates defined in the manifest")
  .argument("[dir]", "Project directory containing manifest.json", ".")
  .option("--manifest <path>", "Path to manifest file", env("OPEN_ASSETS_MANIFEST", "manifest.json"))
  .option("--tag <tag>", "List only collections with this tag")
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

    // Show available tags if defined
    if (manifest.tags && manifest.tags.length > 0 && !opts.tag) {
      console.log(`\n  Tags: ${manifest.tags.map((t) => t.id).join(", ")}`);
    }

    let cols = manifest.collections;
    if (opts.tag) {
      cols = cols.filter((c) => (c.tags || []).includes(opts.tag));
      if (cols.length === 0) {
        console.error(`\n  No collections found with tag "${opts.tag}"\n`);
        process.exit(1);
      }
    }

    console.log(`\n  ${manifest.name}\n`);
    for (const col of cols) {
      const templateCount = col.templates.length;
      const sizeCount = flatSizes(col).length;
      const tagStr = (col.tags && col.tags.length > 0) ? ` [${col.tags.join(", ")}]` : "";
      console.log(`  ${col.label} (${col.id})${tagStr} — ${templateCount} template(s), ${sizeCount} size(s)`);

      for (const template of col.templates) {
        console.log(`    • ${template.label || template.name} → ${template.src}`);
      }

      for (const group of col.exportSizes || []) {
        for (const size of group.sizes || []) {
          const platform = group.platform ? `${group.platform}: ` : '';
          console.log(`    ↳ ${platform}${size.label} (${size.width}×${size.height})`);
        }
      }

      if (col.outputs) {
        for (const output of col.outputs) {
          if (output.type === "xcode") console.log(`    ↳ Xcode: ${output.path}`);
          else if (output.type === "copy-source") console.log(`    ↳ Copy source: ${output.format}`);
        }
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

    if (Array.isArray(manifest.collections) && manifest.collections.length > 0) {
      ok(`${manifest.collections.length} collection(s) defined`);
    } else {
      fail("Missing or empty 'collections' array");
      process.exit(1);
    }

    // Check each collection
    const ids = new Set();
    for (const col of manifest.collections) {
      if (!col.id) { fail(`Collection missing 'id' field`); continue; }
      if (ids.has(col.id)) { fail(`Duplicate collection id: "${col.id}"`); }
      ids.add(col.id);

      if (!col.sourceSize || !col.sourceSize.width || !col.sourceSize.height) {
        fail(`Collection "${col.id}" missing or invalid 'sourceSize'`);
      } else {
        ok(`Collection "${col.id}" sourceSize: ${col.sourceSize.width}×${col.sourceSize.height}`);
      }

      if (!col.templates || col.templates.length === 0) {
        fail(`Collection "${col.id}" has no templates`);
      } else {
        for (const template of col.templates) {
          if (!template.src) {
            fail(`Collection "${col.id}" has a template without 'src'`);
            continue;
          }
          const filePath = resolve(projectDir, template.src);
          if (existsSync(filePath)) ok(`${template.src} exists`);
          else fail(`${template.src} not found`);
        }
      }

      const sizes = flatSizes(col);
      if (sizes.length > 0) {
        ok(`Collection "${col.id}" has ${sizes.length} export size(s)`);
      }

      // Validate outputs
      if (col.outputs) {
        for (const output of col.outputs) {
          if (!output.type) fail(`Collection "${col.id}" has an output without 'type'`);
          else ok(`Output: ${output.type}`);
        }
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

// ── skills ──────────────────────────────────────────────────────────────────

program
  .command("skills")
  .description("Install Claude Code skills for open-assets into the current project")
  .argument("[dir]", "Target project directory", ".")
  .action(async (dir) => {
    const { cpSync, mkdirSync } = await import("fs");
    const targetDir = resolve(dir);
    const skillsSrc = new URL("../skills", import.meta.url).pathname;
    const skillsDest = join(targetDir, ".claude", "skills");

    mkdirSync(skillsDest, { recursive: true });
    cpSync(skillsSrc, skillsDest, { recursive: true });

    console.log(`\n  Installed open-assets skills to ${join(targetDir, ".claude", "skills", "open-assets")}\n`);
    console.log(`  Claude Code will now use the open-assets skill when you use /open-assets or`);
    console.log(`  ask it to create marketing assets.\n`);
  });

program.parse();
