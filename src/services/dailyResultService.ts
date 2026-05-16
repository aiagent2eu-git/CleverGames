import {
  fetchDailyResultRows,
  insertDailyResultRow,
  type DailyResultRow,
  type DailyResultRowInsert,
} from '../lib/supabaseHandler';
import type { DailyResult, DailyResultSubmission, GameType } from '../game/types';

const LOCAL_STORAGE_KEY = 'clevergames.dailyResults';

export type DailyResultFilter = {
  challengeDate: string;
  gameType: GameType;
  difficulty?: number | null;
};

type DailyResultServiceResult<T> = {
  data: T;
  error: { message: string } | null;
};

export async function getDailyResults(
  filter: DailyResultFilter,
): Promise<DailyResultServiceResult<DailyResult[]>> {
  const result = await fetchDailyResultRows(filter);

  if (result.error) {
    return {
      data: getLocalResults(filter),
      error: null,
    };
  }

  return {
    data: result.data.map(fromRow),
    error: null,
  };
}

export async function submitDailyResult(
  submission: DailyResultSubmission,
): Promise<DailyResultServiceResult<DailyResult | null>> {
  const cleaned = validateSubmission(submission);
  if ('error' in cleaned) {
    return { data: null, error: cleaned.error };
  }

  const row: DailyResultRowInsert = {
    player_name: cleaned.playerName,
    challenge_date: cleaned.challengeDate,
    game_type: cleaned.gameType,
    difficulty: cleaned.difficulty ?? null,
    score: cleaned.score,
    duration_ms: cleaned.durationMs,
    metadata: cleaned.metadata ?? {},
  };

  const result = await insertDailyResultRow(row);
  if (result.error || !result.data) {
    return {
      data: saveLocalResult(cleaned),
      error: null,
    };
  }

  return {
    data: fromRow(result.data),
    error: null,
  };
}

function validateSubmission(submission: DailyResultSubmission):
  | Required<DailyResultSubmission>
  | {
      error: { message: string };
    } {
  const playerName = submission.playerName.trim().slice(0, 24);
  if (playerName.length < 2) {
    return { error: { message: 'El nombre debe tener al menos 2 caracteres.' } };
  }

  if (!Number.isInteger(submission.score) || submission.score < 0) {
    return { error: { message: 'La puntuación no es válida.' } };
  }

  return {
    playerName,
    challengeDate: submission.challengeDate,
    gameType: submission.gameType,
    difficulty: submission.difficulty ?? null,
    score: submission.score,
    durationMs: Math.max(0, Math.round(submission.durationMs)),
    metadata: submission.metadata ?? {},
  };
}

function fromRow(row: DailyResultRow): DailyResult {
  return {
    id: row.id,
    playerName: row.player_name,
    challengeDate: row.challenge_date,
    gameType: row.game_type,
    difficulty: row.difficulty,
    score: row.score,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    metadata: row.metadata,
  };
}

function getLocalResults(filter: DailyResultFilter) {
  const allResults = readLocalResults();
  return allResults.filter((result) => matchesFilter(result, filter)).sort(compareResults).slice(0, 10);
}

function saveLocalResult(submission: Required<DailyResultSubmission>) {
  const result: DailyResult = {
    id: `local-${Date.now()}`,
    playerName: submission.playerName,
    challengeDate: submission.challengeDate,
    gameType: submission.gameType,
    difficulty: submission.difficulty,
    score: submission.score,
    durationMs: submission.durationMs,
    metadata: submission.metadata,
    createdAt: new Date().toISOString(),
  };

  const next = [result, ...readLocalResults()].sort(compareResults).slice(0, 200);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  return result;
}

function readLocalResults() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as DailyResult[];
  } catch {
    return [];
  }
}

function matchesFilter(result: DailyResult, filter: DailyResultFilter) {
  return (
    result.challengeDate === filter.challengeDate &&
    result.gameType === filter.gameType &&
    (filter.difficulty === undefined || result.difficulty === filter.difficulty)
  );
}

function compareResults(a: DailyResult, b: DailyResult) {
  if (b.score !== a.score) return b.score - a.score;
  return a.durationMs - b.durationMs;
}
