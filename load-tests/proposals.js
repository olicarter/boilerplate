/**
 * k6 load test: proposal list read path
 *
 * Simulates many users browsing the proposals list — the read-heavy
 * Electric sync path. Verifies the API + Postgres can handle burst reads.
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 --env ORG_SLUG=my-org load-tests/proposals.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ORG_SLUG = __ENV.ORG_SLUG || 'ripple-test';

export const options = {
  stages: [
    { duration: '15s', target: 30 },
    { duration: '3m',  target: 100 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:list_proposals}': ['p(95)<300', 'p(99)<1000'],
    'http_req_duration{name:get_tally}': ['p(95)<400', 'p(99)<1500'],
  },
};

export default function () {
  // List proposals
  const listRes = http.get(
    `${BASE_URL}/api/proposals?organisation_id=${ORG_SLUG}&page=1&pageSize=25`,
    { tags: { name: 'list_proposals' } },
  );
  check(listRes, { 'list 200': (r) => r.status === 200 });

  sleep(0.5);

  // Get tally for a random proposal from the list
  const items = listRes.json('items');
  if (Array.isArray(items) && items.length > 0) {
    const proposal = items[Math.floor(Math.random() * items.length)];
    const tallyRes = http.get(
      `${BASE_URL}/api/proposals/${proposal.id}/tally`,
      { tags: { name: 'get_tally' } },
    );
    check(tallyRes, { 'tally 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 3 + 1);
}
