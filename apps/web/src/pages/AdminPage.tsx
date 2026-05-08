import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useOrg } from '../OrgContext';
import { useCurrentUser } from '../context';
import { usersCollection, membershipsCollection } from '../collections';
import { orgsApi, type Membership, type User } from '../api';
import { ConfirmButton } from '../components/ConfirmButton';
import { useToast } from '../components/Toast';

type CreationRole = 'member' | 'moderator' | 'admin';

const ROLE_LABELS: Record<CreationRole, string> = {
  member: 'Any member',
  moderator: 'Moderator and above',
  admin: 'Admin only',
};

export function AdminPage() {
  const { org } = useOrg();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const addToast = useToast();

  const { data: allMemberships } = useLiveQuery(membershipsCollection);
  const { data: allUsers } = useLiveQuery(usersCollection);
  const orgMembers = (allMemberships ?? []).filter((m: Membership) => m.organisation_id === org.id);
  const myMembership = currentUser
    ? orgMembers.find((m: Membership) => m.user_id === currentUser.id)
    : undefined;
  const isAdmin = myMembership?.role === 'admin';
  const usersById = new Map<string, User>((allUsers ?? []).map((u: User) => [u.id, u]));

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');

  const [proposalCreationRole, setProposalCreationRole] = useState<CreationRole>(org.proposal_creation_role ?? 'member');
  const [topicCreationRole, setTopicCreationRole] = useState<CreationRole>(org.topic_creation_role ?? 'member');
  const [savingRole, setSavingRole] = useState(false);

  const [votingVisibility, setVotingVisibility] = useState<'public' | 'hidden'>(org.voting_visibility ?? 'public');
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [defaultDuration, setDefaultDuration] = useState<string>(
    org.default_voting_duration_days != null ? String(org.default_voting_duration_days) : '',
  );
  const [defaultThreshold, setDefaultThreshold] = useState<string>(String(org.default_threshold ?? 50));
  const [defaultQuorum, setDefaultQuorum] = useState<string>(
    org.default_quorum != null ? String(org.default_quorum) : '',
  );
  const [isPublic, setIsPublic] = useState<boolean>(org.is_public ?? false);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsError, setDefaultsError] = useState('');

  const [transferToId, setTransferToId] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [deleting, setDeleting] = useState(false);

  if (!isAdmin) {
    return <p style={{ fontSize: 14, color: '#d94040' }}>Access denied — admins only.</p>;
  }

  async function saveOrgInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoError('');
    try {
      await orgsApi.update(org.slug, { name: name.trim(), description });
      addToast('Organisation updated', 'success');
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingInfo(false);
    }
  }

  async function saveCreationRole(field: 'proposal_creation_role' | 'topic_creation_role', role: CreationRole) {
    if (field === 'proposal_creation_role') setProposalCreationRole(role);
    else setTopicCreationRole(role);
    setSavingRole(true);
    try {
      await orgsApi.update(org.slug, { [field]: role });
      addToast('Setting saved', 'success');
    } catch {
      addToast('Failed to save setting', 'error');
      if (field === 'proposal_creation_role') setProposalCreationRole(org.proposal_creation_role ?? 'member');
      else setTopicCreationRole(org.topic_creation_role ?? 'member');
    } finally {
      setSavingRole(false);
    }
  }

  async function saveIsPublic(value: boolean) {
    setIsPublic(value);
    setSavingPublic(true);
    try {
      await orgsApi.update(org.slug, { is_public: value });
      addToast('Setting saved', 'success');
    } catch {
      addToast('Failed to save setting', 'error');
      setIsPublic(org.is_public ?? false);
    } finally {
      setSavingPublic(false);
    }
  }

  async function saveVotingVisibility(value: 'public' | 'hidden') {
    setVotingVisibility(value);
    setSavingVisibility(true);
    try {
      await orgsApi.update(org.slug, { voting_visibility: value });
      addToast('Setting saved', 'success');
    } catch {
      addToast('Failed to save setting', 'error');
      setVotingVisibility(org.voting_visibility ?? 'public');
    } finally {
      setSavingVisibility(false);
    }
  }

  async function saveDefaults(e: React.FormEvent) {
    e.preventDefault();
    const threshold = parseInt(defaultThreshold, 10);
    if (isNaN(threshold) || threshold < 1 || threshold > 100) {
      setDefaultsError('Threshold must be between 1 and 100.');
      return;
    }
    const duration = defaultDuration === '' ? null : parseInt(defaultDuration, 10);
    if (duration !== null && (isNaN(duration) || duration < 1)) {
      setDefaultsError('Duration must be a positive number of days.');
      return;
    }
    const quorum = defaultQuorum === '' ? null : parseInt(defaultQuorum, 10);
    if (quorum !== null && (isNaN(quorum) || quorum < 1 || quorum > 100)) {
      setDefaultsError('Quorum must be between 1 and 100.');
      return;
    }
    setSavingDefaults(true);
    setDefaultsError('');
    try {
      await orgsApi.update(org.slug, { default_voting_duration_days: duration, default_threshold: threshold, default_quorum: quorum });
      addToast('Defaults saved', 'success');
    } catch (err) {
      setDefaultsError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingDefaults(false);
    }
  }

  async function handleTransferOwnership() {
    if (!transferToId) return;
    setTransferring(true);
    try {
      await orgsApi.transferOwnership(org.slug, transferToId);
      addToast('Ownership transferred — you are now a member', 'info');
      navigate({ to: '/orgs/$slug/proposals', params: { slug: org.slug } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to transfer ownership', 'error');
      setTransferring(false);
    }
  }

  async function deleteOrg() {
    setDeleting(true);
    try {
      await orgsApi.delete(org.slug);
      addToast('Organisation deleted', 'info');
      navigate({ to: '/' });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
      setDeleting(false);
    }
  }

  const sectionHeading: React.CSSProperties = {
    margin: '0 0 0.25rem',
    fontSize: 13,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const nonAdminMembers = orgMembers.filter(
    (m: Membership) => m.user_id !== currentUser?.id && m.role !== 'admin',
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ margin: '0 0 2rem', fontSize: '1.4rem' }}>Admin</h2>

      {/* Org info */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={sectionHeading}>Organisation info</h3>
        <form onSubmit={saveOrgInfo} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div>
            <label htmlFor="admin-name" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Name</label>
            <input
              id="admin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label htmlFor="admin-description" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Description</label>
            <textarea
              id="admin-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
          {infoError && <p style={{ color: '#d94040', fontSize: 13, margin: 0 }}>{infoError}</p>}
          <div>
            <button type="submit" disabled={savingInfo} style={{ fontSize: 13, padding: '0.35rem 1rem', cursor: 'pointer' }}>
              {savingInfo ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Proposal defaults */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={sectionHeading}>Proposal defaults</h3>
        <form onSubmit={saveDefaults} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div>
            <label htmlFor="admin-duration" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Default voting duration (days)
            </label>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#aaa' }}>Leave blank for no deadline by default.</p>
            <input
              id="admin-duration"
              type="number"
              min={1}
              max={365}
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
              placeholder="e.g. 7"
              style={{ width: 120, padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div>
            <label htmlFor="admin-threshold" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Default passing threshold (%)
            </label>
            <input
              id="admin-threshold"
              type="number"
              min={1}
              max={100}
              value={defaultThreshold}
              onChange={(e) => setDefaultThreshold(e.target.value)}
              style={{ width: 120, padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div>
            <label htmlFor="admin-quorum" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Default quorum (% of members who must participate)
            </label>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#aaa' }}>Leave blank for no quorum requirement by default.</p>
            <input
              id="admin-quorum"
              type="number"
              min={1}
              max={100}
              value={defaultQuorum}
              onChange={(e) => setDefaultQuorum(e.target.value)}
              placeholder="e.g. 50"
              style={{ width: 120, padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          {defaultsError && <p style={{ color: '#d94040', fontSize: 13, margin: 0 }}>{defaultsError}</p>}
          <div>
            <button type="submit" disabled={savingDefaults} style={{ fontSize: 13, padding: '0.35rem 1rem', cursor: 'pointer' }}>
              {savingDefaults ? 'Saving…' : 'Save defaults'}
            </button>
          </div>
        </form>
      </section>

      {/* Permissions */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={sectionHeading}>Permissions</h3>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#555' }}>Who can create proposals?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(['member', 'moderator', 'admin'] as CreationRole[]).map((role) => (
                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 14, cursor: savingRole ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="radio"
                    name="proposal_creation_role"
                    value={role}
                    checked={proposalCreationRole === role}
                    onChange={() => saveCreationRole('proposal_creation_role', role)}
                    disabled={savingRole}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#555' }}>Who can create topics?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(['member', 'moderator', 'admin'] as CreationRole[]).map((role) => (
                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 14, cursor: savingRole ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="radio"
                    name="topic_creation_role"
                    value={role}
                    checked={topicCreationRole === role}
                    onChange={() => saveCreationRole('topic_creation_role', role)}
                    disabled={savingRole}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#555' }}>Voting visibility during open proposals</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 14, cursor: savingVisibility ? 'not-allowed' : 'pointer' }}>
                <input
                  type="radio"
                  name="voting_visibility"
                  value="public"
                  checked={votingVisibility === 'public'}
                  onChange={() => saveVotingVisibility('public')}
                  disabled={savingVisibility}
                />
                Show live vote counts
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 14, cursor: savingVisibility ? 'not-allowed' : 'pointer' }}>
                <input
                  type="radio"
                  name="voting_visibility"
                  value="hidden"
                  checked={votingVisibility === 'hidden'}
                  onChange={() => saveVotingVisibility('hidden')}
                  disabled={savingVisibility}
                />
                Hide vote counts until proposal closes
              </label>
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#555' }}>Public organisation</p>
            <p style={{ margin: '0 0 0.5rem', fontSize: 12, color: '#aaa' }}>
              Public organisations are listed on the discovery page and anyone can join without an invitation.
            </p>
            <label id="admin-is-public-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 14, cursor: savingPublic ? 'not-allowed' : 'pointer' }}>
              <input
                id="admin-is-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => saveIsPublic(e.target.checked)}
                disabled={savingPublic}
              />
              Allow anyone to discover and join this organisation
            </label>
          </div>
        </div>
      </section>

      {/* Transfer ownership */}
      {nonAdminMembers.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={sectionHeading}>Transfer ownership</h3>
          <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 13, color: '#888' }}>
            Promote another member to admin and step down to member yourself.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={transferToId}
              onChange={(e) => setTransferToId(e.target.value)}
              style={{ fontSize: 13, padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="">Select a member…</option>
              {nonAdminMembers.map((m: Membership) => {
                const user = usersById.get(m.user_id);
                return (
                  <option key={m.user_id} value={m.user_id}>
                    {user?.name ?? m.user_id} ({m.role})
                  </option>
                );
              })}
            </select>
            <ConfirmButton
              label="Transfer ownership"
              confirmLabel="Yes, transfer"
              onConfirm={handleTransferOwnership}
              disabled={!transferToId || transferring}
              style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid #ddd', background: 'none', borderRadius: 4 }}
              confirmStyle={{ border: '1px solid #ddd', background: 'none', borderRadius: 4 }}
            />
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section style={{ border: '1px solid #f5c0c0', borderRadius: 6, padding: '1rem 1.25rem' }}>
        <h3 style={{ ...sectionHeading, color: '#d94040' }}>Danger zone</h3>
        <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 13, color: '#888' }}>
          Permanently delete this organisation and all its proposals, votes, and delegations. This cannot be undone.
        </p>
        <ConfirmButton
          label="Delete organisation"
          confirmLabel="Yes, delete permanently"
          onConfirm={deleteOrg}
          disabled={deleting}
          style={{ fontSize: 13, padding: '0.35rem 0.9rem', cursor: 'pointer', color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
          confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
        />
      </section>
    </div>
  );
}
