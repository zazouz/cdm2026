-- ============================================================
-- Schéma Supabase - Pronostics Coupe du Monde 2026
-- ============================================================

-- Table des utilisateurs (complément au Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

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
  odds_fetched_at timestamptz,
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

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

-- users : chacun voit tout le monde (pour le classement), modifie seulement son propre profil
create policy "users_select_all" on public.users for select using (true);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- matches : lisibles par tous les authentifiés, modifiables uniquement par les admins
create policy "matches_select_authenticated" on public.matches for select using (auth.role() = 'authenticated');
create policy "matches_insert_admin" on public.matches for insert with check (
  exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);
create policy "matches_update_admin" on public.matches for update using (
  exists (select 1 from public.users where id = auth.uid() and is_admin = true)
);

-- predictions : chacun voit les siennes, peut créer/modifier les siennes avant le coup d'envoi
create policy "predictions_select_own" on public.predictions for select using (auth.uid() = user_id);
create policy "predictions_insert_own" on public.predictions for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches
    where id = match_id and match_date > now() and status = 'scheduled'
  )
);
create policy "predictions_update_own" on public.predictions for update using (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches
    where id = match_id and match_date > now() and status = 'scheduled'
  )
);

-- ============================================================
-- Vue du classement (accessible par tous les authentifiés)
-- ============================================================

create or replace view public.leaderboard as
select
  u.id,
  u.username,
  u.first_name,
  u.last_name,
  count(p.id) filter (where p.points_earned is not null) as predictions_scored,
  coalesce(sum(p.points_earned), 0) as total_points,
  count(p.id) filter (where p.points_earned > 0 and p.predicted_home = m.home_score and p.predicted_away = m.away_score) as exact_scores,
  count(p.id) filter (where p.points_earned > 0) as correct_results
from public.users u
left join public.predictions p on p.user_id = u.id
left join public.matches m on m.id = p.match_id
group by u.id, u.username, u.first_name, u.last_name
order by total_points desc;

-- Vue des pronostics avec infos match (pour affichage perso)
create or replace view public.predictions_with_match as
select
  p.*,
  m.home_team, m.away_team, m.home_flag, m.away_flag,
  m.match_date, m.stage, m.group_name,
  m.home_odds, m.draw_odds, m.away_odds,
  m.home_score, m.away_score, m.status
from public.predictions p
join public.matches m on m.id = p.match_id;
