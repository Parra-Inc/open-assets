import { jest } from "@jest/globals";
import { renderAssets } from "../lib/render.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { templateHtml } from "./helpers/fixtures.mjs";
import { existsSync } from "fs";
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

const localizations = {
  sourceLanguage: "en",
  strings: {
    app_name: {
      localizations: {
        en: { value: "Tax Days" },
        ar: { value: "أيام الضرائب" },
        ja: { value: "タックスデイズ" },
      },
    },
    hero_title: {
      localizations: {
        en: { value: "Track your tax days" },
        ar: { value: "تتبع أيام الضرائب" },
      },
    },
  },
};

const localizedManifest = {
  version: 1,
  name: "Test Localized",
  collections: [
    {
      id: "screenshots",
      label: "Screenshots",
      sourceSize: { width: 440, height: 956 },
      localizations: "localizations.json",
      templates: [
        { src: "src/hero.html", name: "hero", label: "Hero" },
      ],
      export: [
        { name: "iphone-6.9", label: "iPhone 6.9\"", size: { width: 1320, height: 2868 } },
      ],
    },
  ],
};

const localizedManifestFiltered = {
  ...localizedManifest,
  collections: [
    {
      ...localizedManifest.collections[0],
      locales: ["en", "ar"],
    },
  ],
};

const localizedManifestMultiTemplate = {
  version: 1,
  name: "Test Multi Template",
  collections: [
    {
      id: "screenshots",
      label: "Screenshots",
      sourceSize: { width: 440, height: 956 },
      localizations: "localizations.json",
      templates: [
        { src: "src/hero.html", name: "hero", label: "Hero" },
        { src: "src/features.html", name: "features", label: "Features" },
      ],
      export: [
        { name: "iphone-6.9", label: "iPhone 6.9\"", size: { width: 1320, height: 2868 } },
        { name: "iphone-6.7", label: "iPhone 6.7\"", size: { width: 1290, height: 2796 } },
      ],
    },
  ],
};

