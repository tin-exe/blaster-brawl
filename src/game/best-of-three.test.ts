import { describe, expect, it } from 'vitest';
import { BestOfThreeSeries } from './best-of-three';

describe('local best-of-three series', () => {
  it('clinches as soon as a player wins two rounds', () => {
    const series = new BestOfThreeSeries();
    expect(series.recordRound(1)).toEqual({ roundsPlayed: 1, player1Wins: 1, player2Wins: 0, champion: null, complete: false });
    expect(series.recordRound(1)).toEqual({ roundsPlayed: 2, player1Wins: 2, player2Wins: 0, champion: 1, complete: true });
    expect(() => series.recordRound(2)).toThrow(/already complete/);
  });

  it('plays a third round when the score is tied and completes at two wins', () => {
    const series = new BestOfThreeSeries();
    series.recordRound(1);
    expect(series.recordRound(2)).toMatchObject({ roundsPlayed: 2, player1Wins: 1, player2Wins: 1, complete: false });
    expect(series.recordRound(2)).toEqual({ roundsPlayed: 3, player1Wins: 1, player2Wins: 2, champion: 2, complete: true });
  });

  it('starts a rematch with a clean score when a new series is created', () => {
    const first = new BestOfThreeSeries();
    first.recordRound(1);
    first.recordRound(1);
    const rematch = new BestOfThreeSeries();
    expect(rematch.snapshot()).toEqual({ roundsPlayed: 0, player1Wins: 0, player2Wins: 0, champion: null, complete: false });
  });
});
