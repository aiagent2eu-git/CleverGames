import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import {
  countExpressionOperations,
  evaluateNumbersAttempt,
  generateNumbersChallenge,
  type NumbersAttemptResult,
} from '../game/numbers';
import { submitDailyResult } from '../services/dailyResultService';
import type { AppTextState } from '../game/types';

type NumbersGameProps = {
  dateKey: string;
  userId: string | null;
  groupId: string | null;
  playerName: string;
  onResultSaved: () => void;
  onStateChange: (state: AppTextState['currentChallenge']) => void;
};

export function NumbersGame({ dateKey, userId, groupId, playerName, onResultSaved, onStateChange }: NumbersGameProps) {
  const challenge = useMemo(() => generateNumbersChallenge(dateKey), [dateKey]);
  const [expression, setExpression] = useState('');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [attempt, setAttempt] = useState<NumbersAttemptResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setExpression('');
    setAttempt(null);
    setSaved(false);
    setStartedAt(Date.now());
  }, [challenge]);

  useEffect(() => {
    onStateChange({
      type: 'numbers',
      target: challenge.target,
      numbers: challenge.numbers,
      expression,
      attempt,
    });
  }, [attempt, challenge.numbers, challenge.target, expression, onStateChange]);

  function evaluate() {
    const result = evaluateNumbersAttempt(expression, challenge);
    setAttempt(result);
    return result;
  }

  async function saveResult() {
    const result = evaluate();
    if (!result.valid || result.value === null || result.distance === null || saved) return;

    const durationMs = Date.now() - startedAt;
    const operationsCount = countExpressionOperations(expression);
    const response = await submitDailyResult({
      userId,
      groupId,
      playerName,
      challengeDate: dateKey,
      gameType: 'numbers',
      difficulty: null,
      score: result.score,
      durationMs,
      operationsCount,
      metadata: {
        target: challenge.target,
        numbers: challenge.numbers,
        expression,
        value: result.value,
        distance: result.distance,
        operationsCount,
      },
    });

    if (!response.error) {
      setSaved(true);
      onResultSaved();
    }
  }

  return (
    <section className="game-panel" aria-label="Cifras diario">
      <div className="game-header">
        <div>
          <p className="eyebrow">Prueba de cifras</p>
          <h2>Objetivo {challenge.target}</h2>
        </div>
        <div className="metric-strip">
          <span>
            <small>Puntos</small>
            <strong>{attempt?.score ?? 0}</strong>
          </span>
          <span>
            <small>Distancia</small>
            <strong>{attempt?.distance ?? '-'}</strong>
          </span>
        </div>
      </div>

      <div className="tile-row" aria-label="Números disponibles">
        {challenge.numbers.map((number, index) => (
          <span key={`${number}-${index}`} className="number-tile">
            {number}
          </span>
        ))}
      </div>

      <label className="field-label" htmlFor="numbers-expression">
        Expresión
      </label>
      <div className="inline-form">
        <input
          id="numbers-expression"
          value={expression}
          placeholder="(100 x 7) + 25 + 8 - 2"
          onChange={(event) => setExpression(event.target.value)}
        />
        <button className="icon-button" type="button" onClick={evaluate}>
          Calcular
        </button>
        <button className="icon-button primary" type="button" onClick={saveResult}>
          <Save size={18} />
          <span>Guardar</span>
        </button>
      </div>

      <p className={attempt?.valid ? 'game-message success' : 'game-message'}>
        {attempt?.message ?? 'Usa cada número como máximo una vez. Solo cuentan resultados enteros.'}
      </p>

      <details className="solution-details">
        <summary>Solución generada</summary>
        <ol>
          {challenge.solutionSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
