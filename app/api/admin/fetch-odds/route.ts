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
  const secret = req.headers.get('x-admin-secret')
  const isAdminUser = await isAdmin()
  if (!isAdminUser && secret !== process.env.ADMIN_SECRET) {
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
    }
  }

  return NextResponse.json({ ok: true, updated })
}

async function fetchAllOddsEvents(): Promise<{ events: OddsApiEvent[] | null; error?: string }> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return { events: null, error: 'ODDS_API_KEY manquant' }

  const sportKeys = ['soccer_fifa_world_cup', 'soccer_fifa_world_cup_2026']
  for (const sportKey of sportKeys) {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${apiKey}&bookmakers=winamax_fr&markets=h2h&oddsFormat=decimal`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) continue
    const events = await res.json() as OddsApiEvent[]
    if (events.length > 0) return { events }
    // Winamax vide → fallback tous bookmakers EU
    const fallback = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`,
      { next: { revalidate: 0 } }
    )
    if (fallback.ok) {
      const fallbackEvents = await fallback.json() as OddsApiEvent[]
      if (fallbackEvents.length > 0) return { events: fallbackEvents }
    }
  }
  return { events: null, error: 'Aucun sport WC trouvé sur The Odds API — les cotes ne sont peut-être pas encore disponibles' }
}

function matchEvent(
  events: OddsApiEvent[],
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): { home: number; draw: number; away: number } | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const homeNorm = normalize(homeTeam)
  const awayNorm = normalize(awayTeam)
  const dateMsTarget = new Date(matchDate).getTime()
  const DAY_MS = 24 * 60 * 60 * 1000

  const event = events.find(e => {
    const dateClose = Math.abs(new Date(e.commence_time).getTime() - dateMsTarget) < DAY_MS
    const h = normalize(e.home_team)
    const a = normalize(e.away_team)
    return dateClose &&
      (h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))) &&
      (a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4)))
  })

  if (!event) return null

  const bookmaker = event.bookmakers[0]
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
