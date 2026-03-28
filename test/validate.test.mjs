import { validateConfig } from "../lib/validate.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { validManifest, templateHtml } from "./helpers/fixtures.mjs";

describe("validateConfig", () => {
  test("valid manifest with existing files produces zero errors", () => {
    const { dir, cleanup } = createTmpProject(validManifest, {
      "src/icon.html": templateHtml,
      "src/icon-alt.html": templateHtml,
      "src/screenshot-hero.html": templateHtml,
      "src/screenshot-features.html": templateHtml,
    });
    try {
      const result = validateConfig(validManifest, dir);
      expect(result.errors).toBe(0);
      expect(result.checks.every((c) => c.ok)).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("missing name field produces an error", () => {
    const manifest = { ...validManifest, name: undefined };
    const { dir, cleanup } = createTmpProject(manifest, {
      "src/icon.html": templateHtml,
      "src/icon-alt.html": templateHtml,
      "src/screenshot-hero.html": templateHtml,
      "src/screenshot-features.html": templateHtml,
    });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.errors).toBeGreaterThanOrEqual(1);
      expect(result.checks.some((c) => !c.ok && c.message.includes("Missing top-level 'name'"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("empty collections array produces an error and stops early", () => {
    const manifest = { name: "Test", collections: [] };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      expect(result.errors).toBeGreaterThanOrEqual(1);
      expect(result.checks.some((c) => !c.ok && c.message.includes("Missing or empty 'collections'"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("missing collections key produces an error", () => {
    const manifest = { name: "Test" };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      expect(result.errors).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup();
    }
  });

  test("duplicate collection IDs produce an error", () => {
    const manifest = {
      name: "Test",
      collections: [
        { id: "dupe", sourceSize: { width: 100, height: 100 }, templates: [{ src: "a.html", name: "a" }] },
        { id: "dupe", sourceSize: { width: 100, height: 100 }, templates: [{ src: "b.html", name: "b" }] },
      ],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "a.html": "a", "b.html": "b" });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes('Duplicate collection id: "dupe"'))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("collection missing id produces an error", () => {
    const manifest = {
      name: "Test",
      collections: [{ sourceSize: { width: 100, height: 100 }, templates: [] }],
    };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes("Collection missing 'id'"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("missing sourceSize produces an error", () => {
    const manifest = {
      name: "Test",
      collections: [{ id: "test", templates: [{ src: "a.html", name: "a" }] }],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "a.html": "test" });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes("missing or invalid 'sourceSize'"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("invalid sourceSize (missing width) produces an error", () => {
    const manifest = {
      name: "Test",
      collections: [{ id: "test", sourceSize: { height: 100 }, templates: [{ src: "a.html", name: "a" }] }],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "a.html": "test" });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes("missing or invalid 'sourceSize'"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("collection with no templates produces an error", () => {
    const manifest = {
      name: "Test",
      collections: [{ id: "test", sourceSize: { width: 100, height: 100 }, templates: [] }],
    };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes("has no templates"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("template without src produces an error", () => {
    const manifest = {
      name: "Test",
      collections: [{ id: "test", sourceSize: { width: 100, height: 100 }, templates: [{ name: "a" }] }],
    };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes("template without 'src'"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("template file not found produces an error", () => {
    const manifest = {
      name: "Test",
      collections: [{ id: "test", sourceSize: { width: 100, height: 100 }, templates: [{ src: "missing.html", name: "a" }] }],
    };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => !c.ok && c.message.includes("missing.html not found"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("template file that exists produces a passing check", () => {
    const manifest = {
      name: "Test",
      collections: [{ id: "test", sourceSize: { width: 100, height: 100 }, templates: [{ src: "exists.html", name: "a" }] }],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "exists.html": templateHtml });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => c.ok && c.message.includes("exists.html exists"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("export entry with type produces a passing output check", () => {
    const manifest = {
      name: "Test",
      collections: [{
        id: "test",
        sourceSize: { width: 100, height: 100 },
        templates: [{ src: "a.html", name: "a" }],
        export: [{ type: "xcode", path: "assets" }],
      }],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "a.html": "test" });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => c.ok && c.message.includes("Output: xcode"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("accumulates multiple errors correctly", () => {
    const manifest = {
      name: undefined,
      collections: [
        { id: "a", templates: [] },
        { id: "a", sourceSize: { width: 100, height: 100 }, templates: [{ name: "no-src" }] },
      ],
    };
    const { dir, cleanup } = createTmpProject(manifest);
    try {
      const result = validateConfig(manifest, dir);
      // missing name + missing sourceSize + no templates + duplicate id + template without src
      expect(result.errors).toBeGreaterThanOrEqual(4);
    } finally {
      cleanup();
    }
  });

  test("export sizes count is reported for collections with sizes", () => {
    const manifest = {
      name: "Test",
      collections: [{
        id: "test",
        sourceSize: { width: 100, height: 100 },
        templates: [{ src: "a.html", name: "a" }],
        export: [{ name: "50", size: { width: 50, height: 50 } }],
      }],
    };
    const { dir, cleanup } = createTmpProject(manifest, { "a.html": "test" });
    try {
      const result = validateConfig(manifest, dir);
      expect(result.checks.some((c) => c.ok && c.message.includes("1 export size(s)"))).toBe(true);
    } finally {
      cleanup();
    }
  });
});
