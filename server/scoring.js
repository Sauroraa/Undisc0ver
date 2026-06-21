// server/scoring.js — Undisc0ver ranking algorithm
// Anti pay-to-win: paid boost is capped at 20% of max score.
// Organic quality, freshness, relevance and fairness always dominate.

// ── Page weight profiles ─────────────────────────────────────────────────────
// Each context has different priorities for the scoring dimensions.
const PAGE_WEIGHTS = {
  home:         { organic: 0.50, paid: 0.12, relevance: 0.18, freshness: 0.10, fairness: 0.08, exploration: 0.02 },
  discovery:    { organic: 0.38, paid: 0.10, relevance: 0.22, freshness: 0.14, fairness: 0.10, exploration: 0.06 },
  trending:     { organic: 0.72, paid: 0.08, relevance: 0.10, freshness: 0.06, fairness: 0.03, exploration: 0.01 },
  search:       { organic: 0.58, paid: 0.04, relevance: 0.32, freshness: 0.04, fairness: 0.01, exploration: 0.01 },
  genre:        { organic: 0.42, paid: 0.14, relevance: 0.26, freshness: 0.10, fairness: 0.06, exploration: 0.02 },
  suggestions:  { organic: 0.32, paid: 0.08, relevance: 0.38, freshness: 0.10, fairness: 0.07, exploration: 0.05 },
  feed:         { organic: 0.48, paid: 0.05, relevance: 0.32, freshness: 0.10, fairness: 0.03, exploration: 0.02 },
  artists:      { organic: 0.38, paid: 0.12, relevance: 0.20, freshness: 0.06, fairness: 0.14, exploration: 0.10 },
  new_releases: { organic: 0.28, paid: 0.10, relevance: 0.18, freshness: 0.30, fairness: 0.10, exploration: 0.04 },
};

const DEFAULT_WEIGHTS = { organic: 0.45, paid: 0.10, relevance: 0.20, freshness: 0.12, fairness: 0.08, exploration: 0.05 };

// Soft normalization (log scale prevents whales dominating via raw counts)
function softLog(n, base = 1) {
  return Math.log(Math.max(0, Number(n || 0)) + base + 1) * 10;
}

// ── OrganicScore ─────────────────────────────────────────────────────────────
// Pure audience signal: plays, likes, reposts, comments, downloads, sales, followers
export function organicScore(release) {
  const plays = Number(release.plays || 0);
  const likes = Number(release.likes || 0);
  const comments = Number(release.comments || 0);
  const downloads = Number(release.downloads || 0);
  const sales = Number(release.sales || 0);
  const followers = Number(release.followers || 0);
  const reposts = Number(release.reposts || 0);

  const raw =
    softLog(plays) * 1.0 +
    softLog(likes) * 2.5 +
    softLog(reposts) * 3.0 +
    softLog(comments) * 2.0 +
    softLog(downloads) * 3.5 +
    softLog(sales) * 6.0 +
    softLog(followers) * 1.5;

  // Engagement rate bonus: high ratio of engagement vs plays signals quality
  const engagementRate = plays > 0 ? (likes + comments + reposts) / plays : 0;
  const engagementBonus = Math.min(20, engagementRate * 100);

  return Math.min(100, raw + engagementBonus);
}

// ── FreshnessScore ───────────────────────────────────────────────────────────
// Exponential decay — very fresh content gets a big boost, fades over ~30 days
export function freshnessScore(release) {
  const createdAt = new Date(release.created_at || Date.now()).getTime();
  const daysOld = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(100 * Math.exp(-daysOld * 0.12)));
}

// ── RelevanceScore ───────────────────────────────────────────────────────────
// Personalization based on user affinity (genre, followed artists)
export function relevanceScore(release, userAffinity = { genres: new Set(), artistIds: new Set() }) {
  let score = 0;
  if (userAffinity.genres.has(release.genre)) score += 45;
  if (userAffinity.artistIds.has(release.user_id)) score += 35;
  // Partial genre match (e.g. "Tech House" matches "House")
  for (const g of userAffinity.genres) {
    if (release.genre && g && release.genre.toLowerCase().includes(g.toLowerCase().split(" ")[0])) {
      score += 10;
      break;
    }
  }
  return Math.min(100, score);
}

