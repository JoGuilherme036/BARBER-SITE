-- Booking backend for the site (Supabase / Postgres 15+).
-- The anon role has NO table access (RLS on, no policies). It can only call the
-- security-definer functions at the bottom, which never expose other customers' data.

create extension if not exists btree_gist;

create table settings (
  id boolean primary key default true check (id),
  time_zone text not null default 'America/Sao_Paulo',
  slot_step_min int not null default 15,
  buffer_min int not null default 10,
  min_lead_min int not null default 60,
  max_days_ahead int not null default 30,
  cancel_until_hours int not null default 2
);
insert into settings default values;

create table professionals (
  id text primary key,
  name text not null,
  active boolean not null default true,
  sort int not null default 0
);

create table services (
  id text primary key,
  name text not null,
  duration_min int not null check (duration_min > 0),
  price_cents int not null check (price_cents >= 0),
  includes text[] not null default '{}', -- combos: ids of services already contained
  active boolean not null default true
);

create table professional_services (
  professional_id text references professionals on delete cascade,
  service_id text references services on delete cascade,
  primary key (professional_id, service_id)
);

create table working_hours (
  id bigserial primary key,
  professional_id text not null references professionals on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  starts time not null,
  ends time not null check (ends > starts)
);

create table closed_dates (day date primary key, reason text);

create table time_off (
  id bigserial primary key,
  professional_id text not null references professionals on delete cascade,
  period tstzrange not null,
  reason text
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  professional_id text not null references professionals,
  service_ids text[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  busy_until timestamptz not null, -- ends_at + preparation buffer
  duration_min int not null, -- snapshot: catalog changes never alter existing bookings
  total_cents int not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  -- The real guarantee against double booking, whatever the client does.
  constraint no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, busy_until, '[)') with &&
  ) where (status = 'confirmed')
);
create index bookings_day_idx on bookings (starts_at) where status = 'confirmed';
create index bookings_phone_idx on bookings (customer_phone);

alter table settings enable row level security;
alter table professionals enable row level security;
alter table services enable row level security;
alter table professional_services enable row level security;
alter table working_hours enable row level security;
alter table closed_dates enable row level security;
alter table time_off enable row level security;
alter table bookings enable row level security;

-- Shape returned to the browser (matches src/booking/supabaseApi.ts).
create type booking_row as (
  code text,
  status text,
  local_day date,
  local_time time,
  starts_at timestamptz,
  ends_at timestamptz,
  professional_id text,
  service_ids text[],
  duration_min int,
  total_cents int,
  customer_name text,
  customer_phone text,
  created_at timestamptz
);

create function _to_row(b bookings) returns booking_row
language sql stable set search_path = public as $$
  select (b.code, b.status,
          (b.starts_at at time zone s.time_zone)::date,
          (b.starts_at at time zone s.time_zone)::time,
          b.starts_at, b.ends_at, b.professional_id, b.service_ids,
          b.duration_min, b.total_cents, b.customer_name, b.customer_phone, b.created_at)::booking_row
  from settings s
$$;

