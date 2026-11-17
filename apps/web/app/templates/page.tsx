import HubPage from '@/components/HubPage'
import { hubs, liveFamilies } from '@/data/pages'
import { pageMetadata } from '@/lib/pageMeta'

const hub = hubs.templates

// An empty family's hub is noindex and stays out of the sitemap until its first entry lands.
export const metadata = pageMetadata({
  path: hub.path,
  title: hub.title,
  description: hub.description,
  index: liveFamilies().includes('templates'),
})

export default function Page() {
  return <HubPage family="templates" />
}
