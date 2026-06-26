import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { canonicalTeam, normalizeTeam } from '@/lib/teams'
import { getFlag } from '@/lib/flags'

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
  const force = req.nextUrl.searchParams.get('force') === 'true'

  const supabase = await createAdminClient()
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  if (!force && match.home_odds !== null) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'côtes déjà présentes (ajouter ?force=true pour forcer)' })
  }

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
    odds_bookmaker: odds.bookmaker,
  }).eq('id', matchId)

  return NextResponse.json({ ok: true, home_odds: odds.home, draw_odds: odds.draw, away_odds: odds.away, bookmaker: odds.bookmaker })
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

  // Matchs sans côtes avec noms connus
  const { data: namedMatches } = await supabase
    .from('matches')
    .select('*')
    .is('home_odds', null)
    .eq('status', 'scheduled')
    .not('home_team', 'ilike', '%TBD%')
    .not('away_team', 'ilike', '%TBD%')

  // Matchs TBD : résolution par horaire quel que soit le statut des côtes
  const { data: tbdMatches } = await supabase
    .from('matches')
    .select('id, match_date, home_odds')
    .or('home_team.eq.TBD,away_team.eq.TBD')
    .eq('status', 'scheduled')

  if ((!namedMatches || namedMatches.length === 0) && (!tbdMatches || tbdMatches.length === 0)) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  // Un seul appel API — 1 crédit quelle que soit la quantité
  const { events, error: oddsError } = await fetchAllOddsEvents()
  if (!events) return NextResponse.json({ error: oddsError ?? 'Erreur The Odds API' }, { status: 502 })

  let updated = 0
  const notFound: string[] = []
  const normalize = normalizeTeam
  const ONE_HOUR_MS = 60 * 60 * 1000

  // ── Résolution TBD par horaire (±1h) ───────────────────────────────────
  for (const tbd of (tbdMatches ?? [])) {
    const tbdTime = new Date(tbd.match_date).getTime()
    const event = events.find(e => Math.abs(new Date(e.commence_time).getTime() - tbdTime) < ONE_HOUR_MS)
    if (!event) { notFound.push(`TBD vs TBD (${tbd.match_date.slice(0, 10)})`); continue }

    const bookmaker =
      event.bookmakers.find(b => b.key === 'betclic_fr' && b.markets.some(m => m.key === 'h2h'))
      ?? event.bookmakers.find(b => b.markets.some(m => m.key === 'h2h'))
    if (!bookmaker) continue
    const h2h = bookmaker.markets.find(m => m.key === 'h2h')
    if (!h2h) continue
    const homeOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.home_team))?.price
    const awayOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.away_team))?.price
    const drawOdds = h2h.outcomes.find(o => o.name === 'Draw')?.price
    if (!homeOdds || !awayOdds || !drawOdds) continue

    // Noms + bookmaker toujours mis à jour ; côtes seulement si pas encore posées
    const oddsAlreadySet = tbd.home_odds != null
    await supabase.from('matches').update({
      home_team: event.home_team,
      away_team: event.away_team,
      home_flag: getFlag(event.home_team),
      away_flag: getFlag(event.away_team),
      odds_bookmaker: bookmaker.key,
      ...(oddsAlreadySet ? {} : {
        home_odds: Math.round(homeOdds * 100) / 100,
        draw_odds: Math.round(drawOdds * 100) / 100,
        away_odds: Math.round(awayOdds * 100) / 100,
        odds_fetched_at: new Date().toISOString(),
      }),
    }).eq('id', tbd.id)
    updated++
  }

  // ── Matchs nommés sans côtes : matching par nom ─────────────────────────
  for (const match of (namedMatches ?? [])) {
    const odds = matchEvent(events, match.home_team, match.away_team, match.match_date)
    if (odds) {
      await supabase.from('matches').update({
        home_odds: odds.home,
        draw_odds: odds.draw,
        away_odds: odds.away,
        odds_fetched_at: new Date().toISOString(),
        odds_bookmaker: odds.bookmaker,
      }).eq('id', match.id)
      updated++
    } else {
      notFound.push(`${match.home_team} vs ${match.away_team}`)
    }
  }

  console.log('[CDM2026][fetch-odds] POST done', { updated, notFound: notFound.length })
  const availableInApi = events.map(e => `${e.home_team} vs ${e.away_team}`)
  return NextResponse.json({ ok: true, updated, notFound, availableInApi })
}

async function fetchAllOddsEvents(): Promise<{ events: OddsApiEvent[] | null; error?: string; quotaRemaining?: string; quotaUsed?: string }> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return { events: null, error: 'ODDS_API_KEY manquant' }

  const base = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&markets=h2h&oddsFormat=decimal`

  // EU inclut Betclic FR + autres bookmakers — priorité Betclic, fallback sur n'importe quel bookmaker disponible
  const eu = await fetch(`${base}&regions=eu`, { next: { revalidate: 0 } })
  if (eu.ok) {
    const events = await eu.json() as OddsApiEvent[]
    const quotaRemaining = eu.headers.get('x-requests-remaining') ?? undefined
    const quotaUsed = eu.headers.get('x-requests-used') ?? undefined
    if (events.some(e => e.bookmakers.length > 0)) {
      console.log('[CDM2026][fetch-odds] quota', { remaining: quotaRemaining, used: quotaUsed, events: events.length })
      return { events, quotaRemaining, quotaUsed }
    }
  }

  console.warn('[CDM2026][fetch-odds] no odds available')
  return { events: null, error: 'Aucune cote disponible pour la CDM 2026 sur The Odds API' }
}

function matchEvent(
  events: OddsApiEvent[],
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): { home: number; draw: number; away: number; bookmaker: string } | null {
  const normalize = normalizeTeam
  const canon = canonicalTeam
  const homeNorm = canon(homeTeam)
  const awayNorm = canon(awayTeam)

  const matchDateMs = new Date(matchDate).getTime()
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

  const event = events.find(e => {
    const h = canon(e.home_team)
    const a = canon(e.away_team)
    const nameMatch =
      (h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))) &&
      (a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4)))
    if (!nameMatch) return false
    return Math.abs(new Date(e.commence_time).getTime() - matchDateMs) < TWO_DAYS_MS
  })

  if (!event) return null

  const bookmaker =
    event.bookmakers.find(b => b.key === 'betclic_fr' && b.markets.some(m => m.key === 'h2h'))
    ?? event.bookmakers.find(b => b.markets.some(m => m.key === 'h2h'))
  if (!bookmaker) return null

  console.log(`[CDM2026][fetch-odds] bookmaker for ${homeTeam} vs ${awayTeam}: ${bookmaker.key}`)

  const h2h = bookmaker.markets.find(m => m.key === 'h2h')
  if (!h2h) return null

  const homeOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.home_team))?.price
  const awayOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.away_team))?.price
  const drawOdds = h2h.outcomes.find(o => o.name === 'Draw')?.price

  if (!homeOdds || !awayOdds || !drawOdds) return null

  return {
    home: Math.round(homeOdds * 100) / 100,
    draw: Math.round(drawOdds * 100) / 100,
    away: Math.round(awayOdds * 100) / 100,
    bookmaker: bookmaker.key,
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
