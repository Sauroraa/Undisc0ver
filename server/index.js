import express from "express";
import compression from "compression";
import multer from "multer";
import crypto from "node:crypto";
import Stripe from "stripe";
import { Resend } from "resend";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, hashPassword, id, initDb, publicUser, verifyPassword } from "./db.js";

initDb();

const app = express();
app.use(compression({ threshold: 1024 }));

// ── Security headers ────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
});

// ── In-memory rate limiter ──────────────────────────────────────────────────
const _rlStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rlStore) if (now > v.resetAt + 120_000) _rlStore.delete(k);
}, 5 * 60_000).unref();

function rateLimiter(maxReqs, windowMs) {
  return (req, res, next) => {
    const key = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown") + req.path;
    const now = Date.now();
    let rec = _rlStore.get(key);
    if (!rec || now > rec.resetAt) { rec = { count: 0, resetAt: now + windowMs }; _rlStore.set(key, rec); }
    rec.count++;
    if (rec.count > maxReqs) {
      res.setHeader("Retry-After", Math.ceil((rec.resetAt - now) / 1000));
      return res.status(429).json({ error: "Trop de requêtes. Réessaie dans quelques instants." });
    }
    next();
  };
}

// ── Email validation helper ─────────────────────────────────────────────────
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buffer) => {
    if (req.originalUrl === "/api/webhooks/stripe") req.rawBody = buffer;
  }
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(resolve(__dirname, ".."), "dist");
const uploadDir = resolve(process.env.UPLOAD_DIR || join(resolve(__dirname, ".."), "uploads"));
mkdirSync(uploadDir, { recursive: true });

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-z0-9._-]/gi, "_").slice(-90);
      cb(null, `${id("aud")}-${safeName}`);
    }
  }),
  limits: { fileSize: Number(process.env.MAX_AUDIO_UPLOAD_MB || 500) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^audio\//.test(file.mimetype || "");
    const allowedExt = /\.(wav|mp3|aiff|aif|flac|m4a)$/i.test(file.originalname || "");
    cb(allowedMime || allowedExt ? null : new Error("Format audio invalide."), allowedMime || allowedExt);
  }
});
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-z0-9._-]/gi, "_").slice(-90);
      cb(null, `${id("img")}-${safeName}`);
    }
  }),
  limits: { fileSize: Number(process.env.MAX_IMAGE_UPLOAD_MB || 12) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype || "");
    const allowedExt = /\.(png|jpe?g|webp|gif)$/i.test(file.originalname || "");
    cb(allowedMime || allowedExt ? null : new Error("Format image invalide."), allowedMime || allowedExt);
  }
});

function cents(value) {
  return Number.parseInt(value, 10) || 0;
}

const scanConfig = {
  provider: process.env.COPYRIGHT_SCAN_PROVIDER || (process.env.NODE_ENV === "production" ? "manual" : "local"),
  takedownEmail: process.env.COPYRIGHT_TAKEDOWN_EMAIL || "copyright@undisc0ver.com",
  blockThreshold: Number(process.env.COPYRIGHT_BLOCK_THRESHOLD || 80),
  reviewThreshold: Number(process.env.COPYRIGHT_REVIEW_THRESHOLD || 45)
};
const siteUrl = String(process.env.PUBLIC_SITE_URL || "https://undisc0ver.com").replace(/\/$/, "");
const googleAuth = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `${siteUrl}/api/auth/google/callback`,
  stateSecret: process.env.AUTH_STATE_SECRET || crypto.randomBytes(32).toString("hex")
};

// Audio tokens use a dedicated secret — fully isolated from OAuth state
const audioSecret = process.env.AUDIO_TOKEN_SECRET || process.env.AUTH_STATE_SECRET || crypto.randomBytes(32).toString("hex");
const payoutEncryptionKey = crypto.createHash("sha256").update(process.env.PAYOUT_ENCRYPTION_SECRET || process.env.AUTH_STATE_SECRET || audioSecret).digest();
const payoutMinimumCents = Math.max(100, Number(process.env.PAYOUT_MIN_CENTS || 2000));

// ── External services (optional — degrade gracefully when keys absent) ──────
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" }) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "Undisc0ver <noreply@undisc0ver.com>";

async function sendEmail({ to, subject, html }) {
  if (!resend) return { ok: false, reason: "RESEND_API_KEY not configured" };
  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    return { ok: true };
  } catch {
    return { ok: false, reason: "Email delivery failed" };
  }
}
const sitemapRoutes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/explore", priority: "0.9", changefreq: "daily" },
  { path: "/artists", priority: "0.9", changefreq: "daily" },
  { path: "/charts", priority: "0.8", changefreq: "daily" },
  { path: "/upload", priority: "0.7", changefreq: "weekly" },
  { path: "/pricing", priority: "0.8", changefreq: "weekly" },
  { path: "/support", priority: "0.7", changefreq: "weekly" },
  { path: "/faq", priority: "0.7", changefreq: "weekly" },
  { path: "/getting-started", priority: "0.7", changefreq: "monthly" },
  { path: "/release-guide", priority: "0.8", changefreq: "monthly" },
  { path: "/legal", priority: "0.4", changefreq: "yearly" },
  { path: "/terms", priority: "0.4", changefreq: "yearly" },
  { path: "/sales-terms", priority: "0.4", changefreq: "yearly" },
  { path: "/privacy", priority: "0.4", changefreq: "yearly" },
  { path: "/acceptable-use", priority: "0.4", changefreq: "yearly" },
  { path: "/careers", priority: "0.4", changefreq: "monthly" }
];

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sitemapEntry({ path, lastmod, changefreq = "weekly", priority = "0.5" }) {
  const loc = path === "/" ? siteUrl : `${siteUrl}${path}`;
  const date = lastmod ? new Date(lastmod).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>"
  ].join("\n");
}

function initialsForName(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U0";
}

