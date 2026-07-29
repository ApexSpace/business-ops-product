#!/bin/sh
set -e

APP_ENTRY="${APP_ENTRY:-combined}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-false}"
RUN_SEED="${RUN_SEED:-false}"

# Nest monorepo tsc output nests source paths under each app outDir.
API_MAIN="dist/apps/api/apps/api/src/main.js"
WORKER_MAIN="dist/apps/worker/apps/worker/src/main.js"
SCHEDULER_MAIN="dist/apps/scheduler/apps/scheduler/src/main.js"

run_migrations() {
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    if [ -z "$DATABASE_URL" ]; then
      echo "DATABASE_URL is required when RUN_MIGRATIONS=true"
      exit 1
    fi
    echo "Running prisma migrate deploy..."
    npx prisma migrate deploy
  fi
}

run_seed() {
  if [ "$RUN_SEED" = "true" ]; then
    if [ -z "$DATABASE_URL" ]; then
      echo "DATABASE_URL is required when RUN_SEED=true"
      exit 1
    fi
    echo "Running database seed (super admin + integration providers)..."
    node /app/scripts/docker-seed.mjs
  fi
}

start_worker() {
  echo "Starting worker..."
  node "$WORKER_MAIN" &
  WORKER_PID=$!
  echo "Worker PID: $WORKER_PID"
}

stop_children() {
  if [ -n "$WORKER_PID" ]; then
    kill "$WORKER_PID" 2>/dev/null || true
  fi
}

trap stop_children TERM INT

case "$APP_ENTRY" in
  api)
    run_migrations
    run_seed
    exec node "$API_MAIN"
    ;;
  worker)
    exec node "$WORKER_MAIN"
    ;;
  scheduler)
    exec node "$SCHEDULER_MAIN"
    ;;
  combined)
    run_migrations
    run_seed
    start_worker
    exec node "$API_MAIN"
    ;;
  *)
    echo "Unknown APP_ENTRY=$APP_ENTRY (expected api|worker|scheduler|combined)"
    exit 1
    ;;
esac
