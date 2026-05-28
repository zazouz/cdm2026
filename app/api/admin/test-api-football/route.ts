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

  const key = process.env.API_FOOTBALL_KEY
  if (!key) return NextResponse.json({ error: 'API_FOOTBALL_KEY manquant' }, { status: 500 })

  const res = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
    headers: { 'x-apisports-key': key },
    next: { revalidate: 0 },
  })

  // API-Football v3 quota headers
  const quota = {
    remaining: res.headers.get('X-RateLimit-requests-Remaining') ?? res.headers.get('x-ratelimit-requests-remaining'),
    limit: res.headers.get('X-RateLimit-requests-Limit') ?? res.headers.get('x-ratelimit-requests-limit'),
  }

  // Tous les headers pour debug
  const allHeaders: Record<string, string> = {}
  res.headers.forEach((v, k) => { allHeaders[k] = v })

  if (!res.ok) {
    return NextResponse.json({ error: `API-Football ${res.status}`, quota, allHeaders }, { status: 502 })
  }

  const data = await res.json() as { results: number; errors: unknown; response: unknown[] }

  // Vérifie aussi avec une ligue active (Euro, WC actuel) pour confirmer que la clé fonctionne
  const statusRes = await fetch('https://v3.football.api-sports.io/status', {
    headers: { 'x-apisports-key': key },
    next: { revalidate: 0 },
  })
  const statusData = statusRes.ok ? await statusRes.json() : null

  return NextResponse.json({
    ok: true,
    wc2026_fixtures: data.results,
    errors: data.errors,
    quota,
    allHeaders,
    account: (statusData as Record<string, unknown>)?.response ?? null,
    sample: data.response?.slice(0, 2),
  })
}
