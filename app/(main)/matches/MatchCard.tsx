'use client'

import type { Match, PredictionWithMatch } from '@/lib/types'
import { formatOdds } from '@/lib/scoring'
import { useLanguage } from '../LanguageProvider'
import { translateTeam, stageLabel } from '@/lib/i18n'

type Props = {
  match: Match
  prediction: PredictionWithMatch | null
  home: number
  away: number
  onScoreChange: (home: number, away: number) => void
}

const GROUP_BORDER: Record<string, string> = {
  A: 'border-l-green-500',
  B: 'border-l-cyan-400',
  C: 'border-l-orange-500',
  D: 'border-l-blue-500',
  E: 'border-l-yellow-400',
  F: 'border-l-lime-400',
  G: 'border-l-pink-500',
  H: 'border-l-teal-500',
  I: 'border-l-red-500',
  J: 'border-l-purple-500',
  K: 'border-l-orange-600',
  L: 'border-l-sky-400',
}

const GROUP_COLORS: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400',
  B: 'bg-cyan-400/20 text-cyan-300',
  C: 'bg-orange-500/20 text-orange-400',
  D: 'bg-blue-500/20 text-blue-400',
  E: 'bg-yellow-400/20 text-yellow-300',
  F: 'bg-lime-400/20 text-lime-300',
  G: 'bg-pink-500/20 text-pink-400',
  H: 'bg-teal-500/20 text-teal-400',
  I: 'bg-red-500/20 text-red-400',
  J: 'bg-purple-500/20 text-purple-400',
  K: 'bg-orange-600/20 text-orange-500',
  L: 'bg-sky-400/20 text-sky-300',
}

const T = {
  fr: { result: 'résultat', noBet: 'pas de prono', lockWarning: (min: number) => `⏱ Verrouillage dans ${min} min` },
  en: { result: 'result', noBet: 'no prediction', lockWarning: (min: number) => `⏱ Locking in ${min} min` },
}

