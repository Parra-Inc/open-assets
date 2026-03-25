import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { createInterface } from "readline";

// ── Prompt helpers (zero dependencies) ──────────────────────────────────────

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

function askConfirm(rl, question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  return new Promise((resolve) => {
    rl.question(`  ${question} [${hint}]: `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultYes);
      else resolve(a === "y" || a === "yes");
    });
  });
}

function askCheckbox(rl, question, options) {
  return new Promise((resolve) => {
    console.log(`\n  ${question}\n`);
    options.forEach((opt, i) => {
      console.log(`    ${i + 1}) ${opt.label}`);
    });
    console.log();
    rl.question("  Enter numbers separated by commas (e.g. 1,2,3): ", (answer) => {
      const indices = answer
        .split(",")
        .map((s) => parseInt(s.trim(), 10) - 1)
        .filter((i) => i >= 0 && i < options.length);
      resolve(indices.map((i) => options[i].value));
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
      if (idx >= 0 && idx < options.length) resolve(options[idx].value);
      else resolve(options[0].value);
    });
  });
}

// ── Asset type presets ──────────────────────────────────────────────────────

const ASSET_TYPES = {
  screenshots: {
    label: "App Store Screenshots",
    collection: (platforms) => {
      const exportSizes = [];

      if (platforms.includes("ios")) {
        exportSizes.push({
          platform: "App Store",
          sizes: [
            { name: "iphone-6.9", label: 'iPhone 6.9"', width: 1320, height: 2868 },
            { name: "iphone-6.7", label: 'iPhone 6.7"', width: 1290, height: 2796 },
            { name: "iphone-6.5", label: 'iPhone 6.5"', width: 1284, height: 2778 },
            { name: "ipad-13", label: 'iPad 13"', width: 2064, height: 2752 },
          ],
        });
      }

      if (platforms.includes("android")) {
        exportSizes.push({
          platform: "Google Play",
          sizes: [
            { name: "phone", label: "Phone", width: 1080, height: 1920 },
            { name: "tablet-7", label: '7" Tablet', width: 1200, height: 1920 },
            { name: "tablet-10", label: '10" Tablet', width: 1600, height: 2560 },
          ],
        });
      }

      return {
        id: "screenshots",
        label: "Screenshots",
        tags: ["screenshots", ...platforms],
        sourceSize: { width: 440, height: 956 },
        borderRadius: 4,
        templates: [
          { src: "src/screenshots/01-hero.html", name: "01-hero", label: "Hero" },
        ],
        exportSizes,
        customExport: { defaultWidth: 1320, defaultHeight: 2868 },
      };
    },
    dirs: ["src/screenshots"],
    files: {
      "src/screenshots/01-hero.html": (name) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="../dist/styles.css" />
  <style>
    body {
      margin: 0;
      width: 440px;
      height: 956px;
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
    h1 { font-size: 36px; font-weight: 800; margin-bottom: 16px; }
    p { font-size: 18px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="content">
    <h1>${name}</h1>
    <p>A compelling tagline for your app store listing</p>
  </div>
</body>
</html>`,
    },
  },

  icon: {
    label: "App Icon",
    collection: (platforms) => {
      const exportSizes = [];

      if (platforms.includes("ios")) {
        exportSizes.push({
          platform: "Apple",
          sizes: [
            { name: "1024", label: "1024px", width: 1024, height: 1024 },
            { name: "180", label: "180px", width: 180, height: 180 },
            { name: "120", label: "120px", width: 120, height: 120 },
            { name: "87", label: "87px", width: 87, height: 87 },
            { name: "80", label: "80px", width: 80, height: 80 },
            { name: "60", label: "60px", width: 60, height: 60 },
            { name: "40", label: "40px", width: 40, height: 40 },
          ],
        });
      }

      if (platforms.includes("android")) {
        exportSizes.push({
          platform: "Android",
          sizes: [
            { name: "512", label: "Play Store", width: 512, height: 512 },
            { name: "192", label: "xxxhdpi", width: 192, height: 192 },
            { name: "144", label: "xxhdpi", width: 144, height: 144 },
            { name: "96", label: "xhdpi", width: 96, height: 96 },
            { name: "72", label: "hdpi", width: 72, height: 72 },
            { name: "48", label: "mdpi", width: 48, height: 48 },
          ],
        });
      }

      if (platforms.includes("web")) {
        exportSizes.push({
          platform: "Web",
          sizes: [
            { name: "512", label: "512px", width: 512, height: 512 },
            { name: "192", label: "192px", width: 192, height: 192 },
            { name: "180", label: "Apple Touch", width: 180, height: 180 },
            { name: "32", label: "Favicon 32", width: 32, height: 32 },
            { name: "16", label: "Favicon 16", width: 16, height: 16 },
          ],
        });
      }

      return {
        id: "icon",
        label: "App Icon",
        tags: ["icon", ...platforms],
        sourceSize: { width: 1024, height: 1024 },
        borderRadius: 224,
        templates: [
          { src: "src/icon.html", name: "icon", label: "App Icon" },
        ],
        exportSizes,
      };
    },
    dirs: [],
    files: {
      "src/icon.html": (name) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      width: 1024px;
      height: 1024px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, system-ui, sans-serif;
    }
    .icon-text {
      font-size: 400px;
      font-weight: 900;
      color: white;
    }
  </style>
</head>
<body>
  <div class="icon-text">${name.charAt(0).toUpperCase()}</div>
</body>
</html>`,
    },
  },

  logo: {
    label: "Logo",
    collection: () => ({
      id: "logo",
      label: "Logo",
      tags: ["logo", "branding"],
      sourceSize: { width: 800, height: 800 },
      borderRadius: 0,
      templates: [
        { src: "src/logo.html", name: "logo", label: "Logo" },
      ],
      exportSizes: [
        {
          platform: "General",
          sizes: [
            { name: "800", label: "800px", width: 800, height: 800 },
            { name: "400", label: "400px", width: 400, height: 400 },
            { name: "200", label: "200px", width: 200, height: 200 },
            { name: "64", label: "64px", width: 64, height: 64 },
          ],
        },
      ],
    }),
    dirs: [],
    files: {
      "src/logo.html": (name) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      width: 800px;
      height: 800px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      font-family: -apple-system, system-ui, sans-serif;
    }
    .logo {
      width: 600px;
      height: 600px;
      border-radius: 120px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-text {
      font-size: 280px;
      font-weight: 900;
      color: white;
    }
  </style>
</head>
<body>
  <div class="logo">
    <div class="logo-text">${name.charAt(0).toUpperCase()}</div>
  </div>
</body>
</html>`,
    },
  },

  wordmark: {
    label: "Wordmark",
    collection: () => ({
      id: "wordmark",
      label: "Wordmark",
      tags: ["wordmark", "branding"],
      sourceSize: { width: 1200, height: 400 },
      borderRadius: 0,
      templates: [
        { src: "src/wordmark.html", name: "wordmark", label: "Wordmark" },
      ],
      exportSizes: [
        {
          platform: "General",
          sizes: [
            { name: "1200x400", label: "Large", width: 1200, height: 400 },
            { name: "600x200", label: "Medium", width: 600, height: 200 },
            { name: "300x100", label: "Small", width: 300, height: 100 },
          ],
        },
      ],
    }),
    dirs: [],
    files: {
      "src/wordmark.html": (name) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      width: 1200px;
      height: 400px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      font-family: -apple-system, system-ui, sans-serif;
    }
    .wordmark {
      font-size: 120px;
      font-weight: 900;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  </style>
</head>
<body>
  <div class="wordmark">${name}</div>
</body>
</html>`,
    },
  },

  "feature-graphic": {
    label: "Feature Graphic (Google Play)",
    collection: () => ({
      id: "feature-graphic",
      label: "Feature Graphic",
      tags: ["feature-graphic", "android"],
      sourceSize: { width: 1024, height: 500 },
      borderRadius: 0,
      templates: [
        { src: "src/feature-graphic.html", name: "feature-graphic", label: "Feature Graphic" },
      ],
      exportSizes: [
        {
          platform: "Google Play",
          sizes: [
            { name: "1024x500", label: "Feature Graphic", width: 1024, height: 500 },
          ],
        },
      ],
    }),
    dirs: [],
    files: {
      "src/feature-graphic.html": (name) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      width: 1024px;
      height: 500px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, system-ui, sans-serif;
      color: white;
    }
    .content { text-align: center; }
    h1 { font-size: 64px; font-weight: 900; margin: 0 0 16px; }
    p { font-size: 24px; opacity: 0.9; margin: 0; }
  </style>
</head>
<body>
  <div class="content">
    <h1>${name}</h1>
    <p>Your app tagline goes here</p>
  </div>
</body>
</html>`,
    },
  },
};

// ── Main interactive flow ───────────────────────────────────────────────────

export async function scaffoldProject(dir) {
  const manifestPath = join(dir, "manifest.json");

  if (existsSync(manifestPath)) {
    console.error("Error: manifest.json already exists in this directory.");
    process.exit(1);
  }

  const rl = createRL();

  console.log("\n  Welcome to open-assets!\n");
  console.log("  This will set up your asset project with a manifest.json");
  console.log("  and starter HTML templates.\n");

  // 1. Project name
  const defaultName = basename(dir) || "My App";
  const projectName = await ask(rl, "Project name", defaultName);

  // 2. Select asset types
  const assetTypes = await askCheckbox(rl, "Which assets do you need?", [
    { label: "App Store Screenshots", value: "screenshots" },
    { label: "App Icon", value: "icon" },
    { label: "Logo", value: "logo" },
    { label: "Wordmark", value: "wordmark" },
    { label: "Feature Graphic (Google Play)", value: "feature-graphic" },
  ]);

  if (assetTypes.length === 0) {
    console.log("\n  No asset types selected. Aborting.\n");
    rl.close();
    return;
  }

  // 3. Platform targeting (for screenshots and icon)
  let platforms = [];
  const needsPlatforms = assetTypes.includes("screenshots") || assetTypes.includes("icon");

  if (needsPlatforms) {
    platforms = await askCheckbox(rl, "Which platforms are you targeting?", [
      { label: "iOS / App Store", value: "ios" },
      { label: "Android / Google Play", value: "android" },
      { label: "Web", value: "web" },
    ]);

    if (platforms.length === 0) {
      platforms = ["ios"]; // sensible default
      console.log("  Defaulting to iOS.\n");
    }
  }

  // 4. Confirm
  console.log(`\n  Project: ${projectName}`);
  console.log(`  Assets:  ${assetTypes.map((t) => ASSET_TYPES[t].label).join(", ")}`);
  if (platforms.length > 0) {
    console.log(`  Platforms: ${platforms.join(", ")}`);
  }

  const confirmed = await askConfirm(rl, "\nProceed?");
  rl.close();

  if (!confirmed) {
    console.log("\n  Aborted.\n");
    return;
  }

  console.log();

  // ── Generate files ──────────────────────────────────────────────────────

  // Create base directories
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "dist"), { recursive: true });
  mkdirSync(join(dir, "public"), { recursive: true });

  // Build collections and create files for each asset type
  const collections = [];

  for (const typeKey of assetTypes) {
    const assetType = ASSET_TYPES[typeKey];

    // Create sub-directories
    for (const subDir of assetType.dirs) {
      mkdirSync(join(dir, subDir), { recursive: true });
    }

    // Create HTML template files
    for (const [relPath, templateFn] of Object.entries(assetType.files)) {
      const filePath = join(dir, relPath);
      mkdirSync(join(dir, relPath, ".."), { recursive: true });
      writeFileSync(filePath, templateFn(projectName));
      console.log(`  Created ${relPath}`);
    }

    // Build collection config
    const collection = assetType.collection(platforms);
    collections.push(collection);
  }

  // Collect all unique tags across collections into a top-level registry
  const tagSet = new Set();
  for (const col of collections) {
    for (const t of col.tags || []) tagSet.add(t);
  }
  const tags = [...tagSet].map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));

  // Build manifest
  const manifest = {
    version: 1,
    name: `${projectName} Assets`,
    publicDir: "public",
    command: "npx open-assets render --all",
    tags,
    collections,
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("  Created manifest.json");

  // Write .gitignore
  writeFileSync(join(dir, ".gitignore"), "dist/\nexports/\nmanifest.lock\nnode_modules/\n");
  console.log("  Created .gitignore");

  console.log();
  console.log("  Done! Next steps:");
  console.log("    1. Edit the HTML files in src/ to design your assets");
  console.log("    2. Run: open-assets dev");
  console.log("    3. Open the browser to preview and export");
  console.log();
}
