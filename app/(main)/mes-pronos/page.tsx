import { createAdminClient } from '@/lib/supabase-server'
import { getAuthUser, getAllMatches, getNonAdminUsers } from '@/lib/queries'
import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import type { Prediction } from '@/lib/types'
import { type UserRow } from './MatchPronosCard'
import PronosList from './PronosList'

export const dynamic = 'force-dynamic'

const LOCK_MS = 15 * 60 * 1000

// PostgREST plafonne à 1000 lignes par requête et tronque le surplus sans erreur.
// On pagine pour récupérer la totalité des pronos sur les matchs verrouillés.
async function fetchAllPredictions(
  admin: ReturnType<typeof createAdminClient>,
  matchIds: number[],
): Promise<Prediction[]> {
  if (matchIds.length === 0) return []
  const PAGE = 1000
  const all: Prediction[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('predictions')
      .select('user_id, match_id, predicted_home, predicted_away, points_earned')
      .in('match_id', matchIds)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('[CDM2026][pronos] fetch predictions failed', { from, error: error.message })
      break
    }
    if (!data?.length) break
    all.push(...(data as Prediction[]))
    if (data.length < PAGE) break
  }
  return all
}

export default async function LesPronos() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'

  const admin = createAdminClient()

  const user = await getAuthUser()
  if (!user) return null

  const lockCutoff = Date.now() + LOCK_MS

  const [allMatches, usersData] = await Promise.all([
    getAllMatches(),
    getNonAdminUsers(),
  ])

  // Matchs verrouillés (coup d'envoi - 15 min déjà passé), du plus récent au plus ancien.
  const matches = allMatches
    .filter(m => new Date(m.match_date).getTime() <= lockCutoff)
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
  const users = usersData as UserRow[]

  const matchIds = matches.map(m => m.id)
  const preds = await fetchAllPredictions(admin, matchIds)

  // matchId → userId → prono (pronos réels uniquement). Le tri et les entrées
  // « sans prono » sont reconstruits côté client pour ne transmettre la liste
  // des joueurs qu'une seule fois au lieu de la dupliquer pour chaque match.
  const predsByMatch: Record<number, Record<string, Prediction>> = {}
  for (const p of preds) {
    (predsByMatch[p.match_id] ??= {})[p.user_id] = p
  }

  return (
    <PronosList
      matches={matches}
      users={users}
      predsByMatch={predsByMatch}
      currentUserId={user.id}
      lang={lang}
    />
  )
}
