import { trackAttrs } from '@/lib/analytics'

/** "On this page" links for long family pages; each click sends toc_click. */
export default function Toc({ items }: { items: { id: string; label: string }[] }) {
  if (items.length < 3) return null
  return (
    <nav aria-label="On this page" className="toc">
      <p className="eyebrow">On this page</p>
      <ol>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} {...trackAttrs('toc_click', { label: i.id })}>{i.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
