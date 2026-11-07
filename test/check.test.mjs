import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { renderAssets } from "../lib/render.mjs";
import { checkAssets, formatCheck } from "../lib/check.mjs";
import { saveLock, LOCKFILE_VERSION } from "../lib/cache.mjs";
import { createSkipProject, skipManifest, skipDeps, out } from "./helpers/skip-fixture.mjs";
import { runCli } from "./helpers/run-cli.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

describe("checkAssets", () => {
  let dir, cleanup, cwd;

  beforeEach(async () => {
    ({ dir, cleanup } = createSkipProject());
    cwd = process.cwd();
    process.chdir(dir);
    const store = { lock: null };
    await renderAssets(dir, skipManifest, {}, skipDeps(store));
    saveLock(dir, store.lock);
  });

  afterEach(() => {
    process.chdir(cwd);
    cleanup();
  });

  const check = (opts = {}) => checkAssets(dir, skipManifest, opts, "1.0.0");

  test("passes on a freshly rendered project", () => {
    const result = check();
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(24);
    expect(formatCheck(result)).toMatch(/✓ 24 output/);
  });

  test("fails on a changed string and names it", () => {
    const path = join(dir, "localizations.json");
    const data = JSON.parse(readFileSync(path, "utf-8"));
    data.strings.hero_title.localizations.fr.value = "Changé";
    writeFileSync(path, JSON.stringify(data));
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.problems.map((p) => p.path).sort()).toEqual([out("fr", "big", "a"), out("fr", "small", "a")]);
    expect(result.problems[0].reasons.join()).toMatch(/strings\[fr\]\.hero_title changed/);
    expect(formatCheck(result)).toMatch(/Run `npx open-assets render` and commit assets\.lock/);
  });

  test("fails on a changed per-locale capture", () => {
    writeFileSync(join(dir, "public/screens/fr/a.png"), "new capture");
    const result = check();
    expect(result.problems.map((p) => p.path).sort()).toEqual([out("fr", "big", "a"), out("fr", "small", "a")]);
    expect(result.problems[0].reasons.join()).toMatch(/public\/screens\/fr\/a\.png changed/);
  });

  test("fails on a hand-edited output", () => {
    writeFileSync(join(dir, out("ar", "big", "c")), "tampered");
    const result = check();
    expect(result.problems).toEqual([
      { path: out("ar", "big", "c"), reasons: ["output file differs from assets.lock (edited by hand?)"] },
    ]);
  });

  test("ignores missing outputs unless requireOutputs is set", () => {
    unlinkSync(join(dir, out("en", "small", "b")));
    expect(check().ok).toBe(true);
    const strict = check({ requireOutputs: true });
    expect(strict.problems).toEqual([{ path: out("en", "small", "b"), reasons: ["output file is missing"] }]);
  });

  test("fails on an output that is not in the lock", () => {
    const manifest = structuredClone(skipManifest);
    manifest.collections[0].export.push({ name: "tiny", label: "Tiny", size: { width: 50, height: 100 } });
    const result = checkAssets(dir, manifest, {}, "1.0.0");
    expect(result.problems).toHaveLength(12);
    expect(result.problems[0].reasons).toEqual(["not in assets.lock (new output)"]);
  });

  test("fails when the lock is older and needs upgrading", () => {
    writeFileSync(join(dir, "assets.lock"), JSON.stringify({ version: 1, assets: {} }));
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/lockfile v1; this open-assets writes v2\. It needs upgrading/);
  });

  test("fails when the lock is newer than this CLI", () => {
    writeFileSync(join(dir, "assets.lock"), JSON.stringify({ lockfileVersion: LOCKFILE_VERSION + 1, tool: "9.9.9" }));
    expect(check().message).toMatch(/written by open-assets 9\.9\.9/);
  });

  test("fails when there is no lock", () => {
    unlinkSync(join(dir, "assets.lock"));
    expect(check().message).toMatch(/No assets\.lock/);
  });
});

describe("open-assets check (CLI)", () => {
  let dir, cleanup;

  beforeEach(async () => {
    ({ dir, cleanup } = createSkipProject());
    const cwd = process.cwd();
    process.chdir(dir);
    const store = { lock: null };
    await renderAssets(dir, skipManifest, {}, skipDeps(store, { toolVersion: undefined }));
    saveLock(dir, store.lock);
    process.chdir(cwd);
  });

  afterEach(() => cleanup());

  // A bogus browser path makes any Chromium launch fail loudly: check must
  // never need one.
  const noBrowser = { PUPPETEER_EXECUTABLE_PATH: "/nonexistent/chrome", PUPPETEER_SKIP_DOWNLOAD: "1" };

  test("exits 0 when clean, without a browser", async () => {
    const { exitCode, stdout } = await runCli(["check", "."], { cwd: dir, env: noBrowser });
    expect(stdout).toMatch(/✓ 24 output\(s\) match assets\.lock/);
    expect(exitCode).toBe(0);
  });

  test("exits 1 with an explanation on drift", async () => {
    writeFileSync(join(dir, "src/c.html"), "<p>edited</p>");
    const { exitCode, stderr } = await runCli(["check", "."], { cwd: dir, env: noBrowser });
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/8 output\(s\) are out of date/);
    expect(stderr).toMatch(/src\/c\.html changed/);
  });

  test("--json reports problems for tooling", async () => {
    unlinkSync(join(dir, out("fr", "big", "a")));
    const { exitCode, stdout } = await runCli(["check", ".", "--json", "--require-outputs"], { cwd: dir, env: noBrowser });
    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout).problems).toEqual([{ path: out("fr", "big", "a"), reasons: ["output file is missing"] }]);
  });
});

describe("check stays browser-free", () => {
  test("the modules check loads never import puppeteer or the renderer", () => {
    for (const file of ["lib/check.mjs", "lib/plan.mjs", "lib/cache.mjs", "lib/manifest.mjs", "lib/localization.mjs"]) {
      const src = readFileSync(join(ROOT, file), "utf-8");
      expect(src).not.toMatch(/from\s+["']puppeteer["']|renderer\.mjs/);
    }
  });
});
