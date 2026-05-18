import { Plus, UsersRound } from 'lucide-react';
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
          <h2>Competición privada</h2>
        </div>
        <UsersRound size={22} aria-hidden="true" />
      </div>

      <div className="group-list">
        <button
          className={selectedGroupId === null ? 'group-row active' : 'group-row'}
          type="button"
          onClick={() => onSelectGroup(null)}
        >
          <strong>Solo mis resultados</strong>
          <small>Sin grupo</small>
        </button>
        {groups.map((group) => (
          <button
            key={group.id}
            className={selectedGroupId === group.id ? 'group-row active' : 'group-row'}
            type="button"
            onClick={() => onSelectGroup(group.id)}
          >
            <strong>{group.name}</strong>
            <small>Código {group.inviteCode}</small>
          </button>
        ))}
      </div>

      {profile ? (
        <>
          <div className="inline-stack">
            <input
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
              type="button"
              onClick={() => {
                onCreateGroup(name, description);
                setName('');
                setDescription('');
              }}
            >
              <Plus size={18} />
              <span>Crear</span>
            </button>
          </div>

          <div className="inline-stack">
            <input
              value={inviteCode}
              placeholder="Código de invitación"
              onChange={(event) => setInviteCode(event.target.value)}
            />
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                onJoinGroup(inviteCode);
                setInviteCode('');
              }}
            >
              Unirse
            </button>
          </div>
        </>
      ) : (
        <p className="help-copy">Entra con tu email para crear grupos y competir con otros usuarios.</p>
      )}
    </section>
  );
}
