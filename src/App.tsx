import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { DailyLeaderboard } from './components/DailyLeaderboard';
import { GameTabs } from './components/GameTabs';
import { LettersGame } from './components/LettersGame';
import { LevelSelector } from './components/LevelSelector';
import { NumbersGame } from './components/NumbersGame';
import { SudokuGame } from './components/SudokuGame';
import { formatDailyDate, getLocalDateKey } from './game/daily';
import type { AppTextState, GameType } from './game/types';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

const playerName = 'Jugador';

function App() {
  const [activeGame, setActiveGame] = useState<GameType>('sudoku');
  const [sudokuLevel, setSudokuLevel] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState<AppTextState['currentChallenge']>({});
  const dateKey = useMemo(() => getLocalDateKey(), []);
  const prettyDate = useMemo(() => formatDailyDate(dateKey), [dateKey]);

  const handleResultSaved = useCallback(() => {
    setStatusMessage('Resultado guardado en este dispositivo.');
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const textState: AppTextState = {
      dateKey,
      activeGame,
      selectedSudokuLevel: sudokuLevel,
      selectedGroupId: null,
      currentChallenge,
    };
    window.render_game_to_text = () => JSON.stringify(textState);
    window.advanceTime = async () => undefined;

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [activeGame, currentChallenge, dateKey, sudokuLevel]);

  return (
    <main className="app-shell public-app">
      <header className="topbar" aria-label="Juego diario">
        <div>
          <p className="eyebrow">CleverGames</p>
          <h1>Diario de Sudoku, Cifras y Letras</h1>
        </div>
        <nav className="status-row" aria-label="Fecha del juego">
          <span className="status-pill">
            <CalendarDays size={16} aria-hidden="true" />
            {prettyDate}
          </span>
        </nav>
      </header>

      <motion.section
        className="workspace social-workspace"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <section className="play-area" aria-label="Juego diario">
          <div className="control-bar">
            <GameTabs activeGame={activeGame} onChange={setActiveGame} />
            <div className="active-group-banner">
              <span>Modo público</span>
              <strong>Juega sin registro</strong>
            </div>
          </div>

          {activeGame === 'sudoku' ? <LevelSelector level={sudokuLevel} onChange={setSudokuLevel} /> : null}

          {activeGame === 'sudoku' ? (
            <SudokuGame
              dateKey={dateKey}
              level={sudokuLevel}
              userId={null}
              groupIds={[]}
              playerName={playerName}
              onResultSaved={handleResultSaved}
              onStateChange={setCurrentChallenge}
            />
          ) : null}

          {activeGame === 'numbers' ? (
            <NumbersGame
              dateKey={dateKey}
              userId={null}
              groupIds={[]}
              playerName={playerName}
              onResultSaved={handleResultSaved}
              onStateChange={setCurrentChallenge}
            />
          ) : null}

          {activeGame === 'letters' ? (
            <LettersGame
              dateKey={dateKey}
              userId={null}
              groupIds={[]}
              playerName={playerName}
              onResultSaved={handleResultSaved}
              onStateChange={setCurrentChallenge}
            />
          ) : null}
        </section>

        <aside className="social-rail" aria-label="Clasificación local">
          <section className="social-card" aria-label="Modo público">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Acceso público</p>
                <h2>Jugar sin cuenta</h2>
              </div>
            </div>
            <p className="help-copy">
              Temporalmente la web funciona sin login, base de datos, grupos ni chat. Los resultados se guardan solo en este
              navegador.
            </p>
          </section>
          {statusMessage ? <p className="service-message">{statusMessage}</p> : null}
          <DailyLeaderboard
            activeGame={activeGame}
            dateKey={dateKey}
            sudokuLevel={sudokuLevel}
            groupId={null}
            groupName={null}
            refreshToken={refreshToken}
            enabled
          />
        </aside>
      </motion.section>
    </main>
  );
}

export default App;