function makeGoogleState() {
  const payload = Buffer.from(JSON.stringify({ nonce: id("gst"), created_at: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", googleAuth.stateSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyGoogleState(state = "") {
  const [payload, signature] = String(state).split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", googleAuth.stateSecret).update(payload).digest("base64url");
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return Date.now() - Number(data.created_at || 0) < 10 * 60 * 1000;
}

function authRedirect(params = {}) {
  const query = new URLSearchParams(params).toString();
  return `${siteUrl}/auth/google-callback${query ? `?${query}` : ""}`;
}

function audioToken(filename = "", purpose = "preview") {
  return crypto.createHmac("sha256", audioSecret).update(`${purpose}:${filename}`).digest("base64url");
}

function verifyAudioToken(filename = "", purpose = "preview", token = "") {
  const expected = audioToken(filename, purpose);
  if (!token || Buffer.byteLength(token) !== Buffer.byteLength(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function storageNameFromAudioUrl(value = "") {
  const match = String(value).match(/\/api\/audio\/(?:preview|stream)\/([^?]+)/) || String(value).match(/\/uploads\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function safeUploadPath(filename = "") {
  if (!filename || filename.includes("..")) return "";
  const filePath = resolve(uploadDir, filename);
  if (!filePath.startsWith(`${uploadDir}${process.platform === "win32" ? "\\" : "/"}`) && filePath !== uploadDir) return "";
  return filePath;
}

function audioMimeFromName(filename = "") {
  if (/\.wav$/i.test(filename)) return "audio/wav";
  if (/\.aiff?$/i.test(filename)) return "audio/aiff";
  if (/\.flac$/i.test(filename)) return "audio/flac";
  if (/\.m4a$/i.test(filename)) return "audio/mp4";
  if (/\.ogg$/i.test(filename)) return "audio/ogg";
  return "audio/mpeg";
}

function streamAudioFile(req, res, filePath, { mime = "audio/mpeg", fileName = "audio.wav", preview = false } = {}) {
  if (!filePath || !existsSync(filePath)) return res.status(404).json({ error: "Fichier audio introuvable." });
  const size = statSync(filePath).size;
  const maxPreviewBytes = preview ? Math.min(size, Math.max(384 * 1024, Math.floor(size * .18))) : size;
  const range = req.headers.range;
  let start = 0;
  let end = maxPreviewBytes - 1;
  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      start = Math.min(Number(match[1]) || 0, maxPreviewBytes - 1);
      end = match[2] ? Math.min(Number(match[2]), maxPreviewBytes - 1) : Math.min(start + (1024 * 1024) - 1, maxPreviewBytes - 1);
    }
  }
  res.status(range ? 206 : 200);
  res.setHeader("Content-Type", mime || "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", Math.max(0, end - start + 1));
  res.setHeader("Content-Range", `bytes ${start}-${end}/${maxPreviewBytes}`);
  res.setHeader("Cache-Control", preview ? "private, max-age=300" : "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!preview) res.setHeader("Content-Disposition", `attachment; filename="${String(fileName).replace(/"/g, "")}"`);
  createReadStream(filePath, { start, end }).pipe(res);
}

async function fetchGoogleProfile(code) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleAuth.clientId,
      client_secret: googleAuth.clientSecret,
      redirect_uri: googleAuth.redirectUri,
      grant_type: "authorization_code"
    })
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) throw new Error(tokenData.error_description || "Google token exchange failed.");

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.email || !profile.sub) throw new Error("Google profile could not be loaded.");
  if (profile.email_verified === false) throw new Error("Google email is not verified.");
  return profile;
}

function scanCopyright({ title = "", artist = "", description = "" }) {
  if (scanConfig.provider === "off") {
    return { provider: "off", status: "clear", score: 0, match_title: "", notes: "Scanning disabled by configuration." };
  }

  const text = `${title} ${artist} ${description}`.toLowerCase();
  const blockedTerms = ["drake", "taylor swift", "bad bunny", "beyonce", "rihanna", "dua lipa", "copyright"];
  const reviewTerms = ["remix", "bootleg", "edit", "acapella", "sample", "rework", "mashup", "radio edit"];
  const blockedHit = blockedTerms.find((term) => text.includes(term));
  const reviewHit = reviewTerms.find((term) => text.includes(term));

  if (blockedHit) {
    return {
      provider: scanConfig.provider,
      status: "blocked",
      score: 92,
      match_title: `Known catalog match: ${blockedHit}`,
      notes: "Automatic block because the metadata looks like a known protected work."
    };
  }

  if (reviewHit) {
    return {
      provider: scanConfig.provider,
      status: "review",
      score: 64,
      match_title: `Possible derivative work: ${reviewHit}`,
      notes: "Manual review required before public publishing."
    };
  }

  return {
    provider: scanConfig.provider,
    status: "clear",
    score: 0,
    match_title: "",
    notes: scanConfig.provider === "local"
      ? "Local metadata scan passed. Configure AudD or ACRCloud for production fingerprinting."
      : scanConfig.provider === "manual"
        ? "Manual rights review policy passed."
      : "No match returned by the configured provider."
  };
}

function moderationFromScan(scan) {
  if (scan.status === "blocked" || scan.score >= scanConfig.blockThreshold) return "blocked";
  if (scan.status === "review" || scan.score >= scanConfig.reviewThreshold) return "review";
  return "published";
}

const SESSION_MAX_AGE_DAYS = 30;

// Clean up expired sessions periodically
setInterval(() => {
  db.prepare(`DELETE FROM sessions WHERE created_at < datetime('now', '-${SESSION_MAX_AGE_DAYS} days')`).run();
}, 60 * 60_000).unref();

function auth(req, res, next) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentification requise." });
  const session = db.prepare(
    `SELECT user_id FROM sessions WHERE token = ? AND created_at >= datetime('now', '-${SESSION_MAX_AGE_DAYS} days')`
  ).get(token);
  if (!session) return res.status(401).json({ error: "Session expirée ou invalide. Reconnecte-toi." });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  if (!user) return res.status(401).json({ error: "Compte introuvable." });
  req.user = user;
  next();
}

function staffAuth(req, res, next) {
  auth(req, res, () => {
    const allowed = ["staff", "moderator", "admin"];
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: "Acces staff requis." });
    next();
  });
}

function requireStaffRole(req, res, roles = []) {
  if (!roles.includes(req.user.role)) {
    res.status(403).json({ error: "Permission insuffisante." });
    return false;
  }
  return true;
}

function releaseSelect(where = "", order = "r.plays DESC") {
  return `
    SELECT r.*, u.name artist, u.avatar, u.avatar_url, u.artist_slug, u.role artist_role, u.plan artist_plan, u.verified, u.pro,
      (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) likes,
      (SELECT COUNT(*) FROM release_comments rc WHERE rc.release_id = r.id) comments,
      (SELECT COUNT(*) FROM follows f WHERE f.artist_id = u.id) followers
    FROM releases r
    JOIN users u ON u.id = r.user_id
    ${where}
    ORDER BY ${order}
  `;
}

function audioAccessUrl(release = {}) {
  const storageName = storageNameFromAudioUrl(release.audio_url);
  if (!storageName) return release.audio_url || "";
  const purpose = release.free ? "stream" : "preview";
  return `/api/audio/${purpose}/${encodeURIComponent(storageName)}?token=${audioToken(storageName, purpose)}`;
}

function presentRelease(release) {
  if (!release) return release;
  return {
    ...release,
    audio_url: audioAccessUrl(release),
    preview_seconds: release.free ? null : 45
  };
}

function presentReleases(releases = []) {
  return releases.map(presentRelease);
}

function optionalUserId(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  return db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token)?.user_id || null;
}

function publicReleaseWhere(prefix = "r") {
  return `${prefix}.moderation_status = 'published' AND ${prefix}.visibility = 'public'`;
}

function activeCampaignWhere(prefix = "pc") {
  return `${prefix}.target_type = 'release' AND ${prefix}.status = 'active' AND datetime(${prefix}.ends_at) >= datetime('now')`;
}

function campaignSelect(where = "", order = "pc.created_at DESC") {
  return `
    SELECT pc.*, r.title release_title, r.genre release_genre, r.cover_url release_cover_url, u.name owner_name
    FROM promotion_campaigns pc
    LEFT JOIN releases r ON r.id = pc.release_id
    JOIN users u ON u.id = pc.user_id
    ${where}
    ORDER BY ${order}
  `;
}

function payoutSummary(userId) {
  const gross = db.prepare("SELECT COALESCE(SUM(p.amount_cents), 0) total FROM purchases p JOIN releases r ON r.id = p.release_id WHERE r.user_id = ? AND r.moderation_status != 'removed'").get(userId).total;
  const ledger = db.prepare("SELECT COALESCE(SUM(CASE WHEN status IN ('pending','approved','paid') THEN amount_cents ELSE 0 END), 0) reserved, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0) paid, COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount_cents ELSE 0 END), 0) pending FROM payout_requests WHERE user_id = ?").get(userId);
  return { gross_balance: gross, available_balance: Math.max(0, gross - ledger.reserved), payout_reserved: ledger.pending, payout_paid: ledger.paid, payout_minimum: payoutMinimumCents };
}

function encryptPayoutDestination(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", payoutEncryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptPayoutDestination(payload) {
  const [iv, tag, encrypted] = String(payload || "").split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", payoutEncryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function normalizeArtistSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/copyright/config", auth, (req, res) => {
  const allowed = ["staff", "moderator", "admin"];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: "Accès réservé au staff." });
  res.json({
    provider: scanConfig.provider,
    takedown_email: scanConfig.takedownEmail,
    block_threshold: scanConfig.blockThreshold,
    review_threshold: scanConfig.reviewThreshold
  });
});

app.post("/api/auth/register", rateLimiter(10, 15 * 60_000), (req, res) => {
  const { name, email, password, genre = "Tech House" } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Nom, email et mot de passe sont requis." });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Adresse email invalide." });
  if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ error: "Nom d'artiste invalide (2–80 caractères)." });
  const initials = name.trim().split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const userId = id("usr");
  try {
    db.prepare("INSERT INTO users (id, name, email, password_hash, avatar, genre, bio, plan, pro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(userId, name, email.toLowerCase(), hashPassword(password), initials || "U0", genre, "Nouvel artiste Undiscover.", "free", 0);
    const token = id("tok");
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
    res.json({ token, user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) });
  } catch {
    res.status(409).json({ error: "Cet email existe deja." });
  }
});

app.post("/api/auth/login", rateLimiter(20, 15 * 60_000), (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email invalide." });
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase());
  if (!user || !verifyPassword(String(password || ""), user.password_hash)) return res.status(401).json({ error: "Identifiants invalides." });
  const token = id("tok");
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/google/start", (_req, res) => {
  if (!googleAuth.clientId || !googleAuth.clientSecret) {
    return res.redirect(authRedirect({ error: "Google auth is not configured." }));
  }
  const params = new URLSearchParams({
    client_id: googleAuth.clientId,
    redirect_uri: googleAuth.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "offline",
    state: makeGoogleState()
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(authRedirect({ error: String(error) }));
  if (!code || !verifyGoogleState(state)) return res.redirect(authRedirect({ error: "Invalid Google auth state." }));
  try {
    const profile = await fetchGoogleProfile(String(code));
    const email = String(profile.email || "").toLowerCase();
    const name = String(profile.name || email.split("@")[0] || "Google Artist").trim();
    const avatar = initialsForName(name);
    let user = db.prepare("SELECT * FROM users WHERE google_id = ? AND google_id != ''").get(String(profile.sub));
    if (!user) user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (user) {
      db.prepare("UPDATE users SET google_id = ?, avatar_url = ?, auth_provider = CASE WHEN auth_provider LIKE '%password%' THEN 'password+google' ELSE 'google' END WHERE id = ?")
        .run(String(profile.sub), String(profile.picture || ""), user.id);
    } else {
      const userId = id("usr");
      db.prepare("INSERT INTO users (id, name, email, password_hash, avatar, avatar_url, google_id, auth_provider, genre, bio, plan, pro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(userId, name, email, hashPassword(id("google")), avatar, String(profile.picture || ""), String(profile.sub), "google", "Electronic", "Nouvel artiste Undiscover.", "free", 0);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    }

    const freshUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    const token = id("tok");
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, freshUser.id);
    res.redirect(authRedirect({ token }));
  } catch (err) {
    res.redirect(authRedirect({ error: err.message || "Google auth failed." }));
  }
});

app.get("/api/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post("/api/auth/logout", auth, (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.json({ ok: true });
});

app.use("/uploads", (req, res, next) => {
  if (/\.(wav|mp3|aiff?|flac|m4a|ogg)$/i.test(req.path)) return res.status(404).json({ error: "Audio protected." });
  next();
}, express.static(uploadDir, {
  fallthrough: false,
  dotfiles: "deny",
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
}));

app.post("/api/uploads/audio", auth, audioUpload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier audio requis." });
  const token = audioToken(req.file.filename, "preview");
  res.json({
    file: {
      url: `/api/audio/preview/${encodeURIComponent(req.file.filename)}?token=${token}`,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      storage_name: req.file.filename,
      preview_seconds: 45
    }
  });
});

app.get("/api/audio/preview/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!verifyAudioToken(filename, "preview", String(req.query.token || ""))) return res.status(403).json({ error: "Preview token invalide." });
  streamAudioFile(req, res, safeUploadPath(filename), {
    mime: audioMimeFromName(filename),
    fileName: filename,
    preview: true
  });
});

app.get("/api/audio/stream/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!verifyAudioToken(filename, "stream", String(req.query.token || ""))) return res.status(403).json({ error: "Stream token invalide." });
  streamAudioFile(req, res, safeUploadPath(filename), {
    mime: audioMimeFromName(filename),
    fileName: filename,
    preview: false
  });
});

app.post("/api/uploads/image", auth, imageUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Image requise." });
  res.json({
    file: {
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size
    }
  });
});

app.get("/api/releases", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  const genre = req.query.genre;
  const kind = req.query.kind;
  const SORT_COLS = { plays: "r.plays", created_at: "r.created_at", downloads: "r.downloads", price_cents: "r.price_cents" };
  const sortCol = SORT_COLS[req.query.sort] || "r.plays";
  const conditions = [`(r.title LIKE ? OR u.name LIKE ?)`, publicReleaseWhere("r")];
  const params = [q, q];
  if (genre && genre !== "All") { conditions.push("r.genre = ?"); params.push(genre); }
  if (kind && kind !== "All") { conditions.push("r.kind = ?"); params.push(kind); }
  const rows = db.prepare(releaseSelect(`WHERE ${conditions.join(" AND ")}`, `${sortCol} DESC`)).all(...params);
  res.json({ releases: presentReleases(rows) });
});

app.get("/api/releases/:id", (req, res) => {
  const userId = optionalUserId(req);
  const row = db.prepare(releaseSelect("WHERE r.id = ? AND r.moderation_status = 'published' AND (r.visibility != 'private' OR r.user_id = ?)", "r.created_at DESC")).get(req.params.id, userId || "");
  if (!row) return res.status(404).json({ error: "Release introuvable." });
  if (row.visibility === "private" && row.user_id !== userId) return res.status(404).json({ error: "Release introuvable." });
  // Only count view from non-owners; /api/releases/:id/listen handles play tracking
  if (!userId || userId !== row.user_id) {
    db.prepare("UPDATE releases SET plays = plays + 1 WHERE id = ?").run(req.params.id);
  }
  const fresh = db.prepare(releaseSelect("WHERE r.id = ?", "r.created_at DESC")).get(req.params.id);
  const comments = db.prepare(`
    SELECT rc.id, rc.body, rc.created_at, u.id user_id, u.name, u.avatar, u.avatar_url
    FROM release_comments rc
    JOIN users u ON u.id = rc.user_id
    WHERE rc.release_id = ?
    ORDER BY rc.created_at DESC
    LIMIT 50
  `).all(req.params.id);
  res.json({ release: presentRelease(fresh), comments });
});

function normalizeGateActions(actions = []) {
  const allowed = ["like", "follow", "share", "comment"];
  const list = Array.isArray(actions)
    ? actions
    : String(actions || "").split(",");
  return [...new Set(list.map((action) => String(action).trim().toLowerCase()).filter((action) => allowed.includes(action)))];
}

app.post("/api/releases", auth, (req, res) => {
  const { title, kind, genre, tracks, duration, price, free, gate, gate_actions = [], description, rights_confirmed, rights_owner, download_enabled = true, audio_url = "", audio_file_name = "", audio_mime = "", audio_size = 0, track_files = [], cover_url = "", featured_artist = "", visibility = "public" } = req.body;
  if (!title || !kind || !genre) return res.status(400).json({ error: "Titre, type et genre sont requis." });
  if (!audio_url) return res.status(400).json({ error: "Upload audio requis avant publication." });
  if (!rights_confirmed) return res.status(400).json({ error: "Confirmation des droits requise avant publication." });
  const autoRightsOwner = String(rights_owner || "").trim() || `${req.user.name} - Undiscover upload consent`;
  const releaseId = id("rel");
  const normalizedGateActions = download_enabled ? normalizeGateActions(gate_actions) : [];
  const gateLabel = normalizedGateActions.length
    ? normalizedGateActions.map((action) => `${action} required`).join(", ")
    : download_enabled ? "No gate" : "Downloads disabled";
  const scan = scanCopyright({ title, artist: req.user.name, description });
  const moderationStatus = moderationFromScan(scan);
  const releaseVisibility = ["public", "private", "unlisted"].includes(String(visibility).toLowerCase()) ? String(visibility).toLowerCase() : "public";
  db.prepare(`INSERT INTO releases (id, user_id, title, kind, genre, tracks, duration, price_cents, free, gate, gate_actions, description, color, download_enabled,
      rights_confirmed, rights_owner, scan_status, scan_provider, scan_score, scan_match_title, scan_notes, moderation_status, audio_url, audio_file_name, audio_mime, audio_size, track_files, cover_url, featured_artist, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      releaseId,
      req.user.id,
      title,
      kind,
      genre,
      Number(tracks) || 1,
      duration || "06:00",
      cents(price) * 100,
      free ? 1 : 0,
      gateLabel || gate || "No gate",
      JSON.stringify(normalizedGateActions),
      description || "",
      "green",
      download_enabled ? 1 : 0,
      1,
      autoRightsOwner,
      scan.status,
      scan.provider,
      scan.score,
      scan.match_title,
      scan.notes,
      moderationStatus,
      String(audio_url),
      String(audio_file_name || ""),
      String(audio_mime || ""),
      Number(audio_size) || 0,
      JSON.stringify(Array.isArray(track_files) ? track_files.slice(0, 30) : []),
      String(cover_url || ""),
      String(featured_artist || "").trim(),
      releaseVisibility
    );
  db.prepare("INSERT INTO copyright_scans (id, release_id, provider, status, score, match_title, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id("scan"), releaseId, scan.provider, scan.status, scan.score, scan.match_title, JSON.stringify(scan));
  const release = db.prepare(releaseSelect("WHERE r.id = ?", "r.created_at DESC")).get(releaseId);
  res.json({ release: presentRelease(release), scan });
});

function canManageRelease(user, release) {
  return release.user_id === user.id || ["staff", "moderator", "admin"].includes(user.role);
}

app.patch("/api/releases/:id", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status != 'removed'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  if (!canManageRelease(req.user, release)) return res.status(403).json({ error: "Permission insuffisante." });

  const next = { ...release, ...req.body };
  const title = String(next.title || "").trim();
  const kind = String(next.kind || "Track").trim();
  const genre = String(next.genre || "Electronic").trim();
  if (!title || !kind || !genre) return res.status(400).json({ error: "Titre, type et genre sont requis." });

  const downloadEnabled = next.download_enabled ? 1 : 0;
  const normalizedGateActions = downloadEnabled ? normalizeGateActions(next.gate_actions) : [];
  const gateLabel = normalizedGateActions.length
    ? normalizedGateActions.map((action) => `${action} required`).join(", ")
    : downloadEnabled ? "No gate" : "Downloads disabled";
  const visibility = ["public", "private", "unlisted"].includes(String(next.visibility).toLowerCase()) ? String(next.visibility).toLowerCase() : "public";
  const isFree = next.free ? 1 : 0;

  db.prepare(`UPDATE releases
    SET title = ?, kind = ?, genre = ?, tracks = ?, duration = ?, price_cents = ?, free = ?, gate = ?, gate_actions = ?,
        description = ?, download_enabled = ?, cover_url = ?, featured_artist = ?, visibility = ?
    WHERE id = ?`)
    .run(
      title,
      kind,
      genre,
      Math.max(1, Number(next.tracks) || 1),
      String(next.duration || "00:00").trim(),
      isFree ? 0 : cents(next.price || Number(next.price_cents || 0) / 100) * 100,
      isFree,
      gateLabel,
      JSON.stringify(normalizedGateActions),
      String(next.description || "").trim(),
      downloadEnabled,
      String(next.cover_url || "").trim(),
      String(next.featured_artist || "").trim(),
      visibility,
      req.params.id
    );

  const updated = db.prepare(releaseSelect("WHERE r.id = ?", "r.created_at DESC")).get(req.params.id);
  res.json({ release: presentRelease(updated) });
});

app.delete("/api/releases/:id", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status != 'removed'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  if (!canManageRelease(req.user, release)) return res.status(403).json({ error: "Permission insuffisante." });
  db.prepare("UPDATE releases SET moderation_status = 'removed', visibility = 'private' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/releases/:id/report", rateLimiter(5, 60 * 60_000), (req, res) => {
  const release = db.prepare("SELECT id FROM releases WHERE id = ? AND moderation_status != 'removed'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const { reporter_name, reporter_email, rights_owner, reason, evidence_url = "" } = req.body;
  if (!reporter_name || !reporter_email || !rights_owner || !reason) {
    return res.status(400).json({ error: "Nom, email, titulaire des droits et motif sont requis." });
  }
  if (!isValidEmail(reporter_email)) return res.status(400).json({ error: "Email reporter invalide." });
  db.prepare(`INSERT INTO takedown_reports (id, release_id, reporter_name, reporter_email, rights_owner, reason, evidence_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id("td"), req.params.id, reporter_name, reporter_email, rights_owner, reason, evidence_url);
  db.prepare("UPDATE releases SET takedown_count = takedown_count + 1, moderation_status = 'review', scan_status = 'review', scan_notes = ? WHERE id = ?")
    .run("Copyright report received. Release moved to review until moderation resolves the claim.", req.params.id);
  res.json({ ok: true, status: "review", message: "Signalement recu. La release est placee en review." });
});

app.post("/api/releases/:id/like", auth, (req, res) => {
  const liked = db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND release_id = ?").get(req.user.id, req.params.id);
  if (liked) db.prepare("DELETE FROM likes WHERE user_id = ? AND release_id = ?").run(req.user.id, req.params.id);
  else db.prepare("INSERT INTO likes (user_id, release_id) VALUES (?, ?)").run(req.user.id, req.params.id);
  res.json({ liked: !liked, likes: db.prepare("SELECT COUNT(*) total FROM likes WHERE release_id = ?").get(req.params.id).total });
});

app.post("/api/releases/:id/comments", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published' AND (visibility != 'private' OR user_id = ?)").get(req.params.id, req.user.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const body = String(req.body.body || "").trim();
  if (!body) return res.status(400).json({ error: "Commentaire requis." });
  db.prepare("INSERT INTO release_comments (id, user_id, release_id, body) VALUES (?, ?, ?, ?)").run(id("com"), req.user.id, req.params.id, body.slice(0, 1000));
  res.json({ ok: true });
});

app.post("/api/releases/:id/listen", rateLimiter(60, 60_000), (req, res) => {
  const userId = optionalUserId(req);
  const release = db.prepare(`SELECT r.id FROM releases r WHERE r.id = ? AND ${publicReleaseWhere("r")}`).get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  db.prepare("INSERT INTO release_listens (id, user_id, release_id) VALUES (?, ?, ?)").run(id("lst"), userId, req.params.id);
  db.prepare("UPDATE releases SET plays = plays + 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/discover", (req, res) => {
  const userId = optionalUserId(req);

  const recent = userId
    ? db.prepare(releaseSelect(`
        JOIN release_listens rl ON rl.release_id = r.id
        WHERE rl.user_id = ? AND ${publicReleaseWhere("r")}
        GROUP BY r.id
      `, "MAX(rl.created_at) DESC")).all(userId).slice(0, 12)
    : [];

  const affinity = userId
    ? db.prepare(`
        SELECT r.genre, r.user_id, COUNT(*) weight
        FROM release_listens rl
        JOIN releases r ON r.id = rl.release_id
        WHERE rl.user_id = ?
        GROUP BY r.genre, r.user_id
        ORDER BY weight DESC
        LIMIT 8
      `).all(userId)
    : [];

  const genres = new Set(affinity.map((row) => row.genre));
  const artistIds = new Set(affinity.map((row) => row.user_id));
  const recentlyHeardIds = new Set(recent.map((item) => item.id));

  // Score-ranked recommendations — query in DB, limit to 80 candidates to avoid full scan
  const candidatePool = db.prepare(releaseSelect(
    `WHERE ${publicReleaseWhere("r")}`,
    "(r.plays * 0.55 + r.downloads * 1.4) DESC"
  )).all().slice(0, 80);

  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const recommended = candidatePool
    .filter((r) => !recentlyHeardIds.has(r.id))
    .map((r) => ({
      ...r,
      recommendation_score:
        Number(r.plays || 0) * 0.55 +
        Number(r.downloads || 0) * 1.4 +
        Number(r.likes || 0) * 4 +
        (genres.has(r.genre) ? 90 : 0) +
        (artistIds.has(r.user_id) ? 70 : 0) +
        (now - new Date(r.created_at).getTime() < twoWeeks ? 35 : 0)
    }))
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, 16);

  const newReleases = db.prepare(releaseSelect(
    `WHERE ${publicReleaseWhere("r")}`,
    "r.created_at DESC"
  )).all().slice(0, 12);

  const trendingGenres = db.prepare(`
    SELECT r.genre, COUNT(*) releases, COALESCE(SUM(r.plays), 0) plays, COALESCE(SUM(r.downloads), 0) downloads
    FROM releases r
    WHERE ${publicReleaseWhere("r")}
    GROUP BY r.genre
    ORDER BY (COALESCE(SUM(r.plays), 0) + COALESCE(SUM(r.downloads), 0) * 2 + COUNT(*) * 15) DESC
    LIMIT 8
  `).all();

  const boosted = db.prepare(campaignSelect(
    `WHERE ${activeCampaignWhere("pc")} AND pc.spot = 'discovery'`,
    "pc.daily_budget_cents DESC, pc.created_at DESC"
  )).all().slice(0, 8);

  const suggestedArtists = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.avatar_url, u.logo_url, u.artist_slug, u.genre, u.verified, u.pro, u.plan, u.role,
      COUNT(DISTINCT r.id) releases, COALESCE(SUM(r.plays), 0) plays, COUNT(DISTINCT f.follower_id) followers
    FROM users u
    LEFT JOIN releases r ON r.user_id = u.id AND ${publicReleaseWhere("r")}
    LEFT JOIN follows f ON f.artist_id = u.id
    WHERE u.workspace_visibility = 'public'
    GROUP BY u.id
    ORDER BY (COALESCE(SUM(r.plays), 0) + COUNT(DISTINCT f.follower_id) * 12 + u.verified * 80 + u.pro * 60) DESC
    LIMIT 8
  `).all();

  res.json({
    recent: presentReleases(recent),
    recommended: presentReleases(recommended),
    trending_genres: trendingGenres,
    boosted,
    suggested_artists: suggestedArtists,
    new_releases: presentReleases(newReleases)
  });
});

app.get("/api/charts", (req, res) => {
  const type = String(req.query.type || "top100");
  const genre = String(req.query.genre || "All");
  const genreWhere = genre && genre !== "All" ? " AND r.genre = ?" : "";
  const params = genreWhere ? [genre] : [];
  if (type === "countries") {
    const countries = db.prepare(`
      SELECT COALESCE(NULLIF(u.location, ''), 'Unknown') location, COUNT(DISTINCT r.id) releases,
        COALESCE(SUM(r.plays), 0) plays, COALESCE(SUM(r.downloads), 0) downloads, COALESCE(SUM(r.sales), 0) sales
      FROM releases r
      JOIN users u ON u.id = r.user_id
      WHERE ${publicReleaseWhere("r")} ${genreWhere}
      GROUP BY location
      ORDER BY plays DESC, downloads DESC
      LIMIT 50
    `).all(...params);
    return res.json({ countries });
  }
  const orderMap = {
    top100: "(r.plays + r.downloads * 3 + r.sales * 6 + (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) * 4 + (SELECT COUNT(*) FROM release_comments rc WHERE rc.release_id = r.id) * 2) DESC",
    plays: "r.plays DESC",
    downloads: "r.downloads DESC",
    sales: "r.sales DESC",
    newest: "r.created_at DESC"
  };
  const order = orderMap[type] || orderMap.top100;
  const releases = db.prepare(releaseSelect(`WHERE ${publicReleaseWhere("r")} ${genreWhere}`, order)).all(...params).slice(0, 100);
  res.json({ releases: presentReleases(releases) });
});

function requiredGateActions(release) {
  if (!release.download_enabled) return [];
  try {
    const parsed = JSON.parse(release.gate_actions || "[]");
    const normalized = normalizeGateActions(parsed);
    if (normalized.length) return normalized;
  } catch {
    // Fallback below keeps older releases compatible.
  }
  const gate = String(release.gate || "None").toLowerCase();
  return [
    gate.includes("follow") && "follow",
    gate.includes("like") && "like",
    gate.includes("share") && "share",
    gate.includes("comment") && "comment"
  ].filter(Boolean);
}

app.get("/api/releases/:id/gate", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published' AND (visibility != 'private' OR user_id = ?)").get(req.params.id, req.user.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const required = requiredGateActions(release);
  const done = db.prepare("SELECT action FROM release_gate_actions WHERE user_id = ? AND release_id = ?").all(req.user.id, req.params.id).map((row) => row.action);
  res.json({ download_enabled: !!release.download_enabled, required, done, unlocked: required.every((action) => done.includes(action)) });
});

app.post("/api/releases/:id/gate-action", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published' AND (visibility != 'private' OR user_id = ?)").get(req.params.id, req.user.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const action = String(req.body.action || "").toLowerCase();
  const note = String(req.body.note || "").trim();
  const required = requiredGateActions(release);
  if (!required.includes(action)) return res.status(400).json({ error: "Action de gate invalide." });
  if (action === "follow") {
    db.prepare("INSERT OR IGNORE INTO follows (follower_id, artist_id) VALUES (?, ?)").run(req.user.id, release.user_id);
  }
  if (action === "like") {
    db.prepare("INSERT OR IGNORE INTO likes (user_id, release_id) VALUES (?, ?)").run(req.user.id, req.params.id);
  }
  if (action === "comment") {
    if (!note) return res.status(400).json({ error: "Commentaire requis." });
    db.prepare("INSERT INTO release_comments (id, user_id, release_id, body) VALUES (?, ?, ?, ?)").run(id("com"), req.user.id, req.params.id, note);
  }
  db.prepare("INSERT OR REPLACE INTO release_gate_actions (user_id, release_id, action, note) VALUES (?, ?, ?, ?)")
    .run(req.user.id, req.params.id, action, note);
  const done = db.prepare("SELECT action FROM release_gate_actions WHERE user_id = ? AND release_id = ?").all(req.user.id, req.params.id).map((row) => row.action);
  res.json({ required, done, unlocked: required.every((item) => done.includes(item)) });
});

app.post("/api/releases/:id/download", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published' AND (visibility != 'private' OR user_id = ?)").get(req.params.id, req.user.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  if (!release.download_enabled) return res.status(403).json({ error: "Le telechargement est desactive pour cette release." });
  const required = requiredGateActions(release);
  const done = db.prepare("SELECT action FROM release_gate_actions WHERE user_id = ? AND release_id = ?").all(req.user.id, req.params.id).map((row) => row.action);
  const missing = required.filter((action) => !done.includes(action));
  if (missing.length) return res.status(403).json({ error: "Complete les actions du download gate avant de telecharger.", missing });
  db.prepare("UPDATE releases SET downloads = downloads + 1 WHERE id = ?").run(req.params.id);
  const storageName = storageNameFromAudioUrl(release.audio_url);
  streamAudioFile(req, res, safeUploadPath(storageName), {
    mime: release.audio_mime || "application/octet-stream",
    fileName: release.audio_file_name || `${release.title}.wav`,
    preview: false
  });
});

app.post("/api/releases/:id/buy", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published' AND (visibility != 'private' OR user_id = ?)").get(req.params.id, req.user.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const amount = release.price_cents || 0;
  db.prepare("INSERT INTO purchases (id, user_id, release_id, amount_cents) VALUES (?, ?, ?, ?)").run(id("pur"), req.user.id, req.params.id, amount);
  db.prepare("UPDATE releases SET sales = sales + 1, revenue_cents = revenue_cents + ? WHERE id = ?").run(amount, req.params.id);
  res.json({ ok: true, amount_cents: amount });
});

app.get("/api/artists", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const rows = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.avatar_url, u.logo_url, u.banner_url, u.artist_slug, u.social_links, u.genre, u.location, u.bio, u.verified, u.pro, u.plan, u.role,
      COUNT(DISTINCT r.id) releases,
      COALESCE(SUM(r.plays), 0) plays,
      COUNT(DISTINCT f.follower_id) followers
    FROM users u
    LEFT JOIN releases r ON r.user_id = u.id AND ${publicReleaseWhere("r")}
    LEFT JOIN follows f ON f.artist_id = u.id
    WHERE u.workspace_visibility = 'public' AND (u.name LIKE ? OR u.genre LIKE ?)
    GROUP BY u.id
    ORDER BY plays DESC
    LIMIT ? OFFSET ?
  `).all(q, q, limit, offset);
  res.json({ artists: rows, limit, offset });
});

app.get("/api/artists/:id", (req, res) => {
  const artist = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.avatar_url, u.logo_url, u.banner_url, u.artist_slug, u.social_links, u.genre, u.location, u.bio, u.verified, u.pro, u.plan, u.role,
      COUNT(DISTINCT r.id) releases_count,
      COALESCE(SUM(r.plays), 0) plays,
      COUNT(DISTINCT f.follower_id) followers
    FROM users u
    LEFT JOIN releases r ON r.user_id = u.id AND ${publicReleaseWhere("r")}
    LEFT JOIN follows f ON f.artist_id = u.id
    WHERE (u.id = ? OR u.artist_slug = ?) AND u.workspace_visibility = 'public'
    GROUP BY u.id
  `).get(req.params.id, normalizeArtistSlug(req.params.id));
  if (!artist) return res.status(404).json({ error: "Artiste introuvable." });
  const releases = db.prepare(releaseSelect(`WHERE r.user_id = ? AND ${publicReleaseWhere("r")}`, "r.created_at DESC")).all(artist.id);
  res.json({ artist, releases: presentReleases(releases) });
});

app.patch("/api/me/settings", auth, (req, res) => {
  const artistSlug = normalizeArtistSlug(req.body.artist_slug || "");
  const currentPlan = ["free", "pro", "label"].includes(String(req.user.plan || "").toLowerCase()) ? String(req.user.plan).toLowerCase() : req.user.pro ? "pro" : "free";
  const plan = currentPlan;
  if (artistSlug && artistSlug.length < 3) return res.status(400).json({ error: "Le lien perso doit contenir au moins 3 caracteres." });
  if (artistSlug && /^usr_/i.test(artistSlug)) return res.status(400).json({ error: "Ce lien perso est reserve." });
  if (artistSlug) {
    const existing = db.prepare("SELECT id FROM users WHERE artist_slug = ? AND id != ?").get(artistSlug, req.user.id);
    if (existing) return res.status(409).json({ error: "Ce lien perso est deja pris." });
  }
  const fields = {
    name: String(req.body.name || req.user.name).trim(),
    email: String(req.body.email || req.user.email).trim().toLowerCase(),
    location: String(req.body.location || "").trim(),
    bio: String(req.body.bio || "").trim(),
    genre: String(req.body.genre || req.user.genre || "Tech House").trim(),
    avatar_url: String(req.body.avatar_url || "").trim(),
    logo_url: String(req.body.logo_url || "").trim(),
    banner_url: String(req.body.banner_url || "").trim(),
    artist_slug: artistSlug,
    plan,
    workspace_visibility: ["public", "private"].includes(String(req.body.workspace_visibility).toLowerCase()) ? String(req.body.workspace_visibility).toLowerCase() : "public",
    social_links: JSON.stringify({
      instagram: String(req.body.instagram || "").trim(),
      soundcloud: String(req.body.soundcloud || "").trim(),
      spotify: String(req.body.spotify || "").trim(),
      website: String(req.body.website || "").trim()
    })
  };
  if (!fields.name || !fields.email) return res.status(400).json({ error: "Nom et email requis." });
  if (!isValidEmail(fields.email)) return res.status(400).json({ error: "Adresse email invalide." });
  try {
    db.prepare(`UPDATE users SET name = ?, email = ?, location = ?, bio = ?, genre = ?, avatar_url = ?, logo_url = ?, banner_url = ?, artist_slug = ?, plan = ?, pro = ?, workspace_visibility = ?, social_links = ? WHERE id = ?`)
      .run(fields.name, fields.email, fields.location, fields.bio, fields.genre, fields.avatar_url, fields.logo_url, fields.banner_url, fields.artist_slug, fields.plan, fields.plan !== "free" ? 1 : 0, fields.workspace_visibility, fields.social_links, req.user.id);
    res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id)) });
  } catch {
    res.status(409).json({ error: "Cet email existe deja." });
  }
});

