import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { computePoints } from '@/lib/scoring'
import type { Match, Prediction } from '@/lib/types'

// Appelé par le cron Vercel ou manuellement par l'admin
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const supabase = await createAdminClient()
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY manquant' }, { status: 500 })

  // Récupère les matchs terminés côté football-data mais pas encore marqués finished chez nous
  // On cherche les matchs dont la date est passée depuis au moins 2h et status = scheduled
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: pendingMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .lt('match_date', twoHoursAgo)

  if (!pendingMatches || pendingMatches.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  // Fetch les résultats de la CDM 2026 depuis football-data.org
  const fdRes = await fetch('https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED', {
    headers: { 'X-Auth-Token': apiKey },
  })

  if (!fdRes.ok) {
    return NextResponse.json({ error: `football-data.org: ${fdRes.status}` }, { status: 502 })
  }

  const fdData = await fdRes.json() as FDResponse
  const fdMatches = fdData.matches ?? []

  let processed = 0

  for (const pending of pendingMatches) {
    // Cherche le match dans football-data par fd_match_id ou par noms d'équipes + date
    const fdMatch = pending.fd_match_id
      ? fdMatches.find(m => m.id === pending.fd_match_id)
      : findByTeamsAndDate(fdMatches, pending.home_team, pending.away_team, pending.match_date)

    if (!fdMatch || fdMatch.status !== 'FINISHED') continue
    if (fdMatch.score.fullTime.home === null) continue

    const homeScore = fdMatch.score.fullTime.home
    const awayScore = fdMatch.score.fullTime.away

    // Met à jour le match
    await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
      fd_match_id: fdMatch.id,
    }).eq('id', pending.id)

    // Calcule les points
    const updatedMatch: Match = { ...pending, home_score: homeScore, away_score: awayScore, status: 'finished' }
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', pending.id)

    for (const pred of (predictions ?? []) as Prediction[]) {
      const points = computePoints(updatedMatch, pred)
      await supabase.from('predictions').update({
        points_earned: points,
        calculated_at: new Date().toISOString(),
      }).eq('id', pred.id)
    }

    processed++
  }

  return NextResponse.json({ ok: true, processed })
}

function findByTeamsAndDate(
  matches: FDMatch[],
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): FDMatch | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const homeNorm = normalize(homeTeam)
  const awayNorm = normalize(awayTeam)
  const dateMsTarget = new Date(matchDate).getTime()
  const DAY_MS = 24 * 60 * 60 * 1000

  return matches.find(m => {
    const dateClose = Math.abs(new Date(m.utcDate).getTime() - dateMsTarget) < DAY_MS
    const h = normalize(m.homeTeam.name)
    const a = normalize(m.awayTeam.name)
    const homeMatch = h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))
    const awayMatch = a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4))
    return dateClose && homeMatch && awayMatch
  })
}

type FDMatch = {
  id: number
  utcDate: string
  status: string
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
  score: { fullTime: { home: number | null; away: number | null } }
}

type FDResponse = { matches: FDMatch[] }
