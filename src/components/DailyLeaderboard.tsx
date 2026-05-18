import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getDailyResults } from '../services/dailyResultService';
import type { DailyResult, GameType } from '../game/types';

type DailyLeaderboardProps = {
  activeGame: GameType;
  dateKey: string;
  sudokuLevel: number;
  groupId: string | null;
  groupName: string | null;
  refreshToken: number;
};

const labels: Record<GameType, string> = {
  sudoku: 'Sudoku',
  numbers: 'Cifras',
  letters: 'Letras',
};

export function DailyLeaderboard({
  activeGame,
  dateKey,
  sudokuLevel,
  groupId,
  groupName,
  refreshToken,
}: DailyLeaderboardProps) {
  const [results, setResults] = useState<DailyResult[]>([]);
  const [loading, setLoading] = useState(false);

  const difficulty = activeGame === 'sudoku' ? sudokuLevel : null;
  const title = useMemo(() => {
    return activeGame === 'sudoku' ? `${labels[activeGame]} nivel ${sudokuLevel}` : labels[activeGame];
  }, [activeGame, sudokuLevel]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    const result = await getDailyResults({
      challengeDate: dateKey,
      gameType: activeGame,
      difficulty,
      groupId,
    });
    setResults(result.data);
    setLoading(false);
  }, [activeGame, dateKey, difficulty, groupId]);

  useEffect(() => {
    void loadResults();
  }, [loadResults, refreshToken]);

  return (
    <aside className="leaderboard" aria-label="Clasificacion diaria">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Clasificación</p>
          <h2>{title}</h2>
          <p className="scope-copy">{groupName ? `Grupo: ${groupName}` : 'Resultados personales'}</p>
        </div>
        <button className="icon-button" type="button" onClick={loadResults} aria-label="Actualizar clasificación">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <ol className="score-list">
        {results.length === 0 ? (
          <li className="empty-row">Aún no hay resultados guardados para este reto.</li>
        ) : (
          results.map((result, index) => (
            <li key={result.id}>
              <span className="rank">{index + 1}</span>
              <span>
                <strong>{result.playerName}</strong>
                <small>
                  {Math.round(result.durationMs / 1000)}s
                  {result.operationsCount !== null ? ` · ${result.operationsCount} ops` : ''}
                  {result.wordLength !== null ? ` · ${result.wordLength} letras` : ''}
                </small>
              </span>
              <b>{result.score}</b>
            </li>
          ))
        )}
      </ol>
    </aside>
  );
}
