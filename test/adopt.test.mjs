import { writeFileSync, readFileSync, mkdirSync, statSync, utimesSync } from "fs";
import { join, dirname } from "path";
import { deflateSync } from "zlib";
import { renderAssets } from "../lib/render.mjs";
import { v1SourceChecksum, v1ExportChecksum, loadLock, saveLock } from "../lib/cache.mjs";
import { decodePng, samePngPixels } from "../lib/png.mjs";
import { PngPool, keepExisting } from "../lib/png-pool.mjs";
import { createSkipProject, skipManifest, skipDeps, renderedPaths, out } from "./helpers/skip-fixture.mjs";

// ── PNG helpers ─────────────────────────────────────────────────────────────

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** Encode pixels (RGBA rows) as RGB or RGBA with a given filter type on every row. */
function encodePng(width, height, rgba, { channels = 4, filter = 0, level = 6 } = {}) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  const px = Buffer.alloc(stride * height);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += channels) {
    for (let c = 0; c < channels; c++) px[j + c] = rgba[i + c];
  }
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const v = px[y * stride + x];
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = y > 0 && x >= channels ? px[(y - 1) * stride + x - channels] : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      raw[y * (stride + 1) + 1 + x] = (v - pred) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function gradient(w, h, seed = 0) {
  const p = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    p[i * 4] = (i * 7 + seed) & 0xff;
    p[i * 4 + 1] = (i * 13) & 0xff;
    p[i * 4 + 2] = (i * 31) & 0xff;
    p[i * 4 + 3] = 255;
  }
  return p;
}

describe("PNG pixel comparison", () => {
  const px = gradient(17, 9);

  test.each([0, 1, 2, 3, 4])("decodes filter type %i", (filter) => {
    expect(decodePng(encodePng(17, 9, px, { filter })).rgba.equals(px)).toBe(true);
  });

  test("different compression, filters and RGB vs RGBA compare equal", () => {
    const a = encodePng(17, 9, px, { channels: 4, filter: 0, level: 1 });
    const b = encodePng(17, 9, px, { channels: 3, filter: 4, level: 9 });
    expect(a.equals(b)).toBe(false);
    expect(samePngPixels(a, b)).toBe(true);
  });

  test("one changed pixel, or a different size, compares unequal", () => {
    const changed = Buffer.from(px);
    changed[40] ^= 1;
    expect(samePngPixels(encodePng(17, 9, px), encodePng(17, 9, changed))).toBe(false);
    expect(samePngPixels(encodePng(17, 9, gradient(17, 9)), encodePng(9, 17, gradient(9, 17)))).toBe(false);
  });

  test("non-PNG input never compares equal", () => {
    expect(decodePng(Buffer.from("not a png"))).toBeNull();
    expect(samePngPixels(Buffer.from("a"), encodePng(17, 9, px))).toBe(false);
  });
});

// ── adoption from v1 locks ──────────────────────────────────────────────────

/** Write outputs and a v1 lock exactly as open-assets 0.5 would have. */
function writeV1State(dir, { absolute = false } = {}) {
  const col = skipManifest.collections[0];
  const assets = {};
  for (const locale of ["ar", "en", "en-GB", "fr"]) {
    for (const t of col.templates) {
      const key = `${col.id}/${locale}/${t.name}`;
      assets[key] = {};
      for (const e of col.export) {
        const rel = out(locale, e.name, t.name);
        mkdirSync(dirname(join(dir, rel)), { recursive: true });
        writeFileSync(join(dir, rel), `old|${rel}`);
        const outputPath = absolute ? `/old/machine/repo/${rel}` : rel;
        assets[key][rel] = {
          sourceChecksum: v1SourceChecksum(join(dir, t.src)),
          outputPath,
          exportedAt: "2026-07-01T00:00:00.000Z",
          exportChecksum: v1ExportChecksum(e.size.width, e.size.height, undefined, locale),
        };
      }
    }
  }
  writeFileSync(join(dir, "assets.lock"), JSON.stringify({ version: 1, assets }, null, 2));
}

