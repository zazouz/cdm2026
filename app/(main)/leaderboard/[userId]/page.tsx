import { createAdminClient, createClient } from '@/lib/supabase-server'
import { STAGE_LABELS } from '@/lib/types'
import type { PredictionWithMatch } from '@/lib/types'
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

  const { data: profile } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) notFound()

  const { data: allEntries } = await admin
    .from('leaderboard')
    .select('id')
    .order('total_points', { ascending: false })
  const rank = (allEntries ?? []).findIndex((e: { id: string }) => e.id === userId) + 1

  const { data: predictions } = await admin
    .from('predictions_with_match')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'finished')
    .not('points_earned', 'is', null)
    .order('match_date', { ascending: true })

  const rows = (predictions ?? []) as PredictionWithMatch[]

  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

  const grouped: Record<string, PredictionWithMatch[]> = {}
  for (const p of rows) {
    const key = `${p.stage}__${p.group_name ?? ''}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  }

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const [stageA, groupA] = a.split('__')
    const [stageB, groupB] = b.split('__')
    const si = stageOrder.indexOf(stageA) - stageOrder.indexOf(stageB)
    if (si !== 0) return si
    return groupA.localeCompare(groupB)
  })

  const totalPoints = rows.reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const exactCount = rows.filter(p =>
    p.home_score !== null &&
    p.predicted_home === p.home_score &&
    p.predicted_away === p.away_score
  ).length
  const correctCount = rows.filter(p => {
    if (p.home_score === null || p.away_score === null) return false
    const isExact = p.predicted_home === p.home_score && p.predicted_away === p.away_score
    if (isExact) return false
    return resultSign(p.predicted_home, p.predicted_away) === resultSign(p.home_score, p.away_score)
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
          <span className="text-2xl font-extrabold tracking-tight text-white">{totalPoints.toFixed(2)}</span>
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

      {rows.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-sm font-semibold text-gray-400">Aucun pronostic scoré pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([key, groupPredictions]) => {
            const [stage, groupName] = key.split('__')
            const label = stage === 'group' && groupName
              ? `Groupe ${groupName}`
              : STAGE_LABELS[stage] ?? stage

            return (
              <section key={key}>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-600">{label}</p>
                <div className="space-y-2">
                  {groupPredictions.map(p => {
                    const isExact =
                      p.home_score !== null &&
                      p.predicted_home === p.home_score &&
                      p.predicted_away === p.away_score
                    const isCorrect = !isExact && p.home_score !== null &&
                      resultSign(p.predicted_home, p.predicted_away) === resultSign(p.home_score!, p.away_score!)
                    const pts = p.points_earned ?? 0

                    return (
                      <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                        <div className="flex items-center px-4 py-3">
                          <div className="flex flex-1 flex-col items-center gap-1.5">
                            {p.home_flag
                              ? <img src={flagUrl(p.home_flag)} alt={p.home_team} className="h-7 w-auto rounded-sm shadow object-cover" />
                              : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
                            <span className="text-center text-[11px] font-semibold leading-tight text-white">{p.home_team}</span>
                          </div>
                          <div className="w-14 flex-shrink-0 text-center">
                            <div className="text-lg font-extrabold text-white">{p.home_score}–{p.away_score}</div>
                            <div className="text-[9px] uppercase text-gray-600">résultat</div>
                          </div>
                          <div className="flex flex-1 flex-col items-center gap-1.5">
                            {p.away_flag
                              ? <img src={flagUrl(p.away_flag)} alt={p.away_team} className="h-7 w-auto rounded-sm shadow object-cover" />
                              : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
                            <span className="text-center text-[11px] font-semibold leading-tight text-white">{p.away_team}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900/60 px-4 py-2.5">
                          <span className="text-[11px] text-gray-500">
                            Prono : <span className="font-mono font-bold text-white">{p.predicted_home} – {p.predicted_away}</span>
                          </span>
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