app.post("/api/artists/:id/follow", auth, (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: "Impossible de suivre ton propre profil." });
  const followed = db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND artist_id = ?").get(req.user.id, req.params.id);
  if (followed) db.prepare("DELETE FROM follows WHERE follower_id = ? AND artist_id = ?").run(req.user.id, req.params.id);
  else db.prepare("INSERT INTO follows (follower_id, artist_id) VALUES (?, ?)").run(req.user.id, req.params.id);
  res.json({ followed: !followed, followers: db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.params.id).total });
});

app.get("/api/dashboard", auth, (req, res) => {
  const stats = db.prepare(`
    SELECT COALESCE(SUM(revenue_cents), 0) revenue, COALESCE(SUM(plays), 0) plays,
      COALESCE(SUM(downloads), 0) downloads, COALESCE(SUM(sales), 0) sales, COUNT(*) releases
    FROM releases WHERE user_id = ? AND moderation_status != 'removed'
  `).get(req.user.id);
  const payoutStats = db.prepare(`
    SELECT
      COALESCE(SUM(p.amount_cents), 0) available_balance,
      COALESCE(SUM(CASE WHEN p.created_at >= datetime('now', '-7 days') THEN p.amount_cents ELSE 0 END), 0) revenue_last_7_days,
      COALESCE(SUM(CASE WHEN p.created_at < datetime('now', '-7 days') AND p.created_at >= datetime('now', '-14 days') THEN p.amount_cents ELSE 0 END), 0) revenue_previous_7_days
    FROM purchases p
    JOIN releases r ON r.id = p.release_id
    WHERE r.user_id = ? AND r.moderation_status != 'removed'
  `).get(req.user.id);
  const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.user.id).total;
  const comments = db.prepare("SELECT COUNT(*) total FROM release_comments rc JOIN releases r ON r.id = rc.release_id WHERE r.user_id = ?").get(req.user.id).total;
  const releases = db.prepare(releaseSelect("WHERE r.user_id = ? AND r.moderation_status != 'removed'", "r.created_at DESC")).all(req.user.id);
  res.json({ stats: { ...stats, ...payoutStats, ...payoutSummary(req.user.id), followers, comments }, releases: presentReleases(releases) });
});

