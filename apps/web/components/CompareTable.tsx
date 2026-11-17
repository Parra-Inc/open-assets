'use client'

import { useState } from 'react'
import type { CompetitorRow } from '@/data/competitors'
import { track } from '@/lib/analytics'

/** Feature table for an alternatives page, with an "only differences" toggle (alternative_compare_toggle). */
export default function CompareTable({ competitor, name, rows }: { competitor: string; name: string; rows: CompetitorRow[] }) {
  const [diffOnly, setDiffOnly] = useState(false)
  const shown = diffOnly ? rows.filter((r) => r.us !== r.them) : rows
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
              <th scope="col">{name}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.feature}>
                <th scope="row">{r.feature}</th>
                <td>{r.us}</td>
                <td>{r.them}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
