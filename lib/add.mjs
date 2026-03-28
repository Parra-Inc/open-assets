import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createInterface } from "readline";
import { loadConfig, saveConfig } from "./manifest.mjs";

// ── Prompt helpers ──────────────────────────────────────────────────────────

function createRL() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  return new Promise((resolve) => {
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

function askSelect(rl, question, options) {
  return new Promise((resolve) => {
    console.log(`\n  ${question}\n`);
    options.forEach((opt, i) => {
      console.log(`    ${i + 1}) ${opt.label}`);
    });
    console.log();
    rl.question("  Enter number: ", (answer) => {
      const idx = parseInt(answer.trim(), 10) - 1;
      if (idx >= 0 && idx < options.length) resolve(options[idx]);
      else resolve(options[0]);
    });
  });
}

// ── HTML / SVG template generators ──────────────────────────────────────────

function generateHTML(name, width, height) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, system-ui, sans-serif;
      color: white;
    }
    .content {
      text-align: center;
      padding: 40px;
    }
    h1 { font-size: ${Math.round(width * 0.08)}px; font-weight: 800; margin-bottom: 16px; }
    p { font-size: ${Math.round(width * 0.04)}px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="content">
    <h1>${name}</h1>
    <p>Edit this template to get started</p>
  </div>
</body>
</html>`;
}

function generateSVG(name, width, height) {
  const fontSize = Math.round(Math.min(width, height) * 0.08);
  const subFontSize = Math.round(fontSize * 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#667eea" />
      <stop offset="100%" stop-color="#764ba2" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <text x="${width / 2}" y="${height / 2 - subFontSize * 0.5}" text-anchor="middle" dominant-baseline="central"
    fill="white" font-family="-apple-system, system-ui, sans-serif"
    font-size="${fontSize}" font-weight="800">${name}</text>
  <text x="${width / 2}" y="${height / 2 + fontSize * 0.7}" text-anchor="middle" dominant-baseline="central"
    fill="white" opacity="0.9" font-family="-apple-system, system-ui, sans-serif"
    font-size="${subFontSize}">Edit this template to get started</text>
</svg>`;
}

// ── Collection presets ──────────────────────────────────────────────────────

const COLLECTION_PRESETS = [
  {
    value: "screenshots",
    label: "App Store Screenshots (440x956, HTML)",
    format: "html",
    id: "screenshots",
    collectionLabel: "Screenshots",
    sourceSize: { width: 440, height: 956 },
    borderRadius: 4,
    tags: ["screenshots"],
    templateDir: "src/screenshots",
    templateName: "01-hero",
    templateLabel: "Hero",
    export: [
      { name: "iphone-6.9", label: 'iPhone 6.9"', size: { width: 1320, height: 2868 } },
      { name: "iphone-6.7", label: 'iPhone 6.7"', size: { width: 1290, height: 2796 } },
      { name: "iphone-6.5", label: 'iPhone 6.5"', size: { width: 1284, height: 2778 } },
      { name: "ipad-13", label: 'iPad 13"', size: { width: 2064, height: 2752 } },
    ],
  },
  {
    value: "icon",
    label: "App Icon (1024x1024, HTML)",
    format: "html",
    id: "icon",
    collectionLabel: "App Icon",
    sourceSize: { width: 1024, height: 1024 },
    borderRadius: 224,
    tags: ["icon"],
    templateDir: "src",
    templateName: "icon",
    templateLabel: "App Icon",
    export: [
      { name: "1024", label: "1024px", size: { width: 1024, height: 1024 } },
      { name: "180", label: "180px", size: { width: 180, height: 180 } },
      { name: "120", label: "120px", size: { width: 120, height: 120 } },
      { name: "512", label: "512px", size: { width: 512, height: 512 } },
      { name: "192", label: "192px", size: { width: 192, height: 192 } },
      { name: "32", label: "Favicon 32", size: { width: 32, height: 32 } },
      { name: "16", label: "Favicon 16", size: { width: 16, height: 16 } },
    ],
  },
  {
    value: "logo",
    label: "Logo (800x800, SVG)",
    format: "svg",
    id: "logo",
    collectionLabel: "Logo",
    sourceSize: { width: 800, height: 800 },
    borderRadius: 0,
    tags: ["logo", "branding"],
    templateDir: "src",
    templateName: "logo",
    templateLabel: "Logo",
    export: [
      { name: "800", label: "800px", size: { width: 800, height: 800 } },
      { name: "400", label: "400px", size: { width: 400, height: 400 } },
      { name: "200", label: "200px", size: { width: 200, height: 200 } },
      { type: "copy-source", format: "svg" },
    ],
  },
  {
    value: "wordmark",
    label: "Wordmark (1200x400, SVG)",
    format: "svg",
    id: "wordmark",
    collectionLabel: "Wordmark",
    sourceSize: { width: 1200, height: 400 },
    borderRadius: 0,
    tags: ["wordmark", "branding"],
    templateDir: "src",
    templateName: "wordmark",
    templateLabel: "Wordmark",
    export: [
      { name: "1200x400", label: "Large", size: { width: 1200, height: 400 } },
      { name: "600x200", label: "Medium", size: { width: 600, height: 200 } },
      { name: "300x100", label: "Small", size: { width: 300, height: 100 } },
      { type: "copy-source", format: "svg" },
    ],
  },
  {
    value: "feature-graphic",
    label: "Feature Graphic / Google Play (1024x500, HTML)",
    format: "html",
    id: "feature-graphic",
    collectionLabel: "Feature Graphic",
    sourceSize: { width: 1024, height: 500 },
    borderRadius: 0,
    tags: ["feature-graphic", "android"],
    templateDir: "src",
    templateName: "feature-graphic",
    templateLabel: "Feature Graphic",
    export: [
      { name: "1024x500", label: "Feature Graphic", size: { width: 1024, height: 500 } },
    ],
  },
  {
    value: "og-image",
    label: "OG Image / Social (1200x630, HTML)",
    format: "html",
    id: "og-image",
    collectionLabel: "OG Image",
    sourceSize: { width: 1200, height: 630 },
    borderRadius: 0,
    tags: ["og-image", "web"],
    templateDir: "src",
    templateName: "og-image",
    templateLabel: "OG Image",
    export: [
      { name: "1200x630", label: "OG Image", size: { width: 1200, height: 630 } },
      { name: "1200x675", label: "Twitter Card", size: { width: 1200, height: 675 } },
    ],
  },
  {
    value: "custom",
    label: "Custom (set your own dimensions and format)",
    format: null,
  },
];

// ── add collection ──────────────────────────────────────────────────────────

export async function addCollection(projectDir, configName) {
  const manifest = loadConfig(projectDir, configName);
  const rl = createRL();

  console.log("\n  Add a new collection\n");

  // 1. Choose from preset or custom
  const preset = await askSelect(rl, "Choose a collection type:", COLLECTION_PRESETS);

  let id, label, sourceSize, borderRadius, format, tags, exportList, templateDir, templateName, templateLabel;

  if (preset.value === "custom") {
    // Custom collection
    id = await ask(rl, "Collection ID (e.g. banners)", "");
    if (!id) { console.log("\n  Aborted.\n"); rl.close(); return; }

    // Check for duplicate early so user doesn't have to fill out all fields
    if (manifest.collections.some((c) => c.id === id)) {
      console.error(`\n  Error: Collection "${id}" already exists in the config.\n`);
      rl.close();
      process.exit(1);
    }

    label = await ask(rl, "Display label", id.charAt(0).toUpperCase() + id.slice(1));

    const widthStr = await ask(rl, "Source width (px)", "800");
    const heightStr = await ask(rl, "Source height (px)", "800");
    sourceSize = { width: parseInt(widthStr, 10), height: parseInt(heightStr, 10) };

    const radiusStr = await ask(rl, "Border radius (px)", "0");
    borderRadius = parseInt(radiusStr, 10);

    const formatChoice = await askSelect(rl, "Template format:", [
      { label: "HTML", value: "html" },
      { label: "SVG", value: "svg" },
    ]);
    format = formatChoice.value;

    tags = [id];
    exportList = [
      { name: `${sourceSize.width}x${sourceSize.height}`, label: "Source Size", size: { width: sourceSize.width, height: sourceSize.height } },
    ];
    if (format === "svg") {
      exportList.push({ type: "copy-source", format: "svg" });
    }
    templateDir = `src/${id}` === `src/${id}` && id.includes("/") ? `src` : (sourceSize.width === sourceSize.height ? "src" : `src/${id}`);
    templateDir = `src`;
    templateName = id;
    templateLabel = label;
  } else {
    // Preset
    id = preset.id;
    label = preset.collectionLabel;
    sourceSize = preset.sourceSize;
    borderRadius = preset.borderRadius;
    format = preset.format;
    tags = preset.tags;
    exportList = preset.export;
    templateDir = preset.templateDir;
    templateName = preset.templateName;
    templateLabel = preset.templateLabel;
  }

  rl.close();

  // Check for duplicate collection ID
  if (manifest.collections.some((c) => c.id === id)) {
    console.error(`\n  Error: Collection "${id}" already exists in the config.\n`);
    process.exit(1);
  }

  // Create template file
  const ext = format === "svg" ? "svg" : "html";
  const templateSrc = `${templateDir}/${templateName}.${ext}`;
  const templatePath = join(projectDir, templateSrc);

  mkdirSync(dirname(templatePath), { recursive: true });

  const content = format === "svg"
    ? generateSVG(templateLabel, sourceSize.width, sourceSize.height)
    : generateHTML(templateLabel, sourceSize.width, sourceSize.height);

  writeFileSync(templatePath, content);
  console.log(`\n  Created ${templateSrc}`);

  // Build collection
  const collection = {
    id,
    label,
    tags,
    sourceSize,
    borderRadius,
    templates: [
      { src: templateSrc, name: templateName, label: templateLabel },
    ],
    export: exportList,
  };

  manifest.collections.push(collection);

  // Update global tags
  if (!manifest.tags) manifest.tags = [];
  for (const tag of tags) {
    if (!manifest.tags.some((t) => t.id === tag)) {
      manifest.tags.push({ id: tag, label: tag.charAt(0).toUpperCase() + tag.slice(1) });
    }
  }

  saveConfig(projectDir, configName, manifest);
  console.log(`  Added collection "${id}" to ${configName}`);
  console.log();
}

// ── add template ────────────────────────────────────────────────────────────

export async function addTemplate(projectDir, configName) {
  const manifest = loadConfig(projectDir, configName);
  const rl = createRL();

  console.log("\n  Add a new template to an existing collection\n");

  if (manifest.collections.length === 0) {
    console.error("  Error: No collections found. Run `open-assets add collection` first.\n");
    rl.close();
    process.exit(1);
  }

  // 1. Pick collection
  const colChoice = await askSelect(
    rl,
    "Which collection?",
    manifest.collections.map((c) => ({ label: `${c.label} (${c.id})`, value: c.id }))
  );
  const col = manifest.collections.find((c) => c.id === colChoice.value);

  // 2. Template name
  const name = await ask(rl, "Template name (e.g. 02-features)", "");
  if (!name) { console.log("\n  Aborted.\n"); rl.close(); return; }

  // Check for duplicate
  if (col.templates.some((t) => t.name === name)) {
    console.error(`\n  Error: Template "${name}" already exists in collection "${col.id}".\n`);
    rl.close();
    process.exit(1);
  }

  const label = await ask(rl, "Display label", name);

  // 3. Choose format
  const existingFormat = col.templates[0]?.src?.endsWith(".svg") ? "svg" : "html";
  const formatChoice = await askSelect(rl, "Template format:", [
    { label: "HTML", value: "html" },
    { label: "SVG", value: "svg" },
  ].sort((a, b) => (a.value === existingFormat ? -1 : 1)));
  const format = formatChoice.value;

  rl.close();

  // Determine template directory from existing templates
  const existingSrc = col.templates[0]?.src || `src/${col.id}`;
  const templateDir = dirname(existingSrc);

  const ext = format === "svg" ? "svg" : "html";
  const templateSrc = `${templateDir}/${name}.${ext}`;
  const templatePath = join(projectDir, templateSrc);

  mkdirSync(dirname(templatePath), { recursive: true });

  const content = format === "svg"
    ? generateSVG(label, col.sourceSize.width, col.sourceSize.height)
    : generateHTML(label, col.sourceSize.width, col.sourceSize.height);

  writeFileSync(templatePath, content);
  console.log(`\n  Created ${templateSrc}`);

  col.templates.push({ src: templateSrc, name, label });

  saveConfig(projectDir, configName, manifest);
  console.log(`  Added template "${name}" to collection "${col.id}"`);
  console.log();
}

// ── add size ────────────────────────────────────────────────────────────────

export async function addSize(projectDir, configName) {
  const manifest = loadConfig(projectDir, configName);
  const rl = createRL();

  console.log("\n  Add a new export size to a collection\n");

  if (manifest.collections.length === 0) {
    console.error("  Error: No collections found. Run `open-assets add collection` first.\n");
    rl.close();
    process.exit(1);
  }

  // 1. Pick collection
  const colChoice = await askSelect(
    rl,
    "Which collection?",
    manifest.collections.map((c) => ({ label: `${c.label} (${c.id})`, value: c.id }))
  );
  const col = manifest.collections.find((c) => c.id === colChoice.value);

  // 2. Choose from common presets or custom
  const sizePresets = [
    { label: 'iPhone 6.9" (1320x2868)', value: { name: "iphone-6.9", label: 'iPhone 6.9"', size: { width: 1320, height: 2868 } } },
    { label: 'iPhone 6.7" (1290x2796)', value: { name: "iphone-6.7", label: 'iPhone 6.7"', size: { width: 1290, height: 2796 } } },
    { label: 'iPhone 6.5" (1284x2778)', value: { name: "iphone-6.5", label: 'iPhone 6.5"', size: { width: 1284, height: 2778 } } },
    { label: 'iPhone 6.1" (1179x2556)', value: { name: "iphone-6.1", label: 'iPhone 6.1"', size: { width: 1179, height: 2556 } } },
    { label: 'iPad 13" (2064x2752)', value: { name: "ipad-13", label: 'iPad 13"', size: { width: 2064, height: 2752 } } },
    { label: 'iPad 12.9" (2048x2732)', value: { name: "ipad-12.9", label: 'iPad 12.9"', size: { width: 2048, height: 2732 } } },
    { label: "Google Play Phone (1080x1920)", value: { name: "phone", label: "Phone", size: { width: 1080, height: 1920 } } },
    { label: 'Google Play 7" Tablet (1200x1920)', value: { name: "tablet-7", label: '7" Tablet', size: { width: 1200, height: 1920 } } },
    { label: "Mac App Store Retina (2880x1800)", value: { name: "mac-retina", label: "Mac Retina", size: { width: 2880, height: 1800 } } },
    { label: "OG Image (1200x630)", value: { name: "1200x630", label: "OG Image", size: { width: 1200, height: 630 } } },
    { label: "Twitter Card (1200x675)", value: { name: "1200x675", label: "Twitter Card", size: { width: 1200, height: 675 } } },
    { label: "Product Hunt Gallery (1270x760)", value: { name: "1270x760", label: "Product Hunt", size: { width: 1270, height: 760 } } },
    { label: "Custom dimensions", value: "custom" },
  ];

  const sizeChoice = await askSelect(rl, "Choose a size:", sizePresets);

  let newSize;

  if (sizeChoice.value === "custom") {
    const name = await ask(rl, "Size name (e.g. tablet-10)", "");
    if (!name) { console.log("\n  Aborted.\n"); rl.close(); return; }

    const label = await ask(rl, "Display label", name);
    const widthStr = await ask(rl, "Width (px)", "");
    const heightStr = await ask(rl, "Height (px)", "");

    if (!widthStr || !heightStr) {
      console.log("\n  Width and height are required. Aborted.\n");
      rl.close();
      return;
    }

    newSize = { name, label, size: { width: parseInt(widthStr, 10), height: parseInt(heightStr, 10) } };
  } else {
    newSize = sizeChoice.value;
  }

  rl.close();

  // Check for duplicate size name in this collection
  const allSizes = col.export || [];
  if (allSizes.some((s) => s.name === newSize.name)) {
    console.error(`\n  Error: Size "${newSize.name}" already exists in collection "${col.id}".\n`);
    process.exit(1);
  }

  if (!col.export) col.export = [];
  col.export.push(newSize);

  saveConfig(projectDir, configName, manifest);
  console.log(`\n  Added size "${newSize.name}" (${newSize.size.width}x${newSize.size.height}) to collection "${col.id}"`);
  console.log();
}
