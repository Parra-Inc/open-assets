import { jest } from "@jest/globals";
import { join } from "path";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { templateHtml } from "./helpers/fixtures.mjs";

const FAKE_PNG = Buffer.from("fake-png-bytes");

// Build mock page and browser objects
function createMockPage() {
  return {
    setViewport: jest.fn(async () => {}),
    goto: jest.fn(async () => {}),
    evaluate: jest.fn(async () => {}),
    screenshot: jest.fn(async () => FAKE_PNG),
    close: jest.fn(async () => {}),
    isClosed: jest.fn(() => false),
    browser: jest.fn(() => null), // wired to the browser in launch()
    createCDPSession: jest.fn(async () => ({ send: jest.fn(async () => {}) })),
  };
}

function createMockBrowser(page) {
  // Pages are created through a per-page browser context, so newPage is
  // reached via createBrowserContext rather than called on the browser.
  const context = { newPage: jest.fn(async () => page) };
  return {
    connected: true,
    newPage: context.newPage,
    createBrowserContext: jest.fn(async () => context),
    close: jest.fn(async () => {}),
  };
}

let mockPage, mockBrowser;

// Mock puppeteer before importing renderer
jest.unstable_mockModule("puppeteer", () => ({
  launch: jest.fn(async () => {
    mockPage = createMockPage();
    mockBrowser = createMockBrowser(mockPage);
    mockPage.browser = jest.fn(() => mockBrowser);
    return mockBrowser;
  }),
}));

const { renderScreenshot, renderVariants, closeBrowser, runXcodeOutput } = await import("../lib/renderer.mjs");

afterEach(async () => {
  await closeBrowser();
});

// Find the evaluate call that applies the zoom for a variant: it is the only
// evaluate invoked with a single string argument.
function zoomCalls(page) {
  return page.evaluate.mock.calls.filter(
    (call) => call.length === 2 && typeof call[1] === "string"
  );
}

describe("renderScreenshot", () => {
  test("sets viewport to target dimensions", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 512,
        height: 512,
        deviceScaleFactor: 1,
      });
    } finally {
      cleanup();
    }
  });

  test("navigates to file:// URL with deterministic load wait", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      const [url, opts] = mockPage.goto.mock.calls[0];
      expect(url).toMatch(/^file:\/\//);
      expect(url).toContain("test.html");
      expect(opts).toEqual({ waitUntil: "load", timeout: 30000 });
    } finally {
      cleanup();
    }
  });

  test("passes custom timeout through to goto", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024, { timeout: 5000 });
      const [, opts] = mockPage.goto.mock.calls[0];
      expect(opts).toEqual({ waitUntil: "load", timeout: 5000 });
    } finally {
      cleanup();
    }
  });

  test("applies CSS zoom when scale != 1", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      // scale = max(512/1024, 512/1024) = 0.5
      const calls = zoomCalls(mockPage);
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toBe("0.5");
    } finally {
      cleanup();
    }
  });

  test("clears CSS zoom when scale == 1", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 1024, 1024, 1024, 1024);
      const calls = zoomCalls(mockPage);
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toBe("");
    } finally {
      cleanup();
    }
  });

  test("returns screenshot buffer", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      const buffer = await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      expect(buffer).toEqual(FAKE_PNG);
    } finally {
      cleanup();
    }
  });

  test("takes screenshot with correct clip and transparent background", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 300, 400, 600, 800);
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        clip: { x: 0, y: 0, width: 300, height: 400 },
        omitBackground: true,
      });
    } finally {
      cleanup();
    }
  });

  test("does not omit background when a background color is set", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 300, 400, 600, 800, { background: "#fff" });
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        clip: { x: 0, y: 0, width: 300, height: 400 },
      });
    } finally {
      cleanup();
    }
  });

  test("reuses the pooled page across renders instead of closing it", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      await renderScreenshot(dir, "test.html", 256, 256, 1024, 1024);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
      expect(mockPage.close).not.toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledTimes(2);
    } finally {
      cleanup();
    }
  });
});

