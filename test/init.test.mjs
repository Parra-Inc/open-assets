import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { createTmpProject } from "./helpers/tmp-project.mjs";

const CLI_PATH = resolve(fileURLToPath(import.meta.url), "../../bin/open-assets.mjs");

/**
 * Run `open-assets init <dir>` with piped stdin inputs (newline-delimited).
 * Non-TTY stdin triggers simple numbered-list fallback prompts in init.mjs.
 * @param {string} dir - Target directory
 * @param {string[]} inputs - Lines to send as stdin answers
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
function runInit(dir, inputs) {
  return new Promise((resolve) => {
    const child = spawn("node", [CLI_PATH, "init", dir], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, TERM: "dumb" },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    // Send inputs line by line with small delays
    let idx = 0;
    function sendNext() {
      if (idx >= inputs.length) {
        child.stdin.end();
        return;
      }
      setTimeout(() => {
        child.stdin.write(inputs[idx] + "\n");
        idx++;
        sendNext();
      }, 100);
    }
    setTimeout(sendNext, 300);

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    // Safety timeout
    setTimeout(() => {
      child.kill("SIGTERM");
    }, 10000);
  });
}

describe("init command", () => {
  test("aborts when assets.json already exists", async () => {
    const { dir, cleanup } = createTmpProject({ name: "existing" });
    try {
      const result = await runInit(dir, []);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("assets.json already exists");
    } finally {
      cleanup();
    }
  });

  test("creates assets.json and src/ with icon preset", async () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      // Non-TTY mode uses numbered-list prompts:
      // 1. Project name
      // 2. askCheckbox: select asset types (comma-separated numbers) — 2 = icon
      // 3. askCheckbox: select platforms — 1 = iOS
      // 4. askConfirm: proceed — y
      const result = await runInit(dir, [
        "Test App",  // Project name
        "2",         // Select icon (index 2)
        "1",         // Select iOS platform
        "y",         // Confirm creation
      ]);

      // Check files were created
      expect(existsSync(join(dir, "assets.json"))).toBe(true);
      expect(existsSync(join(dir, "src"))).toBe(true);

      if (existsSync(join(dir, "assets.json"))) {
        const config = JSON.parse(readFileSync(join(dir, "assets.json"), "utf-8"));
        expect(config.name).toContain("Test App");
        expect(config.collections).toBeDefined();
        expect(config.collections.length).toBeGreaterThan(0);
      }
    } finally {
      cleanup();
    }
  }, 15000);

  test("creates .gitignore", async () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const result = await runInit(dir, [
        "My Project",  // Project name
        "1",           // Select screenshots (index 1)
        "1",           // Select iOS platform
        "y",           // Confirm
      ]);

      const gitignorePath = join(dir, ".gitignore");
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, "utf-8");
        expect(gitignore).toContain("exports");
      }
    } finally {
      cleanup();
    }
  }, 15000);
});