describe("renderAssets with localizations", () => {
  let tmpDir, cleanup;

  afterEach(() => cleanup?.());

  function setupProject(manifest) {
    const tmp = createTmpProject(manifest, {
      "src/hero.html": templateHtml,
      "src/features.html": templateHtml,
      "localizations.json": JSON.stringify(localizations),
    });
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;
    return tmp;
  }

  test("renders for each locale when localizations are configured", async () => {
    setupProject(localizedManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, localizedManifest, { output: outputDir, force: true }, deps);

    // 3 locales (en, ar, ja) × 1 template × 1 size = 3 renders
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(3);
    expect(result.results).toHaveLength(3);

    // Check locale is included in results
    const localesRendered = result.results.map((r) => r.locale).sort();
    expect(localesRendered).toEqual(["ar", "en", "ja"]);
  });

  test("passes localization options to renderScreenshot", async () => {
    setupProject(localizedManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, localizedManifest, { output: outputDir, force: true }, deps);

    // Check that renderScreenshot was called with localization option
    for (const call of deps.renderScreenshot.mock.calls) {
      const options = call[6]; // 7th arg is options
      expect(options.localization).toBeDefined();
      expect(options.localization.locale).toBeDefined();
      expect(options.localization.direction).toBeDefined();
      expect(options.localization.strings).toBeDefined();
    }

    // Verify Arabic gets RTL direction
    const arCall = deps.renderScreenshot.mock.calls.find(
      (call) => call[6].localization.locale === "ar"
    );
    expect(arCall[6].localization.direction).toBe("rtl");

    // Verify English gets LTR direction
    const enCall = deps.renderScreenshot.mock.calls.find(
      (call) => call[6].localization.locale === "en"
    );
    expect(enCall[6].localization.direction).toBe("ltr");
  });

  test("--locale flag filters to a single locale", async () => {
    setupProject(localizedManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, localizedManifest, { output: outputDir, force: true, locale: "ar" }, deps);

    expect(deps.renderScreenshot).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].locale).toBe("ar");
  });

  test("skips collection when --locale doesn't match any locale", async () => {
    setupProject(localizedManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, localizedManifest, { output: outputDir, force: true, locale: "xx" }, deps);

    expect(deps.renderScreenshot).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(0);
  });

  test("respects locales filter in collection config", async () => {
    setupProject(localizedManifestFiltered);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, localizedManifestFiltered, { output: outputDir, force: true }, deps);

    // Only en and ar (not ja)
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(2);
    const localesRendered = result.results.map((r) => r.locale).sort();
    expect(localesRendered).toEqual(["ar", "en"]);
  });

  test("output paths include locale directory", async () => {
    setupProject(localizedManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, localizedManifest, { output: outputDir, force: true }, deps);

    for (const r of result.results) {
      // Path should contain the locale
      expect(r.path).toContain(`/${r.locale}/`);
    }
  });

  test("locale-specific asset keys isolate lockfile entries", async () => {
    setupProject(localizedManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    await renderAssets(tmpDir, localizedManifest, { output: outputDir, force: true }, deps);

    // Each locale should have its own asset key
    const assetKeys = deps.recordExport.mock.calls.map((call) => call[1]);
    expect(assetKeys).toContain("screenshots/en/hero");
    expect(assetKeys).toContain("screenshots/ar/hero");
    expect(assetKeys).toContain("screenshots/ja/hero");
  });

  test("renders multi-template multi-size with locales", async () => {
    setupProject(localizedManifestMultiTemplate);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, localizedManifestMultiTemplate, { output: outputDir, force: true }, deps);

    // 3 locales × 2 templates × 2 sizes = 12 renders
    expect(deps.renderScreenshot).toHaveBeenCalledTimes(12);
    expect(result.results).toHaveLength(12);
  });

  test("collections without localizations render normally", async () => {
    const noL10nManifest = {
      version: 1,
      name: "Test No L10n",
      collections: [
        {
          id: "icon",
          label: "Icon",
          sourceSize: { width: 1024, height: 1024 },
          templates: [
            { src: "src/hero.html", name: "icon", label: "Icon" },
          ],
          export: [
            { name: "512", label: "512px", size: { width: 512, height: 512 } },
          ],
        },
      ],
    };
    const tmp = createTmpProject(noL10nManifest, {
      "src/hero.html": templateHtml,
    });
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;

    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, noL10nManifest, { output: outputDir }, deps);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].locale).toBeUndefined();

    // renderScreenshot should NOT receive localization option
    const options = deps.renderScreenshot.mock.calls[0][6];
    expect(options.localization).toBeUndefined();
  });

  test("outFile supports {locale} template variable", async () => {
    const outFileManifest = {
      version: 1,
      name: "Test OutFile Locale",
      collections: [
        {
          id: "screenshots",
          label: "Screenshots",
          sourceSize: { width: 440, height: 956 },
          localizations: "localizations.json",
          locales: ["en", "ar"],
          templates: [
            { src: "src/hero.html", name: "hero", label: "Hero" },
          ],
          export: [
            {
              name: "iphone-6.9",
              label: "iPhone 6.9\"",
              size: { width: 1320, height: 2868 },
              outFile: "output/{locale}/{template}.png",
            },
          ],
        },
      ],
    };
    setupProject(outFileManifest);
    const deps = createMockDeps();
    const outputDir = join(tmpDir, "exports");
    const result = await renderAssets(tmpDir, outFileManifest, { output: outputDir, force: true }, deps);

    expect(result.results).toHaveLength(2);
    const enResult = result.results.find((r) => r.locale === "en");
    const arResult = result.results.find((r) => r.locale === "ar");
    expect(enResult.path).toContain(join("output", "en", "hero.png"));
    expect(arResult.path).toContain(join("output", "ar", "hero.png"));
  });
});
