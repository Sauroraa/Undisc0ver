// server/campaigns.js — Complete campaign system for Undisc0ver
// Includes: campaign CRUD, Stripe checkout, impression/click tracking,
//           artist insights, goals, profile scoring, admin management.

import { Router } from "express";
import crypto from "node:crypto";
import Stripe from "stripe";
import { db, id } from "./db.js";
import { campaignStatusEmail } from "./emails.js";
import { computeProfileScore, generateInsights, recommendCampaign, computeFinalScore } from "./scoring.js";

export const campaignsRouter = Router();

// ── Constants ─────────────────────────────────────────────────────────────────

const CAMPAIGN_CATALOG = {
  boost_lite: {
    name: "Boost Léger",
    description: "Tester un son avec un petit budget.",
    placements: ["discovery", "suggestions"],
    max_daily_impressions: 250,
    quality_multiplier: 0.6,
    prices_cents: { 1: 299, 3: 599, 7: 899 },
    max_days: 7,
    requires_review: false,
    max_campaigns_parallel: 2,
  },
  boost_standard: {
    name: "Boost Standard",
    description: "Visibilité réelle sur les sections clés.",
    placements: ["discovery", "genre", "suggestions", "search"],
    max_daily_impressions: 700,
    quality_multiplier: 1.0,
    prices_cents: { 3: 999, 7: 1499, 14: 2499 },
    max_days: 14,
    requires_review: false,
    max_campaigns_parallel: 3,
  },
  boost_premium: {
    name: "Boost Premium",
    description: "Placement fort sur toutes les sections.",
    placements: ["home", "discovery", "trending", "genre", "suggestions", "search", "sidebar"],
    max_daily_impressions: 1800,
    quality_multiplier: 1.4,
    prices_cents: { 7: 2499, 14: 3999 },
    max_days: 14,
    requires_review: true,
    max_campaigns_parallel: 1,
  },
  launch: {
    name: "Campagne de Lancement",
    description: "Badge Nouveau pour une sortie fraîche.",
    placements: ["home", "discovery", "new_releases", "genre"],
    max_daily_impressions: 900,
    quality_multiplier: 1.2,
    prices_cents: { 1: 499, 3: 999, 7: 1499 },
    max_days: 7,
    requires_review: false,
    badge: "nouveau",
    max_campaigns_parallel: 2,
  },
  profile_boost: {
    name: "Profil Sponsorisé",
    description: "Gagner des followers ciblés.",
    placements: ["artists_discover", "suggestions", "genre"],
    max_daily_impressions: 550,
    quality_multiplier: 1.0,
    prices_cents: { 7: 799, 14: 1299 },
    max_days: 14,
    requires_review: false,
    target_type: "profile",
    max_campaigns_parallel: 1,
  },
  genre_targeted: {
    name: "Genre Ciblé",
    description: "Audience qualifiée par genre et comportement.",
    placements: ["genre", "discovery", "suggestions"],
    max_daily_impressions: 800,
    quality_multiplier: 1.3,
    prices_cents: { 3: 1199, 7: 1999 },
    max_days: 7,
    requires_review: false,
    has_targeting: true,
    max_campaigns_parallel: 2,
  },
  retargeting: {
    name: "Retargeting Interne",
    description: "Remontrer ton son aux auditeurs d'artistes similaires.",
    placements: ["discovery", "suggestions", "feed"],
    max_daily_impressions: 450,
    quality_multiplier: 1.5,
    prices_cents: { 7: 999, 14: 1699 },
    max_days: 14,
    requires_review: false,
    has_retargeting: true,
    max_campaigns_parallel: 1,
  },
  new_talent: {
    name: "Nouveau Talent",
    description: "Programme spécial pour artistes émergents.",
    placements: ["discovery", "new_releases", "artists_discover"],
    max_daily_impressions: 350,
    quality_multiplier: 0.8,
    prices_cents: { 7: 0, 14: 199 },
    max_days: 14,
    requires_review: true,
    conditions: { max_followers: 500, max_plays: 5000 },
    max_campaigns_parallel: 1,
  },
};

const VALID_OBJECTIVES = ["plays", "followers", "sales", "downloads", "likes", "visibility", "dubpack_visibility"];
const VALID_CAMPAIGN_TYPES = Object.keys(CAMPAIGN_CATALOG);
const VALID_PLACEMENTS = ["home", "discovery", "trending", "search", "genre", "suggestions", "sidebar", "artists_discover", "feed", "new_releases"];
const ACTIVE_STATUSES = ["paid", "under_review", "active", "paused"];

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" })
  : null;

const siteUrl = () => String(process.env.PUBLIC_SITE_URL || "https://undisc0ver.com").replace(/\/$/, "");

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashIp(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
  return ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : "";
}

function sessionHash(req) {
  const ua = req.headers["user-agent"] || "";
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
  return crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 20);
}

function computeCampaignPrice(campaignType, days) {
  const catalog = CAMPAIGN_CATALOG[campaignType];
  if (!catalog) return null;
  if (!Object.prototype.hasOwnProperty.call(catalog.prices_cents, days)) return null;
  return catalog.prices_cents[days];
}

