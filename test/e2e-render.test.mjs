import { launch } from "puppeteer";
import { readFileSync, writeFileSync, statSync, readdirSync } from "fs";
import { join, resolve, relative } from "path";
import { renderVariants, closeBrowser } from "../lib/renderer.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { runCli } from "./helpers/run-cli.mjs";

/**
 * Real Chromium. These guard the renderer speedups against state leaking
 * between renders (leftover RTL dir, zoom, paused animations, lang-driven
 * image swaps) by comparing decoded pixels against fresh-navigation renders.
 * Set OPEN_ASSETS_SKIP_BROWSER_TESTS=1 to skip them on machines without
 * Chromium.
 */
const run = process.env.OPEN_ASSETS_SKIP_BROWSER_TESTS === "1" ? describe.skip : describe;

const TEMPLATE = `<!doctype html><html><head><style>
  body { margin: 0; width: 200px; height: 300px; background: #123; color: #fff; font: 20px sans-serif; }
  h1 { margin: 10px; font-size: 24px; }
  .spin { width: 40px; height: 40px; background: #f80; animation: spin 2s linear infinite; margin: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  img { display: block; width: 60px; height: 30px; margin: 10px; }
</style></head><body>
  <h1>{{title}}</h1><p>{{sub}} {{n:12345.5}}</p><div class="spin"></div>
  <img data-locale-img="badge" src="img/en/badge.svg">
  <script>
    new MutationObserver(function () {
      var lang = document.documentElement.lang || 'en';
      document.querySelectorAll('[data-locale-img]').forEach(function (img) {
        img.src = 'img/' + lang + '/' + img.getAttribute('data-locale-img') + '.svg';
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  </script>
</body></html>`;

const badge = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30"><rect width="60" height="30" fill="${color}"/></svg>`;

const LOCALES = [
  { locale: "en", direction: "ltr", strings: { title: "Hello", sub: "World" } },
  { locale: "ar", direction: "rtl", strings: { title: "مرحبا", sub: "بالعالم" } },
  { locale: "de", direction: "ltr", strings: { title: "Hallo", sub: "Welt" } },
  { locale: "en", direction: "ltr", strings: { title: "Hello", sub: "World" } },
];

const SIZES = [
  { width: 400, height: 600, format: "png" },
  { width: 200, height: 300, format: "png" },
];

let decoder;

/** Decode PNG buffers to RGBA in a separate browser and compare pixels. */
async function samePixels(a, b) {
  if (!decoder) decoder = await (await launch({ headless: true })).newPage();
  return decoder.evaluate(
    async (a64, b64) => {
      const load = async (b) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b}`;
        await img.decode();
        const c = new OffscreenCanvas(img.width, img.height);
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return { w: img.width, h: img.height, d: ctx.getImageData(0, 0, img.width, img.height).data };
      };
      const [x, y] = await Promise.all([load(a64), load(b64)]);
      if (x.w !== y.w || x.h !== y.h) return false;
      for (let i = 0; i < x.d.length; i++) if (x.d[i] !== y.d[i]) return false;
      return true;
    },
    a.toString("base64"),
    b.toString("base64")
  );
}

async function renderAll(dir) {
  const out = [];
  for (const localization of LOCALES) {
    out.push(await renderVariants(dir, "t.html", 200, 300, SIZES, { localization }));
  }
  return out;
}

run("renderer speedups match fresh renders (real Chromium)", () => {
  let dir, cleanup;
  const saved = {};

  beforeAll(() => {
    ({ dir, cleanup } = createTmpProject(null, {
      "t.html": TEMPLATE,
      "img/en/badge.svg": badge("#0a0"),
      "img/ar/badge.svg": badge("#a00"),
      "img/de/badge.svg": badge("#00a"),
    }));
    for (const k of ["OPEN_ASSETS_REUSE_PAGES", "OPEN_ASSETS_BROWSERS"]) saved[k] = process.env[k];
  });

  afterEach(async () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await closeBrowser();
  });

  afterAll(async () => {
    if (decoder) await decoder.browser().close();
    cleanup();
  });

  test("in-place locale swaps produce the same pixels as fresh navigation", async () => {
    const fresh = await renderAll(dir);
    await closeBrowser();
    process.env.OPEN_ASSETS_REUSE_PAGES = "1";
    const reused = await renderAll(dir);
    for (let l = 0; l < LOCALES.length; l++) {
      for (let s = 0; s < SIZES.length; s++) {
        expect([LOCALES[l].locale, SIZES[s].width, await samePixels(fresh[l][s], reused[l][s])]).toEqual([
          LOCALES[l].locale,
          SIZES[s].width,
          true,
        ]);
      }
    }
    // Sanity: locales really differ, so the comparison can fail
    expect(await samePixels(fresh[0][0], fresh[1][0])).toBe(false);
  }, 120000);

  test("several browser processes produce the same pixels", async () => {
    const one = await renderAll(dir);
    await closeBrowser();
    process.env.OPEN_ASSETS_BROWSERS = "2";
    const two = await Promise.all(
      LOCALES.map((localization) => renderVariants(dir, "t.html", 200, 300, SIZES, { localization }))
    );
    for (let l = 0; l < LOCALES.length; l++) {
      for (let s = 0; s < SIZES.length; s++) expect(await samePixels(one[l][s], two[l][s])).toBe(true);
    }
  }, 120000);

  test("optimizeForSpeed PNGs decode to the same pixels as default encoding", async () => {
    const page = await (await launch({ headless: true })).newPage();
    try {
      await page.setViewport({ width: 400, height: 600 });
      await page.goto(`file://${join(dir, "t.html")}`);
      await page.evaluate(() => document.getAnimations().forEach((a) => (a.pause(), (a.currentTime = 0))));
      const clip = { x: 0, y: 0, width: 400, height: 600 };
      const slow = await page.screenshot({ type: "png", clip });
      const fast = await page.screenshot({ type: "png", clip, optimizeForSpeed: true });
      expect(await samePixels(slow, fast)).toBe(true);
    } finally {
      await page.browser().close();
    }
  }, 60000);
});

