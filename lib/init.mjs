import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const SAMPLE_MANIFEST = {
  version: 1,
  name: "My App Assets",
  publicDir: "public",
  command: "npx open-assets render --all-presets",
  tabs: [
    {
      id: "screenshots",
      label: "Screenshots",
      type: "iframe-gallery",
      sourceWidth: 440,
      sourceHeight: 956,
      borderRadius: 4,
      items: [
        {
          src: "src/screenshots/01-hero.html",
          name: "01-hero",
          label: "Hero",
        },
      ],
      exportPresets: [
        {
          section: "App Store",
          presets: [
            {
              label: "iPhone 6.7\"",
              width: 1320,
              height: 2868,
              zipName: "appstore-6.7",
            },
            {
              label: "iPhone 6.5\"",
              width: 1284,
              height: 2778,
              zipName: "appstore-6.5",
            },
          ],
        },
      ],
      customExport: {
        defaultWidth: 1320,
        defaultHeight: 2868,
      },
    },
    {
      id: "icon",
      label: "App Icon",
      type: "icon",
      sourceFile: "src/icon.html",
      sourceWidth: 1024,
      sourceHeight: 1024,
      borderRadius: 180,
    },
  ],
};

const SAMPLE_SCREENSHOT_HTML = `<!DOCTYPE html>
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
    <h1>Your App Name</h1>
    <p>A compelling tagline for your app store listing</p>
  </div>
</body>
</html>`;

const SAMPLE_ICON_HTML = `<!DOCTYPE html>
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
  <div class="icon-text">A</div>
</body>
</html>`;

export async function scaffoldProject(dir) {
  const manifestPath = join(dir, "manifest.json");

  if (existsSync(manifestPath)) {
    console.error("Error: manifest.json already exists in this directory.");
    process.exit(1);
  }

  // Create directories
  mkdirSync(join(dir, "src", "screenshots"), { recursive: true });
  mkdirSync(join(dir, "dist"), { recursive: true });
  mkdirSync(join(dir, "public"), { recursive: true });

  // Write manifest
  writeFileSync(manifestPath, JSON.stringify(SAMPLE_MANIFEST, null, 2) + "\n");
  console.log("  Created manifest.json");

  // Write sample screenshot
  writeFileSync(
    join(dir, "src", "screenshots", "01-hero.html"),
    SAMPLE_SCREENSHOT_HTML
  );
  console.log("  Created src/screenshots/01-hero.html");

  // Write sample icon
  writeFileSync(join(dir, "src", "icon.html"), SAMPLE_ICON_HTML);
  console.log("  Created src/icon.html");

  // Write .gitignore
  const gitignoreContent = `dist/\nexports/\nmanifest.lock\nnode_modules/\n`;
  writeFileSync(join(dir, ".gitignore"), gitignoreContent);
  console.log("  Created .gitignore");

  console.log();
  console.log("Done! Next steps:");
  console.log("  1. Edit the HTML files in src/ to design your assets");
  console.log("  2. Run: open-assets dev");
  console.log("  3. Open the browser to preview and export");
  console.log();
}