function validateCampaignContent(campaign) {
  const issues = [];
  if (campaign.target_type === "release" && campaign.release_id) {
    const release = db.prepare("SELECT * FROM releases WHERE id = ? AND moderation_status = 'published'").get(campaign.release_id);
    if (!release) { issues.push({ field: "content", msg: "Release introuvable ou non publiée." }); return { ok: false, issues }; }
    if (!release.cover_url) issues.push({ field: "cover", msg: "Ajoute une cover avant de lancer une campagne." });
    if ((release.description || "").length < 10) issues.push({ field: "description", msg: "Ajoute une description pour améliorer l'engagement." });
    if (!release.genre) issues.push({ field: "genre", msg: "Renseigne le genre pour un meilleur ciblage." });
    if (release.scan_status === "blocked") issues.push({ field: "copyright", msg: "Ce contenu a été bloqué pour copyright." });
    if (release.moderation_status !== "published") issues.push({ field: "moderation", msg: "Ce contenu est en cours de modération." });
  }
  return { ok: issues.length === 0, issues };
}

function presentCampaign(c) {
  if (!c) return null;
  const catalog = CAMPAIGN_CATALOG[c.campaign_type] || {};
  const total = Number(c.budget_cents || 0);
  const spent = Number(c.budget_spent_cents || 0);
  const ctr = Number(c.impressions || 0) > 0 ? ((Number(c.clicks || 0) / Number(c.impressions || 0)) * 100).toFixed(2) : "0.00";
  return {
    ...c,
    campaign_type_label: catalog.name || c.campaign_type,
    placements_labels: (c.placements ? JSON.parse(c.placements) : catalog.placements || []),
    audience_targeting: c.audience_targeting ? JSON.parse(c.audience_targeting) : {},
    budget_remaining_cents: Math.max(0, total - spent),
    ctr,
    cost_per_click: Number(c.clicks || 0) > 0 ? Math.round(spent / Number(c.clicks)) : null,
    cost_per_listen: Number(c.listens_generated || 0) > 0 ? Math.round(spent / Number(c.listens_generated)) : null,
    cost_per_follow: Number(c.follows_generated || 0) > 0 ? Math.round(spent / Number(c.follows_generated)) : null,
  };
}

function requiresReview(campaignType, budgetCents) {
  const catalog = CAMPAIGN_CATALOG[campaignType];
  if (!catalog) return true;
  if (catalog.requires_review) return true;
  if (budgetCents > 5000) return true; // > €50 → manual review
  return false;
}

// Send campaign status email non-blocking
function notifyCampaignStatus(campaignId, status) {
  try {
    const campaign = db.prepare("SELECT pc.*, u.name user_name, u.email user_email FROM promotion_campaigns pc JOIN users u ON u.id = pc.user_id WHERE pc.id = ?").get(campaignId);
    if (!campaign?.user_email) return;
    import("./emails.js").then(({ campaignStatusEmail }) => {
      const { subject, html } = campaignStatusEmail({ name: campaign.user_name, email: campaign.user_email }, campaign, status);
      import("./index.js").catch(() => {}).then(m => m?.sendEmail?.({ to: campaign.user_email, subject, html })).catch(() => {});
    }).catch(() => {});
  } catch { /* non-blocking */ }
}

// ── Rate limiter (shared in-memory, same pattern as index.js) ─────────────────
const _rl = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of _rl) if (now > v.resetAt + 120_000) _rl.delete(k); }, 5 * 60_000).unref();
function rl(maxReqs, windowMs) {
  return (req, res, next) => {
    const key = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?") + req.path;
    const now = Date.now();
    let rec = _rl.get(key);
    if (!rec || now > rec.resetAt) { rec = { count: 0, resetAt: now + windowMs }; _rl.set(key, rec); }
    rec.count++;
    if (rec.count > maxReqs) { res.setHeader("Retry-After", Math.ceil((rec.resetAt - now) / 1000)); return res.status(429).json({ error: "Trop de requêtes." }); }
    next();
  };
}

// ── Middleware ────────────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentification requise." });
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND created_at >= datetime('now', '-30 days')").get(token);
  if (!session) return res.status(401).json({ error: "Session expirée." });
  req.user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  if (!req.user) return res.status(401).json({ error: "Compte introuvable." });
  next();
}

