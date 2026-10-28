#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_STEP=Baslangic
BACKEND_SWITCHED=false
FRONTEND_PUBLISHED=false
PREVIOUS_BACKEND_DIR=''
PREVIOUS_SHA=''
MYSQL_CONFIG_FILE=''
BACKUP_FILE=''

log() { printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
step() { CURRENT_STEP="$1"; log "$CURRENT_STEP"; }
die() { printf '[HATA] %s\n' "$*" >&2; return 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || die "Eksik komut: $1"; }
privileged() { if [ "$EUID" -eq 0 ]; then "$@"; else sudo -n "$@"; fi; }

cleanup() { if [ -n "$MYSQL_CONFIG_FILE" ]; then rm -f -- "$MYSQL_CONFIG_FILE"; fi; }
activate_backend() {
  CIROX_BACKEND_DIR="$1" CIROX_BACKEND_PORT="$BACKEND_PORT" CIROX_RELEASE_SHA="$2" \
    pm2 startOrReload "$PROJECT_DIR/backend/ecosystem.config.cjs" --only "$PM2_NAME" --env production --update-env
}
on_error() {
  local code="$1"
  trap - ERR INT TERM
  set +e
  printf '\n[HATA] Deploy durdu: %s (exit=%s)\n' "$CURRENT_STEP" "$code" >&2
  if [ "$BACKEND_SWITCHED" = true ] && [ -f "$PREVIOUS_BACKEND_DIR/dist/main.js" ]; then
    log 'Onceki backend surumune donus deneniyor; veritabani geri sarilmaz.'
    if activate_backend "$PREVIOUS_BACKEND_DIR" "$PREVIOUS_SHA"; then pm2 save; fi
  elif [ "$BACKEND_SWITCHED" = true ]; then
    log "Onceki backend yok. Servisi kontrol edin: pm2 logs $PM2_NAME"
  fi
  if [ "$FRONTEND_PUBLISHED" = true ] && [ -f "$STATE_DIR/previous-index.html" ]; then
    local restored
    restored="$(mktemp "$WEB_ROOT/.index-rollback.XXXXXX")"
    install -m 644 "$STATE_DIR/previous-index.html" "$restored" && mv -f -- "$restored" "$WEB_ROOT/index.html"
  fi
  if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then printf '[BILGI] DB yedegi: %s\n' "$BACKUP_FILE" >&2; fi
  printf '[BILGI] Migration otomatik geri alinmaz. Hatanin nedeni duzeltilmeden yeniden yayin yapmayin.\n' >&2
  exit "$code"
}

update_code() {
  step '1/9 GitHub kodu guncelleniyor'
  [ "$(git branch --show-current)" = "$BRANCH" ] || die "Once $BRANCH dalina gecin."
  git diff --quiet && git diff --cached --quiet || die 'Sunucuda takip edilen dosyalarda yerel degisiklik var; once bunlari koruyun/commit edin.'
  if [ "$SKIP_GIT_UPDATE" != true ]; then
    git fetch origin "$BRANCH"
    git merge --ff-only FETCH_HEAD
  fi
}

prepare_release() {
  step '2/9 Yeni surum ve bagimliliklar hazirlaniyor'
  REVISION="$(git rev-parse HEAD)"
  RELEASE_DIR="$STATE_DIR/releases/release-$(date -u '+%Y%m%dT%H%M%S')-${REVISION:0:12}-$$"
  mkdir -p "$RELEASE_DIR/backend"
  chmod 700 "$STATE_DIR" "$STATE_DIR/releases" "$RELEASE_DIR"
  rsync -a --exclude=node_modules --exclude=dist --exclude='.env*' --exclude=backups \
    "$PROJECT_DIR/backend/" "$RELEASE_DIR/backend/"
  ln -s "$PROJECT_DIR/backend/.env" "$RELEASE_DIR/backend/.env"
  printf '%s\n' "$REVISION" > "$RELEASE_DIR/revision"
  npm ci --include=dev
  npm --prefix "$RELEASE_DIR/backend" ci --include=dev
}

build_release() {
  step '3/9 Frontend ve backend derleniyor'
  npm run lint
  npm run build
  npm --prefix "$RELEASE_DIR/backend" run build
  [ -s "$PROJECT_DIR/dist/index.html" ] && [ -s "$RELEASE_DIR/backend/dist/main.js" ] || die 'Build ciktisi eksik.'
  MYSQL_CONFIG_FILE="$STATE_DIR/backups/.mysql-$$.cnf"
  DB_NAME="$(node "$RELEASE_DIR/backend/dist/scripts/deploy-config.js" "$MYSQL_CONFIG_FILE")"
  [ -n "$DB_NAME" ] || die 'DB adi okunamadi.'
}

backup_database() {
  step '4/9 Migration oncesi veritabani yedegi aliniyor'
  if [ "$INIT_DATABASE" = true ]; then node "$RELEASE_DIR/backend/dist/scripts/db-init.js"; fi
  node "$RELEASE_DIR/backend/dist/scripts/db-ping.js"
  local temporary raw_size dump_help
  local -a dump_options=("--defaults-file=$MYSQL_CONFIG_FILE" --single-transaction --quick --no-tablespaces
    --routines --events --triggers --hex-blob --default-character-set=utf8mb4)
  dump_help="$(mysqldump --no-defaults --help 2>/dev/null)"
  if [[ "$dump_help" == *no-login-paths* ]]; then dump_options+=(--no-login-paths); fi
  if [[ "$dump_help" == *set-gtid-purged* ]]; then dump_options+=(--set-gtid-purged=OFF); fi
  temporary="$(mktemp "$STATE_DIR/backups/.dump.XXXXXX.sql.gz")"
  BACKUP_FILE="$STATE_DIR/backups/${DB_NAME}_latest.sql.gz"
  if ! mysqldump "${dump_options[@]}" "$DB_NAME" | gzip -c > "$temporary"; then
    rm -f -- "$temporary"
    die 'Yedek alinamadi. Onceki yedek korundu; migration baslatilmadi.'
    return 1
  fi
  if ! gzip -t "$temporary"; then rm -f -- "$temporary"; die 'Yedek arsivi gecersiz.'; return 1; fi
  raw_size="$(gzip -cd "$temporary" | wc -c)"
  if [ "$raw_size" -eq 0 ]; then rm -f -- "$temporary"; die 'Yedek bos. Migration baslatilmadi.'; return 1; fi
  chmod 600 "$temporary"
  BACKUP_FILE="$STATE_DIR/backups/${DB_NAME}_$(date -u '+%Y%m%dT%H%M%S')-$$.sql.gz"
  mv -f -- "$temporary" "$BACKUP_FILE"
  ln -s "${BACKUP_FILE##*/}" "$STATE_DIR/backups/.latest-$$"
  mv -Tf -- "$STATE_DIR/backups/.latest-$$" "$STATE_DIR/backups/${DB_NAME}_latest.sql.gz"
  log "Yedek hazir: $BACKUP_FILE"
}

migrate_database() {
  step '5/9 TypeORM migrationlari ve ilk admin kontrolu'
  node "$RELEASE_DIR/backend/dist/scripts/db-migrate.js"
  node "$RELEASE_DIR/backend/dist/scripts/seed-admin.js"
  node "$RELEASE_DIR/backend/dist/scripts/db-ping.js"
}

restart_backend() {
  step '6/9 Yeni backend PM2 ile etkinlestiriliyor'
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    (umask 077; pm2 jlist > "$STATE_DIR/pm2-before.json")
    PREVIOUS_BACKEND_DIR="$(node -e 'const a=require(process.argv[1]).find(x=>x.name===process.argv[2]); process.stdout.write(a?.pm2_env?.pm_cwd || "")' "$STATE_DIR/pm2-before.json" "$PM2_NAME")"
    PREVIOUS_SHA="$(node -e 'const a=require(process.argv[1]).find(x=>x.name===process.argv[2]); process.stdout.write(a?.pm2_env?.CIROX_RELEASE_SHA || "")' "$STATE_DIR/pm2-before.json" "$PM2_NAME")"
    case "$PREVIOUS_BACKEND_DIR/" in "$PROJECT_DIR/"*) ;; *) die 'Ayni PM2 adi baska bir proje tarafindan kullaniliyor.'; return 1;; esac
  fi
  BACKEND_SWITCHED=true
  activate_backend "$RELEASE_DIR/backend" "$REVISION"
}

