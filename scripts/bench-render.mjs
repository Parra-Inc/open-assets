#!/usr/bin/env node
/**
 * Render benchmark for the incremental cache and renderer options.
 *
 * Builds a synthetic localized project (default 36 locales × 10 templates ×
 * 2 App Store sizes = 720 PNGs) in a temp dir and times three scenarios with
 * the real CLI and Chromium:
 *
 *   cold        no lock, everything renders
 *   no-change   second run, nothing should render
 *   one-string  one German string edited, 2 PNGs should render
 *
 * Usage:
 *   node scripts/bench-render.mjs [--locales 36] [--templates 10] [--runs 1]
 *
 * Renderer env vars (OPEN_ASSETS_CONCURRENCY,
 * OPEN_ASSETS_REUSE_PAGES) pass through, so compare settings by running the
 * script once per setting.
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const CLI = resolve(fileURLToPath(import.meta.url), "../../bin/open-assets.mjs");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : parseInt(args[i + 1], 10);
};
const LOCALES = arg("locales", 36);
const TEMPLATES = arg("templates", 10);
const RUNS = arg("runs", 1);

const LOCALE_CODES = [
  "ar", "ca", "cs", "da", "de", "el", "en", "en-AU", "en-CA", "en-GB", "es", "es-MX", "fi", "fr", "fr-CA",
  "he", "hi", "hr", "hu", "id", "it", "ja", "ko", "ms", "nl", "no", "pl", "pt-BR", "pt-PT", "ro", "ru",
  "sk", "sv", "th", "tr", "uk", "vi", "zh-Hans", "zh-Hant",
].slice(0, LOCALES);

function buildProject() {
  const dir = mkdtempSync(join(tmpdir(), "oa-bench-"));
  const strings = {};
  for (let t = 0; t < TEMPLATES; t++) {
    for (const key of [`title_${t}`, `sub_${t}`]) {
      strings[key] = { localizations: {} };
      for (const l of LOCALE_CODES) {
        // Regional English variants fall back to en, like real projects
        if (/^en-/.test(l)) continue;
        strings[key].localizations[l] = { value: `${key} ${l} ${"lorem ipsum ".repeat(t % 3 + 1)}` };
      }
    }
  }
  // Make sure every locale is listed
  strings.locale_marker = { localizations: Object.fromEntries(LOCALE_CODES.map((l) => [l, { value: l }])) };
  writeFileSync(join(dir, "localizations.json"), JSON.stringify({ sourceLanguage: "en", strings }, null, 2));

  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(
    join(dir, "src/shared.css"),
    `body{margin:0;width:440px;height:956px;font-family:-apple-system,system-ui,sans-serif;
      background:linear-gradient(160deg,#0b6e4f,#073b4c);color:#fff;overflow:hidden}
     h1{font-size:44px;line-height:1.1;margin:80px 32px 16px}
     p{font-size:22px;margin:0 32px;opacity:.85}
     .phone{position:absolute;left:50px;top:360px;width:340px;height:700px;border-radius:48px;
      background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.4)}
     .row{height:56px;margin:18px;border-radius:14px;background:#e7efe9}`
  );
  const templates = [];
  for (let t = 0; t < TEMPLATES; t++) {
    const name = `${String(t + 1).padStart(2, "0")}-screen`;
    writeFileSync(
      join(dir, `src/${name}.html`),
      `<!doctype html><html><head><link rel="stylesheet" href="shared.css"></head><body>
       <h1>{{title_${t}}}</h1><p>{{sub_${t}}}</p>
       <div class="phone">${'<div class="row"></div>'.repeat(8)}</div></body></html>`
    );
    templates.push({ src: `src/${name}.html`, name, label: name });
  }
  writeFileSync(
    join(dir, "assets.json"),
    JSON.stringify(
      {
        version: 1,
        name: "Bench",
        collections: [
          {
            id: "screenshots",
            label: "Screenshots",
            sourceSize: { width: 440, height: 956 },
            localizations: "localizations.json",
            templates,
            export: [
              { name: "iphone-6.9", label: "6.9", size: { width: 1320, height: 2868 } },
              { name: "iphone-6.5", label: "6.5", size: { width: 1284, height: 2778 } },
            ],
          },
        ],
      },
      null,
      2
    )
  );
  return dir;
}

function time(dir) {
  const start = process.hrtime.bigint();
  const out = execFileSync("node", [CLI, "render", ".", "--json", ...(args.includes("--fast") ? ["--fast"] : [])], { cwd: dir, env: process.env, maxBuffer: 64 << 20 });
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  const r = JSON.parse(out.toString());
  const rendered = r.assets.filter((a) => a.width && !a.copiedFrom).length;
  return { ms, rendered, copied: r.copied, skipped: r.skipped };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const results = { cold: [], "no-change": [], "one-string": [] };
let last = {};

for (let run = 0; run < RUNS; run++) {
  const dir = buildProject();
  try {
    results.cold.push((last.cold = time(dir)).ms);
    results["no-change"].push((last["no-change"] = time(dir)).ms);
    const path = join(dir, "localizations.json");
    const data = JSON.parse(readFileSync(path, "utf-8"));
    data.strings.title_0.localizations.de.value = "Geändert";
    writeFileSync(path, JSON.stringify(data, null, 2));
    results["one-string"].push((last["one-string"] = time(dir)).ms);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const env = ["OPEN_ASSETS_CONCURRENCY", "OPEN_ASSETS_REUSE_PAGES"]
  .filter((k) => process.env[k])
  .map((k) => `${k}=${process.env[k]}`)
  .join(" ");
console.log(`${LOCALE_CODES.length} locales × ${TEMPLATES} templates × 2 sizes, median of ${RUNS}${env ? `, ${env}` : ""}`);
for (const [name, xs] of Object.entries(results)) {
  const l = last[name];
  console.log(
    `  ${name.padEnd(11)} ${(median(xs) / 1000).toFixed(2).padStart(7)}s   rendered ${l.rendered}, copied ${l.copied}, skipped ${l.skipped}`
  );
}
