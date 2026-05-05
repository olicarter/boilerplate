export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
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
  created_at: string;
  [key: string]: unknown;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Proposal {
  id: string;
  topic_id: string;
  author_id: string | null;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'closed' | 'withdrawn';
  threshold: number;
  created_at: string;
  closes_at: string | null;
  closed_at: string | null;
  [key: string]: unknown;
}

export interface Delegation {
  id: string;
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
  user_id: string;
  choice: 'yes' | 'no' | 'abstain';
  created_at: string;
  [key: string]: unknown;
}

export interface TallyResult {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

export interface DelegationVote {
  delegate_id: string;
  choice: string;
}

export const usersApi = {
  create: (data: { id: string; name: string; email: string }) =>
    request<MutationResult<User>>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<User, 'name' | 'email'>>) =>
    request<MutationResult<User>>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/users/${id}`, { method: 'DELETE' }),
};

export const topicsApi = {
  create: (data: { id: string; name: string; description?: string }) =>
    request<MutationResult<Topic>>('/topics', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<Topic, 'name' | 'description'>>) =>
    request<MutationResult<Topic>>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/topics/${id}`, { method: 'DELETE' }),
};

export const proposalsApi = {
  create: (data: { id: string; topic_id: string; title: string; description?: string; closes_at?: string | null; threshold?: number; status?: 'open' | 'draft' }) =>
    request<MutationResult<Proposal>>('/proposals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<Proposal, 'title' | 'description' | 'status' | 'closed_at' | 'closes_at' | 'threshold'>>) =>
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
};

export const delegationsApi = {
  create: (data: { id: string; delegator_id: string; delegate_id: string; topic_id?: string | null; expires_at?: string | null }) =>
    request<MutationResult<Delegation>>('/delegations', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/delegations/${id}`, { method: 'DELETE' }),
};

export interface Comment {
  id: string;
  proposal_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  [key: string]: unknown;
}

export const commentsApi = {
  create: (proposalId: string, data: { id: string; body: string }) =>
    request<MutationResult<Comment>>(`/proposals/${proposalId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/comments/${id}`, { method: 'DELETE' }),
};

export const votesApi = {
  create: (data: { id: string; proposal_id: string; user_id: string; choice: Vote['choice'] }) =>
    request<MutationResult<Vote>>('/votes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, choice: Vote['choice']) =>
    request<MutationResult<Vote>>(`/votes/${id}`, { method: 'PATCH', body: JSON.stringify({ choice }) }),
  delete: (id: string) =>
    request<{ txid: number }>(`/votes/${id}`, { method: 'DELETE' }),
};
