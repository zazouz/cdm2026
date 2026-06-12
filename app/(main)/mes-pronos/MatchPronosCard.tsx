'use client'

import { useState } from 'react'
import type { Match, Prediction } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { translateTeam } from '@/lib/i18n'
import { flagUrl } from '@/lib/flags'
import { resultSign } from '@/lib/scoring'

const GROUP_BORDER: Record<string, string> = {
  A: 'border-l-green-500',  B: 'border-l-cyan-400',
  C: 'border-l-orange-500', D: 'border-l-blue-500',
  E: 'border-l-yellow-400', F: 'border-l-lime-400',
  G: 'border-l-pink-500',   H: 'border-l-teal-500',
  I: 'border-l-red-500',    J: 'border-l-purple-500',
  K: 'border-l-orange-600', L: 'border-l-sky-400',
}

export type UserRow = { id: string; first_name: string | null; last_name: string | null; username: string }
export type PredEntry = { user: UserRow; pred: Prediction | null }
export type PronosView = 'players' | 'scores'

type Props = {
  match: Match
  entries: PredEntry[]
  currentUserId: string
  lang: Lang
  defaultOpen?: boolean
  view?: PronosView
}

const T = {
  fr: {
    live: 'EN COURS',
    you: 'toi',
    noBet: '—',
    pending: '…',
    pronos: (n: number, total: number) => `${n}/${total} prono${total > 1 ? 's' : ''}`,
    exacts: (n: number) => `${n} exact${n > 1 ? 's' : ''}`,
    corrects: (n: number) => `${n} correct${n > 1 ? 's' : ''}`,
    showMore: (n: number) => `voir les ${n} autres ▾`,
    showLess: 'voir moins ▴',
    noBetRow: (n: number) => `sans prono : ${n} joueur${n > 1 ? 's' : ''}`,
    inclYou: 'dont toi',
  },
  en: {
    live: 'LIVE',
    you: 'you',
    noBet: '—',
    pending: '…',
    pronos: (n: number, total: number) => `${n}/${total} bet${total > 1 ? 's' : ''}`,
    exacts: (n: number) => `${n} exact`,
    corrects: (n: number) => `${n} correct`,
    showMore: (n: number) => `show ${n} more ▾`,
    showLess: 'show less ▴',
    noBetRow: (n: number) => `no bet: ${n} player${n > 1 ? 's' : ''}`,
    inclYou: 'incl. you',
  },
}

