'use client'

import { useState } from 'react'
import type { CompetitorRow } from '@/data/competitors'
import { track } from '@/lib/analytics'

const cells = (them: CompetitorRow['them']) => (Array.isArray(them) ? them : [them])

/**
 * Feature table for an alternatives page, with an "only differences" toggle
 * (alternative_compare_toggle). `names` holds one column per vendor.
 */
export default function CompareTable({ competitor, names, rows }: { competitor: string; names: string[]; rows: CompetitorRow[] }) {
  const [diffOnly, setDiffOnly] = useState(false)
  const shown = diffOnly ? rows.filter((r) => cells(r.them).some((t) => t !== r.us)) : rows
  return (
    <div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={diffOnly}
          onChange={(e) => {
            setDiffOnly(e.target.checked)
            track('alternative_compare_toggle', { competitor, state: e.target.checked ? 'differences' : 'all' })
          }}
        />
        Only show differences
      </label>
      <div className="table-wrap">
        <table className="size-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Open Assets</th>
              {names.map((n) => (
                <th scope="col" key={n}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.feature}>
                <th scope="row">{r.feature}</th>
                <td>{r.us}</td>
                {cells(r.them).map((t, i) => (
                  <td key={names[i] ?? i}>{t}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
