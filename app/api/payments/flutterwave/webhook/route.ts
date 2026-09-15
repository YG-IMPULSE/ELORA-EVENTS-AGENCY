import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { settlePaidOrder } from '../../../../../lib/payments/settle'

export async function POST(request: Request) {
  const expectedHash = process.env.FLUTTERWAVE_SECRET_HASH
  const receivedHash = request.headers.get('verif-hash')
  if (!expectedHash || !receivedHash || receivedHash !== expectedHash) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  const body = await request.json() as { id?: string | number; event?: string; data?: { id?: string | number; tx_ref?: string; status?: string } }
  const providerEventId = String(body.id ?? body.data?.id ?? '')
  if (!providerEventId) return NextResponse.json({ error: 'Webhook event ID is missing.' }, { status: 400 })
  const supabase = createAdminClient()
  const { error: insertError } = await supabase.from('webhook_events').insert({ provider: 'flutterwave', provider_event_id: providerEventId, event_type: body.event ?? 'unknown', payload: body })
  if (insertError?.code === '23505') return NextResponse.json({ received: true, duplicate: true })
  if (insertError) return NextResponse.json({ error: 'Webhook could not be recorded.' }, { status: 500 })
  if (body.data?.status !== 'successful' || !body.data.tx_ref) return NextResponse.json({ received: true, processed: false })
  const { data: order } = await supabase.from('orders').select('id').eq('provider_transaction_id', body.data.tx_ref).single()
  if (!order) return NextResponse.json({ received: true, processed: false })
  try {
    const settlement = await settlePaidOrder(order.id, String(body.data.id ?? providerEventId))
    await supabase.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'flutterwave').eq('provider_event_id', providerEventId)
    return NextResponse.json({ received: true, processed: true, ...settlement })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook settlement failed.' }, { status: 500 })
  }
}
