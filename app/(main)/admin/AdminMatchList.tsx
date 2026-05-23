'use client'

import { useState } from 'react'
import type { Match } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/types'

export function SyncButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSync() {
    setState('loading')
    setMsg('')
    try {
      const res = await fetch('/api/admin/sync-matches', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setState('ok')
        setMsg(`Créés: ${data.created} · Mis à jour: ${data.updated} · Points: ${data.pointsCalculated}`)
      } else {
        setState('error')
        setMsg(data.error ?? 'Erreur inconnue')
      }
    } catch {
      setState('error')
      setMsg('Erreur réseau')
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
      >
        {state === 'loading' ? 'Sync en cours...' : 'Sync football-data.org'}
      </button>
      {msg && <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
    </div>
  )
}

export function FetchAllOddsButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [apiEvents, setApiEvents] = useState<string[] | null>(null)

  async function handleFetch() {
    setState('loading')
    setMsg('')
    setApiEvents(null)
    try {
      const res = await fetch('/api/admin/fetch-odds', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setState('ok')
        setMsg(`${data.updated ?? 0} matchs mis à jour`)
        if (data.availableInApi) setApiEvents(data.availableInApi)
      } else {
        setState('error')
        setMsg(data.error ?? 'Erreur inconnue')
      }
    } catch {
      setState('error')
      setMsg('Erreur réseau')
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleFetch}
        disabled={state === 'loading'}
        className="bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
      >
        {state === 'loading' ? 'Chargement...' : 'Fetcher les cotes (tous les matchs)'}
      </button>
      {msg && <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      {apiEvents && (
        <div className="rounded-lg border border-gray-700 bg-gray-950 p-3">
          <p className="text-xs font-semibold text-gray-400 mb-1">Matchs disponibles dans The Odds API ({apiEvents.length}) :</p>
          <p className="text-xs text-gray-500 font-mono break-all">{apiEvents.join(' · ')}</p>
        </div>
      )}
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

export default function AdminMatchList({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <p className="text-gray-500 text-sm">Aucun match. Utilise le bouton ci-dessus pour importer le calendrier.</p>
    )
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Matchs ({matches.length})
      </h2>
      {matches.map(match => (
        <AdminMatchRow key={match.id} match={match} />
      ))}
    </div>
  )
}

function AdminMatchRow({ match }: { match: Match }) {
  const [finished, setFinished] = useState(match.status === 'finished')
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')
  const [fetchingOdds, setFetchingOdds] = useState(false)

  async function handleSetScore() {
    const h = parseInt(homeScore)
    const a = parseInt(awayScore)
    if (isNaN(h) || isNaN(a)) { setMsg('Scores invalides'); return }
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/set-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, homeScore: h, awayScore: a }),
    })
    const data = await res.json()
    if (res.ok) {
      setFinished(true)
      setMsg('Points calculés')
    } else {
      setMsg(data.error ?? 'Erreur')
    }
    setSaving(false)
  }

  async function handleReset() {
    setResetting(true)
    setMsg('')
    const res = await fetch('/api/admin/reset-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setFinished(false)
      setHomeScore('')
      setAwayScore('')
      setMsg('Résultat annulé')
    } else {
      setMsg(data.error ?? 'Erreur')
    }
    setResetting(false)
  }

  async function handleFetchOdds() {
    setFetchingOdds(true)
    setMsg('')
    const res = await fetch(`/api/admin/fetch-odds?matchId=${match.id}`, { method: 'GET' })
    const data = await res.json()
    setMsg(res.ok ? `Côtes: ${data.home_odds} / ${data.draw_odds} / ${data.away_odds}` : data.error ?? 'Erreur')
    setFetchingOdds(false)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">
            {match.home_team} vs {match.away_team}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(match.match_date)} · {STAGE_LABELS[match.stage] ?? match.stage}
            {match.group_name && ` · Groupe ${match.group_name}`}
          </div>
        </div>

        {/* Odds status */}
        <div className="text-xs">
          {match.home_odds ? (
            <span className="text-green-400">{match.home_odds} / {match.draw_odds} / {match.away_odds}</span>
          ) : (
            <button
              onClick={handleFetchOdds}
              disabled={fetchingOdds}
              className="text-amber-400 hover:text-amber-300 disabled:text-gray-600"
            >
              {fetchingOdds ? 'Chargement...' : 'Fetcher côtes'}
            </button>
          )}
        </div>

        {/* Score */}
        {finished ? (
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono font-bold">
              {homeScore !== '' ? homeScore : match.home_score} – {awayScore !== '' ? awayScore : match.away_score}
            </span>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="text-red-400 hover:text-red-300 disabled:text-gray-600 text-xs px-2 py-1 rounded border border-red-800 hover:border-red-600"
            >
              {resetting ? '...' : 'Annuler'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              className="w-10 bg-gray-800 rounded text-center text-white text-sm py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="0"
            />
            <span className="text-gray-600">–</span>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              className="w-10 bg-gray-800 rounded text-center text-white text-sm py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="0"
            />
            <button
              onClick={handleSetScore}
              disabled={saving || homeScore === '' || awayScore === ''}
              className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white text-xs px-2 py-1.5 rounded font-medium"
            >
              {saving ? '...' : 'Valider'}
            </button>
          </div>
        )}
      </div>
      {msg && <p className={`text-xs mt-2 ${msg.includes('Erreur') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
    </div>
  )
}
