#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || {
  echo "Run as root in PuTTY."
  exit 1
}
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
site=/etc/nginx/sites-available/blessrom-frontend
enabled=/etc/nginx/sites-enabled/blessrom-frontend
root=/var/www/blessrom-frontend
test -s "$here/frontend.conf"
id blessrom-deploy >/dev/null
nginx -t
if [[ -e "$site" || -L "$enabled" ]]; then
  echo "Frontend config exists; refusing to overwrite it (including certificates)." >&2
  exit 1
fi
if grep -REq 'server_name[^;]*[[:space:]](blessrom\.com|www\.blessrom\.com|admin\.blessrom\.com)([[:space:];])' /etc/nginx/sites-enabled; then
  echo "A frontend domain is already configured. Review before proceeding." >&2
  exit 1
fi
install -d -m 755 -o blessrom-deploy -g blessrom-deploy "$root" "$root/releases"
install -d -m 700 -o blessrom-deploy -g blessrom-deploy "$root/incoming"
backup="/root/nginx-before-blessrom-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$backup" -C /etc nginx
chmod 600 "$backup"
install -m 644 "$here/frontend.conf" "$site"
ln -s "$site" "$enabled"
if ! nginx -t; then
  unlink "$enabled"
  rm "$site"
  exit 1
fi
if ! systemctl reload nginx; then
  unlink "$enabled"
  rm "$site"
  nginx -t && systemctl reload nginx
  exit 1
fi
echo "VPS ready. Nginx backup: $backup"
echo "Existing WordPress hosting and public DNS have not been modified."
