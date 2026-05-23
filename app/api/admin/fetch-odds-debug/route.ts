import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

  const base = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&markets=h2h&oddsFormat=decimal`

  const winamaxRes = await fetch(`${base}&bookmakers=winamax_fr`, { next: { revalidate: 0 } })
  const winamaxEvents = winamaxRes.ok ? await winamaxRes.json() : null

  const euRes = await fetch(`${base}&regions=eu`, { next: { revalidate: 0 } })
  const euEvents = euRes.ok ? await euRes.json() : null

  return NextResponse.json({
    winamax: {
      status: winamaxRes.status,
      count: winamaxEvents?.length ?? 0,
      firstEvent: winamaxEvents?.[0] ?? null,
    },
    eu: {
      status: euRes.status,
      count: euEvents?.length ?? 0,
      firstEvent: euEvents?.[0] ?? null,
    },
  })
}
