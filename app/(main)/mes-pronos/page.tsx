import { createAdminClient, createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import type { Match, Prediction } from '@/lib/types'
import { type UserRow, type PredEntry } from './MatchPronosCard'
import PronosList, { type PronoItem } from './PronosList'

export const dynamic = 'force-dynamic'

const LOCK_MS = 15 * 60 * 1000

export default async function LesPronos() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const lockCutoff = new Date(Date.now() + LOCK_MS).toISOString()

  const [{ data: matchesData }, { data: usersData }] = await Promise.all([
    admin.from('matches').select('*').lte('match_date', lockCutoff).order('match_date', { ascending: false }),
    admin.from('users').select('id, first_name, last_name, username').eq('is_admin', false),
  ])

  const matches = (matchesData ?? []) as Match[]
  const users = (usersData ?? []) as UserRow[]

  const matchIds = matches.map(m => m.id)
  const { data: predsData } = matchIds.length > 0
    ? await admin.from('predictions').select('*').in('match_id', matchIds)
    : { data: [] }

  // matchId → userId → prediction
  const predMap = new Map<number, Map<string, Prediction>>()
  for (const p of (predsData ?? []) as Prediction[]) {
    if (!predMap.has(p.match_id)) predMap.set(p.match_id, new Map())
    predMap.get(p.match_id)!.set(p.user_id, p)
  }

  const items: PronoItem[] = matches.map(m => {
    const matchPreds = predMap.get(m.id) ?? new Map<string, Prediction>()
    const isFinished = m.status === 'finished'

    // Sort: current user first, then by points desc (if finished), then alphabetically
    const entries: PredEntry[] = [...users]
      .sort((a, b) => {
        if (a.id === user.id) return -1
        if (b.id === user.id) return 1
        const pa = matchPreds.get(a.id)
        const pb = matchPreds.get(b.id)
        if (pa && !pb) return -1
        if (!pa && pb) return 1
        if (pa && pb && isFinished) return (pb.points_earned ?? 0) - (pa.points_earned ?? 0)
        const nameA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()
        const nameB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim()
        return nameA.localeCompare(nameB)
      })
      .map(u => ({ user: u, pred: matchPreds.get(u.id) ?? null }))

    return { match: m, entries }
  })

  return <PronosList items={items} currentUserId={user.id} lang={lang} />
}
