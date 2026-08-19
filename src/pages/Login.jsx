import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  async function signIn(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setError(error.message);setBusy(false)}
  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand-lockup"><span className="brand-mark">VISO</span><span>Mobile Autocare</span></div>
      <p className="eyebrow">Operations</p><h1>Welcome back.</h1>
      <p className="muted">Sign in to manage bookings, payments, technician operations and your Viso schedule.</p>
      <form onSubmit={signIn} className="form-stack">
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error&&<div className="error">{error}</div>}
        <button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
      </form>
    </section>
  </main>
}
