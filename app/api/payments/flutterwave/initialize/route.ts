import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'

type PaymentPayload = { orderId?: string; customerName?: string; customerEmail?: string }

type FlutterwaveResponse = { status: string; message: string; data?: { link: string } }

export async function POST(request: Request) {
  let payload: PaymentPayload
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Invalid payment request.' }, { status: 400 }) }
  if (!payload.orderId || !payload.customerName?.trim() || !payload.customerEmail?.trim()) return NextResponse.json({ error: 'Order and customer details are required.' }, { status: 400 })
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Flutterwave is not configured yet.' }, { status: 503 })

  let supabase
  try { supabase = createAdminClient() } catch { return NextResponse.json({ error: 'Order service is not configured yet.' }, { status: 503 }) }
  const { data: order, error: orderError } = await supabase.from('orders').select('id, status, total_kobo, event_id, events(title)').eq('id', payload.orderId).single()
  if (orderError || !order || order.status !== 'pending') return NextResponse.json({ error: 'This order is no longer payable.' }, { status: 409 })
  const totalNaira = Number(order.total_kobo) / 100
  const txRef = `ELORA-${order.id}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', { method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tx_ref: txRef, amount: totalNaira, currency: 'NGN', redirect_url: `${siteUrl}/payment/complete?order_id=${order.id}`, customer: { email: payload.customerEmail.trim().toLowerCase(), name: payload.customerName.trim() }, customizations: { title: 'Elora tickets', description: `Ticket order for ${Array.isArray(order.events) ? 'your event' : 'your event'}`, logo: `${siteUrl}/favicon.svg` }, meta: { order_id: order.id, event_id: order.event_id } }) })
  const result = await flutterwaveResponse.json() as FlutterwaveResponse
  if (!flutterwaveResponse.ok || result.status !== 'success' || !result.data?.link) return NextResponse.json({ error: result.message || 'Flutterwave could not initialize payment.' }, { status: 502 })
  await supabase.from('orders').update({ provider: 'flutterwave', provider_transaction_id: txRef }).eq('id', order.id)
  return NextResponse.json({ paymentLink: result.data.link }, { status: 200 })
}