// ── FairnessBoost ────────────────────────────────────────────────────────────
// Equity: bonus for underexposed artists, new content, diverse profiles
export function fairnessBoost(release) {
  let boost = 0;
  const followers = Number(release.followers || 0);
  const plays = Number(release.plays || 0);
  const createdAt = new Date(release.created_at || Date.now()).getTime();
  const daysOld = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);

  // New artist: < 200 followers
  if (followers < 50) boost += 35;
  else if (followers < 200) boost += 20;
  else if (followers < 500) boost += 10;

  // Under-exposed content: < 500 plays
  if (plays < 100) boost += 25;
  else if (plays < 500) boost += 12;
  else if (plays < 2000) boost += 5;

  // Very recent release (<= 3 days)
  if (daysOld <= 1) boost += 30;
  else if (daysOld <= 3) boost += 18;
  else if (daysOld <= 7) boost += 8;

  return Math.min(60, boost);
}

// ── ExplorationBoost ─────────────────────────────────────────────────────────
// Diversity: prevent the same artist from dominating; inject serendipity
export function explorationBoost(release, seenArtistIds = new Set()) {
  let boost = 0;
  if (!seenArtistIds.has(release.user_id)) boost += 15;
  else if (seenArtistIds.size > 3) boost -= 10; // Mild penalty for already-seen artist
  return boost;
}

// ── PaidBoostScore ───────────────────────────────────────────────────────────
// Campaign signal — hard-capped so paid content never exceeds organic ceiling
// A campaign in 'active' status with quality score >= 0.5 qualifies.
export function paidBoostScore(activeCampaigns = []) {
  if (!activeCampaigns.length) return 0;
  const best = activeCampaigns.reduce((acc, c) => {
    const raw = (Number(c.daily_budget_cents || 0) / 100) * Number(c.quality_score || 1.0);
    return Math.max(acc, raw);
  }, 0);
  // Logarithmic cap: €5/day → ~25pts, €20/day → ~40pts, €100/day → ~55pts (hard cap 55)
  return Math.min(55, Math.round(softLog(best, 0) * 1.8));
}

// ── Penalty functions ─────────────────────────────────────────────────────────
export function computePenalties(release, { seenCountThisSession = 0, flaggedSpam = false, lowQuality = false } = {}) {
  let total = 0;
  if (seenCountThisSession >= 3) total += 40;          // Fatigue
  else if (seenCountThisSession >= 2) total += 15;
  if (flaggedSpam) total += 60;                         // Spam flag
  if (lowQuality) total += 30;                          // Poor content quality
  return total;
}

// ── Main scorer ──────────────────────────────────────────────────────────────
export function computeFinalScore(release, {
  page = "discovery",
  userAffinity = { genres: new Set(), artistIds: new Set() },
  activeCampaigns = [],
  seenArtistIds = new Set(),
  seenCountThisSession = 0,
  flaggedSpam = false,
  lowQuality = false,
} = {}) {
  const w = PAGE_WEIGHTS[page] || DEFAULT_WEIGHTS;

  const oScore = organicScore(release);
  const fScore = freshnessScore(release);
  const rScore = relevanceScore(release, userAffinity);
  const pScore = paidBoostScore(activeCampaigns);
  const fBoost = fairnessBoost(release);
  const eBoost = explorationBoost(release, seenArtistIds);
  const penalty = computePenalties(release, { seenCountThisSession, flaggedSpam, lowQuality });

  const raw =
    oScore * w.organic * 100 +
    pScore * w.paid * 100 +
    rScore * w.relevance * 100 +
    fScore * w.freshness * 100 +
    fBoost * (w.fairness + w.exploration) * 100 +
    eBoost * w.exploration * 100 -
    penalty;

  return Math.max(0, Math.round(raw));
}

