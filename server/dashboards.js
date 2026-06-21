// server/dashboards.js — Role-based dashboard API routes for Undisc0ver
// Each route verifies role server-side. No data leaks across roles.

import { Router } from "express";
import { db } from "./db.js";

export const dashboardsRouter = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────

function requireRole(req, res, roles) {
  if (!req.user) { res.status(401).json({ error: "Authentification requise." }); return false; }
  if (!roles.includes(req.user.role)) { res.status(403).json({ error: "Accès refusé." }); return false; }
  return true;
}

function authMiddleware(req, res, next) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentification requise." });
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND created_at >= datetime('now', '-30 days')").get(token);
  if (!session) return res.status(401).json({ error: "Session expirée." });
  req.user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  if (!req.user) return res.status(401).json({ error: "Compte introuvable." });
  next();
}

// Time-series helper: returns array of {date, value} for last N days
function dailySeries(query, params, days = 30) {
  const rows = db.prepare(query).all(...params);
  const map = Object.fromEntries(rows.map(r => [r.day, r.value]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const day = d.toISOString().slice(0, 10);
    result.push({ date: day, value: map[day] || 0 });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER / ARTIST DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

dashboardsRouter.get("/user", authMiddleware, (req, res) => {
  const userId = req.user.id;

  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(plays), 0) plays,
      COALESCE(SUM(downloads), 0) downloads,
      COALESCE(SUM(sales), 0) sales,
      COALESCE(SUM(revenue_cents), 0) revenue_cents,
      COUNT(*) releases_total,
      SUM(CASE WHEN visibility = 'public' AND moderation_status = 'published' THEN 1 ELSE 0 END) releases_published,
      SUM(CASE WHEN moderation_status = 'draft' THEN 1 ELSE 0 END) releases_draft,
      SUM(CASE WHEN visibility = 'private' THEN 1 ELSE 0 END) releases_private,
      SUM(CASE WHEN moderation_status = 'review' THEN 1 ELSE 0 END) releases_in_review
    FROM releases WHERE user_id = ? AND moderation_status != 'removed'
  `).get(userId);

  const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(userId).total;
  const likes = db.prepare("SELECT COUNT(*) total FROM likes l JOIN releases r ON r.id = l.release_id WHERE r.user_id = ?").get(userId).total;
  const comments = db.prepare("SELECT COUNT(*) total FROM release_comments rc JOIN releases r ON r.id = rc.release_id WHERE r.user_id = ?").get(userId).total;
  const reposts = db.prepare("SELECT COUNT(*) total FROM reposts rp JOIN releases r ON r.id = rp.release_id WHERE r.user_id = ?").get(userId).total || 0;

  const releases = db.prepare(`
    SELECT r.id, r.title, r.kind, r.genre, r.cover_url, r.plays, r.downloads, r.sales, r.revenue_cents,
           r.price_cents, r.free, r.moderation_status, r.visibility, r.created_at,
           (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) likes
    FROM releases r WHERE r.user_id = ? AND r.moderation_status != 'removed'
    ORDER BY r.created_at DESC LIMIT 50
  `).all(userId);

  const purchases = db.prepare(`
    SELECT p.id, p.amount_cents, p.created_at, r.id release_id, r.title, r.kind, r.cover_url, r.artist_slug,
           u.name artist_name
    FROM purchases p
    JOIN releases r ON r.id = p.release_id
    JOIN users u ON u.id = r.user_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC LIMIT 20
  `).all(userId);

  const recentSales = db.prepare(`
    SELECT p.id, p.amount_cents, p.created_at, r.id release_id, r.title, r.kind, r.cover_url,
           u.name buyer_name
    FROM purchases p
    JOIN releases r ON r.id = p.release_id
    JOIN users u ON u.id = p.user_id
    WHERE r.user_id = ? AND p.amount_cents > 0
    ORDER BY p.created_at DESC LIMIT 20
  `).all(userId);

  const campaigns = db.prepare(`
    SELECT id, title, campaign_type, status, impressions, clicks, listens_generated, budget_cents, budget_spent_cents, starts_at, ends_at
    FROM promotion_campaigns WHERE user_id = ? AND status NOT IN ('cancelled')
    ORDER BY created_at DESC LIMIT 10
  `).all(userId);

  // Plays time-series last 30 days
  const playsSeries = dailySeries(
    "SELECT date(rl.created_at) day, COUNT(*) value FROM release_listens rl JOIN releases r ON r.id = rl.release_id WHERE r.user_id = ? AND rl.created_at >= date('now','-30 days') GROUP BY day",
    [userId], 30
  );

  const followersSeries = dailySeries(
    "SELECT date(created_at) day, COUNT(*) value FROM follows WHERE artist_id = ? AND created_at >= date('now','-30 days') GROUP BY day",
    [userId], 30
  );

  res.json({
    role: req.user.role,
    stats: { ...stats, followers, likes, comments, reposts },
    releases,
    purchases,
    recent_sales: recentSales,
    campaigns,
    series: { plays: playsSeries, followers: followersSeries },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRO / ARTIST PRO DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

dashboardsRouter.get("/pro", authMiddleware, (req, res) => {
  // Pro access: pro=1 OR role in (pro, label, staff, moderator, admin)
  if (!req.user.pro && !["label", "staff", "moderator", "admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Accès Pro requis.", upgrade_required: true });
  }
  const userId = req.user.id;

  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(plays), 0) plays,
      COALESCE(SUM(downloads), 0) downloads,
      COALESCE(SUM(sales), 0) sales,
      COALESCE(SUM(revenue_cents), 0) revenue_cents,
      COUNT(*) releases_total,
      SUM(CASE WHEN visibility = 'public' AND moderation_status = 'published' THEN 1 ELSE 0 END) releases_published,
      SUM(CASE WHEN kind = 'Dubpack' THEN 1 ELSE 0 END) dubpacks_total,
      SUM(CASE WHEN free = 0 AND price_cents > 0 THEN 1 ELSE 0 END) paid_releases
    FROM releases WHERE user_id = ? AND moderation_status != 'removed'
  `).get(userId);

  const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(userId).total;
  const newFollowers7d = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ? AND created_at >= date('now','-7 days')").get(userId).total;
  const likes = db.prepare("SELECT COUNT(*) total FROM likes l JOIN releases r ON r.id = l.release_id WHERE r.user_id = ?").get(userId).total;
  const comments = db.prepare("SELECT COUNT(*) total FROM release_comments rc JOIN releases r ON r.id = rc.release_id WHERE r.user_id = ?").get(userId).total;
  const reposts = db.prepare("SELECT COUNT(*) total FROM reposts rp JOIN releases r ON r.id = rp.release_id WHERE r.user_id = ?").get(userId).total || 0;

  const revenue30d = db.prepare(`
    SELECT COALESCE(SUM(p.amount_cents), 0) total
    FROM purchases p JOIN releases r ON r.id = p.release_id
    WHERE r.user_id = ? AND p.created_at >= date('now','-30 days')
  `).get(userId).total;

  // Top tracks by plays
  const topReleases = db.prepare(`
    SELECT r.id, r.title, r.kind, r.genre, r.cover_url, r.plays, r.downloads, r.sales, r.revenue_cents,
           r.price_cents, r.free, r.moderation_status, r.visibility,
           (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) likes,
           (SELECT COUNT(*) FROM release_comments rc WHERE rc.release_id = r.id) comments
    FROM releases r WHERE r.user_id = ? AND r.moderation_status != 'removed'
    ORDER BY r.plays DESC LIMIT 20
  `).all(userId);

  // All releases for management
  const allReleases = db.prepare(`
    SELECT r.id, r.title, r.kind, r.genre, r.cover_url, r.plays, r.downloads, r.sales, r.revenue_cents,
           r.price_cents, r.free, r.moderation_status, r.visibility, r.created_at, r.description, r.tags, r.color, r.download_enabled,
           (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) likes
    FROM releases r WHERE r.user_id = ? AND r.moderation_status != 'removed'
    ORDER BY r.created_at DESC LIMIT 100
  `).all(userId);

  // Time series
  const playsSeries = dailySeries(
    "SELECT date(rl.created_at) day, COUNT(*) value FROM release_listens rl JOIN releases r ON r.id = rl.release_id WHERE r.user_id = ? AND rl.created_at >= date('now','-30 days') GROUP BY day",
    [userId], 30
  );
  const revenueSeries = dailySeries(
    "SELECT date(p.created_at) day, COALESCE(SUM(p.amount_cents), 0) value FROM purchases p JOIN releases r ON r.id = p.release_id WHERE r.user_id = ? AND p.created_at >= date('now','-30 days') GROUP BY day",
    [userId], 30
  );
  const followersSeries = dailySeries(
    "SELECT date(created_at) day, COUNT(*) value FROM follows WHERE artist_id = ? AND created_at >= date('now','-30 days') GROUP BY day",
    [userId], 30
  );

  // Sales history
  const sales = db.prepare(`
    SELECT p.id, p.amount_cents, p.created_at, r.id release_id, r.title, r.kind, r.cover_url,
           u.name buyer_name, u.id buyer_id
    FROM purchases p
    JOIN releases r ON r.id = p.release_id
    JOIN users u ON u.id = p.user_id
    WHERE r.user_id = ? AND p.amount_cents > 0
    ORDER BY p.created_at DESC LIMIT 50
  `).all(userId);

  // Download logs
  const downloadLogs = db.prepare(`
    SELECT dl.id, dl.created_at, dl.watermark_id, dl.ip_hash, r.id release_id, r.title, u.name user_name
    FROM download_logs dl
    JOIN releases r ON r.id = dl.release_id
    LEFT JOIN users u ON u.id = dl.user_id
    WHERE r.user_id = ?
    ORDER BY dl.created_at DESC LIMIT 30
  `).all(userId);

  // Campaigns with stats
  const campaigns = db.prepare(`
    SELECT id, title, campaign_type, objective, status, impressions, clicks, listens_generated,
           likes_generated, follows_generated, sales_generated, budget_cents, budget_spent_cents,
           starts_at, ends_at, rejection_reason, release_id
    FROM promotion_campaigns WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 30
  `).all(userId);

  // Copyright/takedown
  const takedownReports = db.prepare("SELECT * FROM takedown_reports tr JOIN releases r ON r.id = tr.release_id WHERE r.user_id = ? ORDER BY tr.created_at DESC LIMIT 10").all(userId);

  // Profile score
  const profileScore = db.prepare("SELECT * FROM artist_profile_scores WHERE user_id = ?").get(userId);
  const goals = db.prepare("SELECT * FROM artist_goals WHERE user_id = ? ORDER BY status ASC, created_at ASC LIMIT 10").all(userId);
  const insights = db.prepare("SELECT * FROM artist_insights WHERE user_id = ? AND dismissed = 0 ORDER BY priority ASC LIMIT 8").all(userId);

  res.json({
    role: req.user.role,
    stats: { ...stats, followers, new_followers_7d: newFollowers7d, likes, comments, reposts, revenue_30d: revenue30d },
    top_releases: topReleases,
    all_releases: allReleases,
    sales,
    download_logs: downloadLogs,
    campaigns,
    takedown_reports: takedownReports,
    profile_score: profileScore,
    goals,
    insights,
    series: { plays: playsSeries, revenue: revenueSeries, followers: followersSeries },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

dashboardsRouter.get("/staff", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["staff", "moderator", "admin"])) return;

  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const overview = {
    users_total: db.prepare("SELECT COUNT(*) total FROM users").get().total,
    users_today: db.prepare("SELECT COUNT(*) total FROM users WHERE date(created_at) = ?").get(today).total,
    users_week: db.prepare("SELECT COUNT(*) total FROM users WHERE date(created_at) >= ?").get(week).total,
    releases_today: db.prepare("SELECT COUNT(*) total FROM releases WHERE date(created_at) = ?").get(today).total,
    releases_pending: db.prepare("SELECT COUNT(*) total FROM releases WHERE moderation_status = 'review'").get().total,
    campaigns_pending: db.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE status = 'under_review'").get().total,
    campaigns_today: db.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE date(created_at) = ?").get(today).total,
    tickets_open: db.prepare("SELECT COUNT(*) total FROM support_tickets WHERE status = 'open'").get().total,
    tickets_resolved_week: db.prepare("SELECT COUNT(*) total FROM support_tickets WHERE status = 'resolved' AND date(updated_at) >= ?").get(week).total,
    takedowns_open: db.prepare("SELECT COUNT(*) total FROM takedown_reports WHERE status = 'pending'").get().total,
  };

  const tickets = db.prepare(`
    SELECT st.*, u.name user_name, u.email user_email, u.avatar, u.avatar_url
    FROM support_tickets st LEFT JOIN users u ON u.id = st.user_id
    WHERE st.status != 'closed'
    ORDER BY st.created_at DESC LIMIT 50
  `).all();

  const pendingReleases = db.prepare(`
    SELECT r.id, r.title, r.kind, r.genre, r.moderation_status, r.created_at, r.cover_url, u.name artist_name, u.id artist_id
    FROM releases r JOIN users u ON u.id = r.user_id
    WHERE r.moderation_status = 'review'
    ORDER BY r.created_at ASC LIMIT 30
  `).all();

  const pendingCampaigns = db.prepare(`
    SELECT pc.*, u.name artist_name, u.email artist_email, r.title release_title
    FROM promotion_campaigns pc JOIN users u ON u.id = pc.user_id
    LEFT JOIN releases r ON r.id = pc.release_id
    WHERE pc.status = 'under_review'
    ORDER BY pc.created_at ASC LIMIT 30
  `).all();

  const activitySeries = dailySeries(
    "SELECT date(created_at) day, COUNT(*) value FROM releases WHERE created_at >= date('now','-14 days') GROUP BY day",
    [], 14
  );

  res.json({ overview, tickets, pending_releases: pendingReleases, pending_campaigns: pendingCampaigns, activity_series: activitySeries });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODERATOR DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

dashboardsRouter.get("/moderator", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["moderator", "admin"])) return;

  const overview = {
    reports_open: db.prepare("SELECT COUNT(*) total FROM takedown_reports WHERE status = 'pending'").get().total,
    releases_in_review: db.prepare("SELECT COUNT(*) total FROM releases WHERE moderation_status = 'review'").get().total,
    releases_blocked: db.prepare("SELECT COUNT(*) total FROM releases WHERE moderation_status = 'blocked'").get().total,
    campaigns_pending: db.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE status = 'under_review'").get().total,
    users_suspended: db.prepare("SELECT COUNT(*) total FROM users WHERE role = 'suspended'").get().total || 0,
    security_warnings: db.prepare("SELECT COUNT(*) total FROM security_logs WHERE severity = 'warning' AND created_at >= date('now','-7 days')").get().total,
  };

  const reports = db.prepare(`
    SELECT tr.*, r.title release_title, r.user_id artist_id, r.cover_url,
           u.name reporter_name, u.email reporter_email,
           a.name artist_name
    FROM takedown_reports tr
    JOIN releases r ON r.id = tr.release_id
    LEFT JOIN users u ON u.id = tr.reporter_id
    JOIN users a ON a.id = r.user_id
    ORDER BY CASE tr.status WHEN 'pending' THEN 0 ELSE 1 END, tr.created_at DESC
    LIMIT 100
  `).all();

  const suspectedReleases = db.prepare(`
    SELECT r.id, r.title, r.kind, r.moderation_status, r.scan_status, r.created_at, r.cover_url,
           u.name artist_name, u.id artist_id,
           (SELECT COUNT(*) FROM takedown_reports tr WHERE tr.release_id = r.id) report_count
    FROM releases r JOIN users u ON u.id = r.user_id
    WHERE r.moderation_status IN ('review', 'blocked')
    ORDER BY report_count DESC, r.created_at DESC
    LIMIT 50
  `).all();

  const pendingCampaigns = db.prepare(`
    SELECT pc.*, u.name artist_name, r.title release_title, r.cover_url
    FROM promotion_campaigns pc JOIN users u ON u.id = pc.user_id
    LEFT JOIN releases r ON r.id = pc.release_id
    WHERE pc.status = 'under_review'
    ORDER BY pc.created_at ASC LIMIT 30
  `).all();

  const securityLogs = db.prepare(`
    SELECT sl.*, u.name user_name
    FROM security_logs sl LEFT JOIN users u ON u.id = sl.user_id
    WHERE sl.severity IN ('warning', 'critical')
    ORDER BY sl.created_at DESC LIMIT 100
  `).all();

  const reportsSeries = dailySeries(
    "SELECT date(created_at) day, COUNT(*) value FROM takedown_reports WHERE created_at >= date('now','-30 days') GROUP BY day",
    [], 30
  );

  // Audit log for moderation actions
  const auditLog = db.prepare(`
    SELECT al.*, u.name actor_name
    FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.entity_type IN ('release', 'campaign', 'user', 'copyright')
    ORDER BY al.created_at DESC LIMIT 50
  `).all();

  res.json({ overview, reports, suspected_releases: suspectedReleases, pending_campaigns: pendingCampaigns, security_logs: securityLogs, reports_series: reportsSeries, audit_log: auditLog });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

dashboardsRouter.get("/admin", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;

  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const month = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const overview = {
    users_total: db.prepare("SELECT COUNT(*) total FROM users").get().total,
    users_week: db.prepare("SELECT COUNT(*) total FROM users WHERE date(created_at) >= ?").get(week).total,
    users_month: db.prepare("SELECT COUNT(*) total FROM users WHERE date(created_at) >= ?").get(month).total,
    releases_total: db.prepare("SELECT COUNT(*) total FROM releases WHERE moderation_status != 'removed'").get().total,
    releases_published: db.prepare("SELECT COUNT(*) total FROM releases WHERE moderation_status = 'published' AND visibility = 'public'").get().total,
    dubpacks_total: db.prepare("SELECT COUNT(*) total FROM releases WHERE kind = 'Dubpack' AND moderation_status != 'removed'").get().total,
    campaigns_active: db.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE status = 'active'").get().total,
    campaigns_pending: db.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE status = 'under_review'").get().total,
    revenue_total: db.prepare("SELECT COALESCE(SUM(amount_cents), 0) total FROM purchases").get().total,
    revenue_month: db.prepare("SELECT COALESCE(SUM(amount_cents), 0) total FROM purchases WHERE date(created_at) >= ?").get(month).total,
    revenue_week: db.prepare("SELECT COALESCE(SUM(amount_cents), 0) total FROM purchases WHERE date(created_at) >= ?").get(week).total,
    sales_total: db.prepare("SELECT COUNT(*) total FROM purchases WHERE amount_cents > 0").get().total,
    users_pro: db.prepare("SELECT COUNT(*) total FROM users WHERE pro = 1").get().total,
    reports_open: db.prepare("SELECT COUNT(*) total FROM takedown_reports WHERE status = 'pending'").get().total,
    security_warnings: db.prepare("SELECT COUNT(*) total FROM security_logs WHERE severity = 'warning' AND created_at >= date('now','-7 days')").get().total,
    payout_pending: db.prepare("SELECT COUNT(*) total FROM payout_requests WHERE status = 'pending'").get().total,
  };

  const users = db.prepare(`
    SELECT id, name, email, avatar, avatar_url, role, verified, pro, plan, created_at, workspace_visibility
    FROM users ORDER BY created_at DESC LIMIT 200
  `).all();

  const releases = db.prepare(`
    SELECT r.id, r.title, r.kind, r.genre, r.moderation_status, r.price_cents, r.free,
           r.plays, r.downloads, r.sales, r.revenue_cents, r.created_at, r.cover_url, r.scan_status,
           u.name artist_name, u.id artist_id,
           (SELECT COUNT(*) FROM takedown_reports tr WHERE tr.release_id = r.id) report_count
    FROM releases r JOIN users u ON u.id = r.user_id
    WHERE r.moderation_status != 'removed'
    ORDER BY r.created_at DESC LIMIT 100
  `).all();

  const campaigns = db.prepare(`
    SELECT pc.*, u.name artist_name, u.email artist_email, r.title release_title, r.cover_url
    FROM promotion_campaigns pc JOIN users u ON u.id = pc.user_id
    LEFT JOIN releases r ON r.id = pc.release_id
    ORDER BY pc.created_at DESC LIMIT 100
  `).all();

  const payouts = db.prepare(`
    SELECT pr.id, pr.amount_cents, pr.method, pr.account_holder, pr.destination_last4,
           pr.status, pr.artist_note, pr.staff_note, pr.created_at, pr.processed_at,
           u.name user_name, u.email user_email, u.id user_id
    FROM payout_requests pr JOIN users u ON u.id = pr.user_id
    ORDER BY pr.created_at DESC LIMIT 100
  `).all();

  const securityLogs = db.prepare(`
    SELECT sl.*, u.name user_name
    FROM security_logs sl LEFT JOIN users u ON u.id = sl.user_id
    ORDER BY sl.created_at DESC LIMIT 200
  `).all();

  const auditLog = db.prepare(`
    SELECT al.*, u.name actor_name
    FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id
    ORDER BY al.created_at DESC LIMIT 100
  `).all();

  const reports = db.prepare(`
    SELECT tr.*, r.title release_title, a.name artist_name, u.name reporter_name
    FROM takedown_reports tr
    JOIN releases r ON r.id = tr.release_id
    JOIN users a ON a.id = r.user_id
    LEFT JOIN users u ON u.id = tr.reporter_id
    ORDER BY tr.created_at DESC LIMIT 100
  `).all();

  // Time series
  const usersSeries = dailySeries(
    "SELECT date(created_at) day, COUNT(*) value FROM users WHERE created_at >= date('now','-30 days') GROUP BY day",
    [], 30
  );
  const revenueSeries = dailySeries(
    "SELECT date(created_at) day, COALESCE(SUM(amount_cents), 0) value FROM purchases WHERE created_at >= date('now','-30 days') GROUP BY day",
    [], 30
  );
  const releasesSeries = dailySeries(
    "SELECT date(created_at) day, COUNT(*) value FROM releases WHERE created_at >= date('now','-30 days') GROUP BY day",
    [], 30
  );

  // Role distribution
  const roleDistribution = db.prepare("SELECT role, COUNT(*) count FROM users GROUP BY role ORDER BY count DESC").all();

  res.json({
    overview,
    users,
    releases,
    campaigns,
    payouts,
    security_logs: securityLogs,
    audit_log: auditLog,
    reports,
    role_distribution: roleDistribution,
    series: { users: usersSeries, revenue: revenueSeries, releases: releasesSeries },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Update user role/status
dashboardsRouter.patch("/admin/users/:id", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (target.role === "admin" && req.user.id !== req.params.id) return res.status(403).json({ error: "Impossible de modifier un autre admin." });

  const validRoles = ["user", "staff", "moderator", "admin"];
  const role = req.body.role ? String(req.body.role) : null;
  const verified = req.body.verified !== undefined ? (req.body.verified ? 1 : 0) : null;
  const pro = req.body.pro !== undefined ? (req.body.pro ? 1 : 0) : null;
  const plan = req.body.plan ? String(req.body.plan) : null;

  if (role && !validRoles.includes(role)) return res.status(400).json({ error: "Rôle invalide." });

  const updates = [];
  const params = [];
  if (role !== null) { updates.push("role = ?"); params.push(role); }
  if (verified !== null) { updates.push("verified = ?"); params.push(verified); }
  if (pro !== null) { updates.push("pro = ?"); params.push(pro); }
  if (plan !== null) { updates.push("plan = ?"); params.push(plan); }
  if (!updates.length) return res.status(400).json({ error: "Rien à mettre à jour." });

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'user.update', 'user', ?, ?)").run(`log_${Date.now()}`, req.user.id, req.params.id, JSON.stringify(req.body));

  res.json({ ok: true, user: db.prepare("SELECT id, name, email, role, verified, pro, plan FROM users WHERE id = ?").get(req.params.id) });
});

// Approve/reject/suspend moderation actions
dashboardsRouter.post("/moderator/action", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["moderator", "admin"])) return;
  const { entity_type, entity_id, action, reason = "" } = req.body;
  if (!entity_type || !entity_id || !action) return res.status(400).json({ error: "Paramètres manquants." });

  const validActions = ["approve", "reject", "suspend", "restore", "block", "unblock", "close"];
  if (!validActions.includes(action)) return res.status(400).json({ error: "Action invalide." });

  if (entity_type === "release") {
    const release = db.prepare("SELECT * FROM releases WHERE id = ?").get(entity_id);
    if (!release) return res.status(404).json({ error: "Release introuvable." });
    const statusMap = { approve: "published", reject: "draft", suspend: "blocked", restore: "published", block: "blocked", unblock: "published" };
    if (statusMap[action]) {
      db.prepare("UPDATE releases SET moderation_status = ? WHERE id = ?").run(statusMap[action], entity_id);
    }
  } else if (entity_type === "campaign") {
    const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(entity_id);
    if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
    const statusMap = { approve: "active", reject: "rejected", suspend: "paused", restore: "active", block: "paused" };
    if (statusMap[action]) {
      db.prepare("UPDATE promotion_campaigns SET status = ?, rejection_reason = ?, reviewed_by = ? WHERE id = ?").run(statusMap[action], action === "reject" ? reason : campaign.rejection_reason, req.user.id, entity_id);
    }
  } else if (entity_type === "report") {
    const report = db.prepare("SELECT * FROM takedown_reports WHERE id = ?").get(entity_id);
    if (!report) return res.status(404).json({ error: "Signalement introuvable." });
    const statusMap = { approve: "resolved", reject: "dismissed", close: "closed" };
    if (statusMap[action]) {
      db.prepare("UPDATE takedown_reports SET status = ? WHERE id = ?").run(statusMap[action], entity_id);
    }
  }

  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)").run(
    `log_${Date.now()}`, req.user.id, `moderation.${action}`, entity_type, entity_id, JSON.stringify({ reason })
  );

  res.json({ ok: true });
});

