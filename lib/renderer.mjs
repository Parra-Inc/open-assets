import { launch } from "puppeteer";
import { resolve } from "path";
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";

// The browser is launched once per process and shared. Storing the launch
// promise (not the instance) makes concurrent callers await the same launch
// instead of racing to spawn duplicate Chromium processes.
let browserPromise = null;

// Pages are pooled and reused across renders: page.goto fully replaces the
// document, and newPage()/close() cost 100-300ms per image in headless mode.
const pagePool = [];

async function getBrowser() {
  for (;;) {
    if (!browserPromise) {
      browserPromise = launch({
        headless: true,
        // Pages render concurrently; without these flags Chromium throttles
        // timers and frames in non-active tabs, stalling background renders.
        args: [
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
        ],
      }).catch((err) => {
        browserPromise = null;
        throw err;
      });
    }
    const current = browserPromise;
    const browser = await current;
    if (browser.connected) return browser;
    // Browser died; clear the cached promise (unless someone already
    // replaced it) and relaunch.
    if (browserPromise === current) browserPromise = null;
  }
}

/**
 * Pre-launch the shared browser so the first render doesn't pay the ~2s
 * launch cost interactively.
 */
export function warmupBrowser() {
  return getBrowser();
}

// CDP sessions used to keep pooled pages renderable while they sit in the
// background. Keyed weakly so a closed page's session is not retained.
const pageSessions = new WeakMap();

async function acquirePage() {
  const browser = await getBrowser();
  while (pagePool.length > 0) {
    const page = pagePool.pop();
    // Drop pages tied to a closed or replaced browser instance
    if (!page.isClosed() && page.browser() === browser) return page;
  }
  // Every page gets its own browser context, which puts it in its own window.
  // Pages sharing a context are tabs in one window, and headless Chrome only
  // drives the rendering pipeline for the active tab: the rest are frozen, so
  // anything that waits on that pipeline (timers, document.fonts.ready,
  // img.decode()) never settles and the render hangs until protocolTimeout.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  // Separate windows still compete for focus, so tell each page to consider
  // itself focused. Without this a page can be treated as occluded and stall
  // the same way a background tab does.
  try {
    const session = await page.createCDPSession();
    await session.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    pageSessions.set(page, session);
  } catch {
    // Best-effort: the browser context already prevents the hard stall.
  }
  return page;
}

/**
 * Assert that a page is in the "active" lifecycle state. Chromium may freeze a
 * page that has been idle in the pool; a frozen page runs no timers, so the
 * readiness barrier in settle() would never resolve.
 */
async function activatePage(page) {
  const session = pageSessions.get(page);
  if (!session) return;
  try {
    await session.send("Page.setWebLifecycleState", { state: "active" });
  } catch {
    // Best-effort; not all builds implement this on every target.
  }
}

function releasePage(page) {
  if (page && !page.isClosed()) pagePool.push(page);
}

export async function closeBrowser() {
  pagePool.length = 0;
  if (browserPromise) {
    const pending = browserPromise;
    browserPromise = null;
    try {
      const browser = await pending;
      await browser.close();
    } catch {
      // Launch already failed; nothing to close.
    }
  }
}

/**
 * Deterministic readiness barrier, replacing fixed sleeps: yields a macrotask
 * (so MutationObserver-driven DOM updates like locale image swaps have run),
 * forces a layout (so font loads triggered by first layout have started),
 * then waits for fonts and image decodes. No frame waits here: rAF can stall
 * indefinitely in a non-active tab, and the screenshot capture itself forces
 * a fresh frame that flushes pending style and layout.
 */
async function settle(page) {
  await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 0));
    document.documentElement.getBoundingClientRect();
    await document.fonts.ready;
    const images = document.images ? Array.from(document.images) : [];
    await Promise.all(images.map((img) => img.decode().catch(() => {})));
  });
}

/**
 * Render an HTML file at multiple sizes from a single navigation.
 * The page is loaded (and localized) once; each variant re-applies
 * viewport + CSS zoom and takes its own screenshot.
 *
 * @param {string} projectDir
 * @param {string} htmlFile
 * @param {number} sourceW
 * @param {number} sourceH
 * @param {{ width: number, height: number, format?: "png"|"jpeg", quality?: number }[]} variants
 * @param {{ background?: string, localization?: { strings: object, locale: string, direction: string }, timeout?: number }} [options]
 * @returns {Promise<Buffer[]>} Screenshot buffers in variant order
 */
