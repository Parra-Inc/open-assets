import { jest } from "@jest/globals";
import http from "http";
import { startServer, getMime } from "../lib/server.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { validManifest, templateHtml } from "./helpers/fixtures.mjs";

const FAKE_PNG = Buffer.from("fake-png-data");

function createMockRenderer() {
  return {
    renderScreenshot: jest.fn(async () => FAKE_PNG),
    runXcodeOutput: jest.fn(async () => "/tmp/AppIcon.png"),
    closeBrowser: jest.fn(async () => {}),
  };
}

function fetch(server, path, options = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const reqOptions = {
      hostname: addr.address === "::" ? "localhost" : addr.address,
      port: addr.port,
      path,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          text: () => body.toString("utf-8"),
          json: () => JSON.parse(body.toString("utf-8")),
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe("getMime", () => {
  test("returns correct MIME for known extensions", () => {
    expect(getMime("file.html")).toBe("text/html");
    expect(getMime("file.css")).toBe("text/css");
    expect(getMime("file.js")).toBe("application/javascript");
    expect(getMime("file.json")).toBe("application/json");
    expect(getMime("file.png")).toBe("image/png");
    expect(getMime("file.svg")).toBe("image/svg+xml");
    expect(getMime("file.jpg")).toBe("image/jpeg");
    expect(getMime("file.woff2")).toBe("font/woff2");
  });

  test("returns octet-stream for unknown extensions", () => {
    expect(getMime("file.xyz")).toBe("application/octet-stream");
    expect(getMime("file.bin")).toBe("application/octet-stream");
  });

  test("is case-insensitive", () => {
    expect(getMime("FILE.HTML")).toBe("text/html");
    expect(getMime("image.PNG")).toBe("image/png");
  });
});

describe("startServer", () => {
  let server, tmpDir, cleanup;

  beforeEach(async () => {
    const tmp = createTmpProject(validManifest, {
      "src/icon.html": templateHtml,
      "src/icon-alt.html": templateHtml,
      "src/screenshot-hero.html": templateHtml,
      "src/screenshot-features.html": templateHtml,
      "public/style.css": "body { color: red; }",
    });
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    cleanup();
  });

  async function startTestServer(rendererOverrides = {}) {
    const renderer = { ...createMockRenderer(), ...rendererOverrides };
    const port = 30000 + Math.floor(Math.random() * 20000);
    server = await startServer(tmpDir, { port, host: "127.0.0.1", quiet: true }, renderer);
    // Wait for server to start listening
    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.on("listening", resolve);
    });
    return { server, renderer };
  }

  test("GET / serves viewer.html", async () => {
    await startTestServer();
    const res = await fetch(server, "/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/html");
    expect(res.text()).toContain("Open Assets"); // viewer.html title
  });

  test("GET /api/live-reload returns SSE stream", async () => {
    await startTestServer();
    const addr = server.address();

    // Make a request but don't wait for end (SSE is long-lived)
    const res = await new Promise((resolve) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: addr.port,
        path: "/api/live-reload",
        method: "GET",
      }, (res) => {
        resolve(res);
        // Destroy immediately so test doesn't hang
        res.destroy();
      });
      req.end();
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/event-stream");
    expect(res.headers["cache-control"]).toBe("no-cache");
  });

  test("POST /api/render-screenshot with valid body returns PNG", async () => {
    const { renderer } = await startTestServer();
    const res = await fetch(server, "/api/render-screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "src/icon.html", width: 512, height: 512 }),
    });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.body).toEqual(FAKE_PNG);
    expect(renderer.renderScreenshot).toHaveBeenCalledWith(
      tmpDir, "src/icon.html", 512, 512, 512, 512
    );
  });

  test("POST /api/render-screenshot with sourceW/sourceH passes them through", async () => {
    const { renderer } = await startTestServer();
    await fetch(server, "/api/render-screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "src/icon.html", width: 512, height: 512, sourceW: 1024, sourceH: 1024 }),
    });

    expect(renderer.renderScreenshot).toHaveBeenCalledWith(
      tmpDir, "src/icon.html", 512, 512, 1024, 1024
    );
  });

  test("POST /api/render-screenshot with missing fields returns 400", async () => {
    await startTestServer();
    const res = await fetch(server, "/api/render-screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "test.html" }), // missing width/height
    });

    expect(res.status).toBe(400);
    const json = res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Missing file, width, or height/);
  });

  test("POST /api/render-screenshot when renderer throws returns 500", async () => {
    await startTestServer({
      renderScreenshot: jest.fn(async () => { throw new Error("Render failed"); }),
    });
    const res = await fetch(server, "/api/render-screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "src/icon.html", width: 512, height: 512 }),
    });

    expect(res.status).toBe(500);
    expect(res.json().error).toBe("Render failed");
  });

  test("POST /api/run-output with unknown collection returns 404", async () => {
    await startTestServer();
    const res = await fetch(server, "/api/run-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: "nonexistent" }),
    });

    expect(res.status).toBe(404);
    expect(res.json().error).toBe("Collection not found");
  });

  test("POST /api/run-output with missing output returns 404", async () => {
    await startTestServer();
    // screenshots collection has no outputs
    const res = await fetch(server, "/api/run-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: "screenshots" }),
    });

    expect(res.status).toBe(404);
    expect(res.json().error).toBe("Output not found");
  });

  test("OPTIONS /api/render-screenshot returns 204 (CORS preflight)", async () => {
    await startTestServer();
    const res = await fetch(server, "/api/render-screenshot", { method: "OPTIONS" });
    expect(res.status).toBe(204);
  });

  test("GET serves static files from publicDir with correct MIME", async () => {
    await startTestServer();
    const res = await fetch(server, "/style.css");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/css");
    expect(res.text()).toBe("body { color: red; }");
  });

  test("GET serves files from project dir", async () => {
    await startTestServer();
    const res = await fetch(server, "/src/icon.html");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/html");
  });

  test("GET returns 404 for nonexistent files", async () => {
    await startTestServer();
    const res = await fetch(server, "/nonexistent.css");
    expect(res.status).toBe(404);
  });

  test("POST /api/run-output with xcode type calls runXcodeOutput", async () => {
    const { renderer } = await startTestServer();
    const res = await fetch(server, "/api/run-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: "icon", outputIndex: 0 }),
    });

    expect(res.status).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(renderer.runXcodeOutput).toHaveBeenCalled();
  });
});
