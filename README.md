# Viso Admin

Standalone admin frontend for the Viso mobile auto-care site.

## 1. Install
npm install

## 2. Environment
Copy `.env.example` to `.env.local` and set:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

## 3. Supabase
Run `supabase_admin_schema.sql` in Supabase SQL Editor.

Create the admin account under Authentication > Users, then add its user id to
`public.admin_users`.

## 4. Run
npm run dev

## 5. Deploy
Deploy this folder as its own Vercel project/subdomain, e.g. admin.yourdomain.com.

## Important
The frontend does NOT use a service-role key. It uses the Supabase anon key plus
Supabase Auth. RLS decides whether the signed-in user is an admin.

The Stripe webhook is still responsible for writing successful payment/booking
data into `public.bookings`. Until that exists, the dashboard will correctly
show no bookings even though the UI is ready.
# viso-admin
