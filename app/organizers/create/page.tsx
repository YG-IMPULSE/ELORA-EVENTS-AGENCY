'use client'

import { FormEvent, useState } from 'react'

const initialForm = {
  title: '', description: '', venueName: '', venueAddress: '', startsAt: '', endsAt: '',
  ticketName: 'General Admission', ticketDescription: '', ticketPriceNaira: '', ticketQuantity: '100',
}

export default function CreateEventPage() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const updateField = (field: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/organizer/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ticketPriceNaira: Number(form.ticketPriceNaira), ticketQuantity: Number(form.ticketQuantity), status }) })
    const result = await response.json() as { error?: string; event?: { slug: string } }
    setSaving(false)
    if (!response.ok) {
      setMessage(result.error ?? 'Unable to save this event.')
      return
    }
    setMessage(status === 'published' ? 'Published. Your event is now ready for the public homepage.' : 'Draft saved. You can publish it when the details are ready.')
    setForm(initialForm)
  }

  return (
    <main className="create-event-page"><nav className="topbar organizer-topbar" aria-label="Event creation navigation"><a className="wordmark" href="/">ELORA<span>/</span></a><span>ORGANIZER CONTROL / NEW EVENT</span><a className="text-link" href="/organizers">Back to organizer space ↑</a></nav><section className="create-event-layout"><div className="create-event-intro"><p className="eyebrow">NEW EVENT</p><h1>Put the details<br /><strong>in one place.</strong></h1><p>Create a draft first, review the ticket setup, then publish when you are ready. Published events appear on the Elora discovery page.</p><div className="create-event-checklist"><span><b>01</b> Event information</span><span><b>02</b> Ticket inventory</span><span><b>03</b> Publish when ready</span></div></div><form className="event-form" onSubmit={submit}><div className="form-section"><p className="form-section-title">01 / Event information</p><label>Event name<input required value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Lagos After Dark" /></label><label>Description<textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="What should attendees know?" /></label><div className="form-grid"><label>Start date and time<input required type="datetime-local" value={form.startsAt} onChange={(event) => updateField('startsAt', event.target.value)} /></label><label>End date and time<input type="datetime-local" value={form.endsAt} onChange={(event) => updateField('endsAt', event.target.value)} /></label></div><label>Venue name<input value={form.venueName} onChange={(event) => updateField('venueName', event.target.value)} placeholder="Muri Okunola Park" /></label><label>Venue address<input value={form.venueAddress} onChange={(event) => updateField('venueAddress', event.target.value)} placeholder="Victoria Island, Lagos" /></label></div><div className="form-section"><p className="form-section-title">02 / First ticket type</p><div className="form-grid"><label>Ticket name<input required value={form.ticketName} onChange={(event) => updateField('ticketName', event.target.value)} /></label><label>Price in Naira<input required min="0" step="0.01" type="number" value={form.ticketPriceNaira} onChange={(event) => updateField('ticketPriceNaira', event.target.value)} placeholder="35000" /></label></div><div className="form-grid"><label>Ticket quantity<input required min="1" step="1" type="number" value={form.ticketQuantity} onChange={(event) => updateField('ticketQuantity', event.target.value)} /></label><label>Ticket note<input value={form.ticketDescription} onChange={(event) => updateField('ticketDescription', event.target.value)} placeholder="Entry before 10pm" /></label></div></div><div className="form-actions"><button type="submit" className="button button--outline" onClick={() => setStatus('draft')} disabled={saving}>{saving && status === 'draft' ? 'Saving...' : 'Save draft'}</button><button type="submit" className="button button--dark" onClick={() => setStatus('published')} disabled={saving}>{saving && status === 'published' ? 'Publishing...' : 'Publish event →'}</button></div>{message && <p className={message.startsWith('Unable') || message.startsWith('You must') ? 'form-error' : 'form-success'}>{message}</p>}</form></section></main>
  )
}