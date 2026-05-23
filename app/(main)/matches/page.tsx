import { createClient } from '@/lib/supabase-server'
import { STAGE_LABELS } from '@/lib/types'
import type { Match, PredictionWithMatch } from '@/lib/types'
import MatchCard from './MatchCard'

export const revalidate = 30

// Stage progression: a stage becomes available once the last match of the previous stage has started
const STAGE_CHAIN: Record<string, string | null> = {
  r32: null,
  group: null,
  r16: 'group',
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

export default async function MatchesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: allMatches }, { data: myPredictions }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true }),
    supabase
      .from('predictions_with_match')
      .select('*')
      .eq('user_id', user.id),
  ])

  const predictionByMatch = Object.fromEntries(
    (myPredictions ?? []).map(p => [p.match_id, p])
  )

  const now = new Date()
  const LOCK_MS = 15 * 60 * 1000

  // Only show matches that are not yet locked and belong to a visible stage
  const matches = (allMatches ?? []).filter(match => {
    if (!isStageVisible(match.stage, allMatches ?? [], now)) return false
    const lockTime = new Date(match.match_date).getTime() - LOCK_MS
    return lockTime > now.getTime()
  })

  const grouped: Record<string, Match[]> = {}
  for (const match of matches) {
    const key = `${match.stage}__${match.group_name ?? ''}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(match)
  }

  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const [stageA, groupA] = a.split('__')
    const [stageB, groupB] = b.split('__')
    const si = stageOrder.indexOf(stageA) - stageOrder.indexOf(stageB)
    if (si !== 0) return si
    return groupA.localeCompare(groupB)
  })

  if (!allMatches || allMatches.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-4">⚽</p>
        <p>Aucun match programmé pour l&apos;instant.</p>
        <p className="text-sm mt-2 text-gray-600">L&apos;admin doit d&apos;abord importer le calendrier.</p>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-4">⏳</p>
        <p>Tous les pronostics sont verrouillés.</p>
        <p className="text-sm mt-2 text-gray-600">Retrouve tes pronos dans &ldquo;Mes Pronos&rdquo;.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-white">Matchs &amp; Pronostics</h1>

      {sortedGroups.map(([key, groupMatches]) => {
        const [stage, groupName] = key.split('__')
        const label = stage === 'group' && groupName
          ? `Groupe ${groupName}`
          : STAGE_LABELS[stage] ?? stage

        return (
          <section key={key}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {label}
            </h2>
            <div className="space-y-2">
              {groupMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictionByMatch[match.id] ?? null}
                  userId={user.id}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
