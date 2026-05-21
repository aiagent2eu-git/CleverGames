import { Hash, Plus, UserRound, UsersRound } from 'lucide-react';
import { useState } from 'react';
import type { CompetitionGroup, UserProfile } from '../game/types';

type GroupsPanelProps = {
  profile: UserProfile | null;
  groups: CompetitionGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup: (name: string, description: string) => void;
  onJoinGroup: (inviteCode: string) => void;
};

const roleLabels = {
  owner: 'Creador',
  admin: 'Admin',
  member: 'Miembro',
} as const;

function getGroupInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'G';
}

export function GroupsPanel({
  profile,
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
}: GroupsPanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  return (
    <section className="social-card" aria-label="Grupos">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Grupos</p>
          <h2>Tus competiciones</h2>
          <p className="muted-line">Elige dónde contar resultados, abrir chat y comparar el día.</p>
        </div>
        <UsersRound size={22} aria-hidden="true" />
      </div>

      <div className="group-list">
        <button
          className={selectedGroupId === null ? 'group-row active' : 'group-row'}
          type="button"
          onClick={() => onSelectGroup(null)}
        >
          <span className="group-avatar personal">
            <UserRound size={18} aria-hidden="true" />
          </span>
          <span className="group-row-content">
            <strong>Solo mis resultados</strong>
            <small>Sin chat ni ranking privado</small>
          </span>
        </button>
        {groups.map((group) => (
          <button
            key={group.id}
            className={selectedGroupId === group.id ? 'group-row active' : 'group-row'}
            type="button"
            onClick={() => onSelectGroup(group.id)}
          >
            <span className="group-avatar">{getGroupInitial(group.name)}</span>
            <span className="group-row-content">
              <strong>{group.name}</strong>
              <small>{group.description || `Código ${group.inviteCode}`}</small>
            </span>
            <span className="role-badge">{roleLabels[group.role ?? 'member']}</span>
          </button>
        ))}
      </div>

      {profile ? (
        <>
          <form
            className="inline-stack group-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateGroup(name, description);
              setName('');
              setDescription('');
            }}
          >
            <label className="field-label compact" htmlFor="new-group-name">
              Crear grupo
            </label>
            <input
              id="new-group-name"
              value={name}
              maxLength={60}
              placeholder="Nuevo grupo"
              onChange={(event) => setName(event.target.value)}
            />
            <input
              value={description}
              maxLength={120}
              placeholder="Descripción"
              onChange={(event) => setDescription(event.target.value)}
            />
            <button
              className="icon-button primary"
              type="submit"
              disabled={name.trim().length < 2}
            >
              <Plus size={18} />
              <span>Crear</span>
            </button>
          </form>

          <form
            className="inline-stack group-form join-form"
            onSubmit={(event) => {
              event.preventDefault();
              onJoinGroup(inviteCode);
              setInviteCode('');
            }}
          >
            <label className="field-label compact" htmlFor="invite-code">
              Unirme a un grupo
            </label>
            <input
              id="invite-code"
              value={inviteCode}
              placeholder="Código de invitación"
              onChange={(event) => setInviteCode(event.target.value)}
            />
            <button className="icon-button" type="submit" disabled={!inviteCode.trim()}>
              <Hash size={18} />
              Unirse
            </button>
          </form>
        </>
      ) : (
        <p className="help-copy">Entra con tu email para crear grupos y competir con otros usuarios.</p>
      )}
    </section>
  );
}
