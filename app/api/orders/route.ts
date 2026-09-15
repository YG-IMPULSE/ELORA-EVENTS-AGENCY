import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'

type OrderItemInput = { ticketTypeId?: string; quantity?: number }

export async function POST(request: Request) {
  let payload: { eventId?: string; items?: OrderItemInput[]; customerName?: string; customerEmail?: string }
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Invalid order request.' }, { status: 400 }) }
  const customerName = payload.customerName?.trim()
  const customerEmail = payload.customerEmail?.trim().toLowerCase()
  const items = payload.items ?? []
  if (!payload.eventId || !customerName || !customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail) || items.length === 0) return NextResponse.json({ error: 'Add customer details and at least one ticket.' }, { status: 400 })

  let supabase
  try { supabase = createAdminClient() } catch { return NextResponse.json({ error: 'Order service is not configured yet.' }, { status: 503 }) }
  const { data: event, error: eventError } = await supabase.from('events').select('id, title').eq('id', payload.eventId).eq('status', 'published').single()
  if (eventError || !event) return NextResponse.json({ error: 'This event is not available.' }, { status: 404 })

  const ids = items.map((item) => item.ticketTypeId).filter((id): id is string => Boolean(id))
  const { data: ticketTypes, error: ticketError } = await supabase.from('ticket_types').select('id, event_id, name, price_kobo, quantity_total, quantity_sold').in('id', ids).eq('event_id', event.id)
  if (ticketError || !ticketTypes || ticketTypes.length !== ids.length) return NextResponse.json({ error: 'One or more ticket types are unavailable.' }, { status: 400 })

  const lines = items.map((item) => {
    const ticket = ticketTypes.find((candidate) => candidate.id === item.ticketTypeId)
    const quantity = Number(item.quantity)
    if (!ticket || !Number.isInteger(quantity) || quantity < 1 || ticket.quantity_sold + quantity > ticket.quantity_total) return null
    const unitPrice = Number(ticket.price_kobo)
    return { ticketTypeId: ticket.id, quantity, unitPrice, lineTotal: unitPrice * quantity }
  })
  if (lines.some((line) => line === null)) return NextResponse.json({ error: 'A ticket quantity exceeds the remaining inventory.' }, { status: 409 })
  const validLines = lines as Array<{ ticketTypeId: string; quantity: number; unitPrice: number; lineTotal: number }>
  const subtotal = validLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const platformFee = Math.round(subtotal * 0.05)
  const total = subtotal + platformFee

  const { data: order, error: orderError } = await supabase.from('orders').insert({ customer_name: customerName, customer_email: customerEmail, event_id: event.id, status: 'pending', currency: 'NGN', subtotal_kobo: subtotal, platform_fee_kobo: platformFee, total_kobo: total }).select('id').single()
  if (orderError || !order) return NextResponse.json({ error: 'Unable to create your pending order.' }, { status: 500 })
  const { error: itemError } = await supabase.from('order_items').insert(validLines.map((line) => ({ order_id: order.id, ticket_type_id: line.ticketTypeId, quantity: line.quantity, unit_price_kobo: line.unitPrice, line_total_kobo: line.lineTotal })))
  if (itemError) { await supabase.from('orders').delete().eq('id', order.id); return NextResponse.json({ error: 'Unable to save your ticket selection.' }, { status: 500 }) }
  return NextResponse.json({ orderId: order.id, eventTitle: event.title, totalKobo: total }, { status: 201 })
}
