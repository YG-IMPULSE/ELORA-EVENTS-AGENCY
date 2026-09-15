'use client'

import { useEffect, useState } from 'react'

type VerificationState = 'checking' | 'success' | 'failed'

export default function PaymentCompleteClient({ orderId, transactionId, status }: { orderId?: string; transactionId?: string; status?: string }) {
  const [state, setState] = useState<VerificationState>('checking')
  const [message, setMessage] = useState('Verifying your payment securely...')

  useEffect(() => {
    if (!orderId || !transactionId || status === 'cancelled') { queueMicrotask(() => { setState('failed'); setMessage('Payment was cancelled or the confirmation details are missing.') }); return }
    const verify = async () => {
      const response = await fetch('/api/payments/flutterwave/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, transactionId }) })
      const result = await response.json() as { error?: string; ticketCodes?: string[]; emailSent?: boolean }
      if (!response.ok) { setState('failed'); setMessage(result.error ?? 'We could not verify this payment.'); return }
      setState('success'); setMessage(result.emailSent ? 'Payment verified. Your ticket has been sent to your email.' : 'Payment verified. Your ticket is ready, but email delivery is not configured yet.')
    }
    verify().catch(() => { setState('failed'); setMessage('We could not reach the payment verification service.') })
  }, [orderId, transactionId, status])

  return <main className="payment-complete-page"><div className={`payment-result payment-result--${state}`}><p className="eyebrow">ELORA PAYMENT STATUS</p><div className="payment-icon">{state === 'checking' ? '...' : state === 'success' ? '✓' : '!'}</div><h1>{state === 'checking' ? 'One moment.' : state === 'success' ? 'You are going.' : 'Payment needs attention.'}</h1><p>{message}</p>{state === 'success' ? <a className="button button--dark" href="/">Back to events <span>→</span></a> : <a className="button button--outline" href="/">Return to Elora <span>→</span></a>}</div></main>
}
