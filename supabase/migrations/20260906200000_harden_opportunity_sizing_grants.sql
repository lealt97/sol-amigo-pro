drop policy if exists "solar_sizings_delete_own" on public.solar_sizings;

revoke all on public.solar_sizings from authenticated;
grant select, insert, update on public.solar_sizings to authenticated;

revoke all on public.solar_sizings from anon;
