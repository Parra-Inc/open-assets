#!/usr/bin/env node
import { Command } from "commander";
import { resolve, join } from "path";
import { readFileSync } from "fs";

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
  .description("Dev server and export tool for app marketing assets")
  .version(pkg.version);

// ── dev ──────────────────────────────────────────────────────────────────────

program
  .command("dev")
  .description("Start the dev server with live preview and export UI")
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("-p, --port <port>", "Port to listen on (env: OPEN_ASSETS_PORT)", env("OPEN_ASSETS_PORT", "3200"))
  .option("-H, --host <host>", "Host to bind to (env: OPEN_ASSETS_HOST)", env("OPEN_ASSETS_HOST", "localhost"))
  .option("--no-open", "Don't auto-open the browser (env: OPEN_ASSETS_NO_OPEN)")
  .option("-q, --quiet", "Suppress server logs (env: OPEN_ASSETS_QUIET)", env("OPEN_ASSETS_QUIET") === "true")
  .option("--ci", "CI mode: no browser, quiet logging", env("CI") === "true")
  .option("--config <path>", "Path to config file (env: OPEN_ASSETS_CONFIG)", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .option("--static-dir <dirs...>", "Additional static directories to serve")
  .option("--render-timeout <ms>", "Puppeteer render timeout in ms (env: OPEN_ASSETS_RENDER_TIMEOUT)", env("OPEN_ASSETS_RENDER_TIMEOUT", "30000"))
  .action(async (dir, opts) => {
    const { loadConfig } = await import("../lib/manifest.mjs");
    const projectDir = resolve(dir);

    try {
      loadConfig(projectDir, opts.config);
    } catch {
      console.error(
        `Error: ${opts.config} not found in ${projectDir}\n` +
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
      manifestPath: resolve(projectDir, opts.config),
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
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("--collection <id>", "Render only the collection with this ID")
  .option("--tag <tag>", "Render only collections with this tag")
  .option("--template <name>", "Render only the template with this name")
  .option("--size <name>", "Use a named export size from config")
  .option("--width <px>", "Output width in pixels (custom size)")
  .option("--height <px>", "Output height in pixels (custom size)")
  .option("--all", "Export at every size defined in the config")
  .option("--force", "Re-render all assets even if unchanged")
  .option("-o, --output <dir>", "Output directory (env: OPEN_ASSETS_OUTPUT)", env("OPEN_ASSETS_OUTPUT", "./exports"))
  .option("--config <path>", "Path to config file (env: OPEN_ASSETS_CONFIG)", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .option("--parallel <count>", "Number of parallel renders (env: OPEN_ASSETS_PARALLEL)", env("OPEN_ASSETS_PARALLEL", "1"))
  .option("--render-timeout <ms>", "Puppeteer render timeout in ms", env("OPEN_ASSETS_RENDER_TIMEOUT", "30000"))
  .option("--json", "Output results as JSON (for CI/scripting)")
  .option("-q, --quiet", "Suppress progress logs", env("OPEN_ASSETS_QUIET") === "true")
  .action(async (dir, opts) => {
    const { loadConfig } = await import("../lib/manifest.mjs");
    const { renderAssets } = await import("../lib/render.mjs");
    const renderer = await import("../lib/renderer.mjs");
    const lockfile = await import("../lib/lockfile.mjs");

    const projectDir = resolve(dir);
    let manifest;
    try {
      manifest = loadConfig(projectDir, opts.config);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }

    const log = opts.quiet ? undefined : (msg) => console.log(msg);
    const deps = {
      renderScreenshot: renderer.renderScreenshot,
      runXcodeOutput: renderer.runXcodeOutput,
      closeBrowser: renderer.closeBrowser,
      readLockfile: lockfile.readLockfile,
      writeLockfile: lockfile.writeLockfile,
      computeChecksum: lockfile.computeChecksum,
      isUpToDate: lockfile.isUpToDate,
      recordExport: lockfile.recordExport,
    };

    const result = await renderAssets(projectDir, manifest, opts, deps, log);

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    if (opts.json) {
      console.log(JSON.stringify({
        ok: true,
        assets: result.results,
        skipped: result.skipped,
        elapsed: result.elapsed,
      }, null, 2));
    } else if (!opts.quiet) {
      const parts = [`${result.results.length} asset(s) rendered`];
      if (result.skipped > 0) parts.push(`${result.skipped} skipped (unchanged)`);
      console.log(`\nDone. ${parts.join(", ")} in ${result.elapsed}.`);
    }
  });

// ── list ─────────────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List all collections and templates defined in the config")
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("--config <path>", "Path to config file", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .option("--tag <tag>", "List only collections with this tag")
  .option("--json", "Output as JSON")
  .action(async (dir, opts) => {
    const { loadConfig } = await import("../lib/manifest.mjs");
    const { listCollections, formatCollectionList } = await import("../lib/list.mjs");

    const projectDir = resolve(dir);
    let manifest;
    try {
      manifest = loadConfig(projectDir, opts.config);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }

    if (opts.json) {
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    const result = listCollections(manifest, { tag: opts.tag });
    if (result.error) {
      console.error(`\n  ${result.error}\n`);
      process.exit(1);
    }

    console.log(`\n  ${formatCollectionList(manifest, result.collections).split("\n").join("\n  ")}\n`);
  });

// ── validate ─────────────────────────────────────────────────────────────────

program
  .command("validate")
  .description("Validate the assets.json and check that all referenced files exist")
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("--config <path>", "Path to config file", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .option("--fix", "Interactively fix issues (e.g. remove missing templates)")
  .action(async (dir, opts) => {
    const { loadConfig, saveConfig } = await import("../lib/manifest.mjs");
    const { validateConfig } = await import("../lib/validate.mjs");

    const projectDir = resolve(dir);
    let manifest;
    try {
      manifest = loadConfig(projectDir, opts.config);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }

    console.log(`\n  Validating ${opts.config}...\n`);

    const { checks, errors, missingTemplates, emptyCollections } = validateConfig(manifest, projectDir);

    for (const check of checks) {
      console.log(`  ${check.ok ? "\u2713" : "\u2717"} ${check.message}`);
    }

    console.log();
    if (errors === 0) {
      console.log("  All checks passed.\n");
    } else {
      console.log(`  ${errors} error(s) found.\n`);

      const fixable = missingTemplates.length > 0 || emptyCollections.length > 0;

      if (fixable && opts.fix) {
        const { createInterface } = await import("readline");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const ask = (question) =>
          new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim().toLowerCase())));

        let changes = 0;

        for (const missing of missingTemplates) {
          const answer = await ask(
            `  Remove template "${missing.templateSrc}" from collection "${missing.collectionId}"? (y/N) `
          );
          if (answer === "y" || answer === "yes") {
            const col = manifest.collections.find((c) => c.id === missing.collectionId);
            if (col) {
              col.templates = col.templates.filter((t) => t.src !== missing.templateSrc);
              changes++;
            }
          }
        }

        // Include collections that were already empty plus ones emptied by template removal
        const emptyIds = new Set(emptyCollections.map((e) => e.collectionId));
        for (const col of manifest.collections) {
          if (!col.templates || col.templates.length === 0) {
            emptyIds.add(col.id);
          }
        }

        for (const collectionId of emptyIds) {
          const answer = await ask(
            `  Remove empty collection "${collectionId}"? (y/N) `
          );
          if (answer === "y" || answer === "yes") {
            manifest.collections = manifest.collections.filter((c) => c.id !== collectionId);
            changes++;
          }
        }

        rl.close();

        if (changes > 0) {
          saveConfig(projectDir, opts.config, manifest);
          console.log(`\n  Updated ${opts.config} (${changes} fix(es) applied).\n`);
        }
      } else if (fixable) {
        console.log(`  Run with --fix to remove missing templates and empty collections.\n`);
      }

      process.exit(1);
    }
  });

// ── init ─────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Scaffold a new assets.json and example assets")
  .argument("[dir]", "Target directory", ".")
  .action(async (dir) => {
    const { scaffoldProject } = await import("../lib/init.mjs");
    await scaffoldProject(resolve(dir));
  });

// ── add ─────────────────────────────────────────────────────────────────────

const add = program
  .command("add")
  .description("Add collections, templates, or export sizes to the config");

add
  .command("collection")
  .description("Add a new asset collection (choose from presets or custom)")
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("--config <path>", "Path to config file", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .action(async (dir, opts) => {
    const { addCollection } = await import("../lib/add.mjs");
    await addCollection(resolve(dir), opts.config);
  });

add
  .command("template")
  .description("Add a new template to an existing collection (HTML or SVG)")
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("--config <path>", "Path to config file", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .action(async (dir, opts) => {
    const { addTemplate } = await import("../lib/add.mjs");
    await addTemplate(resolve(dir), opts.config);
  });

add
  .command("size")
  .description("Add an export size to a collection (choose from presets or custom)")
  .argument("[dir]", "Project directory containing assets.json", ".")
  .option("--config <path>", "Path to config file", env("OPEN_ASSETS_CONFIG", "assets.json"))
  .action(async (dir, opts) => {
    const { addSize } = await import("../lib/add.mjs");
    await addSize(resolve(dir), opts.config);
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
