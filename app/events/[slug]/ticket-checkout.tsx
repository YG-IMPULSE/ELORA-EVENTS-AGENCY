'use client'

import { useState } from 'react'

type TicketType = { id: string; name: string; description: string | null; price_kobo: number | string; quantity_total: number; quantity_sold: number }

export default function TicketCheckout({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketType[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const total = ticketTypes.reduce((sum, ticket) => sum + (quantities[ticket.id] ?? 0) * Number(ticket.price_kobo), 0)
  const formatNaira = (kobo: number) => `N${(kobo / 100).toLocaleString('en-NG')}`

  const changeQuantity = (id: string, value: number, available: number) => setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(value, available)) }))

  const startCheckout = async () => {
    if (!name.trim() || !email.trim() || total === 0) { setMessage('Add your name, email and at least one ticket.'); return }
    setLoading(true); setMessage('')
    const items = ticketTypes.filter((ticket) => (quantities[ticket.id] ?? 0) > 0).map((ticket) => ({ ticketTypeId: ticket.id, quantity: quantities[ticket.id] }))
    const orderResponse = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, items, customerName: name.trim(), customerEmail: email.trim() }) })
    const order = await orderResponse.json() as { orderId?: string; error?: string }
    if (!orderResponse.ok || !order.orderId) { setLoading(false); setMessage(order.error ?? 'Unable to create your order.'); return }
    const paymentResponse = await fetch('/api/payments/flutterwave/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.orderId, customerName: name.trim(), customerEmail: email.trim() }) })
    const payment = await paymentResponse.json() as { paymentLink?: string; error?: string }
    setLoading(false)
    if (!paymentResponse.ok || !payment.paymentLink) { setMessage(payment.error ?? 'Unable to start payment.'); return }
    window.location.href = payment.paymentLink
  }

  return <aside className="ticket-checkout"><div className="checkout-heading"><p className="eyebrow">SELECT YOUR ACCESS</p><h2>Tickets</h2></div><div className="ticket-options">{ticketTypes.map((ticket) => { const available = ticket.quantity_total - ticket.quantity_sold; const quantity = quantities[ticket.id] ?? 0; return <div className="ticket-option" key={ticket.id}><div><b>{ticket.name}</b><small>{ticket.description ?? `${available} remaining`}</small></div><strong>{formatNaira(Number(ticket.price_kobo))}</strong><div className="quantity-control"><button type="button" onClick={() => changeQuantity(ticket.id, quantity - 1, available)} aria-label={`Remove ${ticket.name}`}>−</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(ticket.id, quantity + 1, available)} aria-label={`Add ${ticket.name}`}>+</button></div></div> })}</div><div className="checkout-total"><span>Total</span><b>{formatNaira(total)}</b></div><label className="checkout-label">Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label><label className="checkout-label">Email for your ticket<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button type="button" className="button button--dark checkout-button" onClick={startCheckout} disabled={loading}>{loading ? 'Preparing secure checkout...' : `Continue to payment →`}</button>{message && <p className="checkout-message">{message}</p>}<small className="checkout-note">Secure payment by Flutterwave. Tickets are issued after payment verification.</small></aside>
}