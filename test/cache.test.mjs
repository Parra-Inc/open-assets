import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import {
  LOCKFILE_VERSION,
  RENDERER_VERSION,
  LockfileError,
  FileHasher,
  MIGRATIONS,
  canonicalJson,
  collectDeps,
  emptyLock,
  extractKeys,
  loadLock,
  localeAssets,
  localeClass,
  migrateLock,
  saveLock,
  serializeLock,
  sha256,
  stringDigests,
} from "../lib/cache.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";

const FIXTURES = resolve(fileURLToPath(import.meta.url), "../fixtures/locks");

describe("collectDeps", () => {
  test("follows CSS url() and @import to any depth", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "t.html": '<link rel="stylesheet" href="a.css"><img src="img/x.png">',
      "a.css": '@import "b.css"; body { background: url(bg.png) }',
      "b.css": "@font-face { src: url('fonts/f.woff2') }",
      "bg.png": "bg",
      "img/x.png": "x",
      "fonts/f.woff2": "font",
    });
    try {
      const { deps } = collectDeps(join(dir, "t.html"));
      expect(deps.map((d) => d.slice(dir.length + 1))).toEqual(
        ["a.css", "b.css", "bg.png", "fonts/f.woff2", "img/x.png"].sort()
      );
    } finally {
      cleanup();
    }
  });

  test("terminates on import cycles", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "t.html": '<link href="a.css">',
      "a.css": '@import "b.css";',
      "b.css": '@import "a.css";',
    });
    try {
      const { deps } = collectDeps(join(dir, "t.html"));
      expect(deps).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  test("ignores remote, data:, protocol-relative and fragment refs; reports missing files", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "t.html":
        '<img src="https://x.dev/a.png"><img src="data:image/png;base64,AA"><a href="#top"></a>' +
        '<script src="//cdn.dev/x.js"></script><img src="gone.png"><img src="ok.png?v=2">',
      "ok.png": "ok",
    });
    try {
      const { deps, missing } = collectDeps(join(dir, "t.html"));
      expect(deps.map((d) => d.slice(dir.length + 1))).toEqual(["ok.png"]);
      expect(missing.map((d) => d.slice(dir.length + 1))).toEqual(["gone.png"]);
    } finally {
      cleanup();
    }
  });
});

describe("extractKeys", () => {
  test("finds dotted keys and skips {{n:}} number placeholders", () => {
    expect(extractKeys(["<h1>{{title}}</h1><p>{{a.b}} {{n:1000}} {{title}}</p>"])).toEqual(["a.b", "title"]);
  });

  test("collects keys across the template and its HTML/SVG deps", () => {
    expect(extractKeys(["{{one}}", "<svg><text>{{two}}</text></svg>"])).toEqual(["one", "two"]);
  });
});

describe("string hashing", () => {
  test("only used keys contribute", () => {
    const a = stringDigests({ title: "Hi", other: "x" }, ["title"]);
    const b = stringDigests({ title: "Hi", other: "changed" }, ["title"]);
    expect(a).toEqual(b);
    expect(stringDigests({ title: "Hello" }, ["title"])).not.toEqual(a);
  });

  test("key order does not change canonical hashes", () => {
    expect(sha256(canonicalJson({ a: 1, b: { c: 2, d: 3 } }))).toBe(sha256(canonicalJson({ b: { d: 3, c: 2 }, a: 1 })));
  });

  test("a missing key hashes as null so adding a translation counts as a change", () => {
    expect(stringDigests({}, ["title"])).toEqual({ title: null });
  });
});