function formatDate(dateStr: string, lang: string) {
  return new Date(dateStr).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function msUntilLock(dateStr: string) {
  return new Date(dateStr).getTime() - 15 * 60 * 1000 - Date.now()
}

export default function MatchCard({ match, prediction, home, away, onScoreChange }: Props) {
  const { lang } = useLanguage()
  const t = T[lang]
  const homeTeam = translateTeam(match.home_team, lang)
  const awayTeam = translateTeam(match.away_team, lang)
  const isLocked = new Date(match.match_date).getTime() - 15 * 60 * 1000 <= Date.now() || match.status === 'finished'
  const isFinished = match.status === 'finished'

  const lockMs = msUntilLock(match.match_date)
  const lockSoonMinutes = Math.ceil(lockMs / 60000)
  const lockSoon = !isLocked && lockMs > 0 && lockMs < 30 * 60 * 1000

  function step(which: 'home' | 'away', dir: 1 | -1) {
    const newHome = which === 'home' ? Math.max(0, Math.min(20, home + dir)) : home
    const newAway = which === 'away' ? Math.max(0, Math.min(20, away + dir)) : away
    onScoreChange(newHome, newAway)
  }

  const stageBadge = match.stage === 'group' && match.group_name
    ? `Gr. ${match.group_name}`
    : stageLabel(match.stage, lang)

  const groupColorClass = match.stage === 'group' && match.group_name
    ? (GROUP_COLORS[match.group_name] ?? 'bg-gray-800 text-gray-500')
    : 'bg-gray-800 text-gray-500'

  const groupBorderClass = match.stage === 'group' && match.group_name
    ? (GROUP_BORDER[match.group_name] ?? '')
    : ''

  const relevantOdds = home > away ? match.home_odds : away > home ? match.away_odds : match.draw_odds
  const maxPts = !isLocked && relevantOdds ? (3 * relevantOdds).toFixed(2) : null

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 border-l-4 ${groupBorderClass} ${isFinished ? 'opacity-70' : ''}`}>

      {/* Meta row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${groupColorClass}`}>
          {stageBadge}
        </span>
        <span className="text-[11px] text-gray-500">{formatDate(match.match_date, lang)}</span>
      </div>

      {/* Lock warning */}
      {lockSoon && (
        <p className="px-4 pb-1 text-center text-[11px] font-semibold text-red-400">
          {t.lockWarning(lockSoonMinutes)}
        </p>
      )}

      {/* Flags + center */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-3 pt-1 pb-1.5">
        <div className="flex justify-center">
          {match.home_flag
            ? <img src={`https://flagcdn.com/w40/${match.home_flag}.png`} alt={match.home_team} className="h-7 w-12 rounded-md object-cover shadow-md" />
            : <div className="h-7 w-12 rounded-md bg-gray-800" />}
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-1">
          {isLocked ? (
            <div className="flex items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-xl font-extrabold text-white">
                {isFinished && match.home_score !== null ? match.home_score : (prediction?.predicted_home ?? '–')}
              </span>
              <span className="text-sm font-bold text-gray-600">–</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-xl font-extrabold text-white">
                {isFinished && match.away_score !== null ? match.away_score : (prediction?.predicted_away ?? '–')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <button onClick={() => step('home', -1)} aria-label={`${homeTeam} −1`} className="flex h-11 w-8 items-center justify-center text-lg font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600">−</button>
                <span className="w-9 text-center text-xl font-extrabold text-white">{home}</span>
                <button onClick={() => step('home', 1)} aria-label={`${homeTeam} +1`} className="flex h-11 w-8 items-center justify-center text-lg font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600">+</button>
              </div>
              <span className="text-sm font-bold text-gray-600" aria-hidden>–</span>
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <button onClick={() => step('away', -1)} aria-label={`${awayTeam} −1`} className="flex h-11 w-8 items-center justify-center text-lg font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600">−</button>
                <span className="w-9 text-center text-xl font-extrabold text-white">{away}</span>
                <button onClick={() => step('away', 1)} aria-label={`${awayTeam} +1`} className="flex h-11 w-8 items-center justify-center text-lg font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600">+</button>
              </div>
            </div>
          )}
          {isFinished && (
            <span className="text-[10px] uppercase tracking-wide text-gray-500">{t.result}</span>
          )}
        </div>

        <div className="flex justify-center">
          {match.away_flag
            ? <img src={`https://flagcdn.com/w40/${match.away_flag}.png`} alt={match.away_team} className="h-7 w-12 rounded-md object-cover shadow-md" />
            : <div className="h-7 w-12 rounded-md bg-gray-800" />}
        </div>
      </div>

      {/* Noms — hors du grid pour avoir la pleine largeur */}
      <div className="flex px-3 pb-2.5 gap-2">
        <p className="flex-1 text-center text-xs font-semibold leading-tight text-white">{homeTeam}</p>
        <p className="flex-1 text-center text-xs font-semibold leading-tight text-white">{awayTeam}</p>
      </div>

      {/* Hint score exact */}
      {maxPts && (
        <p className="pb-2 -mt-1 text-center text-[9px] text-gray-600">
          {lang === 'fr' ? `Si score exact : ${maxPts} pts` : `Exact score: ${maxPts} pts`}
        </p>
      )}

      {/* Cotes */}
      {match.home_odds && (
        <div className="px-4 pb-3 space-y-1.5">
          <div className="flex gap-1.5">
            <div className="flex flex-1 flex-col items-center rounded-xl border border-gray-800 bg-gray-800/50 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">1</span>
              <span className="text-sm font-bold text-gray-300">{formatOdds(match.home_odds)}</span>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl border border-gray-800 bg-gray-800/50 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">N</span>
              <span className="text-sm font-bold text-gray-300">{formatOdds(match.draw_odds)}</span>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl border border-gray-800 bg-gray-800/50 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">2</span>
              <span className="text-sm font-bold text-gray-300">{formatOdds(match.away_odds)}</span>
            </div>
          </div>
          {match.odds_fetched_at && (
            <p className="text-center text-[9px] text-gray-700">
              Betclic.fr · {lang === 'fr' ? 'récupérées le' : 'fetched'}{' '}
              {new Date(match.odds_fetched_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
              })}
            </p>
          )}
        </div>
      )}

      {/* Prono verrouillé */}
      {isLocked && (
        <div className="border-t border-gray-800 px-4 py-2 flex items-center justify-end gap-2">
          {prediction ? (
            <>
              <span className="font-mono text-sm font-bold text-gray-400">
                {prediction.predicted_home} – {prediction.predicted_away}
              </span>
              {isFinished && prediction.points_earned !== null && (
                <span className={`text-xs font-bold ${prediction.points_earned > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                  {prediction.points_earned > 0 ? `+${Number(prediction.points_earned).toFixed(2)} pts` : '0 pt'}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs italic text-gray-600">{t.noBet}</span>
          )}
        </div>
      )}
    </div>
  )
}
