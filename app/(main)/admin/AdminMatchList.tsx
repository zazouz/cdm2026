'use client'

import { useState, useEffect } from 'react'
import type { Match } from '@/lib/types'
import { useLanguage } from '../LanguageProvider'
import { stageLabel } from '@/lib/i18n'

const T = {
  fr: {
    syncLabel: 'Sync football-data.org',
    syncLoading: 'Sync en cours...',
    syncOk: (c: number, u: number, p: number) => `Créés: ${c} · Mis à jour: ${u} · Points: ${p}`,
    fetchOddsLabel: 'Fetcher les cotes (tous les matchs)',
    fetchOddsLoading: 'Chargement...',
    fetchOddsOk: (n: number) => `${n} match${n > 1 ? 's' : ''} mis à jour`,
    availableInApi: (n: number) => `Matchs disponibles dans The Odds API (${n}) :`,
    noMatches: 'Aucun match. Utilise le bouton ci-dessus pour importer le calendrier.',
    matchesTitle: (n: number) => `Matchs (${n})`,
    invalidScores: 'Scores invalides',
    pointsCalc: 'Points calculés',
    scoreReset: 'Résultat annulé',
    oddsResult: (h: number, d: number, a: number) => `Cotes: ${h} / ${d} / ${a}`,
    fetchOddsInline: 'Fetcher cotes',
    fetchOddsInlineLoading: 'Chargement...',
    cancel: 'Annuler',
    save: 'Valider',
    confirm: 'Confirmer',
    confirmQuestion: '→ OK ?',
    confirmReset: 'Annuler le score ?',
    no: 'Non',
    yes: 'Oui',
    errUnknown: 'Erreur inconnue',
    errNetwork: 'Erreur réseau',
    group: (n: string) => `Groupe ${n}`,
  },
  en: {
    syncLabel: 'Sync football-data.org',
    syncLoading: 'Syncing...',
    syncOk: (c: number, u: number, p: number) => `Created: ${c} · Updated: ${u} · Points: ${p}`,
    fetchOddsLabel: 'Fetch all odds',
    fetchOddsLoading: 'Loading...',
    fetchOddsOk: (n: number) => `${n} match${n > 1 ? 'es' : ''} updated`,
    availableInApi: (n: number) => `Available in The Odds API (${n}):`,
    noMatches: 'No matches. Use the button above to import the calendar.',
    matchesTitle: (n: number) => `Matches (${n})`,
    invalidScores: 'Invalid scores',
    pointsCalc: 'Points calculated',
    scoreReset: 'Score reset',
    oddsResult: (h: number, d: number, a: number) => `Odds: ${h} / ${d} / ${a}`,
    fetchOddsInline: 'Fetch odds',
    fetchOddsInlineLoading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    confirmQuestion: '→ OK?',
    confirmReset: 'Reset score?',
    no: 'No',
    yes: 'Yes',
    errUnknown: 'Unknown error',
    errNetwork: 'Network error',
    group: (n: string) => `Group ${n}`,
  },
}

export function SyncButton() {
  const { lang } = useLanguage()
  const t = T[lang]
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
        setMsg(t.syncOk(data.created, data.updated, data.pointsCalculated))
      } else {
        setState('error')
        setMsg(data.error ?? t.errUnknown)
      }
    } catch {
      setState('error')
      setMsg(t.errNetwork)
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
      >
        {state === 'loading' ? t.syncLoading : t.syncLabel}
      </button>
      {msg && <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
    </div>
  )
}

export function FetchAllOddsButton() {
  const { lang } = useLanguage()
  const t = T[lang]
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
        setMsg(t.fetchOddsOk(data.updated ?? 0))
        if (data.availableInApi) setApiEvents(data.availableInApi)
      } else {
        setState('error')
        setMsg(data.error ?? t.errUnknown)
      }
    } catch {
      setState('error')
      setMsg(t.errNetwork)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleFetch}
        disabled={state === 'loading'}
        className="bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
      >
        {state === 'loading' ? t.fetchOddsLoading : t.fetchOddsLabel}
      </button>
      {msg && <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      {apiEvents && (
        <div className="rounded-lg border border-gray-700 bg-gray-950 p-3">
          <p className="text-xs font-semibold text-gray-400 mb-1">{t.availableInApi(apiEvents.length)}</p>
          <p className="text-xs text-gray-500 font-mono break-all">{apiEvents.join(' · ')}</p>
        </div>
      )}
    </div>
  )
}