// ── Artist profile quality scorer ─────────────────────────────────────────────
export function computeProfileScore(user, releases = []) {
  let profile = 0;
  let engagement = 0;
  let growth = 0;
  let quality = 0;

  // Profile completeness (max 40pts)
  if (user.avatar_url || (user.avatar && user.avatar.length > 1)) profile += 8;
  if (user.banner_url) profile += 8;
  if ((user.bio || "").trim().length > 30) profile += 10;
  if ((user.bio || "").trim().length > 100) profile += 4;
  try { const links = JSON.parse(user.social_links || "{}"); if (Object.values(links).filter(Boolean).length > 0) profile += 5; } catch {}
  if (user.location) profile += 3;
  if (user.genre) profile += 2;

  // Content quality (max 30pts)
  if (releases.length >= 1) quality += 8;
  if (releases.length >= 3) quality += 8;
  if (releases.length >= 10) quality += 6;
  const withCover = releases.filter(r => r.cover_url).length;
  const withDescription = releases.filter(r => (r.description || "").length > 30).length;
  if (withCover > 0) quality += Math.min(8, withCover * 2);

  // Engagement score (max 20pts)
  const totalPlays = releases.reduce((a, r) => a + Number(r.plays || 0), 0);
  const totalLikes = releases.reduce((a, r) => a + Number(r.likes || 0), 0);
  if (totalPlays > 100) engagement += 5;
  if (totalPlays > 1000) engagement += 5;
  if (totalLikes > 10) engagement += 5;
  if (totalPlays > 0 && totalLikes / totalPlays > 0.02) engagement += 5;

  // Growth signals (max 10pts)
  const recentRelease = releases.some(r => {
    const days = (Date.now() - new Date(r.created_at).getTime()) / 86400000;
    return days <= 30;
  });
  if (recentRelease) growth += 6;
  if (releases.length > 0) growth += 4;

  const total = profile + engagement + growth + quality;
  const label = total >= 75 ? "premium" : total >= 55 ? "solid" : total >= 35 ? "correct" : "weak";

  return { total_score: total, profile_score: profile, engagement_score: engagement, growth_score: growth, quality_score: quality, label };
}