function staffRequired(req, res, next) {
  authRequired(req, res, () => {
    if (!["staff", "moderator", "admin"].includes(req.user.role)) return res.status(403).json({ error: "Accès staff requis." });
    next();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/campaigns — list my campaigns
campaignsRouter.get("/", authRequired, (req, res) => {
  const status = req.query.status;
  const conditions = ["pc.user_id = ?"];
  const params = [req.user.id];
  if (status) { conditions.push("pc.status = ?"); params.push(status); }
  const rows = db.prepare(`
    SELECT pc.*, r.title release_title, r.cover_url release_cover_url, r.genre release_genre
    FROM promotion_campaigns pc
    LEFT JOIN releases r ON r.id = pc.release_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY pc.created_at DESC
    LIMIT 100
  `).all(...params);
  res.json({ campaigns: rows.map(presentCampaign) });
});

// GET /api/campaigns/catalog — public campaign types and pricing
campaignsRouter.get("/catalog", (_req, res) => {
  res.json({ catalog: CAMPAIGN_CATALOG });
});

// POST /api/campaigns/estimate — estimate results before buying
campaignsRouter.post("/estimate", authRequired, rl(20, 60_000), (req, res) => {
  const { campaign_type, days, release_id } = req.body;
  const catalog = CAMPAIGN_CATALOG[campaign_type];
  if (!catalog) return res.status(400).json({ error: "Type de campagne invalide." });
  const daysInt = Number(days) || 7;
  const priceCents = computeCampaignPrice(campaign_type, daysInt);
  if (priceCents === null) return res.status(400).json({ error: "Durée invalide pour ce type de campagne." });

  const platformSize = db.prepare("SELECT COUNT(*) total FROM users WHERE workspace_visibility = 'public'").get().total;
  const impressionEstimate = {
    min: Math.round(catalog.max_daily_impressions * daysInt * 0.4),
    max: Math.round(catalog.max_daily_impressions * daysInt * 0.9),
  };
  const clickRate = 0.025; // ~2.5% CTR baseline
  const listenRate = 0.60; // 60% of clicks → listen

  let recommendation = null;
  if (release_id) {
    const release = db.prepare("SELECT * FROM releases WHERE id = ? AND user_id = ?").get(release_id, req.user.id);
    if (release) recommendation = recommendCampaign(release, req.user, 0);
  }

  res.json({
    campaign_type,
    campaign_type_label: catalog.name,
    days: daysInt,
    price_cents: priceCents,
    placements: catalog.placements,
    estimates: {
      impressions: impressionEstimate,
      clicks: { min: Math.round(impressionEstimate.min * clickRate), max: Math.round(impressionEstimate.max * clickRate) },
      listens: { min: Math.round(impressionEstimate.min * clickRate * listenRate), max: Math.round(impressionEstimate.max * clickRate * listenRate) },
    },
    recommendation,
    platform_users: platformSize,
  });
});

// POST /api/campaigns/recommend — get campaign recommendation for a release
campaignsRouter.post("/recommend", authRequired, rl(30, 60_000), (req, res) => {
  const { release_id } = req.body;
  if (!release_id) return res.status(400).json({ error: "release_id requis." });
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND user_id = ?").get(release_id, req.user.id);
  if (!release) return res.status(404).json({ error: "Release introuvable." });
  const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.user.id).total;
  const rec = recommendCampaign(release, req.user, followers);
  res.json(rec);
});

// POST /api/campaigns — create campaign (draft)
campaignsRouter.post("/", authRequired, rl(10, 60_000), (req, res) => {
  const {
    campaign_type, objective, target_type = "release", release_id,
    days, title, image_url = "", url = "", audience_targeting = {}
  } = req.body;

  if (!VALID_CAMPAIGN_TYPES.includes(campaign_type)) return res.status(400).json({ error: "Type de campagne invalide." });
  if (!VALID_OBJECTIVES.includes(objective)) return res.status(400).json({ error: "Objectif invalide." });

  const catalog = CAMPAIGN_CATALOG[campaign_type];
  const daysInt = Number(days);
  if (!Number.isInteger(daysInt) || !Object.prototype.hasOwnProperty.call(catalog.prices_cents, daysInt)) return res.status(400).json({ error: `Durée invalide. Options: ${Object.keys(catalog.prices_cents).join(", ")} jours.` });

  // Validate content
  const contentCheck = validateCampaignContent({ target_type, release_id });
  if (!contentCheck.ok && contentCheck.issues.some(i => ["copyright", "moderation", "content"].includes(i.field))) {
    return res.status(400).json({ error: contentCheck.issues[0].msg, issues: contentCheck.issues });
  }

  // Check new_talent conditions
  if (campaign_type === "new_talent") {
    const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.user.id).total;
    if (followers > 500) return res.status(400).json({ error: "Ce programme est réservé aux artistes avec moins de 500 followers." });
    const plays = db.prepare("SELECT COALESCE(SUM(plays), 0) total FROM releases WHERE user_id = ? AND moderation_status != 'removed'").get(req.user.id).total;
    if (plays > 5000) return res.status(400).json({ error: "Ce programme est réservé aux nouveaux talents avec moins de 5 000 écoutes." });
  }

  // Parallel campaign limit
  const activeCount = db.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE user_id = ? AND campaign_type = ? AND status IN ('paid','under_review','active','paused')").get(req.user.id, campaign_type).total;
  if (activeCount >= (catalog.max_campaigns_parallel || 1)) {
    return res.status(409).json({ error: `Tu as déjà atteint la limite de ${catalog.max_campaigns_parallel} campagne(s) de ce type en cours.` });
  }

  const priceCents = computeCampaignPrice(campaign_type, daysInt);
  const campaignId = id("cmp");
  const campaignTitle = String(title || "").trim().slice(0, 120) || catalog.name;
  const endsAt = new Date(Date.now() + daysInt * 86400000).toISOString();

  db.prepare(`
    INSERT INTO promotion_campaigns (
      id, user_id, target_type, release_id, title, url, image_url,
      spot, daily_budget_cents, days, status, starts_at, ends_at,
      campaign_type, objective, budget_cents, placements, audience_targeting
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
  `).run(
    campaignId, req.user.id, target_type, release_id || null, campaignTitle,
    String(url).slice(0, 500), String(image_url).slice(0, 500),
    catalog.placements[0],
    Math.round(priceCents / daysInt), daysInt, endsAt,
    campaign_type, objective, priceCents,
    JSON.stringify(catalog.placements),
    JSON.stringify(audience_targeting)
  );

  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(campaignId);
  res.status(201).json({ campaign: presentCampaign(campaign), content_issues: contentCheck.issues, ready: contentCheck.ok });
});

// GET /api/campaigns/:id
campaignsRouter.get("/:id", authRequired, (req, res) => {
  const campaign = db.prepare("SELECT pc.*, r.title release_title, r.cover_url release_cover_url FROM promotion_campaigns pc LEFT JOIN releases r ON r.id = pc.release_id WHERE pc.id = ? AND (pc.user_id = ? OR ? IN ('staff','moderator','admin'))").get(req.params.id, req.user.id, req.user.role);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  res.json({ campaign: presentCampaign(campaign) });
});

// PATCH /api/campaigns/:id — edit draft or rejected campaign
campaignsRouter.patch("/:id", authRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  if (!["draft", "rejected"].includes(campaign.status)) return res.status(400).json({ error: "Seules les campagnes en brouillon ou refusées peuvent être modifiées." });
  const { title, image_url, url, audience_targeting } = req.body;
  db.prepare("UPDATE promotion_campaigns SET title = ?, image_url = ?, url = ?, audience_targeting = ?, status = 'draft', rejection_reason = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(
      String(title || campaign.title).trim().slice(0, 120),
      String(image_url || campaign.image_url || "").slice(0, 500),
      String(url || campaign.url || "").slice(0, 500),
      JSON.stringify(audience_targeting || JSON.parse(campaign.audience_targeting || "{}")),
      req.params.id
    );
  res.json({ campaign: presentCampaign(db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(req.params.id)) });
});

