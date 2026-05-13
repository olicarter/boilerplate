/**
 * k6 load test: concurrent voting on a single proposal
 *
 * Simulates many members voting on one high-traffic proposal.
 * This is the most write-heavy path and the most likely bottleneck.
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 load-tests/voting.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const voteDuration = new Trend('vote_duration_ms', true);
const voteErrors = new Rate('vote_errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp up
    { duration: '2m',  target: 50 },   // sustained
    { duration: '30s', target: 100 },  // peak
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:vote}': ['p(95)<500', 'p(99)<2000'],
    vote_errors: ['rate<0.01'],
  },
};

// Pre-created test user tokens — populate via setup() or seed script
const users = new SharedArray('users', () => {
  // In a real run, these would be seeded session tokens.
  // For local testing, create them via the test-setup endpoint.
  return JSON.parse(open('./seed/users.json'));
});

export function setup() {
  // Create a test org and proposal to vote on
  const setupRes = http.post(
    `${BASE_URL}/api/auth/test-setup`,
    JSON.stringify({ name: 'LoadTest Admin', email: 'loadtest-admin@ripple.test' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(setupRes, { 'setup ok': (r) => r.status === 200 || r.status === 201 });

  const data = setupRes.json();
  const adminCookie = setupRes.cookies['connect.sid']?.[0]?.value;
  const orgSlug = data.org?.slug;

  if (!orgSlug) return { skip: true };

  // Create a topic
  const topicRes = http.post(
    `${BASE_URL}/api/orgs/${orgSlug}/topics`,
    JSON.stringify({ name: 'Load Test Topic' }),
    { headers: { 'Content-Type': 'application/json', Cookie: `connect.sid=${adminCookie}` } },
  );
  const topicId = topicRes.json('id');

  // Create a proposal
  const proposalRes = http.post(
    `${BASE_URL}/api/proposals`,
    JSON.stringify({
      title: 'Load test proposal',
      description: 'This proposal is used for load testing',
      organisation_id: data.org.id,
      topic_id: topicId,
    }),
    { headers: { 'Content-Type': 'application/json', Cookie: `connect.sid=${adminCookie}` } },
  );

  const proposal = proposalRes.json('item');
  if (!proposal?.id) return { skip: true };

  // Publish it
  http.post(
    `${BASE_URL}/api/proposals/${proposal.id}/publish`,
    null,
    { headers: { Cookie: `connect.sid=${adminCookie}` } },
  );

  return { proposalId: proposal.id, orgSlug, adminCookie };
}

export default function (data) {
  if (data?.skip) {
    sleep(1);
    return;
  }

  const vu = __VU;
  const userIndex = (vu - 1) % (users?.length || 1);
  const cookie = users?.[userIndex]?.cookie;

  if (!cookie) {
    sleep(1);
    return;
  }

  const choices = ['yes', 'no', 'abstain'];
  const choice = choices[Math.floor(Math.random() * choices.length)];

  const start = Date.now();
  const voteRes = http.post(
    `${BASE_URL}/api/proposals/${data.proposalId}/vote`,
    JSON.stringify({ choice }),
    {
      headers: { 'Content-Type': 'application/json', Cookie: `connect.sid=${cookie}` },
      tags: { name: 'vote' },
    },
  );
  voteDuration.add(Date.now() - start);

  const ok = check(voteRes, {
    'vote 200 or 409': (r) => r.status === 200 || r.status === 201 || r.status === 409,
  });
  voteErrors.add(!ok);

  sleep(Math.random() * 2 + 0.5);
}
