import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  readLockfile,
  writeLockfile,
  computeChecksum,
  computeExportChecksum,
  extractLocalDeps,
  isUpToDate,
  recordExport,
} from "../lib/lockfile.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";

describe("readLockfile", () => {
  test("returns default structure when no lockfile exists", () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const result = readLockfile(dir);
      expect(result).toEqual({ version: 1, assets: {} });
    } finally {
      cleanup();
    }
  });

  test("returns default structure when lockfile contains invalid JSON", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "assets.lock": "not json {{{",
    });
    try {
      const result = readLockfile(dir);
      expect(result).toEqual({ version: 1, assets: {} });
    } finally {
      cleanup();
    }
  });

  test("parses a valid lockfile", () => {
    const lockData = {
      version: 1,
      assets: {
        "icon/icon": {
          "512": {
            sourceChecksum: "sha256:abc123",
            outputPath: "exports/icon/512/icon.png",
            exportedAt: "2025-01-01T00:00:00.000Z",
          },
        },
      },
    };
    const { dir, cleanup } = createTmpProject(null, {
      "assets.lock": JSON.stringify(lockData),
    });
    try {
      const result = readLockfile(dir);
      expect(result).toEqual(lockData);
    } finally {
      cleanup();
    }
  });
});

describe("writeLockfile", () => {
  test("writes formatted JSON with trailing newline", () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const data = { version: 1, assets: { "test/a": { "100": { sourceChecksum: "sha256:x" } } } };
      writeLockfile(dir, data);
      const raw = readFileSync(join(dir, "assets.lock"), "utf-8");
      expect(raw).toBe(JSON.stringify(data, null, 2) + "\n");
    } finally {
      cleanup();
    }
  });

  test("round-trips with readLockfile", () => {
    const { dir, cleanup } = createTmpProject(null);
    try {
      const data = {
        version: 1,
        assets: {
          "icon/icon": {
            "512": { sourceChecksum: "sha256:abc", outputPath: "out.png", exportedAt: "2025-01-01T00:00:00.000Z" },
          },
        },
      };
      writeLockfile(dir, data);
      const result = readLockfile(dir);
      expect(result).toEqual(data);
    } finally {
      cleanup();
    }
  });
});

describe("computeChecksum", () => {
  test("returns null for nonexistent file", () => {
    expect(computeChecksum("/tmp/definitely-does-not-exist-abc123")).toBeNull();
  });

  test("returns sha256 prefixed hash for a real file", () => {
    const { dir, cleanup } = createTmpProject(null, { "test.txt": "hello world" });
    try {
      const checksum = computeChecksum(join(dir, "test.txt"));
      expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      cleanup();
    }
  });

  test("is deterministic (same content = same hash)", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "a.txt": "identical content",
      "b.txt": "identical content",
    });
    try {
      const a = computeChecksum(join(dir, "a.txt"));
      const b = computeChecksum(join(dir, "b.txt"));
      expect(a).toBe(b);
    } finally {
      cleanup();
    }
  });

  test("different content produces different checksums", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "a.txt": "content A",
      "b.txt": "content B",
    });
    try {
      const a = computeChecksum(join(dir, "a.txt"));
      const b = computeChecksum(join(dir, "b.txt"));
      expect(a).not.toBe(b);
    } finally {
      cleanup();
    }
  });
});

