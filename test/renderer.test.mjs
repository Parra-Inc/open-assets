import { jest } from "@jest/globals";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
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
  };
}

function createMockBrowser(page) {
  return {
    connected: true,
    newPage: jest.fn(async () => page),
    close: jest.fn(async () => {}),
  };
}

let mockPage, mockBrowser;

// Mock puppeteer before importing renderer
jest.unstable_mockModule("puppeteer", () => ({
  launch: jest.fn(async () => {
    mockPage = createMockPage();
    mockBrowser = createMockBrowser(mockPage);
    return mockBrowser;
  }),
}));

const { renderScreenshot, closeBrowser, runXcodeOutput } = await import("../lib/renderer.mjs");

afterEach(async () => {
  await closeBrowser();
});

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

  test("navigates to file:// URL", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      const url = mockPage.goto.mock.calls[0][0];
      expect(url).toMatch(/^file:\/\//);
      expect(url).toContain("test.html");
    } finally {
      cleanup();
    }
  });

  test("applies CSS zoom when scale != 1", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      // scale = max(512/1024, 512/1024) = 0.5
      expect(mockPage.evaluate).toHaveBeenCalled();
      const zoomArg = mockPage.evaluate.mock.calls[0][1];
      expect(zoomArg).toBe(0.5);
    } finally {
      cleanup();
    }
  });

  test("does not apply CSS zoom when scale == 1", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 1024, 1024, 1024, 1024);
      expect(mockPage.evaluate).not.toHaveBeenCalled();
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

  test("takes screenshot with correct clip", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 300, 400, 600, 800);
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        clip: { x: 0, y: 0, width: 300, height: 400 },
      });
    } finally {
      cleanup();
    }
  });

  test("closes page after screenshot", async () => {
    const { dir, cleanup } = createTmpProject(null, { "test.html": templateHtml });
    try {
      await renderScreenshot(dir, "test.html", 512, 512, 1024, 1024);
      expect(mockPage.close).toHaveBeenCalled();
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
