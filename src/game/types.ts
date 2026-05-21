export type GameType = 'sudoku' | 'numbers' | 'letters';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type CompetitionGroup = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  role?: 'owner' | 'admin' | 'member';
};

export type GroupMessage = {
  id: string;
  groupId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type DailyResult = {
  id: string;
  userId: string | null;
  groupId: string | null;
  playerName: string;
  challengeDate: string;
  gameType: GameType;
  difficulty: number | null;
  score: number;
  durationMs: number;
  operationsCount: number | null;
  wordLength: number | null;
  createdAt: string;
  metadata: Record<string, JsonValue>;
};

export type DailyResultSubmission = {
  userId?: string | null;
  groupId?: string | null;
  groupIds?: string[];
  playerName: string;
  challengeDate: string;
  gameType: GameType;
  difficulty?: number | null;
  score: number;
  durationMs: number;
  operationsCount?: number | null;
  wordLength?: number | null;
  metadata?: Record<string, JsonValue>;
};

export type AppTextState = {
  dateKey: string;
  activeGame: GameType;
  selectedSudokuLevel: number;
  selectedGroupId: string | null;
  currentChallenge: Record<string, JsonValue>;
};
