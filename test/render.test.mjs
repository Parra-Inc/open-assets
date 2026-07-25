import { jest } from "@jest/globals";
import { renderAssets, resolveConcurrency } from "../lib/render.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { validManifest, multiPlatformManifest, templateHtml, templateSvg } from "./helpers/fixtures.mjs";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const FAKE_PNG = Buffer.from("fake-png-data");

// Sum of all size variants across every renderVariants call
function totalVariants(deps) {
  return deps.renderVariants.mock.calls.reduce((n, call) => n + call[4].length, 0);
}

function createMockDeps(overrides = {}) {
  return {
    renderVariants: jest.fn(async (projDir, src, sw, sh, variants) => variants.map(() => FAKE_PNG)),
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

describe("resolveConcurrency", () => {
  const units = (n) => Array.from({ length: n }, () => ({}));

  afterEach(() => {
    delete process.env.OPEN_ASSETS_CONCURRENCY;
  });

  it("never starts more workers than there are units", () => {
    expect(resolveConcurrency(units(1), { cores: 16 })).toBe(1);
  });

  it("returns 1 when there is no work", () => {
    expect(resolveConcurrency([], { cores: 16 })).toBe(1);
  });

  it("caps concurrency on a machine with cores to spare", () => {
    expect(resolveConcurrency(units(50), { cores: 64 })).toBe(2);
  });

  it("leaves a core for this process and the browser process", () => {
    expect(resolveConcurrency(units(50), { cores: 2 })).toBe(1);
  });

  it("stays at 1 on a single-core machine", () => {
    expect(resolveConcurrency(units(50), { cores: 1 })).toBe(1);
  });

  it("honours an explicit override above the cap", () => {
    expect(resolveConcurrency(units(50), { cores: 4, override: 8 })).toBe(8);
  });

  it("clamps an override to the number of units", () => {
    expect(resolveConcurrency(units(3), { cores: 64, override: 8 })).toBe(3);
  });

  it("reads the override from OPEN_ASSETS_CONCURRENCY", () => {
    process.env.OPEN_ASSETS_CONCURRENCY = "6";
    expect(resolveConcurrency(units(50), { cores: 4 })).toBe(6);
  });

  it("ignores a non-numeric or non-positive override", () => {
    expect(resolveConcurrency(units(50), { cores: 64, override: "banana" })).toBe(2);
    expect(resolveConcurrency(units(50), { cores: 64, override: 0 })).toBe(2);
    expect(resolveConcurrency(units(50), { cores: 64, override: -4 })).toBe(2);
  });
});

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

  test("renders every template at every export size by default", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir }, deps);

    // One render unit per (template, locale): icon 2 + screenshots 2
    expect(deps.renderVariants).toHaveBeenCalledTimes(4);
    // icon: 2 templates x 4 sizes + screenshots: 2 templates x 3 sizes = 14 images
    expect(totalVariants(deps)).toBe(14);
    // 14 renders + 1 xcode output
    expect(result.results).toHaveLength(15);
    expect(result.skipped).toBe(0);

    // Icon templates render all 4 export sizes from one navigation
    expect(deps.renderVariants).toHaveBeenCalledWith(
      tmpDir, "src/icon.html", 1024, 1024,
      [
        { width: 1024, height: 1024, format: "png" },
        { width: 180, height: 180, format: "png" },
        { width: 512, height: 512, format: "png" },
        { width: 192, height: 192, format: "png" },
      ],
      {}
    );
    // Screenshot templates render every display size from one navigation
    expect(deps.renderVariants).toHaveBeenCalledWith(
      tmpDir, "src/screenshot-hero.html", 440, 956,
      [
        { width: 1320, height: 2868, format: "png" },
        { width: 1290, height: 2796, format: "png" },
        { width: 1080, height: 1920, format: "png" },
      ],
      {}
    );
  });

  test("--collection filter renders only matching collection", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, collection: "icon" }, deps);

    // Only icon templates: 2 units x 4 sizes
    expect(deps.renderVariants).toHaveBeenCalledTimes(2);
    expect(totalVariants(deps)).toBe(8);
    expect(result.results.every((r) => r.collection === "icon")).toBe(true);
  });

  test("--tag filter renders only matching collections", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, tag: "marketing" }, deps);

    expect(result.results.every((r) => r.collection === "screenshots")).toBe(true);
    // 2 screenshot units x 3 sizes
    expect(deps.renderVariants).toHaveBeenCalledTimes(2);
    expect(totalVariants(deps)).toBe(6);
  });

  test("--template filter renders only matching template", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, template: "icon" }, deps);

    // "icon" template exists in icon collection only (4 sizes), screenshot templates don't match
    expect(result.results.filter((r) => r.template === "icon")).toHaveLength(4);
    expect(result.results.every((r) => r.template === "icon" || r.template === undefined)).toBe(true);
  });

  test("--template filter keeps the multi-template output layout", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "screenshots", template: "hero",
    }, deps);

    // Filtering a 2-template collection down to 1 must not switch to the
    // flat single-template layout: paths stay exports/{col}/{size}/{template}.png
    const renders = result.results.filter((r) => r.template === "hero");
    expect(renders).toHaveLength(3);
    for (const r of renders) {
      expect(r.path).toBe(join(outputDir, "screenshots", `${r.width}x${r.height}`, "hero.png"));
      expect(existsSync(r.path)).toBe(true);
    }
  });

  test("--size renders at named size", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, { output: outputDir, collection: "icon", size: "512" }, deps);

    expect(deps.renderVariants).toHaveBeenCalledTimes(2); // 2 templates at size 512
    for (const call of deps.renderVariants.mock.calls) {
      expect(call[4]).toEqual([{ width: 512, height: 512, format: "png" }]);
    }
  });

  test("--width/--height renders at custom size", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon", width: 256, height: 256,
    }, deps);

    expect(deps.renderVariants).toHaveBeenCalledTimes(2);
    for (const call of deps.renderVariants.mock.calls) {
      expect(call[4]).toEqual([{ width: 256, height: 256, format: "png" }]);
    }
  });

  test("respects cache by default, --force ignores it", async () => {
    // Without force: unchanged assets are skipped via the lockfile
    const deps = createMockDeps({
      isUpToDate: jest.fn(() => true),
    });
    const outputDir = join(tmpDir, "exports");
    const resultNoForce = await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);
    // 4 sizes x 2 templates all skipped; only the xcode output runs
    expect(resultNoForce.skipped).toBe(8);
    expect(deps.renderVariants).not.toHaveBeenCalled();
    expect(resultNoForce.results.filter((r) => r.type !== "xcode")).toHaveLength(0);

    // With force: re-renders everything, ignoring the cache
    const deps2 = createMockDeps({
      isUpToDate: jest.fn(() => true),
    });
    const outputDir2 = join(tmpDir, "exports2");
    const result = await renderAssets(tmpDir, validManifest, {
      output: outputDir2, collection: "icon", force: true,
    }, deps2);

    // 4 sizes x 2 templates = 8 renders + 1 xcode output = 9 results
    expect(deps2.renderVariants).toHaveBeenCalledTimes(2);
    expect(totalVariants(deps2)).toBe(8);
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

    // icon skipped at all 4 sizes; icon-alt rendered at all 4 sizes + xcode output
    expect(result.skipped).toBe(4);
    expect(result.results).toHaveLength(5);
    expect(result.results.every((r) => r.template === "icon-alt" || r.type === "xcode")).toBe(true);
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

    const outFile = join(outputDir, "icon", "1024", "icon.png");
    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile)).toEqual(FAKE_PNG);
  });

  test("uses subdirs for multi-template collections, flat size names for single-template", async () => {
    // Multi-template collection → subdirs per size
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);
    expect(existsSync(join(outputDir, "icon", "1024", "icon.png"))).toBe(true);
    expect(existsSync(join(outputDir, "icon", "512", "icon-alt.png"))).toBe(true);

    // Single-template collection → flat layout named by size
    const tmp = createTmpProject(multiPlatformManifest, {
      "src/icon.html": templateHtml,
      "src/logo.svg": templateSvg,
    });
    try {
      const deps2 = createMockDeps();
      const outputDir2 = join(tmp.dir, "exports");
      await renderAssets(tmp.dir, multiPlatformManifest, {
        output: outputDir2, collection: "icon",
      }, deps2);
      expect(existsSync(join(outputDir2, "icon", "1024.png"))).toBe(true);
      expect(existsSync(join(outputDir2, "icon", "512.png"))).toBe(true);
      expect(existsSync(join(outputDir2, "icon", "192.png"))).toBe(true);
    } finally {
      tmp.cleanup();
    }
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
    expect(totalVariants(deps)).toBe(8);
    // recordExport should be called with 6 args (including exportChecksum)
    expect(deps.recordExport).toHaveBeenCalledTimes(8);
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
      expect(call).toHaveLength(7);
      expect(call[5]).toMatch(/^sha256:/); // exportChecksum
      expect(call[6]).toBe(tmpDir); // projectDir
    }
  });

  test("records exports in lockfile", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    expect(deps.recordExport).toHaveBeenCalledTimes(8);
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

  test("xcode output runs on default render", async () => {
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon",
    }, deps);

    expect(deps.runXcodeOutput).toHaveBeenCalledTimes(1);
    expect(deps.runXcodeOutput.mock.calls[0][2]).toEqual({
      type: "xcode",
      path: "App/Assets.xcassets/AppIcon.appiconset",
    });
  });

  test("copy-source output runs on default render", async () => {
    const tmp = createTmpProject(multiPlatformManifest, {
      "src/icon.html": templateHtml,
      "src/logo.svg": templateSvg,
    });
    try {
      const deps = createMockDeps();
      const outputDir = join(tmp.dir, "exports");
      await renderAssets(tmp.dir, multiPlatformManifest, {
        output: outputDir, collection: "logo",
      }, deps);

      // Should have copy-source result
      expect(deps.renderVariants.mock.calls.length).toBeGreaterThan(0);

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
      // Default render exports all sizes and runs the copy-source output
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
    expect(totalVariants(deps)).toBe(8);
  });

  test("outFile with {template} renders all templates to individual paths", async () => {
    const outFileManifest = {
      version: 1,
      name: "OutFile Test",
      tags: [],
      collections: [
        {
          id: "tab-icons",
          label: "Tab Icons",
          sourceSize: { width: 128, height: 128 },
          templates: [
            { src: "assets/tab-icons/learn.html", name: "learn", label: "Learn" },
            { src: "assets/tab-icons/plays.html", name: "plays", label: "Plays" },
            { src: "assets/tab-icons/practice.html", name: "practice", label: "Practice" },
          ],
          export: [
            { name: "25", label: "@1x (25px)", size: { width: 25, height: 25 } },
            { name: "50", label: "@2x (50px)", size: { width: 50, height: 50 } },
            { name: "128", label: "128px", size: { width: 128, height: 128 }, outFile: "output/tab-icons/{template}.png" },
          ],
        },
      ],
    };

    const tmp = createTmpProject(outFileManifest, {
      "assets/tab-icons/learn.html": templateHtml,
      "assets/tab-icons/plays.html": templateHtml,
      "assets/tab-icons/practice.html": templateHtml,
    });
    try {
      const deps = createMockDeps();
      const outputDir = join(tmp.dir, "exports");
      await renderAssets(tmp.dir, outFileManifest, {
        output: outputDir, force: true,
      }, deps);

      // All 3 templates x 3 sizes = 9 renders across 3 units
      expect(deps.renderVariants).toHaveBeenCalledTimes(3);
      expect(totalVariants(deps)).toBe(9);

      // The outFile size should render each template to its own path
      const learnPath = join(tmp.dir, "output/tab-icons/learn.png");
      const playsPath = join(tmp.dir, "output/tab-icons/plays.png");
      const practicePath = join(tmp.dir, "output/tab-icons/practice.png");
      expect(existsSync(learnPath)).toBe(true);
      expect(existsSync(playsPath)).toBe(true);
      expect(existsSync(practicePath)).toBe(true);

      // Non-outFile sizes should render to the standard exports dir
      expect(existsSync(join(outputDir, "tab-icons/25/learn.png"))).toBe(true);
      expect(existsSync(join(outputDir, "tab-icons/50/learn.png"))).toBe(true);
    } finally {
      tmp.cleanup();
    }
  });

  test("size not found in collection skips it with warning", async () => {
    const logs = [];
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, validManifest, {
      output: outputDir, collection: "icon", size: "nonexistent",
    }, deps, (msg) => logs.push(msg));

    expect(deps.renderVariants).not.toHaveBeenCalled();
    expect(logs.some((l) => l.includes("Warning"))).toBe(true);
  });
});
