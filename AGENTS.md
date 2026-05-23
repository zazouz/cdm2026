<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# CDM 2026 — Référence projet

Application de pronostics pour la Coupe du Monde 2026. Chaque joueur prédit les scores de tous les matchs. Les points sont calculés selon les côtes bookmaker au moment du match.

---

## Stack

| Domaine | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4 (pas de tailwind.config.ts — config via CSS) |
| Base de données | Supabase (PostgreSQL) + RLS |
| Auth | Supabase Auth (email/password) |
| Déploiement | Vercel |
| APIs externes | football-data.org (matchs/résultats), The Odds API (côtes) |

**Pas de librairie de composants UI.** Tout est du Tailwind pur, design system dark navy.

---

## Structure des fichiers

```
worldcup-prono/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Page de connexion
│   │   └── register/page.tsx       # Inscription
│   ├── (main)/                     # Routes protégées (layout vérifie auth)
│   │   ├── layout.tsx              # Injecte NavBar + BottomNav, max-w-lg centré
│   │   ├── NavBar.tsx              # Top bar logo + username + logout (client)
│   │   ├── BottomNav.tsx           # Nav bas mobile ⚽/📋/🏆 (client, usePathname)
│   │   ├── matches/
│   │   │   ├── page.tsx            # Liste des matchs à pronostiquer (server)
│   │   │   └── MatchCard.tsx       # Card avec steppers +/− (client)
│   │   ├── mes-pronos/page.tsx     # Pronos verrouillés de l'utilisateur (server)
│   │   ├── leaderboard/
│   │   │   ├── page.tsx            # Classement avec podium top 3 (server)
│   │   │   └── [userId]/page.tsx   # Détail pronos d'un joueur (server, admin client)
│   │   └── admin/
│   │       ├── page.tsx            # Interface admin (server, vérifie is_admin)
│   │       └── AdminMatchList.tsx  # Liste admin des matchs (client)
│   ├── api/
│   │   ├── predictions/route.ts        # POST — enregistrer un prono
│   │   ├── cron/route.ts               # GET — calculer les points (déclenché par Vercel Cron)
│   │   └── admin/
│   │       ├── seed-matches/route.ts   # Importer les matchs depuis football-data.org
│   │       ├── sync-matches/route.ts   # Sync matchs (dates, statuts)
│   │       ├── fetch-results/route.ts  # Récupérer les scores finaux
│   │       ├── fetch-odds/route.ts     # Récupérer les côtes bookmaker
│   │       └── set-score/route.ts      # Forcer un score manuellement
│   └── page.tsx                        # Redirect vers /matches
├── lib/
│   ├── types.ts            # Tous les types TypeScript du projet
│   ├── scoring.ts          # Calcul des points (computePoints, formatOdds)
│   ├── supabase-client.ts  # createClient() — côté navigateur
│   └── supabase-server.ts  # createClient() + createAdminClient() — côté serveur
├── supabase/
│   └── schema.sql          # DDL complet : tables, vues, RLS policies
├── .env.local.example      # Variables d'env à copier
├── CLAUDE.md               # Inclut ce fichier (@AGENTS.md)
└── demo.html               # Démo HTML statique des écrans (pas de build requis)
```

---

## Base de données

### Tables principales

**`users`** — étend Supabase Auth
- `id uuid` (FK → auth.users)
- `username text unique`
- `first_name`, `last_name text`
- `is_admin boolean`

**`matches`**
- `id serial PK`
- `home_team`, `away_team text`
- `home_flag`, `away_flag text` (emoji drapeau)
- `match_date timestamptz`
- `stage text` — valeurs : `group | r32 | r16 | qf | sf | final`
- `group_name text | null` — ex. "A", "B" (null pour les élim.)
- `venue text | null`
- `home_odds`, `draw_odds`, `away_odds float | null`
- `home_score`, `away_score int | null`
- `status text` — `scheduled | finished`
- `fd_match_id int | null` — ID football-data.org pour sync

**`predictions`**
- `id serial PK`
- `user_id uuid FK → users`
- `match_id int FK → matches`
- `predicted_home`, `predicted_away int`
- `points_earned float | null` — calculé par le cron
- `updated_at timestamptz`
- Contrainte unique : `(user_id, match_id)`

### Vues

**`leaderboard`** — agrégat par utilisateur
- `id, username, first_name, last_name`
- `total_points float`
- `predictions_scored int`
- `exact_scores int`
- `correct_results int`

**`predictions_with_match`** — predictions jointe aux matchs
- Tous les champs de `predictions` + champs clés de `matches`

### RLS
- Matchs : lecture pour tous les users authentifiés, écriture admin seulement
- Predictions : chaque user lit et modifie uniquement les siennes
- Users : lecture publique (pour le classement), modification de son propre profil
- La vue `leaderboard` et `predictions_with_match` sont lisibles par tous les users authentifiés

---

## Types TypeScript (lib/types.ts)

```typescript
type Match = {
  id: number; home_team: string; away_team: string
  home_flag: string | null; away_flag: string | null
  match_date: string; stage: 'group'|'r32'|'r16'|'qf'|'sf'|'final'
  group_name: string | null; venue: string | null
  home_odds: number | null; draw_odds: number | null; away_odds: number | null
  home_score: number | null; away_score: number | null
  status: 'scheduled' | 'finished'; fd_match_id: number | null
}

type Prediction = {
  id: number; user_id: string; match_id: number
  predicted_home: number; predicted_away: number
  points_earned: number | null; calculated_at: string | null
  created_at: string; updated_at: string
}

type PredictionWithMatch = Prediction & {
  home_team: string; away_team: string; home_flag: string | null; away_flag: string | null
  match_date: string; stage: string; group_name: string | null
  home_odds: number | null; draw_odds: number | null; away_odds: number | null
  home_score: number | null; away_score: number | null; status: string
}

type LeaderboardEntry = {
  id: string; username: string; first_name: string; last_name: string
  total_points: number; predictions_scored: number
  exact_scores: number; correct_results: number
}

const STAGE_LABELS: Record<string, string>  // ex. 'r16' → 'Huitièmes de finale'
```

