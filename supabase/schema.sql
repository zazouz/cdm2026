-- ============================================================
-- Schéma Supabase - Pronostics Coupe du Monde 2026
-- ============================================================

-- Table des utilisateurs (complément au Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migration : ajouter la colonne email si elle n'existe pas encore
alter table public.users add column if not exists email text;

-- Table des matchs
create table if not exists public.matches (
  id serial primary key,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  match_date timestamptz not null,
  stage text not null default 'group', -- group / r32 / r16 / qf / sf / final
  group_name text,
  venue text,
  -- Côtes figées (fetchées une seule fois)
  home_odds numeric(5,2),
  draw_odds numeric(5,2),
  away_odds numeric(5,2),
  odds_fetched_at  timestamptz,
  odds_bookmaker   text,
  score_source     text,
  score_confirmed  boolean default false,
  score_needs_review boolean default false,
  score_fetched_at timestamptz,
  score_review_reason text,
  score_period     text default 'regular_time',
  api_football_fixture_id integer,
  -- Résultat
  home_score integer,
  away_score integer,
  status text not null default 'scheduled', -- scheduled / finished
  -- Référence API externe pour auto-fetch des résultats
  fd_match_id integer, -- football-data.org match id
  created_at timestamptz not null default now()
);

-- Table des pronostics
create table if not exists public.predictions (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  predicted_home integer not null,
  predicted_away integer not null,
  points_earned numeric(6,2),
  calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

alter table public.predictions
  drop constraint if exists predictions_score_range;
alter table public.predictions
  add constraint predictions_score_range
  check (
    predicted_home between 0 and 20
    and predicted_away between 0 and 20
  );

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select u.is_admin from public.users u where u.id = auth.uid()),
    false
  )
$$;

-- users : chacun voit tout le monde (pour le classement), modifie seulement son propre profil
drop policy if exists "users_select_all" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;

create policy "users_select_all" on public.users for select using (true);
create policy "users_insert_own" on public.users for insert with check (
  auth.uid() = id
  and is_admin = false
);
create policy "users_update_own" on public.users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = public.current_user_is_admin()
  );

-- matches : lisibles par tous les authentifiés, modifiables uniquement par les admins
drop policy if exists "matches_select_authenticated" on public.matches;
drop policy if exists "matches_insert_admin" on public.matches;
drop policy if exists "matches_update_admin" on public.matches;

create policy "matches_select_authenticated" on public.matches for select using (auth.role() = 'authenticated');
create policy "matches_insert_admin" on public.matches for insert with check (
  exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);
create policy "matches_update_admin" on public.matches for update using (
  exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);

-- predictions : chacun voit les siennes, peut créer/modifier les siennes avant le coup d'envoi
drop policy if exists "predictions_select_own" on public.predictions;
drop policy if exists "predictions_insert_own" on public.predictions;
drop policy if exists "predictions_update_own" on public.predictions;

create policy "predictions_select_own" on public.predictions for select using (auth.uid() = user_id);
create policy "predictions_insert_own" on public.predictions for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches
    where id = match_id
      and match_date - interval '15 minutes' > now()
      and status = 'scheduled'
  )
);
create policy "predictions_update_own" on public.predictions
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches
      where id = match_id
        and match_date - interval '15 minutes' > now()
        and status = 'scheduled'
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches
      where id = match_id
        and match_date - interval '15 minutes' > now()
        and status = 'scheduled'
    )
  );

-- ============================================================
-- Vue du classement (accessible par tous les authentifiés)
-- ============================================================

create or replace view public.leaderboard as
select
  u.id,
  u.username,
  initcap(u.first_name) as first_name,
  initcap(u.last_name)  as last_name,
  count(p.id) filter (where p.points_earned is not null) as predictions_scored,
  coalesce(sum(p.points_earned), 0) as total_points,
  count(p.id) filter (where p.points_earned > 0 and p.predicted_home = m.home_score and p.predicted_away = m.away_score) as exact_scores,
  -- Bons résultats hors scores exacts (résultat correct mais score différent)
  count(p.id) filter (
    where p.points_earned > 0
      and not (p.predicted_home = m.home_score and p.predicted_away = m.away_score)
  ) as correct_results
from public.users u
left join public.predictions p on p.user_id = u.id
left join public.matches m on m.id = p.match_id
where u.is_admin = false
group by u.id, u.username, u.first_name, u.last_name
order by total_points desc, exact_scores desc, correct_results desc, username asc;

-- Vue des pronostics avec infos match (pour affichage perso)
create or replace view public.predictions_with_match
  with (security_invoker = true)
as
select
  p.*,
  m.home_team, m.away_team, m.home_flag, m.away_flag,
  m.match_date, m.stage, m.group_name,
  m.home_odds, m.draw_odds, m.away_odds,
  m.home_score, m.away_score, m.status
from public.predictions p
join public.matches m on m.id = p.match_id;
