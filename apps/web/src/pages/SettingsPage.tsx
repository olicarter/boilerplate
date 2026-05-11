import { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { authApi, usersApi, type Passkey } from '../api';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';

const NOTIFICATION_LABELS: Record<string, string> = {
  'proposal.opened': 'A new proposal is opened',
  'proposal.closed': 'A proposal closes',
  'delegate.voted': 'Your delegate casts a vote',
  'member.joined': 'A new member joins',
  'comment.mention': 'Someone mentions you in a comment',
  'comment.posted': 'Someone comments on a proposal you voted on',
  'delegation.added': 'Someone delegates to you',
  'delegation.removed': 'Someone removes their delegation from you',
  'proposal.vote_reminder': 'A moderator sends a vote reminder',
};

export function SettingsPage() {
  const currentUser = useCurrentUser();
  const addToast = useToast();

  const [name, setName] = useState(currentUser?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [savingBio, setSavingBio] = useState(false);

  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);

  const loadPasskeys = useCallback(async () => {
    try {
      const list = await authApi.listPasskeys();
      setPasskeys(list);
    } catch {
      // silently fail
    }
  }, []);

  const loadNotifPrefs = useCallback(async () => {
    try {
      const prefs = await usersApi.getNotificationPreferences();
      setNotifPrefs(prefs);
    } catch {
      setNotifPrefs({});
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadPasskeys();
      loadNotifPrefs();
    }
  }, [currentUser, loadPasskeys, loadNotifPrefs]);

  useEffect(() => {
    setName(currentUser?.name ?? '');
    setBio((currentUser?.bio as string) ?? '');
  }, [currentUser?.name, currentUser?.bio]);

  if (!currentUser) {
    return <p style={{ fontSize: 14, color: '#999' }}>Sign in to access settings.</p>;
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentUser!.name) return;
    setSavingName(true);
    try {
      await usersApi.update(currentUser!.id, { name: trimmed });
      addToast('Name updated', 'success');
    } catch {
      addToast('Failed to update name', 'error');
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveBio(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = bio.trim();
    setSavingBio(true);
    try {
      await usersApi.update(currentUser!.id, { bio: trimmed || null });
      addToast('Bio updated', 'success');
    } catch {
      addToast('Failed to update bio', 'error');
    } finally {
      setSavingBio(false);
    }
  }

  async function handleAddPasskey() {
    setAddingPasskey(true);
    try {
      const options = await authApi.addPasskeyBegin();
      const credential = await startRegistration({ optionsJSON: options });
      await authApi.addPasskeyFinish(credential);
      addToast('Passkey added', 'success');
      await loadPasskeys();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add passkey';
      addToast(msg, 'error');
    } finally {
      setAddingPasskey(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    setDeletingId(id);
    try {
      await authApi.deletePasskey(id);
      addToast('Passkey removed', 'success');
      setPasskeys((prev) => (prev ?? []).filter((p) => p.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove passkey';
      addToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function isEnabled(type: string): boolean {
    return (notifPrefs ?? {})[type] !== false;
  }

  async function toggleNotif(type: string) {
    const current = isEnabled(type);
    const updated = { ...(notifPrefs ?? {}), [type]: !current };
    setNotifPrefs(updated);
    setSavingNotif(true);
    try {
      await usersApi.updateNotificationPreferences(updated);
    } catch {
      setNotifPrefs(notifPrefs);
      addToast('Failed to save preference', 'error');
    } finally {
      setSavingNotif(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Settings</h2>

      {/* Display name */}
      <section style={{ marginBottom: '2rem', border: '1px solid #ddd', borderRadius: 8, padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Display name
        </h3>
        <form onSubmit={handleSaveName} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="settings-name" style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
              Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.45rem 0.6rem', boxSizing: 'border-box', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
            />
          </div>
          <button
            type="submit"
            disabled={savingName || !name.trim() || name.trim() === currentUser.name}
            style={{ padding: '0.45rem 1rem', fontSize: 14, whiteSpace: 'nowrap' }}
          >
            {savingName ? 'Saving…' : 'Save'}
          </button>
        </form>
        <p style={{ margin: '0.75rem 0 0', fontSize: 13, color: '#888' }}>{currentUser.email}</p>
        <form onSubmit={handleSaveBio} style={{ marginTop: '1rem' }}>
          <label htmlFor="settings-bio" style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>
            Bio <span style={{ color: '#aaa' }}>(optional)</span>
          </label>
          <textarea
            id="settings-bio"
            data-testid="bio-input"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            rows={3}
            maxLength={300}
            placeholder="Tell other members a bit about yourself…"
            style={{ width: '100%', padding: '0.45rem 0.6rem', boxSizing: 'border-box', fontSize: 14, border: '1px solid #ccc', borderRadius: 4, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
            <span style={{ fontSize: 12, color: '#aaa' }}>{bio.length}/300</span>
            <button
              type="submit"
              data-testid="save-bio-btn"
              disabled={savingBio || bio.trim() === ((currentUser.bio as string) ?? '')}
              style={{ padding: '0.35rem 0.9rem', fontSize: 13 }}
            >
              {savingBio ? 'Saving…' : 'Save bio'}
            </button>
          </div>
        </form>
      </section>

      {/* Notification preferences */}
      <section style={{ marginBottom: '2rem', border: '1px solid #ddd', borderRadius: 8, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notification preferences
          </h3>
          {savingNotif && <span style={{ fontSize: 12, color: '#aaa' }}>Saving…</span>}
        </div>
        {notifPrefs === null ? (
          <p style={{ fontSize: 14, color: '#999', margin: 0 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {Object.entries(NOTIFICATION_LABELS).map(([type, label]) => (
              <label
                key={type}
                data-testid={`notif-pref-${type}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  fontSize: 14,
                  cursor: 'pointer',
                  padding: '0.4rem 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={isEnabled(type)}
                  onChange={() => toggleNotif(type)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ color: isEnabled(type) ? '#333' : '#aaa' }}>{label}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Passkeys */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Passkeys
          </h3>
          <button
            onClick={handleAddPasskey}
            disabled={addingPasskey}
            style={{ fontSize: 13, padding: '0.35rem 0.85rem' }}
          >
            {addingPasskey ? 'Waiting for device…' : '+ Add passkey'}
          </button>
        </div>

        {passkeys === null ? (
          <p style={{ fontSize: 14, color: '#999', margin: 0 }}>Loading…</p>
        ) : passkeys.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999', margin: 0 }}>No passkeys found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  border: '1px solid #eee',
                  borderRadius: 6,
                  background: '#fafafa',
                }}
              >
                <div>
                  <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#555' }}>
                    {pk.id.slice(0, 16)}…
                  </span>
                  <span style={{ marginLeft: '0.75rem', fontSize: 12, color: '#aaa' }}>
                    Added {new Date(pk.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleDeletePasskey(pk.id)}
                  disabled={deletingId === pk.id || passkeys.length <= 1}
                  title={passkeys.length <= 1 ? 'Cannot remove your only passkey' : 'Remove passkey'}
                  style={{
                    fontSize: 12,
                    padding: '0.25rem 0.6rem',
                    color: passkeys.length <= 1 ? '#ccc' : '#d94040',
                    border: `1px solid ${passkeys.length <= 1 ? '#eee' : '#f5c5c5'}`,
                    background: 'none',
                    borderRadius: 4,
                    cursor: passkeys.length <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deletingId === pk.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
