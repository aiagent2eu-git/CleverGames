import {
  createGroupRow,
  deleteGroupRow,
  fetchGroupMessageRows,
  fetchGroupRowsForUser,
  isSupabaseConfigured,
  joinGroupByInviteCode,
  leaveGroupRow,
  sendGroupMessageRow,
} from '../lib/supabaseHandler';
import type { CompetitionGroup, GroupMessage, UserProfile } from '../game/types';

const LOCAL_GROUPS_KEY = 'clevergames.localGroups';
const LOCAL_MESSAGES_KEY = 'clevergames.localGroupMessages';
const GROUP_CACHE_KEY_PREFIX = 'clevergames.groupCache.';

type GroupServiceResult<T> = {
  data: T;
  error: { message: string } | null;
};

export async function getGroupsForProfile(profile: UserProfile | null): Promise<GroupServiceResult<CompetitionGroup[]>> {
  if (!profile) return { data: [], error: null };

  if (!isSupabaseConfigured || profile.id === 'local-user') {
    return { data: getLocalGroups(), error: null };
  }

  const cachedGroups = getCachedGroups(profile.id);
  const result = await fetchGroupRowsForUser(profile.id);
  if (result.error) return { data: cachedGroups, error: normalizeListGroupsError(result.error) };

  const remoteGroups = result.data.map(({ group, membership }) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.owner_id,
    inviteCode: group.invite_code,
    createdAt: group.created_at,
    role: membership.role,
  }));
  const groups = mergeGroups(remoteGroups, cachedGroups);
  saveCachedGroups(profile.id, groups);

  return {
    data: groups,
    error: null,
  };
}

function normalizeListGroupsError(error: { message: string }) {
  if (error.message.includes('Could not find the function public.list_my_groups')) {
    return {
      message: 'Falta actualizar Supabase. Ejecuta sql/20260521-005_list_my_groups_rpc.sql en el SQL Editor.',
    };
  }

  return error;
}

export async function createGroup(
  profile: UserProfile,
  input: { name: string; description?: string },
): Promise<GroupServiceResult<CompetitionGroup | null>> {
  const name = input.name.trim().slice(0, 60);
  if (name.length < 2) return { data: null, error: { message: 'El grupo necesita un nombre.' } };

  if (!isSupabaseConfigured || profile.id === 'local-user') {
    return { data: saveLocalGroup(name, input.description ?? '', profile), error: null };
  }

  const result = await createGroupRow(name, input.description?.trim() || null);

  if (result.error || !result.data) {
    return { data: null, error: normalizeCreateGroupError(result.error) };
  }

  const group: CompetitionGroup = {
    id: result.data.id,
    name: result.data.name,
    description: result.data.description,
    ownerId: result.data.owner_id,
    inviteCode: result.data.invite_code,
    createdAt: result.data.created_at,
    role: 'owner',
  };
  cacheGroup(profile.id, group);

  return { data: group, error: null };
}

function normalizeCreateGroupError(error: { message: string } | null) {
  if (!error) return { message: 'No se pudo crear el grupo.' };

  if (error.message.includes('Could not find the function public.create_group')) {
    return {
      message:
        'Falta actualizar Supabase. Ejecuta sql/20260519-004_repair_create_group_rpc_cache.sql en el SQL Editor.',
    };
  }

  return error;
}

export async function joinGroup(
  profile: UserProfile,
  inviteCode: string,
): Promise<GroupServiceResult<CompetitionGroup | null>> {
  const code = inviteCode.trim().toLowerCase();
  if (!code) return { data: null, error: { message: 'Introduce un código de invitación.' } };

  if (!isSupabaseConfigured || profile.id === 'local-user') {
    const local = getLocalGroups().find((group) => group.inviteCode === code);
    if (!local) return { data: null, error: { message: 'Código local no encontrado.' } };
    return { data: local, error: null };
  }

  const result = await joinGroupByInviteCode(code);
  if (result.error || !result.data) {
    return { data: null, error: result.error ?? { message: 'No se pudo unir al grupo.' } };
  }

  const group: CompetitionGroup = {
    id: result.data.id,
    name: result.data.name,
    description: result.data.description,
    ownerId: result.data.owner_id,
    inviteCode: result.data.invite_code,
    createdAt: result.data.created_at,
    role: 'member',
  };
  cacheGroup(profile.id, group);

  return { data: group, error: null };
}

export async function leaveGroup(
  profile: UserProfile,
  group: CompetitionGroup,
): Promise<GroupServiceResult<CompetitionGroup | null>> {
  if (group.role === 'owner' || group.ownerId === profile.id) {
    return { data: null, error: { message: 'El creador puede eliminar el grupo, no abandonarlo.' } };
  }

  if (!isSupabaseConfigured || profile.id === 'local-user' || group.id.startsWith('local-')) {
    removeLocalGroup(group.id);
    removeCachedGroup(profile.id, group.id);
    return { data: group, error: null };
  }

  const result = await leaveGroupRow(group.id, profile.id);
  if (result.error) return { data: null, error: result.error };

  removeCachedGroup(profile.id, group.id);
  return { data: group, error: null };
}

export async function deleteGroup(
  profile: UserProfile,
  group: CompetitionGroup,
): Promise<GroupServiceResult<CompetitionGroup | null>> {
  if (group.role !== 'owner' && group.ownerId !== profile.id) {
    return { data: null, error: { message: 'Solo el creador puede eliminar el grupo.' } };
  }

  if (!isSupabaseConfigured || profile.id === 'local-user' || group.id.startsWith('local-')) {
    removeLocalGroup(group.id);
    removeCachedGroup(profile.id, group.id);
    return { data: group, error: null };
  }

  const result = await deleteGroupRow(group.id);
  if (result.error) return { data: null, error: result.error };

  removeCachedGroup(profile.id, group.id);
  return { data: group, error: null };
}

