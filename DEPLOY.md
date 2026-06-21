# Undisc0ver deployment

Production target: Debian 12, Nginx on the host, Docker Compose for the app stack, SQLite persisted in a Docker volume, and the app mounted in `/var/www/Undisc0ver`.

The app database is persisted in the `undiscover_data` Docker volume. Production starts without demo artists or fake releases. A first admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

## One-line VPS install and deploy

Run as `root` on Debian 12. Replace the GitHub URL if the final repository changes.

```bash
export DEBIAN_FRONTEND=noninteractive && apt update && apt install -y ca-certificates curl gnupg git nginx ufw openssl && install -m 0755 -d /etc/apt/keyrings && rm -f /etc/apt/keyrings/docker.gpg && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && chmod a+r /etc/apt/keyrings/docker.gpg && . /etc/os-release && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list && apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && systemctl enable --now docker nginx && mkdir -p /var/www && if [ -d /var/www/Undisc0ver/.git ]; then cd /var/www/Undisc0ver && git pull --ff-only; else git clone https://github.com/Sauroraa/Undisc0ver.git /var/www/Undisc0ver && cd /var/www/Undisc0ver; fi && cp -n .env.example .env && ADMIN_PASS="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)" && sed -i "s/change_admin_password/${ADMIN_PASS}/" .env && printf "\\nADMIN_LOGIN=admin@undisc0ver.com\\nADMIN_PASSWORD=%s\\n" "$ADMIN_PASS" > /root/undiscover-admin.txt && docker compose up -d --build --wait --wait-timeout 60 && cp deploy/nginx/undiscover.conf /etc/nginx/sites-available/undiscover.conf && ln -sf /etc/nginx/sites-available/undiscover.conf /etc/nginx/sites-enabled/undiscover.conf && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx && ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable && docker compose ps && cat /root/undiscover-admin.txt
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
cd /var/www/Undisc0ver && git pull --ff-only && docker compose up -d --build --wait --wait-timeout 60 && curl -f http://127.0.0.1:3001/api/health && nginx -t && systemctl reload nginx
```

If the VPS already had demo data from an older build, this version removes the known seeded demo artists/releases automatically when `PURGE_DEMO_DATA=true`.

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

## Stripe campaigns and payments

Campaigns are created as pending and become active only after Stripe confirms payment. Configure real values in `.env` for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (plus the subscription price IDs when plans are sold).

In the Stripe dashboard, register this production webhook and subscribe it to `checkout.session.completed`:

```text
https://undisc0ver.com/api/webhooks/stripe
```

After changing `.env`, recreate the app container with `docker compose up -d --force-recreate --wait`.
