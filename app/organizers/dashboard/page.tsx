import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'

type OrganizerEvent = {
  id: string
  title: string
  slug: string
  status: string
  venue_name: string | null
  starts_at: string
  ticket_types: Array<{ quantity_total: number; quantity_sold: number }>
}

export const dynamic = 'force-dynamic'

export default async function OrganizerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/organizers/sign-in?next=/organizers/dashboard')

  const { data, error } = await supabase.from('events').select('id, title, slug, status, venue_name, starts_at, ticket_types(quantity_total, quantity_sold)').order('starts_at', { ascending: true })
  const events = (data ?? []) as OrganizerEvent[]

  return <main className="dashboard-page"><nav className="topbar organizer-topbar"><a className="wordmark" href="/">ELORA<span>/</span></a><span>ORGANIZER CONTROL / DASHBOARD</span><a className="text-link" href="/">View public site ↗</a></nav><section className="dashboard-content"><div className="dashboard-heading"><div><p className="eyebrow">ORGANIZER CONTROL</p><h1>Your events.</h1><p>Manage listings, inventory and visibility from one place.</p></div><a className="button button--dark" href="/organizers/create">Create event <span>→</span></a></div>{error ? <p className="form-error">Unable to load your events: {error.message}</p> : events.length === 0 ? <div className="dashboard-empty"><p className="eyebrow">NO EVENTS YET</p><h2>Your first event starts here.</h2><p>Create a draft, add your ticket inventory, then publish when the details are ready.</p><a className="button button--dark" href="/organizers/create">Create your first event <span>→</span></a></div> : <div className="dashboard-event-list">{events.map((event) => { const sold = event.ticket_types.reduce((total, ticket) => total + ticket.quantity_sold, 0); const capacity = event.ticket_types.reduce((total, ticket) => total + ticket.quantity_total, 0); return <article className="dashboard-event" key={event.id}><div><p className="event-date">{new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(event.starts_at))}</p><h2>{event.title}</h2><p>{event.venue_name ?? 'Venue to be announced'}</p></div><div className="dashboard-event-meta"><span className={`event-status event-status--${event.status}`}>{event.status}</span><span><b>{sold}</b> / {capacity} sold</span><a href="/">Public site ↗</a></div></article> })}</div>}</section></main>
}