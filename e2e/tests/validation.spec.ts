import { test, expect, API } from '../fixtures';
import { createTopic, TEST_ORG_ID } from '../helpers';

// ── Proposal title ────────────────────────────────────────────────────────────

test('API rejects proposal with empty title', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Test');
  const res = await page.request.post(`${API}/api/proposals`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, topic_id: topic.id, title: '' },
  });
  expect(res.status()).toBe(400);
});

test('API rejects proposal with whitespace-only title', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Test');
  const res = await page.request.post(`${API}/api/proposals`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, topic_id: topic.id, title: '   ' },
  });
  expect(res.status()).toBe(400);
});

test('API rejects proposal title exceeding 200 chars', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Test');
  const res = await page.request.post(`${API}/api/proposals`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, topic_id: topic.id, title: 'a'.repeat(201) },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.message).toMatch(/200/);
});

test('API accepts proposal title exactly 200 chars', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Test');
  const res = await page.request.post(`${API}/api/proposals`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, topic_id: topic.id, title: 'a'.repeat(200) },
  });
  expect(res.status()).toBe(201);
});

// ── Proposal description ──────────────────────────────────────────────────────

test('API rejects proposal description exceeding 10 000 chars', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Test');
  const res = await page.request.post(`${API}/api/proposals`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, topic_id: topic.id, title: 'Valid title', description: 'a'.repeat(10_001) },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.message).toMatch(/10.?000/);
});

test('API accepts proposal description exactly 10 000 chars', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Test');
  const res = await page.request.post(`${API}/api/proposals`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, topic_id: topic.id, title: 'Valid title', description: 'a'.repeat(10_000) },
  });
  expect(res.status()).toBe(201);
});

// ── Topic name ────────────────────────────────────────────────────────────────

test('API rejects topic with empty name', async ({ page, asAlice }) => {
  const res = await page.request.post(`${API}/api/topics`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, name: '' },
  });
  expect(res.status()).toBe(400);
});

test('API rejects topic name exceeding 100 chars', async ({ page, asAlice }) => {
  const res = await page.request.post(`${API}/api/topics`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, name: 'a'.repeat(101) },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.message).toMatch(/100/);
});

test('API accepts topic name exactly 100 chars', async ({ page, asAlice }) => {
  const res = await page.request.post(`${API}/api/topics`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, name: 'a'.repeat(100) },
  });
  expect(res.status()).toBe(201);
});
