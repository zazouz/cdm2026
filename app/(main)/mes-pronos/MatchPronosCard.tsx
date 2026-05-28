'use client'

import { useState } from 'react'
import type { Match, Prediction } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { flagUrl } from '@/lib/flags'
import { computePoints } from '@/lib/scoring'

export type UserRow = { id: string; first_name: string | null; last_name: string | null; username: string }
export type PredEntry = { user: UserRow; pred: Prediction | null }

type ScoreGroup = {
  key: string
  ph: number
  pa: number
  users: UserRow[]
  preds: Prediction[]
  resultType: 'exact' | 'correct' | 'wrong' | 'unknown'
  pts: number | null
}

type Props = {
  match: Match
  entries: PredEntry[]
  currentUserId: string
  lang: Lang
  defaultOpen?: boolean
}

const T = {
  fr: {
    yourBet: 'Ton prono',
    distribution: 'Répartition',
    noBet: 'Pas de prono',
    noBetCount: (n: number) => `${n} sans prono`,
    players: (n: number) => `${n} joueur${n > 1 ? 's' : ''}`,
    exact: 'exact',
    correct: 'bon résultat',
    wrong: '0 pt',
    soon: 'Bientôt',
    live: 'EN COURS',
    you: 'toi',
    pending: '…',
    pronos: (n: number, total: number) => `${n}/${total} prono${total > 1 ? 's' : ''}`,
    exacts: (n: number) => `${n} exact${n > 1 ? 's' : ''}`,
    corrects: (n: number) => `${n} correct${n > 1 ? 's' : ''}`,
  },
  en: {
    yourBet: 'Your bet',
    distribution: 'Breakdown',
    noBet: 'No bet',
    noBetCount: (n: number) => `${n} no bet${n > 1 ? 's' : ''}`,
    players: (n: number) => `${n} player${n > 1 ? 's' : ''}`,
    exact: 'exact',
    correct: 'correct',
    wrong: '0 pt',
    soon: 'Soon',
    live: 'LIVE',
    you: 'you',
    pending: '…',
    pronos: (n: number, total: number) => `${n}/${total} bet${total > 1 ? 's' : ''}`,
    exacts: (n: number) => `${n} exact`,
    corrects: (n: number) => `${n} correct`,
  },
}

function resultSign(h: number, a: number) { return h > a ? 1 : h < a ? -1 : 0 }

