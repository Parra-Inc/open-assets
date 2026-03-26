import { existsSync } from "fs";
import { resolve } from "path";
import { flatSizes } from "./manifest.mjs";

/**
 * Validate a config object and check that referenced files exist.
 * Returns structured results instead of printing/exiting.
 *
 * @param {object} manifest - Parsed config object
 * @param {string} projectDir - Absolute path to the project directory
 * @returns {{ checks: Array<{ ok: boolean, message: string }>, errors: number }}
 */
export function validateConfig(manifest, projectDir) {
  const checks = [];
  const missingTemplates = [];
  const emptyCollections = [];
  let errors = 0;

  const ok = (msg) => checks.push({ ok: true, message: msg });
  const fail = (msg) => {
    checks.push({ ok: false, message: msg });
    errors++;
  };

  // Check top-level fields
  if (manifest.name) {
    ok(`name: "${manifest.name}"`);
  } else {
    fail("Missing top-level 'name' field");
  }

  if (Array.isArray(manifest.collections) && manifest.collections.length > 0) {
    ok(`${manifest.collections.length} collection(s) defined`);
  } else {
    fail("Missing or empty 'collections' array");
    return { checks, errors, missingTemplates, emptyCollections };
  }

  // Check each collection
  const ids = new Set();
  for (const col of manifest.collections) {
    if (!col.id) {
      fail("Collection missing 'id' field");
      continue;
    }
    if (ids.has(col.id)) {
      fail(`Duplicate collection id: "${col.id}"`);
    }
    ids.add(col.id);

    if (!col.sourceSize || !col.sourceSize.width || !col.sourceSize.height) {
      fail(`Collection "${col.id}" missing or invalid 'sourceSize'`);
    } else {
      ok(`Collection "${col.id}" sourceSize: ${col.sourceSize.width}\u00d7${col.sourceSize.height}`);
    }

    if (!col.templates || col.templates.length === 0) {
      fail(`Collection "${col.id}" has no templates`);
      emptyCollections.push({ collectionId: col.id });
    } else {
      for (const template of col.templates) {
        if (!template.src) {
          fail(`Collection "${col.id}" has a template without 'src'`);
          continue;
        }
        const filePath = resolve(projectDir, template.src);
        if (existsSync(filePath)) {
          ok(`${template.src} exists`);
        } else {
          fail(`${template.src} not found`);
          missingTemplates.push({
            collectionId: col.id,
            templateSrc: template.src,
            templateName: template.name || template.label,
          });
        }
      }
    }

    const sizes = flatSizes(col);
    if (sizes.length > 0) {
      ok(`Collection "${col.id}" has ${sizes.length} export size(s)`);
    }

    // Validate outputs
    if (col.outputs) {
      for (const output of col.outputs) {
        if (!output.type) {
          fail(`Collection "${col.id}" has an output without 'type'`);
        } else {
          ok(`Output: ${output.type}`);
        }
      }
    }
  }

  return { checks, errors, missingTemplates, emptyCollections };
}
