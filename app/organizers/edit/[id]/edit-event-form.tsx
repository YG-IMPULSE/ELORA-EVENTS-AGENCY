'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

type EventForm = { id: string; title: string; description: string | null; venueName: string | null; venueAddress: string | null; coverImageUrl: string | null; startsAt: string; endsAt: string | null; status: string; ticketName: string; ticketDescription: string | null; ticketPriceNaira: number; ticketQuantity: number; ticketQuantitySold: number }

function toInputDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : ''
}

export default function EditEventForm({ event }: { event: EventForm }) {
  const router = useRouter()
  const [form, setForm] = useState({ title: event.title, description: event.description ?? '', venueName: event.venueName ?? '', venueAddress: event.venueAddress ?? '', coverImageUrl: event.coverImageUrl ?? '', startsAt: toInputDate(event.startsAt), endsAt: toInputDate(event.endsAt), ticketName: event.ticketName, ticketDescription: event.ticketDescription ?? '', ticketPriceNaira: String(event.ticketPriceNaira), ticketQuantity: String(event.ticketQuantity) })
  const [status, setStatus] = useState<'draft' | 'published'>(event.status === 'published' ? 'published' : 'draft')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (submitStatus: 'draft' | 'published') => {
    setSaving(true); setMessage('')
    const response = await fetch('/api/organizer/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: event.id, ...form, ticketPriceNaira: Number(form.ticketPriceNaira), ticketQuantity: Number(form.ticketQuantity), status: submitStatus }) })
    const result = await response.json() as { error?: string }
    setSaving(false)
    setMessage(response.ok ? submitStatus === 'published' ? 'Event updated and published.' : 'Draft updated.' : result.error ?? 'Unable to update this event.')
    if (response.ok) router.refresh()
  }

  const handleSubmit = (eventData: FormEvent<HTMLFormElement>) => { eventData.preventDefault(); void submit(status) }
  return <main className="create-event-page"><nav className="topbar organizer-topbar" aria-label="Event editing navigation"><a className="wordmark" href="/">ELORA<span>/</span></a><span>ORGANIZER CONTROL / EDIT EVENT</span><a className="text-link" href="/organizers/dashboard">Back to dashboard ↑</a></nav><section className="create-event-layout"><div className="create-event-intro">{form.coverImageUrl && <img className="event-cover-preview" src={form.coverImageUrl} alt="" />}<p className="eyebrow">EDIT EVENT</p><h1>Keep the details<br /><strong>current.</strong></h1><p>Update the event information and ticket setup. Sold tickets are protected from inventory reductions.</p></div><form className="event-form" onSubmit={handleSubmit}><div className="form-section"><p className="form-section-title">01 / Event information</p><label>Event name<input required value={form.title} onChange={(event) => updateField('title', event.target.value)} /></label><label>Description<textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label><div className="form-grid"><label>Start date and time<input required type="datetime-local" value={form.startsAt} onChange={(event) => updateField('startsAt', event.target.value)} /></label><label>End date and time<input type="datetime-local" value={form.endsAt} onChange={(event) => updateField('endsAt', event.target.value)} /></label></div><label>Venue name<input value={form.venueName} onChange={(event) => updateField('venueName', event.target.value)} /></label><label>Venue address<input value={form.venueAddress} onChange={(event) => updateField('venueAddress', event.target.value)} /></label><label>Cover image URL<input type="url" value={form.coverImageUrl} onChange={(event) => updateField('coverImageUrl', event.target.value)} placeholder="https://..." /></label></div><div className="form-section"><p className="form-section-title">02 / Ticket type</p><div className="form-grid"><label>Ticket name<input required value={form.ticketName} onChange={(event) => updateField('ticketName', event.target.value)} /></label><label>Price in Naira<input required min="0" step="0.01" type="number" value={form.ticketPriceNaira} onChange={(event) => updateField('ticketPriceNaira', event.target.value)} /></label></div><div className="form-grid"><label>Ticket quantity<input required min={event.ticketQuantitySold} step="1" type="number" value={form.ticketQuantity} onChange={(event) => updateField('ticketQuantity', event.target.value)} /><small>{event.ticketQuantitySold} already sold</small></label><label>Ticket note<input value={form.ticketDescription} onChange={(event) => updateField('ticketDescription', event.target.value)} /></label></div></div><div className="form-actions"><button type="button" className="button button--outline" onClick={() => { setStatus('draft'); void submit('draft') }} disabled={saving}>{saving && status === 'draft' ? 'Saving...' : 'Save draft'}</button><button type="button" className="button button--dark" onClick={() => { setStatus('published'); void submit('published') }} disabled={saving}>{saving && status === 'published' ? 'Saving...' : 'Publish event →'}</button></div>{message && <p className={message.includes('Unable') || message.includes('cannot') ? 'form-error' : 'form-success'}>{message}</p>}</form></section></main>
}