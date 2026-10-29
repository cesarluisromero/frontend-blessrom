#!/usr/bin/env bash
set -euo pipefail
root=/var/www/blessrom-frontend
release_id=${1:?Release ID required}
commit=${2:?Commit required}
[[ "$release_id" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]]
[[ "$commit" =~ ^[a-f0-9]{40}$ ]]
[[ "$release_id" == "$commit-"* ]]
test -d "$root/releases"
exec 9>"$root/deploy.lock"
flock -w 120 9
incoming="$root/incoming/$release_id"
release="$root/releases/$release_id"
cd "$incoming"
sha256sum --check frontend.tar.gz.sha256
test ! -e "$release"
mkdir "$release"
tar --extract --gzip --file frontend.tar.gz --directory "$release" --no-same-owner --no-same-permissions
for app in tienda administracion; do
  test -s "$release/$app/index.html"
  test -s "$release/$app/blessrom-logo.webp"
  grep -Fq "\"commit\":\"$commit\"" "$release/$app/deployment.json"
done
find "$release" -type d -exec chmod 755 {} +
find "$release" -type f -exec chmod 644 {} +
previous=$(readlink "$root/current" || true)
rollback() {
  echo "Deployment failed; restoring previous release." >&2
  if [[ -n "$previous" ]]; then
    ln -s "$previous" "$root/rollback-$release_id"
    mv -Tf "$root/rollback-$release_id" "$root/current"
  else
    unlink "$root/current"
  fi
}
ln -s "releases/$release_id" "$root/next-$release_id"
mv -Tf "$root/next-$release_id" "$root/current"
trap rollback ERR
for host in blessrom.com admin.blessrom.com; do
  # Local DNS overrides permit verification before the public DNS cutover.
  # TLS verification stays enabled when HTTPS is configured.
  curl --fail --silent --show-error --location --max-time 20 \
    --resolve "$host:80:127.0.0.1" --resolve "$host:443:127.0.0.1" \
    "http://$host/deployment.json" | grep -Fq "\"commit\":\"$commit\""
  curl --fail --silent --show-error --location --max-time 20 \
    --resolve "$host:80:127.0.0.1" --resolve "$host:443:127.0.0.1" \
    "http://$host/api/v1/system" | grep -Fq '"brand":"Blessrom"'
done
trap - ERR
echo "Deployed $release_id; previous release: ${previous:-none}"
