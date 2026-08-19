import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './styles.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setChecking(false) } })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setChecking(false) })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])
  if (checking) return <div className="screen-center"><div className="brand-mark">VISO</div><span>Checking session…</span></div>
  return session ? <Dashboard session={session} /> : <Login />
}