export async function renderVariants(
  projectDir,
  htmlFile,
  sourceW,
  sourceH,
  variants,
  options = {}
) {
  const page = await acquirePage();
  try {
    await activatePage(page);
    const first = variants[0];
    await page.setViewport({
      width: first.width,
      height: first.height,
      deviceScaleFactor: 1,
    });

    const filePath = resolve(projectDir, htmlFile);
    await page.goto(`file://${filePath}`, {
      waitUntil: "load",
      timeout: options.timeout || 30000,
    });

    // Inject localized strings and set lang before rendering
    if (options.localization) {
      const { strings, locale, direction } = options.localization;
      await page.evaluate((strings, locale, dir) => {
        // Set lang on root for font selection; do NOT set dir on root
        // because it flips the entire CSS layout (flexbox, margins, etc.)
        // which breaks fixed-pixel marketing layouts.
        document.documentElement.lang = locale;

        const formatter = new Intl.NumberFormat(locale);

        function processValue(value) {
          return value.replace(/\{\{n:(\d+(?:\.\d+)?)\}\}/g, (_, num) => {
            return formatter.format(parseFloat(num));
          });
        }

        const walker = document.createTreeWalker(
          document.documentElement,
          NodeFilter.SHOW_TEXT
        );
        while (walker.nextNode()) {
          const node = walker.currentNode;
          let text = node.textContent;
          let changed = false;
          text = text.replace(/\{\{([a-zA-Z_][\w.]*)\}\}/g, (match, key) => {
            if (strings[key] !== undefined) {
              changed = true;
              return processValue(strings[key]);
            }
            return match;
          });
          if (changed) {
            node.textContent = text;
            // Apply text direction on the parent element so RTL text
            // renders correctly without flipping the overall page layout.
            if (dir === "rtl") {
              node.parentElement.dir = dir;
            }
          }
        }
      }, strings, locale, direction);
    }

    // Handle background: transparent by default for PNG, or use specified color
    if (options.background) {
      await page.evaluate((color) => {
        document.documentElement.style.backgroundColor = color;
      }, options.background);
    }

    await settle(page);

    const buffers = [];
    for (const variant of variants) {
      const { width, height } = variant;
      await page.setViewport({ width, height, deviceScaleFactor: 1 });

      const scale = Math.max(width / sourceW, height / sourceH);
      // Always assign zoom (clearing it at scale 1) so a previous variant's
      // zoom can't leak into this one, and freeze animations at t=0 so the
      // capture is deterministic. The screenshot's forced frame applies both.
      await page.evaluate((zoom) => {
        document.documentElement.style.zoom = zoom;
        for (const anim of document.getAnimations()) {
          try {
            anim.pause();
            anim.currentTime = 0;
          } catch {
            // Some animations (e.g. infinite transitions) can reject; skip.
          }
        }
      }, scale === 1 ? "" : String(scale));

      const format = variant.format || "png";
      const screenshotOpts = {
        type: format,
        clip: { x: 0, y: 0, width, height },
      };
      if (format === "png" && !options.background) {
        screenshotOpts.omitBackground = true;
      }
      if (format === "jpeg" && variant.quality) {
        screenshotOpts.quality = variant.quality;
      }
      buffers.push(await page.screenshot(screenshotOpts));
    }

    return buffers;
  } finally {
    releasePage(page);
  }
}

/**
 * Render an HTML file to an image buffer at the given dimensions.
 * Scales from sourceSize to target size via CSS zoom.
 * Single-variant wrapper around renderVariants.
 * @param {string} projectDir
 * @param {string} htmlFile
 * @param {number} width
 * @param {number} height
 * @param {number} sourceW
 * @param {number} sourceH
 * @param {{ format?: "png"|"jpeg", quality?: number, background?: string, localization?: { strings: object, locale: string, direction: string }, timeout?: number }} [options]
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
  const [buffer] = await renderVariants(
    projectDir,
    htmlFile,
    sourceW,
    sourceH,
    [{ width, height, format: options.format, quality: options.quality }],
    options
  );
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
