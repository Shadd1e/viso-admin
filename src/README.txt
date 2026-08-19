VISO BACKEND PHASE 1

Files:
- src/lib/supabase.js
- src/pages/Admin.jsx
- supabase/migrations/20260814_admin_foundation.sql
- supabase/functions/ping-admin-location/index.ts

Integration:
1. Install @supabase/supabase-js.
2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend .env.
3. Add /admin route to src/App.jsx pointing to src/pages/Admin.jsx.
4. Run the SQL migration in Supabase SQL Editor (after the scheduling migration).
5. Deploy ping-admin-location with --no-verify-jwt because the function validates the bearer token itself.
6. Create the admin's Auth user in Supabase Auth, then add that user's UUID to public.admin_users with active=true.
7. Create the matching technician row with user_id equal to the admin Auth user's UUID. The dashboard can then display the admin technician profile.

Do NOT put VISO_SUPABASE_SERVICE_ROLE_KEY in the frontend .env. It is a server-side Edge Function secret only.

Calendar integration is deliberately not included in this phase. The availability/time-off foundation is ready for it later.