function realLockStore(dir) {
  return {
    loadLock: (d, v) => loadLock(d, v),
    saveLock: (d, l) => saveLock(d, l),
  };
}

describe("upgrading a v1 lock adopts unchanged outputs", () => {
  let dir, cleanup, cwd;
  beforeEach(() => {
    ({ dir, cleanup } = createSkipProject());
    cwd = process.cwd();
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(cwd);
    cleanup();
  });

  test("every output whose v1 checksums still match is kept, not rendered", async () => {
    writeV1State(dir);
    const deps = skipDeps({ lock: null }, realLockStore(dir));
    const result = await renderAssets(dir, skipManifest, {}, deps);
    expect(result.migratedFrom).toBe(1);
    expect(result.adopted).toBe(24);
    expect(deps.renderVariants).not.toHaveBeenCalled();
    // Files untouched, lock now v2 with real keys and the existing file hashes
    expect(readFileSync(join(dir, out("fr", "big", "a")), "utf-8")).toBe(`old|${out("fr", "big", "a")}`);
    const { lock, from } = loadLock(dir, "1.0.0");
    expect(from).toBeNull();
    expect(lock.outputs[out("fr", "big", "a")].key).toMatch(/^sha256:/);
    // And the next run treats them as ordinary fresh outputs
    const again = await renderAssets(dir, skipManifest, {}, skipDeps({ lock: null }, realLockStore(dir)));
    expect(again.skipped).toBe(24);
    expect(again.adopted).toBe(0);
  });

  test("absolute v1 paths from another machine or repo name match by suffix", async () => {
    writeV1State(dir, { absolute: true });
    const result = await renderAssets(dir, skipManifest, {}, skipDeps({ lock: null }, realLockStore(dir)));
    expect(result.adopted).toBe(24);
  });

  test("outputs of a template changed since the v1 render are re-rendered", async () => {
    writeV1State(dir);
    writeFileSync(join(dir, "src/b.html"), "<p>{{cta}}!</p>");
    const deps = skipDeps({ lock: null }, realLockStore(dir));
    const result = await renderAssets(dir, skipManifest, {}, deps);
    expect(result.adopted).toBe(16);
    expect(renderedPaths(dir, result).every((p) => p.endsWith("/b.png"))).toBe(true);
  });

  test("a missing output file is re-rendered, not adopted", async () => {
    writeV1State(dir);
    writeFileSync(join(dir, out("ar", "small", "c")), "");
    const v1 = JSON.parse(readFileSync(join(dir, "assets.lock"), "utf-8"));
    writeFileSync(join(dir, "assets.lock"), JSON.stringify(v1));
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, out("ar", "small", "c")));
    const result = await renderAssets(dir, skipManifest, {}, skipDeps({ lock: null }, realLockStore(dir)));
    expect(renderedPaths(dir, result)).toEqual([out("ar", "small", "c")]);
  });

  test("--force ignores adoption", async () => {
    writeV1State(dir);
    const result = await renderAssets(dir, skipManifest, { force: true }, skipDeps({ lock: null }, realLockStore(dir)));
    expect(result.adopted).toBe(0);
  });

  test("--dry-run reports what would happen and writes nothing", async () => {
    writeV1State(dir);
    writeFileSync(join(dir, "src/c.html"), "<p>changed</p>");
    const before = readFileSync(join(dir, "assets.lock"), "utf-8");
    const deps = skipDeps({ lock: null }, realLockStore(dir));
    const result = await renderAssets(dir, skipManifest, { dryRun: true }, deps);
    expect(result).toMatchObject({ dryRun: true, adopted: 16, wouldRender: 6, wouldCopy: 2 });
    expect(readFileSync(join(dir, "assets.lock"), "utf-8")).toBe(before);
    expect(deps.renderVariants).not.toHaveBeenCalled();
  });
});