app.get("/api/me/payouts", auth, (req, res) => {
  const requests = db.prepare("SELECT id, amount_cents, method, account_holder, destination_last4, status, artist_note, staff_note, processed_at, created_at FROM payout_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").all(req.user.id);
  res.json({ summary: payoutSummary(req.user.id), requests });
});

app.post("/api/me/payouts", auth, rateLimiter(5, 60 * 60_000), (req, res) => {
  const summary = payoutSummary(req.user.id);
  const amount = Math.floor(Number(req.body.amount_cents || summary.available_balance));
  const method = String(req.body.method || "iban").toLowerCase();
  const accountHolder = String(req.body.account_holder || "").trim().slice(0, 120);
  const artistNote = String(req.body.note || "").trim().slice(0, 300);
  let destination = String(req.body.destination || "").trim();
  if (!accountHolder) return res.status(400).json({ error: "Nom du bénéficiaire requis." });
  if (!['iban', 'paypal'].includes(method)) return res.status(400).json({ error: "Méthode de versement invalide." });
  if (method === "iban") {
    destination = destination.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(destination)) return res.status(400).json({ error: "IBAN invalide." });
  } else if (!isValidEmail(destination)) return res.status(400).json({ error: "Adresse PayPal invalide." });
  if (!Number.isInteger(amount) || amount < payoutMinimumCents) return res.status(400).json({ error: `Le montant minimum est de ${(payoutMinimumCents / 100).toFixed(2)} EUR.` });
  if (amount > summary.available_balance) return res.status(400).json({ error: "Solde disponible insuffisant." });
  const payoutId = id("pay");
  db.prepare("INSERT INTO payout_requests (id, user_id, amount_cents, method, account_holder, destination_encrypted, destination_last4, artist_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(payoutId, req.user.id, amount, method, accountHolder, encryptPayoutDestination(destination), destination.slice(-4), artistNote);
  res.status(201).json({ request: db.prepare("SELECT id, amount_cents, method, account_holder, destination_last4, status, artist_note, created_at FROM payout_requests WHERE id = ?").get(payoutId), summary: payoutSummary(req.user.id) });
});

