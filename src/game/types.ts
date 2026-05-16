export type GameType = 'sudoku' | 'numbers' | 'letters';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type DailyResult = {
  id: string;
  playerName: string;
  challengeDate: string;
  gameType: GameType;
  difficulty: number | null;
  score: number;
  durationMs: number;
  createdAt: string;
  metadata: Record<string, JsonValue>;
};

export type DailyResultSubmission = {
  playerName: string;
  challengeDate: string;
  gameType: GameType;
  difficulty?: number | null;
  score: number;
  durationMs: number;
  metadata?: Record<string, JsonValue>;
};

export type AppTextState = {
  dateKey: string;
  activeGame: GameType;
  selectedSudokuLevel: number;
  currentChallenge: Record<string, JsonValue>;
};
