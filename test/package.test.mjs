import { execFileSync } from "child_process";
import { resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

test("the npm package stays small and includes what the dev viewer needs", () => {
  const [pack] = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  );
  const paths = pack.files.map((f) => f.path);
  expect(pack.unpackedSize).toBeLessThan(5_000_000);
  expect(paths).toContain("public/viewer.html");
  expect(paths).toContain("public/img/icon/32/icon.png");
  expect(paths).toContain("public/img/icon/16/icon.png");
  expect(paths).toContain("lib/png.mjs");
}, 30000);
