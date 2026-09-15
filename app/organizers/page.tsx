'use client'

import { FormEvent, useState } from 'react'

export default function OrganizersPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="organizer-landing">
      <nav className="topbar organizer-topbar" aria-label="Organizer navigation"><a className="wordmark" href="/">ELORA<span>/</span></a><span>ORGANIZER PARTNERS / 2026</span><a className="text-link" href="/">Back to events ↑</a></nav>
      <section className="organizer-hero"><div><p className="eyebrow">THE EVENT COMMERCE PLATFORM</p><h1>Turn your event<br /><strong>into a system.</strong></h1><p>Elora helps organizers sell tickets, manage entry and keep the customer journey clear from first click to final scan.</p><div className="organizer-hero-actions"><a className="button button--dark" href="/organizers/create">Create an event <span>→</span></a><span>Built for serious event teams.</span></div></div><div className="organizer-hero-panel"><span>ELORA / ORGANIZER CONTROL</span><strong>ONE EVENT.<br />EVERYTHING<br />CONNECTED.</strong><div><b>Tickets</b><b>Check-in</b><b>Records</b></div></div></section>
      <section className="organizer-benefits"><div><span>01</span><h2>Sell clearly.</h2><p>Present ticket tiers, prices and policies in one focused checkout.</p></div><div><span>02</span><h2>Operate calmly.</h2><p>Give your team a fast phone-based way to validate entry at the door.</p></div><div><span>03</span><h2>Know the numbers.</h2><p>Keep orders, commission records and event performance in one place.</p></div></section>
      <section className="interest-section" id="interest"><div><p className="eyebrow">EARLY ORGANIZER ACCESS</p><h2>Have an event<br /><strong>worth building?</strong></h2><p>Tell us about it. We are onboarding a focused group of organizers while Elora is in its early partner phase.</p><div className="interest-note"><span>Best fit</span><b>Concerts / nightlife / culture / markets / brand experiences</b></div></div><form className="interest-form" onSubmit={handleSubmit}><label>Name<input name="name" required placeholder="Your name" /></label><label>Work email<input name="email" type="email" required placeholder="you@company.com" /></label><label>Event type<select name="eventType" defaultValue=""><option value="" disabled>Select one</option><option>Concert or nightlife</option><option>Culture or community</option><option>Market or pop-up</option><option>Brand experience</option></select></label><label>Tell us about the event<textarea name="details" required placeholder="Date, location, expected attendance..." /></label><button className="button button--dark" type="submit">{submitted ? 'Interest received ✓' : 'Request organizer access →'}</button>{submitted && <p className="form-success">Thank you. Connect this form to your email or CRM before launch so submissions are delivered to your team.</p>}</form></section>
      <footer className="footer"><span className="wordmark">ELORA<span>/</span></span><p>Clear access to better experiences.</p><a href="/" className="text-link">elora.events ↗</a></footer>
    </main>
  )
}