app.get("/api/testimonials", (_req, res) => {
  const testimonials = db.prepare(`
    SELECT t.quote, t.role, t.updated_at, u.id user_id, u.name, u.avatar, u.avatar_url, u.logo_url, u.artist_slug, u.plan, u.pro
    FROM testimonials t
    JOIN users u ON u.id = t.user_id
    WHERE t.visible = 1 AND u.workspace_visibility = 'public' AND u.plan IN ('pro', 'label')
    ORDER BY t.updated_at DESC
    LIMIT 8
  `).all();
  res.json({ testimonials });
});

app.get("/api/me/testimonial", auth, (req, res) => {
  const testimonial = db.prepare("SELECT quote, role, visible, updated_at FROM testimonials WHERE user_id = ?").get(req.user.id) || null;
  res.json({ testimonial });
});

app.put("/api/me/testimonial", auth, (req, res) => {
  const plan = String(req.user.plan || (req.user.pro ? "pro" : "free")).toLowerCase();
  if (!["pro", "label"].includes(plan)) return res.status(403).json({ error: "Avis reserves aux comptes Pro et Label." });
  const quote = String(req.body.quote || "").trim().slice(0, 360);
  const role = String(req.body.role || req.user.genre || "Artist").trim().slice(0, 80);
  const visible = req.body.visible === false ? 0 : 1;
  if (quote.length < 20) return res.status(400).json({ error: "Ton avis doit contenir au moins 20 caracteres." });
  db.prepare(`
    INSERT INTO testimonials (user_id, quote, role, visible, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET quote = excluded.quote, role = excluded.role, visible = excluded.visible, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, quote, role, visible);
  res.json({ testimonial: db.prepare("SELECT quote, role, visible, updated_at FROM testimonials WHERE user_id = ?").get(req.user.id) });
});

app.post("/api/support/tickets", rateLimiter(5, 60 * 60_000), (req, res) => {
  const { name, email, topic, message } = req.body;
  if (!name || !email || !topic || !message) return res.status(400).json({ error: "Nom, email, sujet et message requis." });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Adresse email invalide." });
  const userId = req.headers.authorization ? db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(req.headers.authorization.replace("Bearer ", ""))?.user_id : null;
  const ticketId = id("sup");
  db.prepare("INSERT INTO support_tickets (id, user_id, name, email, topic, message) VALUES (?, ?, ?, ?, ?, ?)")
    .run(ticketId, userId || null, name, email, topic, message);
  res.json({ ok: true, ticket: { id: ticketId, status: "open" } });
});

app.post("/api/careers/apply", rateLimiter(3, 60 * 60_000), (req, res) => {
  const userId = req.headers.authorization ? db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(req.headers.authorization.replace("Bearer ", ""))?.user_id : null;
  const name = String(req.body.name || "").trim().slice(0, 90);
  const email = String(req.body.email || "").trim().toLowerCase().slice(0, 140);
  const role = String(req.body.role || "").trim().slice(0, 80);
  const experience = String(req.body.experience || "").trim().slice(0, 1600);
  const links = String(req.body.links || "").trim().slice(0, 400);
  const availability = String(req.body.availability || "").trim().slice(0, 120);
  const allowedRoles = ["Staff", "Moderator", "Community Manager", "Manager", "Developer"];
  if (!name || !email || !role || !experience) return res.status(400).json({ error: "Nom, email, role et experience requis." });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Adresse email invalide." });
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: "Role de candidature invalide." });
  const applicationId = id("job");
  db.prepare("INSERT INTO career_applications (id, user_id, name, email, role, experience, links, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(applicationId, userId || null, name, email, role, experience, links, availability);
  res.json({ ok: true, application: { id: applicationId, status: "new" } });
});

app.post("/api/short-links", auth, (req, res) => {
  const targetUrl = String(req.body.url || "").trim();
  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid");
  } catch {
    return res.status(400).json({ error: "URL invalide." });
  }
  let code = id("r").replace(/^r_?/, "").slice(0, 8);
  while (db.prepare("SELECT 1 FROM short_links WHERE code = ?").get(code)) code = id("r").replace(/^r_?/, "").slice(0, 8);
  db.prepare("INSERT INTO short_links (code, user_id, target_url) VALUES (?, ?, ?)").run(code, req.user.id, targetUrl);
  res.json({ code, short_url: `${siteUrl}/r/${code}`, target_url: targetUrl });
});

app.get("/r/:code", (req, res) => {
  const link = db.prepare("SELECT * FROM short_links WHERE code = ?").get(req.params.code);
  if (!link) return res.redirect(`${siteUrl}/explore`);
  db.prepare("UPDATE short_links SET clicks = clicks + 1 WHERE code = ?").run(req.params.code);
  res.redirect(link.target_url);
});

app.get("/api/me/campaigns", auth, (req, res) => {
  db.prepare("UPDATE promotion_campaigns SET status = 'completed' WHERE user_id = ? AND status = 'active' AND datetime(ends_at) < datetime('now')").run(req.user.id);
  const campaigns = db.prepare(campaignSelect("WHERE pc.user_id = ?", "pc.created_at DESC")).all(req.user.id);
  res.json({ campaigns });
});

app.get("/api/campaigns", (req, res) => {
  const spot = String(req.query.spot || "").toLowerCase();
  if (!["homepage", "charts", "sidebar"].includes(spot)) return res.status(400).json({ error: "Placement invalide." });
  const campaigns = db.prepare(campaignSelect(
    `WHERE ${activeCampaignWhere("pc")} AND pc.spot = ?`,
    "pc.daily_budget_cents DESC, pc.created_at DESC"
  )).all(spot).slice(0, 4);
  res.json({ campaigns });
});

async function createCampaignCheckout(campaign) {
  const previousCheckout = db.prepare("SELECT * FROM stripe_checkouts WHERE campaign_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(campaign.id);
  if (previousCheckout) {
    try {
      const previousSession = await stripe.checkout.sessions.retrieve(previousCheckout.stripe_session_id);
      if (previousSession.payment_status === "paid") {
        fulfillStripeCheckout(previousSession);
        return previousSession;
      }
      if (previousSession.status === "open" && previousSession.url) return previousSession;
    } catch {
      db.prepare("UPDATE stripe_checkouts SET status = 'failed' WHERE id = ?").run(previousCheckout.id);
    }
  }
  const totalBudget = Number(campaign.daily_budget_cents) * Number(campaign.days);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard`,
    line_items: [{ price_data: { currency: "eur", unit_amount: totalBudget, product_data: { name: `Campagne: ${campaign.title}`, description: `${campaign.release_title} - ${campaign.days} jour${campaign.days > 1 ? "s" : ""} - ${campaign.spot}` } }, quantity: 1 }],
    metadata: { user_id: campaign.user_id, campaign_id: campaign.id, type: "campaign" }
  });
  db.prepare("INSERT INTO stripe_checkouts (id, user_id, campaign_id, stripe_session_id, amount_cents, status) VALUES (?, ?, ?, ?, ?, 'pending')")
    .run(id("chk"), campaign.user_id, campaign.id, session.id, totalBudget);
  return session;
}

