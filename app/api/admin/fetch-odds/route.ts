import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

// GET /api/admin/fetch-odds?matchId=X  -> fetch pour un match spécifique (1 crédit)
// POST /api/admin/fetch-odds            -> fetch pour tous les matchs sans côtes (1 crédit total)
export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const matchId = req.nextUrl.searchParams.get('matchId')
  if (!matchId) return NextResponse.json({ error: 'matchId requis' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  // Un seul appel API pour récupérer tous les events, puis matching local
  const { events, error: oddsError } = await fetchAllOddsEvents()
  if (!events) return NextResponse.json({ error: oddsError ?? 'Erreur The Odds API' }, { status: 502 })

  const odds = matchEvent(events, match.home_team, match.away_team, match.match_date)
  if (!odds) return NextResponse.json({ error: 'Côtes non trouvées dans The Odds API' }, { status: 404 })

  await supabase.from('matches').update({
    home_odds: odds.home,
    draw_odds: odds.draw,
    away_odds: odds.away,
    odds_fetched_at: new Date().toISOString(),
  }).eq('id', matchId)

  return NextResponse.json({ ok: true, home_odds: odds.home, draw_odds: odds.draw, away_odds: odds.away })
}

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return NextResponse.json({ error: 'ADMIN_SECRET non configuré' }, { status: 500 })
  const secret = req.headers.get('x-admin-secret')
  const isAdminUser = await isAdmin()
  if (!isAdminUser && secret !== adminSecret) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const supabase = await createAdminClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .is('home_odds', null)
    .eq('status', 'scheduled')

  if (!matches || matches.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  // Un seul appel API pour tous les matchs — 1 crédit quelle que soit la quantité
  const { events, error: oddsError } = await fetchAllOddsEvents()
  if (!events) return NextResponse.json({ error: oddsError ?? 'Erreur The Odds API' }, { status: 502 })

  let updated = 0
  const notFound: string[] = []
  for (const match of matches) {
    const odds = matchEvent(events, match.home_team, match.away_team, match.match_date)
    if (odds) {
      await supabase.from('matches').update({
        home_odds: odds.home,
        draw_odds: odds.draw,
        away_odds: odds.away,
        odds_fetched_at: new Date().toISOString(),
      }).eq('id', match.id)
      updated++
    } else {
      notFound.push(`${match.home_team} vs ${match.away_team}`)
    }
  }

  const availableInApi = events.map(e => `${e.home_team} vs ${e.away_team}`)
  return NextResponse.json({ ok: true, updated, notFound, availableInApi })
}

async function fetchAllOddsEvents(): Promise<{ events: OddsApiEvent[] | null; error?: string; quotaRemaining?: string; quotaUsed?: string }> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return { events: null, error: 'ODDS_API_KEY manquant' }

  const base = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&markets=h2h&oddsFormat=decimal`

  // EU inclut Winamax FR + autres bookmakers — couverture complète même si Winamax
  // n'a pas encore les cotes pour certains matchs
  const eu = await fetch(`${base}&regions=eu`, { next: { revalidate: 0 } })
  if (eu.ok) {
    const events = await eu.json() as OddsApiEvent[]
    const quotaRemaining = eu.headers.get('x-requests-remaining') ?? undefined
    const quotaUsed = eu.headers.get('x-requests-used') ?? undefined
    if (events.some(e => e.bookmakers.length > 0)) return { events, quotaRemaining, quotaUsed }
  }

  return { events: null, error: 'Aucune cote disponible pour la CDM 2026 sur The Odds API pour l\'instant' }
}

// Canonical aliases so "USA" and "United States" resolve to the same key
const TEAM_ALIAS: Record<string, string> = {
  'usa': 'unitedstates',
  'unitedstates': 'unitedstates',
  'irian': 'iran',
  'korearep': 'southkorea',
  'republicofkorea': 'southkorea',
  'dprkorea': 'northkorea',
  'chinapr': 'china',
  'trinidadandtobago': 'trinidadtobago',
  'trinidadtobago': 'trinidadtobago',
  'nz': 'newzealand',
  'newzealand': 'newzealand',
}

function matchEvent(
  events: OddsApiEvent[],
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): { home: number; draw: number; away: number } | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const canon = (s: string) => { const n = normalize(s); return TEAM_ALIAS[n] ?? n }
  const homeNorm = canon(homeTeam)
  const awayNorm = canon(awayTeam)

  const event = events.find(e => {
    const h = canon(e.home_team)
    const a = canon(e.away_team)
    return (h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))) &&
      (a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4)))
  })

  if (!event) return null

  const bookmaker = event.bookmakers.find(b => b.key === 'winamax_fr' && b.markets.some(m => m.key === 'h2h'))
    ?? event.bookmakers.find(b => b.markets.some(m => m.key === 'h2h'))
  if (!bookmaker) return null
  const h2h = bookmaker.markets.find(m => m.key === 'h2h')
  if (!h2h) return null

  const normalize2 = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const homeOdds = h2h.outcomes.find(o => normalize2(o.name) === normalize2(event.home_team))?.price
  const awayOdds = h2h.outcomes.find(o => normalize2(o.name) === normalize2(event.away_team))?.price
  const drawOdds = h2h.outcomes.find(o => o.name === 'Draw')?.price

  if (!homeOdds || !awayOdds || !drawOdds) return null

  return {
    home: Math.round(homeOdds * 100) / 100,
    draw: Math.round(drawOdds * 100) / 100,
    away: Math.round(awayOdds * 100) / 100,
  }
}

type OddsApiEvent = {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: Array<{
    key: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; price: number }>
    }>
  }>
}
