'use client'

import { useState } from 'react'
import type { TemplateVariant } from '@/data/templates'
import { track } from '@/lib/analytics'

/** Variant tabs on a template page; each switch sends template_view_variant. */
export default function VariantPicker({ template, variants }: { template: string; variants: TemplateVariant[] }) {
  const [active, setActive] = useState(0)
  if (variants.length === 0) return null
  const v = variants[active]
  return (
    <div className="variants">
      {variants.length > 1 && (
        <div role="tablist" aria-label="Template variants" className="tab-list">
          {variants.map((x, i) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              className="tab"
              onClick={() => {
                setActive(i)
                track('template_view_variant', { template, variant: x.key })
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
      <figure className="showcase-frame">
        <img src={v.image} alt={v.alt} width={v.width} height={v.height} />
      </figure>
    </div>
  )
}