function shortName(u: UserRow): string {
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name[0]}.`
  return u.username
}

function initials(u: UserRow): string {
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()
    || u.username?.[0]?.toUpperCase() || '?'
}

function buildGroups(entries: PredEntry[], match: Match, isFinished: boolean): ScoreGroup[] {
  const map = new Map<string, ScoreGroup>()

  for (const { user, pred } of entries) {
    if (!pred) continue
    const key = `${pred.predicted_home}-${pred.predicted_away}`

    if (!map.has(key)) {
      const ph = pred.predicted_home
      const pa = pred.predicted_away
      let resultType: ScoreGroup['resultType'] = 'unknown'
      let pts: number | null = null

      if (isFinished && match.home_score !== null && match.away_score !== null) {
        if (ph === match.home_score && pa === match.away_score) resultType = 'exact'
        else if (resultSign(ph, pa) === resultSign(match.home_score, match.away_score)) resultType = 'correct'
        else resultType = 'wrong'

        // Compute pts from odds (same for all users in this group)
        pts = computePoints(match, pred)
      }

      map.set(key, { key, ph, pa, users: [], preds: [], resultType, pts })
    }

    map.get(key)!.users.push(user)
    map.get(key)!.preds.push(pred)
  }

  const rank = { exact: 0, correct: 1, wrong: 2, unknown: 3 }
  return [...map.values()].sort((a, b) => {
    if (rank[a.resultType] !== rank[b.resultType]) return rank[a.resultType] - rank[b.resultType]
    return b.users.length - a.users.length
  })
}

export default function MatchPronosCard({ match, entries, currentUserId, lang, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const t = T[lang]

  const isFinished = match.status === 'finished'
  const isLive = !isFinished && new Date(match.match_date) <= new Date()

  const withPred = entries.filter(e => e.pred !== null)
  const noBetCount = entries.filter(e => e.pred === null).length

  const exactCount = isFinished && match.home_score !== null
    ? withPred.filter(e =>
        e.pred!.predicted_home === match.home_score && e.pred!.predicted_away === match.away_score
      ).length
    : 0
  const correctCount = isFinished && match.home_score !== null
    ? withPred.filter(e => {
        const p = e.pred!
        return !(p.predicted_home === match.home_score && p.predicted_away === match.away_score) &&
          resultSign(p.predicted_home, p.predicted_away) === resultSign(match.home_score!, match.away_score!)
      }).length
    : 0

  const myEntry = entries.find(e => e.user.id === currentUserId)
  const myPred = myEntry?.pred ?? null

  const myResultType = (() => {
    if (!myPred || !isFinished || match.home_score === null) return 'unknown' as const
    if (myPred.predicted_home === match.home_score && myPred.predicted_away === match.away_score) return 'exact' as const
    if (resultSign(myPred.predicted_home, myPred.predicted_away) === resultSign(match.home_score, match.away_score!)) return 'correct' as const
    return 'wrong' as const
  })()

  const groups = buildGroups(entries, match, isFinished)

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

      {/* ── Header (toujours visible, cliquable) ── */}
      <button onClick={() => setOpen(v => !v)} className="w-full text-left focus:outline-none" aria-expanded={open}>

        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          {/* Home */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {match.home_flag
              ? <img src={flagUrl(match.home_flag)} alt={match.home_team} className="h-4 w-6 rounded-sm object-cover shrink-0" />
              : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
            <span className="text-[11px] font-semibold text-white truncate">{match.home_team}</span>
          </div>

          {/* Score / statut */}
          <div className="shrink-0 min-w-[56px] text-center">
            {isFinished && match.home_score !== null ? (
              <span className="font-mono text-sm font-extrabold text-white">{match.home_score}–{match.away_score}</span>
            ) : isLive ? (
              <span className="text-[10px] font-bold text-red-400">{t.live}</span>
            ) : (
              <span className="text-[10px] font-semibold text-yellow-600">{t.soon}</span>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-[11px] font-semibold text-white truncate text-right">{match.away_team}</span>
            {match.away_flag
              ? <img src={flagUrl(match.away_flag)} alt={match.away_team} className="h-4 w-6 rounded-sm object-cover shrink-0" />
              : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
          </div>

          <span className={`shrink-0 text-[10px] text-gray-600 ml-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5">
          <span className="text-[10px] text-gray-500">{t.pronos(withPred.length, entries.length)}</span>
          {isFinished && exactCount > 0 && (
            <span className="rounded-full bg-green-950 px-1.5 py-0.5 text-[9px] font-bold text-green-400">
              ⭐ {t.exacts(exactCount)}
            </span>
          )}
          {isFinished && correctCount > 0 && (
            <span className="rounded-full bg-blue-950 px-1.5 py-0.5 text-[9px] font-bold text-blue-400">
              ✓ {t.corrects(correctCount)}
            </span>
          )}
          {isLive && (
            <span className="rounded-full bg-red-950/40 px-1.5 py-0.5 text-[9px] font-bold text-red-400">{t.live}</span>
          )}
        </div>
      </button>

      {/* ── Contenu déplié ── */}
      {open && (
        <div className="border-t border-gray-800">

          {/* Ton prono */}
          <div className="px-3 pt-3 pb-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">{t.yourBet}</p>
            {myPred && myEntry ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-950/20 border border-green-900/25 px-3 py-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-950 text-[8px] font-extrabold text-green-400 ring-1 ring-green-900">
                  {initials(myEntry.user)}
                </div>
                <span className="flex-1 text-[11px] font-semibold text-green-400 truncate min-w-0">
                  {shortName(myEntry.user)}
                  <span className="ml-1.5 text-[9px] text-green-800">({t.you})</span>
                </span>
                <span className={`font-mono text-[11px] font-bold shrink-0 ${
                  myResultType === 'exact' ? 'text-green-400'
                  : myResultType === 'correct' ? 'text-blue-400'
                  : myResultType === 'wrong' ? 'text-gray-500'
                  : 'text-white'
                }`}>
                  {myPred.predicted_home}–{myPred.predicted_away}
                </span>
                <span className={`text-[10px] font-bold w-14 text-right shrink-0 ${
                  myResultType === 'exact' ? 'text-green-400'
                  : myResultType === 'correct' ? 'text-blue-400'
                  : 'text-gray-600'
                }`}>
                  {isFinished && myPred.points_earned !== null
                    ? (myPred.points_earned > 0
                        ? `${myResultType === 'exact' ? '⭐ ' : ''}+${Number(myPred.points_earned).toFixed(2)}`
                        : '0 pt')
                    : t.pending
                  }
                </span>
              </div>
            ) : (
              <p className="text-[11px] italic text-gray-600 px-1">{t.noBet}</p>
            )}
          </div>

          {/* Répartition */}
          {groups.length > 0 && (
            <div className="border-t border-gray-800/50 px-3 pt-2.5 pb-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">{t.distribution}</p>

              <div className="space-y-1">
                {groups.map(group => {
                  const isGroupExpanded = expandedGroups.has(group.key)
                  const isMyGroup = myPred
                    ? myPred.predicted_home === group.ph && myPred.predicted_away === group.pa
                    : false

                  return (
                    <div key={group.key} className={`rounded-xl overflow-hidden border ${
                      isMyGroup ? 'border-green-900/40' : 'border-gray-800/50'
                    }`}>
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-gray-800/30"
                      >
                        {/* Score */}
                        <span className={`font-mono text-[11px] font-bold w-8 shrink-0 ${
                          group.resultType === 'exact' ? 'text-green-400'
                          : group.resultType === 'correct' ? 'text-blue-400'
                          : group.resultType === 'wrong' ? 'text-gray-500'
                          : 'text-white'
                        }`}>
                          {group.ph}–{group.pa}
                        </span>

                        {/* Barre de popularité */}
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <div className="h-1 rounded-full bg-gray-800 flex-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                group.resultType === 'exact' ? 'bg-green-600'
                                : group.resultType === 'correct' ? 'bg-blue-600'
                                : 'bg-gray-700'
                              }`}
                              style={{ width: `${Math.round((group.users.length / withPred.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {t.players(group.users.length)}
                          </span>
                        </div>

                        {/* Badge résultat */}
                        {group.resultType !== 'unknown' && (
                          <span className={`text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded-full ${
                            group.resultType === 'exact' ? 'bg-green-950 text-green-400'
                            : group.resultType === 'correct' ? 'bg-blue-950 text-blue-400'
                            : 'text-gray-600'
                          }`}>
                            {group.resultType === 'exact'
                              ? `⭐ ${group.pts !== null ? `+${group.pts}` : t.exact}`
                              : group.resultType === 'correct'
                              ? `✓ ${group.pts !== null ? `+${group.pts}` : t.correct}`
                              : t.wrong
                            }
                          </span>
                        )}

                        <span className={`text-[10px] text-gray-600 shrink-0 transition-transform duration-150 ml-0.5 ${isGroupExpanded ? 'rotate-180' : ''}`}>▾</span>
                      </button>

                      {/* Noms au drill-down */}
                      {isGroupExpanded && (
                        <div className="px-2.5 pt-1 pb-2 border-t border-gray-800/40 flex flex-wrap gap-x-2.5 gap-y-0.5">
                          {group.users.map(u => (
                            <span key={u.id} className={`text-[10px] ${
                              u.id === currentUserId
                                ? 'text-green-400 font-semibold'
                                : 'text-gray-500'
                            }`}>
                              {shortName(u)}{u.id === currentUserId ? ` (${t.you})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Sans prono */}
                {noBetCount > 0 && (
                  <div className="flex items-center px-2.5 py-1.5">
                    <span className="text-[10px] italic text-gray-600">{t.noBetCount(noBetCount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
