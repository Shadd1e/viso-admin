const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('VISO_SUPABASE_SERVICE_ROLE_KEY')!

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!userResponse.ok) return json({ error: 'Invalid session' }, 401)
    const user = await userResponse.json()

    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=user_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    )

    if (!adminResponse.ok || (await adminResponse.json()).length === 0) {
      return json({ error: 'Active administrator access required' }, 403)
    }

    const body = await req.json()
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    const accuracyMeters = body.accuracyMeters == null ? null : Number(body.accuracyMeters)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 30.35 || latitude > 35.05 || longitude < -85.65 || longitude > -80.75) {
      return json({ error: 'Location is outside the supported Georgia service area' }, 400)
    }

    if (accuracyMeters !== null && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000)) {
      return json({ error: 'Invalid location accuracy' }, 400)
    }

    const techResponse = await fetch(
      `${supabaseUrl}/rest/v1/technicians?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    )

    if (!techResponse.ok) return json({ error: 'Could not resolve administrator technician profile' }, 500)
    const technicians = await techResponse.json()
    if (!technicians.length) return json({ error: 'Create the administrator technician profile first' }, 409)

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/technician_location_pings`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        technician_id: technicians[0].id,
        latitude,
        longitude,
        accuracy_meters: accuracyMeters,
        recorded_at: new Date().toISOString(),
      }),
    })

    if (!insertResponse.ok) return json({ error: 'Could not save location ping' }, 500)

    return json({ ok: true })
  } catch (error) {
    console.error(error)
    return json({ error: 'Unexpected location error' }, 500)
  }
})
