'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Match, PredictionWithMatch } from '@/lib/types'
import { useLanguage } from '../LanguageProvider'
import { stageLabel } from '@/lib/i18n'
import MatchCard from './MatchCard'

type Props = {
  matches: Match[]
  predictionByMatch: Record<number, PredictionWithMatch>
  userId: string
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

function formatDayHeader(dateStr: string, lang: string) {
  return new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'Europe/Paris',
  })
}

function isMatchLocked(match: Match) {
  return new Date(match.match_date).getTime() - 15 * 60 * 1000 <= Date.now() || match.status === 'finished'
}

export default function MatchesList({ matches, predictionByMatch, userId }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'chrono' | 'group'>('chrono')
  const { lang } = useLanguage()

  const [scores, setScores] = useState<Record<number, { home: number | null; away: number | null }>>(() => {
    const init: Record<number, { home: number | null; away: number | null }> = {}
    for (const m of matches) {
      const pred = predictionByMatch[m.id]
      init[m.id] = pred
        ? { home: pred.predicted_home, away: pred.predicted_away }
        : { home: null, away: null }
    }
    return init
  })

  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')

  const handleScoreChange = useCallback((matchId: number, home: number, away: number) => {
    setScores(prev => ({ ...prev, [matchId]: { home, away } }))
  }, [])

  const unlockedMatches = matches.filter(m => !isMatchLocked(m))

  const dirtyCount = unlockedMatches.filter(m => {
    const score = scores[m.id]
    if (!score || score.home === null || score.away === null) return false
    const saved = predictionByMatch[m.id]
    if (!saved) return true
    return score.home !== saved.predicted_home || score.away !== saved.predicted_away
  }).length

  async function saveAll() {
    setSaving(true)
    setSaveError('')
    let count = 0
    try {
      const dirty = unlockedMatches.filter(m => {
        const score = scores[m.id]
        if (!score || score.home === null || score.away === null) return false
        const saved = predictionByMatch[m.id]
        if (!saved) return true
        return score.home !== saved.predicted_home || score.away !== saved.predicted_away
      })
      await Promise.all(
        dirty.map(async m => {
          const score = scores[m.id]
          if (!score) return
          const res = await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId: m.id, predictedHome: score.home, predictedAway: score.away }),
          })
          if (res.ok) count++
        })
      )
      setLastSaved(count)
      router.refresh()
    } catch {
      setSaveError(lang === 'fr' ? 'Erreur réseau' : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-4">⏳</p>
        <p>{lang === 'fr' ? 'Tous les pronostics sont verrouillés.' : 'All predictions are locked.'}</p>
        <p className="text-sm mt-2 text-gray-500">
          {lang === 'fr' ? 'Retrouve tes pronos dans « Résultats ».' : 'Check your bets in "Results".'}
        </p>
      </div>
    )
  }

  const sorted = [...matches].sort((a, b) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )

  const isKnockoutPhase = matches.some(m => !['group', 'r32'].includes(m.stage))
  const [knockoutBannerDismissed, setKnockoutBannerDismissed] = useState(true)
  useEffect(() => {
    setKnockoutBannerDismissed(localStorage.getItem('knockout_banner_dismissed') === '1')
  }, [])
  function dismissKnockoutBanner() {
    localStorage.setItem('knockout_banner_dismissed', '1')
    setKnockoutBannerDismissed(true)
  }

  const saveButton = null

  const showFloating = unlockedMatches.length > 0 && (dirtyCount > 0 || saving || lastSaved !== null)

  const floatingBtn = showFloating && (
    <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-none">
      <button
        onClick={saveAll}
        disabled={saving || dirtyCount === 0}
        className={`pointer-events-auto w-full rounded-2xl py-3.5 text-sm font-bold shadow-lg shadow-black/40 transition-all ${
          saving
            ? 'bg-gray-700 text-gray-400'
            : dirtyCount === 0
            ? 'bg-green-900 text-green-400'
            : 'bg-green-600 text-black hover:bg-green-500 active:bg-green-700'
        }`}
      >
        {saving
          ? (lang === 'fr' ? 'Sauvegarde...' : 'Saving...')
          : dirtyCount > 0
          ? (lang === 'fr'
              ? dirtyCount === 1 ? 'Valider mon pronostic' : `Valider mes ${dirtyCount} pronostics`
              : dirtyCount === 1 ? 'Save my prediction' : `Save my ${dirtyCount} predictions`)
          : (lang === 'fr'
              ? `✓ ${lastSaved} pronostic${(lastSaved ?? 0) > 1 ? 's' : ''} enregistré${(lastSaved ?? 0) > 1 ? 's' : ''}`
              : `✓ ${lastSaved} prediction${(lastSaved ?? 0) > 1 ? 's' : ''} saved`)}
      </button>
    </div>
  )

  return (
    <>
    {floatingBtn}
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          {lang === 'fr' ? 'Matchs & Pronostics' : 'Matches & Predictions'}
        </h1>
        <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
          <button
            onClick={() => setView('chrono')}
            className={`px-3 py-1.5 transition-colors ${view === 'chrono' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
          >
            {lang === 'fr' ? 'Par date' : 'By date'}
          </button>
          <button
            onClick={() => setView('group')}
            className={`px-3 py-1.5 transition-colors ${view === 'group' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
          >
            {lang === 'fr' ? 'Par groupe' : 'By group'}
          </button>
        </div>
      </div>

      {isKnockoutPhase && !knockoutBannerDismissed && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200/80">
          <div className="flex items-start justify-between gap-3">
            <p>
              <span className="font-semibold text-amber-200">
                {lang === 'fr' ? 'Phase à élimination directe' : 'Knockout stage'}
              </span>
              {lang === 'fr'
                ? ' — on pronostique le score à la fin du temps réglementaire (90 min). Un match nul est possible. Le temps additionnel et les tirs au but ne comptent pas.'
                : ' — predict the score at the end of regular time (90 min). A draw is possible. Extra time and penalties don\'t count.'}
            </p>
            <button
              onClick={dismissKnockoutBanner}
              className="shrink-0 text-amber-500 hover:text-amber-300 transition-colors leading-none mt-0.5"
              aria-label={lang === 'fr' ? 'Fermer' : 'Dismiss'}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {view === 'chrono' ? (
        <ChronoView
          matches={sorted}
          predictionByMatch={predictionByMatch}
          scores={scores}
          onScoreChange={handleScoreChange}
          userId={userId}
          lang={lang}
          saveButton={saveButton}
        />
      ) : (
        <GroupView
          matches={sorted}
          predictionByMatch={predictionByMatch}
          scores={scores}
          onScoreChange={handleScoreChange}
          userId={userId}
          lang={lang}
          saveButton={saveButton}
        />
      )}
    </div>
    </>
  )
}

type ViewProps = Props & {
  lang: string
  scores: Record<number, { home: number | null; away: number | null }>
  onScoreChange: (matchId: number, home: number, away: number) => void
  saveButton: React.ReactNode
}

function ChronoView({ matches, predictionByMatch, scores, onScoreChange, userId, lang, saveButton }: ViewProps) {
  const byDay: Record<string, Match[]> = {}
  for (const m of matches) {
    const day = new Date(m.match_date).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(m)
  }

  return (
    <div className="space-y-8">
      {Object.entries(byDay).map(([day, dayMatches]) => (
        <section key={day}>
          <h2 className="text-sm font-semibold text-gray-400 capitalize mb-3">
            {formatDayHeader(day, lang)}
          </h2>
          <div className="space-y-2">
            {dayMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionByMatch[match.id] ?? null}
                home={scores[match.id]?.home ?? null}
                away={scores[match.id]?.away ?? null}
                onScoreChange={(h, a) => onScoreChange(match.id, h, a)}
              />
            ))}
          </div>
        </section>
      ))}
      {saveButton}
    </div>
  )
}