describe("isUpToDate", () => {
  test("returns false when asset key is not in lockData", () => {
    const lockData = { version: 1, assets: {} };
    expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", "/tmp/out.png")).toBe(false);
  });

  test("returns false when variant key is not in lockData", () => {
    const lockData = { version: 1, assets: { "icon/icon": {} } };
    expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", "/tmp/out.png")).toBe(false);
  });

  test("returns false when checksum differs", () => {
    const { dir, cleanup } = createTmpProject(null, { "out.png": "fake png" });
    try {
      const lockData = {
        version: 1,
        assets: {
          "icon/icon": {
            "512": { sourceChecksum: "sha256:old", outputPath: join(dir, "out.png") },
          },
        },
      };
      expect(isUpToDate(lockData, "icon/icon", "512", "sha256:new", join(dir, "out.png"))).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("returns false when output file does not exist even if checksum matches", () => {
    const lockData = {
      version: 1,
      assets: {
        "icon/icon": {
          "512": { sourceChecksum: "sha256:abc", outputPath: "/tmp/no-such-file.png" },
        },
      },
    };
    expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", "/tmp/no-such-file.png")).toBe(false);
  });

  test("returns true when checksum matches and output file exists", () => {
    const { dir, cleanup } = createTmpProject(null, { "out.png": "fake png data" });
    try {
      const outPath = join(dir, "out.png");
      const lockData = {
        version: 1,
        assets: {
          "icon/icon": {
            "512": { sourceChecksum: "sha256:abc", outputPath: outPath },
          },
        },
      };
      expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", outPath)).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("returns false when export checksum differs", () => {
    const { dir, cleanup } = createTmpProject(null, { "out.png": "fake png data" });
    try {
      const outPath = join(dir, "out.png");
      const lockData = {
        version: 1,
        assets: {
          "icon/icon": {
            "512": { sourceChecksum: "sha256:abc", exportChecksum: "sha256:old", outputPath: outPath },
          },
        },
      };
      expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", outPath, "sha256:new")).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("returns true when both source and export checksums match", () => {
    const { dir, cleanup } = createTmpProject(null, { "out.png": "fake png data" });
    try {
      const outPath = join(dir, "out.png");
      const lockData = {
        version: 1,
        assets: {
          "icon/icon": {
            "512": { sourceChecksum: "sha256:abc", exportChecksum: "sha256:exp", outputPath: outPath },
          },
        },
      };
      expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", outPath, "sha256:exp")).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("returns true when no export checksum is provided (backwards compat)", () => {
    const { dir, cleanup } = createTmpProject(null, { "out.png": "fake png data" });
    try {
      const outPath = join(dir, "out.png");
      const lockData = {
        version: 1,
        assets: {
          "icon/icon": {
            "512": { sourceChecksum: "sha256:abc", outputPath: outPath },
          },
        },
      };
      expect(isUpToDate(lockData, "icon/icon", "512", "sha256:abc", outPath)).toBe(true);
    } finally {
      cleanup();
    }
  });
});

describe("recordExport", () => {
  test("creates nested structure for new asset", () => {
    const lockData = { version: 1, assets: {} };
    recordExport(lockData, "icon/icon", "512", "sha256:abc", "exports/icon/512/icon.png");
    expect(lockData.assets["icon/icon"]["512"]).toMatchObject({
      sourceChecksum: "sha256:abc",
      outputPath: "exports/icon/512/icon.png",
    });
    expect(lockData.assets["icon/icon"]["512"].exportedAt).toBeDefined();
  });

  test("preserves existing variants when adding a new one", () => {
    const lockData = {
      version: 1,
      assets: {
        "icon/icon": {
          "512": { sourceChecksum: "sha256:old", outputPath: "a.png", exportedAt: "2025-01-01T00:00:00.000Z" },
        },
      },
    };
    recordExport(lockData, "icon/icon", "192", "sha256:new", "b.png");
    expect(lockData.assets["icon/icon"]["512"].sourceChecksum).toBe("sha256:old");
    expect(lockData.assets["icon/icon"]["192"].sourceChecksum).toBe("sha256:new");
  });

  test("exportedAt is a valid ISO timestamp", () => {
    const lockData = { version: 1, assets: {} };
    recordExport(lockData, "test/t", "100", "sha256:x", "out.png");
    const ts = lockData.assets["test/t"]["100"].exportedAt;
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  test("overwrites existing variant entry", () => {
    const lockData = {
      version: 1,
      assets: {
        "icon/icon": {
          "512": { sourceChecksum: "sha256:old", outputPath: "old.png", exportedAt: "2025-01-01T00:00:00.000Z" },
        },
      },
    };
    recordExport(lockData, "icon/icon", "512", "sha256:updated", "new.png");
    expect(lockData.assets["icon/icon"]["512"].sourceChecksum).toBe("sha256:updated");
    expect(lockData.assets["icon/icon"]["512"].outputPath).toBe("new.png");
  });

  test("stores exportChecksum when provided", () => {
    const lockData = { version: 1, assets: {} };
    recordExport(lockData, "icon/icon", "512", "sha256:abc", "out.png", "sha256:exp");
    expect(lockData.assets["icon/icon"]["512"].exportChecksum).toBe("sha256:exp");
  });

  test("omits exportChecksum when not provided", () => {
    const lockData = { version: 1, assets: {} };
    recordExport(lockData, "icon/icon", "512", "sha256:abc", "out.png");
    expect(lockData.assets["icon/icon"]["512"]).not.toHaveProperty("exportChecksum");
  });
});

describe("computeExportChecksum", () => {
  test("returns sha256 prefixed hash", () => {
    const result = computeExportChecksum({ size: { width: 64, height: 64 } });
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("same config produces same hash", () => {
    const a = computeExportChecksum({ size: { width: 64, height: 64 } });
    const b = computeExportChecksum({ size: { width: 64, height: 64 } });
    expect(a).toBe(b);
  });

  test("different size produces different hash", () => {
    const a = computeExportChecksum({ size: { width: 64, height: 64 } });
    const b = computeExportChecksum({ size: { width: 128, height: 128 } });
    expect(a).not.toBe(b);
  });

  test("adding outFile produces different hash", () => {
    const a = computeExportChecksum({ size: { width: 64, height: 64 } });
    const b = computeExportChecksum({ size: { width: 64, height: 64 }, outFile: "public/{template}.png" });
    expect(a).not.toBe(b);
  });

  test("different outFile produces different hash", () => {
    const a = computeExportChecksum({ size: { width: 64, height: 64 }, outFile: "a/{template}.png" });
    const b = computeExportChecksum({ size: { width: 64, height: 64 }, outFile: "b/{template}.png" });
    expect(a).not.toBe(b);
  });
});

describe("extractLocalDeps", () => {
  test("returns empty array for nonexistent file", () => {
    expect(extractLocalDeps("/tmp/no-such-file.html")).toEqual([]);
  });

  test("returns empty array for HTML with no local refs", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "test.html": '<html><body><h1>Hello</h1></body></html>',
    });
    try {
      expect(extractLocalDeps(join(dir, "test.html"))).toEqual([]);
    } finally {
      cleanup();
    }
  });

  test("extracts src attributes from img tags", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "assets/page.html": '<img src="../public/logo.svg" />',
      "public/logo.svg": "<svg></svg>",
    });
    try {
      const deps = extractLocalDeps(join(dir, "assets/page.html"));
      expect(deps).toHaveLength(1);
      expect(deps[0]).toBe(join(dir, "public/logo.svg"));
    } finally {
      cleanup();
    }
  });

  test("extracts href attributes", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<link href="styles.css" rel="stylesheet" />',
      "styles.css": "body { color: red; }",
    });
    try {
      const deps = extractLocalDeps(join(dir, "page.html"));
      expect(deps).toHaveLength(1);
      expect(deps[0]).toBe(join(dir, "styles.css"));
    } finally {
      cleanup();
    }
  });

  test("ignores remote URLs", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": [
        '<script src="https://cdn.tailwindcss.com"></script>',
        '<link href="https://fonts.googleapis.com/css2" rel="stylesheet" />',
        '<img src="//example.com/img.png" />',
        '<img src="data:image/png;base64,abc" />',
      ].join("\n"),
    });
    try {
      expect(extractLocalDeps(join(dir, "page.html"))).toEqual([]);
    } finally {
      cleanup();
    }
  });

  test("deduplicates repeated references", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<img src="logo.svg" /><img src="logo.svg" />',
      "logo.svg": "<svg></svg>",
    });
    try {
      const deps = extractLocalDeps(join(dir, "page.html"));
      expect(deps).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  test("skips references to files that do not exist", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<img src="missing.png" /><img src="found.svg" />',
      "found.svg": "<svg></svg>",
    });
    try {
      const deps = extractLocalDeps(join(dir, "page.html"));
      expect(deps).toHaveLength(1);
      expect(deps[0]).toBe(join(dir, "found.svg"));
    } finally {
      cleanup();
    }
  });

  test("handles both single and double quotes", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": "<img src='a.svg' /><img src=\"b.svg\" />",
      "a.svg": "<svg>a</svg>",
      "b.svg": "<svg>b</svg>",
    });
    try {
      const deps = extractLocalDeps(join(dir, "page.html"));
      expect(deps).toHaveLength(2);
    } finally {
      cleanup();
    }
  });
});

