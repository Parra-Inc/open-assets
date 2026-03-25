import { launch } from "puppeteer";
import { resolve } from "path";
import { writeFileSync, mkdirSync } from "fs";

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
 * Render an HTML file to a PNG buffer at the given dimensions.
 * Scales from sourceSize to target size via CSS zoom.
 */
export async function renderScreenshot(
  projectDir,
  htmlFile,
  width,
  height,
  sourceW,
  sourceH
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

  const buffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width, height },
  });

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
  const outputPath = resolve(outputDir, "AppIcon.png");

  const sw = collection.sourceSize.width;
  const sh = collection.sourceSize.height;

  const buffer = await renderScreenshot(projectDir, template.src, sw, sh, sw, sh);
  writeFileSync(outputPath, buffer);

  console.log(`Updated: ${outputPath}`);
  return outputPath;
}