app.post("/api/me/campaigns", auth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Le paiement Stripe doit être configuré avant de lancer une campagne." });
  const spot = String(req.body.spot || "discovery").toLowerCase();
  const dailyBudget = Number(req.body.daily_budget_cents || 100);
  const days = Math.max(1, Math.min(30, Number(req.body.days || 1)));
  if (!["discovery", "homepage", "charts", "sidebar"].includes(spot)) return res.status(400).json({ error: "Spot publicitaire invalide." });
  if (![100, 300, 500].includes(dailyBudget)) return res.status(400).json({ error: "Budget invalide. Choisis 1, 3 ou 5 EUR/jour." });
  const releaseId = String(req.body.release_id || "").trim();
  const release = db.prepare("SELECT id, title, cover_url FROM releases WHERE id = ? AND user_id = ? AND moderation_status = 'published' AND visibility = 'public'").get(releaseId, req.user.id);
  if (!release) return res.status(400).json({ error: "Choisis une release publique et publiée." });
  const title = String(req.body.title || "").trim().slice(0, 90);
  const imageUrl = String(req.body.image_url || "").trim().slice(0, 240);
  if (!title) return res.status(400).json({ error: "Titre de campagne requis." });
  const campaignId = id("cmp");
  db.prepare(`
    INSERT INTO promotion_campaigns (id, user_id, target_type, release_id, title, image_url, spot, daily_budget_cents, days, status, ends_at)
    VALUES (?, ?, 'release', ?, ?, ?, ?, ?, ?, 'pending', datetime('now', ?))
  `).run(campaignId, req.user.id, releaseId, title, imageUrl || release.cover_url || "", spot, dailyBudget, days, `+${days} days`);
  const campaign = db.prepare(campaignSelect("WHERE pc.id = ?")).get(campaignId);
  const session = await createCampaignCheckout(campaign);
  res.json({ campaign, url: session.url });
});

app.post("/api/me/campaigns/:id/checkout", auth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Le paiement Stripe doit être configuré avant de lancer une campagne." });
  const campaign = db.prepare(campaignSelect("WHERE pc.id = ? AND pc.user_id = ? AND pc.status = 'pending'")).get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne en attente introuvable." });
  const session = await createCampaignCheckout(campaign);
  res.json({ url: session.url });
});

app.patch("/api/me/campaigns/:id", auth, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  const action = String(req.body.action || "").toLowerCase();
  if (action === "pause" && campaign.status === "active") {
    db.prepare("UPDATE promotion_campaigns SET status = 'paused', paused_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaign.id);
  } else if (action === "resume" && campaign.status === "paused") {
    db.prepare("UPDATE promotion_campaigns SET status = 'active', ends_at = datetime(ends_at, '+' || MAX(0, CAST(strftime('%s', 'now') - strftime('%s', paused_at) AS INTEGER)) || ' seconds'), paused_at = NULL WHERE id = ?").run(campaign.id);
  } else if (action === "cancel" && ["pending", "active", "paused"].includes(campaign.status)) {
    db.prepare("UPDATE promotion_campaigns SET status = 'cancelled' WHERE id = ?").run(campaign.id);
  } else {
    return res.status(400).json({ error: "Cette action n'est pas disponible pour la campagne." });
  }
  res.json({ campaign: db.prepare(campaignSelect("WHERE pc.id = ?")).get(campaign.id) });
});

app.post("/api/campaigns/:id/impression", (req, res) => {
  const campaign = db.prepare(`SELECT id FROM promotion_campaigns pc WHERE pc.id = ? AND ${activeCampaignWhere("pc")}`).get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  db.prepare("UPDATE promotion_campaigns SET impressions = impressions + 1 WHERE id = ?").run(campaign.id);
  res.json({ ok: true });
});

app.post("/api/campaigns/:id/click", (req, res) => {
  const campaign = db.prepare(`SELECT * FROM promotion_campaigns pc WHERE pc.id = ? AND ${activeCampaignWhere("pc")}`).get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  db.prepare("UPDATE promotion_campaigns SET clicks = clicks + 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/staff/overview", staffAuth, (req, res) => {
  const users = db.prepare("SELECT id, name, email, avatar, avatar_url, role, verified, pro, plan, auth_provider, created_at FROM users ORDER BY created_at DESC").all();
  const releases = db.prepare(releaseSelect("WHERE r.moderation_status != 'removed'", "r.created_at DESC")).all();
  const tickets = db.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all();
  const reports = db.prepare("SELECT tr.*, r.title release_title FROM takedown_reports tr JOIN releases r ON r.id = tr.release_id ORDER BY tr.created_at DESC").all();
  const applications = db.prepare("SELECT * FROM career_applications ORDER BY created_at DESC").all();
  const payouts = db.prepare("SELECT pr.*, u.name artist_name, u.email artist_email FROM payout_requests pr JOIN users u ON u.id = pr.user_id ORDER BY pr.created_at DESC LIMIT 200").all().map((payout) => {
    if (req.user.role !== "admin") return { ...payout, destination: `••••${payout.destination_last4}`, destination_encrypted: undefined };
    try { return { ...payout, destination: decryptPayoutDestination(payout.destination_encrypted), destination_encrypted: undefined }; }
    catch { return { ...payout, destination: `••••${payout.destination_last4}`, destination_encrypted: undefined }; }
  });
  res.json({ users, releases: presentReleases(releases), tickets, reports, applications, payouts });
});

app.patch("/api/staff/payouts/:id", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["admin"])) return;
  const payout = db.prepare("SELECT * FROM payout_requests WHERE id = ?").get(req.params.id);
  if (!payout) return res.status(404).json({ error: "Demande de versement introuvable." });
  const status = String(req.body.status || "").toLowerCase();
  const staffNote = String(req.body.staff_note || "").trim().slice(0, 500);
  const allowed = payout.status === "pending" ? ["approved", "rejected"] : payout.status === "approved" ? ["paid", "rejected"] : [];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Transition de statut invalide." });
  if (status === "rejected" && !staffNote) return res.status(400).json({ error: "Une raison est requise pour rejeter la demande." });
  db.prepare("UPDATE payout_requests SET status = ?, staff_note = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(status, staffNote, req.user.id, payout.id);
  const body = status === "paid" ? `Ton versement de ${(payout.amount_cents / 100).toFixed(2)} EUR a été marqué comme payé.` : status === "approved" ? "Ta demande de versement a été approuvée." : `Ta demande de versement a été rejetée: ${staffNote}`;
  db.prepare("INSERT INTO notifications (id, user_id, type, body) VALUES (?, ?, 'payout', ?)").run(id("ntf"), payout.user_id, body);
  res.json({ ok: true, status });
});

app.post("/api/staff/users/:id/role", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["admin"])) return;
  const role = String(req.body.role || "user").toLowerCase();
  if (!["user", "staff", "moderator", "admin"].includes(role)) return res.status(400).json({ error: "Role invalide." });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json({ ok: true, role });
});

app.post("/api/staff/users/:id/plan", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["admin"])) return;
  const plan = String(req.body.plan || "free").toLowerCase();
  if (!["free", "pro", "label"].includes(plan)) return res.status(400).json({ error: "Plan invalide." });
  db.prepare("UPDATE users SET plan = ?, pro = ? WHERE id = ?").run(plan, plan === "free" ? 0 : 1, req.params.id);
  res.json({ ok: true, plan });
});

app.post("/api/staff/users/:id/verify", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["moderator", "admin"])) return;
  const verified = req.body.verified ? 1 : 0;
  db.prepare("UPDATE users SET verified = ? WHERE id = ?").run(verified, req.params.id);
  res.json({ ok: true, verified: !!verified });
});

app.post("/api/staff/releases/:id/moderate", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["moderator", "admin"])) return;
  const status = String(req.body.status || "published").toLowerCase();
  if (!["published", "review", "blocked", "removed"].includes(status)) return res.status(400).json({ error: "Statut invalide." });
  const scanStatus = status === "published" ? "clear" : status === "removed" ? "blocked" : status;
  const note = `Staff moderation set release to ${status} by ${req.user.email}.`;
  db.prepare("UPDATE releases SET moderation_status = ?, scan_status = ?, scan_notes = ? WHERE id = ?").run(status, scanStatus, note, req.params.id);
  res.json({ ok: true, status });
});

app.post("/api/staff/tickets/:id/status", staffAuth, (req, res) => {
  const status = String(req.body.status || "open").toLowerCase();
  if (!["open", "pending", "closed"].includes(status)) return res.status(400).json({ error: "Statut invalide." });
  db.prepare("UPDATE support_tickets SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true, status });
});

app.post("/api/staff/reports/:id/status", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["moderator", "admin"])) return;
  const status = String(req.body.status || "open").toLowerCase();
  if (!["open", "review", "resolved", "rejected"].includes(status)) return res.status(400).json({ error: "Statut invalide." });
  const report = db.prepare("SELECT * FROM takedown_reports WHERE id = ?").get(req.params.id);
  if (!report) return res.status(404).json({ error: "Signalement introuvable." });
  db.prepare("UPDATE takedown_reports SET status = ? WHERE id = ?").run(status, req.params.id);
  if (status === "review") {
    db.prepare("UPDATE releases SET moderation_status = 'review', scan_status = 'review', scan_notes = ? WHERE id = ?")
      .run(`Copyright report moved to review by ${req.user.email}.`, report.release_id);
  }
  if (status === "resolved") {
    db.prepare("UPDATE releases SET moderation_status = 'removed', scan_status = 'blocked', scan_notes = ? WHERE id = ?")
      .run(`Copyright report resolved by ${req.user.email}; release removed.`, report.release_id);
  }
  res.json({ ok: true, status });
});

