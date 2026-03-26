import {
  flatSizes,
  loadConfig,
  filterCollections,
  filterTemplates,
  resolveRenderSizes,
} from "../lib/manifest.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { validManifest, multiPlatformManifest } from "./helpers/fixtures.mjs";

describe("flatSizes", () => {
  test("returns empty array when collection has no export", () => {
    expect(flatSizes({})).toEqual([]);
    expect(flatSizes({ export: [] })).toEqual([]);
  });

  test("returns sizes from export array", () => {
    const col = {
      export: [{ name: "1024", size: { width: 1024, height: 1024 } }],
    };
    expect(flatSizes(col)).toEqual([{ name: "1024", size: { width: 1024, height: 1024 } }]);
  });

  test("returns all sizes from export array", () => {
    const col = validManifest.collections[0]; // icon collection
    const sizes = flatSizes(col);
    expect(sizes).toHaveLength(4);
    expect(sizes.map((s) => s.name)).toEqual(["1024", "180", "512", "192"]);
  });
});

describe("loadConfig", () => {
  test("loads and parses a valid config", () => {
    const { dir, cleanup } = createTmpProject(validManifest);
    try {
      const manifest = loadConfig(dir);
      expect(manifest.name).toBe("My App Assets");
      expect(manifest.collections).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  test("throws when config file is missing", () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      expect(() => loadConfig(dir)).toThrow("assets.json not found");
    } finally {
      cleanup();
    }
  });

  test("throws on invalid JSON", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "assets.json": "{ broken json",
    });
    try {
      expect(() => loadConfig(dir)).toThrow("Invalid JSON");
    } finally {
      cleanup();
    }
  });

  test("supports custom config filename", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "custom.json": JSON.stringify({ name: "Custom", collections: [] }),
    });
    try {
      const manifest = loadConfig(dir, "custom.json");
      expect(manifest.name).toBe("Custom");
    } finally {
      cleanup();
    }
  });
});

describe("filterCollections", () => {
  const collections = validManifest.collections;

  test("returns all collections when no filters provided", () => {
    const result = filterCollections(collections);
    expect(result.collections).toHaveLength(2);
    expect(result.error).toBeUndefined();
  });

  test("filters by collection ID", () => {
    const result = filterCollections(collections, { collection: "icon" });
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].id).toBe("icon");
  });

  test("filters by tag", () => {
    const result = filterCollections(collections, { tag: "marketing" });
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].id).toBe("screenshots");
  });

  test("returns error when collection ID not found", () => {
    const result = filterCollections(collections, { collection: "nonexistent" });
    expect(result.collections).toHaveLength(0);
    expect(result.error).toMatch(/No collections matched collection "nonexistent"/);
  });

  test("returns error when tag not found", () => {
    const result = filterCollections(collections, { tag: "nonexistent" });
    expect(result.collections).toHaveLength(0);
    expect(result.error).toMatch(/No collections matched tag "nonexistent"/);
  });

  test("can combine collection and tag filters", () => {
    const result = filterCollections(collections, { collection: "icon", tag: "icon" });
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].id).toBe("icon");
  });

  test("returns error when combination matches nothing", () => {
    const result = filterCollections(collections, { collection: "icon", tag: "marketing" });
    expect(result.collections).toHaveLength(0);
    expect(result.error).toBeDefined();
  });
});

describe("filterTemplates", () => {
  const templates = validManifest.collections[0].templates;

  test("returns all templates when no filter provided", () => {
    expect(filterTemplates(templates)).toEqual(templates);
    expect(filterTemplates(templates, undefined)).toEqual(templates);
  });

  test("filters by name", () => {
    const result = filterTemplates(templates, "icon");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("icon");
  });

  test("filters by label", () => {
    const result = filterTemplates(templates, "Alt Icon");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("icon-alt");
  });

  test("returns empty array when no match", () => {
    expect(filterTemplates(templates, "nonexistent")).toEqual([]);
  });
});

describe("resolveRenderSizes", () => {
  const iconCollection = validManifest.collections[0];
  const screenshotCollection = validManifest.collections[1];

  test("defaults to source size when no options given", () => {
    const result = resolveRenderSizes(iconCollection);
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0]).toEqual({
      name: "1024x1024",
      label: "1024x1024",
      size: { width: 1024, height: 1024 },
    });
  });

  test("uses custom width and height", () => {
    const result = resolveRenderSizes(iconCollection, { width: 256, height: 256 });
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0].size.width).toBe(256);
    expect(result.sizes[0].size.height).toBe(256);
    expect(result.sizes[0].name).toBe("256x256");
  });

  test("parses string width/height", () => {
    const result = resolveRenderSizes(iconCollection, { width: "100", height: "200" });
    expect(result.sizes[0].size.width).toBe(100);
    expect(result.sizes[0].size.height).toBe(200);
  });

  test("finds named size by name", () => {
    const result = resolveRenderSizes(iconCollection, { size: "512" });
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0].size.width).toBe(512);
    expect(result.sizes[0].size.height).toBe(512);
  });

  test("finds named size by label", () => {
    const result = resolveRenderSizes(iconCollection, { size: "App Store" });
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0].size.width).toBe(1024);
  });

  test("returns warning when named size not found", () => {
    const result = resolveRenderSizes(iconCollection, { size: "nonexistent" });
    expect(result.sizes).toHaveLength(0);
    expect(result.warning).toMatch(/size "nonexistent" not found/);
  });

  test("--all returns all export sizes", () => {
    const result = resolveRenderSizes(iconCollection, { all: true });
    expect(result.sizes).toHaveLength(4); // 2 iOS + 2 Web
  });

  test("--all with no export sizes returns empty", () => {
    const col = { sourceSize: { width: 100, height: 100 }, export: [] };
    const result = resolveRenderSizes(col, { all: true });
    expect(result.sizes).toHaveLength(0);
  });

  test("custom width/height takes precedence over --all", () => {
    const result = resolveRenderSizes(iconCollection, { width: 50, height: 50, all: true });
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0].size.width).toBe(50);
  });

  test("custom width/height takes precedence over --size", () => {
    const result = resolveRenderSizes(iconCollection, { width: 50, height: 50, size: "512" });
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0].size.width).toBe(50);
  });
});
