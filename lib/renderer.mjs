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
 * Files are resolved relative to the project directory.
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
 * Render the icon tab and save it to the Xcode output path.
 */
export async function renderAndSaveIcon(projectDir, manifest) {
  const iconTab = manifest.tabs.find((t) => t.type === "icon");
  if (!iconTab) {
    throw new Error("No icon tab found in manifest.json");
  }

  const iconHtml = resolve(projectDir, iconTab.sourceFile);
  if (!iconTab.xcodeOutputDir) {
    throw new Error("Icon tab has no xcodeOutputDir configured");
  }

  const outputDir = resolve(projectDir, iconTab.xcodeOutputDir);
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "AppIcon.png");

  const b = await getBrowser();
  const page = await b.newPage();

  const w = iconTab.sourceWidth || 1024;
  const h = iconTab.sourceHeight || 1024;

  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`file://${iconHtml}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({
    path: outputPath,
    type: "png",
    clip: { x: 0, y: 0, width: w, height: h },
  });

  await page.close();
  console.log(`Updated: ${outputPath}`);
  return outputPath;
}
