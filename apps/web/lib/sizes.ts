import { EXPORT_SIZES, type ExportSize } from '../../../lib/sizes.mjs'

/** lib/sizes.mjs, the one size list shared with the CLI, README and docs. */
export const exportSizes: ExportSize[] = EXPORT_SIZES
export type { ExportSize }

export function sizeByName(name: string): ExportSize {
  const size = EXPORT_SIZES.find((s) => s.name === name)
  if (!size) throw new Error(`Unknown size "${name}": add it to lib/sizes.mjs first`)
  return size
}

/** The assets.json export entry for a size, as the CLI expects it. */
export function exportEntry(size: ExportSize): string {
  return JSON.stringify({ name: size.name, label: size.label, size: { width: size.width, height: size.height } })
}
