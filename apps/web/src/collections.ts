import { electricCollectionOptions } from '@tanstack/electric-db-collection';
import { createCollection } from '@tanstack/react-db';
import {
  usersApi, topicsApi, proposalsApi, delegationsApi, votesApi, commentsApi,
  type User, type Topic, type Proposal, type Delegation, type Vote, type Comment,
} from './api';

const shapeUrl = `${window.location.origin}/electric/v1/shape`;

export const usersCollection = createCollection(
  electricCollectionOptions<User>({
    id: 'users',
    shapeOptions: { url: shapeUrl, params: { table: 'users' } },
    getKey: (row: unknown) => (row as User).id,
    onInsert: async ({ transaction }) => {
      const user = transaction.mutations[0].modified as User;
      const result = await usersApi.create({ id: user.id, name: user.name, email: user.email });
      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const user = transaction.mutations[0].modified as User;
      const result = await usersApi.update(user.id, { name: user.name, email: user.email });
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const user = transaction.mutations[0].original as User;
      const result = await usersApi.delete(user.id);
      return { txid: result.txid };
    },
  }),
);

export const topicsCollection = createCollection(
  electricCollectionOptions<Topic>({
    id: 'topics',
    shapeOptions: { url: shapeUrl, params: { table: 'topics' } },
    getKey: (row: unknown) => (row as Topic).id,
    onInsert: async ({ transaction }) => {
      const topic = transaction.mutations[0].modified as Topic;
      const result = await topicsApi.create({ id: topic.id, name: topic.name, description: topic.description });
      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const topic = transaction.mutations[0].modified as Topic;
      const result = await topicsApi.update(topic.id, { name: topic.name, description: topic.description });
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const topic = transaction.mutations[0].original as Topic;
      const result = await topicsApi.delete(topic.id);
      return { txid: result.txid };
    },
  }),
);

export const proposalsCollection = createCollection(
  electricCollectionOptions<Proposal>({
    id: 'proposals',
    shapeOptions: { url: shapeUrl, params: { table: 'proposals' } },
    getKey: (row: unknown) => (row as Proposal).id,
    onInsert: async ({ transaction }) => {
      const p = transaction.mutations[0].modified as Proposal;
      const result = await proposalsApi.create({
        id: p.id,
        topic_id: p.topic_id,
        title: p.title,
        description: p.description,
        closes_at: p.closes_at,
        threshold: p.threshold,
        status: p.status as 'open' | 'draft',
      });
      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const p = transaction.mutations[0].modified as Proposal;
      const result = await proposalsApi.update(p.id, { title: p.title, description: p.description, status: p.status, closed_at: p.closed_at });
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const p = transaction.mutations[0].original as Proposal;
      const result = await proposalsApi.delete(p.id);
      return { txid: result.txid };
    },
  }),
);

export const delegationsCollection = createCollection(
  electricCollectionOptions<Delegation>({
    id: 'delegations',
    shapeOptions: { url: shapeUrl, params: { table: 'delegations' } },
    getKey: (row: unknown) => (row as Delegation).id,
    onInsert: async ({ transaction }) => {
      const d = transaction.mutations[0].modified as Delegation;
      const result = await delegationsApi.create({
        id: d.id,
        delegator_id: d.delegator_id,
        delegate_id: d.delegate_id,
        topic_id: d.topic_id,
        expires_at: d.expires_at ?? null,
      });
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const d = transaction.mutations[0].original as Delegation;
      const result = await delegationsApi.delete(d.id);
      return { txid: result.txid };
    },
  }),
);

export const votesCollection = createCollection(
  electricCollectionOptions<Vote>({
    id: 'votes',
    shapeOptions: { url: shapeUrl, params: { table: 'votes' } },
    getKey: (row: unknown) => (row as Vote).id,
    onInsert: async ({ transaction }) => {
      const v = transaction.mutations[0].modified as Vote;
      const result = await votesApi.create({ id: v.id, proposal_id: v.proposal_id, user_id: v.user_id, choice: v.choice });
      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const v = transaction.mutations[0].modified as Vote;
      const result = await votesApi.update(v.id, v.choice);
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const v = transaction.mutations[0].original as Vote;
      const result = await votesApi.delete(v.id);
      return { txid: result.txid };
    },
  }),
);

export const commentsCollection = createCollection(
  electricCollectionOptions<Comment>({
    id: 'comments',
    shapeOptions: { url: shapeUrl, params: { table: 'comments' } },
    getKey: (row: unknown) => (row as Comment).id,
    onInsert: async ({ transaction }) => {
      const c = transaction.mutations[0].modified as Comment;
      const result = await commentsApi.create(c.proposal_id, { id: c.id, body: c.body });
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const c = transaction.mutations[0].original as Comment;
      const result = await commentsApi.delete(c.id);
      return { txid: result.txid };
    },
  }),
);
