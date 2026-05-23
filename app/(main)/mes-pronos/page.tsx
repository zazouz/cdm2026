import { createAdminClient, createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import type { Match, Prediction } from '@/lib/types'
import { flagUrl } from '@/lib/flags'

export const revalidate = 30

const LOCK_MS = 15 * 60 * 1000

const T = {
  fr: {
    title: 'Les Pronos',
    subtitle: 'Les pronostics de chacun, par match.',
    you: 'toi',
    result: 'résultat',
    live: 'EN COURS',
    noBet: 'Pas de prono',
    pending: 'en attente…',
    empty: 'Aucun match verrouillé pour l\'instant.',
    emptyHint: 'Les pronos apparaissent ici 15 min avant le coup d\'envoi.',
  },
  en: {
    title: 'Bets',
    subtitle: "Everyone's predictions, match by match.",
    you: 'you',
    result: 'result',
    live: 'LIVE',
    noBet: 'No bet',
    pending: 'pending…',
    empty: 'No locked matches yet.',
    emptyHint: 'Predictions appear here 15 min before kickoff.',
  },
}

function formatDate(dateStr: string, lang: Lang) {
  return new Date(dateStr).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function resultSign(h: number, a: number) { return h > a ? 1 : h < a ? -1 : 0 }

type UserRow = { id: string; first_name: string | null; last_name: string | null; username: string }

export default async function LesPronos() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'
  const t = T[lang]

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const lockCutoff = new Date(Date.now() + LOCK_MS).toISOString()

  const [{ data: matchesData }, { data: usersData }] = await Promise.all([
    admin.from('matches').select('*').lte('match_date', lockCutoff).order('match_date', { ascending: true }),
    admin.from('users').select('id, first_name, last_name, username'),
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-4xl mb-4">⏳</p>
          <p className="text-base font-semibold text-gray-300">{t.empty}</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-xs">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(m => {
            const isFinished = m.status === 'finished'
            const matchPreds = predMap.get(m.id) ?? new Map<string, Prediction>()

            const sortedUsers = [...users].sort((a, b) => {
              const pa = matchPreds.get(a.id)
              const pb = matchPreds.get(b.id)
              if (pa && !pb) return -1
              if (!pa && pb) return 1
              if (pa && pb && isFinished) {
                return (pb.points_earned ?? 0) - (pa.points_earned ?? 0)
              }
              return 0
            })

            return (
              <div key={m.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                {/* Match header */}
                <div className="flex items-center px-4 py-3">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    {m.home_flag
                      ? <img src={flagUrl(m.home_flag)} alt={m.home_team} className="h-7 w-auto rounded-sm shadow object-cover" />
                      : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
                    <span className="text-center text-[11px] font-semibold leading-tight text-white">{m.home_team}</span>
                  </div>
                  <div className="w-14 flex-shrink-0 text-center">
                    {isFinished && m.home_score !== null ? (
                      <>
                        <div className="text-lg font-extrabold text-white">{m.home_score}–{m.away_score}</div>
                        <div className="text-[9px] uppercase text-gray-600">{t.result}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] font-semibold text-red-400">{t.live}</div>
                        <div className="text-[9px] text-gray-600">{formatDate(m.match_date, lang)}</div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    {m.away_flag
                      ? <img src={flagUrl(m.away_flag)} alt={m.away_team} className="h-7 w-auto rounded-sm shadow object-cover" />
                      : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
                    <span className="text-center text-[11px] font-semibold leading-tight text-white">{m.away_team}</span>
                  </div>
                </div>

                {/* Predictions per user */}
                <div className="border-t border-gray-800">
                  {sortedUsers.map(u => {
                    const p = matchPreds.get(u.id) ?? null
                    const isMe = u.id === user.id
                    const isExact = p !== null && isFinished && m.home_score !== null &&
                      p.predicted_home === m.home_score && p.predicted_away === m.away_score
                    const isCorrect = p !== null && !isExact && isFinished &&
                      m.home_score !== null && m.away_score !== null &&
                      resultSign(p.predicted_home, p.predicted_away) === resultSign(m.home_score, m.away_score)
                    const pts = p?.points_earned ?? 0
                    const initials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() || '?'

                    return (
                      <div
                        key={u.id}
                        className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-800/50 last:border-0 ${
                          isMe ? 'bg-green-950/20' : ''
                        }`}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-green-900 bg-gradient-to-br from-green-950 to-gray-900 text-[9px] font-extrabold text-green-400">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                          <span className={`text-xs font-semibold truncate ${isMe ? 'text-green-400' : 'text-white'}`}>
                            {u.first_name} {u.last_name}
                          </span>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-green-950 px-1.5 py-0.5 text-[9px] text-green-600">{t.you}</span>
                          )}
                        </div>
                        {p ? (
                          <>
                            <span className="shrink-0 font-mono text-xs font-bold text-white bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                              {p.predicted_home} – {p.predicted_away}
                            </span>
                            {isFinished && p.points_earned !== null ? (
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${
                                isExact ? 'bg-green-950 text-green-400'
                                : isCorrect ? 'bg-blue-950 text-blue-400'
                                : 'bg-gray-800 text-gray-600'
                              }`}>
                                {isExact && '⭐ '}
                                {pts > 0 ? `+${Number(pts).toFixed(2)} pts` : '0 pt'}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[11px] italic text-gray-600">{t.pending}</span>
                            )}
                          </>
                        ) : (
                          <span className="shrink-0 text-[11px] italic text-gray-600">{t.noBet}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