// POST /api/campaigns/:id/pause
campaignsRouter.post("/:id/pause", authRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  if (campaign.status !== "active") return res.status(400).json({ error: "Seules les campagnes actives peuvent être mises en pause." });
  db.prepare("UPDATE promotion_campaigns SET status = 'paused', paused_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ ok: true, status: "paused" });
});

// POST /api/campaigns/:id/resume
campaignsRouter.post("/:id/resume", authRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  if (campaign.status !== "paused") return res.status(400).json({ error: "Seules les campagnes en pause peuvent être relancées." });
  if (new Date(campaign.ends_at) < new Date()) return res.status(400).json({ error: "Cette campagne a expiré." });
  db.prepare("UPDATE promotion_campaigns SET status = 'active', paused_at = NULL WHERE id = ?").run(req.params.id);
  res.json({ ok: true, status: "active" });
});

// POST /api/campaigns/:id/cancel
campaignsRouter.post("/:id/cancel", authRequired, rl(10, 60_000), (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  if (!["draft", "paid", "under_review", "active", "paused"].includes(campaign.status)) return res.status(400).json({ error: "Cette campagne ne peut pas être annulée." });
  db.prepare("UPDATE promotion_campaigns SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ ok: true, status: "cancelled" });
});

// POST /api/campaigns/:id/duplicate
campaignsRouter.post("/:id/duplicate", authRequired, rl(10, 60_000), (req, res) => {
  const orig = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!orig) return res.status(404).json({ error: "Campagne introuvable." });
  const priceCents = computeCampaignPrice(orig.campaign_type, orig.days);
  const newId = id("cmp");
  const endsAt = new Date(Date.now() + orig.days * 86400000).toISOString();
  db.prepare(`
    INSERT INTO promotion_campaigns (id, user_id, target_type, release_id, title, url, image_url, spot, daily_budget_cents, days, status, starts_at, ends_at, campaign_type, objective, budget_cents, placements, audience_targeting)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
  `).run(newId, req.user.id, orig.target_type, orig.release_id, `${orig.title} (copie)`, orig.url, orig.image_url, orig.spot, orig.daily_budget_cents, orig.days, endsAt, orig.campaign_type, orig.objective, priceCents || orig.budget_cents, orig.placements, orig.audience_targeting);
  res.status(201).json({ campaign: presentCampaign(db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(newId)) });
});

// GET /api/campaigns/:id/stats
campaignsRouter.get("/:id/stats", authRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND (user_id = ? OR ? IN ('staff','moderator','admin'))").get(req.params.id, req.user.id, req.user.role);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  const daily = db.prepare("SELECT * FROM campaign_daily_stats WHERE campaign_id = ? ORDER BY stat_date ASC").all(req.params.id);
  const events = db.prepare("SELECT event_type, COUNT(*) total FROM campaign_events WHERE campaign_id = ? GROUP BY event_type").all(req.params.id);
  const eventsMap = Object.fromEntries(events.map(e => [e.event_type, e.total]));
  res.json({ campaign: presentCampaign(campaign), daily_stats: daily, event_totals: eventsMap });
});

