create table public.solar_products (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sku text, name text not null check (char_length(name) between 2 and 160),
  category text not null check (category in ('Módulo FV','Inversor','Microinversor','Bateria','Estrutura','String Box','Proteção','Cabo','Serviço','Outros')),
  brand text not null default '', model text not null default '', description text not null default '',
  power_w numeric(12,2) check (power_w is null or power_w >= 0), capacity_kwh numeric(12,2) check (capacity_kwh is null or capacity_kwh >= 0),
  warranty_years integer not null default 0 check (warranty_years between 0 and 50),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, sku), unique(id,user_id)
);
create table public.solar_kits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160), sku text,
  system_type text not null check (system_type in ('On-Grid','Híbrido')),
  min_power_kwp numeric(10,3) not null default 0 check (min_power_kwp >= 0), max_power_kwp numeric(10,3) not null default 0 check (max_power_kwp >= min_power_kwp),
  installation_cost numeric(14,2) not null default 0, engineering_cost numeric(14,2) not null default 0,
  utility_fee numeric(14,2) not null default 0, freight_cost numeric(14,2) not null default 0, other_costs numeric(14,2) not null default 0,
  taxes_percent numeric(7,3) not null default 0, commission_percent numeric(7,3) not null default 0, target_margin_percent numeric(7,3) not null default 20,
  warranty_terms text not null default '', notes text not null default '', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, sku), unique(id,user_id)
);
create table public.solar_kit_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kit_id uuid not null, product_id uuid not null,
  quantity numeric(12,3) not null check (quantity > 0), created_at timestamptz not null default now(), unique(kit_id, product_id),
  foreign key (kit_id,user_id) references public.solar_kits(id,user_id) on delete cascade,
  foreign key (product_id,user_id) references public.solar_products(id,user_id) on delete restrict
);
create index solar_products_owner_active_idx on public.solar_products(user_id,active,category);
create index solar_kits_owner_active_idx on public.solar_kits(user_id,active,system_type);
create index solar_kit_items_kit_idx on public.solar_kit_items(kit_id);

alter table public.solar_products enable row level security; alter table public.solar_kits enable row level security; alter table public.solar_kit_items enable row level security;
grant select,insert,update,delete on public.solar_products,public.solar_kits,public.solar_kit_items to authenticated;
revoke all on public.solar_products,public.solar_kits,public.solar_kit_items from anon;

create policy "solar_products_own" on public.solar_products for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "solar_kits_own" on public.solar_kits for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "solar_kit_items_own" on public.solar_kit_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function public.touch_solar_catalog_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger solar_products_touch before update on public.solar_products for each row execute function public.touch_solar_catalog_updated_at();
create trigger solar_kits_touch before update on public.solar_kits for each row execute function public.touch_solar_catalog_updated_at();
revoke execute on function public.touch_solar_catalog_updated_at() from public,anon,authenticated;
notify pgrst,'reload schema';
