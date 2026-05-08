import { useState, useCallback } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Link, useNavigate } from '@tanstack/react-router';
import { usersCollection, membershipsCollection } from '../collections';
import { orgsApi, type User, type Membership, type Proposal, type Vote } from '../api';
import { useCurrentUser } from '../context';
import { useOrg } from '../OrgContext';
import { useToast } from '../components/Toast';
import { ConfirmButton } from '../components/ConfirmButton';
import { UserSearch } from '../components/UserSearch';

const ROLE_ORDER: Membership['role'][] = ['admin', 'moderator', 'member', 'observer'];

export function MembersPage() {
  const { org, collections: { proposalsCollection, votesCollection } } = useOrg();
  const currentUser = useCurrentUser();
  const addToast = useToast();
  const navigate = useNavigate();

  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);

  const eligibleProposalCount = (allProposals ?? []).filter(
    (p: Proposal) => p.status !== 'draft',
  ).length;
  const votesByUser = new Map<string, Set<string>>();
  for (const v of (allVotes ?? []) as Vote[]) {
    if (!votesByUser.has(v.user_id)) votesByUser.set(v.user_id, new Set());
    votesByUser.get(v.user_id)!.add(v.proposal_id);
  }

  const orgMembers = (allMemberships ?? []).filter((m: Membership) => m.organisation_id === org.id);
  const myMembership = orgMembers.find((m: Membership) => m.user_id === currentUser?.id);
  const isAdmin = myMembership?.role === 'admin';

  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<Membership['role']>('member');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!addingUserId) return;
    setAdding(true);
    try {
      await orgsApi.addMember(org.slug, { user_id: addingUserId, role: addRole });
      addToast('Member added', 'success');
      setAddingUserId(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add member', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(userId: string, role: Membership['role']) {
    try {
      await orgsApi.updateMemberRole(org.slug, userId, role);
      addToast('Role updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    }
  }

  async function handleWeightChange(userId: string, weight: number) {
    if (isNaN(weight) || weight < 1 || weight > 100) return;
    try {
      await orgsApi.updateMemberWeight(org.slug, userId, weight);
      addToast('Vote weight updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update weight', 'error');
    }
  }

  async function handleRemove(userId: string) {
    try {
      await orgsApi.removeMember(org.slug, userId);
      addToast('Member removed', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove member', 'error');
    }
  }

  async function handleLeave() {
    if (!currentUser) return;
    try {
      await orgsApi.removeMember(org.slug, currentUser.id);
      addToast('You have left the organisation', 'info');
      navigate({ to: '/' });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to leave organisation', 'error');
    }
  }

  const [generatingToken, setGeneratingToken] = useState(false);
  const [revokingToken, setRevokingToken] = useState(false);

  const inviteUrl = org.invite_token
    ? `${window.location.origin}/orgs/${org.slug}/join?token=${org.invite_token}`
    : null;

  const handleGenerateToken = useCallback(async () => {
    setGeneratingToken(true);
    try {
      await orgsApi.generateInviteToken(org.slug);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to generate invite link', 'error');
    } finally {
      setGeneratingToken(false);
    }
  }, [org.slug, addToast]);

  const handleRevokeToken = useCallback(async () => {
    setRevokingToken(true);
    try {
      await orgsApi.revokeInviteToken(org.slug);
      addToast('Invite link revoked', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to revoke invite link', 'error');
    } finally {
      setRevokingToken(false);
    }
  }, [org.slug, addToast]);

  const handleCopyLink = useCallback(() => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    addToast('Invite link copied', 'success');
  }, [inviteUrl, addToast]);

  const usersById = new Map<string, User>((allUsers ?? []).map((u: User) => [u.id, u]));
  const memberIds = new Set(orgMembers.map((m: Membership) => m.user_id));

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Members</h2>

      {isAdmin && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem', background: '#fafafa' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invite link</h3>
          {inviteUrl ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                readOnly
                value={inviteUrl}
                style={{ flex: '1 1 200px', fontSize: 12, padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, background: '#fff', color: '#333', fontFamily: 'monospace' }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button onClick={handleCopyLink} style={{ fontSize: 13, padding: '0.4rem 0.8rem' }}>
                Copy
              </button>
              <ConfirmButton
                label={revokingToken ? 'Revoking…' : 'Revoke'}
                confirmLabel="Yes, revoke"
                onConfirm={handleRevokeToken}
                style={{ fontSize: 13, padding: '0.4rem 0.8rem', color: '#d94040', border: '1px solid #f5c5c5', background: 'none', borderRadius: 4 }}
                confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
              />
            </div>
          ) : (
            <button onClick={handleGenerateToken} disabled={generatingToken} style={{ fontSize: 13, padding: '0.4rem 0.9rem' }}>
              {generatingToken ? 'Generating…' : 'Generate invite link'}
            </button>
          )}
        </div>
      )}

      {isAdmin && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.5rem', background: '#fafafa' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add member</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <UserSearch
                users={(allUsers ?? []).filter((u: User) => !memberIds.has(u.id))}
                onSelect={(user: User) => setAddingUserId(user.id)}
                placeholder="Search users…"
              />
            </div>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as Membership['role'])}
              style={{ padding: '0.45rem 0.6rem', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
            >
              {ROLE_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={handleAdd}
              disabled={!addingUserId || adding}
              style={{ fontSize: 13, padding: '0.45rem 0.9rem' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {orgMembers
          .sort((a: Membership, b: Membership) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
          .map((m: Membership) => {
            const user = usersById.get(m.user_id);
            const isMe = m.user_id === currentUser?.id;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', border: '1px solid #eee', borderRadius: 6, background: '#fff',
                }}
              >
                <div>
                  <Link
                    to="/orgs/$slug/users/$id"
                    params={{ slug: org.slug, id: m.user_id }}
                    style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none', color: '#333' }}
                  >
                    {user?.name ?? m.user_id}
                  </Link>
                  {isMe && <span style={{ marginLeft: '0.5rem', fontSize: 11, color: '#aaa' }}>(you)</span>}
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                    {user?.email} · joined {new Date(m.joined_at).toLocaleDateString()}
                    {eligibleProposalCount > 0 && (() => {
                      const voted = votesByUser.get(m.user_id)?.size ?? 0;
                      const pct = Math.round((voted / eligibleProposalCount) * 100);
                      return <span style={{ marginLeft: '0.5rem', color: pct >= 70 ? '#2d9a4e' : pct >= 30 ? '#888' : '#b45309' }}>· {pct}% participation</span>;
                    })()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isAdmin && !isMe ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value as Membership['role'])}
                        style={{ fontSize: 12, padding: '0.2rem 0.4rem', border: '1px solid #ddd', borderRadius: 4 }}
                      >
                        {ROLE_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={m.weight ?? 1}
                        title="Vote weight"
                        aria-label="Vote weight"
                        onBlur={(e) => handleWeightChange(m.user_id, parseInt(e.target.value, 10))}
                        style={{ width: 52, fontSize: 12, padding: '0.2rem 0.4rem', border: '1px solid #ddd', borderRadius: 4, textAlign: 'center' }}
                        data-testid="member-weight-input"
                      />
                      <ConfirmButton
                        label="Remove"
                        confirmLabel="Yes, remove"
                        onConfirm={() => handleRemove(m.user_id)}
                        style={{ fontSize: 12, padding: '0.2rem 0.6rem', color: '#d94040', border: '1px solid #f5c5c5', background: 'none', borderRadius: 4 }}
                        confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
                      />
                    </>
                  ) : (
                    <>
                      <span style={{
                        fontSize: 11, padding: '0.2rem 0.6rem', borderRadius: 12,
                        background: m.role === 'admin' ? '#e8f0ff' : '#f0f0f0',
                        color: m.role === 'admin' ? '#3358c4' : '#666',
                      }}>
                        {m.role}
                      </span>
                      {(m.weight ?? 1) > 1 && (
                        <span title={`Vote weight: ${m.weight}`} style={{ fontSize: 11, padding: '0.2rem 0.5rem', borderRadius: 12, background: '#fff8e1', color: '#8a6d00', border: '1px solid #ffe082' }}>
                          ×{m.weight}
                        </span>
                      )}
                      {isMe && (
                        <ConfirmButton
                          label="Leave"
                          confirmLabel="Yes, leave"
                          onConfirm={handleLeave}
                          style={{ fontSize: 12, padding: '0.2rem 0.6rem', color: '#d94040', border: '1px solid #f5c5c5', background: 'none', borderRadius: 4 }}
                          confirmStyle={{ color: '#d94040', border: '1px solid #d94040', background: 'none', borderRadius: 4 }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
