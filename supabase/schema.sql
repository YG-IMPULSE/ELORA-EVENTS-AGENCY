create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('customer', 'organizer', 'staff', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ticket_status as enum ('issued', 'checked_in', 'refunded', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text,
  venue_name text,
  venue_address text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.event_status not null default 'draft',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_kobo bigint not null check (price_kobo >= 0),
  quantity_total integer not null check (quantity_total >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0 and quantity_sold <= quantity_total),
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text,
  customer_email text,
  event_id uuid not null references public.events(id) on delete restrict,
  status public.order_status not null default 'pending',
  currency text not null default 'NGN',
  subtotal_kobo bigint not null default 0 check (subtotal_kobo >= 0),
  platform_fee_kobo bigint not null default 0 check (platform_fee_kobo >= 0),
  payment_fee_kobo bigint not null default 0 check (payment_fee_kobo >= 0),
  total_kobo bigint not null default 0 check (total_kobo >= 0),
  provider text,
  provider_transaction_id text,
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  verified_at timestamptz
);

alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists provider_reference text;
alter table public.orders add column if not exists verified_at timestamptz;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_kobo bigint not null check (unit_price_kobo >= 0),
  line_total_kobo bigint not null check (line_total_kobo >= 0)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  customer_id uuid references public.profiles(id) on delete set null,
  ticket_code text not null unique,
  qr_payload text not null unique,
  status public.ticket_status not null default 'issued',
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  scanned_by uuid references public.profiles(id) on delete set null,
  result public.ticket_status not null,
  scanned_at timestamptz not null default now()
);

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  gross_kobo bigint not null check (gross_kobo >= 0),
  platform_fee_kobo bigint not null check (platform_fee_kobo >= 0),
  payment_fee_kobo bigint not null default 0 check (payment_fee_kobo >= 0),
  organizer_amount_kobo bigint not null check (organizer_amount_kobo >= 0),
  status text not null default 'pending' check (status in ('pending', 'payable', 'paid', 'reversed')),
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  commission_ledger_id uuid not null references public.commission_ledger(id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo >= 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed')),
  provider text,
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  provider_reference text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists events_public_index on public.events(status, starts_at);
create index if not exists ticket_types_event_index on public.ticket_types(event_id);
create index if not exists orders_customer_index on public.orders(customer_id, created_at desc);
create index if not exists tickets_code_index on public.tickets(ticket_code);
create index if not exists refunds_order_index on public.refunds(order_id, created_at desc);
create index if not exists payouts_organizer_index on public.payouts(organizer_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.payouts enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "Anyone can view published events" on public.events;
create policy "Anyone can view published events" on public.events for select using (status = 'published');
drop policy if exists "Organizers manage their events" on public.events;
create policy "Organizers manage their events" on public.events for all using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);
drop policy if exists "Anyone can view tickets for published events" on public.ticket_types;
create policy "Anyone can view tickets for published events" on public.ticket_types for select using (exists (select 1 from public.events where events.id = ticket_types.event_id and events.status = 'published'));
drop policy if exists "Organizers manage ticket types" on public.ticket_types;
create policy "Organizers manage ticket types" on public.ticket_types for all using (exists (select 1 from public.events where events.id = ticket_types.event_id and events.organizer_id = auth.uid())) with check (exists (select 1 from public.events where events.id = ticket_types.event_id and events.organizer_id = auth.uid()));
drop policy if exists "Customers view their orders" on public.orders;
create policy "Customers view their orders" on public.orders for select using (auth.uid() = customer_id);
drop policy if exists "Customers view their order items" on public.order_items;
create policy "Customers view their order items" on public.order_items for select using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid()));
drop policy if exists "Customers view their tickets" on public.tickets;
create policy "Customers view their tickets" on public.tickets for select using (auth.uid() = customer_id);
drop policy if exists "Organizers view event tickets" on public.tickets;
create policy "Organizers view event tickets" on public.tickets for select using (exists (select 1 from public.events where events.id = tickets.event_id and events.organizer_id = auth.uid()));
drop policy if exists "Staff view event scans" on public.ticket_scans;
create policy "Staff view event scans" on public.ticket_scans for select using (auth.uid() = scanned_by);
drop policy if exists "Organizers view their commission ledger" on public.commission_ledger;
create policy "Organizers view their commission ledger" on public.commission_ledger for select using (auth.uid() = organizer_id);
drop policy if exists "Organizers view their payouts" on public.payouts;
create policy "Organizers view their payouts" on public.payouts for select using (auth.uid() = organizer_id);
drop policy if exists "Customers view their refunds" on public.refunds;
create policy "Customers view their refunds" on public.refunds for select using (exists (select 1 from public.orders where orders.id = refunds.order_id and orders.customer_id = auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when new.raw_user_meta_data ->> 'role' = 'organizer' then 'organizer'::public.user_role else 'customer'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();