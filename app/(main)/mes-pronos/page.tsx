import { createClient } from '@/lib/supabase-server'
import { STAGE_LABELS } from '@/lib/types'
import type { PredictionWithMatch } from '@/lib/types'

export const revalidate = 30

const LOCK_MS = 15 * 60 * 1000

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function resultSign(h: number, a: number) { return h > a ? 1 : h < a ? -1 : 0 }

export default async function MesPronos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: predictions } = await supabase
    .from('predictions_with_match')
    .select('*')
    .eq('user_id', user.id)
    .order('match_date', { ascending: true })

  const now = Date.now()

  const locked = ((predictions ?? []) as PredictionWithMatch[]).filter(p => {
    return new Date(p.match_date).getTime() - LOCK_MS <= now
  })

  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

  const grouped: Record<string, PredictionWithMatch[]> = {}
  for (const p of locked) {
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

  const totalPoints = locked.reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const scoredCount = locked.filter(p => p.points_earned !== null).length
  const exactCount = locked.filter(p =>
    p.home_score !== null &&
    p.predicted_home === p.home_score &&
    p.predicted_away === p.away_score
  ).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Mes Pronos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tes pronostics verrouillés. Les points sont calculés dès la fin du match.
        </p>
      </div>

      {locked.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-4xl mb-4">⏳</p>
          <p className="text-base font-semibold text-gray-300">Aucun pronostic verrouillé</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-xs">
            Les pronos apparaissent ici 15 min avant le coup d&apos;envoi et ne sont plus modifiables.
          </p>
        </div>
      ) : (
        <>
          {scoredCount > 0 && (
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
                <span className="text-2xl font-extrabold text-white">{scoredCount}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 mt-1">Scorés</span>
              </div>
            </div>
          )}

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
                      const isFinished = p.status === 'finished'
                      const isExact = isFinished &&
                        p.home_score !== null &&
                        p.predicted_home === p.home_score &&
                        p.predicted_away === p.away_score
                      const isCorrect = isFinished && !isExact && p.home_score !== null &&
                        resultSign(p.predicted_home, p.predicted_away) === resultSign(p.home_score!, p.away_score!)
                      const pts = p.points_earned ?? 0

                      return (
                        <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                          <div className="flex items-center px-4 py-3">
                            <div className="flex flex-1 flex-col items-center gap-2">
                              {p.home_flag
                                ? <img src={`https://flagcdn.com/w40/${p.home_flag}.png`} alt={p.home_team} className="h-6 w-auto rounded-sm shadow object-cover" />
                                : <div className="h-6 w-9 rounded-sm bg-gray-800" />}
                              <span className="text-center text-[11px] font-semibold leading-tight text-white">{p.home_team}</span>
                            </div>
                            <div className="w-14 flex-shrink-0 text-center">
                              {isFinished && p.home_score !== null ? (
                                <>
                                  <div className="text-lg font-extrabold text-white">{p.home_score}–{p.away_score}</div>
                                  <div className="text-[9px] uppercase text-gray-600">résultat</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-[10px] font-semibold text-red-400">EN COURS</div>
                                  <div className="text-[9px] text-gray-600">{formatDate(p.match_date)}</div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col items-center gap-2">
                              {p.away_flag
                                ? <img src={`https://flagcdn.com/w40/${p.away_flag}.png`} alt={p.away_team} className="h-6 w-auto rounded-sm shadow object-cover" />
                                : <div className="h-6 w-9 rounded-sm bg-gray-800" />}
                              <span className="text-center text-[11px] font-semibold leading-tight text-white">{p.away_team}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900/60 px-4 py-2.5">
                            <span className="text-[11px] text-gray-500">
                              Ton prono : <span className="font-mono font-bold text-white">{p.predicted_home} – {p.predicted_away}</span>
                            </span>
                            {isFinished && p.points_earned !== null ? (
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                isExact ? 'bg-green-950 text-green-400'
                                : isCorrect ? 'bg-blue-950 text-blue-400'
                                : 'bg-gray-800 text-gray-600'
                              }`}>
                                {isExact && '⭐ '}
                                {pts > 0 ? `+${Number(pts).toFixed(2)} pts` : '0 pt'}
                                {isExact && ' exact'}
                              </span>
                            ) : (
                              <span className="text-[11px] italic text-gray-600">en attente…</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
