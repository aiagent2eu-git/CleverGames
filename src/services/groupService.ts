import {
  fetchGroupMessageRows,
  fetchGroupRowsForUser,
  insertGroupMessageRow,
  insertGroupRow,
  isSupabaseConfigured,
  joinGroupByInviteCode,
} from '../lib/supabaseHandler';
import type { CompetitionGroup, GroupMessage, UserProfile } from '../game/types';

const LOCAL_GROUPS_KEY = 'clevergames.localGroups';
const LOCAL_MESSAGES_KEY = 'clevergames.localGroupMessages';

type GroupServiceResult<T> = {
  data: T;
  error: { message: string } | null;
};

export async function getGroupsForProfile(profile: UserProfile | null): Promise<GroupServiceResult<CompetitionGroup[]>> {
  if (!profile) return { data: [], error: null };

  if (!isSupabaseConfigured || profile.id === 'local-user') {
    return { data: getLocalGroups(), error: null };
  }

  const result = await fetchGroupRowsForUser(profile.id);
  if (result.error) return { data: getLocalGroups(), error: result.error };

  return {
    data: result.data.map(({ group, membership }) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.owner_id,
      inviteCode: group.invite_code,
      createdAt: group.created_at,
      role: membership.role,
    })),
    error: null,
  };
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

  const result = await insertGroupRow({
    name,
    description: input.description?.trim() || null,
    owner_id: profile.id,
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? { message: 'No se pudo crear el grupo.' } };
  }

  return {
    data: {
      id: result.data.id,
      name: result.data.name,
      description: result.data.description,
      ownerId: result.data.owner_id,
      inviteCode: result.data.invite_code,
      createdAt: result.data.created_at,
      role: 'owner',
    },
    error: null,
  };
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

  return {
    data: {
      id: result.data.id,
      name: result.data.name,
      description: result.data.description,
      ownerId: result.data.owner_id,
      inviteCode: result.data.invite_code,
      createdAt: result.data.created_at,
      role: 'member',
    },
    error: null,
  };
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

  const result = await insertGroupMessageRow({
    group_id: groupId,
    user_id: profile.id,
    author_name: profile.displayName,
    body: cleaned,
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? { message: 'No se pudo enviar el mensaje.' } };
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
    name: 'Grupo demo',
    description: 'Competición local para probar la experiencia social.',
    ownerId: 'local-user',
    inviteCode: 'demo',
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