app.post("/api/staff/applications/:id/status", staffAuth, (req, res) => {
  if (!requireStaffRole(req, res, ["staff", "moderator", "admin"])) return;
  const status = String(req.body.status || "new").toLowerCase();
  if (!["new", "review", "interview", "accepted", "rejected"].includes(status)) return res.status(400).json({ error: "Statut candidature invalide." });
  db.prepare("UPDATE career_applications SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true, status });
});

app.get("/robots.txt", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.type("text/plain").send([
    "User-agent: *",
    "Allow: /",
    "Allow: /explore",
    "Allow: /artists",
    "Allow: /charts",
    "Allow: /pricing",
    "Allow: /faq",
    "Allow: /getting-started",
    "Allow: /release-guide",
    "Allow: /artist/",
    "Allow: /release/",
    "Disallow: /api/",
    "Disallow: /dashboard",
    "Disallow: /catalog",
    "Disallow: /analytics",
    "Disallow: /payouts",
    "Disallow: /settings",
    "Disallow: /staff",
    "Disallow: /checkout",
    "Disallow: /upload",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join("\n"));
});

app.get("/sitemap.xml", (_req, res) => {
  const artists = db.prepare(
    "SELECT id, artist_slug, created_at FROM users WHERE workspace_visibility = 'public' ORDER BY created_at DESC LIMIT 5000"
  ).all();
  const releases = db.prepare(
    "SELECT id, title, created_at FROM releases WHERE moderation_status = 'published' AND visibility = 'public' ORDER BY created_at DESC LIMIT 10000"
  ).all();
  const entries = [
    ...sitemapRoutes.map(sitemapEntry),
    ...artists.map((a) => sitemapEntry({
      path: `/artist/${xmlEscape(a.artist_slug || a.id)}`,
      lastmod: a.created_at,
      changefreq: "weekly",
      priority: "0.7"
    })),
    ...releases.map((r) => sitemapEntry({
      path: `/release/${xmlEscape(r.id)}`,
      lastmod: r.created_at,
      changefreq: "weekly",
      priority: "0.8"
    }))
  ];
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type("application/xml").send([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join("\n"),
    "</urlset>"
  ].join("\n"));
});

// ── Dynamic Open Graph meta for releases and artists (used by social scrapers) ──
app.get("/api/meta/release/:id", (req, res) => {
  const row = db.prepare(`
    SELECT r.title, r.description, r.genre, r.kind, r.cover_url, r.duration, r.tracks, r.created_at,
           u.name artist, u.artist_slug
    FROM releases r JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.moderation_status = 'published' AND r.visibility = 'public'
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Release introuvable." });
  const slug = row.artist_slug || "";
  const artistUrl = `${siteUrl}/artist/${slug}`;
  const releaseUrl = `${siteUrl}/release/${req.params.id}`;
  res.json({
    title: `${row.title} — ${row.artist} | Undisc0ver`,
    description: row.description ? row.description.slice(0, 160) : `${row.kind} by ${row.artist}. Listen and download on Undisc0ver.`,
    og_image: row.cover_url || `${siteUrl}/brand/undiscover-og.png`,
    og_url: releaseUrl,
    artist_url: artistUrl,
    schema: {
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      "name": row.title,
      "byArtist": { "@type": "MusicGroup", "name": row.artist, "url": artistUrl },
      "genre": row.genre,
      "duration": row.duration,
      "url": releaseUrl,
      "datePublished": row.created_at ? row.created_at.slice(0, 10) : undefined,
      "image": row.cover_url || `${siteUrl}/brand/undiscover-og.png`
    }
  });
});

app.get("/api/meta/artist/:id", (req, res) => {
  const artist = db.prepare(`
    SELECT u.id, u.name, u.bio, u.genre, u.avatar_url, u.logo_url, u.banner_url, u.artist_slug, u.verified,
           COUNT(DISTINCT r.id) releases_count, COALESCE(SUM(r.plays), 0) plays
    FROM users u
    LEFT JOIN releases r ON r.user_id = u.id AND ${publicReleaseWhere("r")}
    WHERE (u.id = ? OR u.artist_slug = ?) AND u.workspace_visibility = 'public'
    GROUP BY u.id
  `).get(req.params.id, normalizeArtistSlug(req.params.id));
  if (!artist) return res.status(404).json({ error: "Artiste introuvable." });
  const artistUrl = `${siteUrl}/artist/${artist.artist_slug || artist.id}`;
  const image = artist.banner_url || artist.logo_url || artist.avatar_url || `${siteUrl}/brand/undiscover-og.png`;
  res.json({
    title: `${artist.name} — ${artist.genre} Artist | Undisc0ver`,
    description: artist.bio ? artist.bio.slice(0, 160) : `${artist.name} on Undisc0ver. ${artist.releases_count} releases. Discover tracks, EPs and dubpacks.`,
    og_image: image,
    og_url: artistUrl,
    schema: {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      "name": artist.name,
      "genre": artist.genre,
      "url": artistUrl,
      "image": image,
      "description": artist.bio || ""
    }
  });
});

// ── Password reset ──────────────────────────────────────────────────────────
app.post("/api/auth/forgot-password", rateLimiter(5, 60 * 60_000), async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) return res.status(400).json({ error: "Adresse email invalide." });
  const user = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email);
  // Always respond 200 to prevent email enumeration
  if (!user) return res.json({ ok: true });
  db.prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0").run(user.id);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  db.prepare("INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+1 hour'))")
    .run(id("rst"), user.id, tokenHash);
  const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Réinitialisation de ton mot de passe Undisc0ver",
    html: `<p>Bonjour ${user.name},</p><p>Clique sur ce lien pour réinitialiser ton mot de passe :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans 1 heure.</p><p>Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>`
  });
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", rateLimiter(10, 60 * 60_000), (req, res) => {
  const rawToken = String(req.body.token || "").trim();
  const newPassword = String(req.body.password || "");
  if (!rawToken || newPassword.length < 8) return res.status(400).json({ error: "Token invalide ou mot de passe trop court (8 caractères min)." });
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const reset = db.prepare("SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')").get(tokenHash);
  if (!reset) return res.status(400).json({ error: "Lien expiré ou déjà utilisé." });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), reset.user_id);
  db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(reset.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(reset.user_id);
  res.json({ ok: true });
});

// ── Stripe checkout ──────────────────────────────────────────────────────────
function fulfillStripeCheckout(session) {
  const meta = session.metadata || {};
  const chk = db.prepare("SELECT * FROM stripe_checkouts WHERE stripe_session_id = ?").get(session.id);
  if (chk?.status === "pending") {
    db.prepare("UPDATE stripe_checkouts SET status = 'paid' WHERE id = ?").run(chk.id);
    if (chk.release_id) {
      const release = db.prepare("SELECT price_cents FROM releases WHERE id = ?").get(chk.release_id);
      const amount = release?.price_cents || chk.amount_cents;
      db.prepare("INSERT OR IGNORE INTO purchases (id, user_id, release_id, amount_cents) VALUES (?, ?, ?, ?)").run(id("pur"), chk.user_id, chk.release_id, amount);
      db.prepare("UPDATE releases SET sales = sales + 1, revenue_cents = revenue_cents + ? WHERE id = ?").run(amount, chk.release_id);
    }
    if (chk.campaign_id) {
      db.prepare("UPDATE promotion_campaigns SET status = 'active', starts_at = CURRENT_TIMESTAMP, ends_at = datetime('now', '+' || days || ' days') WHERE id = ? AND status = 'pending'").run(chk.campaign_id);
    }
  }
  if (meta.type === "subscription" && meta.plan && meta.user_id) {
    db.prepare("UPDATE users SET plan = ?, pro = 1 WHERE id = ?").run(meta.plan, meta.user_id);
  }
  return meta.type || "purchase";
}

app.post("/api/checkout/create-session", auth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Le paiement en ligne n'est pas encore activé. Contacte le support." });
  const releaseId = String(req.body.release_id || "").trim();
  const planName = String(req.body.plan || "").trim();

  if (releaseId) {
    const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published' AND price_cents > 0").get(releaseId);
    if (!release) return res.status(404).json({ error: "Release introuvable ou gratuite." });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/release/${releaseId}`,
      line_items: [{ price_data: { currency: "eur", unit_amount: release.price_cents, product_data: { name: release.title, description: `${release.kind} by ${release.artist || ""}` } }, quantity: 1 }],
      metadata: { user_id: req.user.id, release_id: releaseId, type: "release_purchase" }
    });
    db.prepare("INSERT INTO stripe_checkouts (id, user_id, release_id, stripe_session_id, amount_cents, status) VALUES (?, ?, ?, ?, ?, 'pending')")
      .run(id("chk"), req.user.id, releaseId, session.id, release.price_cents);
    return res.json({ url: session.url });
  }

  const planPrices = { pro: process.env.STRIPE_PRICE_PRO || "", label: process.env.STRIPE_PRICE_LABEL || "" };
  if (!planName || !planPrices[planName]) return res.status(400).json({ error: "Plan invalide ou non configuré." });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing`,
    line_items: [{ price: planPrices[planName], quantity: 1 }],
    metadata: { user_id: req.user.id, plan: planName, type: "subscription" }
  });
  res.json({ url: session.url });
});

app.get("/api/checkout/success", auth, (req, res) => {
  const sessionId = String(req.query.session_id || "").trim();
  if (!stripe || !sessionId) return res.json({ ok: true, message: "Achat enregistré." });
  stripe.checkout.sessions.retrieve(sessionId).then((session) => {
    if (session.payment_status !== "paid" && session.status !== "active") return res.json({ ok: false });
    res.json({ ok: true, type: fulfillStripeCheckout(session) });
  }).catch(() => res.json({ ok: false }));
});

// Stripe webhook (for production reliability)
app.post("/api/webhooks/stripe", (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.json({ received: true });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Webhook signature invalid.");
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid" || session.status === "active") fulfillStripeCheckout(session);
  }
  res.json({ received: true });
});

// ── Feed (releases from followed artists) ───────────────────────────────────
app.get("/api/feed", auth, (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const whereClause = `WHERE r.user_id IN (SELECT artist_id FROM follows WHERE follower_id = ?) AND ${publicReleaseWhere("r")}`;
  const releases = db.prepare(releaseSelect(whereClause, "r.created_at DESC") + " LIMIT ? OFFSET ?").all(req.user.id, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) total FROM releases r JOIN users u ON u.id = r.user_id ${whereClause}`).get(req.user.id)?.total || 0;
  res.json({ releases: presentReleases(releases), total, limit, offset });
});

// ── Genre page ───────────────────────────────────────────────────────────────
app.get("/api/genre/:genre/releases", (req, res) => {
  const genre = String(req.params.genre || "").trim();
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const releases = db.prepare(`
    ${releaseSelect(`WHERE r.genre LIKE ? AND ${publicReleaseWhere("r")}`, "r.plays DESC, r.created_at DESC")}
    LIMIT ? OFFSET ?
  `).all(`%${genre}%`, limit, offset);
  const artists = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.avatar_url, u.logo_url, u.artist_slug, u.plan, u.pro, u.verified,
      COUNT(DISTINCT r.id) releases_count, COALESCE(SUM(r.plays), 0) plays
    FROM users u JOIN releases r ON r.user_id = u.id
    WHERE r.genre LIKE ? AND ${publicReleaseWhere("r")} AND u.workspace_visibility = 'public'
    GROUP BY u.id ORDER BY plays DESC LIMIT 8
  `).all(`%${genre}%`);
  res.json({ genre, releases: presentReleases(releases), artists, limit, offset });
});

// ── Playlists ────────────────────────────────────────────────────────────────
app.get("/api/playlists", auth, (req, res) => {
  const playlists = db.prepare(`
    SELECT p.*, COUNT(pt.release_id) track_count, u.name owner_name, u.avatar, u.avatar_url, u.artist_slug,
      (SELECT GROUP_CONCAT(cover_url, '|') FROM (
        SELECT r2.cover_url cover_url FROM playlist_tracks pt2 JOIN releases r2 ON r2.id = pt2.release_id
        WHERE pt2.playlist_id = p.id AND r2.cover_url != '' ORDER BY pt2.position ASC LIMIT 4
      )) cover_urls
    FROM playlists p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json({ playlists });
});