-- Busy intervals for one shop-local day. No customer data.
create function get_busy(p_day date)
returns table (professional_id text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  with s as (select time_zone from settings),
       bounds as (
         select (p_day::timestamp at time zone s.time_zone) as d0,
                ((p_day + 1)::timestamp at time zone s.time_zone) as d1
         from s
       )
  select b.professional_id, b.starts_at, b.ends_at
  from bookings b, bounds
  where b.status = 'confirmed' and b.starts_at < bounds.d1 and b.ends_at > bounds.d0
  union all
  select t.professional_id, greatest(lower(t.period), bounds.d0), least(upper(t.period), bounds.d1)
  from time_off t, bounds
  where t.period && tstzrange(bounds.d0, bounds.d1)
$$;

create function create_booking(
  p_idempotency_key text,
  p_professional_id text,
  p_service_ids text[],
  p_day date,
  p_time time,
  p_name text,
  p_phone text,
  p_email text default null,
  p_notes text default null
) returns booking_row
language plpgsql volatile security definer set search_path = public as $$
declare
  s settings;
  existing bookings;
  created bookings;
  v_start timestamptz;
  v_duration int;
  v_total int;
  v_billable text[];
  v_pro record;
  v_code text;
  v_alphabet text := 'ACDEFGHJKMNPQRTUVWXY34679';
begin
  select * into existing from bookings where idempotency_key = p_idempotency_key;
  if found then
    return _to_row(existing);
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 80
     or p_phone !~ '^[1-9]{2}(9[0-9]{8}|[2-5][0-9]{7})$'
     or coalesce(array_length(p_service_ids, 1), 0) = 0 then
    raise exception 'invalid';
  end if;

  select * into s from settings;

  -- Every requested service must exist; combos make their included services free.
  if (select count(*) from services where id = any(p_service_ids) and active) <> array_length(p_service_ids, 1) then
    raise exception 'invalid';
  end if;
  select array_agg(id), sum(duration_min), sum(price_cents)
    into v_billable, v_duration, v_total
  from services
  where id = any(p_service_ids)
    and id <> all (coalesce((select array_agg(i) from services c, unnest(c.includes) i where c.id = any(p_service_ids)), '{}'));

  v_start := (p_day + p_time) at time zone s.time_zone;
  if v_start < now() + make_interval(mins => s.min_lead_min)
     or p_day > (now() at time zone s.time_zone)::date + s.max_days_ahead
     or exists (select 1 from closed_dates where day = p_day) then
    raise exception 'slot_taken';
  end if;

  for v_pro in
    select p.id from professionals p
    where p.active
      and (p_professional_id is null or p.id = p_professional_id)
      and (select count(*) from professional_services ps where ps.professional_id = p.id and ps.service_id = any(p_service_ids)) = array_length(p_service_ids, 1)
      and exists (
        select 1 from working_hours w
        where w.professional_id = p.id
          and w.weekday = extract(dow from p_day)
          and p_time >= w.starts
          and p_time + make_interval(mins => v_duration) <= w.ends
      )
      and not exists (
        select 1 from time_off t
        where t.professional_id = p.id
          and t.period && tstzrange(v_start, v_start + make_interval(mins => v_duration))
      )
    order by p.sort, p.id
  loop
    loop
      v_code := 'RB-';
      for i in 1..5 loop
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from bookings where code = v_code);
    end loop;

    begin
      insert into bookings (code, professional_id, service_ids, starts_at, ends_at, busy_until, duration_min, total_cents,
                            customer_name, customer_phone, customer_email, notes, idempotency_key)
      values (v_code, v_pro.id, p_service_ids, v_start,
              v_start + make_interval(mins => v_duration),
              v_start + make_interval(mins => v_duration + s.buffer_min),
              v_duration, v_total, trim(p_name), p_phone, nullif(trim(p_email), ''), left(p_notes, 280), p_idempotency_key)
      returning * into created;
      return _to_row(created);
    exception
      when exclusion_violation then
        null; -- this professional got the slot first; try the next one
      when unique_violation then
        select * into existing from bookings where idempotency_key = p_idempotency_key;
        if found then
          return _to_row(existing);
        end if;
        raise;
    end;
  end loop;

  raise exception 'slot_taken';
end;
$$;

create function find_booking(p_code text, p_phone text) returns setof booking_row
language sql stable security definer set search_path = public as $$
  select _to_row(b) from bookings b where b.code = upper(p_code) and b.customer_phone = p_phone
$$;

create function cancel_booking(p_code text, p_phone text) returns booking_row
language plpgsql volatile security definer set search_path = public as $$
declare
  b bookings;
  s settings;
begin
  select * into s from settings;
  select * into b from bookings where code = upper(p_code) and customer_phone = p_phone for update;
  if not found then
    raise exception 'not_found';
  end if;
  if b.status = 'confirmed' then
    if b.starts_at - now() < make_interval(hours => s.cancel_until_hours) then
      raise exception 'too_late';
    end if;
    update bookings set status = 'cancelled', cancelled_at = now() where id = b.id returning * into b;
  end if;
  return _to_row(b);
end;
$$;

revoke all on function _to_row(bookings) from public, anon, authenticated;
revoke all on function get_busy(date), create_booking(text, text, text[], date, time, text, text, text, text),
  find_booking(text, text), cancel_booking(text, text) from public;
grant execute on function get_busy(date), create_booking(text, text, text[], date, time, text, text, text, text),
  find_booking(text, text), cancel_booking(text, text) to anon, authenticated;
