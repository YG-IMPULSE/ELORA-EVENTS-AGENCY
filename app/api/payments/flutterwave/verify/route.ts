import { NextResponse } from 'next/server'
import { settlePaidOrder } from '../../../../../lib/payments/settle'
import { createAdminClient } from '../../../../../lib/supabase/admin'

type FlutterwaveVerifyResponse = { status: string; message: string; data?: { status: string; amount: number; currency: string; tx_ref: string; id: number } }

export async function POST(request: Request) {
  let payload: { orderId?: string; transactionId?: string }
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 }) }
  if (!payload.orderId || !payload.transactionId) return NextResponse.json({ error: 'Order and transaction IDs are required.' }, { status: 400 })
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Flutterwave is not configured yet.' }, { status: 503 })
  let supabase
  try { supabase = createAdminClient() } catch { return NextResponse.json({ error: 'Order service is not configured yet.' }, { status: 503 }) }
  const { data: order } = await supabase.from('orders').select('id, total_kobo, provider_transaction_id, currency').eq('id', payload.orderId).single()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  const flutterwaveResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(payload.transactionId)}/verify`, { headers: { Authorization: `Bearer ${secretKey}` } })
  const result = await flutterwaveResponse.json() as FlutterwaveVerifyResponse
  const verified = result.status === 'success' && result.data?.status === 'successful' && result.data.currency === 'NGN' && result.data.tx_ref === order.provider_transaction_id && Number(result.data.amount) === Number(order.total_kobo) / 100
  if (!flutterwaveResponse.ok || !verified || !result.data) return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 402 })
  try {
    const settlement = await settlePaidOrder(order.id, String(result.data.id))
    return NextResponse.json({ verified: true, ...settlement })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment settlement failed.' }, { status: 500 })
  }
}
