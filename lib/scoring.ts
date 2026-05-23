import type { Match, Prediction } from './types'

function resultSign(home: number, away: number): -1 | 0 | 1 {
  if (home > away) return 1
  if (home < away) return -1
  return 0
}

export function computePoints(match: Match, prediction: Prediction): number {
  if (
    match.home_score === null ||
    match.away_score === null ||
    match.home_odds === null ||
    match.draw_odds === null ||
    match.away_odds === null
  ) return 0

  const predictedResult = resultSign(prediction.predicted_home, prediction.predicted_away)
  const actualResult = resultSign(match.home_score, match.away_score)

  const relevantOdds =
    predictedResult === 1 ? match.home_odds :
    predictedResult === 0 ? match.draw_odds :
    match.away_odds

  const isExactScore =
    prediction.predicted_home === match.home_score &&
    prediction.predicted_away === match.away_score

  if (isExactScore) return Math.round(3 * relevantOdds * 100) / 100
  if (predictedResult === actualResult) return Math.round(1 * relevantOdds * 100) / 100
  return 0
}

export function formatOdds(odds: number | null): string {
  if (odds === null) return '-'
  return odds.toFixed(2)
}