// GET /api/campaigns/:id/report
campaignsRouter.get("/:id/report", authRequired, (req, res) => {
  const campaign = db.prepare("SELECT pc.*, r.title release_title, r.genre release_genre, u.name artist_name FROM promotion_campaigns pc LEFT JOIN releases r ON r.id = pc.release_id JOIN users u ON u.id = pc.user_id WHERE pc.id = ? AND (pc.user_id = ? OR ? IN ('staff','moderator','admin'))").get(req.params.id, req.user.id, req.user.role);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  const daily = db.prepare("SELECT * FROM campaign_daily_stats WHERE campaign_id = ? ORDER BY stat_date ASC").all(req.params.id);
  const catalog = CAMPAIGN_CATALOG[campaign.campaign_type] || {};
  const pCampaign = presentCampaign(campaign);
  res.json({
    report: {
      ...pCampaign,
      campaign_type_label: catalog.name,
      daily_breakdown: daily,
      summary: {
        total_spend: campaign.budget_spent_cents,
        total_impressions: campaign.impressions,
        total_clicks: campaign.clicks,
        total_listens: campaign.listens_generated,
        total_likes: campaign.likes_generated,
        total_follows: campaign.follows_generated,
        total_sales: campaign.sales_generated,
        ctr: pCampaign.ctr,
        cost_per_click: pCampaign.cost_per_click,
        cost_per_listen: pCampaign.cost_per_listen,
        cost_per_follow: pCampaign.cost_per_follow,
        roi_score: campaign.follows_generated > 0 || campaign.sales_generated > 0 ? "positif" : "neutre",
      },
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRIPE CHECKOUT FOR CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════════

campaignsRouter.post("/:id/checkout", authRequired, rl(5, 60_000), async (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ? AND user_id = ? AND status = 'draft'").get(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable ou déjà payée." });

  // Server-side price verification — never trust frontend
  const priceCents = computeCampaignPrice(campaign.campaign_type, campaign.days);
  if (priceCents === null || priceCents !== Number(campaign.budget_cents)) {
    db.prepare("UPDATE promotion_campaigns SET budget_cents = ? WHERE id = ?").run(priceCents || 0, campaign.id);
  }
  const finalPrice = priceCents || 0;

  // Free campaigns (new_talent) — activate directly without Stripe
  if (finalPrice === 0) {
    const newStatus = requiresReview(campaign.campaign_type, 0) ? "under_review" : "active";
    db.prepare("UPDATE promotion_campaigns SET status = ?, starts_at = CURRENT_TIMESTAMP, ends_at = datetime('now', '+' || days || ' days') WHERE id = ?").run(newStatus, campaign.id);
    return res.json({ ok: true, free: true, status: newStatus });
  }

  if (!stripe) return res.status(503).json({ error: "Le paiement n'est pas encore configuré." });

  const catalog = CAMPAIGN_CATALOG[campaign.campaign_type] || {};
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${siteUrl()}/dashboard/campaigns/${campaign.id}?payment=success`,
    cancel_url: `${siteUrl()}/dashboard/campaigns/${campaign.id}?payment=cancelled`,
    line_items: [{
      price_data: {
        currency: "eur",
        unit_amount: finalPrice,
        product_data: { name: `${catalog.name} — ${campaign.title}`, description: `Campagne ${campaign.days} jours sur Undisc0ver` }
      },
      quantity: 1
    }],
    metadata: { type: "campaign", campaign_id: campaign.id, user_id: req.user.id, price_cents: String(finalPrice) }
  });

  db.prepare("UPDATE promotion_campaigns SET status = 'pending_payment' WHERE id = ?").run(campaign.id);
  db.prepare("INSERT INTO stripe_checkouts (id, user_id, campaign_id, stripe_session_id, amount_cents, status) VALUES (?, ?, ?, ?, ?, 'pending')").run(id("chk"), req.user.id, campaign.id, session.id, finalPrice);

  res.json({ url: session.url });
});

// Called by webhook when campaign checkout.session.completed
export function fulfillCampaignCheckout(session) {
  const campaignId = session.metadata?.campaign_id;
  if (!campaignId) return;
  const chk = db.prepare("SELECT * FROM stripe_checkouts WHERE stripe_session_id = ? AND campaign_id IS NOT NULL").get(session.id);
  if (!chk || chk.status !== "pending") return; // idempotent
  db.prepare("UPDATE stripe_checkouts SET status = 'paid' WHERE id = ?").run(chk.id);
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(campaignId);
  if (!campaign) return;
  const newStatus = requiresReview(campaign.campaign_type, chk.amount_cents) ? "under_review" : "active";
  db.prepare("UPDATE promotion_campaigns SET status = ?, budget_cents = ?, starts_at = CURRENT_TIMESTAMP, ends_at = datetime('now', '+' || days || ' days') WHERE id = ?").run(newStatus, chk.amount_cents, campaignId);
  notifyCampaignStatus(campaignId, newStatus);
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPRESSION & CLICK TRACKING (Public, anti-dedup)
// ═══════════════════════════════════════════════════════════════════════════════

campaignsRouter.post("/track/impression", rl(200, 60_000), (req, res) => {
  const { campaign_id, placement } = req.body;
  if (!campaign_id || !placement) return res.json({ ok: false });
  const campaign = db.prepare("SELECT id, status, ends_at FROM promotion_campaigns WHERE id = ? AND status = 'active' AND datetime(ends_at) >= datetime('now')").get(campaign_id);
  if (!campaign) return res.json({ ok: false });

  const sess = sessionHash(req);
  const ip = hashIp(req);
  const ua = crypto.createHash("sha256").update(req.headers["user-agent"] || "").digest("hex").slice(0, 16);

  // Frequency cap: max 3 impressions per session per campaign per day
  const existing = db.prepare("SELECT count, last_seen FROM ad_impression_dedup WHERE session_hash = ? AND campaign_id = ?").get(sess, campaign_id);
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastSeenDate = existing?.last_seen?.slice(0, 10);

  if (existing) {
    if (lastSeenDate === todayStr && existing.count >= 3) return res.json({ ok: false, reason: "frequency_cap" });
    db.prepare("UPDATE ad_impression_dedup SET count = CASE WHEN last_seen < date('now') THEN 1 ELSE count + 1 END, last_seen = CURRENT_TIMESTAMP WHERE session_hash = ? AND campaign_id = ?").run(sess, campaign_id);
  } else {
    db.prepare("INSERT INTO ad_impression_dedup (session_hash, campaign_id, count, last_seen) VALUES (?, ?, 1, CURRENT_TIMESTAMP)").run(sess, campaign_id);
  }

  const userId = (() => {
    try {
      const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) return null;
      return db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token)?.user_id || null;
    } catch { return null; }
  })();

  db.prepare("INSERT INTO campaign_events (id, campaign_id, user_id, session_hash, event_type, placement, ip_hash, ua_hash) VALUES (?, ?, ?, ?, 'impression', ?, ?, ?)").run(id("ev"), campaign_id, userId, sess, placement, ip, ua);
  db.prepare("UPDATE promotion_campaigns SET impressions = impressions + 1 WHERE id = ?").run(campaign_id);

  // Aggregate daily stats
  const today = new Date().toISOString().slice(0, 10);
  db.prepare("INSERT INTO campaign_daily_stats (campaign_id, stat_date, impressions) VALUES (?, ?, 1) ON CONFLICT(campaign_id, stat_date) DO UPDATE SET impressions = impressions + 1").run(campaign_id, today);

  res.json({ ok: true });
});

campaignsRouter.post("/track/click", rl(100, 60_000), (req, res) => {
  const { campaign_id, placement } = req.body;
  if (!campaign_id || !placement) return res.json({ ok: false });
  const campaign = db.prepare("SELECT id, status FROM promotion_campaigns WHERE id = ? AND status = 'active'").get(campaign_id);
  if (!campaign) return res.json({ ok: false });

  const sess = sessionHash(req);
  const ip = hashIp(req);
  const ua = crypto.createHash("sha256").update(req.headers["user-agent"] || "").digest("hex").slice(0, 16);

  // Dedup: one click per session per campaign per day
  const alreadyClicked = db.prepare("SELECT 1 FROM campaign_events WHERE session_hash = ? AND campaign_id = ? AND event_type = 'click' AND date(created_at) = date('now')").get(sess, campaign_id);
  if (alreadyClicked) return res.json({ ok: false, reason: "already_clicked" });

  const userId = (() => {
    try {
      const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) return null;
      return db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token)?.user_id || null;
    } catch { return null; }
  })();

  db.prepare("INSERT INTO campaign_events (id, campaign_id, user_id, session_hash, event_type, placement, ip_hash, ua_hash) VALUES (?, ?, ?, ?, 'click', ?, ?, ?)").run(id("ev"), campaign_id, userId, sess, placement, ip, ua);
  db.prepare("UPDATE promotion_campaigns SET clicks = clicks + 1 WHERE id = ?").run(campaign_id);

  const today = new Date().toISOString().slice(0, 10);
  db.prepare("INSERT INTO campaign_daily_stats (campaign_id, stat_date, clicks) VALUES (?, ?, 1) ON CONFLICT(campaign_id, stat_date) DO UPDATE SET clicks = clicks + 1").run(campaign_id, today);

  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIST INSIGHTS & PROFILE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

campaignsRouter.get("/insights/me", authRequired, (req, res) => {
  const releases = db.prepare(`
    SELECT r.*, (SELECT COUNT(*) FROM likes l WHERE l.release_id = r.id) likes,
      (SELECT COUNT(*) FROM release_comments rc WHERE rc.release_id = r.id) comments,
      (SELECT COUNT(*) FROM reposts rp WHERE rp.release_id = r.id) reposts
    FROM releases r WHERE r.user_id = ? AND r.moderation_status != 'removed'
    ORDER BY r.created_at DESC LIMIT 20
  `).all(req.user.id);

  const insights = generateInsights(req.user, releases, []);

  // Reconcile stored insights with current data. Resolved advice disappears
  // automatically; dismissed advice stays hidden until its condition is fixed.
  const keyOf = (item) => `${item.insight_type || item.type}|${item.release_id || ""}`;
  const generatedByKey = new Map(insights.map((insight) => [keyOf(insight), insight]));
  const stored = db.prepare("SELECT * FROM artist_insights WHERE user_id = ? ORDER BY dismissed DESC, created_at ASC").all(req.user.id);
  const storedByKey = new Map();

  for (const row of stored) {
    const key = keyOf(row);
    const current = generatedByKey.get(key);
    if (!current) {
      db.prepare("DELETE FROM artist_insights WHERE id = ?").run(row.id);
      continue;
    }
    if (storedByKey.has(key)) {
      db.prepare("DELETE FROM artist_insights WHERE id = ?").run(row.id);
      continue;
    }
    storedByKey.set(key, row);
    if (!row.dismissed) {
      db.prepare("UPDATE artist_insights SET priority = ?, title = ?, body = ?, action_url = ?, action_label = ? WHERE id = ?")
        .run(current.priority, current.title, current.body, current.action_url || "", current.action_label || "", row.id);
    }
  }

  for (const insight of insights) {
    const key = keyOf(insight);
    if (storedByKey.has(key)) continue;
    db.prepare("INSERT INTO artist_insights (id, user_id, release_id, insight_type, priority, title, body, action_url, action_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id("ins"), req.user.id, insight.release_id || null, insight.type, insight.priority, insight.title, insight.body, insight.action_url || "", insight.action_label || "");
  }

  const active = db.prepare("SELECT * FROM artist_insights WHERE user_id = ? AND dismissed = 0 ORDER BY priority ASC LIMIT 8").all(req.user.id);
  res.json({ insights: active });
});

campaignsRouter.post("/insights/:id/dismiss", authRequired, (req, res) => {
  db.prepare("UPDATE artist_insights SET dismissed = 1 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

campaignsRouter.get("/profile-score/me", authRequired, (req, res) => {
  const releases = db.prepare("SELECT * FROM releases WHERE user_id = ? AND moderation_status != 'removed'").all(req.user.id);
  const score = computeProfileScore(req.user, releases);
  const followers = db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.user.id).total;

  // Upsert cached score
  db.prepare(`
    INSERT INTO artist_profile_scores (user_id, total_score, profile_score, engagement_score, growth_score, quality_score, label, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET total_score=excluded.total_score, profile_score=excluded.profile_score, engagement_score=excluded.engagement_score, growth_score=excluded.growth_score, quality_score=excluded.quality_score, label=excluded.label, computed_at=excluded.computed_at
  `).run(req.user.id, score.total_score, score.profile_score, score.engagement_score, score.growth_score, score.quality_score, score.label);

  const actions = [];
  if (!req.user.avatar_url) actions.push({ field: "avatar", label: "Ajouter une photo de profil", url: "/settings" });
  if (!req.user.banner_url) actions.push({ field: "banner", label: "Ajouter une bannière", url: "/settings" });
  if ((req.user.bio || "").length < 30) actions.push({ field: "bio", label: "Compléter ta bio", url: "/settings" });
  if (releases.length < 1) actions.push({ field: "releases", label: "Uploader ta première track", url: "/upload" });

  res.json({ score, followers, releases_count: releases.length, improvement_actions: actions });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIST GOALS
// ═══════════════════════════════════════════════════════════════════════════════

const GOAL_DEFINITIONS = [
  { type: "complete_profile",     label: "Compléter son profil",         target: 1, reward_type: "visibility_boost", reward_value: 0 },
  { type: "upload_first_track",   label: "Uploader sa première track",   target: 1, reward_type: "none", reward_value: 0 },
  { type: "reach_100_plays",      label: "Atteindre 100 écoutes",        target: 100, reward_type: "none", reward_value: 0 },
  { type: "reach_10_followers",   label: "Atteindre 10 followers",       target: 10, reward_type: "none", reward_value: 0 },
  { type: "reach_50_followers",   label: "Atteindre 50 followers",       target: 50, reward_type: "none", reward_value: 0 },
  { type: "reach_500_plays",      label: "Atteindre 500 écoutes",        target: 500, reward_type: "none", reward_value: 0 },
  { type: "reply_3_comments",     label: "Répondre à 3 commentaires",    target: 3, reward_type: "none", reward_value: 0 },
  { type: "publish_3_releases",   label: "Publier 3 sons",               target: 3, reward_type: "none", reward_value: 0 },
  { type: "create_playlist",      label: "Créer une playlist",           target: 1, reward_type: "none", reward_value: 0 },
  { type: "get_10_likes",         label: "Obtenir 10 likes",             target: 10, reward_type: "none", reward_value: 0 },
];

campaignsRouter.get("/goals/me", authRequired, (req, res) => {
  // Auto-provision missing goals
  const existingTypes = new Set(db.prepare("SELECT goal_type FROM artist_goals WHERE user_id = ?").all(req.user.id).map(g => g.goal_type));
  for (const def of GOAL_DEFINITIONS) {
    if (!existingTypes.has(def.type)) {
      db.prepare("INSERT INTO artist_goals (id, user_id, goal_type, target_value) VALUES (?, ?, ?, ?)").run(id("gol"), req.user.id, def.type, def.target);
    }
  }

  // Compute current values
  const stats = {
    plays: db.prepare("SELECT COALESCE(SUM(plays),0) total FROM releases WHERE user_id = ?").get(req.user.id).total,
    followers: db.prepare("SELECT COUNT(*) total FROM follows WHERE artist_id = ?").get(req.user.id).total,
    releases: db.prepare("SELECT COUNT(*) total FROM releases WHERE user_id = ? AND moderation_status != 'removed'").get(req.user.id).total,
    likes: db.prepare("SELECT COUNT(*) total FROM likes l JOIN releases r ON r.id = l.release_id WHERE r.user_id = ?").get(req.user.id).total,
    playlists: db.prepare("SELECT COUNT(*) total FROM playlists WHERE user_id = ?").get(req.user.id).total,
    profile_complete: (req.user.avatar_url || req.user.avatar?.length > 2) && req.user.bio?.length > 20 ? 1 : 0,
  };

  const typeToValue = {
    complete_profile: stats.profile_complete,
    upload_first_track: Math.min(1, stats.releases),
    reach_100_plays: stats.plays,
    reach_500_plays: stats.plays,
    reach_10_followers: stats.followers,
    reach_50_followers: stats.followers,
    publish_3_releases: stats.releases,
    get_10_likes: stats.likes,
    create_playlist: stats.playlists,
  };

  // Update current values and auto-complete
  const goals = db.prepare("SELECT * FROM artist_goals WHERE user_id = ? ORDER BY status ASC, created_at ASC").all(req.user.id);
  for (const goal of goals) {
    if (goal.status === "active") {
      const current = typeToValue[goal.goal_type] ?? goal.current_value;
      const completed = current >= goal.target_value;
      db.prepare("UPDATE artist_goals SET current_value = ?, status = ?, completed_at = ? WHERE id = ?")
        .run(current, completed ? "completed" : "active", completed && !goal.completed_at ? new Date().toISOString() : goal.completed_at, goal.id);
    }
  }

  const updatedGoals = db.prepare("SELECT * FROM artist_goals WHERE user_id = ? ORDER BY status ASC, created_at ASC").all(req.user.id);
  const withDefs = updatedGoals.map(g => {
    const def = GOAL_DEFINITIONS.find(d => d.type === g.goal_type) || {};
    return { ...g, label: def.label || g.goal_type, progress: Math.min(100, Math.round((g.current_value / Math.max(1, g.target_value)) * 100)) };
  });

  res.json({ goals: withDefs, stats });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE CAMPAIGNS FOR PLACEMENT (used by discovery, home, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

campaignsRouter.get("/active/:placement", (req, res) => {
  const placement = req.params.placement;
  if (!VALID_PLACEMENTS.includes(placement)) return res.status(400).json({ error: "Emplacement invalide." });

  // Fetch campaigns eligible for this placement
  const rows = db.prepare(`
    SELECT pc.*, r.title release_title, r.cover_url release_cover_url, r.genre release_genre,
           r.audio_url, r.price_cents, r.free, r.kind,
           u.name artist_name, u.avatar_url artist_avatar, u.artist_slug
    FROM promotion_campaigns pc
    LEFT JOIN releases r ON r.id = pc.release_id
    JOIN users u ON u.id = pc.user_id
    WHERE pc.status = 'active'
      AND datetime(pc.ends_at) >= datetime('now')
      AND (json_extract(pc.placements, '$') LIKE '%"${placement}"%' OR pc.spot = ?)
    ORDER BY pc.daily_budget_cents * pc.quality_score DESC
    LIMIT 5
  `).all(placement);

  res.json({
    campaigns: rows.map(c => ({
      id: c.id,
      campaign_type: c.campaign_type,
      badge: CAMPAIGN_CATALOG[c.campaign_type]?.badge || null,
      release_id: c.release_id,
      release_title: c.release_title,
      release_cover_url: c.release_cover_url,
      release_genre: c.release_genre,
      price_cents: c.price_cents,
      free: c.free,
      kind: c.kind,
      artist_name: c.artist_name,
      artist_avatar: c.artist_avatar,
      artist_slug: c.artist_slug,
      title: c.title,
      url: c.url,
      image_url: c.image_url,
      sponsored: true,
      placement,
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CAMPAIGN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

campaignsRouter.get("/admin/all", staffRequired, (req, res) => {
  const status = req.query.status;
  const conditions = status ? ["pc.status = ?"] : [];
  const params = status ? [status] : [];
  const rows = db.prepare(`
    SELECT pc.*, u.name artist_name, u.email artist_email, r.title release_title, r.cover_url release_cover_url
    FROM promotion_campaigns pc
    JOIN users u ON u.id = pc.user_id
    LEFT JOIN releases r ON r.id = pc.release_id
    ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
    ORDER BY pc.created_at DESC
    LIMIT 200
  `).all(...params);
  const summary = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'under_review' THEN 1 END) pending_review,
      COUNT(CASE WHEN status = 'active' THEN 1 END) active,
      COALESCE(SUM(CASE WHEN status NOT IN ('draft','cancelled','rejected') THEN budget_cents END), 0) total_revenue_cents
    FROM promotion_campaigns
  `).get();
  res.json({ campaigns: rows.map(presentCampaign), summary });
});

campaignsRouter.post("/admin/:id/approve", staffRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  if (!["under_review", "paid"].includes(campaign.status)) return res.status(400).json({ error: "Cette campagne ne peut pas être approuvée." });
  db.prepare("UPDATE promotion_campaigns SET status = 'active', reviewed_by = ?, starts_at = CURRENT_TIMESTAMP, ends_at = datetime('now', '+' || days || ' days') WHERE id = ?").run(req.user.id, req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'campaign.approve', 'campaign', ?, ?)").run(id("log"), req.user.id, req.params.id, req.body.notes || "");
  notifyCampaignStatus(req.params.id, "active");
  res.json({ ok: true, status: "active" });
});

campaignsRouter.post("/admin/:id/reject", staffRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  const reason = String(req.body.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "Raison de refus requise." });
  db.prepare("UPDATE promotion_campaigns SET status = 'rejected', rejection_reason = ?, reviewed_by = ? WHERE id = ?").run(reason, req.user.id, req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'campaign.reject', 'campaign', ?, ?)").run(id("log"), req.user.id, req.params.id, reason);
  notifyCampaignStatus(req.params.id, "rejected");
  res.json({ ok: true, status: "rejected" });
});

