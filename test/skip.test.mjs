import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { renderAssets } from "../lib/render.mjs";
import { createSkipProject, skipManifest, skipDeps, renderedPaths, out } from "./helpers/skip-fixture.mjs";

/**
 * Each row mutates one input after a clean render and asserts exactly which
 * outputs the next run renders and copies. This is the contract that keeps
 * the cache from shipping stale screenshots (too few renders) or wasting
 * time (too many).
 */

function editJson(path, fn) {
  const data = JSON.parse(readFileSync(path, "utf-8"));
  fn(data);
  writeFileSync(path, JSON.stringify(data, null, 2));
}

const ROWS = [
  {
    name: "nothing changed",
    mutate: () => {},
    rendered: [],
    copied: 0,
  },
  {
    name: "one fr string used by template a",
    mutate: (dir) =>
      editJson(join(dir, "localizations.json"), (d) => {
        d.strings.hero_title.localizations.fr.value = "Suivez tout";
      }),
    rendered: [out("fr", "big", "a"), out("fr", "small", "a")],
    copied: 0,
  },
  {
    name: "an fr string no template uses",
    mutate: (dir) =>
      editJson(join(dir, "localizations.json"), (d) => {
        d.strings.unused.localizations.fr.value = "changed";
      }),
    rendered: [],
    copied: 0,
  },
  {
    name: "an English string that en-GB falls back to",
    mutate: (dir) =>
      editJson(join(dir, "localizations.json"), (d) => {
        d.strings.hero_title.localizations.en.value = "Track everything";
      }),
    // en renders; en-GB resolves to the same text and copies it
    rendered: [out("en", "big", "a"), out("en", "small", "a")],
    copied: 2,
  },
  {
    name: "the fr capture for template a",
    mutate: (dir) => writeFileSync(join(dir, "public/screens/fr/a.png"), "capture-fr-v2"),
    rendered: [out("fr", "big", "a"), out("fr", "small", "a")],
    copied: 0,
  },
  {
    name: "the en capture (used by en, en-GB and ar, which has no capture of its own)",
    mutate: (dir) => writeFileSync(join(dir, "public/screens/en/a.png"), "capture-en-v2"),
    rendered: [out("ar", "big", "a"), out("ar", "small", "a"), out("en", "big", "a"), out("en", "small", "a"), out("fr", "big", "a"), out("fr", "small", "a")],
    copied: 2,
  },
  {
    name: "a font two imports deep",
    mutate: (dir) => writeFileSync(join(dir, "src/fonts/f.woff2"), "font-v2"),
    rendered: ["ar", "en", "fr"].flatMap((l) => [out(l, "big", "a"), out(l, "small", "a")]),
    copied: 2,
  },
  {
    name: "one exported PNG deleted",
    mutate: (dir) => unlinkSync(join(dir, out("fr", "big", "b"))),
    rendered: [out("fr", "big", "b")],
    copied: 0,
  },
  {
    name: "one exported PNG edited by hand",
    mutate: (dir) => writeFileSync(join(dir, out("ar", "small", "c")), "tampered"),
    rendered: [out("ar", "small", "c")],
    copied: 0,
  },
];

