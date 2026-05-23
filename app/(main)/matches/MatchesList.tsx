'use client'

import { useState } from 'react'
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

export default function MatchesList({ matches, predictionByMatch, userId }: Props) {
  const [view, setView] = useState<'chrono' | 'group'>('chrono')
  const { lang } = useLanguage()

  if (matches.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-4">⏳</p>
        <p>Tous les pronostics sont verrouillés.</p>
        <p className="text-sm mt-2 text-gray-600">Retrouve tes pronos dans &ldquo;Mes Pronos&rdquo;.</p>
      </div>
    )
  }

  const sorted = [...matches].sort((a, b) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )

  return (
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

      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-xs text-gray-500 space-y-1">
        <p>
          {lang === 'fr'
            ? 'Score exact → 3 × la côte · Bon résultat → 1 × la côte · Mauvais résultat → 0 pt'
            : 'Exact score → 3 × the odds · Correct result → 1 × the odds · Wrong result → 0 pt'}
        </p>
        <p>
          {lang === 'fr'
            ? 'Les pronos se verrouillent 15 min avant le coup d\'envoi.'
            : 'Predictions lock 15 minutes before kick-off.'}
        </p>
        <p className="text-gray-700">
          {lang === 'fr' ? 'Côtes : Winamax FR via The Odds API' : 'Odds: Winamax FR via The Odds API'}
        </p>
      </div>

      {view === 'chrono' ? (
        <ChronoView matches={sorted} predictionByMatch={predictionByMatch} userId={userId} lang={lang} />
      ) : (
        <GroupView matches={sorted} predictionByMatch={predictionByMatch} userId={userId} lang={lang} />
      )}
    </div>
  )
}

function ChronoView({ matches, predictionByMatch, userId, lang }: Props & { lang: string }) {
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
                userId={userId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function GroupView({ matches, predictionByMatch, userId, lang }: Props & { lang: string }) {
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
                  userId={userId}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
