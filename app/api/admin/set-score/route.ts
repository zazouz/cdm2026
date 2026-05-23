import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase-server'
import { computePoints } from '@/lib/scoring'
import type { Match, Prediction } from '@/lib/types'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { matchId, homeScore, awayScore } = await req.json()
  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    return NextResponse.json({ error: 'Scores invalides' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 1. Met à jour le match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
    .eq('id', matchId)
    .select()
    .single()

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  // 2. Récupère tous les pronostics pour ce match
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', matchId)

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ ok: true, pointsCalculated: 0 })
  }

  // 3. Calcule les points — seulement si les côtes sont présentes
  // Si absentes, on laisse calculated_at = null pour que le cron recalcule plus tard
  const m = match as Match
  if (m.home_odds === null || m.draw_odds === null || m.away_odds === null) {
    return NextResponse.json({ ok: true, pointsCalculated: 0, warning: 'Cotes manquantes — scoring différé au prochain cron' })
  }

  const updates = predictions.map((pred: Prediction) => ({
    id: pred.id,
    points_earned: computePoints(m, pred),
    calculated_at: new Date().toISOString(),
  }))

  for (const update of updates) {
    await supabase.from('predictions').update({
      points_earned: update.points_earned,
      calculated_at: update.calculated_at,
    }).eq('id', update.id)
  }

  return NextResponse.json({ ok: true, pointsCalculated: updates.length })
}
