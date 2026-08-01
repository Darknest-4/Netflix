'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES, formatDate, type NotificationDto } from '@nova/shared';

import { useSession } from '@/providers/SessionProvider';

/**
 * Notification bell with an unread badge.
 *
 * Loads the list once the menu is opened, so the header stays free of
 * background polling.
 *
 * @returns The bell element.
 */
export function NotificationBell(): React.JSX.Element {
  const { status, authFetch } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    void authFetch<NotificationDto[]>(API_ROUTES.notifications.list)
      .then((result) => {
        if (!cancelled) {
          setItems(result);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [status, authFetch]);

  const unread = items.filter((item) => item.readAt === null).length;

  /**
   * Marks a notification as read locally and on the server.
   *
   * @param id - Notification identifier.
   */
  const markRead = async (id: string): Promise<void> => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    await authFetch(API_ROUTES.notifications.read(id), { method: 'POST' }).catch(() => undefined);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Értesítések (${unread} olvasatlan)` : 'Értesítések'}
        className="relative grid size-9 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
      >
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 1 0-3 0v.66A7 7 0 0 0 5 11v5l-1.6 1.6a1 1 0 0 0 .7 1.7h15.8a1 1 0 0 0 .7-1.7L19 16Z" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-nova-red text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-md border border-[var(--surface-border)] bg-[var(--surface-overlay)] shadow-2xl">
          <p className="border-b border-[var(--surface-border)] px-4 py-3 text-sm font-semibold">
            Értesítések
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Nincs új értesítés.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-[var(--surface-border)] overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href ?? '#'}
                    onClick={() => void markRead(item.id)}
                    className={`block px-4 py-3 text-sm transition-colors hover:bg-white/5 ${
                      item.readAt ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      {!item.readAt && (
                        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-nova-red" />
                      )}
                      <span>
                        <span className="block font-medium">{item.subject}</span>
                        <span className="mt-0.5 block text-[var(--text-muted)]">{item.body}</span>
                        <span className="mt-1 block text-xs text-[var(--text-muted)]">
                          {formatDate(item.createdAt)}
                        </span>
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
