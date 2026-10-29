#!/usr/bin/env bash
set -euo pipefail
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
kc() {
  docker exec -i mcp-facebook-identity-1 sh -c '
 export KC_CLI_PASSWORD="$KC_BOOTSTRAP_ADMIN_PASSWORD"
 exec /opt/keycloak/bin/kcadm.sh "$@" --no-config --server http://127.0.0.1:8080/auth --realm master --user bootstrap-admin
 ' sh "$@"
}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
chmod 700 "$tmp"
kc get clients -r blessrom -q clientId=blessrom-admin --fields id,clientId >"$tmp/clients.json"
client_id=$(python3 -c 'import json,sys; rows=json.load(open(sys.argv[1])); print(rows[0]["id"] if rows else "")' "$tmp/clients.json")
if [[ -z "$client_id" ]]; then
  kc create clients -r blessrom -f - <"$here/keycloak-admin-client.json"
else
  echo "Client already exists; reviewing it without replacing settings."
fi
kc get clients -r blessrom -q clientId=blessrom-admin --fields clientId,publicClient,standardFlowEnabled,redirectUris,webOrigins,attributes
