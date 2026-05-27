'use client'

import { useState } from 'react'
import type { Match, Prediction } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { flagUrl } from '@/lib/flags'

export type UserRow = { id: string; first_name: string | null; last_name: string | null; username: string }
export type PredEntry = { user: UserRow; pred: Prediction | null }

type Props = {
  match: Match
  entries: PredEntry[]
  currentUserId: string
  lang: Lang
  defaultOpen?: boolean
}

const T = {
  fr: {
    you: 'toi',
    live: 'EN COURS',
    noBet: '—',
    pending: '…',
    pronos: (n: number, total: number) => `${n}/${total} prono${total > 1 ? 's' : ''}`,
    exacts: (n: number) => `${n} exact${n > 1 ? 's' : ''}`,
    correct: (n: number) => `${n} correct${n > 1 ? 's' : ''}`,
  },
  en: {
    you: 'you',
    live: 'LIVE',
    noBet: '—',
    pending: '…',
    pronos: (n: number, total: number) => `${n}/${total} bet${total > 1 ? 's' : ''}`,
    exacts: (n: number) => `${n} exact`,
    correct: (n: number) => `${n} correct`,
  },
}

function resultSign(h: number, a: number) { return h > a ? 1 : h < a ? -1 : 0 }

function shortName(u: UserRow): string {
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name[0]}.`
  return u.username
}

function initials(u: UserRow): string {
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() || u.username?.[0]?.toUpperCase() || '?'
}

export default function MatchPronosCard({ match, entries, currentUserId, lang, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const t = T[lang]
  const isFinished = match.status === 'finished'

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

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

      {/* Collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left focus:outline-none"
        aria-expanded={open}
      >
        {/* Teams + score row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {match.home_flag
              ? <img src={flagUrl(match.home_flag)} alt={match.home_team} className="h-4 w-6 rounded-sm object-cover shrink-0" />
              : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
            <span className="text-[11px] font-semibold text-white truncate">{match.home_team}</span>
          </div>

          <div className="shrink-0 min-w-[52px] text-center">
            {isFinished && match.home_score !== null ? (
              <span className="font-mono text-sm font-extrabold text-white">{match.home_score}–{match.away_score}</span>
            ) : (
              <span className="text-[10px] font-bold text-red-400 animate-pulse">{t.live}</span>
            )}
          </div>

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
              ✓ {t.correct(correctCount)}
            </span>
          )}
          {!isFinished && withPred.length > 0 && (
            <span className="rounded-full bg-red-950/40 px-1.5 py-0.5 text-[9px] font-bold text-red-400">{t.live}</span>
          )}
        </div>
      </button>

      {/* Expanded predictions */}
      {open && (
        <div className="border-t border-gray-800">
          {entries.map(({ user: u, pred: p }) => {
            const isMe = u.id === currentUserId
            const isExact = p !== null && isFinished && match.home_score !== null &&
              p.predicted_home === match.home_score && p.predicted_away === match.away_score
            const isCorrect = p !== null && !isExact && isFinished &&
              match.home_score !== null && match.away_score !== null &&
              resultSign(p.predicted_home, p.predicted_away) === resultSign(match.home_score, match.away_score)
            const pts = p?.points_earned ?? 0

            return (
              <div
                key={u.id}
                className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/40 last:border-0 ${isMe ? 'bg-green-950/20' : ''}`}
              >
                {/* Initials badge */}
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold leading-none ${
                  isMe ? 'bg-green-950 text-green-400 ring-1 ring-green-900' : 'bg-gray-800 text-gray-400'
                }`}>
                  {initials(u)}
                </div>

                {/* Name */}
                <span className={`flex-1 min-w-0 truncate text-[11px] ${isMe ? 'text-green-400 font-semibold' : 'text-gray-300 font-medium'}`}>
                  {shortName(u)}
                  {isMe && <span className="ml-1 text-[9px] text-green-700">({t.you})</span>}
                </span>

                {/* Score */}
                {p ? (
                  <>
                    <span className={`shrink-0 font-mono text-[11px] font-bold ${
                      isExact ? 'text-green-400' : isCorrect ? 'text-blue-400' : 'text-white'
                    }`}>
                      {p.predicted_home}–{p.predicted_away}
                    </span>

                    {/* Points / status */}
                    <span className={`shrink-0 text-[10px] font-bold w-14 text-right ${
                      isExact ? 'text-green-400'
                      : isCorrect ? 'text-blue-400'
                      : isFinished ? 'text-gray-600'
                      : 'text-gray-600'
                    }`}>
                      {isFinished && p.points_earned !== null
                        ? (pts > 0 ? `${isExact ? '⭐ ' : ''}+${Number(pts).toFixed(2)}` : '0 pt')
                        : t.pending
                      }
                    </span>
                  </>
                ) : (
                  <span className="shrink-0 text-[10px] italic text-gray-600 ml-auto pr-0.5">{t.noBet}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
