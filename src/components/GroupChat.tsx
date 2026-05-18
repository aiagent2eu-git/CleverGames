import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useState } from 'react';
import type { CompetitionGroup, GroupMessage, UserProfile } from '../game/types';

type GroupChatProps = {
  profile: UserProfile | null;
  group: CompetitionGroup | null;
  messages: GroupMessage[];
  onSendMessage: (body: string) => void;
  onRefresh: () => void;
};

export function GroupChat({ profile, group, messages, onSendMessage, onRefresh }: GroupChatProps) {
  const [body, setBody] = useState('');

  return (
    <section className="social-card group-chat" aria-label="Chat del grupo">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Chat</p>
          <h2>{group ? group.name : 'Sin grupo'}</h2>
        </div>
        <button className="icon-button icon-only" type="button" onClick={onRefresh} aria-label="Actualizar chat">
          <RefreshCw size={18} />
        </button>
      </div>

      {group ? (
        <>
          <div className="chat-list">
            {messages.length === 0 ? (
              <p className="help-copy">Todavía no hay mensajes en este grupo.</p>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={message.userId === profile?.id ? 'chat-message mine' : 'chat-message'}>
                  <strong>{message.authorName}</strong>
                  <p>{message.body}</p>
                  <small>{new Date(message.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</small>
                </article>
              ))
            )}
          </div>

          {profile ? (
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSendMessage(body);
                setBody('');
              }}
            >
              <input value={body} maxLength={800} placeholder="Mensaje al grupo" onChange={(event) => setBody(event.target.value)} />
              <button className="icon-button primary icon-only" type="submit" aria-label="Enviar mensaje">
                <Send size={18} />
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <div className="empty-chat">
          <MessageCircle size={28} />
          <p>Selecciona o crea un grupo para abrir el chat.</p>
        </div>
      )}
    </section>
  );
}
