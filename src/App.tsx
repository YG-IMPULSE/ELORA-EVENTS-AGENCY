'use client'

import { useMemo, useState } from 'react'
import { createClient } from '../lib/supabase/client'

export type EventItem = {
  title: string
  location: string
  date: string
  category: string
  price: string
  code: string
  slug: string
}

function App({ events, isOrganizer }: { events: EventItem[]; isOrganizer: boolean }) {
  const [activeCategory, setActiveCategory] = useState('All events')
  const [query, setQuery] = useState('')
  const categories = ['All events', ...new Set(events.map((event) => event.category))]
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim()
    return events.filter((event) => {
      const categoryMatches = activeCategory === 'All events' || event.category === activeCategory
      const queryMatches = !normalizedQuery || `${event.title} ${event.location}`.toLowerCase().includes(normalizedQuery)
      return categoryMatches && queryMatches
    })
  }, [activeCategory, events, query])

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Elora home">ELORA<span>/</span></a>
        <div className="nav-links">
          <a className="nav-link nav-link--active" href="#events">Discover</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
          <a className="nav-link" href="/organizers">For organizers</a>
        </div>
        <div className="nav-actions"><a className="scan-link" href="/scan">Venue scan ↗</a>{isOrganizer ? <><a className="account-button" href="/organizers/dashboard">Organizer dashboard</a><button className="account-button" type="button" onClick={async () => { await createClient().auth.signOut(); window.location.reload() }}>Sign out</button></> : <a className="account-button" href="/organizers/sign-in">Organizer sign in</a>}</div>
      </nav>

      <section className="hero-section" id="top">
        <div className="hero-copy"><p className="eyebrow">EVENT COMMERCE / LAGOS</p><h1>Events made<br /><strong>simple.</strong></h1><p className="hero-description">Discover events, buy tickets in seconds and arrive ready. Elora gives every event a clearer way to sell, manage and deliver the experience.</p><label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events or locations" aria-label="Search events" /><button type="button">Search</button></label><div className="hero-proof"><span><b>01</b> Simple checkout</span><span><b>02</b> Secure entry</span><span><b>03</b> Clear records</span></div></div>
        <div className="hero-visual" aria-label="Elora secure event ticket interface preview" role="img"><div className="visual-grid" /><div className="ticket-preview"><div className="ticket-head"><span>ELORA / ACCESS PASS</span><b>VALID</b></div><div className="ticket-title">LAGOS<br /><strong>AFTER DARK</strong></div><div className="ticket-meta"><span>18 OCT 2026<br /><b>MURI OKUNOLA PARK</b></span><span>VIP<br /><b>01 / 01</b></span></div><div className="ticket-qr"><span>||| |||<br />|| ||| ||<br />|||| ||</span><small>ELR-001</small></div></div><div className="status-chip"><i /> CHECK-IN READY</div></div>
      </section>

      <section className="value-strip" id="how-it-works"><div><b>01</b><span>Buy without friction</span><small>One clear checkout for your ticket and extras.</small></div><div><b>02</b><span>Enter from your phone</span><small>Fast QR verification at the venue door.</small></div><div><b>03</b><span>Trust the record</span><small>Receipts, orders and policies in one place.</small></div></section>

      <section className="catalog-section" id="events"><div className="section-heading"><div><p className="eyebrow">SELECT YOUR NEXT EXPERIENCE</p><h2>Upcoming events</h2></div><a href="#events" className="text-link">View all events <span>→</span></a></div><div className="category-row" role="tablist" aria-label="Event categories">{categories.map((category) => <button key={category} className={activeCategory === category ? 'category-button category-button--active' : 'category-button'} type="button" onClick={() => setActiveCategory(category)}>{category}</button>)}</div><div className="event-grid">{filteredEvents.map((event) => <article className="event-card" key={event.title}><div className="event-art"><span className="event-index">{event.code} / {String(events.length).padStart(2, '0')}</span><span className="art-word">{event.category.toUpperCase()}</span><strong>{event.title.split(' ')[0]}<br /><em>{event.title.split(' ').slice(1).join(' ')}</em></strong></div><div className="event-info"><p className="event-date">{event.date}</p><h3>{event.title}</h3><p className="event-location">{event.location}</p><div className="event-footer"><strong>{event.price}</strong><a className="event-view-link" href={`/events/${event.slug}`} aria-label={`View ${event.title}`}>→</a></div></div></article>)}</div>{filteredEvents.length === 0 && <p className="empty-state">No published events yet. Organizer listings will appear here once they go live.</p>}</section>

      <section className="organizer-section" id="organizers"><div><p className="eyebrow">FOR ORGANIZERS</p><h2>Run the event.<br /><strong>We handle the flow.</strong></h2><p>From ticket inventory to the door scan, Elora keeps the customer journey and the operational record connected.</p><a className="button button--dark" href="/organizers">Talk to Elora <span>→</span></a></div><div className="operations-list"><div><span>Ticketing</span><b>Built for conversion</b><i>01</i></div><div><span>Check-in</span><b>Scan in seconds</b><i>02</i></div><div><span>Reporting</span><b>Know what sold</b><i>03</i></div><div><span>Support</span><b>Stay in control</b><i>04</i></div></div></section>

      <footer className="footer"><span className="wordmark">ELORA<span>/</span></span><p>Clear access to better experiences.</p><a href="#top" className="text-link">Back to top ↑</a></footer>
    </main>
  )
}

export default App
