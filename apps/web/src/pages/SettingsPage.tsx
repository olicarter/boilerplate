import { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { authApi, usersApi, type Passkey } from '../api';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import styles from './SettingsPage.module.css';

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
    return <p className={styles.signIn}>Sign in to access settings.</p>;
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
    <div className={styles.page}>
      <h2 className={styles.heading}>Settings</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Display name</h3>
        <form className={styles.nameForm} onSubmit={handleSaveName}>
          <div className={styles.nameField}>
            <label htmlFor="settings-name" className={styles.formLabel}>Name</label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.formInput}
            />
          </div>
          <Button
            type="submit"
            disabled={savingName || !name.trim() || name.trim() === currentUser.name}
            size="sm"
          >
            {savingName ? 'Saving…' : 'Save'}
          </Button>
        </form>
        <p className={styles.emailHint}>{currentUser.email}</p>

        <form className={styles.bioForm} onSubmit={handleSaveBio}>
          <label htmlFor="settings-bio" className={styles.formLabel}>
            Bio <span className={styles.formLabelNote}>(optional)</span>
          </label>
          <textarea
            id="settings-bio"
            data-testid="bio-input"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            rows={3}
            maxLength={300}
            placeholder="Tell other members a bit about yourself…"
            className={styles.formTextarea}
          />
          <div className={styles.bioFooter}>
            <span className={styles.charCount}>{bio.length}/300</span>
            <Button
              type="submit"
              data-testid="save-bio-btn"
              disabled={savingBio || bio.trim() === ((currentUser.bio as string) ?? '')}
              size="sm"
            >
              {savingBio ? 'Saving…' : 'Save bio'}
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Notification preferences</h3>
          {savingNotif && <span className={styles.savingHint}>Saving…</span>}
        </div>
        {notifPrefs === null ? (
          <p className={styles.loading}>Loading…</p>
        ) : (
          <div className={styles.notifList}>
            {Object.entries(NOTIFICATION_LABELS).map(([type, label]) => (
              <label
                key={type}
                data-testid={`notif-pref-${type}`}
                className={styles.notifLabel}
              >
                <input
                  type="checkbox"
                  checked={isEnabled(type)}
                  onChange={() => toggleNotif(type)}
                  className={styles.notifCheckbox}
                />
                <span className={isEnabled(type) ? styles.notifTextOn : styles.notifTextOff}>{label}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Passkeys</h3>
          <Button size="sm" onClick={handleAddPasskey} disabled={addingPasskey}>
            {addingPasskey ? 'Waiting for device…' : '+ Add passkey'}
          </Button>
        </div>

        {passkeys === null ? (
          <p className={styles.loading}>Loading…</p>
        ) : passkeys.length === 0 ? (
          <p className={styles.loading}>No passkeys found.</p>
        ) : (
          <div className={styles.passkeyList}>
            {passkeys.map((pk) => (
              <div key={pk.id} className={styles.passkeyRow}>
                <div>
                  <span className={styles.passkeyId}>{pk.id.slice(0, 16)}…</span>
                  <span className={styles.passkeyDate}>Added {new Date(pk.createdAt).toLocaleDateString()}</span>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeletePasskey(pk.id)}
                  disabled={deletingId === pk.id || passkeys.length <= 1}
                  title={passkeys.length <= 1 ? 'Cannot remove your only passkey' : 'Remove passkey'}
                >
                  {deletingId === pk.id ? 'Removing…' : 'Remove'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
