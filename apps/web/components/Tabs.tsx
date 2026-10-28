'use client'

import { useState, type ReactNode } from 'react'
import { track } from '@/lib/analytics'

export interface Tab {
  key: string
  label: ReactNode
  content: ReactNode
}

/** Minimal accessible tab set. Every panel is server-rendered so crawlers see all of it. */
export default function Tabs({
  tabs,
  label,
  trackGroup,
  className = '',
}: {
  tabs: Tab[]
  label: string
  /** tab_select `group` param, e.g. example_app or package_manager. */
  trackGroup: string
  className?: string
}) {
  const [active, setActive] = useState(tabs[0].key)

  return (
    <div className={className}>
      <div className="tab-list" role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`panel-${tab.key}`}
            className="tab"
            onClick={() => {
              setActive(tab.key)
              track('tab_select', { group: trackGroup, label: tab.key })
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`panel-${tab.key}`}
          aria-labelledby={`tab-${tab.key}`}
          hidden={active !== tab.key}
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
