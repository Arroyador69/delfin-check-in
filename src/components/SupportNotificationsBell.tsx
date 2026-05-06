'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function SupportNotificationsBell() {
  const pathname = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch('/api/tenant/notifications?type=support_reply', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setCount(typeof d.unreadCount === 'number' ? d.unreadCount : 0);
        setItems(Array.isArray(d.items) ? (d.items as NotificationItem[]) : []);
      })
      .catch(() => {
        setCount(0);
        setItems([]);
      });
  }, []);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await fetch('/api/tenant/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // silencioso
    } finally {
      load();
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const hasUnread = count > 0;
  const label = count > 9 ? '9+' : String(count);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
        className={`relative inline-flex items-center justify-center rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
          hasUnread
            ? 'text-amber-800 hover:bg-amber-50'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
        title={hasUnread ? 'Tienes respuestas de soporte' : 'No hay respuestas nuevas de soporte'}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notificaciones de soporte"
      >
        <Bell className="h-5 w-5 shrink-0" aria-hidden />
        {hasUnread ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {label}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Soporte</div>
            {hasUnread ? (
              <button
                type="button"
                className="text-xs text-slate-600 hover:text-slate-900"
                onClick={() => markRead(items.filter((i) => !i.is_read).map((i) => i.id))}
              >
                Marcar todo como leído
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No hay notificaciones.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                        n.is_read ? 'bg-white' : 'bg-amber-50/40'
                      }`}
                      onClick={() => {
                        const link = n.link || '/settings/support';
                        markRead([n.id]);
                        router.push(link.startsWith('/') ? link : '/settings/support');
                        setOpen(false);
                      }}
                    >
                      <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                      {n.body ? <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</div> : null}
                      <div className="text-[11px] text-slate-500 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

