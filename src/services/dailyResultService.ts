import {
  fetchDailyResultRows,
  insertDailyResultRow,
  type DailyResultRow,
  type DailyResultRowInsert,
} from '../lib/supabaseHandler';
import type { DailyResult, DailyResultSubmission, GameType, JsonValue } from '../game/types';

const LOCAL_STORAGE_KEY = 'clevergames.dailyResults';

export type DailyResultFilter = {
  challengeDate: string;
  gameType: GameType;
  difficulty?: number | null;
  groupId?: string | null;
};

type DailyResultServiceResult<T> = {
  data: T;
  error: { message: string } | null;
};

type CleanDailyResultSubmission = {
  userId: string | null;
  groupId: string | null;
  groupIds: string[];
  playerName: string;
  challengeDate: string;
  gameType: GameType;
  difficulty: number | null;
  score: number;
  durationMs: number;
  operationsCount: number | null;
  wordLength: number | null;
  metadata: Record<string, JsonValue>;
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

  const targetGroupIds = getTargetGroupIds(cleaned);
  const resultTargets = [null, ...targetGroupIds];
  const savedResults: DailyResult[] = [];

  for (const groupId of resultTargets) {
    const result = await insertDailyResultRow(toRow(cleaned, groupId));

    if (result.error || !result.data) {
      savedResults.push(saveLocalResult({ ...cleaned, groupId }));
    } else {
      savedResults.push(fromRow(result.data));
    }
  }

  return {
    data: savedResults[0] ?? null,
    error: null,
  };
}

function validateSubmission(submission: DailyResultSubmission):
  | CleanDailyResultSubmission
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
    userId: submission.userId ?? null,
    groupId: submission.groupId ?? null,
    groupIds: normalizeGroupIds(submission.groupIds),
    playerName,
    challengeDate: submission.challengeDate,
    gameType: submission.gameType,
    difficulty: submission.difficulty ?? null,
    score: submission.score,
    durationMs: Math.max(0, Math.round(submission.durationMs)),
    operationsCount: submission.operationsCount ?? null,
    wordLength: submission.wordLength ?? null,
    metadata: submission.metadata ?? {},
  };
}

function normalizeGroupIds(groupIds: string[] | undefined) {
  return [...new Set((groupIds ?? []).map((groupId) => groupId.trim()).filter(Boolean))];
}

function getTargetGroupIds(submission: CleanDailyResultSubmission) {
  return submission.groupIds.length > 0 ? submission.groupIds : normalizeGroupIds([submission.groupId ?? '']);
}

function toRow(submission: CleanDailyResultSubmission, groupId: string | null): DailyResultRowInsert {
  return {
    user_id: submission.userId,
    group_id: groupId,
    player_name: submission.playerName,
    challenge_date: submission.challengeDate,
    game_type: submission.gameType,
    difficulty: submission.difficulty,
    score: submission.score,
    duration_ms: submission.durationMs,
    operations_count: submission.operationsCount,
    word_length: submission.wordLength,
    metadata: submission.metadata,
  };
}

function fromRow(row: DailyResultRow): DailyResult {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    playerName: row.player_name,
    challengeDate: row.challenge_date,
    gameType: row.game_type,
    difficulty: row.difficulty,
    score: row.score,
    durationMs: row.duration_ms,
    operationsCount: row.operations_count,
    wordLength: row.word_length,
    createdAt: row.created_at,
    metadata: row.metadata,
  };
}

function getLocalResults(filter: DailyResultFilter) {
  const allResults = readLocalResults();
  return allResults.filter((result) => matchesFilter(result, filter)).sort(compareResults).slice(0, 10);
}

function saveLocalResult(
  submission: CleanDailyResultSubmission & { groupId: string | null },
) {
  const scope = submission.groupId ?? 'personal';
  const result: DailyResult = {
    id: `local-${Date.now()}-${scope}-${Math.random().toString(36).slice(2, 8)}`,
    userId: submission.userId,
    groupId: submission.groupId,
    playerName: submission.playerName,
    challengeDate: submission.challengeDate,
    gameType: submission.gameType,
    difficulty: submission.difficulty,
    score: submission.score,
    durationMs: submission.durationMs,
    operationsCount: submission.operationsCount,
    wordLength: submission.wordLength,
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
    (filter.difficulty === undefined || result.difficulty === filter.difficulty) &&
    (filter.groupId === undefined || result.groupId === filter.groupId)
  );
}

function compareResults(a: DailyResult, b: DailyResult) {
  if (b.score !== a.score) return b.score - a.score;
  if ((a.operationsCount ?? 999) !== (b.operationsCount ?? 999)) {
    return (a.operationsCount ?? 999) - (b.operationsCount ?? 999);
  }
  if ((b.wordLength ?? 0) !== (a.wordLength ?? 0)) {
    return (b.wordLength ?? 0) - (a.wordLength ?? 0);
  }
  return a.durationMs - b.durationMs;
}