function GroupView({ matches, predictionByMatch, scores, onScoreChange, userId, lang, saveButton }: ViewProps) {
  const grouped: Record<string, Match[]> = {}
  for (const m of matches) {
    const key = `${m.stage}__${m.group_name ?? ''}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  }

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const [stageA, groupA] = a.split('__')
    const [stageB, groupB] = b.split('__')
    const si = STAGE_ORDER.indexOf(stageA) - STAGE_ORDER.indexOf(stageB)
    if (si !== 0) return si
    return groupA.localeCompare(groupB)
  })

  return (
    <div className="space-y-8">
      {sortedGroups.map(([key, groupMatches]) => {
        const [stage, groupName] = key.split('__')
        const label = stage === 'group' && groupName
          ? `${lang === 'fr' ? 'Groupe' : 'Group'} ${groupName}`
          : stageLabel(stage, lang as 'fr' | 'en')

        return (
          <section key={key}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {label}
            </h2>
            <div className="space-y-2">
              {groupMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictionByMatch[match.id] ?? null}
                  home={scores[match.id]?.home ?? null}
                  away={scores[match.id]?.away ?? null}
                  onScoreChange={(h, a) => onScoreChange(match.id, h, a)}
                />
              ))}
            </div>
          </section>
        )
      })}
      {saveButton}
    </div>
  )
}