describe("re-renders with identical pixels keep the existing file", () => {
  let dir, cleanup, cwd;
  beforeEach(() => {
    ({ dir, cleanup } = createSkipProject());
    cwd = process.cwd();
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(cwd);
    cleanup();
  });

  test("same pixels, different encoding: bytes and mtime untouched", async () => {
    const px = gradient(20, 40);
    const store = { lock: null };
    const encodeA = () => encodePng(20, 40, px, { level: 9, filter: 4 });
    const encodeB = () => encodePng(20, 40, px, { level: 1, filter: 0, channels: 3 });
    await renderAssets(dir, skipManifest, {}, skipDeps(store, {
      renderVariants: async (d, src, sw, sh, variants) => variants.map(encodeA),
    }));
    const file = join(dir, out("fr", "big", "a"));
    const old = new Date(Date.now() - 60_000);
    utimesSync(file, old, old);
    const bytes = readFileSync(file);

    const result = await renderAssets(dir, skipManifest, { force: true }, skipDeps(store, {
      renderVariants: async (d, src, sw, sh, variants) => variants.map(encodeB),
    }));
    expect(readFileSync(file).equals(bytes)).toBe(true);
    expect(statSync(file).mtimeMs).toBe(old.getTime());
    expect(result.unchanged).toBe(24);
  });

  test("changed pixels are written", async () => {
    const store = { lock: null };
    await renderAssets(dir, skipManifest, {}, skipDeps(store, {
      renderVariants: async (d, src, sw, sh, variants) => variants.map(() => encodePng(20, 40, gradient(20, 40))),
    }));
    const result = await renderAssets(dir, skipManifest, { force: true }, skipDeps(store, {
      renderVariants: async (d, src, sw, sh, variants) => variants.map(() => encodePng(20, 40, gradient(20, 40, 5))),
    }));
    expect(result.unchanged).toBe(0);
  });
});

describe("--accept-existing", () => {
  let dir, cleanup, cwd;
  beforeEach(() => {
    ({ dir, cleanup } = createSkipProject());
    cwd = process.cwd();
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(cwd);
    cleanup();
  });

  test("records files on disk as current without rendering, even when stale by v1", async () => {
    writeV1State(dir);
    writeFileSync(join(dir, "src/a.html"), "<h1>{{hero_title}} edited</h1>");
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, out("fr", "small", "c")));
    const deps = skipDeps({ lock: null }, realLockStore(dir));
    const result = await renderAssets(dir, skipManifest, { acceptExisting: true }, deps);
    expect(deps.renderVariants).not.toHaveBeenCalled();
    expect(result.adopted).toBe(24);

    const { lock } = loadLock(dir, "1.0.0");
    expect(lock.outputs[out("fr", "small", "c")].png).toBeNull();
    // check passes (the missing file is fine without --require-outputs)
    const { checkAssets } = await import("../lib/check.mjs");
    expect(checkAssets(dir, skipManifest, {}, "1.0.0").ok).toBe(true);
    // A later plain render produces only the missing file
    const next = await renderAssets(dir, skipManifest, {}, skipDeps({ lock: null }, realLockStore(dir)));
    expect(renderedPaths(dir, next)).toEqual([out("fr", "small", "c")]);
  });
});

describe("PNG size rule", () => {
  const big = Buffer.alloc(1000), smaller = Buffer.alloc(950), small = Buffer.alloc(800);
  test("identical pixels keep the file unless a normal render is 10% smaller", () => {
    expect(keepExisting(big, smaller, true, false)).toBe(true);
    expect(keepExisting(big, small, true, false)).toBe(false);
    expect(keepExisting(big, small, true, true)).toBe(true);
    expect(keepExisting(big, big, false, false)).toBe(false);
  });
});

describe("PngPool", () => {
  test("compares on worker threads", async () => {
    const pool = new PngPool();
    const px = gradient(17, 9);
    const changed = Buffer.from(px);
    changed[8] ^= 1;
    const [same, diff] = await Promise.all([
      pool.same(encodePng(17, 9, px, { level: 1 }), encodePng(17, 9, px, { level: 9, filter: 4 })),
      pool.same(encodePng(17, 9, px), encodePng(17, 9, changed)),
    ]);
    await pool.close();
    expect([same, diff]).toEqual([true, false]);
  });
});