describe("localeAssets", () => {
  const files = {
    "public/screenshots/en/01.png": "en",
    "public/screenshots/fr/01.png": "fr",
    "public/screenshots/pt/01.png": "pt",
    "public/extra/de-01.png": "de",
  };

  test("maps a source-language capture to the locale's file", () => {
    const { dir, cleanup } = createTmpProject(null, files);
    try {
      const deps = [join(dir, "public/screenshots/en/01.png")];
      expect(localeAssets(dir, deps, "fr", "en", { name: "01" })).toEqual([join(dir, "public/screenshots/fr/01.png")]);
    } finally {
      cleanup();
    }
  });

  test("falls back to the base language, then contributes nothing extra", () => {
    const { dir, cleanup } = createTmpProject(null, files);
    try {
      const deps = [join(dir, "public/screenshots/en/01.png")];
      expect(localeAssets(dir, deps, "pt-BR", "en", { name: "01" })).toEqual([join(dir, "public/screenshots/pt/01.png")]);
      expect(localeAssets(dir, deps, "ja", "en", { name: "01" })).toEqual([]);
      expect(localeAssets(dir, deps, "en", "en", { name: "01" })).toEqual([]);
    } finally {
      cleanup();
    }
  });

  test("expands declared inputs with {locale} and {template}", () => {
    const { dir, cleanup } = createTmpProject(null, files);
    try {
      expect(localeAssets(dir, [], "de", "en", { name: "01" }, ["public/extra/{locale}-{template}.png"])).toEqual([
        join(dir, "public/extra/de-01.png"),
      ]);
    } finally {
      cleanup();
    }
  });
});

describe("localeClass", () => {
  test("groups regional variants of a language", () => {
    expect(localeClass("en-GB", "ltr", {})).toBe(localeClass("en-AU", "ltr", {}));
  });

  test("keeps Chinese scripts and number-formatting locales apart", () => {
    expect(localeClass("zh-Hans", "ltr", {})).not.toBe(localeClass("zh-Hant", "ltr", {}));
    expect(localeClass("en-US", "ltr", { a: "{{n:1000}}" })).not.toBe(localeClass("en-IN", "ltr", { a: "{{n:1000}}" }));
  });
});

describe("FileHasher", () => {
  test("reuses hashes by mtime and size across runs", () => {
    const { dir, cleanup } = createTmpProject(null, { "a.txt": "one" });
    try {
      const first = new FileHasher(dir);
      const h = first.hash(join(dir, "a.txt"));
      first.save();
      expect(existsSync(join(dir, ".open-assets/cache.json"))).toBe(true);

      const second = new FileHasher(dir);
      expect(second.hash(join(dir, "a.txt"))).toBe(h);
      expect(second.reads).toBe(0);
    } finally {
      cleanup();
    }
  });

  test("rehashes when the file changes and returns null for missing files", () => {
    const { dir, cleanup } = createTmpProject(null, { "a.txt": "one" });
    try {
      const first = new FileHasher(dir);
      const h = first.hash(join(dir, "a.txt"));
      first.save();
      writeFileSync(join(dir, "a.txt"), "two, longer");
      const second = new FileHasher(dir);
      expect(second.hash(join(dir, "a.txt"))).not.toBe(h);
      expect(second.hash(join(dir, "nope.txt"))).toBeNull();
    } finally {
      cleanup();
    }
  });
});

