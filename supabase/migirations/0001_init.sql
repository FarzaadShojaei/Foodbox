-- ============================================================================
-- Foodbox — initial schema (migration 0001)
-- Occasion-first social city-discovery app. The primary axis is the OCCASION
-- ("first date", "coworking", ...), not cuisine. Guest-first: anonymous users
-- can READ public lists/restaurants; only signed-in users can like, save, create.
--
-- Apply this in the Supabase SQL Editor (paste + Run), or via the Supabase CLI
-- (`supabase db push`). Run once on a fresh project.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type list_visibility as enum ('public', 'private');
exception when duplicate_object then null; end $$;

-- ===========================================================================
-- 1. PROFILES  — one row per auth user, auto-created on sign-up
-- ===========================================================================
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',
                           split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================================
-- 2. OCCASIONS  — THE PRIMARY AXIS of the whole app.
--    A curated, finite, ordered set. Every list belongs to one occasion.
--    Powers the "choose the occasion" home screen and restaurant tags.
--    icon: emoji/name for the occasion tile.  sort_order: deliberate order.
-- ===========================================================================
create table if not exists occasions (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,               -- 'first-date', 'coworking'
  label      text not null,                       -- 'First date'
  icon       text,                                -- '❤️' etc (UI can override)
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Launch set for Milan (resident-first): 6 occasions, one per behavioural cluster.
insert into occasions (slug, label, icon, sort_order) values
  ('first-date',    'First date',                  '❤️', 1),
  ('aperitivo',     'Aperitivo with friends',      '🍸', 2),
  ('group-dinner',  'Group dinner / night out',    '🎉', 3),
  ('coworking',     'Coworking / laptop-friendly', '💻', 4),
  ('budget',        'Cheap eats / student budget', '💸', 5),
  ('weekday-lunch', 'Quick weekday lunch',         '🥪', 6)
on conflict (slug) do nothing;

-- ===========================================================================
-- 3. RESTAURANTS  — each has a small page; belongs to a city.
--    cuisines: SECONDARY axis — plain tags for later filtering, not a taxonomy.
--    rating source is still an open decision (external seed vs. user reviews).
-- ===========================================================================
create table if not exists restaurants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  city            text not null,                  -- 'Milano', 'Tokyo'
  address         text,
  lat             double precision,               -- PostGIS can come later
  lng             double precision,
  cover_image_url text,
  cuisines        text[] not null default '{}',   -- e.g. {burger, italian} — filter only
  rating          numeric(2,1),                    -- e.g. 4.1  (nullable)
  rating_count    integer not null default 0,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists restaurants_city_idx     on restaurants (city);
create index if not exists restaurants_cuisines_idx on restaurants using gin (cuisines);

-- ===========================================================================
-- 4. LISTS  — the heart of the app. One owner, ONE OCCASION, a city, a visibility.
-- ===========================================================================
create table if not exists lists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references profiles(id) on delete cascade,
  title        text not null,                     -- 'Best for date in Milan'
  description  text,
  city         text not null,
  occasion_id  uuid references occasions(id) on delete set null,
  visibility   list_visibility not null default 'public',
  cover_image_url text,
  like_count   integer not null default 0,         -- denormalized, kept by trigger
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists lists_owner_idx      on lists (owner_id);
create index if not exists lists_occasion_idx    on lists (occasion_id);
create index if not exists lists_city_idx        on lists (city);
create index if not exists lists_visibility_idx  on lists (visibility);

-- ===========================================================================
-- 5. LIST_ITEMS  — junction list <-> restaurant, WITH data of its own.
-- ===========================================================================
create table if not exists list_items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references lists(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  position      integer not null default 0,        -- 1st, 2nd, 3rd pick...
  note          text,                              -- "ask for the window table"
  created_at    timestamptz not null default now(),
  unique (list_id, restaurant_id)
);
create index if not exists list_items_list_idx        on list_items (list_id);
create index if not exists list_items_restaurant_idx  on list_items (restaurant_id);

-- ===========================================================================
-- 6. LIKES  — public approval on LISTS only.
-- ===========================================================================
create table if not exists list_likes (
  list_id    uuid not null references lists(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create or replace function bump_list_like_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update lists set like_count = like_count + 1 where id = new.list_id;
  elsif tg_op = 'DELETE' then
    update lists set like_count = greatest(like_count - 1, 0) where id = old.list_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_list_like_count on list_likes;
create trigger trg_list_like_count
  after insert or delete on list_likes
  for each row execute function bump_list_like_count();

-- ===========================================================================
-- 7. SAVES  — private bookmarks. On BOTH lists & restaurants.
-- ===========================================================================
create table if not exists list_saves (
  list_id    uuid not null references lists(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists restaurant_saves (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

-- ===========================================================================
-- 8. updated_at maintenance for lists
-- ===========================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_lists_updated_at on lists;
create trigger trg_lists_updated_at
  before update on lists
  for each row execute function set_updated_at();

-- ===========================================================================
-- 9. VIEW: restaurant occasion-tags  ("First date · 47 lists")
--    Derived — never stored. A restaurant's tags = the OCCASIONS of the PUBLIC
--    lists it appears in, with how many times. This is the trust proxy that
--    stands in (for now) for a social/follow layer.
-- ===========================================================================
create or replace view restaurant_occasion_tags as
select
  li.restaurant_id,
  o.id    as occasion_id,
  o.slug,
  o.label,
  count(*) as list_count
from list_items li
join lists     l on l.id = li.list_id and l.visibility = 'public'
join occasions o on o.id = l.occasion_id
group by li.restaurant_id, o.id, o.slug, o.label;

-- ===========================================================================
-- ROW LEVEL SECURITY  — guest-first rules live HERE, not in the app.
-- ===========================================================================
alter table profiles          enable row level security;
alter table occasions         enable row level security;
alter table restaurants       enable row level security;
alter table lists             enable row level security;
alter table list_items        enable row level security;
alter table list_likes        enable row level security;
alter table list_saves        enable row level security;
alter table restaurant_saves  enable row level security;

-- PROFILES: everyone reads (to show "By <name>"); you edit only yours.
create policy profiles_read_all   on profiles for select using (true);
create policy profiles_insert_own on profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id);

-- OCCASIONS: readable by everyone; no public writes (managed by you/admin).
create policy occasions_read_all on occasions for select using (true);

-- RESTAURANTS: everyone reads; signed-in users add; editor = creator.
create policy restaurants_read_all    on restaurants for select using (true);
create policy restaurants_insert_auth on restaurants for insert
  with check (auth.uid() is not null);
create policy restaurants_update_creator on restaurants for update
  using (auth.uid() = created_by);

-- LISTS: visible if public OR you own it.
create policy lists_read_public_or_own on lists for select
  using (visibility = 'public' or owner_id = auth.uid());
create policy lists_insert_own on lists for insert with check (owner_id = auth.uid());
create policy lists_update_own on lists for update using (owner_id = auth.uid());
create policy lists_delete_own on lists for delete using (owner_id = auth.uid());

-- LIST_ITEMS: readable if the parent list is visible; writable only by owner.
create policy list_items_read on list_items for select
  using (exists (
    select 1 from lists l
    where l.id = list_items.list_id
      and (l.visibility = 'public' or l.owner_id = auth.uid())
  ));
create policy list_items_write_owner on list_items for all
  using (exists (
    select 1 from lists l
    where l.id = list_items.list_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from lists l
    where l.id = list_items.list_id and l.owner_id = auth.uid()
  ));

-- LIKES / SAVES: each user sees & writes only their own rows.
create policy list_likes_own on list_likes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy list_saves_own on list_saves for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy restaurant_saves_own on restaurant_saves for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- End of migration 0001
-- ============================================================================
