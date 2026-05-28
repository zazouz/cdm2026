import { NextResponse } from 'next/server'

// Désactivé — remplacé par sync-matches qui gère regularTime, fallback API-Football
// et la logique de confirmation/conflit.
// Utiliser POST /api/admin/sync-matches à la place.
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint désactivé. Utiliser POST /api/admin/sync-matches.' },
    { status: 410 }
  )
}
