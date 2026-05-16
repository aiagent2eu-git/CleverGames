import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';
import { getSudokuConflicts, generateSudokuPuzzle, isSudokuSolved } from '../game/sudoku';
import { submitDailyResult } from '../services/dailyResultService';
import type { AppTextState } from '../game/types';

type SudokuGameProps = {
  dateKey: string;
  level: number;
  playerName: string;
  onResultSaved: () => void;
  onStateChange: (state: AppTextState['currentChallenge']) => void;
};

export function SudokuGame({ dateKey, level, playerName, onResultSaved, onStateChange }: SudokuGameProps) {
  const puzzle = useMemo(() => generateSudokuPuzzle(dateKey, level), [dateKey, level]);
  const [grid, setGrid] = useState(() => [...puzzle.puzzle]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [message, setMessage] = useState('Completa el tablero y guarda tu resultado.');
  const [saved, setSaved] = useState(false);

  const conflicts = useMemo(() => getSudokuConflicts(grid), [grid]);
  const emptyCount = grid.filter((value) => value === 0).length;

  useEffect(() => {
    setGrid([...puzzle.puzzle]);
    setSelectedCell(null);
    setStartedAt(Date.now());
    setMessage('Completa el tablero y guarda tu resultado.');
    setSaved(false);
  }, [puzzle]);

  useEffect(() => {
    onStateChange({
      type: 'sudoku',
      level,
      emptyCells: emptyCount,
      conflicts: conflicts.size,
      solved: isSudokuSolved(grid, puzzle.solution),
    });
  }, [conflicts.size, emptyCount, grid, level, onStateChange, puzzle.solution]);

  function placeNumber(value: number) {
    if (selectedCell === null || puzzle.givens[selectedCell] || saved) return;
    setGrid((current) => current.map((cell, index) => (index === selectedCell ? value : cell)));
  }

  function clearCell() {
    if (selectedCell === null || puzzle.givens[selectedCell] || saved) return;
    setGrid((current) => current.map((cell, index) => (index === selectedCell ? 0 : cell)));
  }

  function reset() {
    setGrid([...puzzle.puzzle]);
    setSelectedCell(null);
    setStartedAt(Date.now());
    setMessage('Tablero reiniciado.');
    setSaved(false);
  }

  function checkBoard() {
    if (conflicts.size > 0) {
      setMessage('Hay números repetidos en fila, columna o bloque.');
      return;
    }

    if (emptyCount > 0) {
      setMessage(`Quedan ${emptyCount} casillas por completar.`);
      return;
    }

    setMessage(isSudokuSolved(grid, puzzle.solution) ? 'Sudoku resuelto.' : 'Hay alguna casilla incorrecta.');
  }

  async function saveResult() {
    if (!isSudokuSolved(grid, puzzle.solution) || saved) {
      checkBoard();
      return;
    }

    const durationMs = Date.now() - startedAt;
    const speedBonus = Math.max(0, 1200 - Math.floor(durationMs / 1000));
    const score = level * 1000 + puzzle.emptyCells * 20 + speedBonus;
    const result = await submitDailyResult({
      playerName,
      challengeDate: dateKey,
      gameType: 'sudoku',
      difficulty: level,
      score,
      durationMs,
      metadata: {
        emptyCells: puzzle.emptyCells,
      },
    });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setSaved(true);
    setMessage(`Resultado guardado: ${score} puntos.`);
    onResultSaved();
  }

  return (
    <section className="game-panel sudoku-panel" aria-label="Sudoku diario">
      <div className="game-header">
        <div>
          <p className="eyebrow">Sudoku diario</p>
          <h2>Nivel {level}</h2>
        </div>
        <div className="metric-strip">
          <span>
            <small>Vacías</small>
            <strong>{emptyCount}</strong>
          </span>
          <span>
            <small>Conflictos</small>
            <strong>{conflicts.size}</strong>
          </span>
        </div>
      </div>

      <div className="sudoku-layout">
        <div className="sudoku-board" role="grid" aria-label={`Sudoku nivel ${level}`}>
          {grid.map((value, index) => {
            const isGiven = puzzle.givens[index];
            const isSelected = selectedCell === index;
            const className = [
              'sudoku-cell',
              isGiven ? 'given' : '',
              isSelected ? 'selected' : '',
              conflicts.has(index) ? 'conflict' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={index}
                className={className}
                type="button"
                role="gridcell"
                onClick={() => setSelectedCell(index)}
              >
                {value || ''}
              </button>
            );
          })}
        </div>

        <div className="sudoku-controls">
          <div className="number-pad" aria-label="Números">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
              <button key={value} type="button" onClick={() => placeNumber(value)}>
                {value}
              </button>
            ))}
            <button type="button" onClick={clearCell}>
              Borrar
            </button>
          </div>
          <div className="action-row">
            <button className="icon-button" type="button" onClick={checkBoard}>
              <Check size={18} />
              <span>Comprobar</span>
            </button>
            <button className="icon-button" type="button" onClick={reset}>
              <RotateCcw size={18} />
              <span>Reset</span>
            </button>
            <button className="icon-button primary" type="button" onClick={saveResult}>
              <Save size={18} />
              <span>Guardar</span>
            </button>
          </div>
          <p className="game-message">{message}</p>
        </div>
      </div>
    </section>
  );
}
