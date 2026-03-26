import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * Get all export sizes from a collection.
 */
export function flatSizes(collection) {
  return collection.export || [];
}

/**
 * Load and parse a config file from disk.
 * @param {string} projectDir - Absolute path to the project directory
 * @param {string} [configName="assets.json"] - Config filename
 * @returns {object} Parsed config
 * @throws {Error} If the file is missing or contains invalid JSON
 */
export function loadConfig(projectDir, configName = "assets.json") {
  const configPath = resolve(projectDir, configName);
  if (!existsSync(configPath)) {
    throw new Error(`${configName} not found in ${projectDir}`);
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (err) {
    throw new Error(`Invalid JSON in ${configName}: ${err.message}`);
  }
}

/**
 * Save a config to disk.
 * @param {string} projectDir - Absolute path to the project directory
 * @param {string} configName - Config filename
 * @param {object} config - The config object to save
 */
export function saveConfig(projectDir, configName, config) {
  const configPath = resolve(projectDir, configName);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

/**
 * Filter collections by ID and/or tag.
 * @param {object[]} collections
 * @param {{ collection?: string, tag?: string }} filters
 * @returns {{ collections: object[], error?: string }}
 */
export function filterCollections(collections, filters = {}) {
  let result = collections;
  if (filters.collection) {
    result = result.filter((c) => c.id === filters.collection);
  }
  if (filters.tag) {
    result = result.filter((c) => (c.tags || []).includes(filters.tag));
  }
  if (result.length === 0) {
    const filter = filters.collection
      ? `collection "${filters.collection}"`
      : `tag "${filters.tag}"`;
    return { collections: [], error: `No collections matched ${filter} in config` };
  }
  return { collections: result };
}

/**
 * Filter templates by name or label.
 * @param {object[]} templates
 * @param {string} [templateName] - If provided, filter to matching name/label
 * @returns {object[]}
 */
export function filterTemplates(templates, templateName) {
  if (!templateName) return templates;
  return templates.filter(
    (t) => t.name === templateName || t.label === templateName
  );
}

/**
 * Determine which sizes to render for a collection given CLI options.
 * @param {object} collection - The collection from the config
 * @param {{ width?: string|number, height?: string|number, size?: string, all?: boolean, platform?: string }} opts
 * @returns {{ sizes: object[], warning?: string }}
 */
export function resolveRenderSizes(collection, opts = {}) {
  const sourceW = collection.sourceSize.width;
  const sourceH = collection.sourceSize.height;

  if (opts.width && opts.height) {
    const w = typeof opts.width === "number" ? opts.width : parseInt(opts.width);
    const h = typeof opts.height === "number" ? opts.height : parseInt(opts.height);
    return {
      sizes: [{
        name: `${w}x${h}`,
        label: `${w}x${h}`,
        size: { width: w, height: h },
      }],
    };
  }

  if (opts.size) {
    const found = flatSizes(collection).find(
      (s) => s.name === opts.size || s.label === opts.size
    );
    if (found) {
      return { sizes: [found] };
    }
    return {
      sizes: [],
      warning: `size "${opts.size}" not found in collection "${collection.id}", skipping`,
    };
  }

  if (opts.all) {
    const sizes = flatSizes(collection);
    return { sizes };
  }

  // Default: render at source size
  return {
    sizes: [{
      name: `${sourceW}x${sourceH}`,
      label: `${sourceW}x${sourceH}`,
      size: { width: sourceW, height: sourceH },
    }],
  };
}
