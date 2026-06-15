export type ResultPrediction = 'HOME' | 'AWAY' | 'DRAW';

export function getFixtureWinner(homeScore: number, awayScore: number): ResultPrediction {
  if (homeScore > awayScore) return 'HOME';
  if (awayScore > homeScore) return 'AWAY';
  return 'DRAW';
}

export function evaluateResultBid(predicted: ResultPrediction, homeScore: number, awayScore: number) {
  return predicted === getFixtureWinner(homeScore, awayScore);
}

export function evaluateExactScoreBid(
  predictedHomeScore: number,
  predictedAwayScore: number,
  homeScore: number,
  awayScore: number,
) {
  return predictedHomeScore === homeScore && predictedAwayScore === awayScore;
}
