import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Database, GitBranch, Rocket } from 'lucide-react';
import { DailyLeaderboard } from './components/DailyLeaderboard';
import { GameTabs } from './components/GameTabs';
import { LettersGame } from './components/LettersGame';
import { LevelSelector } from './components/LevelSelector';
import { NumbersGame } from './components/NumbersGame';
import { SudokuGame } from './components/SudokuGame';
import { formatDailyDate, getLocalDateKey } from './game/daily';
import type { AppTextState, GameType } from './game/types';
import { isSupabaseConfigured } from './lib/supabaseHandler';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

function App() {
  const [activeGame, setActiveGame] = useState<GameType>('sudoku');
  const [sudokuLevel, setSudokuLevel] = useState(1);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('clevergames.playerName') ?? 'Player');
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<AppTextState['currentChallenge']>({});
  const dateKey = useMemo(() => getLocalDateKey(), []);
  const prettyDate = useMemo(() => formatDailyDate(dateKey), [dateKey]);

  const handleResultSaved = useCallback(() => {
    localStorage.setItem('clevergames.playerName', playerName.trim());
    setRefreshToken((value) => value + 1);
  }, [playerName]);

  useEffect(() => {
    const textState: AppTextState = {
      dateKey,
      activeGame,
      selectedSudokuLevel: sudokuLevel,
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
    <main className="app-shell">
      <header className="topbar" aria-label="Estado del proyecto">
        <div>
          <p className="eyebrow">CleverGames</p>
          <h1>Diario de Sudoku, Cifras y Letras</h1>
        </div>
        <nav className="status-row" aria-label="Preparación de plataformas">
          <span className="status-pill">
            <CalendarDays size={16} aria-hidden="true" />
            {prettyDate}
          </span>
          <span className={isSupabaseConfigured ? 'status-pill ready' : 'status-pill'}>
            <Database size={16} aria-hidden="true" />
            {isSupabaseConfigured ? 'Supabase listo' : 'Supabase demo'}
          </span>
          <span className="status-pill">
            <GitBranch size={16} aria-hidden="true" />
            GitHub repo
          </span>
          <span className="status-pill">
            <Rocket size={16} aria-hidden="true" />
            Vercel config
          </span>
        </nav>
      </header>

      <motion.section
        className="workspace"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <section className="play-area" aria-label="Juego diario">
          <div className="control-bar">
            <GameTabs activeGame={activeGame} onChange={setActiveGame} />
            <label className="player-field">
              <span>Jugador</span>
              <input
                value={playerName}
                maxLength={24}
                onChange={(event) => setPlayerName(event.target.value)}
              />
            </label>
          </div>

          {activeGame === 'sudoku' ? <LevelSelector level={sudokuLevel} onChange={setSudokuLevel} /> : null}

          {activeGame === 'sudoku' ? (
            <SudokuGame
              dateKey={dateKey}
              level={sudokuLevel}
              playerName={playerName}
              onResultSaved={handleResultSaved}
              onStateChange={setCurrentChallenge}
            />
          ) : null}

          {activeGame === 'numbers' ? (
            <NumbersGame
              dateKey={dateKey}
              playerName={playerName}
              onResultSaved={handleResultSaved}
              onStateChange={setCurrentChallenge}
            />
          ) : null}

          {activeGame === 'letters' ? (
            <LettersGame
              dateKey={dateKey}
              playerName={playerName}
              onResultSaved={handleResultSaved}
              onStateChange={setCurrentChallenge}
            />
          ) : null}
        </section>

        <DailyLeaderboard
          activeGame={activeGame}
          dateKey={dateKey}
          sudokuLevel={sudokuLevel}
          refreshToken={refreshToken}
        />
      </motion.section>
    </main>
  );
}

export default App;
