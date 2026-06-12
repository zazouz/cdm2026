'use client'

import { useEffect, useState } from 'react'
import type { Match } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import MatchPronosCard, { type PredEntry, type PronosView } from './MatchPronosCard'

export type PronoItem = { match: Match; entries: PredEntry[] }

const STORAGE_KEY = 'prono_pronos_view'

const T = {
  fr: {
    title: 'Les Pronos',
    subtitle: 'Les pronostics de chacun, par match.',
    empty: 'Aucun match verrouillé pour l\'instant.',
    emptyHint: 'Les pronos apparaissent ici 15 min avant le coup d\'envoi.',
    byPlayer: 'Par joueur',
    byScore: 'Par score',
  },
  en: {
    title: 'Bets',
    subtitle: "Everyone's predictions, match by match.",
    empty: 'No locked matches yet.',
    emptyHint: 'Predictions appear here 15 min before kickoff.',
    byPlayer: 'By player',
    byScore: 'By score',
  },
}

type Props = {
  items: PronoItem[]
  currentUserId: string
  lang: Lang
}

export default function PronosList({ items, currentUserId, lang }: Props) {
  const [view, setView] = useState<PronosView>('players')
  const t = T[lang]

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'scores' || saved === 'players') setView(saved)
  }, [])

  function changeView(v: PronosView) {
    setView(v)
    try { localStorage.setItem(STORAGE_KEY, v) } catch { /* stockage indisponible : le toggle reste fonctionnel pour la session */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>
        {items.length > 0 && (
          <div className="mt-1 flex shrink-0 overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
            <button
              onClick={() => changeView('players')}
              className={`px-3 py-1.5 transition-colors ${view === 'players' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
            >
              {t.byPlayer}
            </button>
            <button
              onClick={() => changeView('scores')}
              className={`px-3 py-1.5 transition-colors ${view === 'scores' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
            >
              {t.byScore}
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-4xl mb-4">⏳</p>
          <p className="text-base font-semibold text-gray-300">{t.empty}</p>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, index) => (
            <MatchPronosCard
              key={it.match.id}
              match={it.match}
              entries={it.entries}
              currentUserId={currentUserId}
              lang={lang}
              defaultOpen={index === 0}
              view={view}
            />
          ))}
        </div>
      )}
    </div>
  )
}
