import { Calendar, MessageCircle, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ClientAvatar from './ClientAvatar';
import { formatDate, formatPrice } from '../../lib/format';

export default function ClientCard({ client, onOpen, onMessage, onDelete }) {
  const name = client.display_name || client.name || 'Без имени';
  const visits = Number(client.visit_count) || 0;
  const canMessage = !!(client.max_user_id || client.telegram_user_id);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-admin-border bg-admin-card shadow-admin-card hover:shadow-admin-card hover:border-accent/30 transition overflow-hidden">
      <button
        type="button"
        onClick={() => onOpen?.(client)}
        className="flex flex-1 flex-col text-left p-4 pb-3 w-full"
      >
        <div className="flex items-start gap-3">
          <ClientAvatar client={client} size="lg" />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-semibold text-white truncate text-base leading-tight">{name}</h3>
            {client.phone ? (
              <p className="mt-1 text-sm text-slate-400 truncate">{client.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Телефон не указан</p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={client.messenger === 'telegram' ? 'telegram' : 'max'} />
              {visits > 0 ? (
                <span className="text-xs font-medium text-slate-400 bg-admin-surface px-2 py-0.5 rounded-full">
                  {visits} {visits === 1 ? 'визит' : visits < 5 ? 'визита' : 'визитов'}
                </span>
              ) : (
                <span className="text-xs text-slate-500">Новый клиент</span>
              )}
            </div>
          </div>
        </div>

        {(Number(client.total_spent) > 0 || client.last_visit) && (
          <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-admin-surface border border-admin-border px-3 py-2.5 text-xs">
            {Number(client.total_spent) > 0 && (
              <div>
                <p className="text-slate-500">Потрачено</p>
                <p className="font-bold text-accent mt-0.5">{formatPrice(client.total_spent)}</p>
              </div>
            )}
            {client.last_visit && (
              <div>
                <p className="text-slate-500">Последний визит</p>
                <p className="font-semibold text-white mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {formatDate(client.last_visit)}
                </p>
              </div>
            )}
          </div>
        )}
      </button>

      <div className="flex gap-2 px-4 pb-4 pt-0 border-t border-admin-border mt-auto">
        <Button type="button" size="sm" variant="soft" className="flex-1" onClick={() => onOpen?.(client)}>
          Карточка
        </Button>
        {canMessage && onMessage && (
          <Button type="button" size="sm" variant="secondary" onClick={() => onMessage(client)} title="Написать">
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button type="button" size="sm" variant="danger" onClick={() => onDelete(client)} title="Удалить">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </article>
  );
}
