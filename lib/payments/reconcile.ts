import { settlePaidOrder } from './settle'
import { createAdminClient } from '../supabase/admin'

type PendingOrder = { id: string; event_id: string; total_kobo: number | string; provider_transaction_id: string | null }
type VerifyResponse = { status?: string; data?: { id?: number; status?: string; amount?: number; currency?: string; tx_ref?: string } }

export async function reconcilePendingOrders(eventIds: string[]) {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim()
  if (!secretKey || eventIds.length === 0) return 0

  const admin = createAdminClient()
  const { data: pendingOrders } = await admin
    .from('orders')
    .select('id, event_id, total_kobo, provider_transaction_id')
    .eq('status', 'pending')
    .in('event_id', eventIds)
    .not('provider_transaction_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(25)

  let settledCount = 0
  for (const order of (pendingOrders ?? []) as PendingOrder[]) {
    const reference = order.provider_transaction_id
    if (!reference) continue
    try {
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) continue
      const result = await response.json() as VerifyResponse
      const transaction = result.data
      const verified = result.status === 'success' && transaction?.status === 'successful' && transaction.currency === 'NGN' && transaction.tx_ref === reference && Number(transaction.amount) === Number(order.total_kobo) / 100
      if (!verified || transaction?.id === undefined) continue
      await settlePaidOrder(order.id, String(transaction.id))
      settledCount += 1
    } catch (error) {
      console.error(`Pending payment reconciliation failed for order ${order.id}:`, error)
    }
  }
  return settledCount
}
