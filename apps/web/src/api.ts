export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export interface Passkey {
  id: string;
  userId: string;
  createdAt: string;
  transports: string[] | null;
}

export const authApi = {
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  listPasskeys: () => request<Passkey[]>('/auth/passkeys'),
  addPasskeyBegin: () => request<never>('/auth/add-passkey/begin', { method: 'POST' }),
  addPasskeyFinish: (credential: unknown) =>
    request<{ success: boolean }>('/auth/add-passkey/finish', { method: 'POST', body: JSON.stringify(credential) }),
  deletePasskey: (id: string) =>
    request<{ success: boolean }>(`/auth/passkeys/${id}`, { method: 'DELETE' }),
};

export interface MutationResult<T> {
  item: T;
  txid: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  description: string;
  invite_token: string | null;
  proposal_creation_role: 'member' | 'moderator' | 'admin';
  topic_creation_role: 'member' | 'moderator' | 'admin';
  default_voting_duration_days: number | null;
  default_threshold: number;
  voting_visibility: 'public' | 'hidden';
  default_quorum: number | null;
  is_public: boolean;
  veto_role: 'moderator' | 'admin';
  min_endorsements: number;
  require_member_approval: boolean;
  proposal_templates: Array<{
    id: string;
    name: string;
    description: string;
    proposal_type: 'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent' | 'approval' | 'score_voting' | 'ranked_choice';
    threshold: number;
  }>;
  created_at: string;
  [key: string]: unknown;
}

export interface Membership {
  id: string;
  organisation_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member' | 'observer';
  status: 'pending' | 'approved';
  weight: number;
  joined_at: string;
  invited_by: string | null;
  [key: string]: unknown;
}

export interface Topic {
  id: string;
  organisation_id: string;
  name: string;
  description: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Proposal {
  id: string;
  organisation_id: string;
  topic_id: string;
  author_id: string | null;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'closed' | 'withdrawn';
  proposal_type: 'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent' | 'approval' | 'score_voting' | 'ranked_choice';
  threshold: number;
  quorum: number | null;
  quorum_type: 'soft' | 'hard';
  outcome: 'implemented' | 'not_implemented' | 'in_progress' | null;
  deliberation_ends_at: string | null;
  created_at: string;
  closes_at: string | null;
  closed_at: string | null;
  pinned: boolean;
  tags: string[];
  [key: string]: unknown;
}

export interface Delegation {
  id: string;
  organisation_id: string;
  delegator_id: string;
  delegate_id: string;
  topic_id: string | null;
  expires_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Vote {
  id: string;
  proposal_id: string;
  organisation_id: string;
  user_id: string;
  choice: 'yes' | 'no' | 'abstain' | null;
  option_id: string | null;
  reason: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface ProposalOption {
  id: string;
  proposal_id: string;
  organisation_id: string;
  text: string;
  position: number;
  created_at: string;
  [key: string]: unknown;
}

export interface TallyResult {
  yes: number;
  no: number;
  abstain: number;
  total: number;
  eligible_count: number | null;
  quorum_met: boolean | null;
  options: Array<{ id: string; text: string; count: number; position: number }>;
}

export interface DelegationVote {
  delegate_id: string;
  choice: string;
}

export interface DelegationChainLink {
  user_id: string;
  name: string;
}

export interface DelegationChain {
  chain: DelegationChainLink[];
  voter: (DelegationChainLink & { choice: string }) | null;
}

export interface Argument {
  id: string;
  proposal_id: string;
  organisation_id: string;
  author_id: string | null;
  side: 'for' | 'against';
  body: string;
  created_at: string;
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const usersApi = {
  create: (data: { id: string; name: string; email: string }) =>
    request<MutationResult<User>>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<User, 'name' | 'email' | 'bio'>>) =>
    request<MutationResult<User>>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/users/${id}`, { method: 'DELETE' }),
  getNotificationPreferences: () =>
    request<Record<string, boolean>>('/users/me/notification-preferences'),
  updateNotificationPreferences: (prefs: Record<string, boolean>) =>
    request<Record<string, boolean>>('/users/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),
};

export const orgsApi = {
  list: () => request<Organisation[]>('/orgs'),
  get: (slug: string) => request<Organisation>(`/orgs/${slug}`),
  create: (data: { name: string; slug?: string; description?: string }) =>
    request<MutationResult<Organisation>>('/orgs', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<Pick<Organisation, 'name' | 'description' | 'proposal_creation_role' | 'topic_creation_role' | 'default_voting_duration_days' | 'default_threshold' | 'voting_visibility' | 'default_quorum' | 'is_public' | 'veto_role' | 'min_endorsements' | 'require_member_approval' | 'proposal_templates'>>) =>
    request<MutationResult<Organisation>>(`/orgs/${slug}`, { method: 'PATCH', body: JSON.stringify(data) }),
  transferOwnership: (slug: string, toUserId: string) =>
    request<{ txid: number }>(`/orgs/${slug}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ to_user_id: toUserId }) }),
  delete: (slug: string) =>
    request<{ txid: number }>(`/orgs/${slug}`, { method: 'DELETE' }),
  listMembers: (slug: string) => request<Membership[]>(`/orgs/${slug}/members`),
  addMember: (slug: string, data: { user_id: string; role?: Membership['role'] }) =>
    request<MutationResult<Membership>>(`/orgs/${slug}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (slug: string, userId: string, role: Membership['role']) =>
    request<MutationResult<Membership>>(`/orgs/${slug}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  updateMemberWeight: (slug: string, userId: string, weight: number) =>
    request<MutationResult<Membership>>(`/orgs/${slug}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ weight }) }),
  removeMember: (slug: string, userId: string) =>
    request<{ txid: number }>(`/orgs/${slug}/members/${userId}`, { method: 'DELETE' }),
  joinViaToken: (slug: string, token: string) =>
    request<MutationResult<Membership>>(`/orgs/${slug}/join`, { method: 'POST', body: JSON.stringify({ token }) }),
  joinPublic: (slug: string) =>
    request<MutationResult<Membership>>(`/orgs/${slug}/join`, { method: 'POST', body: JSON.stringify({}) }),
  approveMember: (slug: string, userId: string) =>
    request<MutationResult<Membership>>(`/orgs/${slug}/members/${userId}/approve`, { method: 'POST' }),
  rejectMember: (slug: string, userId: string) =>
    request<{ txid: number }>(`/orgs/${slug}/members/${userId}/reject`, { method: 'POST' }),
  generateInviteToken: (slug: string) =>
    request<MutationResult<Organisation>>(`/orgs/${slug}/invite-token`, { method: 'POST' }),
  revokeInviteToken: (slug: string) =>
    request<MutationResult<Organisation>>(`/orgs/${slug}/invite-token`, { method: 'DELETE' }),
  listAuditLog: (slug: string) => request<AuditLogEntry[]>(`/orgs/${slug}/audit-log`),
  getPublicResults: (slug: string) => request<{ org: Organisation; proposals: Proposal[] }>(`/orgs/${slug}/results`),
  searchMembers: (slug: string, q: string) =>
    request<{ id: string; name: string }[]>(`/orgs/${slug}/members/search?q=${encodeURIComponent(q)}`),
};

export const topicsApi = {
  create: (data: { id: string; organisation_id: string; name: string; description?: string }) =>
    request<MutationResult<Topic>>('/topics', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<Topic, 'name' | 'description'>>) =>
    request<MutationResult<Topic>>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/topics/${id}`, { method: 'DELETE' }),
};

