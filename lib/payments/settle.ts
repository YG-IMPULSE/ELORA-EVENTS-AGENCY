import QRCode from 'qrcode'
import { createAdminClient } from '../supabase/admin'

export type SettlementResult = { alreadySettled: boolean; ticketCodes: string[]; emailSent: boolean }

type OrderRecord = {
  id: string
  status: string
  total_kobo: number | string
  customer_name: string | null
  customer_email: string | null
  event_id: string
  provider_transaction_id: string | null
  events: Array<{ organizer_id: string; title: string }>
  order_items: Array<{ id: string; ticket_type_id: string; quantity: number; unit_price_kobo: number | string; ticket_types: Array<{ name: string }> }>
}

async function sendTicketEmail(order: OrderRecord, tickets: Array<{ ticketCode: string; qrDataUrl: string }>) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !order.customer_email) return false
  const ticketMarkup = tickets.map((ticket) => `<div style="margin:24px 0;padding:16px;border:1px solid #d6dde7"><img width="180" src="${ticket.qrDataUrl}" alt="Ticket QR code" /><p><strong>${ticket.ticketCode}</strong></p></div>`).join('')
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [order.customer_email], subject: `Your Elora ticket for ${order.events[0]?.title ?? 'your event'}`, html: `<div style="font-family:Arial,sans-serif;color:#070a10"><h1>Your ticket is ready.</h1><p>Hi ${order.customer_name ?? 'there'}, your payment was verified. Show the QR code below at the venue.</p>${ticketMarkup}<p>Keep this email available on your phone.</p></div>` }) })
    return response.ok
  } catch (error) {
    console.error('Ticket email delivery failed:', error)
    return false
  }
}

export async function settlePaidOrder(orderId: string, providerReference: string): Promise<SettlementResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('orders').select('id, status, total_kobo, customer_name, customer_email, event_id, provider_transaction_id, events(organizer_id, title), order_items(id, ticket_type_id, quantity, unit_price_kobo, ticket_types(name))').eq('id', orderId).single()
  if (error || !data) throw new Error('Order not found.')
  const order = data as OrderRecord
  if (order.status === 'paid') return { alreadySettled: true, ticketCodes: [], emailSent: false }
  if (order.status !== 'pending') throw new Error('Order is not payable.')
  if (order.provider_transaction_id !== `ELORA-${order.id}`) throw new Error('Order payment reference does not match.')
  const event = order.events[0]
  if (!event) throw new Error('Order event is missing an organizer.')

  const tickets: Array<{ ticketCode: string; qrDataUrl: string }> = []
  for (const item of order.order_items) {
    for (let index = 0; index < item.quantity; index += 1) {
      const ticketCode = `ELR-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
      const qrPayload = JSON.stringify({ ticketCode, orderId: order.id, eventId: order.event_id })
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 240 })
      const { error: ticketError } = await supabase.from('tickets').insert({ order_item_id: item.id, event_id: order.event_id, ticket_code: ticketCode, qr_payload: qrPayload, status: 'issued' })
      if (ticketError) throw new Error(`Ticket creation failed: ${ticketError.message}`)
      tickets.push({ ticketCode, qrDataUrl })
    }
    const { data: currentType } = await supabase.from('ticket_types').select('quantity_sold').eq('id', item.ticket_type_id).single()
    const nextSold = Number(currentType?.quantity_sold ?? 0) + item.quantity
    const { error: inventoryError } = await supabase.from('ticket_types').update({ quantity_sold: nextSold }).eq('id', item.ticket_type_id)
    if (inventoryError) throw new Error(`Inventory update failed: ${inventoryError.message}`)
  }

  const total = Number(order.total_kobo)
  const platformFee = Math.round(total * 0.05)
  const organizerAmount = total - platformFee
  const { data: ledger, error: ledgerError } = await supabase.from('commission_ledger').insert({ order_id: order.id, organizer_id: event.organizer_id, gross_kobo: total, platform_fee_kobo: platformFee, organizer_amount_kobo: organizerAmount, status: 'payable' }).select('id').single()
  if (ledgerError || !ledger) throw new Error(`Commission ledger failed: ${ledgerError?.message ?? 'unknown error'}`)
  await supabase.from('payouts').insert({ organizer_id: event.organizer_id, commission_ledger_id: ledger.id, amount_kobo: organizerAmount, status: 'pending', provider: 'flutterwave' })
  await supabase.from('orders').update({ status: 'paid', provider_reference: providerReference, paid_at: new Date().toISOString(), verified_at: new Date().toISOString() }).eq('id', order.id)
  const emailSent = await sendTicketEmail(order, tickets)
  return { alreadySettled: false, ticketCodes: tickets.map((ticket) => ticket.ticketCode), emailSent }
}
