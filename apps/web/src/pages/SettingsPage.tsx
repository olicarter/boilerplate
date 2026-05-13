import { useState, useEffect, useCallback, useRef } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { authApi, usersApi, orgsApi, type Passkey } from '../api';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import styles from './SettingsPage.module.css';

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const size = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 128, 128);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [savingBio, setSavingBio] = useState(false);

  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [anonymizing, setAnonymizing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);

  type OrgEmailPref = { org_id: string; org_name: string; org_slug: string; email_notifications_enabled: boolean; email_digest_enabled: boolean };
  const [orgEmailPrefs, setOrgEmailPrefs] = useState<OrgEmailPref[] | null>(null);
  const [savingOrgEmailPref, setSavingOrgEmailPref] = useState<string | null>(null);

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
      usersApi.getOrgEmailPreferences().then(setOrgEmailPrefs).catch(() => setOrgEmailPrefs([]));
    }
  }, [currentUser, loadPasskeys, loadNotifPrefs]);

  useEffect(() => {
    setName(currentUser?.name ?? '');
    setBio((currentUser?.bio as string) ?? '');
    setAvatarUrl(currentUser?.avatar_url ?? null);
  }, [currentUser?.name, currentUser?.bio, currentUser?.avatar_url]);

  if (!currentUser) {
    return <p className={styles.signIn}>Sign in to access settings.</p>;
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { addToast('Name is required.', 'error'); return; }
    if (trimmed.length < 2) { addToast('Name must be at least 2 characters.', 'error'); return; }
    if (trimmed === currentUser!.name) return;
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

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setAvatarUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      await usersApi.update(currentUser!.id, { avatar_url: dataUrl });
      setAvatarUrl(dataUrl);
      const stored = localStorage.getItem('ripple_user');
      if (stored) localStorage.setItem('ripple_user', JSON.stringify({ ...JSON.parse(stored), avatar_url: dataUrl }));
      addToast('Avatar updated', 'success');
    } catch {
      addToast('Failed to upload avatar', 'error');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    try {
      await usersApi.update(currentUser!.id, { avatar_url: null });
      setAvatarUrl(null);
      const stored = localStorage.getItem('ripple_user');
      if (stored) localStorage.setItem('ripple_user', JSON.stringify({ ...JSON.parse(stored), avatar_url: null }));
      addToast('Avatar removed', 'success');
    } catch {
      addToast('Failed to remove avatar', 'error');
    } finally {
      setAvatarUploading(false);
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

  async function toggleOrgEmailPref(slug: string, field: 'email_notifications_enabled' | 'email_digest_enabled', value: boolean) {
    const key = `${slug}:${field}`;
    setSavingOrgEmailPref(key);
    try {
      await orgsApi.updateEmailPreferences(slug, { [field]: value });
      setOrgEmailPrefs((prev) =>
        prev?.map((p) => p.org_slug === slug ? { ...p, [field]: value } : p) ?? null
      );
    } catch {
      addToast('Failed to save preference', 'error');
    } finally {
      setSavingOrgEmailPref(null);
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Settings</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Display name</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <Avatar name={currentUser.name} avatarUrl={avatarUrl} size={64} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarPick}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
              {avatarUploading ? 'Uploading…' : 'Upload photo'}
            </Button>
            {avatarUrl && (
              <Button size="sm" variant="ghost" onClick={handleRemoveAvatar} disabled={avatarUploading}>
                Remove photo
              </Button>
            )}
          </div>
        </div>
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
        <h3 className={styles.sectionTitle}>Email preferences per organisation</h3>
        {orgEmailPrefs === null ? (
          <p className={styles.loading}>Loading…</p>
        ) : orgEmailPrefs.length === 0 ? (
          <p className={styles.loading}>You are not a member of any organisations.</p>
        ) : (
          <div className={styles.notifList}>
            {orgEmailPrefs.map((pref) => (
              <div key={pref.org_id} style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)', color: 'var(--color-fg)' }}>
                  {pref.org_name}
                </p>
                <label className={styles.notifLabel}>
                  <input
                    type="checkbox"
                    checked={pref.email_notifications_enabled}
                    disabled={savingOrgEmailPref === `${pref.org_slug}:email_notifications_enabled`}
                    onChange={(e) => toggleOrgEmailPref(pref.org_slug, 'email_notifications_enabled', e.target.checked)}
                    className={styles.notifCheckbox}
                  />
                  <span className={pref.email_notifications_enabled ? styles.notifTextOn : styles.notifTextOff}>Email notifications</span>
                </label>
                <label className={styles.notifLabel} style={{ marginTop: 'var(--space-1)' }}>
                  <input
                    type="checkbox"
                    checked={pref.email_digest_enabled}
                    disabled={savingOrgEmailPref === `${pref.org_slug}:email_digest_enabled`}
                    onChange={(e) => toggleOrgEmailPref(pref.org_slug, 'email_digest_enabled', e.target.checked)}
                    className={styles.notifCheckbox}
                  />
                  <span className={pref.email_digest_enabled ? styles.notifTextOn : styles.notifTextOff}>Weekly digest</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '0 var(--space-3)',
                height: 32,
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                fontWeight: theme === t ? 'var(--weight-medium)' : 'var(--weight-normal)',
                border: theme === t ? '1px solid var(--color-fg)' : 'var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: theme === t ? 'var(--color-fg)' : 'var(--color-bg)',
                color: theme === t ? 'var(--color-bg)' : 'var(--color-fg)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast), color var(--transition-fast)',
                textTransform: 'capitalize',
              }}
            >
              {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('common.language')}</h3>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[{ code: 'en', label: 'English' }, { code: 'es', label: 'Español' }].map(({ code, label }) => (
            <button
              key={code}
              onClick={() => i18n.changeLanguage(code)}
              aria-pressed={i18n.language.startsWith(code)}
              style={{
                padding: '0 var(--space-3)',
                height: 32,
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                fontWeight: i18n.language.startsWith(code) ? 'var(--weight-medium)' : 'var(--weight-normal)',
                border: i18n.language.startsWith(code) ? '1px solid var(--color-fg)' : 'var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: i18n.language.startsWith(code) ? 'var(--color-fg)' : 'var(--color-bg)',
                color: i18n.language.startsWith(code) ? 'var(--color-bg)' : 'var(--color-fg)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast), color var(--transition-fast)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
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

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your data</h3>
        <p className={styles.sectionHint}>
          Download a copy of all your personal data: profile, votes, delegations, comments, and memberships.
        </p>
        <Button
          size="sm"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              const blob = await usersApi.exportData();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ripple-personal-data.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              addToast('Failed to export data', 'error');
            } finally {
              setExporting(false);
            }
          }}
        >
          {exporting ? 'Preparing…' : 'Download my data'}
        </Button>
      </section>

      <section className={styles.section} style={{ borderColor: 'var(--color-error)', borderWidth: 1, borderStyle: 'solid', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)' }}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--color-error)' }}>Delete account</h3>
        <p className={styles.sectionHint}>
          Permanently remove your personal information (name, email, avatar). Your votes, comments, and delegation records are retained for organisational integrity but attributed to "Deleted User".
        </p>
        <Button
          variant="danger"
          size="sm"
          disabled={anonymizing}
          onClick={async () => {
            if (!window.confirm('Are you sure? This will erase your name, email, and profile. It cannot be undone.')) return;
            setAnonymizing(true);
            try {
              await usersApi.anonymize();
              localStorage.removeItem('ripple_user');
              window.location.href = '/';
            } catch {
              addToast('Failed to delete account', 'error');
              setAnonymizing(false);
            }
          }}
        >
          {anonymizing ? 'Deleting…' : 'Delete my account'}
        </Button>
      </section>
    </div>
  );
}
