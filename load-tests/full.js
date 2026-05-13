/**
 * k6 load test: full user journey
 *
 * Combines browse → view → vote → comment into a realistic scenario.
 * Run this before a public launch to spot bottlenecks across the full stack.
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 --env ORG_SLUG=my-org load-tests/full.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ORG_SLUG = __ENV.ORG_SLUG || 'ripple-test';

export const options = {
  scenarios: {
    browsers: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 20 },
        { duration: '5m',  target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
  },
};

const users = new SharedArray('users', () => {
  try {
    return JSON.parse(open('./seed/users.json'));
  } catch {
    return [];
  }
});

export default function () {
  const cookie = users[((__VU - 1) % (users.length || 1))]?.cookie;
  const headers = cookie
    ? { 'Content-Type': 'application/json', Cookie: `connect.sid=${cookie}` }
    : { 'Content-Type': 'application/json' };

  group('browse proposals', () => {
    const res = http.get(
      `${BASE_URL}/api/proposals?organisation_id=${ORG_SLUG}&page=1&pageSize=20`,
      { headers, tags: { name: 'browse' } },
    );
    check(res, { 'browse ok': (r) => r.status === 200 });

    const items = res.json('items');
    if (!Array.isArray(items) || items.length === 0) return;

    sleep(1);

    const proposal = items[Math.floor(Math.random() * items.length)];

    group('view proposal', () => {
      const tallyRes = http.get(
        `${BASE_URL}/api/proposals/${proposal.id}/tally`,
        { headers, tags: { name: 'tally' } },
      );
      check(tallyRes, { 'tally ok': (r) => r.status === 200 });

      const commentsRes = http.get(
        `${BASE_URL}/api/proposals/${proposal.id}/comments`,
        { headers, tags: { name: 'comments' } },
      );
      check(commentsRes, { 'comments ok': (r) => r.status === 200 });
    });

    sleep(2);

    if (cookie && proposal.status === 'open' && proposal.proposal_type !== 'discussion') {
      group('cast vote', () => {
        const choices = ['yes', 'no', 'abstain'];
        const choice = choices[Math.floor(Math.random() * choices.length)];
        const voteRes = http.post(
          `${BASE_URL}/api/proposals/${proposal.id}/vote`,
          JSON.stringify({ choice }),
          { headers, tags: { name: 'vote' } },
        );
        check(voteRes, { 'vote accepted': (r) => [200, 201, 409].includes(r.status) });
      });

      sleep(1);
    }
  });

  sleep(Math.random() * 3 + 1);
}
