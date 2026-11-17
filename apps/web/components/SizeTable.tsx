import { sizePages } from '@/data/size-pages'
import { trackAttrs } from '@/lib/analytics'
import { exportEntry, exportSizes, sizeByName } from '@/lib/sizes'
import CopyButton from './CopyButton'

/**
 * Plain HTML size table from lib/sizes.mjs, so every page matches the CLI.
 * Each row copies its assets.json export entry (size_copy); a size that has
 * its own /sizes page links there (size_row_click).
 */
export default function SizeTable({
  names,
  platform,
  location,
  caption,
}: {
  /** Size names, in order. Defaults to every size (or every size for `platform`). */
  names?: string[]
  platform?: string
  location: string
  caption?: string
}) {
  const rows = names ? names.map(sizeByName) : exportSizes.filter((s) => !platform || s.platform === platform)
  const pageFor = (name: string) => sizePages.find((p) => p.sizeNames.includes(name))
  return (
    <div className="table-wrap">
      <table className="size-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">Platform</th>
            <th scope="col">Size</th>
            <th scope="col">Pixels</th>
            <th scope="col">Name in assets.json</th>
            <th scope="col"><span className="sr-only">Copy</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const page = pageFor(s.name)
            return (
              <tr key={`${s.platform}-${s.name}`}>
                <td>{s.platform}</td>
                <td>
                  {page ? (
                    <a
                      href={`/sizes/${page.slug}`}
                      {...trackAttrs('size_row_click', { size_name: s.name, location })}
                    >
                      {s.label}
                    </a>
                  ) : (
                    s.label
                  )}
                </td>
                <td>
                  {s.width} × {s.height}
                </td>
                <td>
                  <code>{s.name}</code>
                </td>
                <td>
                  <CopyButton
                    text={exportEntry(s)}
                    event="size_copy"
                    params={{ size_name: s.name, location }}
                    ariaLabel={`Copy the assets.json entry for ${s.platform} ${s.label}`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
