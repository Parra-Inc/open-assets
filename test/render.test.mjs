import { jest } from "@jest/globals";
import { renderAssets } from "../lib/render.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { validManifest, multiPlatformManifest, templateHtml, templateSvg } from "./helpers/fixtures.mjs";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const FAKE_PNG = Buffer.from("fake-png-data");

function createMockDeps(overrides = {}) {
  return {
    renderScreenshot: jest.fn(async () => FAKE_PNG),
    runXcodeOutput: jest.fn(async (projDir, col, output) => join(projDir, output.path, "AppIcon.png")),
    closeBrowser: jest.fn(async () => {}),
    readLockfile: jest.fn(() => ({ version: 1, assets: {} })),
    writeLockfile: jest.fn(),
    computeChecksum: jest.fn(() => "sha256:abc123"),
    isUpToDate: jest.fn(() => false),
    recordExport: jest.fn(),
    ...overrides,
  };
}

describe("renderAssets", () => {
  let tmpDir, cleanup;

  beforeEach(() => {
    const tmp = createTmpProject(validManifest, {
      "src/icon.html": templateHtml,
      "src/icon-alt.html": templateHtml,
      "src/screenshot-hero.html": templateHtml,
      "src/screenshot-features.html": templateHtml,
    });
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;
  });

  afterEach(() => cleanup());

  test("renders all templates at source size by default", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir }, deps);

    // 2 icon templates + 2 screenshot templates = 4 renders
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(4);
    expect(result.results).toHaveLength(4);
    expect(result.skipped).toBe(0);

    // Icon templates rendered at source size 1024x1024
    expect(deps.renderScreenshot).toHaveBeenCalledWith(
      tmpDir, "src/icon.html", 1024, 1024, 1024, 1024, { format: "png" }
    );
    // Screenshot templates rendered at source size 440x956
    expect(deps.renderScreenshot).toHaveBeenCalledWith(
      tmpDir, "src/screenshot-hero.html", 440, 956, 440, 956, { format: "png" }
    );
  });

  test("--collection filter renders only matching collection", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, collection: "icon" }, deps);

    // Only icon templates: 2
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2);
    expect(result.results.every((r) => r.collection === "icon")).toBe(true);
  });

  test("--tag filter renders only matching collections", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, tag: "marketing" }, deps);

    expect(result.results.every((r) => r.collection === "screenshots")).toBe(true);
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2);
  });

  test("--template filter renders only matching template", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, template: "icon" }, deps);

    // "icon" template exists in icon collection only, screenshot templates don't match
    expect(result.results.filter((r) => r.template === "icon")).toHaveLength(1);
    expect(result.results.every((r) => r.template === "icon" || r.template === undefined)).toBe(true);
  });

  test("--size renders at named size", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, collection: "icon", size: "512" }, deps);

    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2); // 2 templates at size 512
    for (const call of deps.renderScreenshot.mock.calls) {
      expect(call[2]).toBe(512); // width
      expect(call[3]).toBe(512); // height
    }
  });

  test("--width/--height renders at custom size", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon", width: 256, height: 256,
    }, deps);

    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2);
    for (const call of deps.renderScreenshot.mock.calls) {
      expect(call[2]).toBe(256);
      expect(call[3]).toBe(256);
    }
  });

  test("--force renders at every export size and ignores cache", async () => {
    // Without force: renders at source size only, respects cache
    const deps = createMockDeps({
      isUpToDate: jest.fn(() => true),
    });
    const outputDir = join(tmpDir, "exports");
    const resultNoForce = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);
    expect(resultNoForce.skipped).toBe(2);
    expect(resultNoForce.results).toHaveLength(0);

    // With force: renders all sizes and ignores cache
    const deps2 = createMockDeps({
      isUpToDate: jest.fn(() => true),
    });
    const outputDir2 = join(tmpDir, "exports2");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir2, collection: "icon", force: true,
    }, deps2);

    // 4 sizes x 2 templates = 8 renders + 1 xcode output = 9 results
    expect(deps2.renderScreenshot).toHaveBeenCalledTimes(8);
    expect(result.skipped).toBe(0);
    expect(result.results).toHaveLength(9);
  });

  test("skips unchanged assets via lockfile", async () => {
    const deps = createMockDeps({
      isUpToDate: jest.fn((lockData, assetKey) => assetKey === "icon/icon"), // only icon/icon is up to date
    });
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    expect(result.skipped).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].template).toBe("icon-alt");
  });

  test("returns error when collection filter matches nothing", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "nonexistent",
    }, deps);

    expect(result.error).toMatch(/No collections matched/);
    expect(result.results).toHaveLength(0);
  });

  test("returns error when tag filter matches nothing", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, tag: "nonexistent",
    }, deps);

    expect(result.error).toMatch(/No collections matched/);
  });

  test("writes PNG files to output directory", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    const outFile = join(outputDir, "icon", "icon.png");
    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile)).toEqual(FAKE_PNG);
  });

  test("uses flat directory when single size, subdirs when multiple", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");

    // Single size (default) → flat
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);
    expect(existsSync(join(outputDir, "icon", "icon.png"))).toBe(true);

    // Multiple sizes (--force) → subdirs (multi-template collection)
    const deps2 = createMockDeps();
    const outputDir2 = join(tmpDir, "exports2");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir2, collection: "icon", force: true,
    }, deps2);
    expect(existsSync(join(outputDir2, "icon", "1024", "icon.png"))).toBe(true);
    expect(existsSync(join(outputDir2, "icon", "512", "icon.png"))).toBe(true);
  });

  test("re-renders when export config changes even if source unchanged", async () => {
    // Simulate lockfile with old export checksum — source matches but export config changed
    const deps = createMockDeps({
      isUpToDate: jest.fn((lockData, assetKey, variantKey, checksum, outPath, exportChecksum) => {
        // Source matches but export checksum differs
        return false;
      }),
    });
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    // Should render, not skip
    expect(result.skipped).toBe(0);
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2);
    // recordExport should be called with 6 args (including exportChecksum)
    expect(deps.recordExport).toHaveBeenCalledTimes(2);
    for (const call of deps.recordExport.mock.calls) {
      expect(call).toHaveLength(6);
      expect(call[5]).toMatch(/^sha256:/); // exportChecksum
    }
  });

  test("passes exportChecksum to isUpToDate", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    for (const call of deps.isUpToDate.mock.calls) {
      expect(call).toHaveLength(6);
      expect(call[5]).toMatch(/^sha256:/); // exportChecksum
    }
  });

  test("records exports in lockfile", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    expect(deps.recordExport).toHaveBeenCalledTimes(2);
    expect(deps.writeLockfile).toHaveBeenCalledTimes(1);
  });

  test("closes browser when done", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, { output: outputDir }, deps);
    expect(deps.closeBrowser).toHaveBeenCalledTimes(1);
  });

  test("returns elapsed time", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir }, deps);
    expect(result.elapsed).toMatch(/^\d+\.\ds$/);
  });

  test("--force triggers xcode output when collection has outputs", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon", force: true,
    }, deps);

    expect(deps.runXcodeOutput).toHaveBeenCalledTimes(1);
    expect(deps.runXcodeOutput.mock.calls[0][2]).toEqual({
      type: "xcode",
      path: "App/Assets.xcassets/AppIcon.appiconset",
    });
  });

  test("xcode output is not triggered without --force", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    expect(deps.runXcodeOutput).not.toHaveBeenCalled();
  });

  test("--force triggers copy-source output", async () => {
    const tmp = createTmpProject(multiPlatformManifest, {
      "src/icon.html": templateHtml,
      "src/logo.svg": templateSvg,
    });
    try {
      const deps = createMockDeps();
      const outputDir = join(tmp.dir, "exports");
      await renderAssets(tmp.dir, multiPlatformManifest, {
        output: outputDir, collection: "logo", force: true,
      }, deps);

      // Should have copy-source result
      const copySvg = deps.renderScreenshot.mock.calls.length; // render calls
      expect(copySvg).toBeGreaterThan(0);

      // The copy-source output should copy the SVG (flat in collection dir)
      const svgCopyPath = join(outputDir, "logo", "logo.svg");
      expect(existsSync(svgCopyPath)).toBe(true);
    } finally {
      tmp.cleanup();
    }
  });

  test("SVG source is copied alongside PNG at source size", async () => {
    const tmp = createTmpProject(multiPlatformManifest, {
      "src/icon.html": templateHtml,
      "src/logo.svg": templateSvg,
    });
    try {
      const deps = createMockDeps();
      const outputDir = join(tmp.dir, "exports");
      // Render logo at source size (default, no --all)
      await renderAssets(tmp.dir, multiPlatformManifest, {
        output: outputDir, collection: "logo",
      }, deps);

      // Should copy SVG alongside the PNG at source size
      const svgPath = join(outputDir, "logo", "logo.svg");
      expect(existsSync(svgPath)).toBe(true);
    } finally {
      tmp.cleanup();
    }
  });

  test("does not record export when checksum is null", async () => {
    const deps = createMockDeps({
      computeChecksum: jest.fn(() => null),
    });
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    expect(deps.recordExport).not.toHaveBeenCalled();
    // But still renders
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2);
  });

  test("size not found in collection skips it with warning", async () => {
    const logs = [];
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon", size: "nonexistent",
    }, deps, (msg) => logs.push(msg));

    expect(deps.renderScreenshot).not.toHaveBeenCalled();
    expect(logs.some((l) => l.includes("Warning"))).toBe(true);
  });
});
