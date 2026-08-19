import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const emptyStats = {
  bookings: 0,
  pending: 0,
  completed: 0,
  paid: 0,
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))
}

function dateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [technician, setTechnician] = useState(null)
  const [stats, setStats] = useState(emptyStats)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) loadDashboard()
  }, [session])

  async function signIn(event) {
    event.preventDefault()
    setError('')
    setBusy(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) setError(authError.message)
    setBusy(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setBookings([])
    setPayments([])
    setTechnician(null)
    setStats(emptyStats)
  }

  async function loadDashboard() {
    setBusy(true)
    setError('')

    const [adminResult, bookingResult, paymentResult, technicianResult] = await Promise.all([
      supabase.from('admin_users').select('user_id, active').eq('user_id', session.user.id).eq('active', true).maybeSingle(),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('technicians').select('*').eq('user_id', session.user.id).maybeSingle(),
    ])

    if (adminResult.error) {
      setError(adminResult.error.message)
      setBusy(false)
      return
    }

    if (!adminResult.data) {
      setError('This account is not an active Viso administrator.')
      await supabase.auth.signOut()
      setBusy(false)
      return
    }

    if (bookingResult.error) setError(bookingResult.error.message)
    if (paymentResult.error) setError(paymentResult.error.message)
    if (technicianResult.error) setError(technicianResult.error.message)

    const nextBookings = bookingResult.data || []
    const nextPayments = paymentResult.data || []

    setBookings(nextBookings)
    setPayments(nextPayments)
    setTechnician(technicianResult.data || null)

    const paidBookings = nextBookings.filter((b) => ['paid', 'succeeded', 'complete', 'completed'].includes(String(b.payment_status || '').toLowerCase()))
    const completed = nextBookings.filter((b) => String(b.status || '').toLowerCase() === 'completed')

    setStats({
      bookings: nextBookings.length,
      pending: nextBookings.filter((b) => String(b.status || '').toLowerCase() === 'pending').length,
      completed: completed.length,
      paid: paidBookings.reduce((sum, b) => sum + Number(b.total || 0), 0),
    })

    setBusy(false)
  }

  const upcoming = useMemo(() => bookings.slice(0, 12), [bookings])

  async function updateBookingStatus(id, status) {
    setError('')
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await loadDashboard()
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-white text-slate-900">Loading admin…</div>
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
        <div className="mx-auto max-w-md">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/40">Viso Mobile Autocare</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin sign in</h1>
            <p className="mt-3 text-sm leading-6 text-white/55">Manage bookings, payments and your service availability.</p>
          </div>

          <form onSubmit={signIn} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <label className="block">
              <span className="mb-2 block text-sm text-white/65">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/35" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-white/65">Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-white/35" />
            </label>
            {error && <p className="rounded-2xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            <button disabled={busy} className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Viso Mobile Autocare</p>
            <h1 className="mt-1 text-2xl font-semibold">Admin dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadDashboard} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Refresh</button>
            <button onClick={signOut} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Bookings" value={stats.bookings} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Completed" value={stats.completed} />
          <Stat label="Paid booking value" value={money(stats.paid)} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">Bookings</h2>
                <p className="mt-1 text-sm text-slate-400">The latest customer bookings.</p>
              </div>
              <span className="text-xs text-slate-400">{bookings.length} loaded</span>
            </div>

            <div className="divide-y divide-slate-100">
              {upcoming.length === 0 && <p className="px-6 py-10 text-sm text-slate-400">No bookings yet.</p>}
              {upcoming.map((booking) => (
                <article key={booking.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{booking.customer_name || 'Customer'}</h3>
                        <Badge value={booking.status} />
                        <Badge value={booking.payment_status} muted />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{booking.service_name || 'Service'} · {booking.vehicle_year || ''} {booking.vehicle_make || ''} {booking.vehicle_model || ''}</p>
                      <p className="mt-2 text-xs text-slate-400">{booking.appointment_date || 'Date not set'} · {booking.appointment_time || 'Time not set'} · {booking.customer_phone || 'No phone'}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-semibold">{money(booking.total)}</p>
                      <p className="mt-1 text-xs text-slate-400">Created {dateTime(booking.created_at)}</p>
                      <select value={booking.status || 'pending'} onChange={(e) => updateBookingStatus(booking.id, e.target.value)} className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Your technician profile</p>
              <h2 className="mt-3 text-xl font-semibold">{technician?.name || 'Not connected yet'}</h2>
              <p className="mt-2 text-sm text-slate-500">{technician ? (technician.available_for_jobs ? 'Available for jobs' : 'Not available for jobs') : 'Create the admin technician record to enable live location and dispatch.'}</p>
              {technician && <div className="mt-5 space-y-2 text-sm text-slate-500"><p>Phone: {technician.phone || '—'}</p><p>Base location: {technician.base_address || '—'}</p></div>}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Payments</p>
              <div className="mt-4 space-y-3">
                {payments.slice(0, 6).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-4 text-sm">
                    <div><p className="font-medium">{payment.status || 'unknown'}</p><p className="text-xs text-slate-400">{dateTime(payment.created_at)}</p></div>
                    <span className="font-semibold">{money(payment.amount)}</span>
                  </div>
                ))}
                {payments.length === 0 && <p className="text-sm text-slate-400">No payments yet.</p>}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Stat({ label, value }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p></div>
}

function Badge({ value, muted }) {
  const text = String(value || 'unknown').replaceAll('_', ' ')
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${muted ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>{text}</span>
}