export async function getGroupMessages(groupId: string | null): Promise<GroupServiceResult<GroupMessage[]>> {
  if (!groupId) return { data: [], error: null };

  if (!isSupabaseConfigured || groupId.startsWith('local-')) {
    return { data: getLocalMessages(groupId), error: null };
  }

  const result = await fetchGroupMessageRows(groupId);
  if (result.error) return { data: [], error: result.error };

  return {
    data: result.data.map((message) => ({
      id: message.id,
      groupId: message.group_id,
      userId: message.user_id,
      authorName: message.author_name,
      body: message.body,
      createdAt: message.created_at,
    })),
    error: null,
  };
}

export async function sendGroupMessage(
  profile: UserProfile,
  groupId: string,
  body: string,
): Promise<GroupServiceResult<GroupMessage | null>> {
  const cleaned = body.trim().slice(0, 800);
  if (!cleaned) return { data: null, error: { message: 'Escribe un mensaje.' } };

  if (!isSupabaseConfigured || groupId.startsWith('local-') || profile.id === 'local-user') {
    return { data: saveLocalMessage(profile, groupId, cleaned), error: null };
  }

  const result = await sendGroupMessageRow(groupId, profile.displayName, cleaned);

  if (result.error || !result.data) {
    return { data: null, error: normalizeSendMessageError(result.error) };
  }

  return {
    data: {
      id: result.data.id,
      groupId: result.data.group_id,
      userId: result.data.user_id,
      authorName: result.data.author_name,
      body: result.data.body,
      createdAt: result.data.created_at,
    },
    error: null,
  };
}

function normalizeSendMessageError(error: { message: string } | null) {
  if (!error) return { message: 'No se pudo enviar el mensaje.' };

  if (error.message.includes('Could not find the function public.send_group_message')) {
    return {
      message: 'Falta actualizar Supabase. Ejecuta sql/20260521-007_send_group_message_rpc.sql en el SQL Editor.',
    };
  }

  if (error.message.includes('new row violates row-level security policy')) {
    return {
      message:
        'Supabase ha bloqueado el chat por RLS. Ejecuta sql/20260521-006_fix_rls_helpers_plpgsql.sql y sql/20260521-007_send_group_message_rpc.sql.',
    };
  }

  if (error.message.includes('not a member of this group')) {
    return { message: 'No puedes escribir porque Supabase no te reconoce como miembro de este grupo.' };
  }

  return error;
}

function getLocalGroups() {
  const raw = localStorage.getItem(LOCAL_GROUPS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as CompetitionGroup[];
    } catch {
      localStorage.removeItem(LOCAL_GROUPS_KEY);
    }
  }

  const starter: CompetitionGroup = {
    id: 'local-family',
    name: 'Grupo local',
    description: 'Competición local para probar la experiencia social.',
    ownerId: 'local-user',
    inviteCode: 'local',
    createdAt: new Date().toISOString(),
    role: 'owner',
  };
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify([starter]));
  return [starter];
}

function saveLocalGroup(name: string, description: string, profile: UserProfile) {
  const group: CompetitionGroup = {
    id: `local-${Date.now()}`,
    name,
    description: description.trim() || null,
    ownerId: profile.id,
    inviteCode: Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    role: 'owner',
  };
  const groups = [group, ...getLocalGroups()];
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups));
  return group;
}

function removeLocalGroup(groupId: string) {
  const groups = getLocalGroups().filter((group) => group.id !== groupId);
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups));
}

function getGroupCacheKey(userId: string) {
  return `${GROUP_CACHE_KEY_PREFIX}${userId}`;
}

function getCachedGroups(userId: string) {
  const key = getGroupCacheKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CompetitionGroup[];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function saveCachedGroups(userId: string, groups: CompetitionGroup[]) {
  localStorage.setItem(getGroupCacheKey(userId), JSON.stringify(groups.slice(0, 50)));
}

function cacheGroup(userId: string, group: CompetitionGroup) {
  saveCachedGroups(userId, mergeGroups([group], getCachedGroups(userId)));
}

function removeCachedGroup(userId: string, groupId: string) {
  saveCachedGroups(
    userId,
    getCachedGroups(userId).filter((group) => group.id !== groupId),
  );
}

function mergeGroups(primary: CompetitionGroup[], secondary: CompetitionGroup[]) {
  const groupsById = new Map<string, CompetitionGroup>();

  [...primary, ...secondary].forEach((group) => {
    if (!groupsById.has(group.id)) groupsById.set(group.id, group);
  });

  return [...groupsById.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function getLocalMessages(groupId: string) {
  const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
  const allMessages = raw ? (JSON.parse(raw) as GroupMessage[]) : [];
  return allMessages.filter((message) => message.groupId === groupId).slice(-100);
}

function saveLocalMessage(profile: UserProfile, groupId: string, body: string) {
  const message: GroupMessage = {
    id: `local-message-${Date.now()}`,
    groupId,
    userId: profile.id,
    authorName: profile.displayName,
    body,
    createdAt: new Date().toISOString(),
  };
  const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
  const allMessages = raw ? (JSON.parse(raw) as GroupMessage[]) : [];
  const next = [...allMessages, message].slice(-500);
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(next));
  return message;
}
