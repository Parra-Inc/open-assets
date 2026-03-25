import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { resolve, join, extname } from "path";
import { fileURLToPath } from "url";
import { renderScreenshot, renderAndSaveIcon, closeBrowser } from "./renderer.mjs";

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

function getMime(filePath) {
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

export function startServer(projectDir, options = {}) {
  const port = options.port || 3200;
  const host = options.host || "localhost";
  const quiet = options.quiet || false;
  const manifestPath = options.manifestPath || resolve(projectDir, "manifest.json");
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

    // API: render screenshot
    if (req.method === "POST" && pathname === "/api/render-screenshot") {
      try {
        const { file, width, height, sourceW, sourceH } = JSON.parse(
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
        log(`Rendering ${file} at ${width}x${height} (source ${sw}x${sh})...`);
        const buffer = await renderScreenshot(projectDir, file, width, height, sw, sh);
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

    // API: update icon
    if (req.method === "POST" && pathname === "/api/update-icon") {
      try {
        const outputPath = await renderAndSaveIcon(projectDir, manifest);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, path: outputPath }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
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

  server.listen(port, host, () => {
    log();
    log(`  open-assets dev server`);
    log(`  ───────────────────────`);
    log(`  Local:   http://${host}:${port}`);
    if (host === "0.0.0.0") {
      log(`  Network: http://<your-ip>:${port}`);
    }
    log(`  Project: ${projectDir}`);
    if (staticDirs.length > 0) {
      log(`  Static:  ${staticDirs.join(", ")}`);
    }
    log();
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Error: Port ${port} is already in use.`);
      console.error(`Try a different port: open-assets dev --port ${port + 1}`);
      process.exit(1);
    }
    throw err;
  });

  process.on("SIGINT", async () => {
    await closeBrowser();
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await closeBrowser();
    server.close();
    process.exit(0);
  });

  return server;
}