// ── Artist insights generator ─────────────────────────────────────────────────
export function generateInsights(user, releases = [], campaignStats = []) {
  const insights = [];
  let priority = 1;

  // Profile completeness issues
  if (!user.avatar_url && (!user.avatar || user.avatar.length <= 2)) {
    insights.push({ type: "profile", priority: priority++, title: "Ajoute une photo de profil", body: "Les profils avec une vraie photo reçoivent 3× plus de follows.", action_url: "/settings", action_label: "Modifier le profil" });
  }
  if (!user.banner_url) {
    insights.push({ type: "profile", priority: priority++, title: "Ajoute une bannière", body: "Une bannière personnalisée rend ton profil plus professionnel et mémorable.", action_url: "/settings", action_label: "Modifier le profil" });
  }
  if ((user.bio || "").trim().length < 30) {
    insights.push({ type: "profile", priority: priority++, title: "Complète ta bio", body: "Une bio de qualité aide les auditeurs à te découvrir et à te suivre.", action_url: "/settings", action_label: "Ajouter une bio" });
  }

  // Track-level insights
  for (const release of releases.slice(0, 5)) {
    const plays = Number(release.plays || 0);
    const likes = Number(release.likes || 0);
    const downloads = Number(release.downloads || 0);
    const comments = Number(release.comments || 0);

    if (plays > 50 && likes / plays < 0.01) {
      insights.push({ type: "engagement", priority: priority++, release_id: release.id, title: `"${release.title}" — Peu de likes`, body: "Ton son est écouté mais peu liké. Essaie d'ajouter une description engageante ou d'inviter les auditeurs à réagir.", action_url: `/release/${release.id}`, action_label: "Modifier la release" });
    }
    if (!release.cover_url) {
      insights.push({ type: "quality", priority: priority++, release_id: release.id, title: `"${release.title}" — Pas de cover`, body: "Les sons sans cover reçoivent jusqu'à 60% moins de clics. Ajoute une image maintenant.", action_url: `/release/${release.id}`, action_label: "Ajouter une cover" });
    }
    if ((release.description || "").length < 20) {
      insights.push({ type: "quality", priority: priority++, release_id: release.id, title: `"${release.title}" — Description vide`, body: "Ajoute une description pour le SEO et pour accrocher l'auditeur.", action_url: `/release/${release.id}`, action_label: "Ajouter une description" });
    }
    // Growth opportunity
    if (plays > 200 && likes / plays > 0.05) {
      insights.push({ type: "campaign", priority: priority++, release_id: release.id, title: `"${release.title}" — Bon potentiel`, body: "Ce son convertit très bien. Un boost léger pourrait décupler les écoutes.", action_url: "/campaigns/create", action_label: "Lancer un boost" });
    }
  }

  // No releases yet
  if (releases.length === 0) {
    insights.push({ type: "onboarding", priority: 0, title: "Upload ton premier son", body: "Tu n'as encore rien publié. Partage ta première track ou dubpack pour démarrer.", action_url: "/upload", action_label: "Uploader" });
  }

  // Low publication frequency
  if (releases.length > 0) {
    const lastRelease = releases.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
    const daysSinceLast = (Date.now() - new Date(lastRelease.created_at).getTime()) / 86400000;
    if (daysSinceLast > 60) {
      insights.push({ type: "activity", priority: priority++, title: "Tu n'as pas publié depuis longtemps", body: "Les artistes qui publient régulièrement gardent une meilleure visibilité sur la plateforme.", action_url: "/upload", action_label: "Uploader un son" });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 10);
}

// ── Campaign recommendation ────────────────────────────────────────────────────
export function recommendCampaign(release, user, followers = 0) {
  const plays = Number(release.plays || 0);
  const likes = Number(release.likes || 0);
  const hasCover = !!release.cover_url;
  const hasDescription = (release.description || "").length > 20;
  const engagementRate = plays > 0 ? likes / plays : 0;

  // Pre-flight checklist
  const issues = [];
  if (!hasCover) issues.push({ field: "cover", msg: "Ajoute une cover avant de lancer une campagne — le CTR sera faible sans image." });
  if (!hasDescription) issues.push({ field: "description", msg: "Ajoute une description pour améliorer le taux d'engagement." });
  if (!release.genre) issues.push({ field: "genre", msg: "Renseigne le genre pour un meilleur ciblage." });

  // Recommendation logic
  let recommended = "boost_lite";
  let reason = "Idéal pour découvrir comment la promotion fonctionne avec un petit budget.";
  let estimatedResult = "200–500 impressions supplémentaires.";

  if (followers < 50 || plays < 50) {
    recommended = "boost_lite";
    reason = "Commence par un boost léger pour valider l'intérêt avant d'investir plus.";
  } else if (engagementRate > 0.03 && plays > 200) {
    recommended = "boost_standard";
    reason = "Ton son convertit bien. Un boost standard va amplifier cet élan.";
    estimatedResult = "1 000–3 000 impressions supplémentaires.";
  } else if (followers < 500 && plays < 500) {
    recommended = "profile_boost";
    reason = "Tu as besoin de followers avant d'investir en promotion de tracks.";
    estimatedResult = "50–150 nouveaux followers potentiels.";
  } else if (release.kind === "Dubpack" || release.price_cents > 0) {
    recommended = "genre_targeted";
    reason = "Un dubpack payant mérite un ciblage précis sur les acheteurs potentiels.";
    estimatedResult = "Audience qualifiée, 5–15 ventes potentielles.";
  }

  return { recommended, reason, estimatedResult, issues, readyToLaunch: issues.length === 0 };
}