// Approve campaign (staff/moderator/admin)
dashboardsRouter.post("/staff/campaigns/:id/approve", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["staff", "moderator", "admin"])) return;
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  db.prepare("UPDATE promotion_campaigns SET status = 'active', reviewed_by = ?, starts_at = CURRENT_TIMESTAMP, ends_at = datetime('now', '+' || days || ' days') WHERE id = ?").run(req.user.id, req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'campaign.approve', 'campaign', ?, ?)").run(`log_${Date.now()}`, req.user.id, req.params.id, "");
  res.json({ ok: true });
});

dashboardsRouter.post("/staff/campaigns/:id/reject", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["staff", "moderator", "admin"])) return;
  const reason = String(req.body.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "Raison requise." });
  db.prepare("UPDATE promotion_campaigns SET status = 'rejected', rejection_reason = ?, reviewed_by = ? WHERE id = ?").run(reason, req.user.id, req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'campaign.reject', 'campaign', ?, ?)").run(`log_${Date.now()}`, req.user.id, req.params.id, reason);
  res.json({ ok: true });
});

// Approve/reject release moderation
dashboardsRouter.post("/staff/releases/:id/approve", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["staff", "moderator", "admin"])) return;
  db.prepare("UPDATE releases SET moderation_status = 'published' WHERE id = ?").run(req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'release.approve', 'release', ?, '')").run(`log_${Date.now()}`, req.user.id, req.params.id);
  res.json({ ok: true });
});

