import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Locales that use right-to-left script direction.
 * Includes base language codes — region variants (e.g. "ar-SA") are
 * detected by matching the base language.
 */
const RTL_LANGUAGES = new Set([
  "ar",  // Arabic
  "he",  // Hebrew
  "fa",  // Persian (Farsi)
  "ur",  // Urdu
  "yi",  // Yiddish
  "ps",  // Pashto
  "sd",  // Sindhi
  "ku",  // Kurdish (Sorani)
  "dv",  // Divehi (Maldivian)
  "ug",  // Uyghur
]);

/**
 * Check if a locale uses right-to-left text direction.
 * Matches exact locale codes and base language (e.g. "ar-SA" → "ar").
 */
export function isRtl(locale) {
  if (RTL_LANGUAGES.has(locale)) return true;
  const base = locale.split("-")[0];
  return RTL_LANGUAGES.has(base);
}

/**
 * Get text direction for a locale: "rtl" or "ltr".
 */
export function getDirection(locale) {
  return isRtl(locale) ? "rtl" : "ltr";
}

/**
 * Load and parse a localizations JSON file (iOS .xcstrings-inspired format).
 *
 * Expected format:
 * {
 *   "sourceLanguage": "en",
 *   "strings": {
 *     "key_name": {
 *       "localizations": {
 *         "en": { "value": "Hello" },
 *         "ar": { "value": "مرحبا" }
 *       }
 *     }
 *   }
 * }
 */
export function loadLocalizations(projectDir, localizationsPath) {
  const fullPath = resolve(projectDir, localizationsPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Localizations file not found: ${localizationsPath}`);
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf-8"));
  } catch (err) {
    throw new Error(`Invalid JSON in ${localizationsPath}: ${err.message}`);
  }
}

/**
 * Resolve all localized string values for a given locale.
 * Falls back: exact locale → base language → source language.
 *
 * Returns a flat { key: value } map.
 */
export function resolveStrings(localizations, locale) {
  const strings = {};
  const sourceLanguage = localizations.sourceLanguage || "en";

  for (const [key, entry] of Object.entries(localizations.strings || {})) {
    const l10ns = entry.localizations || {};
    const value =
      l10ns[locale]?.value ??
      l10ns[locale.split("-")[0]]?.value ??
      l10ns[sourceLanguage]?.value;
    if (value !== undefined) {
      strings[key] = value;
    }
  }

  return strings;
}

/**
 * Collect all unique locales defined across all string entries.
 * If filterLocales is provided, returns only those that exist in the data.
 * Results are sorted alphabetically.
 */
export function getLocales(localizations, filterLocales) {
  const allLocales = new Set();
  for (const entry of Object.values(localizations.strings || {})) {
    for (const locale of Object.keys(entry.localizations || {})) {
      allLocales.add(locale);
    }
  }

  if (filterLocales && filterLocales.length > 0) {
    return filterLocales.filter((l) => allLocales.has(l));
  }

  return [...allLocales].sort();
}

/**
 * JavaScript snippet injected into the Puppeteer page to perform
 * localization substitution on the live DOM.
 *
 * Replaces {{key}} placeholders in text nodes with localized values.
 * Processes {{n:NUMBER}} patterns in values for locale-aware number formatting.
 * Sets lang and dir attributes on <html>.
 */
export function buildLocalizationScript(strings, locale, direction) {
  return `
    (function() {
      document.documentElement.lang = ${JSON.stringify(locale)};

      const strings = ${JSON.stringify(strings)};
      const locale = ${JSON.stringify(locale)};
      const dir = ${JSON.stringify(direction)};
      const formatter = new Intl.NumberFormat(locale);

      function processValue(value) {
        return value.replace(/\\{\\{n:(\\d+(?:\\.\\d+)?)\\}\\}/g, function(_, num) {
          return formatter.format(parseFloat(num));
        });
      }

      const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_TEXT
      );
      while (walker.nextNode()) {
        var node = walker.currentNode;
        var text = node.textContent;
        var changed = false;
        text = text.replace(/\\{\\{([a-zA-Z_][\\w.]*)\\}\\}/g, function(match, key) {
          if (strings[key] !== undefined) {
            changed = true;
            return processValue(strings[key]);
          }
          return match;
        });
        if (changed) {
          node.textContent = text;
          if (dir === "rtl") {
            node.parentElement.dir = dir;
          }
        }
      }
    })();
  `;
}
