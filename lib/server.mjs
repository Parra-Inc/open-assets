import { createServer } from "http";
import { readFileSync, existsSync, statSync, watch } from "fs";
import { resolve, join, extname } from "path";
import { fileURLToPath } from "url";
import { loadLocalizations, resolveStrings, getLocales, getDirection } from "./localization.mjs";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const VIEWER_PATH = join(__dirname, "..", "public", "viewer.html");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export function getMime(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function serveFile(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const mime = getMime(filePath);
  const content = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": mime });
  res.end(content);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

/**
 * @param {string} projectDir
 * @param {object} [options]
 * @param {{ renderScreenshot: Function, runXcodeOutput: Function, closeBrowser: Function }} [renderer]
 *   Optional renderer dependency injection. Falls back to importing ./renderer.mjs.
 */
export async function startServer(projectDir, options = {}, renderer) {
  if (!renderer) {
    renderer = await import("./renderer.mjs");
  }
  const { renderScreenshot, runXcodeOutput, closeBrowser } = renderer;

  const port = options.port || 3200;
  const host = options.host || "localhost";
  const quiet = options.quiet || false;
  const manifestPath = options.manifestPath || resolve(projectDir, "assets.json");
  const staticDirs = (options.staticDirs || []).map((d) => resolve(d));

  const log = quiet ? () => {} : console.log.bind(console);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  // Auto-serve publicDir from manifest
  if (manifest.publicDir) {
    const publicDirPath = resolve(projectDir, manifest.publicDir);
    if (existsSync(publicDirPath) && statSync(publicDirPath).isDirectory()) {
      staticDirs.unshift(publicDirPath);
    }
  }

  // ---- Live reload via SSE ----
  const sseClients = new Set();
  const watchers = [];

  function notifyClients(changedFile) {
    const data = JSON.stringify({ file: changedFile });
    for (const client of sseClients) {
      client.write(`data: ${data}\n\n`);
    }
  }

  function watchDir(dir) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
    try {
      const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const relPath = filename.replace(/\\/g, "/");
        log(`[reload] ${relPath} changed`);
        notifyClients(relPath);
      });
      watchers.push(watcher);
    } catch (err) {
      // fs.watch recursive may not be supported on all platforms
      console.warn(`Warning: could not watch ${dir}: ${err.message}`);
    }
  }

  // Watch public dir
  for (const dir of staticDirs) {
    watchDir(dir);
  }

  // Watch asset files (HTML/SVG templates referenced in manifest)
  const assetDirs = new Set();
  for (const col of manifest.collections || []) {
    for (const template of col.templates || []) {
      const templatePath = resolve(projectDir, template.src);
      const templateDir = resolve(templatePath, "..");
      assetDirs.add(templateDir);
    }
  }
  for (const dir of assetDirs) {
    if (!staticDirs.includes(dir)) {
      watchDir(dir);
    }
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const pathname = url.pathname;

    // CORS headers for API routes
    if (pathname.startsWith("/api/")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
    }

    // API: render screenshot (unified for all collection types)
    if (req.method === "POST" && pathname === "/api/render-screenshot") {
      try {
        const { file, width, height, sourceW, sourceH, background, localization } = JSON.parse(
          await readBody(req)
        );
        if (!file || !width || !height) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ ok: false, error: "Missing file, width, or height" })
          );
        }
        const sw = sourceW || width;
        const sh = sourceH || height;
        log(`Rendering ${file} at ${width}x${height} (source ${sw}x${sh})${localization ? ` [${localization.locale}]` : ''}...`);
        const buffer = await renderScreenshot(projectDir, file, width, height, sw, sh, { background, localization });
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": buffer.length,
        });
        res.end(buffer);
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    // API: get localization data for a collection
    if (req.method === "GET" && pathname === "/api/localizations") {
      try {
        const colId = url.searchParams.get("collection");
        if (!colId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "Missing collection param" }));
        }
        const col = manifest.collections.find((c) => c.id === colId);
        if (!col || !col.localizations) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "Collection has no localizations" }));
        }
        const data = loadLocalizations(projectDir, col.localizations);
        const locales = getLocales(data, col.locales);
        const defaultLocale = manifest.defaultLocalization || data.sourceLanguage || "en";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, data, locales, defaultLocale }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    // API: run xcode output for a collection
    if (req.method === "POST" && pathname === "/api/run-output") {
      try {
        const { collectionId, outputIndex } = JSON.parse(await readBody(req));
        const col = manifest.collections.find((c) => c.id === collectionId);
        if (!col) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "Collection not found" }));
        }
        const outputs = (col.export || []).filter((e) => e.type);
        const output = outputs[outputIndex || 0];
        if (!output) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "Output not found" }));
        }
        if (output.type === "xcode") {
          const path = await runXcodeOutput(projectDir, col, output);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, path }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: `Unsupported output type: ${output.type}` }));
        }
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    // SSE: live reload stream
    if (req.method === "GET" && pathname === "/api/live-reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write(":\n\n"); // heartbeat comment to establish connection
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    // GET / → serve viewer
    if (req.method === "GET" && pathname === "/") {
      serveFile(res, VIEWER_PATH);
      return;
    }

    // GET static files → try additional static dirs first, then project dir
    if (req.method === "GET") {
      const safePath = pathname.replace(/\.\./g, "");

      // Check additional static directories
      for (const dir of staticDirs) {
        const filePath = join(dir, safePath);
        if (existsSync(filePath) && statSync(filePath).isFile()) {
          serveFile(res, filePath);
          return;
        }
      }

      // Fall back to project directory
      const filePath = join(projectDir, safePath);
      serveFile(res, filePath);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const maxRetries = 10;
  let currentPort = port;
  let resolved = false;

  const actualPort = await new Promise((resolvePort) => {
    function tryListen() {
      server.once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          if (currentPort - port >= maxRetries) {
            console.error(`Error: Ports ${port}–${currentPort} are all in use.`);
            process.exit(1);
          }
          currentPort++;
          server.close(() => tryListen());
          return;
        }
        throw err;
      });

      server.listen(currentPort, host, () => {
        if (resolved) return;
        resolved = true;
        const displayHost = host === "0.0.0.0" ? "localhost" : host;
        if (currentPort !== port) {
          log();
          log(`  Port ${port} is in use, using ${currentPort} instead.`);
        }
        log();
        log(`  Open Assets is running on http://${displayHost}:${currentPort}`);
        log();
        log(`  Project: ${projectDir}`);
        if (staticDirs.length > 0) {
          log(`  Static:  ${staticDirs.join(", ")}`);
        }
        log();
        resolvePort(currentPort);
      });
    }

    tryListen();
  });

  return { port: actualPort };

  function cleanup() {
    for (const w of watchers) w.close();
    for (const client of sseClients) client.end();
    sseClients.clear();
  }

  process.on("SIGINT", async () => {
    cleanup();
    await closeBrowser();
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    cleanup();
    await closeBrowser();
    server.close();
    process.exit(0);
  });

  return server;
}
