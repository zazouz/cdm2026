import { createAdminClient, createClient } from '@/lib/supabase-server'
import { STAGE_LABELS } from '@/lib/types'
import type { Match, Prediction } from '@/lib/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { flagUrl } from '@/lib/flags'

export const revalidate = 60

function resultSign(home: number, away: number): -1 | 0 | 1 {
  if (home > away) return 1
  if (home < away) return -1
  return 0
}

export default async function UserPredictionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const [supabase, admin] = await Promise.all([createClient(), createAdminClient()])

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: allEntries }, { data: finishedMatches }] = await Promise.all([
    admin.from('users').select('*').eq('id', userId).single(),
    admin.from('leaderboard').select('id').order('total_points', { ascending: false }),
    admin.from('matches').select('*').eq('status', 'finished').order('match_date', { ascending: true }),
  ])

  if (!profile) notFound()

  const rank = (allEntries ?? []).findIndex((e: { id: string }) => e.id === userId) + 1
  const matches = (finishedMatches ?? []) as Match[]

  const matchIds = matches.map(m => m.id)
  const { data: rawPredictions } = matchIds.length > 0
    ? await admin.from('predictions').select('*').eq('user_id', userId).in('match_id', matchIds)
    : { data: [] }

  const predByMatchId = new Map((rawPredictions ?? []).map((p: Prediction) => [p.match_id, p]))

  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

  const grouped: Record<string, Match[]> = {}
  for (const m of matches) {
    const key = `${m.stage}__${m.group_name ?? ''}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  }

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const [stageA, groupA] = a.split('__')
    const [stageB, groupB] = b.split('__')
    const si = stageOrder.indexOf(stageA) - stageOrder.indexOf(stageB)
    if (si !== 0) return si
    return groupA.localeCompare(groupB)
  })

  const totalPoints = matches.reduce((sum, m) => {
    const p = predByMatchId.get(m.id)
    return sum + (p?.points_earned ?? 0)
  }, 0)
  const exactCount = matches.filter(m => {
    const p = predByMatchId.get(m.id)
    return p && m.home_score !== null && p.predicted_home === m.home_score && p.predicted_away === m.away_score
  }).length
  const correctCount = matches.filter(m => {
    const p = predByMatchId.get(m.id)
    if (!p || m.home_score === null || m.away_score === null) return false
    const isExact = p.predicted_home === m.home_score && p.predicted_away === m.away_score
    if (isExact) return false
    return resultSign(p.predicted_home, p.predicted_away) === resultSign(m.home_score, m.away_score)
  }).length

  const isMe = userId === user.id
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <div className="space-y-5">
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-white"
      >
        ← Classement
      </Link>

      {/* User header */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-green-900 bg-gradient-to-br from-green-950 to-gray-900 text-lg font-extrabold text-green-400">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-white">
            {profile.first_name} {profile.last_name}
            {isMe && <span className="ml-2 rounded-full bg-green-950 px-2 py-0.5 text-[10px] text-green-500">toi</span>}
          </p>
          <p className="font-mono text-[11px] text-gray-600">{profile.username}</p>
        </div>
        {rank > 0 && (
          <div className="shrink-0 text-center rounded-xl border border-gray-800 bg-gray-800/50 px-4 py-2">
            <div className="text-xl font-extrabold text-white">
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
            </div>
            <div className="text-[9px] uppercase tracking-wide text-gray-600">rang</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-900 py-4">
          <span className="text-2xl font-extrabold tracking-tight text-white">{Number(totalPoints).toFixed(2)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 mt-1">Points</span>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-900 py-4">
          <span className="text-2xl font-extrabold text-green-400">{exactCount}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 mt-1">Exacts</span>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-900 py-4">
          <span className="text-2xl font-extrabold text-blue-400">{correctCount}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 mt-1">Corrects</span>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-sm font-semibold text-gray-400">Aucun match terminé pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([key, groupMatches]) => {
            const [stage, groupName] = key.split('__')
            const label = stage === 'group' && groupName
              ? `Groupe ${groupName}`
              : STAGE_LABELS[stage] ?? stage

            return (
              <section key={key}>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-600">{label}</p>
                <div className="space-y-2">
                  {groupMatches.map(m => {
                    const p = predByMatchId.get(m.id) ?? null
                    const isExact = p !== null && m.home_score !== null &&
                      p.predicted_home === m.home_score && p.predicted_away === m.away_score
                    const isCorrect = p !== null && !isExact && m.home_score !== null && m.away_score !== null &&
                      resultSign(p.predicted_home, p.predicted_away) === resultSign(m.home_score, m.away_score)
                    const pts = p?.points_earned ?? 0

                    return (
                      <div key={m.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                        <div className="flex items-center px-4 py-3">
                          <div className="flex flex-1 flex-col items-center gap-1.5">
                            {m.home_flag
                              ? <img src={flagUrl(m.home_flag)} alt={m.home_team} className="h-7 w-auto rounded-sm shadow object-cover" />
                              : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
                            <span className="text-center text-[11px] font-semibold leading-tight text-white">{m.home_team}</span>
                          </div>
                          <div className="w-14 flex-shrink-0 text-center">
                            <div className="text-lg font-extrabold text-white">{m.home_score}–{m.away_score}</div>
                            <div className="text-[9px] uppercase text-gray-600">résultat</div>
                          </div>
                          <div className="flex flex-1 flex-col items-center gap-1.5">
                            {m.away_flag
                              ? <img src={flagUrl(m.away_flag)} alt={m.away_team} className="h-7 w-auto rounded-sm shadow object-cover" />
                              : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
                            <span className="text-center text-[11px] font-semibold leading-tight text-white">{m.away_team}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900/60 px-4 py-2.5">
                          {p ? (
                            <span className="text-[11px] text-gray-500">
                              Prono : <span className="font-mono font-bold text-white">{p.predicted_home} – {p.predicted_away}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-600 italic">Pas de prono</span>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isExact ? 'bg-green-950 text-green-400'
                            : isCorrect ? 'bg-blue-950 text-blue-400'
                            : 'bg-gray-800 text-gray-600'
                          }`}>
                            {isExact && '⭐ '}
                            {pts > 0 ? `+${Number(pts).toFixed(2)} pts` : '0 pt'}
                            {isExact && ' exact'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
