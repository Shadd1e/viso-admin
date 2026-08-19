-- Viso Mobile Autocare: admin foundation
-- Run after the existing scheduling migration.

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
      and a.active = true
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;


-- Keep admin identity records protected. An authenticated user may only read their own active row.
alter table public.admin_users enable row level security;
drop policy if exists "users can read their own admin record" on public.admin_users;
create policy "users can read their own admin record"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

alter table public.payments enable row level security;

-- Admins can view operational data.
drop policy if exists "admins can read payments" on public.payments;
create policy "admins can read payments"
on public.payments
for select
to authenticated
using (public.is_active_admin());

-- Admins can manage technicians. This is intentionally restricted to admins;
-- public technician registration is a later feature.
drop policy if exists "admins can read technicians" on public.technicians;
create policy "admins can read technicians"
on public.technicians
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "admins can insert technicians" on public.technicians;
create policy "admins can insert technicians"
on public.technicians
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "admins can update technicians" on public.technicians;
create policy "admins can update technicians"
on public.technicians
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- Availability and time-off are admin-controlled for now.
drop policy if exists "admins can read technician availability" on public.technician_availability;
create policy "admins can read technician availability"
on public.technician_availability
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "admins can manage technician availability" on public.technician_availability;
create policy "admins can manage technician availability"
on public.technician_availability
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "admins can read technician time off" on public.technician_time_off;
create policy "admins can read technician time off"
on public.technician_time_off
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "admins can manage technician time off" on public.technician_time_off;
create policy "admins can manage technician time off"
on public.technician_time_off
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- Admin dashboard needs booking visibility. Keep the existing update policy and
-- add a broad admin SELECT policy only if it is not already present.
drop policy if exists "admins can read bookings" on public.bookings;
create policy "admins can read bookings"
on public.bookings
for select
to authenticated
using (public.is_active_admin());

-- The browser should not write location pings directly. The location Edge Function
-- will use the service role after validating the authenticated admin.