describe("lockfile versioning", () => {
  test("missing lock gives an empty current-version lock", () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const { lock, from, exists } = loadLock(dir, "1.0.0");
      expect(exists).toBe(false);
      expect(from).toBeNull();
      expect(lock.lockfileVersion).toBe(LOCKFILE_VERSION);
      expect(lock.renderer).toBe(RENDERER_VERSION);
    } finally {
      cleanup();
    }
  });

  test("migrates the real skipper v1 lock to the golden v2 output", () => {
    const v1 = JSON.parse(readFileSync(join(FIXTURES, "v1-skipper.json"), "utf-8"));
    const { lock, from } = migrateLock(v1, "0.6.0");
    expect(from).toBe(1);
    expect(serializeLock(lock)).toBe(readFileSync(join(FIXTURES, "v2-from-v1-skipper.json"), "utf-8"));
  });

  test("chained migration equals stepwise migration", () => {
    const v1 = JSON.parse(readFileSync(join(FIXTURES, "v1-skipper.json"), "utf-8"));
    let stepwise = v1;
    for (let v = 1; v < LOCKFILE_VERSION; v++) stepwise = MIGRATIONS[v](stepwise, "0.6.0");
    stepwise.lockfileVersion = LOCKFILE_VERSION;
    expect(serializeLock(migrateLock(v1, "0.6.0").lock)).toBe(serializeLock(stepwise));
  });

  test("every version below current has a migration step", () => {
    for (let v = 1; v < LOCKFILE_VERSION; v++) expect(typeof MIGRATIONS[v]).toBe("function");
  });

  test("loadLock reports the version it migrated from", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "assets.lock": readFileSync(join(FIXTURES, "v1-skipper.json"), "utf-8"),
    });
    try {
      const { lock, from } = loadLock(dir, "0.6.0");
      expect(from).toBe(1);
      expect(lock.lockfileVersion).toBe(LOCKFILE_VERSION);
      expect(lock.outputs["exports/screenshots/en/6.9/01-hero.png"]).toEqual({
        key: null,
        migratedFrom: 1,
        v1: {
          source: "sha256:6ee6b520f2c0e5eea9b7efca53119250c48a40ba4c866cc9c373ad22404ade33",
          export: "sha256:ffb750aec0ba57f441808a890f43db987463434c3d9b3706e6b3df29a7f80c33",
        },
      });
    } finally {
      cleanup();
    }
  });

  test("a lock from a newer open-assets is refused and left untouched", () => {
    const newer = JSON.stringify({ lockfileVersion: LOCKFILE_VERSION + 1, tool: "9.0.0", outputs: {} });
    const { dir, cleanup } = createTmpProject(null, { "assets.lock": newer });
    try {
      expect(() => loadLock(dir, "0.6.0")).toThrow(/written by open-assets 9\.0\.0.*reads up to v2.*@latest/s);
      expect(readFileSync(join(dir, "assets.lock"), "utf-8")).toBe(newer);
    } finally {
      cleanup();
    }
  });

  test("a corrupt lock is an error, never silently discarded", () => {
    const conflict = '{\n<<<<<<< HEAD\n  "a": 1\n=======\n  "a": 2\n>>>>>>> branch\n}\n';
    const { dir, cleanup } = createTmpProject(null, { "assets.lock": conflict });
    try {
      let err;
      try {
        loadLock(dir, "0.6.0");
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(LockfileError);
      expect(err.code).toBe("CORRUPT");
      expect(err.message).toMatch(/merge conflict markers/);
      expect(readFileSync(join(dir, "assets.lock"), "utf-8")).toBe(conflict);
    } finally {
      cleanup();
    }
  });
});

describe("serializeLock", () => {
  test("is deterministic, sorted, and has no timestamps or absolute paths", () => {
    const a = emptyLock("1.0.0");
    a.outputs = { "z.png": { key: "k2", png: "p2" }, "a.png": { png: "p1", key: "k1" } };
    a.files = { "b.html": "h2", "a.html": "h1" };
    const b = emptyLock("1.0.0");
    b.files = { "a.html": "h1", "b.html": "h2" };
    b.outputs = { "a.png": { key: "k1", png: "p1" }, "z.png": { png: "p2", key: "k2" } };
    expect(serializeLock(a)).toBe(serializeLock(b));
    expect(serializeLock(a)).not.toMatch(/exportedAt|\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(JSON.parse(serializeLock(a)).outputs)).toEqual(["a.png", "z.png"]);
  });

  test("saveLock writes atomically and round-trips", () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const lock = emptyLock("1.0.0");
      lock.outputs["x.png"] = { key: "k", png: "p" };
      saveLock(dir, lock);
      const { lock: back } = loadLock(dir, "1.0.0");
      expect(back.outputs).toEqual(lock.outputs);
      expect(readFileSync(join(dir, "assets.lock"), "utf-8").endsWith("\n")).toBe(true);
    } finally {
      cleanup();
    }
  });
});