health_check() {
  step '7/9 Yeni surumun HTTP ve MySQL saglik kontrolu'
  local attempt
  for ((attempt=1; attempt<=20; attempt++)); do
    if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" > "$STATE_DIR/health.json" 2>/dev/null && \
      node -e 'const x=require(process.argv[1]);process.exit(x.status==="ready" && x.database==="connected" && x.release===process.argv[2] ? 0 : 1)' "$STATE_DIR/health.json" "$REVISION"; then
      return 0
    fi
    sleep 2
  done
  die "Yeni backend saglik kontrolunu gecemedi: $HEALTH_URL"
}

publish_frontend() {
  step '8/9 Frontend canli dizine yayinlaniyor'
  mkdir -p "$WEB_ROOT"
  [ ! -e "$WEB_ROOT/index.html" ] || cp "$WEB_ROOT/index.html" "$STATE_DIR/previous-index.html"
  if [ ! -e "$WEB_ROOT/index.html" ]; then rm -f -- "$STATE_DIR/previous-index.html"; fi
  # Eski hash'li assetler korunur: acik tarayicilar ve geri donus kirilmaz.
  rsync -a --chmod=D755,F644 --exclude=/index.html "$PROJECT_DIR/dist/" "$WEB_ROOT/"
  local next_index
  next_index="$(mktemp "$WEB_ROOT/.index-next.XXXXXX")"
  install -m 644 "$PROJECT_DIR/dist/index.html" "$next_index"
  mv -f -- "$next_index" "$WEB_ROOT/index.html"
  FRONTEND_PUBLISHED=true
}