---

## Règles métier critiques

### Verrouillage des pronostics
Un prono se verrouille **15 minutes avant le coup d'envoi**. Après ça, plus aucune modification.

Implémenté à deux endroits (les deux doivent rester synchronisés) :
- `MatchCard.tsx` : `new Date(match.match_date).getTime() - 15 * 60 * 1000 <= Date.now()`
- `app/api/predictions/route.ts` : même vérification côté serveur

### Visibilité progressive des tours
Les matchs n'apparaissent dans la page "Matchs" que si leur tour est débloqué ET s'ils ne sont pas encore verrouillés.

Chaîne de déblocage (`STAGE_CHAIN` dans `matches/page.tsx`) :
```
group/r32 → toujours visible
r16        → visible quand le dernier match de groupe a démarré
qf         → visible quand le dernier match de r16 a démarré
sf         → visible quand le dernier match de qf a démarré
final      → visible quand le dernier match de sf a démarré
```

"Un tour d'avance" : quand le dernier match du tour en cours démarre, le tour suivant devient disponible pour pronostiquer.

### Calcul des points (`lib/scoring.ts`)
```
Score exact (bon résultat + bon score) → 3 × côte du résultat prédit
Bon résultat (pas exact)               → 1 × côte du résultat prédit
Mauvais résultat                       → 0
```

La côte utilisée est celle du résultat PRÉDIT (pas du résultat réel). Arrondi à 2 décimales.

Les points sont calculés par le cron (`app/api/cron/route.ts`), déclenché automatiquement via Vercel Cron après la mise à jour des scores.

### Page "Mes Pronos" vs page "Matchs"
- **Matchs** : uniquement les matchs non encore verrouillés (modifiables)
- **Mes Pronos** : uniquement les matchs verrouillés (match_date - 15min ≤ now), qu'ils soient en cours ou terminés

---

## Routes et navigation

**Auth** (`/login`, `/register`) — pas de layout protégé  
**Toutes les autres routes** passent par `(main)/layout.tsx` qui redirige vers `/login` si pas de session.

| Route | Contenu |
|---|---|
| `/matches` | Matchs à pronostiquer (non verrouillés, tours visibles) |
| `/mes-pronos` | Mes pronos verrouillés avec résultats et points |
| `/leaderboard` | Classement général + podium top 3 |
| `/leaderboard/[userId]` | Détail des pronos scorés d'un joueur |
| `/admin` | Gestion des matchs (admin seulement) |

Navigation : bottom nav fixe mobile (BottomNav.tsx) + top bar (NavBar.tsx).

---

## Variables d'environnement

Copier `.env.local.example` → `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=        # URL du projet Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Clé publique Supabase
SUPABASE_SERVICE_ROLE_KEY=       # Clé service (contourne RLS, serveur uniquement)

ODDS_API_KEY=                    # The Odds API (côtes bookmaker)
FOOTBALL_DATA_API_KEY=           # football-data.org (matchs + résultats)

ADMIN_SECRET=                    # Header requis pour toutes les routes /api/admin/*
CRON_SECRET=                     # Header requis pour /api/cron

NEXT_PUBLIC_APP_URL=             # URL publique de l'app (ex. https://cdm2026.vercel.app)
```

`SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être exposé côté client. Utilisé uniquement dans `createAdminClient()`.

---

## Workflow admin

1. **Seeder les matchs** : POST `/api/admin/seed-matches` (header `x-admin-secret`) — importe depuis football-data.org
2. **Synchroniser** : POST `/api/admin/sync-matches` — met à jour les dates/statuts
3. **Récupérer les côtes** : POST `/api/admin/fetch-odds` — The Odds API
4. **Récupérer les résultats** : POST `/api/admin/fetch-results` — met à jour scores + status=finished
5. **Calculer les points** : GET `/api/cron` (header `x-cron-secret`) — déclenché automatiquement ou manuellement
6. **Forcer un score** : POST `/api/admin/set-score` — override manuel

---

## Conventions de code

- **Server components par défaut.** `'use client'` seulement si hooks React ou événements navigateur (MatchCard, NavBar, BottomNav).
- **Pas de tailwind.config.ts** — Tailwind v4, config via `@import "tailwindcss"` dans globals.css. Les classes Tailwind standard fonctionnent normalement.
- **`createClient()`** pour les requêtes normales (respecte RLS), **`createAdminClient()`** uniquement quand on doit lire des données d'un autre utilisateur (ex. `/leaderboard/[userId]`).
- **Pas de test suite.** Ne pas ajouter de scripts de test.
- **Palette dark** : bg-gray-950 (fond), bg-gray-900 (cards), border-gray-800, text-white/gray-*. Accent : green-500/green-400.
- **Layout max-w-lg** (512px) — app pensée exclusivement mobile.
- **`revalidate = 30`** sur les pages dynamiques (matchs, mes-pronos). `revalidate = 60` sur leaderboard et détail joueur.

---

## Ce qui a été construit (mai 2026)

- Verrouillage des pronos à -15 min avant coup d'envoi
- Visibilité progressive des tours (un tour d'avance disponible)
- Page "Mes Pronos" : pronos verrouillés séparés de la page Matchs
- Classement cliquable → détail des pronos scorés d'un joueur
- Refonte UI complète : mobile-first, max-w-lg, bottom nav, steppers +/−, cards redessinées
