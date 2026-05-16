import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import type { DailyResultFilter } from '../services/dailyResultService';
import type { GameType, JsonValue } from '../game/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_PROJECT_URL = 'https://supabase.com/dashboard/project/pxrglryplngacswthrhv';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type Database = {
  public: {
    Tables: {
      daily_results: {
        Row: {
          id: string;
          player_name: string;
          challenge_date: string;
          game_type: GameType;
          difficulty: number | null;
          score: number;
          duration_ms: number;
          metadata: Record<string, JsonValue>;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_name: string;
          challenge_date: string;
          game_type: GameType;
          difficulty?: number | null;
          score: number;
          duration_ms?: number;
          metadata?: Record<string, JsonValue>;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type DailyResultRow = Database['public']['Tables']['daily_results']['Row'];
export type DailyResultRowInsert = Database['public']['Tables']['daily_results']['Insert'];

export type ServiceError = Pick<PostgrestError, 'message'>;

export type ServiceResult<T> = {
  data: T;
  error: ServiceError | null;
};

type SupabaseClientInstance = SupabaseClient<Database, 'public'>;

let supabaseClient: SupabaseClientInstance | null = null;

function getSupabaseClient() {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database, 'public'>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseClient;
}

export async function fetchDailyResultRows(
  filter: DailyResultFilter,
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
    .limit(10);

  if (filter.difficulty !== undefined) {
    request =
      filter.difficulty === null ? request.is('difficulty', null) : request.eq('difficulty', filter.difficulty);
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
