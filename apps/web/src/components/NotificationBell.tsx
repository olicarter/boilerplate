import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { notificationsApi, type Notification } from '../api';
import { useCurrentUser } from '../context';

const TYPE_LABELS: Record<Notification['type'], string> = {
  'proposal.opened': 'New proposal',
  'proposal.closed': 'Proposal closed',
  'delegate.voted': 'Delegate voted',
  'member.joined': 'New member',
  'comment.mention': 'You were mentioned',
  'comment.posted': 'New comment',
  'delegation.added': 'Someone delegated to you',
  'delegation.removed': 'Delegation removed',
};

function NotificationItem({
  n,
  orgSlug,
  onRead,
}: {
  n: Notification;
  orgSlug?: string;
  onRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isUnread = !n.read_at;

  function handleClick() {
    if (isUnread) onRead(n.id);
    if (n.target_type === 'proposal' && n.target_id && orgSlug) {
      navigate({ to: '/orgs/$slug/proposals/$id', params: { slug: orgSlug, id: n.target_id } });
    }
  }

  const body = (n.metadata?.title ?? n.metadata?.proposalTitle) as string | undefined;
  const delegateChoice = n.metadata?.choice as string | undefined;

  return (
    <div
      onClick={handleClick}
      data-testid="notification-item"
      style={{
        padding: '0.6rem 0.75rem',
        borderBottom: '1px solid #f0f0f0',
        cursor: n.target_id ? 'pointer' : 'default',
        background: isUnread ? '#f5f8ff' : '#fff',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-start',
      }}
    >
      {isUnread && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3358c4', flexShrink: 0, marginTop: 5 }} />
      )}
      {!isUnread && <span style={{ width: 7, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: isUnread ? 600 : 400, color: '#333' }}>
          {TYPE_LABELS[n.type]}
          {n.type === 'delegate.voted' && delegateChoice && (
            <span style={{ color: '#666', fontWeight: 400 }}> — voted {delegateChoice}</span>
          )}
        </div>
        {body && (
          <div style={{ fontSize: 12, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {body}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
          {new Date(n.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({ orgSlug }: { orgSlug?: string }) {
  const user = useCurrentUser();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count: n } = await notificationsApi.unreadCount();
      setCount(n);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  async function toggleOpen() {
    if (!open) {
      setOpen(true);
      setLoading(true);
      try {
        const list = await notificationsApi.list(20);
        setNotifications(list);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    } else {
      setOpen(false);
    }
  }

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev?.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n) ?? null);
    setCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
    setCount(0);
  }

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggleOpen}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
        data-testid="notification-bell"
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px', lineHeight: 1, color: 'var(--color-sidebar-fg-muted)', transition: 'color var(--transition-fast)' }}
      >
        🔔
        {count > 0 && (
          <span
            data-testid="notification-badge"
            style={{
              position: 'absolute', top: -2, right: -4,
              background: '#d94040', color: '#fff', borderRadius: '50%',
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 2px',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          width: 300, maxHeight: 400, overflowY: 'auto',
          background: '#fff', border: '1px solid #ddd', borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderBottom: '1px solid #eee' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ fontSize: 11, color: '#3358c4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Mark all read
              </button>
            )}
          </div>
          {loading ? (
            <p style={{ fontSize: 13, color: '#aaa', margin: '1rem 0.75rem' }}>Loading…</p>
          ) : !notifications || notifications.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa', margin: '1rem 0.75rem' }} data-testid="notifications-empty">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} n={n} orgSlug={orgSlug} onRead={handleMarkRead} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
