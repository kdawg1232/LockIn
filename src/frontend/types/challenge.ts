export interface ChallengeResult {
  winner: string;
  opponentName: string;
  userScore: number;
  opponentScore: number;
  timestamp: number;
}

export interface ChallengeResolutionResponse {
  success: boolean;
  error: string | null;
  result?: ChallengeResult;
} 