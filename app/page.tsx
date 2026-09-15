import App from '../src/App'
import { createClient } from '../lib/supabase/server'
import type { EventItem } from '../src/App'

type SupabaseEvent = {
  slug: string
  title: string
  venue_name: string | null
  starts_at: string
  ticket_types: Array<{ price_kobo: number | string }>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value)).toUpperCase()
}

function formatPrice(priceKobo: number | string | undefined) {
  if (priceKobo === undefined) return 'Tickets available'
  return `From N${(Number(priceKobo) / 100).toLocaleString('en-NG')}`
}

async function getPublishedEvents(): Promise<EventItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('title, slug, venue_name, starts_at, ticket_types(price_kobo)')
    .eq('status', 'published')
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('Unable to load published events:', error.message)
    return []
  }

  return (data as SupabaseEvent[]).map((event, index) => ({
    slug: event.slug,
    title: event.title,
    location: event.venue_name ?? 'Location to be announced',
    date: formatDate(event.starts_at),
    category: 'Event',
    price: formatPrice(event.ticket_types[0]?.price_kobo),
    code: String(index + 1).padStart(2, '0'),
  }))
}

export default async function HomePage() {
  const events = await getPublishedEvents()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOrganizer = user?.user_metadata?.role === 'organizer'
  return <App events={events} isOrganizer={isOrganizer} />
}