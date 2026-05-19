import { useState } from 'react';
import { LogIn, LogOut, Mail, UserRound } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseHandler';
import type { AuthState } from '../services/authService';

type AuthActionResult = Promise<{ error: { message: string } | null }>;

type AuthPanelProps = {
  authState: AuthState;
  onSendLoginCode: (email: string) => AuthActionResult;
  onVerifyLoginCode: (email: string, token: string) => AuthActionResult;
  onLogout: () => void;
};

export function AuthPanel({
  authState,
  onSendLoginCode,
  onVerifyLoginCode,
  onLogout,
}: AuthPanelProps) {
  const profile = authState.isDemo ? null : authState.profile;
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail.includes('@')) {
      setMessage('Escribe un email válido.');
      return;
    }

    setIsBusy(true);
    const result = await onSendLoginCode(normalizedEmail);
    setIsBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setCodeSent(true);
    setMessage('Te hemos enviado un código o enlace al email.');
  };

  const handleVerifyCode = async () => {
    if (token.trim().length < 6) {
      setMessage('Escribe el código completo.');
      return;
    }

    setIsBusy(true);
    const result = await onVerifyLoginCode(email, token);
    setIsBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage('');
  };

  return (
    <section className="social-card" aria-label="Cuenta de jugador">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h2>{profile ? profile.displayName : 'Login por email'}</h2>
        </div>
        <UserRound size={22} aria-hidden="true" />
      </div>

      {profile?.avatarUrl ? <img className="avatar" src={profile.avatarUrl} alt="" /> : null}
      {profile?.email ? <p className="muted-line">{profile.email}</p> : null}

      <p className="help-copy">
        {isSupabaseConfigured
          ? 'Los grupos y resultados se asocian a tu email.'
          : 'Configura Supabase en .env.local para habilitar el acceso por email.'}
      </p>

      {isSupabaseConfigured ? (
        profile ? (
          <button className="icon-button" type="button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        ) : (
          <div className="auth-form">
            <label className="stacked-field">
              <span>Email</span>
              <input
                value={email}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {codeSent ? (
              <label className="stacked-field">
                <span>Código</span>
                <input
                  value={token}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  onChange={(event) => setToken(event.target.value)}
                />
              </label>
            ) : null}
            {message ? <p className="muted-line">{message}</p> : null}
            <button
              className="icon-button primary"
              type="button"
              disabled={isBusy}
              onClick={codeSent ? handleVerifyCode : handleSendCode}
            >
              {codeSent ? <LogIn size={18} /> : <Mail size={18} />}
              <span>{isBusy ? 'Un momento...' : codeSent ? 'Confirmar código' : 'Enviar código'}</span>
            </button>
          </div>
        )
      ) : null}
    </section>
  );
}
