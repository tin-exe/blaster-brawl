export interface BestOfThreeSnapshot {
  roundsPlayed: number;
  player1Wins: number;
  player2Wins: number;
  champion: 1 | 2 | null;
  complete: boolean;
}

export class BestOfThreeSeries {
  private roundsPlayed = 0;
  private player1Wins = 0;
  private player2Wins = 0;
  private champion: 1 | 2 | null = null;

  recordRound(winnerPlayerSlot: 1 | 2): BestOfThreeSnapshot {
    if (this.champion !== null) throw new Error('The best-of-three series is already complete.');
    this.roundsPlayed += 1;
    if (winnerPlayerSlot === 1) this.player1Wins += 1;
    else this.player2Wins += 1;
    if (this.player1Wins >= 2) this.champion = 1;
    else if (this.player2Wins >= 2) this.champion = 2;
    else if (this.roundsPlayed >= 3) this.champion = this.player1Wins > this.player2Wins ? 1 : 2;
    return this.snapshot();
  }

  snapshot(): BestOfThreeSnapshot {
    return {
      roundsPlayed: this.roundsPlayed,
      player1Wins: this.player1Wins,
      player2Wins: this.player2Wins,
      champion: this.champion,
      complete: this.champion !== null,
    };
  }
}
