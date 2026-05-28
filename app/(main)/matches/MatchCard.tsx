'use client'

import { useState, useEffect } from 'react'
import type { Match, PredictionWithMatch } from '@/lib/types'
import { formatOdds } from '@/lib/scoring'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../LanguageProvider'
import { translateTeam, stageLabel } from '@/lib/i18n'

type Props = {
  match: Match
  prediction: PredictionWithMatch | null
  userId: string
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
  fr: {
    result: 'résultat',
    noBet: 'pas de prono',
    lockWarning: (min: number) => `⏱ Verrouillage dans ${min} min`,
    maxHint: (pts: string) => `max ${pts} pts si score exact`,
    error: 'Erreur',
  },
  en: {
    result: 'result',
    noBet: 'no prediction',
    lockWarning: (min: number) => `⏱ Locking in ${min} min`,
    maxHint: (pts: string) => `max ${pts} pts for exact score`,
    error: 'Error',
  },
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

export default function MatchCard({ match, prediction, userId }: Props) {
  const router = useRouter()
  const { lang } = useLanguage()
  const t = T[lang]
  const homeTeam = translateTeam(match.home_team, lang)
  const awayTeam = translateTeam(match.away_team, lang)
  const isLocked = new Date(match.match_date).getTime() - 15 * 60 * 1000 <= Date.now() || match.status === 'finished'
  const isFinished = match.status === 'finished'

  const lockMs = msUntilLock(match.match_date)
  const lockSoonMinutes = Math.ceil(lockMs / 60000)
  const lockSoon = !isLocked && lockMs > 0 && lockMs < 30 * 60 * 1000

  const [home, setHome] = useState(prediction?.predicted_home ?? 0)
  const [away, setAway] = useState(prediction?.predicted_away ?? 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!prediction)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(t)
  }, [error])

  function step(which: 'home' | 'away', dir: 1 | -1) {
    if (which === 'home') setHome(v => Math.max(0, Math.min(20, v + dir)))
    else setAway(v => Math.max(0, Math.min(20, v + dir)))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, predictedHome: home, predictedAway: away }),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? t.error)
    }
    setSaving(false)
  }

  const predictedWinner = home > away ? homeTeam : away > home ? awayTeam : null
  const relevantOdds = home > away ? match.home_odds : away > home ? match.away_odds : match.draw_odds
  const maxPts = relevantOdds ? (3 * relevantOdds).toFixed(2) : null

  const stageBadge = match.stage === 'group' && match.group_name
    ? `${lang === 'fr' ? 'Gr.' : 'Gr.'} ${match.group_name}`
    : stageLabel(match.stage, lang)

  const groupColorClass = match.stage === 'group' && match.group_name
    ? (GROUP_COLORS[match.group_name] ?? 'bg-gray-800 text-gray-500')
    : 'bg-gray-800 text-gray-500'

  const groupBorderClass = match.stage === 'group' && match.group_name
    ? (GROUP_BORDER[match.group_name] ?? '')
    : ''

  const oddsFetchedLabel = match.odds_fetched_at
    ? new Date(match.odds_fetched_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
      })
    : null

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

      {/* Teams + center — grid [flag | steppers | flag] puis [nom | espace | nom] */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1.5 px-3 pt-2 pb-3">

        {/* Flags row */}
        <div className="flex justify-center">
          {match.home_flag
            ? <img src={`https://flagcdn.com/w40/${match.home_flag}.png`} alt={match.home_team} className="h-10 w-10 rounded-full object-cover shadow-md" />
            : <div className="h-10 w-10 rounded-full bg-gray-800" />}
        </div>

        {/* Center: steppers or score */}
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
                <span className="w-9 text-center text-xl font-extrabold text-white" aria-label={`${homeTeam} : ${home}`}>{home}</span>
                <button onClick={() => step('home', 1)} aria-label={`${homeTeam} +1`} className="flex h-11 w-8 items-center justify-center text-lg font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600">+</button>
              </div>
              <span className="text-sm font-bold text-gray-600" aria-hidden="true">–</span>
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <button onClick={() => step('away', -1)} aria-label={`${awayTeam} −1`} className="flex h-11 w-8 items-center justify-center text-lg font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600">−</button>
                <span className="w-9 text-center text-xl font-extrabold text-white" aria-label={`${awayTeam} : ${away}`}>{away}</span>
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
            ? <img src={`https://flagcdn.com/w40/${match.away_flag}.png`} alt={match.away_team} className="h-10 w-10 rounded-full object-cover shadow-md" />
            : <div className="h-10 w-10 rounded-full bg-gray-800" />}
        </div>

        {/* Names row — aligned sous les drapeaux grâce au grid */}
        <p className="text-center text-xs font-semibold leading-tight text-white">{homeTeam}</p>
        <div aria-hidden="true" />
        <p className="text-center text-xs font-semibold leading-tight text-white">{awayTeam}</p>
      </div>

      {/* Odds row */}
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
          {oddsFetchedLabel && (
            <p className="text-center text-[9px] text-gray-700">
              Betclic.fr · {lang === 'fr' ? 'récupérées le' : 'fetched'} {oddsFetchedLabel}
            </p>
          )}
        </div>
      )}

      {/* Bottom: save button or locked summary */}
      <div className="border-t border-gray-800 px-4 py-2">
        {isLocked ? (
          <div className="flex items-center justify-end gap-2">
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
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-gray-600 leading-tight">
              {error
                ? <span className="text-red-400">{error}</span>
                : maxPts ? t.maxHint(maxPts) : null}
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`h-9 shrink-0 rounded-xl px-6 text-sm font-bold transition-all ${
                saved
                  ? 'bg-green-900 text-green-400'
                  : 'bg-green-600 text-black hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500'
              }`}
            >
              {saved ? '✓' : saving ? '…' : 'OK'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
