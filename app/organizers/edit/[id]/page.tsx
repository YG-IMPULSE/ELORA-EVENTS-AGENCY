import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import EditEventForm from './edit-event-form'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/organizers/sign-in?next=/organizers/edit/${id}`)

  const { data: event } = await supabase.from('events').select('id, title, description, venue_name, venue_address, cover_image_url, starts_at, ends_at, status, ticket_types(id, name, description, price_kobo, quantity_total, quantity_sold)').eq('id', id).eq('organizer_id', user.id).single()
  if (!event || !event.ticket_types?.[0]) notFound()

  const ticket = event.ticket_types[0]
  return <EditEventForm event={{ id: event.id, title: event.title, description: event.description, venueName: event.venue_name, venueAddress: event.venue_address, coverImageUrl: event.cover_image_url, startsAt: event.starts_at, endsAt: event.ends_at, status: event.status, ticketName: ticket.name, ticketDescription: ticket.description, ticketPriceNaira: Number(ticket.price_kobo) / 100, ticketQuantity: ticket.quantity_total, ticketQuantitySold: ticket.quantity_sold }} />
}