import type { Session } from '@supabase/supabase-js';
import {
  fetchProfileRow,
  getAuthSession,
  isSupabaseConfigured,
  onAuthStateChange,
  sendEmailOtp,
  signOut,
  upsertProfileRow,
  verifyEmailOtp,
} from '../lib/supabaseHandler';
import type { UserProfile } from '../game/types';

const LOCAL_PROFILE_KEY = 'clevergames.localProfile';

export type AuthState = {
  profile: UserProfile | null;
  session: Session | null;
  isDemo: boolean;
};

export async function getCurrentAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return {
      profile: getLocalProfile(),
      session: null,
      isDemo: true,
    };
  }

  const sessionResult = await getAuthSession();
  const session = sessionResult.data;
  if (!session?.user) {
    return {
      profile: null,
      session: null,
      isDemo: false,
    };
  }

  const profile = await ensureProfileFromSession(session);
  return {
    profile,
    session,
    isDemo: false,
  };
}

export function listenAuthChanges(callback: () => void) {
  if (!isSupabaseConfigured) return () => undefined;
  const subscription = onAuthStateChange(() => {
    callback();
  });
  return () => subscription.unsubscribe();
}

export async function sendLoginCode(email: string) {
  return sendEmailOtp(email.trim());
}

export async function verifyLoginCode(email: string, token: string) {
  return verifyEmailOtp(email.trim(), token.trim());
}

export async function logout() {
  if (!isSupabaseConfigured) return { data: null, error: null };
  return signOut();
}

export function updateLocalProfileName(displayName: string) {
  const profile = getLocalProfile();
  const next = {
    ...profile,
    displayName: displayName.trim().slice(0, 40) || 'Player',
  };
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(next));
  return next;
}

async function ensureProfileFromSession(session: Session): Promise<UserProfile> {
  const user = session.user;
  const existing = await fetchProfileRow(user.id);

  if (existing.data) {
    return {
      id: existing.data.id,
      email: existing.data.email,
      displayName: existing.data.display_name,
      avatarUrl: existing.data.avatar_url,
    };
  }

  const metadata = user.user_metadata;
  const displayName =
    String(metadata.full_name ?? metadata.name ?? user.email?.split('@')[0] ?? 'Player')
      .trim()
      .slice(0, 40) || 'Player';

  const created = await upsertProfileRow({
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
    avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
  });

  if (created.data) {
    return {
      id: created.data.id,
      email: created.data.email,
      displayName: created.data.display_name,
      avatarUrl: created.data.avatar_url,
    };
  }

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    avatarUrl: null,
  };
}

function getLocalProfile(): UserProfile {
  const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      localStorage.removeItem(LOCAL_PROFILE_KEY);
    }
  }

  const profile: UserProfile = {
    id: 'local-user',
    email: null,
    displayName: localStorage.getItem('clevergames.playerName') ?? 'Player',
    avatarUrl: null,
  };
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