export const proposalOptionsApi = {
  create: (proposalId: string, data: { id: string; text: string; position: number }) =>
    request<ProposalOption>(`/proposals/${proposalId}/options`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (proposalId: string, optionId: string) =>
    request<void>(`/proposals/${proposalId}/options/${optionId}`, { method: 'DELETE' }),
};

export const proposalsApi = {
  create: (data: { id: string; organisation_id: string; topic_id: string; title: string; description?: string; closes_at?: string | null; deliberation_ends_at?: string | null; threshold?: number; quorum?: number | null; quorum_type?: 'soft' | 'hard'; status?: 'open' | 'draft'; proposal_type?: 'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent' | 'approval' | 'score_voting' | 'ranked_choice' }) =>
    request<MutationResult<Proposal>>('/proposals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<Proposal, 'title' | 'description' | 'status' | 'closed_at' | 'closes_at' | 'threshold' | 'tags'>>) =>
    request<MutationResult<Proposal>>(`/proposals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publish: (id: string) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/publish`, { method: 'POST' }),
  close: (id: string) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/close`, { method: 'POST' }),
  reopen: (id: string) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/reopen`, { method: 'POST' }),
  withdraw: (id: string) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/withdraw`, { method: 'POST' }),
  delete: (id: string) =>
    request<{ txid: number }>(`/proposals/${id}`, { method: 'DELETE' }),
  tally: (id: string) =>
    request<TallyResult>(`/proposals/${id}/tally`),
  myDelegationVote: (id: string) =>
    request<DelegationVote | null>(`/proposals/${id}/my-delegation-vote`),
  myDelegationChain: (id: string) =>
    request<DelegationChain | null>(`/proposals/${id}/my-delegation-chain`),
  versions: (id: string) =>
    request<ProposalVersion[]>(`/proposals/${id}/versions`),
  setOutcome: (id: string, outcome: Proposal['outcome']) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/outcome`, { method: 'POST', body: JSON.stringify({ outcome }) }),
  pin: (id: string) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/pin`, { method: 'POST' }),
  unpin: (id: string) =>
    request<MutationResult<Proposal>>(`/proposals/${id}/unpin`, { method: 'POST' }),
  sendVoteReminder: (id: string) =>
    request<{ count: number }>(`/proposals/${id}/vote-reminder`, { method: 'POST' }),
  listReactions: (id: string) =>
    request<ProposalReaction[]>(`/proposals/${id}/reactions`),
  react: (id: string, emoji: string) =>
    request<ProposalReaction>(`/proposals/${id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  removeReaction: (id: string) =>
    request<void>(`/proposals/${id}/reactions`, { method: 'DELETE' }),
};

export interface ProposalReaction {
  id: string;
  proposal_id: string;
  organisation_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  [key: string]: unknown;
}

export const delegationsApi = {
  create: (data: { id: string; organisation_id: string; delegator_id: string; delegate_id: string; topic_id?: string | null; expires_at?: string | null }) =>
    request<MutationResult<Delegation>>('/delegations', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/delegations/${id}`, { method: 'DELETE' }),
};

export interface Comment {
  id: string;
  proposal_id: string;
  organisation_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  hidden_by: string | null;
  hidden_reason: string | null;
  pinned_at: string | null;
  [key: string]: unknown;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  organisation_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  [key: string]: unknown;
}

export interface ProposalVersion {
  id: string;
  proposal_id: string;
  changed_by: string | null;
  title: string;
  description: string;
  created_at: string;
}

export const commentsApi = {
  create: (proposalId: string, data: { id: string; body: string }) =>
    request<MutationResult<Comment>>(`/proposals/${proposalId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  edit: (id: string, body: string) =>
    request<MutationResult<Comment>>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/comments/${id}`, { method: 'DELETE' }),
  react: (commentId: string, emoji: string) =>
    request<{ item?: CommentReaction; deleted?: boolean; txid: number }>(`/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
  hide: (commentId: string, reason: string) =>
    request<MutationResult<Comment>>(`/comments/${commentId}/hide`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unhide: (commentId: string) =>
    request<MutationResult<Comment>>(`/comments/${commentId}/unhide`, { method: 'POST' }),
  pin: (commentId: string) =>
    request<MutationResult<Comment>>(`/comments/${commentId}/pin`, { method: 'POST' }),
  unpin: (commentId: string) =>
    request<MutationResult<Comment>>(`/comments/${commentId}/unpin`, { method: 'POST' }),
};

export interface Veto {
  id: string;
  proposal_id: string;
  organisation_id: string;
  author_id: string;
  reason: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Endorsement {
  id: string;
  proposal_id: string;
  organisation_id: string;
  user_id: string;
  created_at: string;
  [key: string]: unknown;
}

export const endorsementsApi = {
  list: (proposalId: string) =>
    request<Endorsement[]>(`/proposals/${proposalId}/endorsements`),
  endorse: (proposalId: string) =>
    request<MutationResult<Endorsement>>(`/proposals/${proposalId}/endorsements`, { method: 'POST' }),
  retract: (proposalId: string) =>
    request<{ txid: number }>(`/proposals/${proposalId}/endorsements`, { method: 'DELETE' }),
};

export const vetoesApi = {
  cast: (proposalId: string, reason: string) =>
    request<MutationResult<Veto>>(`/proposals/${proposalId}/vetoes`, { method: 'POST', body: JSON.stringify({ reason }) }),
  retract: (vetoId: string) =>
    request<{ txid: number }>(`/vetoes/${vetoId}`, { method: 'DELETE' }),
};

export const argumentsApi = {
  create: (proposalId: string, data: { id: string; side: 'for' | 'against'; body: string }) =>
    request<MutationResult<Argument>>(`/proposals/${proposalId}/arguments`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/arguments/${id}`, { method: 'DELETE' }),
};

export interface Notification {
  id: string;
  user_id: string;
  org_id: string | null;
  type: 'proposal.opened' | 'proposal.closed' | 'delegate.voted' | 'member.joined' | 'comment.mention' | 'comment.posted' | 'delegation.added' | 'delegation.removed';
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: (limit?: number) =>
    request<Notification[]>(`/notifications${limit ? `?limit=${limit}` : ''}`),
  unreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    request<void>('/notifications/read-all', { method: 'POST' }),
};

export const votesApi = {
  create: (data: { id: string; proposal_id: string; user_id: string; choice?: Vote['choice']; option_id?: string | null; reason?: string | null }) =>
    request<MutationResult<Vote>>('/votes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { choice?: Vote['choice']; option_id?: string | null; reason?: string | null }) =>
    request<MutationResult<Vote>>(`/votes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/votes/${id}`, { method: 'DELETE' }),
};
