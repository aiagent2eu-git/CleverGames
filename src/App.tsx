import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Gamepad2, Hash, LockKeyhole, Trophy, UsersRound } from 'lucide-react';
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

type AppView = 'play' | 'groups';

const SELECTED_GROUP_KEY_PREFIX = 'clevergames.selectedGroupId.';

const groupRoleLabels = {
  owner: 'Creador',
  admin: 'Admin',
  member: 'Miembro',
} as const;

const gameLabels: Record<GameType, string> = {
  sudoku: 'Sudoku',
  numbers: 'Cifras',
  letters: 'Letras',
};

function getSelectedGroupKey(profileId: string) {
  return `${SELECTED_GROUP_KEY_PREFIX}${profileId}`;
}

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
  const [activeView, setActiveView] = useState<AppView>('play');
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
  const authenticatedProfileId = authenticatedProfile?.id ?? null;

  const selectGroup = useCallback(
    (groupId: string | null) => {
      setSelectedGroupId(groupId);
      if (!authenticatedProfileId) return;

      const key = getSelectedGroupKey(authenticatedProfileId);
      if (groupId) localStorage.setItem(key, groupId);
      else localStorage.removeItem(key);
    },
    [authenticatedProfileId],
  );

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
    if (selectedGroupId && groups.length > 0 && !groups.some((group) => group.id === selectedGroupId)) {
      selectGroup(null);
    }
  }, [groups, selectGroup, selectedGroupId]);

  useEffect(() => {
    if (!authenticatedProfileId) {
      setSelectedGroupId(null);
      return;
    }

    if (selectedGroupId || groups.length === 0) return;

    const storedGroupId = localStorage.getItem(getSelectedGroupKey(authenticatedProfileId));
    if (storedGroupId && groups.some((group) => group.id === storedGroupId)) {
      setSelectedGroupId(storedGroupId);
    }
  }, [authenticatedProfileId, groups, selectedGroupId]);

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
        selectGroup(result.data.id);
        setMessages([]);
        setRefreshToken((value) => value + 1);
      }
    },
    [authenticatedProfile, selectGroup],
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
        selectGroup(result.data.id);
        setMessages([]);
        setRefreshToken((value) => value + 1);
      }
    },
    [authenticatedProfile, selectGroup],
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
  const selectedGameLabel = activeGame === 'sudoku' ? `${gameLabels[activeGame]} nivel ${sudokuLevel}` : gameLabels[activeGame];
  const selectedGroupRole = selectedGroup?.role ? groupRoleLabels[selectedGroup.role] : 'Miembro';

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

      <nav className="section-tabs" aria-label="Secciones principales">
        <button
          className={activeView === 'play' ? 'section-tab active' : 'section-tab'}
          type="button"
          onClick={() => setActiveView('play')}
        >
          <Gamepad2 size={18} />
          <span>Jugar</span>
        </button>
        <button
          className={activeView === 'groups' ? 'section-tab active' : 'section-tab'}
          type="button"
          onClick={() => setActiveView('groups')}
        >
          <UsersRound size={18} />
          <span>Grupos</span>
        </button>
      </nav>

      {activeView === 'play' ? (
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

          <aside className="social-rail" aria-label="Cuenta y clasificación">
            <AuthPanel
              authState={authState}
              onSendLoginCode={sendLoginCode}
              onLogout={() => {
                void logout().then(refreshAuth);
              }}
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
          </aside>
        </motion.section>
      ) : (
        <motion.section
          className="group-dashboard"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <section className="groups-column" aria-label="Listado de grupos">
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
              onSelectGroup={selectGroup}
              onCreateGroup={handleCreateGroup}
              onJoinGroup={handleJoinGroup}
            />
            {statusMessage ? <p className="service-message">{statusMessage}</p> : null}
          </section>

          <section className="group-detail" aria-label="Detalle del grupo">
            <section className="social-card group-score-controls" aria-label="Filtro de puntuaciones de grupo">
              <div className={selectedGroup ? 'group-hero active' : 'group-hero'}>
                <div className="group-hero-copy">
                  <p className="eyebrow">{selectedGroup ? 'Grupo activo' : 'Grupos'}</p>
                  <h2>{selectedGroup ? selectedGroup.name : 'Elige un grupo'}</h2>
                  <p>
                    {selectedGroup
                      ? selectedGroup.description || 'Chat, puntuaciones diarias y retos compartidos para el grupo.'
                      : 'Selecciona un grupo de la izquierda para abrir su chat y su clasificación diaria.'}
                  </p>
                </div>
                {selectedGroup ? (
                  <div className="group-hero-meta" aria-label="Datos del grupo">
                    <span className="invite-chip">
                      <Hash size={16} aria-hidden="true" />
                      {selectedGroup.inviteCode}
                    </span>
                    <span className="role-chip">{selectedGroupRole}</span>
                  </div>
                ) : (
                  <div className="group-hero-empty" aria-hidden="true">
                    <UsersRound size={38} />
                  </div>
                )}
              </div>
              <div className="group-controls-body">
                <div className="group-filter-heading">
                  <div>
                    <p className="eyebrow">Puntuaciones del día</p>
                    <strong>{selectedGameLabel}</strong>
                  </div>
                  {selectedGroup ? (
                    <span className="live-scope">
                      <Trophy size={16} aria-hidden="true" />
                      Competición privada
                    </span>
                  ) : null}
                </div>
                <GameTabs activeGame={activeGame} onChange={setActiveGame} />
                {activeGame === 'sudoku' ? <LevelSelector level={sudokuLevel} onChange={setSudokuLevel} /> : null}
              </div>
            </section>
            {selectedGroup ? (
              <DailyLeaderboard
                activeGame={activeGame}
                dateKey={dateKey}
                sudokuLevel={sudokuLevel}
                groupId={selectedGroupId}
                groupName={selectedGroup.name}
                refreshToken={refreshToken}
              />
            ) : (
              <section className="social-card empty-group-state" aria-label="Puntuaciones de grupo">
                <p className="eyebrow">Clasificación</p>
                <h2>Sin grupo seleccionado</h2>
                <p>Selecciona o crea un grupo para ver las puntuaciones de ese día.</p>
              </section>
            )}
            <GroupChat
              profile={authenticatedProfile}
              group={selectedGroup}
              messages={messages}
              onSendMessage={handleSendMessage}
              onRefresh={refreshMessages}
            />
          </section>
        </motion.section>
      )}
    </main>
  );
}

export default App;
