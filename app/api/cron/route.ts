import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron Job - toutes les 2 heures
// vercel.json configure la fréquence et l'URL
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Interdit' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) return NextResponse.json({ error: 'APP_URL manquant' }, { status: 500 })

  const res = await fetch(`${baseUrl}/api/admin/sync-matches`, {
    method: 'POST',
    headers: { 'x-admin-secret': process.env.ADMIN_SECRET! },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
