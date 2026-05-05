import type { APIRequestContext } from '@playwright/test';

const API = 'http://localhost:5173';

export async function createTopic(request: APIRequestContext, name: string) {
  const res = await request.post(`${API}/api/topics`, {
    data: { id: crypto.randomUUID(), name, description: '' },
  });
  const body = await res.json();
  return body.item as { id: string; name: string };
}

export async function createProposal(
  request: APIRequestContext,
  topicId: string,
  title: string,
  options: { description?: string; status?: 'open' | 'closed' | 'draft'; closes_at?: string; threshold?: number } = {},
) {
  const res = await request.post(`${API}/api/proposals`, {
    data: {
      id: crypto.randomUUID(),
      topic_id: topicId,
      title,
      description: options.description ?? '',
      closes_at: options.closes_at,
      threshold: options.threshold,
      status: options.status === 'draft' ? 'draft' : undefined,
    },
  });
  const body = await res.json();
  if (options.status === 'closed') {
    await request.patch(`${API}/api/proposals/${body.item.id}`, {
      data: { status: 'closed', closed_at: new Date().toISOString() },
    });
  }
  return body.item as { id: string; title: string; topic_id: string; status: string; threshold: number };
}

export async function createVote(
  request: APIRequestContext,
  proposalId: string,
  userId: string,
  choice: 'yes' | 'no' | 'abstain',
) {
  const res = await request.post(`${API}/api/votes`, {
    data: { id: crypto.randomUUID(), proposal_id: proposalId, user_id: userId, choice },
  });
  const body = await res.json();
  return body.item as { id: string; choice: string };
}

export async function createComment(
  request: APIRequestContext,
  proposalId: string,
  body: string,
) {
  const res = await request.post(`${API}/api/proposals/${proposalId}/comments`, {
    data: { id: crypto.randomUUID(), body },
  });
  const json = await res.json();
  return json.item as { id: string; body: string; author_id: string };
}

export async function createDelegation(
  request: APIRequestContext,
  delegatorId: string,
  delegateId: string,
  topicId: string | null = null,
  expiresAt?: string | null,
) {
  const res = await request.post(`${API}/api/delegations`, {
    data: {
      id: crypto.randomUUID(),
      delegator_id: delegatorId,
      delegate_id: delegateId,
      topic_id: topicId,
      expires_at: expiresAt ?? null,
    },
  });
  const body = await res.json();
  return body.item as { id: string };
}
