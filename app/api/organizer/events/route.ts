import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type EventPayload = {
  eventId?: string
  title?: string
  description?: string
  venueName?: string
  venueAddress?: string
  startsAt?: string
  endsAt?: string
  status?: 'draft' | 'published'
  ticketName?: string
  ticketDescription?: string
  ticketPriceNaira?: number
  ticketQuantity?: number
}

function createSlug(title: string) {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must sign in as an organizer first.' }, { status: 401 })
  }

  const payload = await request.json() as EventPayload
  const title = payload.title?.trim()
  const startsAt = payload.startsAt ? new Date(payload.startsAt) : null
  const ticketPriceNaira = Number(payload.ticketPriceNaira)
  const ticketQuantity = Number(payload.ticketQuantity)

  if (!title || !startsAt || Number.isNaN(startsAt.getTime()) || !payload.ticketName?.trim() || !Number.isFinite(ticketPriceNaira) || ticketPriceNaira < 0 || !Number.isInteger(ticketQuantity) || ticketQuantity < 1) {
    return NextResponse.json({ error: 'Add an event title, valid start time, ticket details, price and quantity.' }, { status: 400 })
  }

  const { data: createdEvent, error: eventError } = await supabase.from('events').insert({
    organizer_id: user.id,
    title,
    slug: createSlug(title),
    description: payload.description?.trim() || null,
    venue_name: payload.venueName?.trim() || null,
    venue_address: payload.venueAddress?.trim() || null,
    starts_at: startsAt.toISOString(),
    ends_at: payload.endsAt ? new Date(payload.endsAt).toISOString() : null,
    status: payload.status === 'published' ? 'published' : 'draft',
  }).select('id, slug').single()

  if (eventError || !createdEvent) {
    return NextResponse.json({ error: eventError?.message ?? 'Unable to create the event.' }, { status: 400 })
  }

  const { error: ticketError } = await supabase.from('ticket_types').insert({
    event_id: createdEvent.id,
    name: payload.ticketName.trim(),
    description: payload.ticketDescription?.trim() || null,
    price_kobo: Math.round(ticketPriceNaira * 100),
    quantity_total: ticketQuantity,
  })

  if (ticketError) {
    await supabase.from('events').delete().eq('id', createdEvent.id)
    return NextResponse.json({ error: ticketError.message }, { status: 400 })
  }

  return NextResponse.json({ event: createdEvent }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'You must sign in as an organizer first.' }, { status: 401 })

  const payload = await request.json() as EventPayload
  const title = payload.title?.trim()
  const startsAt = payload.startsAt ? new Date(payload.startsAt) : null
  const endsAt = payload.endsAt ? new Date(payload.endsAt) : null
  const ticketPriceNaira = Number(payload.ticketPriceNaira)
  const ticketQuantity = Number(payload.ticketQuantity)

  if (!payload.eventId || !title || !startsAt || Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime())) || (endsAt && endsAt < startsAt) || !payload.ticketName?.trim() || !Number.isFinite(ticketPriceNaira) || ticketPriceNaira < 0 || !Number.isInteger(ticketQuantity) || ticketQuantity < 1) {
    return NextResponse.json({ error: 'Add an event title, valid dates, ticket details, price and quantity.' }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabase.from('events').select('id').eq('id', payload.eventId).eq('organizer_id', user.id).single()
  if (eventError || !event) return NextResponse.json({ error: 'Event not found or you do not have permission to edit it.' }, { status: 404 })

  const { data: ticket, error: ticketLookupError } = await supabase.from('ticket_types').select('id, quantity_sold').eq('event_id', event.id).order('created_at', { ascending: true }).limit(1).single()
  if (ticketLookupError || !ticket) return NextResponse.json({ error: 'This event does not have an editable ticket type.' }, { status: 400 })
  if (ticketQuantity < ticket.quantity_sold) return NextResponse.json({ error: `Ticket quantity cannot be lower than the ${ticket.quantity_sold} tickets already sold.` }, { status: 409 })

  const { error: updateError } = await supabase.from('events').update({ title, description: payload.description?.trim() || null, venue_name: payload.venueName?.trim() || null, venue_address: payload.venueAddress?.trim() || null, starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, status: payload.status === 'published' ? 'published' : 'draft' }).eq('id', event.id).eq('organizer_id', user.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  const { error: ticketError } = await supabase.from('ticket_types').update({ name: payload.ticketName.trim(), description: payload.ticketDescription?.trim() || null, price_kobo: Math.round(ticketPriceNaira * 100), quantity_total: ticketQuantity }).eq('id', ticket.id).eq('event_id', event.id)
  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 400 })

  return NextResponse.json({ updated: true }, { status: 200 })
}