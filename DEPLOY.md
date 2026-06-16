# Undisc0ver deployment

Production target: Debian 12, Nginx on the host, Docker Compose for the app stack, MariaDB provisioned for the final database migration, and the app mounted in `/var/www/Undisc0ver`.

The current backend still uses the app SQLite database. It is persisted in the `undiscover_data` Docker volume. MariaDB is included and healthy in the stack so the VPS is ready for the later full DB migration.

## One-line VPS install and deploy

Run as `root` on Debian 12. Replace the GitHub URL if the final repository changes.

```bash
export DEBIAN_FRONTEND=noninteractive && apt update && apt install -y ca-certificates curl gnupg git nginx ufw openssl && install -m 0755 -d /etc/apt/keyrings && rm -f /etc/apt/keyrings/docker.gpg && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && chmod a+r /etc/apt/keyrings/docker.gpg && . /etc/os-release && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list && apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin mariadb-client && systemctl enable --now docker nginx && mkdir -p /var/www && if [ -d /var/www/Undisc0ver/.git ]; then cd /var/www/Undisc0ver && git pull; else git clone https://github.com/Sauroraa/Undisc0ver.git /var/www/Undisc0ver && cd /var/www/Undisc0ver; fi && cp -n .env.example .env && sed -i "s/change_root_me/$(openssl rand -hex 24)/;s/change_me/$(openssl rand -hex 24)/" .env && docker compose up -d --build && cp deploy/nginx/undiscover.conf /etc/nginx/sites-available/undiscover.conf && ln -sf /etc/nginx/sites-available/undiscover.conf /etc/nginx/sites-enabled/undiscover.conf && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx && ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable && docker compose ps
```

## First push to GitHub

```bash
git init
git add .
git commit -m "Prepare Undisc0ver deployment"
git branch -M main
git remote add origin https://github.com/Sauroraa/Undisc0ver.git
git push -u origin main
```

## Update after a new push

```bash
cd /var/www/Undisc0ver && git pull && docker compose up -d --build && nginx -t && systemctl reload nginx
```

## Useful checks

```bash
docker compose ps
docker compose logs -f app
curl -i http://127.0.0.1:3001/api/health
```

## Domain and HTTPS

Nginx is already configured for `undisc0ver.com` and `www.undisc0ver.com`. After the DNS A record points to the VPS, install HTTPS with Certbot:

```bash
apt install -y certbot python3-certbot-nginx && certbot --nginx -d undisc0ver.com -d www.undisc0ver.com
```
