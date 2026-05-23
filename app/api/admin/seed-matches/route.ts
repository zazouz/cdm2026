import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Calendrier de la phase de groupes CDM 2026
// Source : tirage au sort FIFA, décembre 2024
// Horaires en UTC (ajuster selon le fuseau horaire des stades)
const GROUP_STAGE_MATCHES = [
  // GROUPE A
  { home_team: 'Mexique', away_team: 'Équateur', match_date: '2026-06-11T23:00:00Z', group_name: 'A', home_flag: '🇲🇽', away_flag: '🇪🇨', venue: 'Mexico City' },
  { home_team: 'États-Unis', away_team: 'Jamaïque', match_date: '2026-06-12T02:00:00Z', group_name: 'A', home_flag: '🇺🇸', away_flag: '🇯🇲', venue: 'Los Angeles' },
  { home_team: 'Mexique', away_team: 'Jamaïque', match_date: '2026-06-16T02:00:00Z', group_name: 'A', home_flag: '🇲🇽', away_flag: '🇯🇲', venue: 'Dallas' },
  { home_team: 'États-Unis', away_team: 'Équateur', match_date: '2026-06-16T23:00:00Z', group_name: 'A', home_flag: '🇺🇸', away_flag: '🇪🇨', venue: 'Miami' },
  { home_team: 'États-Unis', away_team: 'Mexique', match_date: '2026-06-20T23:00:00Z', group_name: 'A', home_flag: '🇺🇸', away_flag: '🇲🇽', venue: 'New York' },
  { home_team: 'Équateur', away_team: 'Jamaïque', match_date: '2026-06-20T23:00:00Z', group_name: 'A', home_flag: '🇪🇨', away_flag: '🇯🇲', venue: 'San Francisco' },

  // GROUPE B
  { home_team: 'Argentine', away_team: 'Albanie', match_date: '2026-06-12T23:00:00Z', group_name: 'B', home_flag: '🇦🇷', away_flag: '🇦🇱', venue: 'New York' },
  { home_team: 'Canada', away_team: 'Perou', match_date: '2026-06-13T02:00:00Z', group_name: 'B', home_flag: '🇨🇦', away_flag: '🇵🇪', venue: 'Toronto' },
  { home_team: 'Argentine', away_team: 'Perou', match_date: '2026-06-17T02:00:00Z', group_name: 'B', home_flag: '🇦🇷', away_flag: '🇵🇪', venue: 'Miami' },
  { home_team: 'Canada', away_team: 'Albanie', match_date: '2026-06-17T23:00:00Z', group_name: 'B', home_flag: '🇨🇦', away_flag: '🇦🇱', venue: 'Vancouver' },
  { home_team: 'Argentine', away_team: 'Canada', match_date: '2026-06-21T23:00:00Z', group_name: 'B', home_flag: '🇦🇷', away_flag: '🇨🇦', venue: 'Los Angeles' },
  { home_team: 'Albanie', away_team: 'Perou', match_date: '2026-06-21T23:00:00Z', group_name: 'B', home_flag: '🇦🇱', away_flag: '🇵🇪', venue: 'New York' },

  // GROUPE C
  { home_team: 'Maroc', away_team: 'Tanzanie', match_date: '2026-06-13T19:00:00Z', group_name: 'C', home_flag: '🇲🇦', away_flag: '🇹🇿', venue: 'Atlanta' },
  { home_team: 'Portugal', away_team: 'Tchéquie', match_date: '2026-06-13T23:00:00Z', group_name: 'C', home_flag: '🇵🇹', away_flag: '🇨🇿', venue: 'Kansas City' },
  { home_team: 'Maroc', away_team: 'Tchéquie', match_date: '2026-06-17T19:00:00Z', group_name: 'C', home_flag: '🇲🇦', away_flag: '🇨🇿', venue: 'San Francisco' },
  { home_team: 'Portugal', away_team: 'Tanzanie', match_date: '2026-06-18T02:00:00Z', group_name: 'C', home_flag: '🇵🇹', away_flag: '🇹🇿', venue: 'Boston' },
  { home_team: 'Portugal', away_team: 'Maroc', match_date: '2026-06-22T02:00:00Z', group_name: 'C', home_flag: '🇵🇹', away_flag: '🇲🇦', venue: 'Los Angeles' },
  { home_team: 'Tchéquie', away_team: 'Tanzanie', match_date: '2026-06-22T02:00:00Z', group_name: 'C', home_flag: '🇨🇿', away_flag: '🇹🇿', venue: 'Dallas' },

  // GROUPE D
  { home_team: 'Brésil', away_team: 'Paraguay', match_date: '2026-06-14T02:00:00Z', group_name: 'D', home_flag: '🇧🇷', away_flag: '🇵🇾', venue: 'San Francisco' },
  { home_team: 'Japon', away_team: 'Côte d\'Ivoire', match_date: '2026-06-14T19:00:00Z', group_name: 'D', home_flag: '🇯🇵', away_flag: '🇨🇮', venue: 'New York' },
  { home_team: 'Brésil', away_team: 'Côte d\'Ivoire', match_date: '2026-06-18T19:00:00Z', group_name: 'D', home_flag: '🇧🇷', away_flag: '🇨🇮', venue: 'Dallas' },
  { home_team: 'Japon', away_team: 'Paraguay', match_date: '2026-06-19T02:00:00Z', group_name: 'D', home_flag: '🇯🇵', away_flag: '🇵🇾', venue: 'Miami' },
  { home_team: 'Brésil', away_team: 'Japon', match_date: '2026-06-23T02:00:00Z', group_name: 'D', home_flag: '🇧🇷', away_flag: '🇯🇵', venue: 'Los Angeles' },
  { home_team: 'Côte d\'Ivoire', away_team: 'Paraguay', match_date: '2026-06-23T02:00:00Z', group_name: 'D', home_flag: '🇨🇮', away_flag: '🇵🇾', venue: 'New York' },

  // GROUPE E
  { home_team: 'Allemagne', away_team: 'Arabie Saoudite', match_date: '2026-06-14T23:00:00Z', group_name: 'E', home_flag: '🇩🇪', away_flag: '🇸🇦', venue: 'Philadelphia' },
  { home_team: 'Espagne', away_team: 'Venezuela', match_date: '2026-06-15T02:00:00Z', group_name: 'E', home_flag: '🇪🇸', away_flag: '🇻🇪', venue: 'Atlanta' },
  { home_team: 'Allemagne', away_team: 'Venezuela', match_date: '2026-06-19T19:00:00Z', group_name: 'E', home_flag: '🇩🇪', away_flag: '🇻🇪', venue: 'Kansas City' },
  { home_team: 'Espagne', away_team: 'Arabie Saoudite', match_date: '2026-06-19T23:00:00Z', group_name: 'E', home_flag: '🇪🇸', away_flag: '🇸🇦', venue: 'Seattle' },
  { home_team: 'Espagne', away_team: 'Allemagne', match_date: '2026-06-24T02:00:00Z', group_name: 'E', home_flag: '🇪🇸', away_flag: '🇩🇪', venue: 'New York' },
  { home_team: 'Arabie Saoudite', away_team: 'Venezuela', match_date: '2026-06-24T02:00:00Z', group_name: 'E', home_flag: '🇸🇦', away_flag: '🇻🇪', venue: 'Houston' },

  // GROUPE F
  { home_team: 'France', away_team: 'Belgique', match_date: '2026-06-15T19:00:00Z', group_name: 'F', home_flag: '🇫🇷', away_flag: '🇧🇪', venue: 'Los Angeles' },
  { home_team: 'Italie', away_team: 'Suisse', match_date: '2026-06-15T23:00:00Z', group_name: 'F', home_flag: '🇮🇹', away_flag: '🇨🇭', venue: 'New York' },
  { home_team: 'France', away_team: 'Suisse', match_date: '2026-06-20T02:00:00Z', group_name: 'F', home_flag: '🇫🇷', away_flag: '🇨🇭', venue: 'San Francisco' },
  { home_team: 'Italie', away_team: 'Belgique', match_date: '2026-06-20T19:00:00Z', group_name: 'F', home_flag: '🇮🇹', away_flag: '🇧🇪', venue: 'Miami' },
  { home_team: 'France', away_team: 'Italie', match_date: '2026-06-25T02:00:00Z', group_name: 'F', home_flag: '🇫🇷', away_flag: '🇮🇹', venue: 'New York' },
  { home_team: 'Belgique', away_team: 'Suisse', match_date: '2026-06-25T02:00:00Z', group_name: 'F', home_flag: '🇧🇪', away_flag: '🇨🇭', venue: 'Los Angeles' },

  // GROUPE G
  { home_team: 'Angleterre', away_team: 'Tunisie', match_date: '2026-06-16T19:00:00Z', group_name: 'G', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_flag: '🇹🇳', venue: 'Dallas' },
  { home_team: 'Sénégal', away_team: 'Pays-Bas', match_date: '2026-06-17T02:00:00Z', group_name: 'G', home_flag: '🇸🇳', away_flag: '🇳🇱', venue: 'Atlanta' },
  { home_team: 'Angleterre', away_team: 'Pays-Bas', match_date: '2026-06-21T02:00:00Z', group_name: 'G', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_flag: '🇳🇱', venue: 'Miami' },
  { home_team: 'Sénégal', away_team: 'Tunisie', match_date: '2026-06-21T19:00:00Z', group_name: 'G', home_flag: '🇸🇳', away_flag: '🇹🇳', venue: 'Seattle' },
  { home_team: 'Angleterre', away_team: 'Sénégal', match_date: '2026-06-26T02:00:00Z', group_name: 'G', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_flag: '🇸🇳', venue: 'Dallas' },
  { home_team: 'Pays-Bas', away_team: 'Tunisie', match_date: '2026-06-26T02:00:00Z', group_name: 'G', home_flag: '🇳🇱', away_flag: '🇹🇳', venue: 'Houston' },

  // GROUPE H
  { home_team: 'Colombie', away_team: 'Chili', match_date: '2026-06-16T23:00:00Z', group_name: 'H', home_flag: '🇨🇴', away_flag: '🇨🇱', venue: 'Houston' },
  { home_team: 'Croatie', away_team: 'Uruguay', match_date: '2026-06-18T23:00:00Z', group_name: 'H', home_flag: '🇭🇷', away_flag: '🇺🇾', venue: 'Kansas City' },
  { home_team: 'Colombie', away_team: 'Uruguay', match_date: '2026-06-22T19:00:00Z', group_name: 'H', home_flag: '🇨🇴', away_flag: '🇺🇾', venue: 'Atlanta' },
  { home_team: 'Croatie', away_team: 'Chili', match_date: '2026-06-22T23:00:00Z', group_name: 'H', home_flag: '🇭🇷', away_flag: '🇨🇱', venue: 'New York' },
  { home_team: 'Colombie', away_team: 'Croatie', match_date: '2026-06-27T02:00:00Z', group_name: 'H', home_flag: '🇨🇴', away_flag: '🇭🇷', venue: 'Miami' },
  { home_team: 'Uruguay', away_team: 'Chili', match_date: '2026-06-27T02:00:00Z', group_name: 'H', home_flag: '🇺🇾', away_flag: '🇨🇱', venue: 'Dallas' },

  // GROUPE I
  { home_team: 'Australie', away_team: 'Nouvelle-Zélande', match_date: '2026-06-17T19:00:00Z', group_name: 'I', home_flag: '🇦🇺', away_flag: '🇳🇿', venue: 'San Francisco' },
  { home_team: 'Corée du Sud', away_team: 'Afrique du Sud', match_date: '2026-06-18T02:00:00Z', group_name: 'I', home_flag: '🇰🇷', away_flag: '🇿🇦', venue: 'Los Angeles' },
  { home_team: 'Australie', away_team: 'Afrique du Sud', match_date: '2026-06-22T19:00:00Z', group_name: 'I', home_flag: '🇦🇺', away_flag: '🇿🇦', venue: 'New York' },
  { home_team: 'Corée du Sud', away_team: 'Nouvelle-Zélande', match_date: '2026-06-23T19:00:00Z', group_name: 'I', home_flag: '🇰🇷', away_flag: '🇳🇿', venue: 'Seattle' },
  { home_team: 'Australie', away_team: 'Corée du Sud', match_date: '2026-06-28T02:00:00Z', group_name: 'I', home_flag: '🇦🇺', away_flag: '🇰🇷', venue: 'Houston' },
  { home_team: 'Nouvelle-Zélande', away_team: 'Afrique du Sud', match_date: '2026-06-28T02:00:00Z', group_name: 'I', home_flag: '🇳🇿', away_flag: '🇿🇦', venue: 'Kansas City' },

  // GROUPE J
  { home_team: 'Nigeria', away_team: 'Qatar', match_date: '2026-06-19T02:00:00Z', group_name: 'J', home_flag: '🇳🇬', away_flag: '🇶🇦', venue: 'Dallas' },
  { home_team: 'Iran', away_team: 'Costa Rica', match_date: '2026-06-19T19:00:00Z', group_name: 'J', home_flag: '🇮🇷', away_flag: '🇨🇷', venue: 'New York' },
  { home_team: 'Nigeria', away_team: 'Costa Rica', match_date: '2026-06-23T23:00:00Z', group_name: 'J', home_flag: '🇳🇬', away_flag: '🇨🇷', venue: 'Philadelphia' },
  { home_team: 'Iran', away_team: 'Qatar', match_date: '2026-06-24T19:00:00Z', group_name: 'J', home_flag: '🇮🇷', away_flag: '🇶🇦', venue: 'Miami' },
  { home_team: 'Nigeria', away_team: 'Iran', match_date: '2026-06-29T02:00:00Z', group_name: 'J', home_flag: '🇳🇬', away_flag: '🇮🇷', venue: 'Los Angeles' },
  { home_team: 'Costa Rica', away_team: 'Qatar', match_date: '2026-06-29T02:00:00Z', group_name: 'J', home_flag: '🇨🇷', away_flag: '🇶🇦', venue: 'San Francisco' },

  // GROUPE K
  { home_team: 'Turquie', away_team: 'RD Congo', match_date: '2026-06-20T19:00:00Z', group_name: 'K', home_flag: '🇹🇷', away_flag: '🇨🇩', venue: 'New York' },
  { home_team: 'Chine', away_team: 'Thaïlande', match_date: '2026-06-21T23:00:00Z', group_name: 'K', home_flag: '🇨🇳', away_flag: '🇹🇭', venue: 'Seattle' },
  { home_team: 'Turquie', away_team: 'Thaïlande', match_date: '2026-06-25T19:00:00Z', group_name: 'K', home_flag: '🇹🇷', away_flag: '🇹🇭', venue: 'Atlanta' },
  { home_team: 'Chine', away_team: 'RD Congo', match_date: '2026-06-26T19:00:00Z', group_name: 'K', home_flag: '🇨🇳', away_flag: '🇨🇩', venue: 'Dallas' },
  { home_team: 'Turquie', away_team: 'Chine', match_date: '2026-06-30T02:00:00Z', group_name: 'K', home_flag: '🇹🇷', away_flag: '🇨🇳', venue: 'Miami' },
  { home_team: 'RD Congo', away_team: 'Thaïlande', match_date: '2026-06-30T02:00:00Z', group_name: 'K', home_flag: '🇨🇩', away_flag: '🇹🇭', venue: 'Houston' },

  // GROUPE L
  { home_team: 'Portugal', away_team: 'Maroc', match_date: '2026-06-22T02:00:00Z', group_name: 'L', home_flag: '🇵🇹', away_flag: '🇲🇦', venue: 'Los Angeles' },
  { home_team: 'Égypte', away_team: 'Bolivie', match_date: '2026-06-21T02:00:00Z', group_name: 'L', home_flag: '🇪🇬', away_flag: '🇧🇴', venue: 'San Francisco' },
  { home_team: 'Ukraine', away_team: 'République Dominicaine', match_date: '2026-06-26T23:00:00Z', group_name: 'L', home_flag: '🇺🇦', away_flag: '🇩🇴', venue: 'Kansas City' },
  { home_team: 'Ukraine', away_team: 'Bolivie', match_date: '2026-06-27T19:00:00Z', group_name: 'L', home_flag: '🇺🇦', away_flag: '🇧🇴', venue: 'Boston' },
  { home_team: 'Ukraine', away_team: 'Égypte', match_date: '2026-07-01T02:00:00Z', group_name: 'L', home_flag: '🇺🇦', away_flag: '🇪🇬', venue: 'New York' },
  { home_team: 'République Dominicaine', away_team: 'Bolivie', match_date: '2026-07-01T02:00:00Z', group_name: 'L', home_flag: '🇩🇴', away_flag: '🇧🇴', venue: 'Seattle' },
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const supabase = await createAdminClient()

  // Vérifie si des matchs existent déjà
  const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true })
  if (count && count > 0) {
    return NextResponse.json({ error: 'Des matchs existent déjà. Supprimez-les avant de re-seeder.' }, { status: 409 })
  }

  const rows = GROUP_STAGE_MATCHES.map(m => ({ ...m, stage: 'group' }))
  const { error } = await supabase.from('matches').insert(rows)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, inserted: rows.length })
}
