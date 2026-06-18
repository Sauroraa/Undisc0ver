import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, pbkdf2Sync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SQLITE_DB_PATH ? resolve(process.env.SQLITE_DB_PATH) : join(__dirname, "undiscover.db");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

const DEMO_USER_IDS = ["usr_kalden", "usr_nala", "usr_mosser"];
const DEMO_RELEASE_IDS = ["rel_midnight", "rel_afterhours", "rel_summer", "rel_shift", "rel_technoids", "rel_dust", "rel_afro"];

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function id(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return test === hash;
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Tech House',
      location TEXT NOT NULL DEFAULT 'Paris, FR',
      bio TEXT NOT NULL DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0,
      pro INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      genre TEXT NOT NULL,
      tracks INTEGER NOT NULL,
      duration TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      free INTEGER NOT NULL DEFAULT 0,
      gate TEXT NOT NULL DEFAULT 'None',
      description TEXT NOT NULL DEFAULT '',
      plays INTEGER NOT NULL DEFAULT 0,
      downloads INTEGER NOT NULL DEFAULT 0,
      sales INTEGER NOT NULL DEFAULT 0,
      revenue_cents INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'green',
      download_enabled INTEGER NOT NULL DEFAULT 1,
      gate_actions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, artist_id)
    );
    CREATE TABLE IF NOT EXISTS likes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, release_id)
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS copyright_scans (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      match_title TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS takedown_reports (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      reporter_name TEXT NOT NULL,
      reporter_email TEXT NOT NULL,
      rights_owner TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS release_gate_actions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, release_id, action)
    );
    CREATE TABLE IF NOT EXISTS release_comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      topic TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      assignee_role TEXT NOT NULL DEFAULT 'Staff',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS short_links (
      code TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS testimonials (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      quote TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      visible INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS release_listens (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS promotion_campaigns (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      release_id TEXT REFERENCES releases(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      spot TEXT NOT NULL,
      daily_budget_cents INTEGER NOT NULL,
      days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS career_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      experience TEXT NOT NULL,
      links TEXT NOT NULL DEFAULT '',
      availability TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
  const addUserColumn = (name, definition) => {
    if (!userColumns.includes(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
  };
  addUserColumn("role", "TEXT NOT NULL DEFAULT 'user'");
  addUserColumn("google_id", "TEXT NOT NULL DEFAULT ''");
  addUserColumn("avatar_url", "TEXT NOT NULL DEFAULT ''");
  addUserColumn("auth_provider", "TEXT NOT NULL DEFAULT 'password'");
  addUserColumn("logo_url", "TEXT NOT NULL DEFAULT ''");
  addUserColumn("banner_url", "TEXT NOT NULL DEFAULT ''");
  addUserColumn("social_links", "TEXT NOT NULL DEFAULT '{}'");
  addUserColumn("workspace_visibility", "TEXT NOT NULL DEFAULT 'public'");
  addUserColumn("artist_slug", "TEXT NOT NULL DEFAULT ''");
  addUserColumn("plan", "TEXT NOT NULL DEFAULT 'free'");
  db.exec("UPDATE users SET plan = 'free' WHERE plan = 'creator'");
  db.exec("UPDATE users SET plan = 'pro' WHERE pro = 1 AND plan = 'free'");

  const releaseColumns = db.prepare("PRAGMA table_info(releases)").all().map((column) => column.name);
  const addReleaseColumn = (name, definition) => {
    if (!releaseColumns.includes(name)) db.exec(`ALTER TABLE releases ADD COLUMN ${name} ${definition}`);
  };
  addReleaseColumn("download_enabled", "INTEGER NOT NULL DEFAULT 1");
  addReleaseColumn("gate_actions", "TEXT NOT NULL DEFAULT '[]'");
  addReleaseColumn("rights_confirmed", "INTEGER NOT NULL DEFAULT 1");
  addReleaseColumn("rights_owner", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("scan_status", "TEXT NOT NULL DEFAULT 'clear'");
  addReleaseColumn("scan_provider", "TEXT NOT NULL DEFAULT 'local'");
  addReleaseColumn("scan_score", "INTEGER NOT NULL DEFAULT 0");
  addReleaseColumn("scan_match_title", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("scan_notes", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("moderation_status", "TEXT NOT NULL DEFAULT 'published'");
  addReleaseColumn("takedown_count", "INTEGER NOT NULL DEFAULT 0");
  addReleaseColumn("audio_url", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("audio_file_name", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("audio_mime", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("audio_size", "INTEGER NOT NULL DEFAULT 0");
  addReleaseColumn("track_files", "TEXT NOT NULL DEFAULT '[]'");
  addReleaseColumn("cover_url", "TEXT NOT NULL DEFAULT ''");
  addReleaseColumn("visibility", "TEXT NOT NULL DEFAULT 'public'");

  const isProduction = process.env.NODE_ENV === "production";
  const seedDemoData = envFlag("SEED_DEMO_DATA", !isProduction);
  const purgeDemoData = envFlag("PURGE_DEMO_DATA", isProduction && !seedDemoData);

  if (purgeDemoData) removeDemoData();
  ensureBootstrapAdmin();

  if (!seedDemoData) return;

  seedDemoDataSet();
}

function ensureBootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "").trim();
  const name = String(process.env.ADMIN_NAME || "Undiscover Admin").trim();
  if (!email || !password) return;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', verified = 1, pro = 1, plan = 'pro' WHERE id = ?").run(existing.id);
    return;
  }

  db.prepare(`INSERT INTO users (id, name, email, password_hash, avatar, genre, location, bio, verified, pro, role, plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id("usr"), name, email, hashPassword(password), initialsFor(name), "Electronic", "Production", "Platform owner.", 1, 1, "admin", "pro");
}

function initialsFor(name) {
  return String(name || "Undiscover")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "UD";
}

function removeDemoData() {
  const deleteRelease = db.prepare("DELETE FROM releases WHERE id = ?");
  for (const releaseId of DEMO_RELEASE_IDS) deleteRelease.run(releaseId);
  const deleteSession = db.prepare("DELETE FROM sessions WHERE user_id = ?");
  const deleteUser = db.prepare("DELETE FROM users WHERE id = ?");
  for (const userId of DEMO_USER_IDS) {
    deleteSession.run(userId);
    deleteUser.run(userId);
  }
}

function seedDemoDataSet() {
  const existingDemo = db.prepare("SELECT COUNT(*) AS total FROM users WHERE id IN ('usr_kalden', 'usr_nala', 'usr_mosser')").get().total;
  if (existingDemo > 0) return;
  const users = [
    ["usr_kalden", "Kalden Bess", "kalden@undisc0ver.com", "KB", "Tech House", "Paris, FR", "Producteur Tech House base a Paris. Releases sur Tronic, Terminal M et Respekt.", 1, 1],
    ["usr_nala", "Nala", "nala@undisc0ver.com", "NL", "Techno", "Berlin, DE", "Raw drums, club tools and late-night IDs.", 0, 1],
    ["usr_mosser", "Amia Mosser", "amia@undisc0ver.com", "AM", "Melodic", "Lyon, FR", "Melodic producer building warm peak-time edits.", 0, 0]
  ];
  const insertUser = db.prepare("INSERT INTO users (id, name, email, password_hash, avatar, genre, location, bio, verified, pro, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  for (const user of users) {
    const role = user[0] === "usr_kalden" ? "admin" : user[0] === "usr_nala" ? "moderator" : "staff";
    insertUser.run(...user.slice(0, 3), hashPassword("undiscover"), ...user.slice(3), role);
  }

  const releases = [
    ["rel_midnight", "usr_kalden", "Midnight Protocol", "Track", "Tech House", 1, "06:22", 0, 1, "Follow required", "Percussive warehouse groove with tight low-end and clipped vocal shots.", 4231, 1023, 0, 0, "green"],
    ["rel_afterhours", "usr_kalden", "After Hours EP", "EP", "Tech House", 4, "24:10", 1400, 0, "None", "Four functional club tracks built for long room pressure.", 6140, 320, 74, 103600, "green"],
    ["rel_summer", "usr_kalden", "Summer Dub Pack", "Dubpack", "Tech House", 10, "52:00", 1500, 0, "None", "Ten DJ-ready dubs, stems and private versions.", 2311, 94, 31, 46500, "green"],
    ["rel_shift", "usr_nala", "Shift Work VIP", "Track", "Techno", 1, "07:44", 800, 0, "None", "Industrial pressure tool with a sharp 3AM arrangement.", 2810, 102, 36, 28800, "blue"],
    ["rel_technoids", "usr_nala", "Techno IDs Vol.3", "Dubpack", "Techno", 7, "44:00", 1200, 0, "None", "Unreleased warehouse IDs for darker sets.", 1750, 80, 19, 22800, "red"],
    ["rel_dust", "usr_mosser", "Dust & Frequency", "Track", "Melodic", 1, "06:58", 0, 1, "Email required", "A tense melodic cut with glowing signal motifs.", 1900, 640, 0, 0, "red"],
    ["rel_afro", "usr_mosser", "Afro Edits Bundle", "Dubpack", "Afro House", 6, "38:00", 1000, 0, "None", "Warm edit pack with clean intros and extended outros.", 1330, 71, 21, 21000, "blue"]
  ];
  const insertRelease = db.prepare("INSERT INTO releases (id, user_id, title, kind, genre, tracks, duration, price_cents, free, gate, description, plays, downloads, sales, revenue_cents, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  for (const release of releases) insertRelease.run(...release);

  db.prepare("INSERT INTO follows (follower_id, artist_id) VALUES (?, ?)").run("usr_nala", "usr_kalden");
  db.prepare("INSERT INTO follows (follower_id, artist_id) VALUES (?, ?)").run("usr_mosser", "usr_kalden");
  db.prepare("INSERT INTO likes (user_id, release_id) VALUES (?, ?)").run("usr_nala", "rel_midnight");
}

export function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}
