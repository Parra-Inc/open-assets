import { jest } from "@jest/globals";
import { join, relative } from "path";
import { realpathSync } from "fs";
import { createTmpProject } from "./tmp-project.mjs";
import { emptyLock } from "../../lib/cache.mjs";

/**
 * A small localized project for cache behaviour tests:
 * 3 templates × 4 locales (en source, fr, ar RTL, en-GB falling back to en)
 * × 2 sizes = 24 outputs.
 *
 *  a.html  uses hero_title, shared.css → @import fonts.css → fonts/f.woff2,
 *          and a per-locale capture (public/screens/en/a.png, fr has its own)
 *  b.html  uses cta
 *  c.html  uses no strings
 */
export const SKIP_LOCALES = ["ar", "en", "en-GB", "fr"];

export const skipManifest = {
  version: 1,
  name: "Skip fixture",
  collections: [
    {
      id: "shots",
      label: "Shots",
      sourceSize: { width: 100, height: 200 },
      localizations: "localizations.json",
      templates: [
        { src: "src/a.html", name: "a", label: "A" },
        { src: "src/b.html", name: "b", label: "B" },
        { src: "src/c.html", name: "c", label: "C" },
      ],
      export: [
        { name: "big", label: "Big", size: { width: 200, height: 400 } },
        { name: "small", label: "Small", size: { width: 100, height: 200 } },
      ],
    },
  ],
};

export const skipStrings = {
  sourceLanguage: "en",
  strings: {
    hero_title: { localizations: { en: { value: "Track it" }, fr: { value: "Suivez" }, ar: { value: "تتبع" } } },
    cta: { localizations: { en: { value: "Start" }, fr: { value: "Commencer" }, ar: { value: "ابدأ" } } },
    unused: {
      localizations: { en: { value: "u" }, fr: { value: "u-fr" }, ar: { value: "u-ar" }, "en-GB": { value: "u-gb" } },
    },
  },
};

export function createSkipProject() {
  const project = createSkipProjectRaw();
  // macOS tmp dirs sit behind a /var → /private/var symlink; use the real path
  // so project-relative output paths match what process.cwd() resolves.
  return { ...project, dir: realpathSync(project.dir) };
}

function createSkipProjectRaw() {
  return createTmpProject(skipManifest, {
    "localizations.json": JSON.stringify(skipStrings, null, 2),
    "src/a.html":
      '<link rel="stylesheet" href="shared.css"><h1>{{hero_title}}</h1>' +
      '<img data-locale-img="a" src="../public/screens/en/a.png">',
    "src/b.html": "<p>{{cta}}</p>",
    "src/c.html": "<p>static</p>",
    "src/shared.css": '@import "fonts.css"; h1 { color: red }',
    "src/fonts.css": "@font-face { font-family: F; src: url(fonts/f.woff2) }",
    "src/fonts/f.woff2": "font-v1",
    "public/screens/en/a.png": "capture-en",
    "public/screens/fr/a.png": "capture-fr",
  });
}

/** Fake renderer whose bytes depend on the inputs, plus a shared in-memory lock. */
export function skipDeps(store, overrides = {}) {
  return {
    renderVariants: jest.fn(async (dir, src, sw, sh, variants, opts) =>
      variants.map((v) => Buffer.from(`${src}|${opts.localization?.locale}|${v.width}`))
    ),
    runXcodeOutput: jest.fn(),
    closeBrowser: jest.fn(async () => {}),
    loadLock: jest.fn((dir, version) => ({
      lock: store.lock ? structuredClone(store.lock) : emptyLock(version),
      from: null,
    })),
    saveLock: jest.fn((dir, lock) => {
      store.lock = structuredClone(lock);
    }),
    persistStatCache: false,
    toolVersion: "1.0.0",
    ...overrides,
  };
}

/** Relative output paths that a run rendered (not copied). */
export function renderedPaths(dir, result) {
  const root = realpathSync(dir);
  return result.results
    .filter((r) => r.width && !r.copiedFrom)
    .map((r) => relative(r.path.startsWith(root) ? root : dir, r.path))
    .sort();
}

export function out(locale, size, template) {
  return join("exports", "shots", locale, size, `${template}.png`);
}
