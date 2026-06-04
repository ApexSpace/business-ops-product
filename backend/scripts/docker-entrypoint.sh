#!/bin/sh
set -e

APP_ENTRY="${APP_ENTRY:-combined}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-false}"

run_migrations() {
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running prisma migrate deploy..."
    npx prisma migrate deploy
  fi
}

start_worker() {
  echo "Starting worker..."
  node dist/apps/worker/main.js &
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
    exec node dist/apps/api/main.js
    ;;
  worker)
    exec node dist/apps/worker/main.js
    ;;
  scheduler)
    exec node dist/apps/scheduler/main.js
    ;;
  combined)
    run_migrations
    start_worker
    exec node dist/apps/api/main.js
    ;;
  *)
    echo "Unknown APP_ENTRY=$APP_ENTRY (expected api|worker|scheduler|combined)"
    exit 1
    ;;
esac
