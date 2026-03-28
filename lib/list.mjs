import { flatSizes, flatOutputs } from "./manifest.mjs";

/**
 * Filter collections by tag. Returns filtered array.
 * @param {object} manifest
 * @param {{ tag?: string }} [options]
 * @returns {{ collections: object[], error?: string }}
 */
export function listCollections(manifest, options = {}) {
  let cols = manifest.collections || [];
  if (options.tag) {
    cols = cols.filter((c) => (c.tags || []).includes(options.tag));
    if (cols.length === 0) {
      return { collections: [], error: `No collections found with tag "${options.tag}"` };
    }
  }
  return { collections: cols };
}

/**
 * Format a manifest's collections into a human-readable string.
 * @param {object} manifest
 * @param {object[]} collections
 * @returns {string}
 */
export function formatCollectionList(manifest, collections) {
  const lines = [];

  if (manifest.tags && manifest.tags.length > 0) {
    lines.push(`Tags: ${manifest.tags.map((t) => t.id).join(", ")}`);
    lines.push("");
  }

  lines.push(manifest.name);
  lines.push("");

  for (const col of collections) {
    const templateCount = col.templates.length;
    const sizeCount = flatSizes(col).length;
    const tagStr =
      col.tags && col.tags.length > 0 ? ` [${col.tags.join(", ")}]` : "";
    lines.push(
      `${col.label} (${col.id})${tagStr} \u2014 ${templateCount} template(s), ${sizeCount} size(s)`
    );

    for (const template of col.templates) {
      lines.push(`  \u2022 ${template.label || template.name} \u2192 ${template.src}`);
    }

    for (const entry of flatSizes(col)) {
      lines.push(`  \u21b3 ${entry.label} (${entry.size.width}\u00d7${entry.size.height})`);
    }

    for (const output of flatOutputs(col)) {
      if (output.type === "xcode") {
        lines.push(`  \u21b3 Xcode: ${output.path}`);
      } else if (output.type === "copy-source") {
        lines.push(`  \u21b3 Copy source: ${output.format}`);
      }
    }
  }

  return lines.join("\n");
}
