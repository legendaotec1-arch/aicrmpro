import { useEffect, useState, useRef } from 'react';
import api from '../../lib/http';
import { withClientAuth } from '../../lib/clientApi';
import { useSafeInterval, useMountedRef } from '../../lib/usePageVisible';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatDateTime } from '../../lib/format';

export default function ClientChatPanel({ masterId, clientAuth, formData }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const mountedRef = useMountedRef();

  const load = async () => {
    if (!clientAuth) return;
    try {
      const res = await api.get(
        `/client/${masterId}/chat?channel=${clientAuth.channel}&userId=${encodeURIComponent(clientAuth.userId)}`,
        withClientAuth(clientAuth)
      );
      if (!mountedRef.current) return;
      setMessages(res.data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, [masterId, clientAuth?.channel, clientAuth?.userId, clientAuth?.clientToken]);

  useSafeInterval(load, 15000, Boolean(clientAuth?.clientToken));

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !clientAuth) return;
    setSending(true);
    try {
      await api.post(`/client/${masterId}/chat`, {
        channel: clientAuth.channel,
        userId: clientAuth.userId,
        maxUserId: clientAuth.channel === 'max' ? clientAuth.userId : undefined,
        telegramUserId: clientAuth.channel === 'telegram' ? clientAuth.userId : undefined,
        body: text.trim(),
        name: formData?.name
      }, withClientAuth(clientAuth));
      setText('');
      inputRef.current?.blur();
      await load();
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка отправки');
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-220px)] flex-col sm:min-h-[400px]">
      <h2 className="text-lg font-bold text-ink mb-2">Чат</h2>
      <p className="text-sm text-ink-muted mb-4">Ответ придёт в MAX или Telegram</p>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[calc(100dvh-330px)] pr-1 sm:max-h-[320px]">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">Напишите первым — ответ придёт в мессенджер</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.sender_type === 'client'
                    ? 'bg-[var(--ct-accent)] text-[var(--ct-on-accent)]'
                    : 'bg-[var(--ct-bg-soft)] text-[var(--ct-text)]'
                }`}
              >
                <p>{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.sender_type === 'client' ? 'text-white/70' : 'text-ink-muted'}`}>
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="sticky bottom-0 -mx-1 flex gap-2 bg-[var(--ct-surface)] px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        <Input
          className="min-w-0 flex-1"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение..."
        />
        <Button type="submit" loading={sending} disabled={!text.trim()} className="h-[46px] shrink-0 px-4">
          →
        </Button>
      </form>
    </div>
  );
}
