import PaymentCompleteClient from './payment-complete-client'

export default async function PaymentCompletePage({ searchParams }: { searchParams: Promise<{ order_id?: string; transaction_id?: string; status?: string }> }) {
  const params = await searchParams
  return <PaymentCompleteClient orderId={params.order_id} transactionId={params.transaction_id} status={params.status} />
}
