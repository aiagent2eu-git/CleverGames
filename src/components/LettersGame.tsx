import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { evaluateLettersAttempt, generateLettersChallenge, type LettersAttemptResult } from '../game/letters';
import { submitDailyResult } from '../services/dailyResultService';
import type { AppTextState } from '../game/types';

type LettersGameProps = {
  dateKey: string;
  userId: string | null;
  groupIds: string[];
  playerName: string;
  onResultSaved: () => void;
  onStateChange: (state: AppTextState['currentChallenge']) => void;
};

export function LettersGame({ dateKey, userId, groupIds, playerName, onResultSaved, onStateChange }: LettersGameProps) {
  const challenge = useMemo(() => generateLettersChallenge(dateKey), [dateKey]);
  const [word, setWord] = useState('');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [attempt, setAttempt] = useState<LettersAttemptResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWord('');
    setAttempt(null);
    setSaved(false);
    setStartedAt(Date.now());
  }, [challenge]);

  useEffect(() => {
    onStateChange({
      type: 'letters',
      letters: challenge.letters,
      word,
      attempt,
      bestWords: challenge.bestWords,
    });
  }, [attempt, challenge.bestWords, challenge.letters, onStateChange, word]);

  function evaluate() {
    const result = evaluateLettersAttempt(word, challenge);
    setAttempt(result);
    return result;
  }

  async function saveResult() {
    const result = evaluate();
    if (!result.valid || saved) return;

    const durationMs = Date.now() - startedAt;
    const response = await submitDailyResult({
      userId,
      groupIds,
      playerName,
      challengeDate: dateKey,
      gameType: 'letters',
      difficulty: null,
      score: result.score,
      durationMs,
      wordLength: result.normalizedWord.length,
      metadata: {
        letters: challenge.letters,
        word: result.normalizedWord,
      },
    });

    if (!response.error) {
      setSaved(true);
      onResultSaved();
    }
  }

  return (
    <section className="game-panel" aria-label="Letras diario">
      <div className="game-header">
        <div>
          <p className="eyebrow">Prueba de letras</p>
          <h2>Palabra más larga</h2>
        </div>
        <div className="metric-strip">
          <span>
            <small>Puntos</small>
            <strong>{attempt?.score ?? 0}</strong>
          </span>
          <span>
            <small>Letras</small>
            <strong>{attempt?.normalizedWord.length ?? 0}</strong>
          </span>
        </div>
      </div>

      <div className="tile-row" aria-label="Letras disponibles">
        {challenge.letters.map((letter, index) => (
          <span key={`${letter}-${index}`} className="letter-tile">
            {letter}
          </span>
        ))}
      </div>

      <label className="field-label" htmlFor="letters-word">
        Palabra
      </label>
      <div className="inline-form">
        <input
          id="letters-word"
          value={word}
          maxLength={9}
          placeholder="Escribe tu palabra"
          onChange={(event) => setWord(event.target.value)}
        />
        <button className="icon-button" type="button" onClick={evaluate}>
          Validar
        </button>
        <button className="icon-button primary" type="button" onClick={saveResult}>
          <Save size={18} />
          <span>Guardar</span>
        </button>
      </div>

      <p className={attempt?.valid ? 'game-message success' : 'game-message'}>
        {attempt?.message ?? 'Cada letra puede usarse tantas veces como aparece.'}
      </p>

      <details className="solution-details">
        <summary>Mejores palabras locales</summary>
        <p>{challenge.bestWords.join(', ')}</p>
      </details>
    </section>
  );
}
