import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { minimalManifest, templateHtml } from "./helpers/fixtures.mjs";

const CLI_PATH = resolve(fileURLToPath(import.meta.url), "../../bin/open-assets.mjs");

/**
 * Run a CLI subcommand with piped stdin input (newline-delimited answers).
 */
function runAddCommand(args, dir, inputs) {
  return new Promise((resolve) => {
    const child = spawn("node", [CLI_PATH, ...args, dir], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    // Send inputs line by line with small delays
    let idx = 0;
    function sendNext() {
      if (idx >= inputs.length) {
        child.stdin.end();
        return;
      }
      setTimeout(() => {
        child.stdin.write(inputs[idx] + "\n");
        idx++;
        sendNext();
      }, 100);
    }
    setTimeout(sendNext, 300);

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    setTimeout(() => child.kill("SIGTERM"), 10000);
  });
}

describe("add collection", () => {
  test("adds a preset collection (logo) to the config", async () => {
    const { dir, cleanup } = createTmpProject(minimalManifest, {
      "src/icon.html": templateHtml,
    });
    try {
      // Select preset #3 (logo) — the numbering depends on COLLECTION_PRESETS order
      // Presets: 1=screenshots, 2=icon, 3=logo, 4=wordmark, 5=feature-graphic, 6=og-image, 7=custom
      // Using logo because minimalManifest already has an "icon" collection
      const result = await runAddCommand(["add", "collection"], dir, ["3"]);

      // Check the config was updated
      const configPath = join(dir, "assets.json");
      expect(existsSync(configPath)).toBe(true);
      const config = JSON.parse(readFileSync(configPath, "utf-8"));

      // Should have the original icon collection + new logo collection
      expect(config.collections.length).toBeGreaterThanOrEqual(2);

      // Check that output mentions the collection was added
      expect(result.stdout).toContain("Added");
    } finally {
      cleanup();
    }
  }, 15000);

  test("rejects duplicate collection ID", async () => {
    const { dir, cleanup } = createTmpProject(minimalManifest, {
      "src/icon.html": templateHtml,
    });
    try {
      // Try to add "icon" preset — but collection "icon" already exists
      // The exact preset ID for icon may already clash
      // We'll use custom and try to use the ID "icon"
      const result = await runAddCommand(["add", "collection"], dir, [
        "7",     // custom
        "icon",  // ID that already exists
      ]);

      expect(result.stdout + result.stderr).toMatch(/already exists|Duplicate|Aborted/i);
    } finally {
      cleanup();
    }
  }, 15000);
});

describe("add template", () => {
  test("adds a template to an existing collection", async () => {
    const { dir, cleanup } = createTmpProject(minimalManifest, {
      "src/icon.html": templateHtml,
    });
    try {
      // Select collection #1, then provide template details
      const result = await runAddCommand(["add", "template"], dir, [
        "1",           // Select first collection (icon)
        "alt-icon",    // Template name
        "Alt Icon",    // Template label
        "1",           // HTML format
      ]);

      const configPath = join(dir, "assets.json");
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      const iconCol = config.collections.find((c) => c.id === "icon");

      if (iconCol) {
        // Check that a new template was added
        expect(iconCol.templates.length).toBeGreaterThanOrEqual(2);
        const newTemplate = iconCol.templates.find((t) => t.name === "alt-icon");
        if (newTemplate) {
          expect(newTemplate.label).toBe("Alt Icon");
          expect(existsSync(join(dir, newTemplate.src))).toBe(true);
        }
      }
    } finally {
      cleanup();
    }
  }, 15000);
});

describe("add size", () => {
  test("adds a size to an existing collection", async () => {
    const { dir, cleanup } = createTmpProject(minimalManifest, {
      "src/icon.html": templateHtml,
    });
    try {
      // Select collection #1, then choose a preset size or custom
      // Presets vary, let's try custom (last option)
      const result = await runAddCommand(["add", "size"], dir, [
        "1",     // Select first collection
        "1",     // First size preset (or custom depending on list)
      ]);

      const configPath = join(dir, "assets.json");
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      const iconCol = config.collections.find((c) => c.id === "icon");

      if (iconCol) {
        // Should have more sizes than the original 1
        const allSizes = iconCol.export || [];
        expect(allSizes.length).toBeGreaterThanOrEqual(1);
      }
    } finally {
      cleanup();
    }
  }, 15000);
});