campaignsRouter.post("/admin/:id/suspend", staffRequired, (req, res) => {
  const campaign = db.prepare("SELECT * FROM promotion_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable." });
  db.prepare("UPDATE promotion_campaigns SET status = 'paused', paused_at = CURRENT_TIMESTAMP, moderation_notes = ? WHERE id = ?").run(String(req.body.reason || "Suspension staff").slice(0, 500), req.params.id);
  db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'campaign.suspend', 'campaign', ?, ?)").run(id("log"), req.user.id, req.params.id, req.body.reason || "");
  res.json({ ok: true, status: "paused" });
});

// Admin security logs
campaignsRouter.get("/admin/security-logs", staffRequired, (req, res) => {
  const severity = req.query.severity;
  const logs = db.prepare(`
    SELECT sl.*, u.name user_name
    FROM security_logs sl
    LEFT JOIN users u ON u.id = sl.user_id
    ${severity ? "WHERE sl.severity = ?" : ""}
    ORDER BY sl.created_at DESC
    LIMIT 500
  `).all(...(severity ? [severity] : []));
  res.json({ logs });
});

// Admin download logs (for leak investigation)
campaignsRouter.get("/admin/download-logs", staffRequired, (req, res) => {
  const releaseId = req.query.release_id;
  const logs = db.prepare(`
    SELECT dl.*, u.name user_name, u.email user_email, r.title release_title
    FROM download_logs dl
    LEFT JOIN users u ON u.id = dl.user_id
    LEFT JOIN releases r ON r.id = dl.release_id
    ${releaseId ? "WHERE dl.release_id = ?" : ""}
    ORDER BY dl.created_at DESC
    LIMIT 500
  `).all(...(releaseId ? [releaseId] : []));
  res.json({ logs });
});