finish_deploy() {
  step '9/9 Nginx ve PM2 kaliciligi'
  if [ "$RELOAD_NGINX" = true ]; then privileged nginx -t; privileged systemctl reload nginx; fi
  pm2 save
  ln -s "$RELEASE_DIR" "$STATE_DIR/.current-next-$$"
  mv -Tf -- "$STATE_DIR/.current-next-$$" "$STATE_DIR/current"
  # Yalnizca bu scriptin olusturdugu eski backend surumleri temizlenir.
  local index=0 directory resolved
  while IFS= read -r directory; do
    index=$((index + 1))
    [ "$index" -gt "$KEEP_RELEASES" ] || continue
    resolved="$(realpath "$directory")" || continue
    case "$resolved/" in "$STATE_DIR/releases/release-"*) ;; *) continue;; esac
    [ "$resolved/backend" != "$PREVIOUS_BACKEND_DIR" ] && [ "$resolved" != "$RELEASE_DIR" ] || continue
    if ! rm -rf -- "$resolved"; then log "Eski surum temizlenemedi: $resolved"; fi
  done < <(find "$STATE_DIR/releases" -mindepth 1 -maxdepth 1 -type d -name 'release-*' | sort -r)
  index=0
  while IFS= read -r directory; do
    index=$((index + 1))
    [ "$index" -gt "$KEEP_BACKUPS" ] || continue
    if ! rm -f -- "$directory"; then log "Eski yedek temizlenemedi: $directory"; fi
  done < <(find "$STATE_DIR/backups" -maxdepth 1 -type f -name "${DB_NAME}_[0-9]*.sql.gz" | sort -r)
}

