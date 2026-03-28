import { runCli } from "./helpers/run-cli.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { validManifest, templateHtml } from "./helpers/fixtures.mjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve } from "path";

const pkg = JSON.parse(
  readFileSync(resolve(fileURLToPath(import.meta.url), "../../package.json"), "utf-8")
);

describe("CLI", () => {
  test("--version prints version from package.json", async () => {
    const result = await runCli(["--version"]);
    expect(result.stdout.trim()).toBe(pkg.version);
    expect(result.exitCode).toBe(0);
  });

  test("--help lists all commands", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("dev");
    expect(result.stdout).toContain("render");
    expect(result.stdout).toContain("list");
    expect(result.stdout).toContain("validate");
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("add");
    expect(result.stdout).toContain("skills");
    expect(result.exitCode).toBe(0);
  });

  test("render --help lists render options", async () => {
    const result = await runCli(["render", "--help"]);
    expect(result.stdout).toContain("--collection");
    expect(result.stdout).toContain("--tag");
    expect(result.stdout).toContain("--template");
    expect(result.stdout).toContain("--size");
    expect(result.stdout).toContain("--force");
    expect(result.stdout).toContain("--json");
    expect(result.exitCode).toBe(0);
  });

  test("validate with missing config exits 1", async () => {
    const { dir, cleanup } = createTmpProject(null); // no assets.json
    try {
      const result = await runCli(["validate", dir]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    } finally {
      cleanup();
    }
  });

  test("validate with valid config exits 0", async () => {
    const { dir, cleanup } = createTmpProject(validManifest, {
      "src/icon.html": templateHtml,
      "src/icon-alt.html": templateHtml,
      "src/screenshot-hero.html": templateHtml,
      "src/screenshot-features.html": templateHtml,
    });
    try {
      const result = await runCli(["validate", dir]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
    } finally {
      cleanup();
    }
  });

  test("list with valid config exits 0 and shows collections", async () => {
    const { dir, cleanup } = createTmpProject(validManifest, {
      "src/icon.html": templateHtml,
    });
    try {
      const result = await runCli(["list", dir]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("App Icon");
      expect(result.stdout).toContain("App Screenshots");
    } finally {
      cleanup();
    }
  });

  test("list --json outputs valid JSON", async () => {
    const { dir, cleanup } = createTmpProject(validManifest);
    try {
      const result = await runCli(["list", "--json", dir]);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.name).toBe("My App Assets");
    } finally {
      cleanup();
    }
  });

  test("list --tag filters collections", async () => {
    const { dir, cleanup } = createTmpProject(validManifest);
    try {
      const result = await runCli(["list", "--tag", "icon", dir]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("App Icon");
      expect(result.stdout).not.toContain("App Screenshots");
    } finally {
      cleanup();
    }
  });

  test("list --tag nonexistent exits 1", async () => {
    const { dir, cleanup } = createTmpProject(validManifest);
    try {
      const result = await runCli(["list", "--tag", "nonexistent", dir]);
      expect(result.exitCode).toBe(1);
    } finally {
      cleanup();
    }
  });

  test("validate with invalid JSON exits 1", async () => {
    const { dir, cleanup } = createTmpProject(null, {
      "assets.json": "{ broken",
    });
    try {
      const result = await runCli(["validate", dir]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid JSON");
    } finally {
      cleanup();
    }
  });

  test("validate with custom --config flag", async () => {
    const { dir, cleanup } = createTmpProject(null, {
      "custom.json": JSON.stringify({
        name: "Custom",
        collections: [{
          id: "test",
          sourceSize: { width: 100, height: 100 },
          templates: [{ src: "t.html", name: "t" }],
        }],
      }),
      "t.html": templateHtml,
    });
    try {
      const result = await runCli(["validate", "--config", "custom.json", dir]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
    } finally {
      cleanup();
    }
  });

  test("validate reports missing template file", async () => {
    const manifest = {
      name: "Test",
      collections: [{
        id: "test",
        sourceSize: { width: 100, height: 100 },
        templates: [{ src: "missing.html", name: "t" }],
      }],
    };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = await runCli(["validate", dir]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain("missing.html not found");
    } finally {
      cleanup();
    }
  });

  test("validate reports duplicate collection IDs", async () => {
    const manifest = {
      name: "Test",
      collections: [
        { id: "dupe", sourceSize: { width: 100, height: 100 }, templates: [{ src: "a.html", name: "a" }] },
        { id: "dupe", sourceSize: { width: 100, height: 100 }, templates: [{ src: "b.html", name: "b" }] },
      ],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "a.html": "a", "b.html": "b" });
    try {
      const result = await runCli(["validate", dir]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain("Duplicate collection id");
    } finally {
      cleanup();
    }
  });

  test("skills command installs skills directory", async () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const result = await runCli(["skills", dir]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Installed open-assets skills");
    } finally {
      cleanup();
    }
  });
});
