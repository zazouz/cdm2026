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

const T = {
  fr: {
    result: 'résultat',
    yourBetLocked: 'Ton prono',
    noBet: 'pas de pronostic',
    yourBetLabel: 'Ton pronostic',
    lockWarning: (min: number) => `⏱ Verrouillage dans ${min} min — modifie ton prono maintenant !`,
    winHint: (team: string, pts: string) => `Victoire ${team} · score exact = max ${pts} pts`,
    drawHint: (pts: string) => `Match nul · score exact = max ${pts} pts`,
    error: 'Erreur',
  },
  en: {
    result: 'result',
    yourBetLocked: 'Your bet',
    noBet: 'no prediction',
    yourBetLabel: 'Your prediction',
    lockWarning: (min: number) => `⏱ Locking in ${min} min — update your prediction now!`,
    winHint: (team: string, pts: string) => `${team} win · exact score = max ${pts} pts`,
    drawHint: (pts: string) => `Draw · exact score = max ${pts} pts`,
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

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 ${isFinished ? 'opacity-70' : ''}`}>

      {/* Meta row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
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

      {/* Teams */}
      <div className="flex items-center px-4 py-3">
        <div className="flex flex-1 flex-col items-center gap-2">
          {match.home_flag
            ? <img src={`https://flagcdn.com/w40/${match.home_flag}.png`} alt={match.home_team} className="h-7 w-auto rounded-sm shadow object-cover" />
            : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
          <span className="text-center text-xs font-semibold leading-tight text-white">{homeTeam}</span>
        </div>
        <div className="flex w-16 flex-col items-center gap-0.5 text-gray-600">
          {isFinished && match.home_score !== null ? (
            <>
              <span className="text-xl font-extrabold text-white">{match.home_score}–{match.away_score}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">{t.result}</span>
            </>
          ) : (
            <span className="text-xs font-bold tracking-widest">VS</span>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center gap-2">
          {match.away_flag
            ? <img src={`https://flagcdn.com/w40/${match.away_flag}.png`} alt={awayTeam} className="h-7 w-auto rounded-sm shadow object-cover" />
            : <div className="h-7 w-10 rounded-sm bg-gray-800" />}
          <span className="text-center text-xs font-semibold leading-tight text-white">{awayTeam}</span>
        </div>
      </div>

      {/* Odds */}
      {match.home_odds && (
        <div className="flex gap-1.5 px-4 pb-3">
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
      )}

      {/* Prediction area */}
      <div className="border-t border-gray-800 bg-gray-900/80 px-4 py-3">
        {isLocked ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t.yourBetLocked}</span>
            {prediction ? (
              <div className="text-right">
                <span className="font-mono text-base font-bold text-white">
                  {prediction.predicted_home} – {prediction.predicted_away}
                </span>
                {isFinished && prediction.points_earned !== null && (
                  <div className={`text-xs font-bold ${prediction.points_earned > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {prediction.points_earned > 0 ? `+${Number(prediction.points_earned).toFixed(2)} pts` : '0 pt'}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs italic text-gray-500">{t.noBet}</span>
            )}
          </div>
        ) : (
          <>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">{t.yourBetLabel}</p>
            <div className="flex items-center justify-center gap-3">
              {/* Home stepper */}
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <button
                  onClick={() => step('home', -1)}
                  aria-label={`${homeTeam} −1`}
                  className="flex h-11 w-10 items-center justify-center text-xl font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600"
                >
                  −
                </button>
                <span className="w-10 text-center text-xl font-extrabold text-white" aria-label={`${homeTeam} : ${home}`}>{home}</span>
                <button
                  onClick={() => step('home', 1)}
                  aria-label={`${homeTeam} +1`}
                  className="flex h-11 w-10 items-center justify-center text-xl font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600"
                >
                  +
                </button>
              </div>

              <span className="text-lg font-bold text-gray-600" aria-hidden="true">–</span>

              {/* Away stepper */}
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <button
                  onClick={() => step('away', -1)}
                  aria-label={`${awayTeam} −1`}
                  className="flex h-11 w-10 items-center justify-center text-xl font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600"
                >
                  −
                </button>
                <span className="w-10 text-center text-xl font-extrabold text-white" aria-label={`${awayTeam} : ${away}`}>{away}</span>
                <button
                  onClick={() => step('away', 1)}
                  aria-label={`${awayTeam} +1`}
                  className="flex h-11 w-10 items-center justify-center text-xl font-light text-gray-500 transition-colors hover:bg-gray-700 hover:text-white active:bg-gray-600"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                aria-label={saved ? t.yourBetLocked : t.yourBetLabel}
                className={`h-11 rounded-xl px-5 text-sm font-bold transition-all ${
                  saved
                    ? 'bg-green-900 text-green-400'
                    : 'bg-green-600 text-black hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500'
                }`}
              >
                {saved ? '✓' : saving ? '…' : 'OK'}
              </button>
            </div>

            {/* Hint */}
            {maxPts && (
              <p className="mt-2 text-center text-[10px] text-gray-500">
                {predictedWinner ? t.winHint(predictedWinner, maxPts) : t.drawHint(maxPts)}
              </p>
            )}
            {error && <p className="mt-1 text-center text-xs text-red-400">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
