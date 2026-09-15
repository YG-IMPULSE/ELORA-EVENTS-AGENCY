import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'

export async function POST(request: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in is required to process a refund.' }, { status: 401 })
  let payload: { orderId?: string; amountKobo?: number; reason?: string }
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Invalid refund request.' }, { status: 400 }) }
  if (!payload.orderId) return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 })
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Flutterwave is not configured yet.' }, { status: 503 })
  let supabase
  try { supabase = createAdminClient() } catch { return NextResponse.json({ error: 'Order service is not configured yet.' }, { status: 503 }) }
  const { data: order } = await supabase.from('orders').select('id, status, total_kobo, provider_reference, event_id, events(organizer_id)').eq('id', payload.orderId).single()
  const event = (order?.events as Array<{ organizer_id: string }> | undefined)?.[0]
  if (!order || event?.organizer_id !== user.id) return NextResponse.json({ error: 'You cannot refund this order.' }, { status: 403 })
  if (order.status !== 'paid' || !order.provider_reference) return NextResponse.json({ error: 'Only verified paid orders can be refunded.' }, { status: 409 })
  const amountKobo = Number(payload.amountKobo ?? order.total_kobo)
  if (!Number.isInteger(amountKobo) || amountKobo < 1 || amountKobo > Number(order.total_kobo)) return NextResponse.json({ error: 'Refund amount is invalid.' }, { status: 400 })
  const { data: refund, error: refundError } = await supabase.from('refunds').insert({ order_id: order.id, amount_kobo: amountKobo, reason: payload.reason?.trim() || null, status: 'processing' }).select('id').single()
  if (refundError || !refund) return NextResponse.json({ error: 'Unable to create refund record.' }, { status: 500 })
  const flutterwaveResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(order.provider_reference)}/refund`, { method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountKobo / 100 }) })
  const result = await flutterwaveResponse.json() as { status?: string; message?: string; data?: { id?: string | number } }
  if (!flutterwaveResponse.ok || result.status !== 'success') {
    await supabase.from('refunds').update({ status: 'failed' }).eq('id', refund.id)
    return NextResponse.json({ error: result.message ?? 'Flutterwave refund failed.' }, { status: 502 })
  }
  const fullyRefunded = amountKobo === Number(order.total_kobo)
  await supabase.from('refunds').update({ status: 'completed', provider_reference: String(result.data?.id ?? order.provider_reference), completed_at: new Date().toISOString() }).eq('id', refund.id)
  await supabase.from('orders').update({ status: fullyRefunded ? 'refunded' : 'partially_refunded' }).eq('id', order.id)
  if (fullyRefunded) {
    const { data: orderItems } = await supabase.from('order_items').select('id').eq('order_id', order.id)
    const orderItemIds = (orderItems ?? []).map((item) => item.id)
    if (orderItemIds.length > 0) await supabase.from('tickets').update({ status: 'refunded' }).in('order_item_id', orderItemIds)
    await supabase.from('commission_ledger').update({ status: 'reversed' }).eq('order_id', order.id)
  }
  return NextResponse.json({ refunded: true, refundId: refund.id, amountKobo })
}