function shortName(u: UserRow): string {
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name[0]}.`
  return u.username
}

function initials(u: UserRow): string {
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()
    || u.username?.[0]?.toUpperCase() || '?'
}

const VISIBLE = 5

export default function MatchPronosCard({ match, entries, currentUserId, lang, defaultOpen = false, view = 'players' }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)
  const [expandedScore, setExpandedScore] = useState<string | null>(null)
  const t = T[lang]

  const isFinished = match.status === 'finished'
  const isLive = !isFinished && new Date(match.match_date) <= new Date()

  const withPred = entries.filter(e => e.pred !== null)

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

  const borderClass = match.stage === 'group' && match.group_name
    ? (GROUP_BORDER[match.group_name] ?? '')
    : ''

  const visibleEntries = showAll ? entries : entries.slice(0, VISIBLE)
  const hiddenCount = Math.max(0, entries.length - VISIBLE)

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-4 border-gray-800 bg-gray-900 ${borderClass}`}>

      {/* ── Header (toujours visible, cliquable) ── */}
      <button onClick={() => setOpen(v => !v)} className="w-full text-left focus:outline-none" aria-expanded={open}>

        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          {/* Home */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {match.home_flag
              ? <img src={flagUrl(match.home_flag)} alt={match.home_team} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 rounded-sm object-cover shrink-0" />
              : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
            <span className="text-[11px] font-semibold text-white truncate">{translateTeam(match.home_team, lang)}</span>
          </div>

          {/* Score / statut */}
          <div className="shrink-0 min-w-[56px] text-center">
            {isFinished && match.home_score !== null ? (
              <span className="font-mono text-sm font-extrabold text-white">{match.home_score}–{match.away_score}</span>
            ) : isLive ? (
              <span className="text-[10px] font-bold text-red-400">{t.live}</span>
            ) : (
              <span className="text-[10px] font-semibold text-yellow-600">Bientôt</span>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-[11px] font-semibold text-white truncate text-right">{translateTeam(match.away_team, lang)}</span>
            {match.away_flag
              ? <img src={flagUrl(match.away_flag)} alt={match.away_team} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 rounded-sm object-cover shrink-0" />
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

      {/* ── Vue groupée par score prédit ── */}
      {open && view === 'scores' && (
        <div className="border-t border-gray-800 px-3 pt-2 pb-2.5 space-y-0.5">
          {(() => {
            const groupMap = new Map<string, { home: number; away: number; members: PredEntry[] }>()
            for (const e of withPred) {
              const key = `${e.pred!.predicted_home}-${e.pred!.predicted_away}`
              if (!groupMap.has(key)) groupMap.set(key, { home: e.pred!.predicted_home, away: e.pred!.predicted_away, members: [] })
              groupMap.get(key)!.members.push(e)
            }
            const rank = (g: { home: number; away: number }) => {
              if (!isFinished || match.home_score === null) return 0
              if (g.home === match.home_score && g.away === match.away_score) return 2
              return resultSign(g.home, g.away) === resultSign(match.home_score, match.away_score!) ? 1 : 0
            }
            const groups = [...groupMap.entries()].sort(([, a], [, b]) => {
              const r = rank(b) - rank(a)
              if (r !== 0) return r
              if (a.members.length !== b.members.length) return b.members.length - a.members.length
              return (a.home - b.home) || (a.away - b.away)
            })
            const noPred = entries.filter(e => e.pred === null)
            const noPredHasMe = noPred.some(e => e.user.id === currentUserId)

            return (
              <>
                {groups.map(([key, g]) => {
                  const r = rank(g)
                  const isExact = r === 2
                  const isCorrect = r === 1
                  const pts = g.members[0].pred!.points_earned
                  const meIn = g.members.some(m => m.user.id === currentUserId)
                  const expanded = expandedScore === key

                  return (
                    <div key={key}>
                      <button
                        onClick={() => setExpandedScore(s => (s === key ? null : key))}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left ${meIn ? 'bg-green-950/20' : ''}`}
                      >
                        <span className="w-4 shrink-0 text-center text-[10px] font-bold">
                          {isExact ? '⭐' : isCorrect ? <span className="text-blue-400">✓</span> : null}
                        </span>
                        <span className={`shrink-0 font-mono text-[12px] font-extrabold ${
                          isExact ? 'text-green-400' : isCorrect ? 'text-blue-400' : isFinished ? 'text-gray-500' : 'text-white'
                        }`}>
                          {g.home}–{g.away}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                          {g.members.map(m => {
                            const isMe = m.user.id === currentUserId
                            return (
                              <span
                                key={m.user.id}
                                className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-extrabold leading-none ${
                                  isMe ? 'bg-green-950 text-green-400 ring-1 ring-green-900' : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {initials(m.user)}
                              </span>
                            )
                          })}
                        </span>
                        <span className={`w-14 shrink-0 text-right text-[10px] font-bold ${
                          isExact ? 'text-green-400' : isCorrect ? 'text-blue-400' : 'text-gray-600'
                        }`}>
                          {isFinished && pts !== null
                            ? (Number(pts) > 0 ? `+${Number(pts).toFixed(2)}` : '0 pt')
                            : t.pending}
                        </span>
                      </button>
                      {expanded && (
                        <p className="px-2 pb-1.5 pl-8 text-[10px] leading-relaxed text-gray-500">
                          {g.members
                            .map(m => shortName(m.user) + (m.user.id === currentUserId ? ` (${t.you})` : ''))
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  )
                })}
                {noPred.length > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="w-4 shrink-0" />
                    <span className="text-[10px] italic text-gray-600">
                      {t.noBetRow(noPred.length)}{noPredHasMe ? ` (${t.inclYou})` : ''}
                    </span>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Liste des participants ── */}
      {open && view === 'players' && (
        <div className="border-t border-gray-800 px-3 pt-2 pb-2.5 space-y-0.5">
          {visibleEntries.map(({ user: u, pred: p }) => {
            const isMe = u.id === currentUserId
            const isExact = p !== null && isFinished && match.home_score !== null &&
              p.predicted_home === match.home_score && p.predicted_away === match.away_score
            const isCorrect = p !== null && !isExact && isFinished && match.home_score !== null &&
              resultSign(p.predicted_home, p.predicted_away) === resultSign(match.home_score!, match.away_score!)

            return (
              <div
                key={u.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${isMe ? 'bg-green-950/20' : ''}`}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold leading-none ${
                  isMe ? 'bg-green-950 text-green-400 ring-1 ring-green-900' : 'bg-gray-800 text-gray-400'
                }`}>
                  {initials(u)}
                </div>

                <span className={`flex-1 min-w-0 truncate text-[11px] ${isMe ? 'text-green-400 font-semibold' : 'text-gray-300 font-medium'}`}>
                  {shortName(u)}
                  {isMe && <span className="ml-1 text-[9px] text-green-700">({t.you})</span>}
                </span>

                {p ? (
                  <>
                    <span className={`shrink-0 font-mono text-[11px] font-bold ${
                      isExact ? 'text-green-400' : isCorrect ? 'text-blue-400' : isFinished ? 'text-gray-500' : 'text-white'
                    }`}>
                      {p.predicted_home}–{p.predicted_away}
                    </span>
                    <span className={`shrink-0 text-[10px] font-bold w-14 text-right ${
                      isExact ? 'text-green-400' : isCorrect ? 'text-blue-400' : 'text-gray-600'
                    }`}>
                      {isFinished && p.points_earned !== null
                        ? (p.points_earned > 0
                            ? `${isExact ? '⭐ ' : ''}+${Number(p.points_earned).toFixed(2)}`
                            : '0 pt')
                        : t.pending
                      }
                    </span>
                  </>
                ) : (
                  <span className="shrink-0 text-[10px] italic text-gray-600 ml-auto">{t.noBet}</span>
                )}
              </div>
            )
          })}

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full pt-1 text-center text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showAll ? t.showLess : t.showMore(hiddenCount)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
