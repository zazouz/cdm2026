import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import type { Match } from '@/lib/types'
import MatchesList from './MatchesList'

export const dynamic = 'force-dynamic'

const STAGE_CHAIN: Record<string, string | null> = {
  r32: null,
  group: null,
  r16: 'r32',
  qf: 'r16',
  sf: 'qf',
  final: 'sf',
}

function isStageVisible(stage: string, allMatches: Match[], now: Date): boolean {
  const prevStage = STAGE_CHAIN[stage] ?? null
  if (!prevStage) return true
  const prevMatches = allMatches.filter(m => m.stage === prevStage)
  if (prevMatches.length === 0) return false
  const lastDate = Math.max(...prevMatches.map(m => new Date(m.match_date).getTime()))
  return lastDate <= now.getTime()
}

const T = {
  fr: {
    empty: 'Aucun match programmé pour l\'instant.',
    emptyHint: 'L\'admin doit d\'abord importer le calendrier.',
  },
  en: {
    empty: 'No matches scheduled yet.',
    emptyHint: 'The admin needs to import the calendar first.',
  },
}

export default async function MatchesPage() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'
  const t = T[lang]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: allMatches }, { data: myPredictions }] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: true }),
    supabase.from('predictions_with_match').select('*').eq('user_id', user.id),
  ])

  if (!allMatches || allMatches.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-4">⚽</p>
        <p>{t.empty}</p>
        <p className="text-sm mt-2 text-gray-500">{t.emptyHint}</p>
      </div>
    )
  }

  const predictionByMatch = Object.fromEntries(
    (myPredictions ?? []).map(p => [p.match_id, p])
  )

  const now = new Date()
  const LOCK_MS = 15 * 60 * 1000

  const matches = allMatches.filter(match => {
    if (!isStageVisible(match.stage, allMatches, now)) return false
    return new Date(match.match_date).getTime() - LOCK_MS > now.getTime()
  })

  return (
    <MatchesList
      matches={matches}
      predictionByMatch={predictionByMatch}
      userId={user.id}
    />
  )
}
