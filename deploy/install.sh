#!/usr/bin/env bash
# Debian VDS üzerinde Gur gateway kurulumu. Kök kullanıcıyla, depo kökünden çalıştırın:
#   sudo bash deploy/install.sh api.alanadiniz.com
set -euo pipefail
DOMAIN="${1:?Kullanım: install.sh api.alanadiniz.com}"

apt-get update
apt-get install -y build-essential pkg-config curl debian-keyring debian-archive-keyring apt-transport-https

if ! command -v cargo >/dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  source "$HOME/.cargo/env"
fi

if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

(cd server && cargo build --release)

id gur >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin gur
install -d -o gur -g gur /opt/gur
install -m 755 server/target/release/gur-gateway /opt/gur/gur-gateway
install -m 644 server/models.toml /opt/gur/models.toml
[ -f /opt/gur/.env ] || install -m 600 -o gur -g gur server/.env.example /opt/gur/.env

install -m 644 deploy/gur-gateway.service /etc/systemd/system/gur-gateway.service
sed "s/api.alanadiniz.com/${DOMAIN}/" deploy/Caddyfile > /etc/caddy/Caddyfile

systemctl daemon-reload
systemctl enable --now gur-gateway
systemctl reload caddy

echo
echo "Kurulum tamam. Şimdi /opt/gur/.env içine OPENROUTER_API_KEY yazıp şunu çalıştırın:"
echo "  systemctl restart gur-gateway && curl https://${DOMAIN}/health"
