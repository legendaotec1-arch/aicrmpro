import { useEffect, useState, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { PageLoader } from '../ui/Spinner';
import { formatDateTime } from '../../lib/format';

export default function ChatInboxSection({ api, toast, onUpdated }) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    try {
      const res = await api.get('/master/me/conversations');
      setConversations(res.data);
    } catch {
      toast('Не удалось загрузить чаты', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const res = await api.get(`/master/me/conversations/${conversationId}/messages`);
      setMessages(res.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      loadConversations();
      onUpdated?.();
    } catch {
      toast('Ошибка загрузки сообщений', 'error');
    }
  };

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    setSending(true);
    try {
      await api.post(`/master/me/conversations/${activeId}/messages`, { body: text.trim() });
      setText('');
      await loadMessages(activeId);
      onUpdated?.();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка отправки', 'error');
    } finally {
      setSending(false);
    }
  };

  const active = conversations.find((c) => c.id === activeId);

  if (loading) return <PageLoader />;

  return (
    <div className="grid gap-4 lg:grid-cols-3 min-h-[480px]">
      <Card className="lg:col-span-1 p-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-admin-border font-semibold text-white">Диалоги</div>
        <ul className="flex-1 overflow-y-auto divide-y divide-admin-border">
          {conversations.length === 0 ? (
            <li className="p-6 text-sm text-slate-500 text-center">Сообщений пока нет</li>
          ) : (
            conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-admin-hover transition ${activeId === c.id ? 'bg-accent-soft' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm text-white truncate">{c.client_name || 'Клиент'}</p>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{c.last_message || '—'}</p>
                  <Badge tone={c.messenger === 'telegram' ? 'telegram' : 'max'} className="mt-1" />
                </button>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card className="lg:col-span-2 flex flex-col p-0 overflow-hidden">
        {!activeId ? (
          <p className="flex-1 flex items-center justify-center text-sm text-slate-500 p-8">
            Выберите диалог слева
          </p>
        ) : (
          <>
            <div className="p-4 border-b border-admin-border">
              <p className="font-semibold text-white">{active?.client_name || 'Клиент'}</p>
              {active?.phone && <p className="text-xs text-slate-500">{active.phone}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[400px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_type === 'salon' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      m.sender_type === 'salon'
                        ? 'bg-accent text-white rounded-br-md'
                        : 'bg-admin-surface text-slate-200 rounded-bl-md'
                    }`}
                  >
                    <p>{m.body}</p>
                    <p className={`text-[10px] mt-1 ${m.sender_type === 'salon' ? 'text-white/70' : 'text-slate-500'}`}>
                      {formatDateTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="p-4 border-t border-admin-border flex gap-2">
              <Input
                className="flex-1"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ответ клиенту..."
              />
              <Button type="submit" loading={sending} disabled={!text.trim()}>
                Отправить
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