dashboardsRouter.post("/staff/releases/:id/reject", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["moderator", "admin"])) return;
  const reason = String(req.body.reason || "").trim();
  db.prepare("UPDATE releases SET moderation_status = 'blocked' WHERE id = ?").run(req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'release.block', 'release', ?, ?)").run(`log_${Date.now()}`, req.user.id, req.params.id, reason);
  res.json({ ok: true });
});

// Ticket actions
dashboardsRouter.patch("/staff/tickets/:id", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["staff", "moderator", "admin"])) return;
  const ticket = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket introuvable." });
  const { status, assignee_role } = req.body;
  const updates = [];
  const params = [];
  if (status) { updates.push("status = ?"); params.push(status); }
  if (assignee_role) { updates.push("assignee_role = ?"); params.push(assignee_role); }
  if (!updates.length) return res.status(400).json({ error: "Rien à mettre à jour." });
  params.push(req.params.id);
  db.prepare(`UPDATE support_tickets SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// Payout action (admin only)
dashboardsRouter.patch("/admin/payouts/:id", authMiddleware, (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;
  const { status, staff_note } = req.body;
  const validStatuses = ["pending", "processing", "paid", "rejected"];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Statut invalide." });
  db.prepare("UPDATE payout_requests SET status = ?, staff_note = ?, processed_by = ?, processed_at = CASE WHEN ? IN ('paid','rejected') THEN CURRENT_TIMESTAMP ELSE processed_at END WHERE id = ?")
    .run(status, staff_note || "", req.user.id, status, req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'payout.update', 'payout', ?, ?)").run(`log_${Date.now()}`, req.user.id, req.params.id, JSON.stringify({ status, staff_note }));
  res.json({ ok: true });
});
