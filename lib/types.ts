export type User = {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string | null
  is_admin: boolean
  created_at: string
}

export type Match = {
  id: number
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_date: string
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
  group_name: string | null
  venue: string | null
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null
  odds_fetched_at: string | null
  odds_bookmaker: string | null
  score_source: 'football_data' | 'api_football' | 'manual' | null
  score_confirmed: boolean
  score_needs_review: boolean
  score_fetched_at: string | null
  score_review_reason: string | null
  score_period: string | null
  api_football_fixture_id: number | null
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'finished'
  fd_match_id: number | null
}

export type Prediction = {
  id: number
  user_id: string
  match_id: number
  predicted_home: number
  predicted_away: number
  points_earned: number | null
  calculated_at: string | null
  created_at: string
  updated_at: string
}

export type PredictionWithMatch = Prediction & {
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_date: string
  stage: string
  group_name: string | null
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null
  home_score: number | null
  away_score: number | null
  status: string
}

export type LeaderboardEntry = {
  id: string
  username: string
  first_name: string
  last_name: string
  total_points: number
  predictions_scored: number
  exact_scores: number
  correct_results: number
}

export const STAGE_LABELS: Record<string, string> = {
  group: 'Phase de groupes',
  r32: 'Seizièmes de finale',
  r16: 'Huitièmes de finale',
  qf: 'Quarts de finale',
  sf: 'Demi-finales',
  third: 'Match pour la 3e place',
  final: 'Finale',
}
