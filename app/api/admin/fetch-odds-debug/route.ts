import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ODDS_API_KEY manquant' }, { status: 500 })

  // Fetch winamax events
  const base = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&markets=h2h&oddsFormat=decimal`
  const winamaxRes = await fetch(`${base}&bookmakers=winamax_fr`, { next: { revalidate: 0 } })
  const events = winamaxRes.ok ? await winamaxRes.json() : []

  // Check DB for Iran vs New Zealand
  const supabase = await createAdminClient()
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_odds, status')
    .or('home_team.ilike.%Iran%,away_team.ilike.%Iran%')

  // Trace the matching for every event vs "Iran" / "New Zealand"
  const { normalizeTeam: normalize, canonicalTeam: canon } = await import('@/lib/teams')

  const homeTeam = 'Iran'
  const awayTeam = 'New Zealand'
  const homeNorm = canon(homeTeam)
  const awayNorm = canon(awayTeam)

  const matchTrace = events.map((e: { home_team: string; away_team: string; bookmakers: unknown[] }) => {
    const h = canon(e.home_team)
    const a = canon(e.away_team)
    const homeMatch = h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))
    const awayMatch = a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4))
    return {
      event: `${e.home_team} vs ${e.away_team}`,
      h, a,
      homeMatch, awayMatch,
      bothMatch: homeMatch && awayMatch,
      bookmakers: e.bookmakers.length,
    }
  }).filter((t: { bothMatch: boolean }) => t.bothMatch)

  return NextResponse.json({
    homeNorm,
    awayNorm,
    homeSlice: homeNorm.slice(0, 4),
    awaySlice: awayNorm.slice(0, 4),
    eventsCount: events.length,
    matchingEvents: matchTrace,
    dbIranMatches: dbMatches,
  })
}
