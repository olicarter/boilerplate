# Load Tests

k6 load tests for the Ripple API. Run before any public launch to verify the API can handle concurrent voting on a high-traffic proposal.

## Prerequisites

```bash
brew install k6
```

## Running

```bash
# Smoke test (low VUs, quick sanity check)
k6 run --env BASE_URL=http://localhost:3000 load-tests/voting.js

# Soak test (sustained load over 10 minutes)
k6 run --env BASE_URL=https://staging.ripple.vote load-tests/voting.js --stage 2m:50,10m:50,2m:0

# Full stress test
k6 run --env BASE_URL=https://staging.ripple.vote load-tests/full.js
```

## Scripts

- `voting.js` — concurrent voting on a single proposal (the most write-heavy path)
- `proposals.js` — proposal list fetching (read-heavy, tests Electric sync load)
- `full.js` — combined scenario: browse proposals, vote, comment

## Thresholds

All scripts enforce:
- `http_req_failed < 1%` — less than 1% error rate
- `http_req_duration p(95) < 500ms` — 95th percentile under 500ms
- `http_req_duration p(99) < 2000ms` — 99th percentile under 2s