describe("incremental render: what re-renders after one change", () => {
  let dir, cleanup, store, cwd;

  beforeEach(async () => {
    ({ dir, cleanup } = createSkipProject());
    store = { lock: null };
    cwd = process.cwd();
    process.chdir(dir);
    process.env.OPEN_ASSETS_CONCURRENCY = "1";
    const first = await renderAssets(dir, skipManifest, {}, skipDeps(store));
    // 24 outputs: en-GB has no translations of the used keys, so its 6 outputs copy en's
    expect(renderedPaths(dir, first)).toHaveLength(18);
    expect(first.copied).toBe(6);
  });

  afterEach(() => {
    process.chdir(cwd);
    delete process.env.OPEN_ASSETS_CONCURRENCY;
    cleanup();
  });

  test.each(ROWS)("$name", async ({ mutate, rendered, copied }) => {
    mutate(dir);
    const deps = skipDeps(store);
    const result = await renderAssets(dir, skipManifest, {}, deps);
    expect(renderedPaths(dir, result)).toEqual([...rendered].sort());
    expect(result.copied).toBe(copied);
    if (rendered.length === 0 && copied === 0) {
      // The no-change path never asks for a browser page
      expect(deps.renderVariants).not.toHaveBeenCalled();
    }
  });

  test("--force renders everything (identical locales still copy)", async () => {
    const result = await renderAssets(dir, skipManifest, { force: true }, skipDeps(store));
    expect(renderedPaths(dir, result)).toHaveLength(18);
    expect(result.copied).toBe(6);
    expect(result.skipped).toBe(0);
  });

  test("a tool patch release re-renders nothing", async () => {
    const result = await renderAssets(dir, skipManifest, {}, skipDeps(store, { toolVersion: "1.0.1" }));
    expect(renderedPaths(dir, result)).toEqual([]);
    expect(store.lock.tool).toBe("1.0.1");
  });

  test("dedupeLocales: false renders every locale", async () => {
    const manifest = structuredClone(skipManifest);
    manifest.collections[0].dedupeLocales = false;
    const result = await renderAssets(dir, manifest, {}, skipDeps(store));
    // Keys now include the exact locale: every key changes once, and en-GB
    // renders for real instead of copying en
    expect(renderedPaths(dir, result)).toHaveLength(24);
    expect(result.copied).toBe(0);
  });

  test("a failed render keeps finished units; the rerun renders only the rest", async () => {
    writeFileSync(join(dir, "src/fonts/f.woff2"), "font-v3"); // invalidates a in ar, en, fr (+ en-GB copy)
    let calls = 0;
    const failing = skipDeps(store, {
      renderVariants: async (d, src, sw, sh, variants, opts) => {
        if (++calls === 2) throw new Error("boom");
        return variants.map((v) => Buffer.from(`${src}|${opts.localization?.locale}|${v.width}`));
      },
    });
    await expect(renderAssets(dir, skipManifest, {}, failing)).rejects.toThrow("boom");

    const rerun = await renderAssets(dir, skipManifest, {}, skipDeps(store));
    // ar finished before the failure; en failed; fr never started
    expect(renderedPaths(dir, rerun)).toEqual(
      [out("en", "big", "a"), out("en", "small", "a"), out("fr", "big", "a"), out("fr", "small", "a")].sort()
    );
  });

  test("filtered runs keep other outputs in the lock; full runs prune removed ones", async () => {
    await renderAssets(dir, skipManifest, { locale: "fr" }, skipDeps(store));
    expect(Object.keys(store.lock.outputs)).toHaveLength(24);

    const fewer = structuredClone(skipManifest);
    fewer.collections[0].templates = fewer.collections[0].templates.filter((t) => t.name !== "c");
    await renderAssets(dir, fewer, {}, skipDeps(store));
    expect(Object.keys(store.lock.outputs)).toHaveLength(16);
    expect(store.lock.fingerprint).toMatch(/^sha256:/);
  });

  test("--explain names the changed string", async () => {
    editJson(join(dir, "localizations.json"), (d) => {
      d.strings.cta.localizations.ar.value = "ابدأ الآن";
    });
    const lines = [];
    await renderAssets(dir, skipManifest, { explain: true }, skipDeps(store), (l) => lines.push(l));
    const why = lines.filter((l) => l.includes("render exports"));
    expect(why).toHaveLength(2);
    for (const l of why) expect(l).toMatch(/strings\[ar\]\.cta changed/);
  });

  test("--explain names the changed dependency file", async () => {
    writeFileSync(join(dir, "src/shared.css"), "h1 { color: blue }");
    const lines = [];
    await renderAssets(dir, skipManifest, { explain: true }, skipDeps(store), (l) => lines.push(l));
    expect(lines.some((l) => /render exports\/shots\/fr\/big\/a\.png: .*src\/shared\.css/.test(l))).toBe(true);
  });
});
