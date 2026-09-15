'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function OrganizerSignInPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const supabase = createClient()
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role: 'organizer' } } })
    setSaving(false)
    if (result.error) {
      setMessage(result.error.message)
      return
    }
    if (mode === 'sign-up' && !result.data.session) {
      setMessage('Account created. Check your email to confirm your organizer account, then sign in.')
      setMode('sign-in')
      return
    }
    router.push('/organizers/dashboard')
    router.refresh()
  }

  return <main className="auth-page"><nav className="topbar organizer-topbar"><a className="wordmark" href="/">ELORA<span>/</span></a><span>ORGANIZER ACCESS</span><a className="text-link" href="/">Back to events ↑</a></nav><section className="auth-layout"><div className="auth-intro"><p className="eyebrow">ELORA ORGANIZER SPACE</p><h1>Build the event<br /><strong>behind the moment.</strong></h1><p>Sign in to create events, manage ticket inventory and keep your venue team ready for entry.</p></div><form className="auth-form" onSubmit={submit}><div className="auth-tabs"><button type="button" className={mode === 'sign-in' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => setMode('sign-in')}>Sign in</button><button type="button" className={mode === 'sign-up' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => setMode('sign-up')}>Create account</button></div>{mode === 'sign-up' && <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label><label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="button button--dark" type="submit" disabled={saving}>{saving ? 'Please wait...' : mode === 'sign-in' ? 'Enter organizer space →' : 'Create organizer account →'}</button>{message && <p className="form-message">{message}</p>}</form></section></main>
}