function formatDate(d: string, lang: string) {
  return new Date(d).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

export default function AdminMatchList({ matches }: { matches: Match[] }) {
  const { lang } = useLanguage()
  const t = T[lang]

  if (matches.length === 0) {
    return <p className="text-gray-500 text-sm">{t.noMatches}</p>
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        {t.matchesTitle(matches.length)}
      </h2>
      {matches.map(match => (
        <AdminMatchRow key={match.id} match={match} />
      ))}
    </div>
  )
}

function AdminMatchRow({ match }: { match: Match }) {
  const { lang } = useLanguage()
  const t = T[lang]
  const [finished, setFinished] = useState(match.status === 'finished')
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [fetchingOdds, setFetchingOdds] = useState(false)
  const [confirmState, setConfirmState] = useState<'idle' | 'score' | 'reset'>('idle')

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  async function handleSetScore() {
    const h = parseInt(homeScore)
    const a = parseInt(awayScore)
    if (isNaN(h) || isNaN(a)) { setMsg(t.invalidScores); setMsgOk(false); return }
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
      setMsg(t.pointsCalc)
      setMsgOk(true)
    } else {
      setMsg(data.error ?? t.errUnknown)
      setMsgOk(false)
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
      setMsg(t.scoreReset)
      setMsgOk(true)
    } else {
      setMsg(data.error ?? t.errUnknown)
      setMsgOk(false)
    }
    setResetting(false)
  }

  async function handleFetchOdds() {
    setFetchingOdds(true)
    setMsg('')
    const res = await fetch(`/api/admin/fetch-odds?matchId=${match.id}`, { method: 'GET' })
    const data = await res.json()
    setMsg(res.ok ? t.oddsResult(data.home_odds, data.draw_odds, data.away_odds) : data.error ?? t.errUnknown)
    setMsgOk(res.ok)
    setFetchingOdds(false)
  }

  const stagePart = stageLabel(match.stage, lang)
  const groupPart = match.group_name ? ` · ${t.group(match.group_name)}` : ''

  return (
    <div className="bg-gray-900 rounded-xl p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">
            {match.home_team} vs {match.away_team}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(match.match_date, lang)} · {stagePart}{groupPart}
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
              {fetchingOdds ? t.fetchOddsInlineLoading : t.fetchOddsInline}
            </button>
          )}
        </div>

        {/* Score */}
        {finished ? (
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono font-bold">
              {homeScore !== '' ? homeScore : match.home_score} – {awayScore !== '' ? awayScore : match.away_score}
            </span>
            {confirmState === 'reset' ? (
              <>
                <span className="text-xs text-gray-500">{t.confirmReset}</span>
                <button
                  onClick={() => setConfirmState('idle')}
                  className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded border border-gray-700"
                >
                  {t.no}
                </button>
                <button
                  onClick={() => { setConfirmState('idle'); handleReset() }}
                  disabled={resetting}
                  className="text-red-400 hover:text-red-300 disabled:text-gray-600 text-xs px-2 py-1 rounded border border-red-800 hover:border-red-600"
                >
                  {resetting ? '...' : t.yes}
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmState('reset')}
                disabled={resetting}
                className="text-red-400 hover:text-red-300 disabled:text-gray-600 text-xs px-2 py-1 rounded border border-red-800 hover:border-red-600"
              >
                {resetting ? '...' : t.cancel}
              </button>
            )}
          </div>
        ) : (
          <>
            {confirmState === 'score' ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-white">{homeScore} – {awayScore}</span>
                <span className="text-xs text-gray-500">{t.confirmQuestion}</span>
                <button
                  onClick={() => setConfirmState('idle')}
                  className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded border border-gray-700"
                >
                  {t.no}
                </button>
                <button
                  onClick={() => { setConfirmState('idle'); handleSetScore() }}
                  disabled={saving}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white text-xs px-2 py-1.5 rounded font-medium"
                >
                  {saving ? '...' : t.yes}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={e => { setHomeScore(e.target.value); setConfirmState('idle') }}
                  className="w-10 bg-gray-800 rounded text-center text-white text-sm py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0"
                />
                <span className="text-gray-600">–</span>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={e => { setAwayScore(e.target.value); setConfirmState('idle') }}
                  className="w-10 bg-gray-800 rounded text-center text-white text-sm py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0"
                />
                <button
                  onClick={() => setConfirmState('score')}
                  disabled={saving || homeScore === '' || awayScore === ''}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white text-xs px-2 py-1.5 rounded font-medium"
                >
                  {saving ? '...' : t.save}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {msg && <p className={`text-xs mt-2 ${msgOk ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
    </div>
  )
}