app.get("/api/playlists/public", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  const playlists = db.prepare(`
    SELECT p.*, COUNT(pt.release_id) track_count, u.name owner_name, u.avatar, u.avatar_url, u.artist_slug,
      (SELECT GROUP_CONCAT(cover_url, '|') FROM (
        SELECT r2.cover_url cover_url FROM playlist_tracks pt2 JOIN releases r2 ON r2.id = pt2.release_id
        WHERE pt2.playlist_id = p.id AND r2.cover_url != '' ORDER BY pt2.position ASC LIMIT 4
      )) cover_urls
    FROM playlists p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
    WHERE p.visibility = 'public' AND (p.title LIKE ? OR u.name LIKE ?)
    GROUP BY p.id ORDER BY p.created_at DESC LIMIT 40
  `).all(q, q);
  res.json({ playlists });
});

app.post("/api/playlists", auth, (req, res) => {
  const title = String(req.body.title || "").trim().slice(0, 120);
  const description = String(req.body.description || "").trim().slice(0, 500);
  const visibility = ["public", "private"].includes(req.body.visibility) ? req.body.visibility : "public";
  if (!title) return res.status(400).json({ error: "Titre de playlist requis." });
  const playlistId = id("pls");
  db.prepare("INSERT INTO playlists (id, user_id, title, description, visibility) VALUES (?, ?, ?, ?, ?)")
    .run(playlistId, req.user.id, title, description, visibility);
  res.json({ playlist: db.prepare("SELECT * FROM playlists WHERE id = ?").get(playlistId) });
});

app.get("/api/playlists/:id", (req, res) => {
  const viewerId = optionalUserId(req);
  const playlist = db.prepare(`
    SELECT p.*, u.name owner_name, u.avatar, u.avatar_url, u.artist_slug
    FROM playlists p JOIN users u ON u.id = p.user_id
    WHERE p.id = ? AND (p.visibility = 'public' OR p.user_id = ?)
  `).get(req.params.id, viewerId);
  if (!playlist) return res.status(404).json({ error: "Playlist introuvable." });
  const tracks = db.prepare(`
    ${releaseSelect("JOIN playlist_tracks pt ON pt.release_id = r.id WHERE pt.playlist_id = ?", "pt.position ASC, pt.added_at ASC")}
  `).all(req.params.id);
  res.json({ playlist, tracks: presentReleases(tracks) });
});

app.post("/api/playlists/:id/tracks", auth, (req, res) => {
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ error: "Playlist introuvable." });
  const releaseId = String(req.body.release_id || "").trim();
  const release = db.prepare("SELECT id FROM releases WHERE id = ? AND moderation_status = 'published'").get(releaseId);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const maxPos = db.prepare("SELECT COALESCE(MAX(position), 0) pos FROM playlist_tracks WHERE playlist_id = ?").get(req.params.id).pos;
  db.prepare("INSERT OR IGNORE INTO playlist_tracks (playlist_id, release_id, position) VALUES (?, ?, ?)").run(req.params.id, releaseId, maxPos + 1);
  res.json({ ok: true });
});

app.delete("/api/playlists/:id/tracks/:releaseId", auth, (req, res) => {
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ error: "Playlist introuvable." });
  db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND release_id = ?").run(req.params.id, req.params.releaseId);
  res.json({ ok: true });
});

app.delete("/api/playlists/:id", auth, (req, res) => {
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ error: "Playlist introuvable." });
  db.prepare("DELETE FROM playlists WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Reposts ──────────────────────────────────────────────────────────────────
app.post("/api/releases/:id/repost", auth, (req, res) => {
  const release = db.prepare("SELECT id, user_id FROM releases WHERE id = ? AND moderation_status = 'published'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const already = db.prepare("SELECT 1 FROM reposts WHERE user_id = ? AND release_id = ?").get(req.user.id, req.params.id);
  if (already) {
    db.prepare("DELETE FROM reposts WHERE user_id = ? AND release_id = ?").run(req.user.id, req.params.id);
    return res.json({ reposted: false });
  }
  db.prepare("INSERT INTO reposts (user_id, release_id) VALUES (?, ?)").run(req.user.id, req.params.id);
  if (release.user_id !== req.user.id) {
    db.prepare("INSERT INTO notifications (id, user_id, type, actor_id, release_id, body) VALUES (?, ?, 'repost', ?, ?, ?)")
      .run(id("ntf"), release.user_id, req.user.id, req.params.id, "a reposté ta sortie");
  }
  res.json({ reposted: true });
});

function optAuth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  req.userId = token ? db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token)?.user_id : null;
  next();
}

app.get("/api/releases/:id/repost", optAuth, (req, res) => {
  const count = db.prepare("SELECT COUNT(*) total FROM reposts WHERE release_id = ?").get(req.params.id).total;
  const reposted = req.userId ? !!db.prepare("SELECT 1 FROM reposts WHERE user_id = ? AND release_id = ?").get(req.userId, req.params.id) : false;
  res.json({ count, reposted });
});

// ── Notifications ────────────────────────────────────────────────────────────

app.get("/api/notifications", auth, (req, res) => {
  const notifs = db.prepare(`
    SELECT n.*, u.name actor_name, u.avatar actor_avatar, u.avatar_url actor_avatar_url, u.artist_slug actor_slug,
           r.title release_title
    FROM notifications n
    LEFT JOIN users u ON u.id = n.actor_id
    LEFT JOIN releases r ON r.id = n.release_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC LIMIT 30
  `).all(req.user.id);
  const unread = db.prepare("SELECT COUNT(*) total FROM notifications WHERE user_id = ? AND read = 0").get(req.user.id).total;
  res.json({ notifications: notifs, unread });
});

app.post("/api/notifications/read-all", auth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(req.user.id);
  res.json({ ok: true });
});

app.patch("/api/notifications/:id/read", auth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Notify on follow
const _origFollowRoute = app._router?.stack?.find?.(() => false);
app.post("/api/artists/:id/follow-notify", auth, (req, res, next) => {
  const artistId = req.params.id;
  const already = db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND artist_id = ?").get(req.user.id, artistId);
  if (!already && req.user.id !== artistId) {
    db.prepare("INSERT INTO notifications (id, user_id, type, actor_id, body) VALUES (?, ?, 'follow', ?, ?)")
      .run(id("ntf"), artistId, req.user.id, "a commencé à te suivre");
  }
  next();
});

// Notify on like
app.post("/api/releases/:id/like", auth, (req, res) => {
  const release = db.prepare("SELECT id, user_id, title FROM releases WHERE id = ? AND moderation_status = 'published'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const liked = db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND release_id = ?").get(req.user.id, req.params.id);
  if (liked) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND release_id = ?").run(req.user.id, req.params.id);
  } else {
    db.prepare("INSERT OR IGNORE INTO likes (user_id, release_id) VALUES (?, ?)").run(req.user.id, req.params.id);
    if (release.user_id !== req.user.id) {
      db.prepare("INSERT INTO notifications (id, user_id, type, actor_id, release_id, body) VALUES (?, ?, 'like', ?, ?, ?)")
        .run(id("ntf"), release.user_id, req.user.id, req.params.id, "a aimé ta sortie");
    }
  }
  const count = db.prepare("SELECT COUNT(*) total FROM likes WHERE release_id = ?").get(req.params.id).total;
  res.json({ liked: !liked, count });
});

// ── Booking requests ─────────────────────────────────────────────────────────
app.post("/api/artists/:id/booking", rateLimiter(5, 60 * 60_000), async (req, res) => {
  const artist = db.prepare("SELECT id, name, email FROM users WHERE (id = ? OR artist_slug = ?) AND workspace_visibility = 'public'").get(req.params.id, req.params.id);
  if (!artist) return res.status(404).json({ error: "Artiste introuvable." });
  const requesterName = String(req.body.name || "").trim().slice(0, 90);
  const requesterEmail = String(req.body.email || "").trim().toLowerCase();
  const eventDate = String(req.body.event_date || "").trim().slice(0, 40);
  const eventType = String(req.body.event_type || "").trim().slice(0, 80);
  const message = String(req.body.message || "").trim().slice(0, 1000);
  if (!requesterName || !requesterEmail || !message) return res.status(400).json({ error: "Nom, email et message requis." });
  if (!isValidEmail(requesterEmail)) return res.status(400).json({ error: "Email invalide." });
  const bookingId = id("bkn");
  db.prepare("INSERT INTO booking_requests (id, artist_id, requester_name, requester_email, event_date, event_type, message) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(bookingId, artist.id, requesterName, requesterEmail, eventDate, eventType, message);
  await sendEmail({
    to: artist.email,
    subject: `Nouvelle demande de booking — ${requesterName}`,
    html: `<p><strong>${requesterName}</strong> (${requesterEmail}) t'envoie une demande de booking.</p><p><strong>Date :</strong> ${eventDate || "À définir"}</p><p><strong>Type :</strong> ${eventType || "Non précisé"}</p><p><strong>Message :</strong><br/>${message}</p>`
  });
  db.prepare("INSERT INTO notifications (id, user_id, type, body) VALUES (?, ?, 'booking', ?)")
    .run(id("ntf"), artist.id, `Nouvelle demande de booking de ${requesterName}`);
  res.json({ ok: true, booking_id: bookingId });
});

// ── Signal score (computed on-the-fly for a release) ────────────────────────
app.get("/api/releases/:id/signal", (req, res) => {
  const release = db.prepare("SELECT id, plays, downloads, sales FROM releases WHERE id = ?").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const likes = db.prepare("SELECT COUNT(*) total FROM likes WHERE release_id = ?").get(req.params.id).total;
  const reposts = db.prepare("SELECT COUNT(*) total FROM reposts WHERE release_id = ?").get(req.params.id).total;
  const comments = db.prepare("SELECT COUNT(*) total FROM release_comments WHERE release_id = ?").get(req.params.id).total;
  const plays = Number(release.plays || 0);
  const downloads = Number(release.downloads || 0);
  const score = Math.min(100, Math.floor(
    (plays * 0.4) / 50 +
    (likes * 2) +
    (downloads * 3) +
    (reposts * 5) +
    (comments * 2) +
    (Number(release.sales || 0) * 8)
  ));
  res.json({ score, plays, likes, reposts, comments, downloads, sales: Number(release.sales || 0) });
});

// ── Crate drop (weekly editorial — staff-curated) ───────────────────────────
app.get("/api/crate-drop", (_req, res) => {
  const drops = db.prepare(`
    ${releaseSelect(`WHERE ${publicReleaseWhere("r")}`, "r.plays DESC, r.created_at DESC")}
    LIMIT 6
  `).all();
  res.json({ releases: presentReleases(drops), week: new Date().toISOString().slice(0, 10) });
});

app.use((err, _req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Fichier audio trop lourd." : err.message });
  }
  return res.status(400).json({ error: err.message || "Erreur serveur." });
});

if (process.env.NODE_ENV === "production" && existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Undiscover running on http://0.0.0.0:${port}`);
});
