#!/usr/bin/env node
/**
 * Keeps README.md and docs.open-assets.dev in sync for everything that comes
 * from source code: CLI options, export sizes and the examples gallery.
 *
 *   node scripts/docs-sync.mjs           regenerate README blocks + apps/docs/generated/*
 *   node scripts/docs-sync.mjs --check   exit 1 if anything is out of date (CI)
 *
 * Sources:
 *   CLI options  `open-assets <command> --help` (commander), run with a clean env
 *   Sizes        lib/sizes.mjs
 *   Examples     examples/<name>/assets.json + apps/web/public/img/examples
 *
 * README blocks sit between `<!-- docs-sync:<id> -->` and `<!-- /docs-sync -->`.
 * Prose outside the blocks is written by hand in both places; AGENTS.md maps
 * each README section to its docs page.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPORT_SIZES } from "../lib/sizes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const generatedDir = join(root, "apps/docs/generated");

export const COMMANDS = [
  ["dev"],
  ["render"],
  ["list"],
  ["validate"],
  ["init"],
  ["add", "collection"],
  ["add", "template"],
  ["add", "size"],
  ["skills"],
];

/** Settings read from the environment with no matching flag. */
const ENV_ONLY = {
  render: [
    { flags: null, env: "OPEN_ASSETS_CONCURRENCY", default: "auto", description: "Templates rendered at once (see Concurrency)" },
  ],
};

/** `--help` for one command, with every env var that changes defaults removed. */
function helpText(command) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("OPEN_ASSETS_") && k !== "CI"),
  );
  return execFileSync(process.execPath, [join(root, "bin/open-assets.mjs"), ...command, "--help"], {
    encoding: "utf8",
    env: { ...env, COLUMNS: "200" },
  });
}

/** Parse commander help into { usage, description, arguments, options }. */
export function parseHelp(text) {
  const lines = text.split("\n");
  const usage = lines[0].replace(/^Usage:\s*/, "").trim();
  const description = (lines.slice(1).find((l) => l.trim()) || "").trim();
  const sections = {};
  let current = null;
  for (const line of lines.slice(1)) {
    const header = line.match(/^(Arguments|Options|Commands):$/);
    if (header) {
      current = sections[header[1]] = [];
      continue;
    }
    if (!current || !line.trim()) continue;
    const entry = line.match(/^ {2}(\S.*?)\s{2,}(\S.*)$/);
    if (entry) current.push({ name: entry[1].trim(), text: entry[2].trim() });
    else if (current.length) current[current.length - 1].text += " " + line.trim(); // wrapped line
  }
  const split = ({ name, text: raw }) => {
    let text = raw;
    let def = null;
    let env = null;
    const d = text.match(/\s*\(default: (.*)\)$/);
    if (d) {
      def = d[1].replace(/^"(.*)"$/, "$1");
      text = text.slice(0, d.index);
    }
    const e = text.match(/\s*\(env: ([A-Z_]+)\)/);
    if (e) {
      env = e[1];
      text = text.replace(e[0], "");
    }
    return { name, description: text.trim(), env, default: def };
  };
  return {
    usage,
    description,
    arguments: (sections.Arguments || []).map(split),
    options: (sections.Options || [])
      .map(split)
      .filter((o) => !o.name.startsWith("-h, --help"))
      .map(({ name, ...rest }) => ({ flags: name, ...rest })),
  };
}

function buildCli() {
  return COMMANDS.map((command) => {
    const parsed = parseHelp(helpText(command));
    const key = command.join(" ");
    return { command: key, ...parsed, options: [...parsed.options, ...(ENV_ONLY[key] || [])] };
  });
}

function buildExamples() {
  const dir = join(root, "examples");
  return readdirSync(dir)
    .filter((name) => existsSync(join(dir, name, "assets.json")))
    .sort()
    .map((slug) => {
      const manifest = JSON.parse(readFileSync(join(dir, slug, "assets.json"), "utf8"));
      return {
        slug,
        name: manifest.name || slug,
        collections: (manifest.collections || []).map((c) => ({
          id: c.id,
          label: c.label || c.id,
          sourceSize: c.sourceSize || null,
          templates: (c.templates || []).length,
          locales: c.locales || [],
          exports: (c.export || []).filter((e) => e.size).map((e) => `${e.label || e.name} (${e.size.width}×${e.size.height})`),
          outputs: (c.export || []).filter((e) => e.type).map((e) => e.type),
        })),
      };
    });
}

// ── README blocks ────────────────────────────────────────────────────────────

const cell = (v) => (v ? `\`${v}\`` : "-");

function optionsTable(cmd) {
  if (cmd.options.length === 0) return "This command has no options.";
  const rows = cmd.options.map(
    (o) => `| ${o.flags ? `\`${o.flags}\`` : "-"} | ${cell(o.env)} | ${cell(o.default)} | ${o.description} |`,
  );
  return ["| Flag | Env Var | Default | Description |", "|------|---------|---------|-------------|", ...rows].join("\n");
}

function sizesTable() {
  const rows = EXPORT_SIZES.map((s) => `| ${s.platform} | ${s.label} | \`${s.name}\` | ${s.width} | ${s.height} |`);
  return ["| Platform | Label | Name | Width | Height |", "|----------|-------|------|-------|--------|", ...rows].join("\n");
}

function replaceBlocks(readme, blocks) {
  let out = readme;
  for (const [id, body] of Object.entries(blocks)) {
    const re = new RegExp(`(<!-- docs-sync:${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} -->\\n)[\\s\\S]*?(\\n<!-- /docs-sync -->)`);
    if (!re.test(out)) throw new Error(`README.md is missing the <!-- docs-sync:${id} --> block`);
    out = out.replace(re, `$1${body}$2`);
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────────

const cli = buildCli();
const files = {
  [join(generatedDir, "cli.json")]: JSON.stringify(cli, null, 2) + "\n",
  [join(generatedDir, "sizes.json")]: JSON.stringify(EXPORT_SIZES, null, 2) + "\n",
  [join(generatedDir, "examples.json")]: JSON.stringify(buildExamples(), null, 2) + "\n",
};

const blocks = { sizes: sizesTable() };
for (const cmd of cli) blocks[`cli:${cmd.command.replace(" ", "-")}`] = optionsTable(cmd);
const readmePath = join(root, "README.md");
files[readmePath] = replaceBlocks(readFileSync(readmePath, "utf8"), blocks);

const stale = Object.entries(files).filter(([path, content]) => !existsSync(path) || readFileSync(path, "utf8") !== content);

if (check) {
  if (stale.length) {
    console.error(`docs-sync: out of date:\n${stale.map(([p]) => `  ${p.replace(root + "/", "")}`).join("\n")}\nRun: npm run docs:sync`);
    process.exit(1);
  }
  console.log("docs-sync: README and docs are in sync");
} else {
  mkdirSync(generatedDir, { recursive: true });
  for (const [path, content] of stale) writeFileSync(path, content);
  // Gallery images, shared with the marketing site.
  const imgSrc = join(root, "apps/web/public/img/examples");
  const imgDest = join(root, "apps/docs/public/img/examples");
  if (existsSync(imgSrc)) {
    mkdirSync(imgDest, { recursive: true });
    for (const f of readdirSync(imgSrc)) copyFileSync(join(imgSrc, f), join(imgDest, f));
  }
  console.log(`docs-sync: ${stale.length} file(s) updated`);
}
