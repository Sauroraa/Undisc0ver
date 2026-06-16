import express from "express";
import multer from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, hashPassword, id, initDb, publicUser, verifyPassword } from "./db.js";

initDb();

const app = express();
app.use(express.json({ limit: "1mb" }));

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

function cents(value) {
  return Number.parseInt(value, 10) || 0;
}

const scanConfig = {
  provider: process.env.COPYRIGHT_SCAN_PROVIDER || (process.env.NODE_ENV === "production" ? "off" : "local"),
  takedownEmail: process.env.COPYRIGHT_TAKEDOWN_EMAIL || "copyright@undisc0ver.com",
  blockThreshold: Number(process.env.COPYRIGHT_BLOCK_THRESHOLD || 80),
  reviewThreshold: Number(process.env.COPYRIGHT_REVIEW_THRESHOLD || 45)
};

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
      : "No match returned by the configured provider."
  };
}

function moderationFromScan(scan) {
  if (scan.status === "blocked" || scan.score >= scanConfig.blockThreshold) return "blocked";
  if (scan.status === "review" || scan.score >= scanConfig.reviewThreshold) return "review";
  return "published";
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentification requise." });
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token);
  if (!session) return res.status(401).json({ error: "Session invalide." });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
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

function releaseSelect(where = "", order = "r.plays DESC") {
  return `
    SELECT r.*, u.name artist, u.avatar, u.verified, u.pro,
      (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) likes,
      (SELECT COUNT(*) FROM follows f WHERE f.artist_id = u.id) followers
    FROM releases r
    JOIN users u ON u.id = r.user_id
    ${where}
    ORDER BY ${order}
  `;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/copyright/config", (_req, res) => {
  res.json({
    provider: scanConfig.provider,
    takedown_email: scanConfig.takedownEmail,
    block_threshold: scanConfig.blockThreshold,
    review_threshold: scanConfig.reviewThreshold
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, genre = "Tech House" } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Nom, email et mot de passe sont requis." });
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const userId = id("usr");
  try {
    db.prepare("INSERT INTO users (id, name, email, password_hash, avatar, genre, bio) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(userId, name, email.toLowerCase(), hashPassword(password), initials || "U0", genre, "Nouvel artiste Undiscover.");
    const token = id("tok");
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
    res.json({ token, user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) });
  } catch {
    res.status(409).json({ error: "Cet email existe deja." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase());
  if (!user || !verifyPassword(password || "", user.password_hash)) return res.status(401).json({ error: "Identifiants invalides." });
  const token = id("tok");
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.get("/api/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post("/api/auth/logout", auth, (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.json({ ok: true });
});

app.use("/uploads", express.static(uploadDir, {
  fallthrough: false,
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
}));

app.post("/api/uploads/audio", auth, audioUpload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier audio requis." });
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
  const rows = genre && genre !== "All"
    ? db.prepare(releaseSelect("WHERE (r.title LIKE ? OR u.name LIKE ?) AND r.genre = ? AND r.moderation_status = 'published'")).all(q, q, genre)
    : db.prepare(releaseSelect("WHERE (r.title LIKE ? OR u.name LIKE ?) AND r.moderation_status = 'published'")).all(q, q);
  res.json({ releases: rows });
});

app.get("/api/releases/:id", (req, res) => {
  const row = db.prepare(releaseSelect("WHERE r.id = ? AND r.moderation_status = 'published'", "r.created_at DESC")).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Release introuvable." });
  res.json({ release: row });
});

function normalizeGateActions(actions = []) {
  const allowed = ["like", "follow", "share", "comment"];
  const list = Array.isArray(actions)
    ? actions
    : String(actions || "").split(",");
  return [...new Set(list.map((action) => String(action).trim().toLowerCase()).filter((action) => allowed.includes(action)))];
}

app.post("/api/releases", auth, (req, res) => {
  const { title, kind, genre, tracks, duration, price, free, gate, gate_actions = [], description, rights_confirmed, rights_owner, download_enabled = true, audio_url = "", audio_file_name = "", audio_mime = "", audio_size = 0 } = req.body;
  if (!title || !kind || !genre) return res.status(400).json({ error: "Titre, type et genre sont requis." });
  if (!audio_url) return res.status(400).json({ error: "Upload audio requis avant publication." });
  if (!rights_confirmed) return res.status(400).json({ error: "Confirmation des droits requise avant publication." });
  if (!String(rights_owner || "").trim()) return res.status(400).json({ error: "Indique le titulaire des droits ou la licence utilisee." });
  const releaseId = id("rel");
  const normalizedGateActions = download_enabled ? normalizeGateActions(gate_actions) : [];
  const gateLabel = normalizedGateActions.length
    ? normalizedGateActions.map((action) => `${action} required`).join(", ")
    : download_enabled ? "No gate" : "Downloads disabled";
  const scan = scanCopyright({ title, artist: req.user.name, description });
  const moderationStatus = moderationFromScan(scan);
  db.prepare(`INSERT INTO releases (id, user_id, title, kind, genre, tracks, duration, price_cents, free, gate, gate_actions, description, color, download_enabled,
      rights_confirmed, rights_owner, scan_status, scan_provider, scan_score, scan_match_title, scan_notes, moderation_status, audio_url, audio_file_name, audio_mime, audio_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
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
      String(rights_owner).trim(),
      scan.status,
      scan.provider,
      scan.score,
      scan.match_title,
      scan.notes,
      moderationStatus,
      String(audio_url),
      String(audio_file_name || ""),
      String(audio_mime || ""),
      Number(audio_size) || 0
    );
  db.prepare("INSERT INTO copyright_scans (id, release_id, provider, status, score, match_title, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id("scan"), releaseId, scan.provider, scan.status, scan.score, scan.match_title, JSON.stringify(scan));
  const release = db.prepare(releaseSelect("WHERE r.id = ?", "r.created_at DESC")).get(releaseId);
  res.json({ release, scan });
});

app.post("/api/releases/:id/report", (req, res) => {
  const release = db.prepare("SELECT id FROM releases WHERE id = ? AND moderation_status != 'removed'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const { reporter_name, reporter_email, rights_owner, reason, evidence_url = "" } = req.body;
  if (!reporter_name || !reporter_email || !rights_owner || !reason) {
    return res.status(400).json({ error: "Nom, email, titulaire des droits et motif sont requis." });
  }
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
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const required = requiredGateActions(release);
  const done = db.prepare("SELECT action FROM release_gate_actions WHERE user_id = ? AND release_id = ?").all(req.user.id, req.params.id).map((row) => row.action);
  res.json({ download_enabled: !!release.download_enabled, required, done, unlocked: required.every((action) => done.includes(action)) });
});

app.post("/api/releases/:id/gate-action", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published'").get(req.params.id);
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
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published'").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  if (!release.download_enabled) return res.status(403).json({ error: "Le telechargement est desactive pour cette release." });
  const required = requiredGateActions(release);
  const done = db.prepare("SELECT action FROM release_gate_actions WHERE user_id = ? AND release_id = ?").all(req.user.id, req.params.id).map((row) => row.action);
  const missing = required.filter((action) => !done.includes(action));
  if (missing.length) return res.status(403).json({ error: "Complete les actions du download gate avant de telecharger.", missing });
  db.prepare("UPDATE releases SET downloads = downloads + 1 WHERE id = ?").run(req.params.id);
  const row = db.prepare("SELECT downloads FROM releases WHERE id = ?").get(req.params.id);
  res.json({ downloads: row.downloads, url: release.audio_url, file_name: release.audio_file_name || `${release.title}.wav` });
});

app.post("/api/releases/:id/buy", auth, (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ?").get(req.params.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const amount = release.price_cents || 0;
  db.prepare("INSERT INTO purchases (id, user_id, release_id, amount_cents) VALUES (?, ?, ?, ?)").run(id("pur"), req.user.id, req.params.id, amount);
  db.prepare("UPDATE releases SET sales = sales + 1, revenue_cents = revenue_cents + ? WHERE id = ?").run(amount, req.params.id);
  res.json({ ok: true, amount_cents: amount });
});

app.get("/api/artists", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  const rows = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.genre, u.location, u.bio, u.verified, u.pro,
      COUNT(DISTINCT r.id) releases,
      COALESCE(SUM(r.plays), 0) plays,
      COUNT(DISTINCT f.follower_id) followers
    FROM users u
    LEFT JOIN releases r ON r.user_id = u.id AND r.moderation_status = 'published'
    LEFT JOIN follows f ON f.artist_id = u.id
    WHERE u.name LIKE ? OR u.genre LIKE ?
    GROUP BY u.id
    ORDER BY plays DESC
  `).all(q, q);
  res.json({ artists: rows });
});

app.get("/api/artists/:id", (req, res) => {
  const artist = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.genre, u.location, u.bio, u.verified, u.pro,
      COUNT(DISTINCT r.id) releases_count,
      COALESCE(SUM(r.plays), 0) plays,
      COUNT(DISTINCT f.follower_id) followers
    FROM users u
    LEFT JOIN releases r ON r.user_id = u.id AND r.moderation_status = 'published'
    LEFT JOIN follows f ON f.artist_id = u.id
    WHERE u.id = ?
    GROUP BY u.id
  `).get(req.params.id);
  if (!artist) return res.status(404).json({ error: "Artiste introuvable." });
  const releases = db.prepare(releaseSelect("WHERE r.user_id = ? AND r.moderation_status = 'published'", "r.created_at DESC")).all(req.params.id);
  res.json({ artist, releases });
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
      COALESCE(SUM(downloads), 0) downloads, COUNT(*) releases
    FROM releases WHERE user_id = ? AND moderation_status != 'removed'
  `).get(req.user.id);
  const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.user.id).total;
  const releases = db.prepare(releaseSelect("WHERE r.user_id = ? AND r.moderation_status != 'removed'", "r.created_at DESC")).all(req.user.id);
  res.json({ stats: { ...stats, followers }, releases });
});

