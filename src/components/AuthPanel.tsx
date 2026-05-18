import { LogIn, LogOut, UserRound } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseHandler';
import type { AuthState } from '../services/authService';

type AuthPanelProps = {
  authState: AuthState;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function AuthPanel({ authState, playerName, onPlayerNameChange, onLogin, onLogout }: AuthPanelProps) {
  const profile = authState.profile;

  return (
    <section className="social-card" aria-label="Cuenta de jugador">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h2>{profile ? profile.displayName : 'Google login'}</h2>
        </div>
        <UserRound size={22} aria-hidden="true" />
      </div>

      {profile?.avatarUrl ? <img className="avatar" src={profile.avatarUrl} alt="" /> : null}
      {profile?.email ? <p className="muted-line">{profile.email}</p> : null}

      {authState.isDemo ? (
        <label className="stacked-field">
          <span>Nombre local</span>
          <input value={playerName} maxLength={40} onChange={(event) => onPlayerNameChange(event.target.value)} />
        </label>
      ) : null}

      <p className="help-copy">
        {isSupabaseConfigured
          ? 'Los grupos y resultados se asocian a tu usuario de Google.'
          : 'Modo local. Las credenciales reales van en .env.local y no se suben a Git.'}
      </p>

      {isSupabaseConfigured ? (
        profile ? (
          <button className="icon-button" type="button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        ) : (
          <button className="icon-button primary" type="button" onClick={onLogin}>
            <LogIn size={18} />
            <span>Entrar con Google</span>
          </button>
        )
      ) : null}
    </section>
  );
}