describe("computeChecksum with dependencies", () => {
  test("HTML with no local deps produces same hash as plain content hash", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "test.html": "<html><body>Hello</body></html>",
    });
    try {
      const htmlPath = join(dir, "test.html");
      const htmlChecksum = computeChecksum(htmlPath);
      // Rename to .txt to get the plain single-file hash
      const { dir: dir2, cleanup: cleanup2 } = createTmpProject(null, {
        "test.txt": "<html><body>Hello</body></html>",
      });
      try {
        const txtChecksum = computeChecksum(join(dir2, "test.txt"));
        expect(htmlChecksum).toBe(txtChecksum);
      } finally {
        cleanup2();
      }
    } finally {
      cleanup();
    }
  });

  test("hash changes when a dependency file changes", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<img src="logo.svg" />',
      "logo.svg": "<svg>version1</svg>",
    });
    try {
      const hash1 = computeChecksum(join(dir, "page.html"));
      writeFileSync(join(dir, "logo.svg"), "<svg>version2</svg>");
      const hash2 = computeChecksum(join(dir, "page.html"));
      expect(hash1).not.toBe(hash2);
    } finally {
      cleanup();
    }
  });

  test("hash changes when template content changes", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<img src="logo.svg" /><p>v1</p>',
      "logo.svg": "<svg></svg>",
    });
    try {
      const hash1 = computeChecksum(join(dir, "page.html"));
      writeFileSync(join(dir, "page.html"), '<img src="logo.svg" /><p>v2</p>');
      const hash2 = computeChecksum(join(dir, "page.html"));
      expect(hash1).not.toBe(hash2);
    } finally {
      cleanup();
    }
  });

  test("hash is stable when nothing changes", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<img src="logo.svg" />',
      "logo.svg": "<svg></svg>",
    });
    try {
      const hash1 = computeChecksum(join(dir, "page.html"));
      const hash2 = computeChecksum(join(dir, "page.html"));
      expect(hash1).toBe(hash2);
    } finally {
      cleanup();
    }
  });

  test("hash changes when dependency changes but template does not", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "page.html": '<img src="icon.png" /><img src="logo.svg" />',
      "icon.png": "fake-png-v1",
      "logo.svg": "<svg>logo</svg>",
    });
    try {
      const hash1 = computeChecksum(join(dir, "page.html"));
      // Only change a dependency, leave the HTML untouched
      writeFileSync(join(dir, "icon.png"), "fake-png-v2");
      const hash2 = computeChecksum(join(dir, "page.html"));
      expect(hash1).not.toBe(hash2);
      // Template content is identical
      expect(readFileSync(join(dir, "page.html"), "utf-8")).toBe(
        '<img src="icon.png" /><img src="logo.svg" />'
      );
    } finally {
      cleanup();
    }
  });

  test("non-HTML files are not affected by nearby files", () => {
    const { dir, cleanup } = createTmpProject(null, {
      "icon.svg": "<svg>icon</svg>",
      "logo.svg": "<svg>logo</svg>",
    });
    try {
      const hash1 = computeChecksum(join(dir, "icon.svg"));
      writeFileSync(join(dir, "logo.svg"), "<svg>changed</svg>");
      const hash2 = computeChecksum(join(dir, "icon.svg"));
      expect(hash1).toBe(hash2);
    } finally {
      cleanup();
    }
  });
});