describe("renderVariants", () => {
  test("renders all sizes from a single navigation", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      const buffers = await renderVariants(dir, "test.html", 1024, 1024, [
        { width: 1024, height: 1024, format: "png" },
        { width: 512, height: 512, format: "png" },
        { width: 192, height: 192, format: "png" },
      ]);

      expect(buffers).toHaveLength(3);
      expect(mockPage.goto).toHaveBeenCalledTimes(1);
      expect(mockPage.screenshot).toHaveBeenCalledTimes(3);

      // Each variant gets its own clip
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        clip: { x: 0, y: 0, width: 1024, height: 1024 },
        omitBackground: true,
      });
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        clip: { x: 0, y: 0, width: 512, height: 512 },
        omitBackground: true,
      });

      // Zoom is re-assigned for every variant: cleared at scale 1, then set
      const calls = zoomCalls(mockPage);
      expect(calls.map((c) => c[1])).toEqual(["", "0.5", "0.1875"]);
    } finally {
      cleanup();
    }
  });

  test("renders jpeg variants with quality", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderVariants(dir, "test.html", 1024, 1024, [
        { width: 512, height: 512, format: "jpeg", quality: 80 },
      ]);
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "jpeg",
        clip: { x: 0, y: 0, width: 512, height: 512 },
        quality: 80,
      });
    } finally {
      cleanup();
    }
  });
});

describe("closeBrowser", () => {
  test("closes the browser instance", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      const browser = mockBrowser;
      await closeBrowser();
      expect(browser.close).toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  test("subsequent render creates a new browser", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      const firstBrowser = mockBrowser;
      await closeBrowser();
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      expect(mockBrowser).not.toBe(firstBrowser);
    } finally {
      cleanup();
    }
  });
});

describe("runXcodeOutput", () => {
  test("renders at source size and writes AppIcon.png", async () => {
    const { dir, cleanup } = createTmpProject(null, { "src/icon.html": templateHtml });
    try {
      const collection = {
        id: "icon",
        sourceSize: { width: 1024, height: 1024 },
        templates: [{ src: "src/icon.html", name: "icon" }],
      };
      const outputConfig = { type: "xcode", path: "output/xcassets" };
      const result = await runXcodeOutput(dir, collection, outputConfig);

      const expectedPath = join(dir, "output/xcassets", "AppIcon.png");
      expect(result).toBe(expectedPath);
      expect(existsSync(expectedPath)).toBe(true);
      expect(readFileSync(expectedPath)).toEqual(FAKE_PNG);

      const contentsPath = join(dir, "output/xcassets", "Contents.json");
      expect(existsSync(contentsPath)).toBe(true);
      const contents = JSON.parse(readFileSync(contentsPath, "utf-8"));
      expect(contents.images).toEqual([
        {
          filename: "AppIcon.png",
          idiom: "universal",
          platform: "ios",
          size: "1024x1024",
        },
      ]);
      expect(contents.info).toEqual({ author: "xcode", version: 1 });
    } finally {
      cleanup();
    }
  });

  test("removes stale images from output directory", async () => {
    const { dir, cleanup } = createTmpProject(null, { "src/icon.html": templateHtml });
    try {
      const outputDir = join(dir, "output/xcassets");
      mkdirSync(outputDir, { recursive: true });
      writeFileSync(join(outputDir, "AppIcon-1024.png"), "old");
      writeFileSync(join(outputDir, "OldIcon.png"), "old");

      const collection = {
        id: "icon",
        sourceSize: { width: 1024, height: 1024 },
        templates: [{ src: "src/icon.html", name: "icon" }],
      };
      await runXcodeOutput(dir, collection, { type: "xcode", path: "output/xcassets" });

      expect(existsSync(join(outputDir, "AppIcon.png"))).toBe(true);
      expect(existsSync(join(outputDir, "AppIcon-1024.png"))).toBe(false);
      expect(existsSync(join(outputDir, "OldIcon.png"))).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("throws when collection has no templates", async () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const collection = {
        id: "empty",
        sourceSize: { width: 1024, height: 1024 },
        templates: [],
      };
      await expect(runXcodeOutput(dir, collection, { path: "out" })).rejects.toThrow(
        /has no templates/
      );
    } finally {
      cleanup();
    }
  });
});