main() {
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
  cd "$PROJECT_DIR"
  # Sunucuya ait, Git'e girmeyen, guvenilen Bash ayarlari.
  if [ -f .deploy.env ]; then source .deploy.env; fi
  BRANCH="${BRANCH:-main}"
  WEB_ROOT="${WEB_ROOT:-/var/www/cirox}"
  BACKEND_PORT="${BACKEND_PORT:-4002}"
  PM2_NAME=sube-analitik-cirox-api
  RELOAD_NGINX="${RELOAD_NGINX:-true}"
  INIT_DATABASE="${INIT_DATABASE:-false}"
  KEEP_RELEASES="${KEEP_RELEASES:-3}"
  KEEP_BACKUPS="${KEEP_BACKUPS:-7}"
  SKIP_GIT_UPDATE="${SKIP_GIT_UPDATE:-false}"
  HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1/health/ready}"
  STATE_DIR="$PROJECT_DIR/.deploy"
  trap 'on_error "$?"' ERR
  trap 'on_error 130' INT
  trap 'on_error 143' TERM
  trap cleanup EXIT
  umask 022
  log 'CIROX PRODUCTION DEPLOY'
  [ "$(uname -s)" = Linux ] || die 'Bu script Linux VPS icindir; Windows gelistirme ortaminda calistirmayin.'
  local command
  for command in git node npm pm2 curl mysqldump gzip rsync flock realpath install find sort; do require_command "$command"; done
  node -e 'if(Number(process.versions.node.split(".")[0])<22){console.error("Node.js 22 veya ustu gerekir.");process.exit(1)}'
  [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] && [ "$KEEP_RELEASES" -ge 2 ] || die 'KEEP_RELEASES en az 2 olmali.'
  [[ "$KEEP_BACKUPS" =~ ^[0-9]+$ ]] && [ "$KEEP_BACKUPS" -ge 2 ] || die 'KEEP_BACKUPS en az 2 olmali.'
  [[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] && [ "$BACKEND_PORT" -gt 0 ] && [ "$BACKEND_PORT" -le 65535 ] || die 'BACKEND_PORT gecersiz.'
  for command in "$RELOAD_NGINX" "$INIT_DATABASE" "$SKIP_GIT_UPDATE"; do [[ "$command" = true || "$command" = false ]] || die 'Boolean ayarlar true/false olmali.'; done
  [[ "$WEB_ROOT" = /* ]] || die 'WEB_ROOT mutlak bir dizin olmali.'
  WEB_ROOT="$(realpath -m "$WEB_ROOT")"
  [ "$WEB_ROOT" != / ] && [[ "$PROJECT_DIR/" != "$WEB_ROOT/"* ]] && [[ "$WEB_ROOT/" != "$PROJECT_DIR/"* ]] || die 'WEB_ROOT proje klasorunden ayri olmali.'
  [ -f backend/.env ] || die 'Once sunucuya ozel backend/.env dosyasini hazirlayin.'
  mkdir -p "$WEB_ROOT"
  [ -w "$WEB_ROOT" ] || die 'WEB_ROOT deploy kullanicisi tarafindan yazilabilir olmali.'
  [ "$(git rev-parse --show-toplevel)" = "$PROJECT_DIR" ] || die 'Proje Git koku ile uyusmuyor.'
  exec 9>"$PROJECT_DIR/.deploy.lock"
  flock -n 9 || die 'Baska bir deploy calisiyor.'
  if [ "$RELOAD_NGINX" = true ]; then
    require_command nginx; require_command systemctl
    if [ "$EUID" -ne 0 ]; then require_command sudo; sudo -n true; fi
    privileged nginx -t
  fi
  local before
  before="$(git hash-object deploy.sh)"
  update_code
  if [ "$before" != "$(git hash-object deploy.sh)" ]; then
    log 'deploy.sh guncellendi; yeni script yeniden baslatiliyor.'
    flock -u 9; exec 9>&-
    exec env SKIP_GIT_UPDATE=true bash "$PROJECT_DIR/deploy.sh" "$@"
  fi
  mkdir -p "$STATE_DIR/backups"
  chmod 700 "$STATE_DIR" "$STATE_DIR/backups"
  export NODE_ENV=production HOST=127.0.0.1 PORT="$BACKEND_PORT" DB_SYNCHRONIZE=false
  prepare_release
  build_release
  backup_database
  migrate_database
  restart_backend
  health_check
  publish_frontend
  finish_deploy
  BACKEND_SWITCHED=false
  FRONTEND_PUBLISHED=false
  log "DEPLOY TAMAMLANDI: $REVISION"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
