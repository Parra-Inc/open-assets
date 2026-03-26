import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  readLockfile,
  writeLockfile,
  computeChecksum,
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
});
