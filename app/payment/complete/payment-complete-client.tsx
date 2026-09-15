'use client'

import { useEffect, useState } from 'react'

type VerificationState = 'checking' | 'success' | 'failed'

export default function PaymentCompleteClient({ orderId, transactionId, txRef, status }: { orderId?: string; transactionId?: string; txRef?: string; status?: string }) {
  const [state, setState] = useState<VerificationState>('checking')
  const [message, setMessage] = useState('Verifying your payment securely...')

  useEffect(() => {
    if (!orderId || (!transactionId && !txRef) || status === 'cancelled') { queueMicrotask(() => { setState('failed'); setMessage('Payment was cancelled or the confirmation details are missing.') }); return }
    const verify = async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (attempt > 0) {
          setMessage(`Still checking Flutterwave... attempt ${attempt + 1} of 8.`)
          await new Promise((resolve) => setTimeout(resolve, Math.min(12000, 2000 * attempt)))
        }
        const response = await fetch('/api/payments/flutterwave/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, transactionId, txRef }) })
        const result = await response.json() as { error?: string; retryable?: boolean; ticketCodes?: string[]; emailSent?: boolean }
        if (response.ok && !result.retryable) {
          setState('success'); setMessage(result.emailSent ? 'Payment verified. Your ticket has been sent to your email.' : 'Payment verified. Your ticket is ready, but email delivery is not configured yet.')
          return
        }
        if (!result.retryable && response.status !== 408 && response.status !== 429 && response.status !== 502 && response.status !== 503) { setState('failed'); setMessage(result.error ?? 'We could not verify this payment.'); return }
      }
      setState('failed'); setMessage('We could not confirm the payment yet. Your order remains under review; please contact support before trying to pay again.')
    }
    verify().catch(() => { setState('failed'); setMessage('We could not reach the payment verification service.') })
  }, [orderId, transactionId, txRef, status])

  return <main className="payment-complete-page"><div className={`payment-result payment-result--${state}`}><p className="eyebrow">ELORA PAYMENT STATUS</p><div className="payment-icon">{state === 'checking' ? '...' : state === 'success' ? '✓' : '!'}</div><h1>{state === 'checking' ? 'One moment.' : state === 'success' ? 'You are going.' : 'Payment needs attention.'}</h1><p>{message}</p>{state === 'success' ? <a className="button button--dark" href="/">Back to events <span>→</span></a> : <a className="button button--outline" href="/">Return to Elora <span>→</span></a>}</div></main>
}
