import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import TicketCheckout from './ticket-checkout'

type EventRecord = {
  id: string
  title: string
  slug: string
  description: string | null
  venue_name: string | null
  venue_address: string | null
  cover_image_url: string | null
  starts_at: string
  ends_at: string | null
  ticket_types: Array<{ id: string; name: string; description: string | null; price_kobo: number | string; quantity_total: number; quantity_sold: number }>
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('events').select('id, title, slug, description, venue_name, venue_address, cover_image_url, starts_at, ends_at, ticket_types(id, name, description, price_kobo, quantity_total, quantity_sold)').eq('slug', slug).eq('status', 'published').single()
  if (error || !data) notFound()
  const event = data as EventRecord
  return <main className="event-page"><nav className="topbar"><a className="wordmark" href="/">ELORA<span>/</span></a><a className="text-link" href="/">Back to events ↑</a></nav><section className="event-detail-layout"><div className="event-detail-intro">{event.cover_image_url && <img className="event-cover" src={event.cover_image_url} alt={event.title} />}<p className="eyebrow">ELORA EVENT / {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(event.starts_at)).toUpperCase()}</p><h1>{event.title}</h1><p className="event-detail-description">{event.description ?? 'A carefully produced experience, presented by Elora.'}</p><div className="event-facts"><span><b>When</b>{new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(event.starts_at))}</span><span><b>Where</b>{event.venue_name ?? 'Venue to be announced'}<small>{event.venue_address}</small></span></div></div><TicketCheckout eventId={event.id} ticketTypes={event.ticket_types} /></section></main>
}