import { jest } from "@jest/globals";
import {
  isRtl,
  getDirection,
  loadLocalizations,
  resolveStrings,
  getLocales,
} from "../lib/localization.mjs";
import { createTmpProject } from "./helpers/tmp-project.mjs";
import { writeFileSync } from "fs";
import { join } from "path";

const sampleLocalizations = {
  sourceLanguage: "en",
  strings: {
    app_name: {
      localizations: {
        en: { value: "Tax Days" },
        ar: { value: "أيام الضرائب" },
        ja: { value: "タックスデイズ" },
        "es-419": { value: "Días Fiscales" },
      },
    },
    hero_subtitle: {
      localizations: {
        en: { value: "Track your tax days" },
        ar: { value: "تتبع أيام الضرائب الخاصة بك" },
        ja: { value: "税金の日を追跡する" },
      },
    },
    day_count: {
      localizations: {
        en: { value: "You have {{n:1234}} days remaining" },
        ar: { value: "لديك {{n:1234}} يوم متبقي" },
        de: { value: "Sie haben {{n:1234}} Tage übrig" },
      },
    },
  },
};

// ── RTL detection ──────────────────────────────────────────────────────────

describe("isRtl", () => {
  test("returns true for Arabic", () => {
    expect(isRtl("ar")).toBe(true);
  });

  test("returns true for Hebrew", () => {
    expect(isRtl("he")).toBe(true);
  });

  test("returns true for Arabic regional variant", () => {
    expect(isRtl("ar-SA")).toBe(true);
  });

  test("returns false for English", () => {
    expect(isRtl("en")).toBe(false);
  });

  test("returns false for Japanese", () => {
    expect(isRtl("ja")).toBe(false);
  });

  test("returns false for English regional variant", () => {
    expect(isRtl("en-GB")).toBe(false);
  });

  test("returns true for Persian", () => {
    expect(isRtl("fa")).toBe(true);
  });

  test("returns true for Urdu", () => {
    expect(isRtl("ur")).toBe(true);
  });
});

describe("getDirection", () => {
  test("returns rtl for Arabic", () => {
    expect(getDirection("ar")).toBe("rtl");
  });

  test("returns ltr for English", () => {
    expect(getDirection("en")).toBe("ltr");
  });

  test("returns rtl for Hebrew regional variant", () => {
    expect(getDirection("he-IL")).toBe("rtl");
  });

  test("returns ltr for German", () => {
    expect(getDirection("de")).toBe("ltr");
  });
});

// ── loadLocalizations ──────────────────────────────────────────────────────

describe("loadLocalizations", () => {
  let tmpDir, cleanup;

  afterEach(() => cleanup?.());

  test("loads and parses a valid localizations file", () => {
    const tmp = createTmpProject(null, {
      "localizations.json": JSON.stringify(sampleLocalizations),
    });
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;

    const result = loadLocalizations(tmpDir, "localizations.json");
    expect(result.sourceLanguage).toBe("en");
    expect(Object.keys(result.strings)).toHaveLength(3);
  });

  test("throws when file does not exist", () => {
    const tmp = createTmpProject(null);
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;

    expect(() => loadLocalizations(tmpDir, "missing.json")).toThrow(
      "Localizations file not found"
    );
  });

  test("throws on invalid JSON", () => {
    const tmp = createTmpProject(null, {
      "bad.json": "{ not valid json }",
    });
    tmpDir = tmp.dir;
    cleanup = tmp.cleanup;

    expect(() => loadLocalizations(tmpDir, "bad.json")).toThrow("Invalid JSON");
  });
});

// ── resolveStrings ─────────────────────────────────────────────────────────

describe("resolveStrings", () => {
  test("resolves strings for an exact locale", () => {
    const strings = resolveStrings(sampleLocalizations, "ar");
    expect(strings.app_name).toBe("أيام الضرائب");
    expect(strings.hero_subtitle).toBe("تتبع أيام الضرائب الخاصة بك");
  });

  test("resolves strings for source language", () => {
    const strings = resolveStrings(sampleLocalizations, "en");
    expect(strings.app_name).toBe("Tax Days");
    expect(strings.hero_subtitle).toBe("Track your tax days");
  });

  test("falls back to base language for regional variant", () => {
    // "es" is not in app_name, but "es-419" is — and we're requesting "es-419"
    const strings = resolveStrings(sampleLocalizations, "es-419");
    expect(strings.app_name).toBe("Días Fiscales");
  });

  test("falls back from regional variant to base language", () => {
    // "ar-SA" should fall back to "ar"
    const strings = resolveStrings(sampleLocalizations, "ar-SA");
    expect(strings.app_name).toBe("أيام الضرائب");
  });

  test("falls back to source language when locale not found", () => {
    // "fr" doesn't exist, should fall back to "en"
    const strings = resolveStrings(sampleLocalizations, "fr");
    expect(strings.app_name).toBe("Tax Days");
    expect(strings.hero_subtitle).toBe("Track your tax days");
  });

  test("preserves number templates in values", () => {
    const strings = resolveStrings(sampleLocalizations, "en");
    expect(strings.day_count).toBe("You have {{n:1234}} days remaining");
  });

  test("returns empty object when no strings match", () => {
    const empty = { sourceLanguage: "en", strings: {} };
    const strings = resolveStrings(empty, "en");
    expect(strings).toEqual({});
  });
});

// ── getLocales ─────────────────────────────────────────────────────────────

describe("getLocales", () => {
  test("collects all unique locales sorted alphabetically", () => {
    const locales = getLocales(sampleLocalizations);
    expect(locales).toEqual(["ar", "de", "en", "es-419", "ja"]);
  });

  test("filters to only requested locales", () => {
    const locales = getLocales(sampleLocalizations, ["en", "ar"]);
    expect(locales).toEqual(["en", "ar"]);
  });

  test("filters out locales not in the data", () => {
    const locales = getLocales(sampleLocalizations, ["en", "fr", "zh"]);
    expect(locales).toEqual(["en"]);
  });

  test("returns empty when no filter matches", () => {
    const locales = getLocales(sampleLocalizations, ["xx", "yy"]);
    expect(locales).toEqual([]);
  });

  test("returns empty for empty strings object", () => {
    const locales = getLocales({ sourceLanguage: "en", strings: {} });
    expect(locales).toEqual([]);
  });
});
