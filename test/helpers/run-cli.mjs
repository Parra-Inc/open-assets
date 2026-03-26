import { execFile } from "child_process";
import { resolve } from "path";
import { fileURLToPath } from "url";

const CLI_PATH = resolve(fileURLToPath(import.meta.url), "../../../bin/open-assets.mjs");

/**
 * Run the open-assets CLI as a subprocess.
 * @param {string[]} args - CLI arguments
 * @param {object} [options]
 * @param {string} [options.cwd] - Working directory
 * @param {Record<string, string>} [options.env] - Extra environment variables
 * @param {number} [options.timeout] - Timeout in ms (default 10000)
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
export function runCli(args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      "node",
      [CLI_PATH, ...args],
      {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        timeout: options.timeout || 10000,
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout || "",
          stderr: stderr || "",
          exitCode: error ? error.code ?? 1 : 0,
        });
      }
    );
  });
}
