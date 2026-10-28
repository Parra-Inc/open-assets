#!/usr/bin/env node
/**
 * Content gate for docs.open-assets.dev, run before `next build`.
 *
 * - every page has a title and a 150 to 160 character description (fleet SEO standard A4)
 * - no em dashes anywhere (house style)
 * - every internal link points at a page that exists
 * - every meta.json entry points at a page or folder that exists
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "../content/docs");
const MIN = 150;
const MAX = 160;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(contentDir);
const pages = files.filter((f) => f.endsWith(".mdx"));

/** URL for a content file: index.mdx maps to its folder. */
function urlFor(file) {
  const rel = relative(contentDir, file).replace(/\.mdx$/, "");
  const url = "/" + rel.replace(/(^|\/)index$/, "");
  return url === "/" ? "/" : url.replace(/\/$/, "");
}
const urls = new Set(pages.map(urlFor));
// Routes served by the app rather than content files.
const appRoutes = ["/llms.txt", "/llms-full.txt", "/sitemap.xml", "/robots.txt"];

const problems = [];
for (const file of pages) {
  const rel = relative(contentDir, file);
  const text = readFileSync(file, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    problems.push(`${rel}: missing frontmatter`);
    continue;
  }
  const title = fm[1].match(/^title:\s*(.+)$/m)?.[1];
  const rawDesc = fm[1].match(/^description:\s*(.+)$/m)?.[1];
  if (!title) problems.push(`${rel}: missing title`);
  for (const [key, value] of [["title", title], ["description", rawDesc]]) {
    // Unquoted ": " is a YAML nested mapping and breaks the MDX build.
    if (value && value.includes(": ") && !/^['"]/.test(value)) problems.push(`${rel}: quote the ${key}, it contains ": "`);
  }
  if (!rawDesc) problems.push(`${rel}: missing description`);
  else {
    const desc = rawDesc.trim().replace(/^(['"])(.*)\1$/, "$2");
    if (desc.length < MIN || desc.length > MAX) problems.push(`${rel}: description is ${desc.length} chars (want ${MIN} to ${MAX})`);
  }
  if (text.includes("\u2014")) problems.push(`${rel}: contains an em dash`);
  // Markdown links and href="..." props that point inside the site.
  const links = [...text.matchAll(/\]\((\/[^)\s#]*)(?:#[^)]*)?\)|href=["'](\/[^"'#]*)/g)].map((m) => m[1] ?? m[2]);
  for (const link of links) {
    const clean = link.replace(/\/$/, "") || "/";
    if (clean.startsWith("/img/") || clean.startsWith("/llms.mdx/") || appRoutes.includes(clean)) continue;
    if (!urls.has(clean)) problems.push(`${rel}: broken link ${link}`);
  }
}

for (const meta of files.filter((f) => f.endsWith("meta.json"))) {
  const dir = dirname(meta);
  const { pages: entries = [] } = JSON.parse(readFileSync(meta, "utf8"));
  for (let entry of entries) {
    if (entry.startsWith("---") || entry === "...") continue;
    if (entry.startsWith("...")) entry = entry.slice(3);
    const target = join(dir, entry);
    if (!existsSync(`${target}.mdx`) && !existsSync(target)) problems.push(`${relative(contentDir, meta)}: "${entry}" does not exist`);
  }
}

if (problems.length) {
  console.error(`check-content: ${problems.length} problem(s)\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`check-content: ${pages.length} pages OK`);
