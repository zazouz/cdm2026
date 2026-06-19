import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from './supabase-server'
import type { Match, LeaderboardEntry } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Auth — dédupliqué par requête avec le cache() de React.
// Le layout et chaque page appellent getAuthUser()/getProfile() ; React garantit
// un seul aller-retour réseau vers Supabase Auth par requête, au lieu d'un par
// composant serveur (layout + page).
// ─────────────────────────────────────────────────────────────────────────────
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async () => {
  const user = await getAuthUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()
  return data
})

// ─────────────────────────────────────────────────────────────────────────────
// Données impersonnelles — identiques pour tous les joueurs, mises en cache avec
// unstable_cache (partagé entre requêtes). La requête tourne au plus une fois par
// fenêtre de revalidation au lieu d'une fois par navigation par joueur.
// Invalidation immédiate via revalidateTag sur les routes d'écriture de scores.
// Lecture via le client admin : pas de cookies (interdits dans unstable_cache) et
// ces données sont de toute façon lisibles par tout utilisateur authentifié.
// ─────────────────────────────────────────────────────────────────────────────

export type NonAdminUser = { id: string; first_name: string | null; last_name: string | null; username: string }

export const getAllMatches = unstable_cache(
  async (): Promise<Match[]> => {
    const admin = createAdminClient()
    const { data } = await admin.from('matches').select('*').order('match_date', { ascending: true })
    return (data ?? []) as Match[]
  },
  ['all-matches'],
  { tags: ['matches'], revalidate: 30 },
)

export const getGroupMatches = unstable_cache(
  async (): Promise<Match[]> => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('matches')
      .select('*')
      .eq('stage', 'group')
      .order('match_date', { ascending: true })
    return (data ?? []) as Match[]
  },
  ['group-matches'],
  { tags: ['matches'], revalidate: 30 },
)

export const getLeaderboard = unstable_cache(
  async (): Promise<LeaderboardEntry[]> => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .order('correct_results', { ascending: false })
      .order('username', { ascending: true })
    return (data ?? []) as LeaderboardEntry[]
  },
  ['leaderboard'],
  { tags: ['scores'], revalidate: 30 },
)

export const getNonAdminUsers = unstable_cache(
  async (): Promise<NonAdminUser[]> => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('users')
      .select('id, first_name, last_name, username')
      .eq('is_admin', false)
    return (data ?? []) as NonAdminUser[]
  },
  ['non-admin-users'],
  { tags: ['users'], revalidate: 300 },
)
