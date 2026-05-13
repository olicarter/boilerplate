#!/bin/bash
# Initialise a streaming replication standby from the primary.
# This script runs inside the replica container on first start.
# Set REPLICA_OF_HOST=postgres (default) to point at the primary.

set -e

PRIMARY_HOST="${REPLICA_OF_HOST:-postgres}"
PRIMARY_PORT="${REPLICA_OF_PORT:-5432}"
PGPASSWORD="${POSTGRES_PASSWORD:-password}"

echo "Waiting for primary at ${PRIMARY_HOST}:${PRIMARY_PORT}..."
until pg_isready -h "${PRIMARY_HOST}" -p "${PRIMARY_PORT}" -U "${PGUSER:-postgres}"; do
  sleep 1
done

echo "Replicating from primary..."
pg_basebackup -h "${PRIMARY_HOST}" -p "${PRIMARY_PORT}" -U "${PGUSER:-postgres}" \
  -D "$PGDATA" -Fp -Xs -P -R --no-password

echo "Replica initialised."
