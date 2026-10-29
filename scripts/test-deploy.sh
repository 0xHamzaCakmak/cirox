#!/usr/bin/env bash
# No live DB, R2, PM2 or Nginx calls. Run with: bash scripts/test-deploy.sh
set -Eeuo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
source "$repo_dir/deploy.sh"
fixture="$(mktemp -d "$repo_dir/.deploy-test.XXXXXX")"
cleanup_fixture() {
  local resolved
  resolved="$(realpath "$fixture")"
  case "$resolved/" in "$repo_dir/.deploy-test."*) rm -rf -- "$resolved";; *) printf 'Unsafe test cleanup path\n' >&2; return 1;; esac
}
trap cleanup_fixture EXIT
PROJECT_DIR="$fixture"
STATE_DIR="$fixture/state"
RELEASE_DIR="$fixture/release"
WEB_ROOT="$fixture/web"
BACKEND_PORT=4002
PM2_NAME=sube-analitik-cirox-api
HEALTH_URL=http://127.0.0.1:4002/api/v1/health/ready
INIT_DATABASE=false
DB_NAME=test_cirox
REVISION=test-revision
MYSQL_CONFIG_FILE="$STATE_DIR/backups/client.cnf"
mkdir -p "$STATE_DIR/backups" "$WEB_ROOT" "$RELEASE_DIR/backend/dist" "$fixture/old/backend/dist"
mkdir -p "$fixture/scripts"
cp "$repo_dir/scripts/pm2-release.cjs" "$fixture/scripts/pm2-release.cjs"

# Keep a valid latest backup if mysqldump fails or returns an empty body.
node() { :; }
dump_mode=success
mysqldump() {
  if [[ "$*" == *--help* ]]; then printf '%s\n' '--no-login-paths --set-gtid-purged'; return; fi
  [[ "$1" == --defaults-file=* && "$*" == *--no-login-paths* && "$*" == *--set-gtid-purged=OFF* ]] || return 99
  case "$dump_mode" in
    success) printf 'CREATE TABLE example (id int);\n';;
    partial) printf 'broken dump'; return 2;;
    empty) return 0;;
  esac
}
backup_database
test "$(gzip -cd "$BACKUP_FILE")" = 'CREATE TABLE example (id int);'
for dump_mode in partial empty; do
  if backup_database; then printf 'FAIL: invalid backup accepted\n' >&2; exit 1; fi
  test "$(gzip -cd "$BACKUP_FILE")" = 'CREATE TABLE example (id int);'
  test -z "$(find "$STATE_DIR/backups" -name '.dump.*' -print)"
done
unset -f node
printf 'PASS: valid, partial and empty backup; previous backup preserved\n'

# Check the actual function's set-e behavior in a child shell, without real node scripts.
export TRACE="$fixture/trace"
set +e
bash -c '
  source "$1"
  RELEASE_DIR="$2"
  node() { printf "%s\n" "$*" >> "$TRACE"; case "$*" in *db-migrate.js*) return 42;; esac; }
  migrate_database
  printf "SHOULD_NOT_PUBLISH\n" >> "$TRACE"
' bash "$repo_dir/deploy.sh" "$RELEASE_DIR"
status=$?
set -e
test "$status" -eq 42
! grep -q 'seed-admin\|SHOULD_NOT_PUBLISH' "$TRACE"
printf 'PASS: failed migration stops before seed, restart and publication\n'

# A healthy old process is insufficient: the running release SHA must match.
sleep() { :; }
health_release=old-revision
curl() { printf '{"status":"ready","database":"connected","release":"%s"}' "$health_release"; }
if health_check; then printf 'FAIL: old release accepted\n' >&2; exit 1; fi
health_release="$REVISION"
health_check
printf 'PASS: health check verifies database and deployed release SHA\n'

# Model PM2 retaining an old resolved script even when env SHA is new.
printf '// backend' > "$RELEASE_DIR/backend/dist/main.js"
printf '// old backend' > "$fixture/old/backend/dist/main.js"
mock_backend_dir="$fixture/old/backend"
mock_start_wrong=false
pm2() {
  printf '%s|%s\n' "${CIROX_BACKEND_DIR:-}" "$*" >> "$fixture/pm2-trace"
  case "$1" in
    jlist)
      node -e 'const path=require("node:path");const cwd=process.argv[1];const apps=[{name:"masamqr-api",pm2_env:{pm_cwd:"/unrelated/project"}}];if(cwd)apps.push({name:process.argv[2],pm2_env:{pm_cwd:path.resolve(cwd),pm_exec_path:path.join(path.resolve(cwd),"dist","main.js"),CIROX_RELEASE_SHA:"new-env-old-code"}});console.log(JSON.stringify(apps))' "$mock_backend_dir" "$PM2_NAME";;
    delete)
      [ "$2" = "$PM2_NAME" ] || return 99
      mock_backend_dir='';;
    startOrReload)
      if [ "$mock_start_wrong" = true ]; then mock_backend_dir="$fixture/old/backend";
      elif [ -z "$mock_backend_dir" ]; then mock_backend_dir="$CIROX_BACKEND_DIR"; fi;;
    save) :;;
    *) return 99;;
  esac
}
activate_backend "$RELEASE_DIR/backend" "$REVISION"
test "$mock_backend_dir" = "$RELEASE_DIR/backend"
test "$(grep -c "|delete $PM2_NAME$" "$fixture/pm2-trace")" -eq 1
activate_backend "$RELEASE_DIR/backend" "$REVISION"
test "$(grep -c "|delete $PM2_NAME$" "$fixture/pm2-trace")" -eq 1
mock_start_wrong=true
if activate_backend "$RELEASE_DIR/backend" "$REVISION"; then printf 'FAIL: old script accepted after activation\n' >&2; exit 1; fi
mock_start_wrong=false
mock_backend_dir="$RELEASE_DIR/backend"
printf 'PASS: release switch replaces only CIROX; same-path reload and stale-path rejection verified\n'

# Failure after publication restores the prior index and tries the prior backend.
printf 'old html' > "$STATE_DIR/previous-index.html"
printf 'new html' > "$WEB_ROOT/index.html"
printf '// old backend' > "$fixture/old/backend/dist/main.js"
PREVIOUS_BACKEND_DIR="$fixture/old/backend"
PREVIOUS_SHA=previous-revision
BACKEND_SWITCHED=true
FRONTEND_PUBLISHED=true
set +e
(on_error 7)
status=$?
set -e
test "$status" -eq 7
test "$(cat "$WEB_ROOT/index.html")" = 'old html'
grep -q 'old/backend.*startOrReload' "$fixture/pm2-trace"
test "$(gzip -cd "$BACKUP_FILE")" = 'CREATE TABLE example (id int);'
printf 'PASS: rollback attempts old backend, restores index, never restores DB automatically\n'
