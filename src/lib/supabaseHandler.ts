import {
  createClient,
  type AuthChangeEvent,
  type PostgrestError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { GameType, JsonValue } from '../game/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const AUTH_REDIRECT_URL = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name: string;
          avatar_url?: string | null;
        };
        Update: {
          email?: string | null;
          display_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          invite_code?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
        };
        Update: {
          role?: 'owner' | 'admin' | 'member';
        };
        Relationships: [];
      };
      group_messages: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          author_name: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          author_name: string;
          body: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      daily_results: {
        Row: {
          id: string;
          user_id: string | null;
          group_id: string | null;
          player_name: string;
          challenge_date: string;
          game_type: GameType;
          difficulty: number | null;
          score: number;
          duration_ms: number;
          operations_count: number | null;
          word_length: number | null;
          metadata: Record<string, JsonValue>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          group_id?: string | null;
          player_name: string;
          challenge_date: string;
          game_type: GameType;
          difficulty?: number | null;
          score: number;
          duration_ms?: number;
          operations_count?: number | null;
          word_length?: number | null;
          metadata?: Record<string, JsonValue>;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_group: {
        Args: { group_name: string; group_description?: string | null };
        Returns: Database['public']['Tables']['groups']['Row'];
      };
      join_group_by_invite: {
        Args: { target_invite_code: string };
        Returns: Database['public']['Tables']['groups']['Row'];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileRowInsert = Database['public']['Tables']['profiles']['Insert'];
export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type GroupRowInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupMemberRow = Database['public']['Tables']['group_members']['Row'];
export type GroupMessageRow = Database['public']['Tables']['group_messages']['Row'];
export type GroupMessageRowInsert = Database['public']['Tables']['group_messages']['Insert'];
export type DailyResultRow = Database['public']['Tables']['daily_results']['Row'];
export type DailyResultRowInsert = Database['public']['Tables']['daily_results']['Insert'];

export type DailyResultRowFilter = {
  challengeDate: string;
  gameType: GameType;
  difficulty?: number | null;
  groupId?: string | null;
};

export type ServiceError = Pick<PostgrestError, 'message'> | { message: string };

export type ServiceResult<T> = {
  data: T;
  error: ServiceError | null;
};

type SupabaseClientInstance = SupabaseClient<Database, 'public'>;

let supabaseClient: SupabaseClientInstance | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database, 'public'>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

export async function getAuthSession(): Promise<ServiceResult<Session | null>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: 'Supabase is not configured; using local demo session.' } };
  }

  const { data, error } = await client.auth.getSession();
  return { data: data.session, error };
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const client = getSupabaseClient();
  if (!client) return { unsubscribe: () => undefined };

  const { data } = client.auth.onAuthStateChange(callback);
  return data.subscription;
}

export async function sendEmailOtp(email: string): Promise<ServiceResult<null>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
  return { data: null, error };
}

function getAuthRedirectUrl() {
  const currentOrigin = window.location.origin;
  const configuredUrl = AUTH_REDIRECT_URL?.trim();
  const isLocalOrigin = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  return (isLocalOrigin && configuredUrl ? configuredUrl : currentOrigin).replace(/\/$/, '');
}

export async function verifyEmailOtp(email: string, token: string): Promise<ServiceResult<Session | null>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }

  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  return { data: data.session, error };
}

export async function signOut(): Promise<ServiceResult<null>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: null };

  const { error } = await client.auth.signOut();
  return { data: null, error };
}

export async function fetchProfileRow(userId: string): Promise<ServiceResult<ProfileRow | null>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: { message: 'Supabase is not configured.' } };

  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data: data ?? null, error };
}

export async function upsertProfileRow(record: ProfileRowInsert): Promise<ServiceResult<ProfileRow | null>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: { message: 'Supabase is not configured.' } };

  const { data, error } = await client.from('profiles').upsert(record).select().single();
  return { data: data ?? null, error };
}

export async function fetchGroupRowsForUser(userId: string): Promise<
  ServiceResult<Array<{ group: GroupRow; membership: GroupMemberRow }>>
> {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: { message: 'Supabase is not configured.' } };

  const memberships = await client.from('group_members').select('*').eq('user_id', userId);
  if (memberships.error) return { data: [], error: memberships.error };

  const groupIds = memberships.data.map((membership) => membership.group_id);
  if (groupIds.length === 0) return { data: [], error: null };

  const groups = await client.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: true });
  if (groups.error) return { data: [], error: groups.error };

  const data = groups.data.map((group) => ({
    group,
    membership: memberships.data.find((membership) => membership.group_id === group.id)!,
  }));
  return { data, error: null };
}

export async function createGroupRow(name: string, description: string | null): Promise<ServiceResult<GroupRow | null>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: { message: 'Supabase is not configured.' } };

  const { data, error } = await client.rpc('create_group', {
    group_name: name,
    group_description: description,
  });
  return { data: data ?? null, error };
}

export async function joinGroupByInviteCode(inviteCode: string): Promise<ServiceResult<GroupRow | null>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: { message: 'Supabase is not configured.' } };

  const { data, error } = await client.rpc('join_group_by_invite', {
    target_invite_code: inviteCode,
  });
  return { data: data ?? null, error };
}

export async function fetchGroupMessageRows(groupId: string): Promise<ServiceResult<GroupMessageRow[]>> {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: { message: 'Supabase is not configured.' } };

  const { data, error } = await client
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(100);

  return { data: data ?? [], error };
}

export async function insertGroupMessageRow(
  record: GroupMessageRowInsert,
): Promise<ServiceResult<GroupMessageRow | null>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: { message: 'Supabase is not configured.' } };

  const { data, error } = await client.from('group_messages').insert(record).select().single();
  return { data: data ?? null, error };
}

export async function fetchDailyResultRows(
  filter: DailyResultRowFilter,
): Promise<ServiceResult<DailyResultRow[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: 'Supabase is not configured; using local results.' } };
  }

  let request = client
    .from('daily_results')
    .select('*')
    .eq('challenge_date', filter.challengeDate)
    .eq('game_type', filter.gameType)
    .order('score', { ascending: false })
    .order('duration_ms', { ascending: true })
    .order('operations_count', { ascending: true, nullsFirst: false })
    .order('word_length', { ascending: false, nullsFirst: false })
    .limit(10);

  if (filter.difficulty !== undefined) {
    request =
      filter.difficulty === null ? request.is('difficulty', null) : request.eq('difficulty', filter.difficulty);
  }

  if (filter.groupId !== undefined) {
    request = filter.groupId === null ? request.is('group_id', null) : request.eq('group_id', filter.groupId);
  }

  const { data, error } = await request;
  return {
    data: data ?? [],
    error,
  };
}

export async function insertDailyResultRow(
  record: DailyResultRowInsert,
): Promise<ServiceResult<DailyResultRow | null>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: 'Supabase is not configured; result saved locally.' } };
  }

  const { data, error } = await client.from('daily_results').insert(record).select().single();
  return {
    data: data ?? null,
    error,
  };
}