app.post("/api/support/tickets", (req, res) => {
  const { name, email, topic, message } = req.body;
  if (!name || !email || !topic || !message) return res.status(400).json({ error: "Nom, email, sujet et message requis." });
  const userId = req.headers.authorization ? db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(req.headers.authorization.replace("Bearer ", ""))?.user_id : null;
  const ticketId = id("sup");
  db.prepare("INSERT INTO support_tickets (id, user_id, name, email, topic, message) VALUES (?, ?, ?, ?, ?, ?)")
    .run(ticketId, userId || null, name, email, topic, message);
  res.json({ ok: true, ticket: { id: ticketId, status: "open" } });
});

app.get("/api/staff/overview", staffAuth, (_req, res) => {
  const users = db.prepare("SELECT id, name, email, avatar, role, verified, pro, created_at FROM users ORDER BY created_at DESC").all();
  const releases = db.prepare(releaseSelect("WHERE r.moderation_status != 'removed'", "r.created_at DESC")).all();
  const tickets = db.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all();
  const reports = db.prepare("SELECT tr.*, r.title release_title FROM takedown_reports tr JOIN releases r ON r.id = tr.release_id ORDER BY tr.created_at DESC").all();
  res.json({ users, releases, tickets, reports });
});

app.post("/api/staff/users/:id/role", staffAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Role admin requis." });
  const role = String(req.body.role || "user").toLowerCase();
  if (!["user", "staff", "moderator", "admin"].includes(role)) return res.status(400).json({ error: "Role invalide." });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json({ ok: true, role });
});

app.post("/api/staff/releases/:id/moderate", staffAuth, (req, res) => {
  const status = String(req.body.status || "published").toLowerCase();
  if (!["published", "review", "blocked", "removed"].includes(status)) return res.status(400).json({ error: "Statut invalide." });
  db.prepare("UPDATE releases SET moderation_status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true, status });
});

app.post("/api/staff/tickets/:id/status", staffAuth, (req, res) => {
  const status = String(req.body.status || "open").toLowerCase();
  if (!["open", "pending", "closed"].includes(status)) return res.status(400).json({ error: "Statut invalide." });
  db.prepare("UPDATE support_tickets SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true, status });
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
