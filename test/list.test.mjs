import { listCollections, formatCollectionList } from "../lib/list.mjs";
import { validManifest, minimalManifest } from "./helpers/fixtures.mjs";

describe("listCollections", () => {
  test("returns all collections when no tag filter", () => {
    const result = listCollections(validManifest);
    expect(result.collections).toHaveLength(2);
    expect(result.error).toBeUndefined();
  });

  test("filters by tag", () => {
    const result = listCollections(validManifest, { tag: "icon" });
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].id).toBe("icon");
  });

  test("filters by marketing tag", () => {
    const result = listCollections(validManifest, { tag: "marketing" });
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].id).toBe("screenshots");
  });

  test("returns error when tag matches nothing", () => {
    const result = listCollections(validManifest, { tag: "nonexistent" });
    expect(result.collections).toHaveLength(0);
    expect(result.error).toMatch(/No collections found with tag "nonexistent"/);
  });

  test("handles manifest with no collections gracefully", () => {
    const manifest = { name: "Empty", collections: [] };
    const result = listCollections(manifest);
    expect(result.collections).toHaveLength(0);
  });
});

describe("formatCollectionList", () => {
  test("includes manifest name", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("My App Assets");
  });

  test("includes tag list when tags are defined", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("Tags: icon, marketing");
  });

  test("omits tag list when no tags defined", () => {
    const manifest = { ...validManifest, tags: [] };
    const result = listCollections(manifest);
    const output = formatCollectionList(manifest, result.collections);
    expect(output).not.toContain("Tags:");
  });

  test("shows collection label, id, and tag annotations", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("App Icon (icon) [icon]");
    expect(output).toContain("App Screenshots (screenshots) [marketing]");
  });

  test("shows template count and size count", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("2 template(s), 4 size(s)");
    expect(output).toContain("2 template(s), 3 size(s)");
  });

  test("lists templates with label and src", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("App Icon \u2192 src/icon.html");
    expect(output).toContain("Hero Shot \u2192 src/screenshot-hero.html");
  });

  test("lists export sizes", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("App Store (1024\u00d71024)");
    expect(output).toContain("512px (512\u00d7512)");
    expect(output).toContain("Phone (1080\u00d71920)");
  });

  test("lists outputs", () => {
    const result = listCollections(validManifest);
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("Xcode: App/Assets.xcassets/AppIcon.appiconset");
  });

  test("works with minimal manifest", () => {
    const result = listCollections(minimalManifest);
    const output = formatCollectionList(minimalManifest, result.collections);
    expect(output).toContain("Test Project");
    expect(output).toContain("App Icon (icon)");
    expect(output).toContain("1 template(s), 1 size(s)");
  });

  test("formats only filtered collections", () => {
    const result = listCollections(validManifest, { tag: "icon" });
    const output = formatCollectionList(validManifest, result.collections);
    expect(output).toContain("App Icon (icon)");
    expect(output).not.toContain("screenshots");
  });

  test("shows copy-source output format", () => {
    const manifest = {
      name: "Test",
      tags: [],
      collections: [{
        id: "logo",
        label: "Logo",
        tags: [],
        sourceSize: { width: 800, height: 800 },
        templates: [{ src: "logo.svg", name: "logo", label: "Logo" }],
        export: [],
        outputs: [{ type: "copy-source", format: "svg" }],
      }],
    };
    const result = listCollections(manifest);
    const output = formatCollectionList(manifest, result.collections);
    expect(output).toContain("Copy source: svg");
  });
});
