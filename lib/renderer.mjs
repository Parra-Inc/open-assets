import { launch } from "puppeteer";
import { resolve } from "path";
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";

let browser = null;

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Render an HTML file to an image buffer at the given dimensions.
 * Scales from sourceSize to target size via CSS zoom.
 * @param {string} projectDir
 * @param {string} htmlFile
 * @param {number} width
 * @param {number} height
 * @param {number} sourceW
 * @param {number} sourceH
 * @param {{ format?: "png"|"jpeg", quality?: number, background?: string }} [options]
 */
export async function renderScreenshot(
  projectDir,
  htmlFile,
  width,
  height,
  sourceW,
  sourceH,
  options = {}
) {
  const b = await getBrowser();
  const page = await b.newPage();

  const scale = Math.max(width / sourceW, height / sourceH);

  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const filePath = resolve(projectDir, htmlFile);
  await page.goto(`file://${filePath}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));

  if (scale !== 1) {
    await page.evaluate((z) => {
      document.documentElement.style.zoom = z;
    }, scale);
    await new Promise((r) => setTimeout(r, 200));
  }

  // Handle background: transparent by default for PNG, or use specified color
  const bg = options.background;
  if (bg) {
    await page.evaluate((color) => {
      document.documentElement.style.backgroundColor = color;
    }, bg);
  }

  const format = options.format || "png";
  const screenshotOpts = {
    type: format,
    clip: { x: 0, y: 0, width, height },
  };
  if (format === "png" && !bg) {
    screenshotOpts.omitBackground = true;
  }
  if (format === "jpeg" && options.quality) {
    screenshotOpts.quality = options.quality;
  }

  const buffer = await page.screenshot(screenshotOpts);

  await page.close();
  return buffer;
}

/**
 * Run xcode output: render the icon template at 1024x1024 and write to the asset catalog.
 */
export async function runXcodeOutput(projectDir, collection, outputConfig) {
  const template = collection.templates[0];
  if (!template) {
    throw new Error(`Collection "${collection.id}" has no templates for Xcode output`);
  }

  const outputDir = resolve(projectDir, outputConfig.path);
  mkdirSync(outputDir, { recursive: true });

  const sw = collection.sourceSize.width;
  const sh = collection.sourceSize.height;
  const filename = "AppIcon.png";
  const outputPath = resolve(outputDir, filename);

  // Remove stale images that don't match the current output filename
  for (const entry of readdirSync(outputDir)) {
    if (entry !== filename && /\.(png|jpg|jpeg)$/i.test(entry)) {
      unlinkSync(resolve(outputDir, entry));
    }
  }

  const buffer = await renderScreenshot(projectDir, template.src, sw, sh, sw, sh);
  writeFileSync(outputPath, buffer);

  const contentsJson = {
    images: [
      {
        filename,
        idiom: "universal",
        platform: "ios",
        size: `${sw}x${sh}`,
      },
    ],
    info: {
      author: "xcode",
      version: 1,
    },
  };
  const contentsPath = resolve(outputDir, "Contents.json");
  writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2) + "\n");

  console.log(`Updated: ${outputPath}`);
  return outputPath;
}