run("incremental render on disk (real CLI + Chromium)", () => {
  test("editing one German string rewrites only its PNGs; every other file keeps its bytes and mtime", async () => {
    const manifest = {
      version: 1,
      name: "E2E",
      collections: [
        {
          id: "s",
          label: "S",
          sourceSize: { width: 200, height: 300 },
          localizations: "l.json",
          templates: [
            { src: "a.html", name: "a", label: "A" },
            { src: "b.html", name: "b", label: "B" },
          ],
          export: [
            { name: "x2", label: "2x", size: { width: 400, height: 600 } },
            { name: "x1", label: "1x", size: { width: 200, height: 300 } },
          ],
        },
      ],
    };
    const l10n = (de) => ({
      sourceLanguage: "en",
      strings: {
        a: { localizations: { en: { value: "A" }, de: { value: de }, fr: { value: "A fr" } } },
        b: { localizations: { en: { value: "B" }, de: { value: "B de" }, fr: { value: "B fr" } } },
      },
    });
    const { dir, cleanup } = createTmpProject(manifest, {
      "l.json": JSON.stringify(l10n("A de")),
      "a.html": "<body style='margin:0;background:#fff;font:30px sans-serif'><h1>{{a}}</h1></body>",
      "b.html": "<body style='margin:0;background:#eee;font:30px sans-serif'><h1>{{b}}</h1></body>",
    });
    try {
      const first = await runCli(["render", ".", "-q"], { cwd: dir, timeout: 120000 });
      expect(first.exitCode).toBe(0);
      const list = (d) =>
        readdirSync(d, { recursive: true })
          .map((f) => join(d, f))
          .filter((f) => f.endsWith(".png"));
      const before = new Map(list(join(dir, "exports")).map((f) => [f, [readFileSync(f), statSync(f).mtimeMs]]));
      expect(before.size).toBe(12);

      await new Promise((r) => setTimeout(r, 20));
      writeFileSync(join(dir, "l.json"), JSON.stringify(l10n("A geändert")));
      const second = await runCli(["render", ".", "--json"], { cwd: dir, timeout: 120000 });
      expect(second.exitCode).toBe(0);

      const changed = [];
      for (const [f, [bytes, mtime]] of before) {
        const now = readFileSync(f);
        if (!now.equals(bytes) || statSync(f).mtimeMs !== mtime) changed.push(relative(dir, f));
      }
      expect(changed.sort()).toEqual(["exports/s/de/x1/a.png", "exports/s/de/x2/a.png"]);

      const check = await runCli(["check", "."], { cwd: dir });
      expect(check.exitCode).toBe(0);
    } finally {
      cleanup();
    }
  }, 180000);
});
