import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getDailyResults } from '../services/dailyResultService';
import type { DailyResult, GameType } from '../game/types';

type GroupRankingsOverviewProps = {
  dateKey: string;
  groupId: string | null;
  groupName: string | null;
  refreshToken: number;
};

type RankingEntry = {
  playerKey: string;
  playerName: string;
  score: number;
  durationMs: number;
};

type RankingBoard = {
  id: 'sudoku' | 'numbers' | 'letters' | 'total';
  title: string;
  hint: string;
  rows: RankingEntry[];
};

const gameLabels: Record<GameType, string> = {
  sudoku: 'Sudoku',
  numbers: 'Cifras',
  letters: 'Letras',
};

export function GroupRankingsOverview({ dateKey, groupId, groupName, refreshToken }: GroupRankingsOverviewProps) {
  const [resultsByGame, setResultsByGame] = useState<Record<GameType, DailyResult[]>>({
    sudoku: [],
    numbers: [],
    letters: [],
  });
  const [loading, setLoading] = useState(false);

  const loadResults = useCallback(async () => {
    if (!groupId) {
      setResultsByGame({ sudoku: [], numbers: [], letters: [] });
      return;
    }

    setLoading(true);
    const [numbers, letters, ...sudokuLevels] = await Promise.all([
      getDailyResults({ challengeDate: dateKey, gameType: 'numbers', difficulty: null, groupId, limit: 100 }),
      getDailyResults({ challengeDate: dateKey, gameType: 'letters', difficulty: null, groupId, limit: 100 }),
      ...Array.from({ length: 10 }, (_, index) =>
        getDailyResults({
          challengeDate: dateKey,
          gameType: 'sudoku',
          difficulty: index + 1,
          groupId,
          limit: 100,
        }),
      ),
    ]);

    setResultsByGame({
      sudoku: sudokuLevels.flatMap((result) => result.data),
      numbers: numbers.data,
      letters: letters.data,
    });
    setLoading(false);
  }, [dateKey, groupId]);

  useEffect(() => {
    void loadResults();
  }, [loadResults, refreshToken]);

  const boards = useMemo(() => buildRankingBoards(resultsByGame), [resultsByGame]);

  return (
    <section className="social-card group-rankings" aria-label="Rankings del grupo">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Ranking del día</p>
          <h2>{groupName ?? 'Sin grupo'}</h2>
          <p className="scope-copy">Top 3 por juego y total acumulado.</p>
        </div>
        <button className="icon-button icon-only" type="button" onClick={loadResults} aria-label="Actualizar rankings">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="ranking-grid">
        {boards.map((board) => (
          <article key={board.id} className="ranking-board">
            <div>
              <h3>{board.title}</h3>
              <p>{board.hint}</p>
            </div>
            <ol>
              {board.rows.length === 0 ? (
                <li className="empty-ranking">Sin resultados todavía.</li>
              ) : (
                board.rows.map((entry, index) => (
                  <li key={entry.playerKey}>
                    <span className="rank small">{index + 1}</span>
                    <span>
                      <strong>{entry.playerName}</strong>
                      <small>{Math.round(entry.durationMs / 1000)}s acumulados</small>
                    </span>
                    <b>{entry.score}</b>
                  </li>
                ))
              )}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildRankingBoards(resultsByGame: Record<GameType, DailyResult[]>): RankingBoard[] {
  const sudoku = rankAggregatedBestByPlayer(resultsByGame.sudoku, 'difficulty');
  const numbers = rankAggregatedBestByPlayer(resultsByGame.numbers, 'game');
  const letters = rankAggregatedBestByPlayer(resultsByGame.letters, 'game');
  const total = rankTotal([
    ...sudoku.map((entry) => ({ ...entry, game: 'sudoku' as const })),
    ...numbers.map((entry) => ({ ...entry, game: 'numbers' as const })),
    ...letters.map((entry) => ({ ...entry, game: 'letters' as const })),
  ]);

  return [
    { id: 'sudoku', title: gameLabels.sudoku, hint: 'Suma del mejor resultado por nivel', rows: sudoku.slice(0, 3) },
    { id: 'numbers', title: gameLabels.numbers, hint: 'Mejor intento del día', rows: numbers.slice(0, 3) },
    { id: 'letters', title: gameLabels.letters, hint: 'Mejor palabra del día', rows: letters.slice(0, 3) },
    { id: 'total', title: 'Total', hint: 'Suma de los tres juegos', rows: total.slice(0, 3) },
  ];
}

function rankAggregatedBestByPlayer(results: DailyResult[], scope: 'difficulty' | 'game') {
  const bestByPlayerAndScope = new Map<string, DailyResult>();

  for (const result of results) {
    const playerKey = getPlayerKey(result);
    const scopeKey = scope === 'difficulty' ? result.difficulty ?? 'daily' : result.gameType;
    const key = `${playerKey}:${scopeKey}`;
    const current = bestByPlayerAndScope.get(key);
    if (!current || compareResultScore(result, current) < 0) bestByPlayerAndScope.set(key, result);
  }

  const totals = new Map<string, RankingEntry>();
  for (const result of bestByPlayerAndScope.values()) {
    const playerKey = getPlayerKey(result);
    const current = totals.get(playerKey) ?? {
      playerKey,
      playerName: result.playerName,
      score: 0,
      durationMs: 0,
    };
    current.score += result.score;
    current.durationMs += result.durationMs;
    totals.set(playerKey, current);
  }

  return [...totals.values()].sort(compareRankingEntry);
}

function rankTotal(entries: Array<RankingEntry & { game: GameType }>) {
  const totals = new Map<string, RankingEntry>();

  for (const entry of entries) {
    const current = totals.get(entry.playerKey) ?? {
      playerKey: entry.playerKey,
      playerName: entry.playerName,
      score: 0,
      durationMs: 0,
    };
    current.score += entry.score;
    current.durationMs += entry.durationMs;
    totals.set(entry.playerKey, current);
  }

  return [...totals.values()].sort(compareRankingEntry);
}

function getPlayerKey(result: DailyResult) {
  return result.userId ?? result.playerName.trim().toLowerCase();
}

function compareResultScore(a: DailyResult, b: DailyResult) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return a.createdAt.localeCompare(b.createdAt);
}

function compareRankingEntry(a: RankingEntry, b: RankingEntry) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return a.playerName.localeCompare(b.playerName);
}
