import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, LockKeyhole } from 'lucide-react';
import { AuthPanel } from './components/AuthPanel';
import { DailyLeaderboard } from './components/DailyLeaderboard';
import { GameTabs } from './components/GameTabs';
import { GroupChat } from './components/GroupChat';
import { GroupsPanel } from './components/GroupsPanel';
import { LettersGame } from './components/LettersGame';
import { LevelSelector } from './components/LevelSelector';
import { NumbersGame } from './components/NumbersGame';
import { SudokuGame } from './components/SudokuGame';
import { formatDailyDate, getLocalDateKey } from './game/daily';
import type { AppTextState, CompetitionGroup, GameType, GroupMessage } from './game/types';
import { isSupabaseConfigured } from './lib/supabaseHandler';
import {
  getCurrentAuthState,
  listenAuthChanges,
  logout,
  sendLoginCode,
  type AuthState,
} from './services/authService';
import { createGroup, getGroupMessages, getGroupsForProfile, joinGroup, sendGroupMessage } from './services/groupService';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

const initialAuthState: AuthState = {
  profile: null,
  session: null,
  isDemo: !isSupabaseConfigured,
};

function App() {
  const [activeGame, setActiveGame] = useState<GameType>('sudoku');
  const [sudokuLevel, setSudokuLevel] = useState(1);
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('clevergames.playerName') ?? 'Player');
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState<AppTextState['currentChallenge']>({});
  const dateKey = useMemo(() => getLocalDateKey(), []);
  const prettyDate = useMemo(() => formatDailyDate(dateKey), [dateKey]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  const authenticatedProfile = authState.isDemo ? null : authState.profile;

  const refreshAuth = useCallback(async () => {
    const next = await getCurrentAuthState();
    setAuthState(next);
    if (next.profile) {
      setPlayerName(next.profile.displayName);
      localStorage.setItem('clevergames.playerName', next.profile.displayName);
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    const result = await getGroupsForProfile(authenticatedProfile);
    setGroups(result.data);
    if (result.error) setStatusMessage(result.error.message);
  }, [authenticatedProfile]);

  const refreshMessages = useCallback(async () => {
    const result = await getGroupMessages(selectedGroupId);
    setMessages(result.data);
    if (result.error) setStatusMessage(result.error.message);
  }, [selectedGroupId]);

  useEffect(() => {
    void refreshAuth();
    return listenAuthChanges(() => {
      void refreshAuth();
    });
  }, [refreshAuth]);

  useEffect(() => {
    void refreshGroups();
  }, [refreshGroups]);

  useEffect(() => {
    if (selectedGroupId && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(null);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  const handleResultSaved = useCallback(() => {
    localStorage.setItem('clevergames.playerName', playerName.trim());
    setStatusMessage(selectedGroup ? `Resultado guardado en ${selectedGroup.name}.` : 'Resultado guardado.');
    setRefreshToken((value) => value + 1);
  }, [playerName, selectedGroup]);

  const handleCreateGroup = useCallback(
    async (name: string, description: string) => {
      if (!authenticatedProfile) return;
      const result = await createGroup(authenticatedProfile, { name, description });
      if (result.error) {
        setStatusMessage(result.error.message);
        return;
      }
      if (result.data) {
        setStatusMessage(`Grupo creado. Código: ${result.data.inviteCode}`);
        setGroups((current) => [result.data!, ...current.filter((group) => group.id !== result.data!.id)]);
        setSelectedGroupId(result.data.id);
        await refreshGroups();
      }
    },
    [authenticatedProfile, refreshGroups],
  );

  const handleJoinGroup = useCallback(
    async (inviteCode: string) => {
      if (!authenticatedProfile) return;
      const result = await joinGroup(authenticatedProfile, inviteCode);
      if (result.error) {
        setStatusMessage(result.error.message);
        return;
      }
      if (result.data) {
        setStatusMessage(`Te has unido a ${result.data.name}.`);
        setGroups((current) => [result.data!, ...current.filter((group) => group.id !== result.data!.id)]);
        setSelectedGroupId(result.data.id);
        await refreshGroups();
      }
    },
    [authenticatedProfile, refreshGroups],
  );

  const handleSendMessage = useCallback(
    async (body: string) => {
      if (!authenticatedProfile || !selectedGroupId) return;
      const result = await sendGroupMessage(authenticatedProfile, selectedGroupId, body);
      if (result.error) {
        setStatusMessage(result.error.message);
        return;
      }
      await refreshMessages();
    },
    [authenticatedProfile, refreshMessages, selectedGroupId],
  );

  useEffect(() => {
    const textState: AppTextState = {
      dateKey,
      activeGame,
      selectedSudokuLevel: sudokuLevel,
      selectedGroupId,
      currentChallenge,
    };
    window.render_game_to_text = () => JSON.stringify(textState);
    window.advanceTime = async () => undefined;

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [activeGame, currentChallenge, dateKey, selectedGroupId, sudokuLevel]);

  const userId = authenticatedProfile?.id ?? null;
  const canPlay = Boolean(authenticatedProfile);
  const effectivePlayerName = playerName.trim() || authenticatedProfile?.displayName || 'Player';

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Estado del proyecto">
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
          {canPlay ? (
            <>
              <div className="control-bar">
                <GameTabs activeGame={activeGame} onChange={setActiveGame} />
                {selectedGroup ? (
                  <div className="active-group-banner">
                    <span>Grupo activo</span>
                    <strong>{selectedGroup.name}</strong>
                  </div>
                ) : (
                  <div className="active-group-banner">
                    <span>Resultados</span>
                    <strong>Personales</strong>
                  </div>
                )}
              </div>

              {activeGame === 'sudoku' ? <LevelSelector level={sudokuLevel} onChange={setSudokuLevel} /> : null}

              {activeGame === 'sudoku' ? (
                <SudokuGame
                  dateKey={dateKey}
                  level={sudokuLevel}
                  userId={userId}
                  groupId={selectedGroupId}
                  playerName={effectivePlayerName}
                  onResultSaved={handleResultSaved}
                  onStateChange={setCurrentChallenge}
                />
              ) : null}

              {activeGame === 'numbers' ? (
                <NumbersGame
                  dateKey={dateKey}
                  userId={userId}
                  groupId={selectedGroupId}
                  playerName={effectivePlayerName}
                  onResultSaved={handleResultSaved}
                  onStateChange={setCurrentChallenge}
                />
              ) : null}

              {activeGame === 'letters' ? (
                <LettersGame
                  dateKey={dateKey}
                  userId={userId}
                  groupId={selectedGroupId}
                  playerName={effectivePlayerName}
                  onResultSaved={handleResultSaved}
                  onStateChange={setCurrentChallenge}
                />
              ) : null}
            </>
          ) : (
            <section className="locked-play" aria-label="Juego bloqueado">
              <LockKeyhole size={32} aria-hidden="true" />
              <div>
                <p className="eyebrow">Acceso privado</p>
                <h2>Autentícate para jugar</h2>
                <p>Entra con tu email para desbloquear los retos diarios y guardar tus resultados.</p>
              </div>
            </section>
          )}
        </section>

        <aside className="social-rail" aria-label="Social y clasificación">
          <AuthPanel
            authState={authState}
            onSendLoginCode={sendLoginCode}
            onLogout={() => {
              void logout().then(refreshAuth);
            }}
          />
          <GroupsPanel
            profile={authenticatedProfile}
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
          />
          {statusMessage ? <p className="service-message">{statusMessage}</p> : null}
          <DailyLeaderboard
            activeGame={activeGame}
            dateKey={dateKey}
            sudokuLevel={sudokuLevel}
            groupId={selectedGroupId}
            groupName={selectedGroup?.name ?? null}
            refreshToken={refreshToken}
          />
          <GroupChat
            profile={authenticatedProfile}
            group={selectedGroup}
            messages={messages}
            onSendMessage={handleSendMessage}
            onRefresh={refreshMessages}
          />
        </aside>
      </motion.section>
    </main>
  );
}

export default App;
