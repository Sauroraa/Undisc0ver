// src/dashboards.jsx — Role-based dashboards for Undisc0ver
// Imported by main.jsx. Uses AuthContext, useData, request from main.jsx context.

import React, { useState, useEffect, useContext, createContext, useCallback } from "react";
import {
  BarChart3, Bell, BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  CircleCheck, CreditCard, Download, Eye, FileText, Filter as FilterIcon,
  Home as HomeIcon, Loader2, LogOut, Package, Pause, Play, Plus, RefreshCw,
  Search, Settings, ShieldAlert, ShieldCheck, Sparkles, Tag, Target, Trash,
  Upload, UserPlus, Users, Wallet, X, Zap, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Activity, Clock, Globe, Lock, MessageCircle,
  Music2, Star, Award, Layers, BarChart2, PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight, Info, Flag, Ban, CheckSquare, XSquare,
  DollarSign, Mail, Headphones, Hash, Send, Inbox
} from "lucide-react";

// ── Shared helpers (expect these globals from main.jsx context) ───────────────
// useAuth, useData, request, money, shortNumber, balanceMoney, AvatarImg,
// ReleaseThumbnail, Logo are all defined in main.jsx

// ── MiniSparkline chart (SVG, no dependencies) ────────────────────────────────
function Sparkline({ data = [], color = "#22C55E", height = 32, width = 120 }) {
  if (!data.length) return <svg width={width} height={height} />;
  const values = data.map(d => typeof d === "number" ? d : (d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Simple bar chart (SVG, no dependencies) ───────────────────────────────────
function MiniBarChart({ data = [], color = "#22C55E", height = 60, width = 200 }) {
  if (!data.length) return null;
  const values = data.map(d => typeof d === "number" ? d : (d.value || 0));
  const max = Math.max(...values, 1);
  const barW = Math.floor(width / values.length) - 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * (height - 4));
        const x = i * (width / values.length) + 1;
        const y = height - barH;
        return <rect key={i} x={x} y={y} width={Math.max(2, barW)} height={barH} rx="2" fill={color} opacity="0.8" />;
      })}
    </svg>
  );
}

// ── Stat KPI Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, deltaDir, icon: Icon, color = "#22C55E", series = [], loading = false }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-icon" style={{ background: color + "20", color }}><Icon size={18} /></div>
        <div className="stat-card-label">{label}</div>
      </div>
      <div className="stat-card-value">{loading ? <span className="stat-skeleton" /> : value}</div>
      {(delta !== undefined || series.length > 0) && (
        <div className="stat-card-bottom">
          {delta !== undefined && (
            <span className={`stat-delta ${deltaDir === "up" ? "up" : deltaDir === "down" ? "down" : ""}`}>
              {deltaDir === "up" ? <TrendingUp size={11} /> : deltaDir === "down" ? <TrendingDown size={11} /> : null}
              {delta}
            </span>
          )}
          {series.length > 0 && <Sparkline data={series} color={color} width={80} height={24} />}
        </div>
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  published: "#22c55e", active: "#22c55e", approved: "#22c55e", paid: "#22c55e", resolved: "#22c55e", open: "#3b82f6",
  review: "#f59e0b", under_review: "#f59e0b", pending: "#f59e0b", pending_payment: "#f59e0b",
  draft: "#6b7280", paused: "#6366f1", cancelled: "#6b7280", completed: "#8b5cf6",
  blocked: "#ef4444", rejected: "#ef4444", suspended: "#ef4444", warning: "#f59e0b", critical: "#ef4444", info: "#3b82f6",
};
function StatusBadge({ status, label }) {
  const c = STATUS_COLORS[status] || "#6b7280";
  return <span className="status-badge" style={{ color: c, background: c + "18", border: `1px solid ${c}30` }}>{label || status}</span>;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon = Package, title, text, action, actionHref, onAction }) {
  return (
    <div className="db-empty">
      {Icon && <Icon size={32} />}
      {title && <strong>{title}</strong>}
      {text && <p>{text}</p>}
      {action && (actionHref
        ? <a className="button accent" href={actionHref}>{action}</a>
        : <button className="button accent" onClick={onAction} type="button">{action}</button>
      )}
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────
function AlertCard({ type = "info", title, text }) {
  const icons = { info: Info, warning: AlertTriangle, error: AlertTriangle, success: CheckCircle2 };
  const colors = { info: "#3b82f6", warning: "#f59e0b", error: "#ef4444", success: "#22c55e" };
  const Icon = icons[type] || Info;
  const c = colors[type];
  return (
    <div className="alert-card" style={{ borderColor: c + "44", background: c + "0d" }}>
      <Icon size={16} style={{ color: c, flexShrink: 0 }} />
      <div><strong style={{ color: c }}>{title}</strong>{text && <p>{text}</p>}</div>
    </div>
  );
}

// ── Dashboard layout shell ────────────────────────────────────────────────────
function DashboardShell({ sidebar, children }) {
  return (
    <main className="page dashboard-page">
      <div className="db-shell">
        {sidebar}
        <div className="db-content">{children}</div>
      </div>
    </main>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ title, subtitle, items, section, setSection, footer }) {
  return (
    <aside className="db-sidebar">
      <div className="db-sidebar-head">
        <span className="db-sidebar-title">{title}</span>
        {subtitle && <span className="db-sidebar-sub">{subtitle}</span>}
      </div>
      <nav className="db-sidebar-nav">
        {items.map(([id, label, Icon, roles]) => (
          <button
            key={id}
            type="button"
            className={`db-nav-item ${section === id ? "active" : ""}`}
            onClick={() => setSection(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {footer}
    </aside>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action, onAction, actionIcon: ActionIcon }) {
  return (
    <div className="db-section-header">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action && (
        onAction
          ? <button className="button accent" type="button" onClick={onAction}>{ActionIcon && <ActionIcon size={15} />}{action}</button>
          : null
      )}
    </div>
  );
}

// ── Mini line chart (pure SVG) ────────────────────────────────────────────────
function LineChart({ data = [], color = "#22C55E", height = 120, width = "100%", formatY }) {
  if (!data.length) return <div className="chart-empty">Données insuffisantes</div>;
  const values = data.map(d => d.value || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const W = 600;
  const H = height;
  const pad = { left: 40, right: 12, top: 12, bottom: 24 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const toX = i => pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = v => pad.top + (1 - (v - min) / range) * innerH;

  const pts = data.map((d, i) => `${toX(i)},${toY(d.value || 0)}`).join(" ");
  const areaBot = `${pad.left + innerW},${pad.top + innerH} ${pad.left},${pad.top + innerH}`;
  const areaPath = `${pts} ${areaBot}`;

  // X labels (show first, middle, last)
  const xLabels = data.length >= 2 ? [0, Math.floor(data.length / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => ({
    i, label: data[i].date ? data[i].date.slice(5) : i
  })) : [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width, height, display: "block" }}>
      <defs>
        <linearGradient id={`g_${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPath} fill={`url(#g_${color.replace("#", "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.4)">{label}</text>
      ))}
      {max > 0 && (
        <text x={pad.left - 5} y={pad.top + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,.4)">
          {formatY ? formatY(max) : max.toLocaleString()}
        </text>
      )}
    </svg>
  );
}

// ── Filterable table ──────────────────────────────────────────────────────────
function FilterBar({ value, onChange, placeholder = "Rechercher…", children }) {
  return (
    <div className="db-filter-bar">
      <div className="db-search-wrap"><Search size={14} /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>
      {children}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, text, onConfirm, onCancel, danger = false }) {
  return (
    <div className="db-confirm-overlay">
      <div className="db-confirm-box">
        <AlertTriangle size={24} style={{ color: danger ? "#ef4444" : "#f59e0b" }} />
        <h3>{title}</h3>
        {text && <p>{text}</p>}
        <div className="db-confirm-actions">
          <button className="button ghost" onClick={onCancel} type="button">Annuler</button>
          <button className={`button ${danger ? "danger" : "accent"}`} onClick={onConfirm} type="button">Confirmer</button>
        </div>
      </div>
    </div>
  );
}

// ── Money helper ──────────────────────────────────────────────────────────────
const fmt = (cents) => `€${(Number(cents || 0) / 100).toFixed(2)}`;
const fmtNum = (n) => Number(n || 0).toLocaleString("fr-FR");

// ── Time ago helper ───────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER / ARTIST DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function UserDashboard({ notify, playRelease }) {
  const { user } = window.__undiscover_auth_ctx || {};
  const [section, setSection] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = window.__undiscover_use_data(`/dashboards/user`, [user?.id, refreshKey]);

  if (!user) return <div className="db-auth-required"><Lock size={32} /><p>Connexion requise.</p><a href="/login" className="button accent">Se connecter</a></div>;
  if (loading) return <DashboardShell sidebar={<UserSidebar section={section} setSection={setSection} user={user} />}><div className="db-loading"><Loader2 className="spin" size={28} /></div></DashboardShell>;
  if (error) return <DashboardShell sidebar={<UserSidebar section={section} setSection={setSection} user={user} />}><AlertCard type="error" title="Erreur" text={error} /></DashboardShell>;

  const { stats, releases, purchases, recent_sales, campaigns, series } = data;

  const sidebar = <UserSidebar section={section} setSection={setSection} user={user} />;

  return (
    <DashboardShell sidebar={sidebar}>
      {section === "overview" && <UserOverview stats={stats} releases={releases} series={series} campaigns={campaigns} user={user} onNavigate={setSection} />}
      {section === "tracks" && <UserTracks releases={releases} notify={notify} playRelease={playRelease} onRefresh={() => setRefreshKey(k => k + 1)} />}
      {section === "purchases" && <UserPurchases purchases={purchases} />}
      {section === "sales" && <UserSales sales={recent_sales} stats={stats} />}
      {section === "campaigns" && <UserCampaigns campaigns={campaigns} releases={releases} notify={notify} />}
      {section === "profile" && <UserProfileSection user={user} notify={notify} />}
    </DashboardShell>
  );
}

function UserSidebar({ section, setSection, user }) {
  const items = [
    ["overview", "Vue d'ensemble", HomeIcon],
    ["tracks", "Mes tracks", Music2],
    ["purchases", "Mes achats", Download],
    ["sales", "Mes ventes", Wallet],
    ["campaigns", "Mes campagnes", Zap],
    ["profile", "Mon profil", Users],
  ];
  return (
    <Sidebar
      title="Dashboard"
      subtitle={user?.name}
      items={items}
      section={section}
      setSection={setSection}
      footer={
        <div className="db-sidebar-footer">
          <a href="/upload"><Upload size={14} /> Upload</a>
          <a href="/settings"><Settings size={14} /> Paramètres</a>
          {["staff", "moderator", "admin"].includes(user?.role) && <a href="/staff-dashboard"><ShieldCheck size={14} /> Console</a>}
        </div>
      }
    />
  );
}

function UserOverview({ stats, releases, series, campaigns, user, onNavigate }) {
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const topRelease = [...(releases || [])].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];

  return (
    <div className="db-section">
      <SectionHeader title="Vue d'ensemble" subtitle="Tes stats en un coup d'œil." />

      <div className="stat-grid">
        <StatCard label="Écoutes" value={fmtNum(stats.plays)} icon={Headphones} color="#22c55e" series={series.plays} />
        <StatCard label="Followers" value={fmtNum(stats.followers)} icon={Users} color="#3b82f6" series={series.followers} />
        <StatCard label="Likes reçus" value={fmtNum(stats.likes)} icon={Star} color="#f59e0b" />
        <StatCard label="Revenus" value={fmt(stats.revenue_cents)} icon={Wallet} color="#8b5cf6" />
        <StatCard label="Tracks publiées" value={stats.releases_published} icon={Music2} color="#06b6d4" delta={`${stats.releases_total} total`} />
        <StatCard label="Campagnes actives" value={activeCampaigns} icon={Zap} color="#22c55e" />
      </div>

      {stats.releases_in_review > 0 && (
        <AlertCard type="warning" title={`${stats.releases_in_review} track(s) en cours de modération`} text="Ces tracks seront publiées ou bloquées après revue de l'équipe." />
      )}

      <div className="db-two-col">
        <div className="db-chart-card">
          <div className="chart-head"><BarChart3 size={15} /><span>Écoutes — 30 jours</span></div>
          <LineChart data={series.plays} color="#22c55e" />
        </div>
        <div className="db-chart-card">
          <div className="chart-head"><Users size={15} /><span>Followers — 30 jours</span></div>
          <LineChart data={series.followers} color="#3b82f6" />
        </div>
      </div>

      {topRelease && (
        <div className="db-top-track-card">
          <div className="top-track-label">🏆 Ta meilleure track</div>
          <div className="top-track-content">
            <div className="top-track-cover" style={{ backgroundImage: topRelease.cover_url ? `url(${topRelease.cover_url})` : undefined }}>
              {!topRelease.cover_url && <Music2 size={20} />}
            </div>
            <div>
              <strong>{topRelease.title}</strong>
              <p>{fmtNum(topRelease.plays)} écoutes · {fmtNum(topRelease.likes)} likes · {fmtNum(topRelease.downloads)} téléchargements</p>
            </div>
            <a href={`/release/${topRelease.id}`} className="button ghost">Voir →</a>
          </div>
        </div>
      )}

      {!releases.length && <EmptyState icon={Music2} title="Aucune track uploadée" text="Upload ta première track pour débloquer tes statistiques." action="Uploader" actionHref="/upload" />}
    </div>
  );
}

function UserTracks({ releases, notify, playRelease, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState("");
  const filtered = releases.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "published" && r.moderation_status !== "published") return false;
    if (filter === "draft" && r.moderation_status !== "draft") return false;
    if (filter === "private" && r.visibility !== "private") return false;
    return true;
  });

  const deleteTrack = async (release) => {
    if (!confirm(`Supprimer "${release.title}" ?`)) return;
    setDeleting(release.id);
    try {
      await window.__undiscover_request(`/releases/${release.id}`, { method: "DELETE" });
      notify("Track supprimée.");
      onRefresh();
    } catch (e) { notify(e.message); } finally { setDeleting(""); }
  };

  return (
    <div className="db-section">
      <SectionHeader title="Mes tracks" action="Uploader" actionHref="/upload" actionIcon={Upload} />
      <FilterBar value={search} onChange={setSearch} placeholder="Rechercher une track…">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Toutes</option>
          <option value="published">Publiées</option>
          <option value="draft">Brouillons</option>
          <option value="private">Privées</option>
        </select>
      </FilterBar>

      {!filtered.length ? <EmptyState icon={Music2} title="Aucune track" text="Upload ta première track." action="Uploader" actionHref="/upload" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Genre</th><th>Statut</th><th>Écoutes</th><th>Likes</th><th>Prix</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="db-release-cell">
                      <div className="db-thumb" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>
                        {!r.cover_url && <Music2 size={12} />}
                      </div>
                      <div><strong>{r.title}</strong><small>{r.kind}</small></div>
                    </div>
                  </td>
                  <td><span className="db-tag">{r.genre}</span></td>
                  <td><StatusBadge status={r.moderation_status} /></td>
                  <td>{fmtNum(r.plays)}</td>
                  <td>{fmtNum(r.likes)}</td>
                  <td>{r.free ? "Gratuit" : r.price_cents ? fmt(r.price_cents) : "—"}</td>
                  <td>
                    <div className="db-actions">
                      <a href={`/release/${r.id}`} className="button ghost mini">Voir</a>
                      <button className="button ghost mini danger" onClick={() => deleteTrack(r)} disabled={deleting === r.id}><Trash size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserPurchases({ purchases }) {
  return (
    <div className="db-section">
      <SectionHeader title="Mes achats" subtitle="Contenus achetés et disponibles au téléchargement." />
      {!purchases.length ? <EmptyState icon={Download} title="Aucun achat" text="Explore la plateforme et achète des tracks ou dubpacks." action="Explorer" actionHref="/explore" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Contenu</th><th>Artiste</th><th>Prix payé</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id}>
                  <td><div className="db-release-cell"><div className="db-thumb" style={{ backgroundImage: p.cover_url ? `url(${p.cover_url})` : undefined }}>{!p.cover_url && <Music2 size={12} />}</div><div><strong>{p.title}</strong><small>{p.kind}</small></div></div></td>
                  <td>{p.artist_name}</td>
                  <td>{p.amount_cents > 0 ? fmt(p.amount_cents) : "Gratuit"}</td>
                  <td>{timeAgo(p.created_at)}</td>
                  <td><a href={`/release/${p.release_id}`} className="button ghost mini"><Download size={13} /> Télécharger</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserSales({ sales, stats }) {
  return (
    <div className="db-section">
      <SectionHeader title="Mes ventes" subtitle="Historique des revenus générés par tes tracks." />
      <div className="stat-grid">
        <StatCard label="Revenus totaux" value={fmt(stats.revenue_cents)} icon={Wallet} color="#22c55e" />
        <StatCard label="Ventes" value={fmtNum(stats.sales)} icon={DollarSign} color="#3b82f6" />
      </div>
      {!sales.length ? <EmptyState icon={DollarSign} title="Aucune vente" text="Publie des tracks payantes pour commencer à générer des revenus." action="Uploader" actionHref="/upload" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Acheteur</th><th>Montant</th><th>Date</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.title}</strong></td>
                  <td>{s.buyer_name}</td>
                  <td style={{ color: "#22c55e", fontWeight: 700 }}>{fmt(s.amount_cents)}</td>
                  <td>{timeAgo(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserCampaigns({ campaigns, releases, notify }) {
  return (
    <div className="db-section">
      <SectionHeader title="Mes campagnes" subtitle="Campagnes promotionnelles actives et historique." />
      <div className="db-campaigns-list">
        {!campaigns.length ? (
          <EmptyState icon={Zap} title="Aucune campagne" text="Lance ta première campagne pour promouvoir tes sons." action="Créer une campagne" actionHref="/dashboard#campaigns" />
        ) : campaigns.map(c => (
          <div key={c.id} className="db-campaign-item">
            <div className="db-campaign-main">
              <strong>{c.title}</strong>
              <StatusBadge status={c.status} />
              <span className="db-tag">{c.campaign_type}</span>
            </div>
            <div className="db-campaign-metrics">
              <span><b>{fmtNum(c.impressions)}</b> impressions</span>
              <span><b>{fmtNum(c.clicks)}</b> clics</span>
              <span><b>{fmt(c.budget_cents)}</b> budget</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserProfileSection({ user, notify }) {
  const profileComplete = [
    user.avatar_url || (user.avatar?.length > 2),
    user.banner_url,
    user.bio?.length > 20,
    user.location,
    user.genre,
  ];
  const score = Math.round((profileComplete.filter(Boolean).length / profileComplete.length) * 100);
  return (
    <div className="db-section">
      <SectionHeader title="Mon profil" subtitle="Gère l'apparence de ton profil public." />
      <div className="db-profile-score">
        <div className="profile-score-ring" style={{ "--score": score }}>
          <span>{score}%</span>
          <small>Profil complété</small>
        </div>
        <div className="profile-checklist">
          <p className="db-label">Checklist profil</p>
          {[["Photo de profil", user.avatar_url || user.avatar?.length > 2], ["Bannière", user.banner_url], ["Bio", user.bio?.length > 20], ["Localisation", user.location], ["Genre", user.genre]].map(([label, done]) => (
            <div key={label} className={`check-item ${done ? "done" : ""}`}>
              {done ? <CheckCircle2 size={14} /> : <X size={14} />}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <a className="button accent" href="/settings">Modifier mon profil</a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRO / ARTIST PRO DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function ProDashboard({ notify, playRelease }) {
  const { user } = window.__undiscover_auth_ctx || {};
  const [section, setSection] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = window.__undiscover_use_data(`/dashboards/pro`, [user?.id, refreshKey]);

  if (!user) return <div className="db-auth-required"><Lock size={32} /><p>Connexion requise.</p><a href="/login" className="button accent">Se connecter</a></div>;
  if (error?.includes("upgrade_required") || (!user.pro && !["label","staff","moderator","admin"].includes(user.role))) {
    return (
      <main className="page">
        <div className="db-upgrade-wall">
          <Star size={40} style={{ color: "#22c55e" }} />
          <h2>Dashboard Pro</h2>
          <p>Passe à Artist Pro pour accéder aux analytics avancés, au Campaign Center, au Growth Center et à tous les outils professionnels.</p>
          <a href="/pricing" className="button accent">Voir les offres Pro</a>
        </div>
      </main>
    );
  }

  if (loading) return <DashboardShell sidebar={<ProSidebar section={section} setSection={setSection} user={user} />}><div className="db-loading"><Loader2 className="spin" size={28} /></div></DashboardShell>;
  if (error) return <DashboardShell sidebar={<ProSidebar section={section} setSection={setSection} user={user} />}><AlertCard type="error" title="Erreur" text={error} /></DashboardShell>;

  const { stats, top_releases, all_releases, sales, download_logs, campaigns, takedown_reports, profile_score, goals, insights, series } = data;

  return (
    <DashboardShell sidebar={<ProSidebar section={section} setSection={setSection} user={user} />}>
      {section === "overview" && <ProOverview stats={stats} series={series} top_releases={top_releases} insights={insights} campaigns={campaigns} />}
      {section === "analytics" && <ProAnalytics stats={stats} series={series} top_releases={top_releases} />}
      {section === "tracks" && <ProTracks releases={all_releases} notify={notify} playRelease={playRelease} onRefresh={() => setRefreshKey(k => k + 1)} />}
      {section === "campaigns" && <ProCampaigns campaigns={campaigns} releases={all_releases} notify={notify} onRefresh={() => setRefreshKey(k => k + 1)} />}
      {section === "revenue" && <ProRevenue stats={stats} sales={sales} series={series} />}
      {section === "security" && <ProSecurity download_logs={download_logs} takedown_reports={takedown_reports} />}
      {section === "growth" && <ProGrowth goals={goals} insights={insights} profile_score={profile_score} />}
    </DashboardShell>
  );
}

function ProSidebar({ section, setSection, user }) {
  const items = [
    ["overview", "Vue d'ensemble", HomeIcon],
    ["analytics", "Analytics", BarChart3],
    ["tracks", "Tracks & Dubpacks", Music2],
    ["campaigns", "Campagnes", Zap],
    ["revenue", "Revenus", Wallet],
    ["growth", "Growth Center", TrendingUp],
    ["security", "Sécurité & Copyright", ShieldCheck],
  ];
  return (
    <Sidebar title="Pro Dashboard" subtitle={user?.name} items={items} section={section} setSection={setSection}
      footer={<div className="db-sidebar-footer"><a href="/upload"><Upload size={14} /> Upload</a><a href="/settings"><Settings size={14} /> Paramètres</a><a href="/dashboard"><HomeIcon size={14} /> Dashboard simple</a></div>}
    />
  );
}

function ProOverview({ stats, series, top_releases, insights, campaigns }) {
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  return (
    <div className="db-section">
      <SectionHeader title="Vue d'ensemble Pro" subtitle="Performances globales de ton catalogue." />
      <div className="stat-grid stat-grid-6">
        <StatCard label="Écoutes totales" value={fmtNum(stats.plays)} icon={Headphones} color="#22c55e" series={series.plays} />
        <StatCard label="Followers" value={fmtNum(stats.followers)} icon={Users} color="#3b82f6" delta={`+${stats.new_followers_7d} cette semaine`} deltaDir="up" series={series.followers} />
        <StatCard label="Likes" value={fmtNum(stats.likes)} icon={Star} color="#f59e0b" />
        <StatCard label="Revenus totaux" value={fmt(stats.revenue_cents)} icon={Wallet} color="#8b5cf6" series={series.revenue} />
        <StatCard label="Revenus (30j)" value={fmt(stats.revenue_30d)} icon={DollarSign} color="#22c55e" />
        <StatCard label="Campagnes actives" value={activeCampaigns} icon={Zap} color="#06b6d4" />
      </div>

      <div className="db-two-col">
        <div className="db-chart-card">
          <div className="chart-head"><Headphones size={15} /><span>Écoutes — 30 jours</span></div>
          <LineChart data={series.plays} color="#22c55e" />
        </div>
        <div className="db-chart-card">
          <div className="chart-head"><DollarSign size={15} /><span>Revenus — 30 jours</span></div>
          <LineChart data={series.revenue} color="#8b5cf6" formatY={v => `€${(v/100).toFixed(0)}`} />
        </div>
      </div>

      {insights?.length > 0 && (
        <div className="db-insights-strip">
          <div className="insights-head"><Sparkles size={14} /><span>Insights</span></div>
          <div className="insights-list">
            {insights.slice(0, 3).map(i => (
              <div key={i.id} className="insight-pill">
                <span>{i.title}</span>
                {i.action_url && <a href={i.action_url}>{i.action_label || "→"}</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="db-top-releases">
        <div className="chart-head"><Music2 size={15} /><span>Top tracks</span></div>
        {top_releases.slice(0, 5).map((r, i) => (
          <div key={r.id} className="db-top-release-row">
            <span className="rank">#{i + 1}</span>
            <div className="db-thumb" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={10} />}</div>
            <div className="rel-info"><strong>{r.title}</strong><small>{r.genre} · {r.kind}</small></div>
            <span>{fmtNum(r.plays)} écoutes</span>
            <span>{fmtNum(r.likes)} likes</span>
            <span style={{ color: "#22c55e" }}>{fmt(r.revenue_cents)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProAnalytics({ stats, series, top_releases }) {
  const [period, setPeriod] = useState("30d");
  return (
    <div className="db-section">
      <SectionHeader title="Analytics avancés" subtitle="Performances détaillées de ton catalogue." />
      <div className="period-tabs">
        {["7d","30d","90d"].map(p => <button key={p} className={`period-tab ${period===p?"active":""}`} onClick={() => setPeriod(p)} type="button">{p}</button>)}
      </div>

      <div className="stat-grid">
        <StatCard label="Écoutes" value={fmtNum(stats.plays)} icon={Headphones} color="#22c55e" />
        <StatCard label="Téléchargements" value={fmtNum(stats.downloads)} icon={Download} color="#3b82f6" />
        <StatCard label="Ventes" value={fmtNum(stats.sales)} icon={DollarSign} color="#f59e0b" />
        <StatCard label="Commentaires" value={fmtNum(stats.comments)} icon={MessageCircle} color="#8b5cf6" />
        <StatCard label="Followers" value={fmtNum(stats.followers)} icon={Users} color="#06b6d4" />
        <StatCard label="Nouveaux followers (7j)" value={fmtNum(stats.new_followers_7d)} icon={UserPlus} color="#22c55e" />
      </div>

      <div className="db-two-col">
        <div className="db-chart-card">
          <div className="chart-head"><Headphones size={15} /><span>Écoutes dans le temps</span></div>
          <LineChart data={series.plays} color="#22c55e" />
        </div>
        <div className="db-chart-card">
          <div className="chart-head"><Users size={15} /><span>Croissance followers</span></div>
          <LineChart data={series.followers} color="#3b82f6" />
        </div>
      </div>

      <div className="db-chart-card">
        <div className="chart-head"><DollarSign size={15} /><span>Revenus dans le temps</span></div>
        <LineChart data={series.revenue} color="#8b5cf6" formatY={v => `€${(v/100).toFixed(0)}`} height={100} />
      </div>

      <div className="db-table-wrap">
        <div className="chart-head"><Music2 size={15} /><span>Performance par track</span></div>
        <table className="db-table">
          <thead><tr><th>Track</th><th>Écoutes</th><th>Likes</th><th>Downloads</th><th>Ventes</th><th>Revenus</th><th>Taux like</th></tr></thead>
          <tbody>
            {top_releases.map(r => {
              const likeRate = r.plays > 0 ? ((r.likes / r.plays) * 100).toFixed(1) : 0;
              return (
                <tr key={r.id}>
                  <td><div className="db-release-cell"><div className="db-thumb sm" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={10} />}</div><span>{r.title}</span></div></td>
                  <td>{fmtNum(r.plays)}</td>
                  <td>{fmtNum(r.likes)}</td>
                  <td>{fmtNum(r.downloads)}</td>
                  <td>{fmtNum(r.sales)}</td>
                  <td style={{ color: "#22c55e" }}>{fmt(r.revenue_cents)}</td>
                  <td><span className={`rate-badge ${likeRate >= 5 ? "good" : likeRate >= 2 ? "ok" : "low"}`}>{likeRate}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProTracks({ releases, notify, playRelease, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState("");

  const filtered = releases.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "published" && r.moderation_status !== "published") return false;
    if (filter === "draft" && r.moderation_status !== "draft") return false;
    if (filter === "paid" && (!r.price_cents || r.free)) return false;
    if (filter === "dubpacks" && r.kind !== "Dubpack") return false;
    return true;
  });

  const dubpacks = filter === "all" ? releases.filter(r => r.kind === "Dubpack") : filtered.filter(r => r.kind === "Dubpack");

  const deleteRelease = async (release) => {
    if (!confirm(`Supprimer "${release.title}" ?`)) return;
    setDeleting(release.id);
    try { await window.__undiscover_request(`/releases/${release.id}`, { method: "DELETE" }); notify("Release supprimée."); onRefresh(); }
    catch (e) { notify(e.message); } finally { setDeleting(""); }
  };

  return (
    <div className="db-section">
      <SectionHeader title="Tracks & Dubpacks" action="Uploader" actionHref="/upload" actionIcon={Upload} />
      <FilterBar value={search} onChange={setSearch} placeholder="Rechercher…">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Toutes</option>
          <option value="published">Publiées</option>
          <option value="draft">Brouillons</option>
          <option value="paid">Payantes</option>
          <option value="dubpacks">Dubpacks</option>
        </select>
      </FilterBar>

      {!filtered.length ? <EmptyState icon={Music2} title="Aucune track" action="Uploader" actionHref="/upload" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Type</th><th>Statut</th><th>Écoutes</th><th>Likes</th><th>DL</th><th>Ventes</th><th>Revenus</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><div className="db-release-cell"><div className="db-thumb" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={12} />}</div><div><strong>{r.title}</strong><small>{r.kind}</small></div></div></td>
                  <td><span className="db-tag">{r.genre}</span></td>
                  <td><StatusBadge status={r.moderation_status} /></td>
                  <td>{fmtNum(r.plays)}</td>
                  <td>{fmtNum(r.likes)}</td>
                  <td>{fmtNum(r.downloads)}</td>
                  <td>{fmtNum(r.sales)}</td>
                  <td style={{ color: "#22c55e" }}>{fmt(r.revenue_cents)}</td>
                  <td><div className="db-actions"><a href={`/release/${r.id}`} className="button ghost mini">Voir</a><button className="button ghost mini danger" onClick={() => deleteRelease(r)} disabled={deleting === r.id}><Trash size={12} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProCampaigns({ campaigns, releases, notify, onRefresh }) {
  const [actionBusy, setActionBusy] = useState("");
  const runAction = async (campaign, action) => {
    setActionBusy(`${campaign.id}:${action}`);
    try {
      if (action === "pause") await window.__undiscover_request(`/campaigns/${campaign.id}/pause`, { method: "POST" });
      else if (action === "resume") await window.__undiscover_request(`/campaigns/${campaign.id}/resume`, { method: "POST" });
      else if (action === "cancel") { if (!confirm("Annuler cette campagne ?")) return; await window.__undiscover_request(`/campaigns/${campaign.id}/cancel`, { method: "POST" }); }
      notify("Campagne mise à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setActionBusy(""); }
  };

  const active = campaigns.filter(c => c.status === "active");
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalSpend = campaigns.reduce((s, c) => s + (c.budget_spent_cents || 0), 0);

  return (
    <div className="db-section">
      <SectionHeader title="Campagnes Pro" subtitle="Gestion complète de tes campagnes promotionnelles." />
      <div className="stat-grid">
        <StatCard label="Campagnes actives" value={active.length} icon={Zap} color="#22c55e" />
        <StatCard label="Impressions totales" value={fmtNum(totalImpressions)} icon={Eye} color="#3b82f6" />
        <StatCard label="Clics totaux" value={fmtNum(totalClicks)} icon={Activity} color="#f59e0b" />
        <StatCard label="Budget dépensé" value={fmt(totalSpend)} icon={DollarSign} color="#8b5cf6" />
      </div>
      <a href="/dashboard#campaigns" className="button accent" style={{ marginBottom: 16 }}><Plus size={15} /> Nouvelle campagne</a>
      {!campaigns.length ? <EmptyState icon={Zap} title="Aucune campagne" text="Lance ta première campagne pour booster tes écoutes." /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Campagne</th><th>Type</th><th>Statut</th><th>Impressions</th><th>Clics</th><th>CTR</th><th>Budget</th><th>Actions</th></tr></thead>
            <tbody>
              {campaigns.map(c => {
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={c.id}>
                    <td><strong>{c.title}</strong></td>
                    <td><span className="db-tag">{c.campaign_type}</span></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{fmtNum(c.impressions)}</td>
                    <td>{fmtNum(c.clicks)}</td>
                    <td><span className={`rate-badge ${parseFloat(ctr) >= 2 ? "good" : "ok"}`}>{ctr}%</span></td>
                    <td>{fmt(c.budget_cents)}</td>
                    <td>
                      <div className="db-actions">
                        {c.status === "active" && <button className="button ghost mini" onClick={() => runAction(c, "pause")} disabled={actionBusy === `${c.id}:pause`}><Pause size={12} /></button>}
                        {c.status === "paused" && <button className="button ghost mini" onClick={() => runAction(c, "resume")} disabled={actionBusy === `${c.id}:resume`}><Play size={12} /></button>}
                        {["active","paused"].includes(c.status) && <button className="button ghost mini danger" onClick={() => runAction(c, "cancel")} disabled={actionBusy === `${c.id}:cancel`}><X size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProRevenue({ stats, sales, series }) {
  return (
    <div className="db-section">
      <SectionHeader title="Revenus & Ventes" subtitle="Historique complet de tes revenus." />
      <div className="stat-grid">
        <StatCard label="Revenus totaux" value={fmt(stats.revenue_cents)} icon={Wallet} color="#22c55e" />
        <StatCard label="Revenus (30j)" value={fmt(stats.revenue_30d)} icon={DollarSign} color="#3b82f6" />
        <StatCard label="Ventes tracks" value={fmtNum(stats.sales)} icon={Music2} color="#f59e0b" />
        <StatCard label="Dubpacks vendus" value={fmtNum(stats.dubpacks_total)} icon={Package} color="#8b5cf6" />
      </div>
      <div className="db-chart-card">
        <div className="chart-head"><DollarSign size={15} /><span>Revenus — 30 jours</span></div>
        <LineChart data={series.revenue} color="#22c55e" formatY={v => `€${(v/100).toFixed(0)}`} />
      </div>
      {!sales.length ? <EmptyState icon={DollarSign} title="Aucune vente" text="Publie des tracks payantes pour commencer." /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Acheteur</th><th>Montant</th><th>Date</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}><td><strong>{s.title}</strong></td><td>{s.buyer_name}</td><td style={{ color:"#22c55e", fontWeight:700 }}>{fmt(s.amount_cents)}</td><td>{timeAgo(s.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProSecurity({ download_logs, takedown_reports }) {
  return (
    <div className="db-section">
      <SectionHeader title="Sécurité & Copyright" subtitle="Anti-leak, watermarks et signalements copyright." />
      {takedown_reports?.length > 0 && (
        <AlertCard type="warning" title={`${takedown_reports.length} signalement(s) copyright en cours`} text="Vérifie les détails et réponds rapidement pour protéger tes droits." />
      )}
      <div className="db-table-wrap">
        <div className="chart-head"><Download size={15} /><span>Logs de téléchargement</span></div>
        {!download_logs.length ? <EmptyState icon={ShieldCheck} title="Aucun téléchargement enregistré" /> : (
          <table className="db-table">
            <thead><tr><th>Track</th><th>Utilisateur</th><th>Watermark ID</th><th>Date</th></tr></thead>
            <tbody>
              {download_logs.map(l => (
                <tr key={l.id}><td>{l.title}</td><td>{l.user_name || "Anonyme"}</td><td><code className="wm-id">{l.watermark_id}</code></td><td>{timeAgo(l.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProGrowth({ goals, insights, profile_score }) {
  const labelColors = { weak: "#ef4444", correct: "#f59e0b", solid: "#10b981", premium: "#22c55e" };
  return (
    <div className="db-section">
      <SectionHeader title="Growth Center" subtitle="Objectifs, insights et recommandations personnalisées." />
      {profile_score && (
        <div className="db-profile-score-full">
          <div className="psf-head">
            <div><span className="db-label">Score profil</span><strong className="psf-score" style={{ color: labelColors[profile_score.label] }}>{profile_score.total_score}<em>/100</em></strong></div>
            <span className="psf-label" style={{ color: labelColors[profile_score.label] }}>{profile_score.label}</span>
          </div>
          <div className="psf-bars">
            {[["Profil", profile_score.profile_score, 40], ["Engagement", profile_score.engagement_score, 20], ["Croissance", profile_score.growth_score, 10], ["Qualité", profile_score.quality_score, 30]].map(([k, v, max]) => (
              <div key={k} className="psf-bar-row"><span>{k}</span><div className="psf-bar"><div className="psf-fill" style={{ width: `${Math.round(v/max*100)}%` }} /></div><em>{v}/{max}</em></div>
            ))}
          </div>
        </div>
      )}

      {goals?.length > 0 && (
        <div className="db-goals-panel">
          <div className="chart-head"><Target size={14} /><span>Objectifs artiste</span></div>
          <div className="goals-grid">
            {goals.map(g => (
              <div key={g.id} className={`goal-card ${g.status === "completed" ? "completed" : ""}`}>
                {g.status === "completed" ? <CheckCircle2 size={16} style={{ color: "#22c55e" }} /> : <Target size={16} style={{ color: "#3b82f6" }} />}
                <div><strong>{g.label || g.goal_type}</strong><span>{g.current_value}/{g.target_value}</span></div>
                <div className="goal-bar"><div className="goal-fill" style={{ width: `${Math.min(100, Math.round((g.current_value/Math.max(g.target_value,1))*100))}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights?.length > 0 && (
        <div className="db-insights-full">
          <div className="chart-head"><Sparkles size={14} /><span>Recommandations</span></div>
          <div className="insights-grid">
            {insights.map(i => (
              <div key={i.id} className="insight-card">
                <strong>{i.title}</strong>
                <p>{i.body}</p>
                {i.action_url && <a href={i.action_url} className="insight-action">{i.action_label || "Voir"} →</a>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function StaffDashboard({ notify }) {
  const { user } = window.__undiscover_auth_ctx || {};
  const [section, setSection] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = window.__undiscover_use_data(`/dashboards/staff`, [user?.id, refreshKey]);

  if (!user) return <div className="db-auth-required"><Lock size={32} /><p>Accès refusé.</p></div>;
  if (!["staff", "moderator", "admin"].includes(user.role)) return <div className="db-auth-required"><ShieldAlert size={32} /><p>Accès Staff requis.</p></div>;

  const refresh = () => setRefreshKey(k => k + 1);
  const items = [
    ["overview", "Vue d'ensemble", HomeIcon],
    ["tickets", "Support", MessageCircle],
    ["releases", "Contenus en attente", Package],
    ["campaigns", "Campagnes à vérifier", Zap],
    ["activity", "Activité", Activity],
  ];

  return (
    <DashboardShell sidebar={
      <Sidebar title="Staff Console" subtitle={user.role} items={items} section={section} setSection={setSection}
        footer={<div className="db-sidebar-footer"><span className={`role-chip role-${user.role}`}>{user.role}</span><a href="/dashboard">Dashboard artiste</a></div>}
      />
    }>
      {loading ? <div className="db-loading"><Loader2 className="spin" size={28} /></div> :
       error ? <AlertCard type="error" title="Erreur" text={error} /> : (
        <>
          {section === "overview" && <StaffOverview data={data} />}
          {section === "tickets" && <StaffTickets tickets={data.tickets} notify={notify} onRefresh={refresh} />}
          {section === "releases" && <StaffPendingReleases releases={data.pending_releases} notify={notify} onRefresh={refresh} />}
          {section === "campaigns" && <StaffPendingCampaigns campaigns={data.pending_campaigns} notify={notify} onRefresh={refresh} />}
          {section === "activity" && <StaffActivity series={data.activity_series} />}
        </>
      )}
    </DashboardShell>
  );
}

function StaffOverview({ data }) {
  const { overview } = data;
  return (
    <div className="db-section">
      <SectionHeader title="Vue d'ensemble Staff" subtitle="Activité opérationnelle de la plateforme." />
      <div className="stat-grid">
        <StatCard label="Utilisateurs" value={fmtNum(overview.users_total)} icon={Users} color="#22c55e" delta={`+${overview.users_week} cette semaine`} deltaDir="up" />
        <StatCard label="Tickets ouverts" value={overview.tickets_open} icon={MessageCircle} color={overview.tickets_open > 5 ? "#ef4444" : "#f59e0b"} />
        <StatCard label="Contenus en revue" value={overview.releases_pending} icon={Package} color={overview.releases_pending > 3 ? "#ef4444" : "#f59e0b"} />
        <StatCard label="Campagnes à vérifier" value={overview.campaigns_pending} icon={Zap} color={overview.campaigns_pending > 0 ? "#f59e0b" : "#22c55e"} />
        <StatCard label="Signalements ouverts" value={overview.takedowns_open} icon={Flag} color={overview.takedowns_open > 0 ? "#ef4444" : "#22c55e"} />
        <StatCard label="Tickets résolus (7j)" value={overview.tickets_resolved_week} icon={CheckCircle2} color="#22c55e" />
      </div>
      {overview.releases_pending > 0 && <AlertCard type="warning" title={`${overview.releases_pending} release(s) attendent votre modération`} />}
      {overview.campaigns_pending > 0 && <AlertCard type="info" title={`${overview.campaigns_pending} campagne(s) attendent votre validation`} />}
    </div>
  );
}

function StaffTickets({ tickets, notify, onRefresh }) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const updateTicket = async (id, status) => {
    setBusy(id);
    try { await window.__undiscover_request(`/dashboards/staff/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); notify("Ticket mis à jour."); onRefresh(); }
    catch (e) { notify(e.message); } finally { setBusy(""); }
  };
  const filtered = tickets.filter(t => !search || t.topic?.toLowerCase().includes(search) || t.user_name?.toLowerCase().includes(search));
  return (
    <div className="db-section">
      <SectionHeader title="Support utilisateurs" subtitle="Tickets en cours et demandes d'aide." />
      <FilterBar value={search} onChange={setSearch} placeholder="Rechercher un ticket…" />
      {!filtered.length ? <EmptyState icon={MessageCircle} title="Aucun ticket ouvert" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Utilisateur</th><th>Sujet</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>{t.user_name || t.email}</td>
                  <td><strong>{t.topic}</strong></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{timeAgo(t.created_at)}</td>
                  <td>
                    <div className="db-actions">
                      {t.status !== "resolved" && <button className="button ghost mini" onClick={() => updateTicket(t.id, "resolved")} disabled={busy === t.id}><CheckSquare size={12} /> Résoudre</button>}
                      {t.status !== "closed" && <button className="button ghost mini" onClick={() => updateTicket(t.id, "closed")} disabled={busy === t.id}><X size={12} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffPendingReleases({ releases, notify, onRefresh }) {
  const [busy, setBusy] = useState("");
  const action = async (id, type) => {
    setBusy(id);
    try {
      await window.__undiscover_request(`/dashboards/staff/releases/${id}/${type}`, { method: "POST", body: JSON.stringify({ reason: "Modéré par staff" }) });
      notify(`Release ${type === "approve" ? "approuvée" : "refusée"}.`); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };
  return (
    <div className="db-section">
      <SectionHeader title="Contenus en attente de modération" />
      {!releases.length ? <EmptyState icon={Package} title="File vide" text="Aucun contenu en attente de modération." /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Artiste</th><th>Type</th><th>Envoyé</th><th>Actions</th></tr></thead>
            <tbody>
              {releases.map(r => (
                <tr key={r.id}>
                  <td><div className="db-release-cell"><div className="db-thumb" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={10} />}</div><strong>{r.title}</strong></div></td>
                  <td>{r.artist_name}</td>
                  <td><span className="db-tag">{r.kind}</span></td>
                  <td>{timeAgo(r.created_at)}</td>
                  <td>
                    <div className="db-actions">
                      <button className="button ghost mini" onClick={() => action(r.id, "approve")} disabled={busy === r.id}><CheckSquare size={12} /> Approuver</button>
                      <button className="button ghost mini danger" onClick={() => action(r.id, "reject")} disabled={busy === r.id}><XSquare size={12} /> Refuser</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffPendingCampaigns({ campaigns, notify, onRefresh }) {
  const [busy, setBusy] = useState("");
  const [rejectId, setRejectId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const approve = async (id) => {
    setBusy(id);
    try { await window.__undiscover_request(`/dashboards/staff/campaigns/${id}/approve`, { method: "POST" }); notify("Campagne approuvée."); onRefresh(); }
    catch (e) { notify(e.message); } finally { setBusy(""); }
  };
  const reject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(rejectId);
    try { await window.__undiscover_request(`/dashboards/staff/campaigns/${rejectId}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectReason }) }); notify("Campagne refusée."); setRejectId(""); onRefresh(); }
    catch (e) { notify(e.message); } finally { setBusy(""); }
  };

  return (
    <div className="db-section">
      <SectionHeader title="Campagnes à valider" subtitle="Validez le contenu avant diffusion." />
      {rejectId && (
        <div className="db-inline-form">
          <p>Raison du refus</p>
          <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ex: Contenu non conforme…" />
          <div className="db-actions"><button className="button ghost" onClick={() => setRejectId("")} type="button">Annuler</button><button className="button danger" onClick={reject} disabled={busy === rejectId} type="button">Confirmer le refus</button></div>
        </div>
      )}
      {!campaigns.length ? <EmptyState icon={Zap} title="Aucune campagne à valider" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Campagne</th><th>Artiste</th><th>Budget</th><th>Type</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong>{c.release_title && <small> · {c.release_title}</small>}</td>
                  <td>{c.artist_name}</td>
                  <td>{fmt(c.budget_cents)}</td>
                  <td><span className="db-tag">{c.campaign_type}</span></td>
                  <td>{timeAgo(c.created_at)}</td>
                  <td>
                    <div className="db-actions">
                      <button className="button ghost mini" onClick={() => approve(c.id)} disabled={busy === c.id}><CheckSquare size={12} /> Approuver</button>
                      <button className="button ghost mini danger" onClick={() => { setRejectId(c.id); setRejectReason(""); }} disabled={busy === c.id}><XSquare size={12} /> Refuser</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffActivity({ series }) {
  return (
    <div className="db-section">
      <SectionHeader title="Activité plateforme" subtitle="Uploads et activité sur 14 jours." />
      <div className="db-chart-card">
        <div className="chart-head"><Activity size={15} /><span>Uploads par jour</span></div>
        <LineChart data={series} color="#22c55e" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODERATOR DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function ModeratorDashboard({ notify }) {
  const { user } = window.__undiscover_auth_ctx || {};
  const [section, setSection] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = window.__undiscover_use_data(`/dashboards/moderator`, [user?.id, refreshKey]);

  if (!user || !["moderator", "admin"].includes(user.role)) return <div className="db-auth-required"><ShieldAlert size={32} /><p>Accès Modérateur requis.</p></div>;

  const refresh = () => setRefreshKey(k => k + 1);
  const items = [
    ["overview", "Vue d'ensemble", HomeIcon],
    ["reports", "Signalements", Flag],
    ["releases", "Contenus suspects", ShieldAlert],
    ["campaigns", "Campagnes", Zap],
    ["security", "Logs sécurité", Lock],
    ["history", "Historique", FileText],
  ];

  return (
    <DashboardShell sidebar={
      <Sidebar title="Console Modération" subtitle={user.role} items={items} section={section} setSection={setSection}
        footer={<div className="db-sidebar-footer"><span className={`role-chip role-${user.role}`}>{user.role}</span><a href="/dashboard">Dashboard artiste</a></div>}
      />
    }>
      {loading ? <div className="db-loading"><Loader2 className="spin" size={28} /></div> :
       error ? <AlertCard type="error" title="Erreur" text={error} /> : (
        <>
          {section === "overview" && <ModOverview data={data} />}
          {section === "reports" && <ModReports reports={data.reports} notify={notify} onRefresh={refresh} />}
          {section === "releases" && <ModReleases releases={data.suspected_releases} notify={notify} onRefresh={refresh} />}
          {section === "campaigns" && <StaffPendingCampaigns campaigns={data.pending_campaigns} notify={notify} onRefresh={refresh} />}
          {section === "security" && <ModSecurityLogs logs={data.security_logs} />}
          {section === "history" && <ModAuditLog log={data.audit_log} />}
        </>
      )}
    </DashboardShell>
  );
}

function ModOverview({ data }) {
  const { overview, reports_series } = data;
  return (
    <div className="db-section">
      <SectionHeader title="Console Modération" subtitle="File de modération et alertes." />
      <div className="stat-grid">
        <StatCard label="Signalements ouverts" value={overview.reports_open} icon={Flag} color={overview.reports_open > 0 ? "#ef4444" : "#22c55e"} />
        <StatCard label="Tracks en revue" value={overview.releases_in_review} icon={Package} color="#f59e0b" />
        <StatCard label="Tracks bloquées" value={overview.releases_blocked} icon={Ban} color="#ef4444" />
        <StatCard label="Campagnes à valider" value={overview.campaigns_pending} icon={Zap} color="#f59e0b" />
        <StatCard label="Alertes sécurité (7j)" value={overview.security_warnings} icon={ShieldAlert} color={overview.security_warnings > 0 ? "#ef4444" : "#22c55e"} />
      </div>
      {overview.reports_open > 0 && <AlertCard type="error" title={`${overview.reports_open} signalement(s) urgents en attente`} text="Traitez rapidement pour respecter les délais DMCA." />}
      <div className="db-chart-card">
        <div className="chart-head"><Flag size={15} /><span>Signalements — 30 jours</span></div>
        <LineChart data={reports_series} color="#ef4444" />
      </div>
    </div>
  );
}

function ModReports({ reports, notify, onRefresh }) {
  const [busy, setBusy] = useState("");
  const action = async (id, act) => {
    setBusy(id);
    try {
      await window.__undiscover_request(`/dashboards/moderator/action`, { method: "POST", body: JSON.stringify({ entity_type: "report", entity_id: id, action: act }) });
      notify(`Signalement ${act === "approve" ? "résolu" : "rejeté"}.`); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };
  return (
    <div className="db-section">
      <SectionHeader title="File de signalements" subtitle="Signalements copyright et abus." />
      {!reports.length ? <EmptyState icon={Flag} title="Aucun signalement" text="File vide. Beau travail." /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Artiste</th><th>Signalé par</th><th>Raison</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.release_title}</strong></td>
                  <td>{r.artist_name}</td>
                  <td>{r.reporter_name || "Anonyme"}</td>
                  <td>{r.reason}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{timeAgo(r.created_at)}</td>
                  <td>
                    <div className="db-actions">
                      {r.status === "pending" && <>
                        <button className="button ghost mini" onClick={() => action(r.id, "approve")} disabled={busy === r.id}><CheckSquare size={12} /> Résoudre</button>
                        <button className="button ghost mini" onClick={() => action(r.id, "reject")} disabled={busy === r.id}><XSquare size={12} /> Rejeter</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModReleases({ releases, notify, onRefresh }) {
  const [busy, setBusy] = useState("");
  const action = async (id, act) => {
    setBusy(id);
    try {
      await window.__undiscover_request(`/dashboards/moderator/action`, { method: "POST", body: JSON.stringify({ entity_type: "release", entity_id: id, action: act }) });
      notify("Contenu mis à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };
  return (
    <div className="db-section">
      <SectionHeader title="Contenus suspects" subtitle="Tracks en revue, bloquées ou avec signalements." />
      {!releases.length ? <EmptyState icon={Package} title="Aucun contenu suspect" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Artiste</th><th>Statut</th><th>Signalements</th><th>Scan</th><th>Actions</th></tr></thead>
            <tbody>
              {releases.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.title}</strong></td>
                  <td>{r.artist_name}</td>
                  <td><StatusBadge status={r.moderation_status} /></td>
                  <td>{r.report_count > 0 ? <span style={{ color: "#ef4444", fontWeight: 700 }}>{r.report_count}</span> : "—"}</td>
                  <td><StatusBadge status={r.scan_status || "unknown"} /></td>
                  <td>
                    <div className="db-actions">
                      <a href={`/release/${r.id}`} className="button ghost mini"><Eye size={12} /></a>
                      {r.moderation_status !== "published" && <button className="button ghost mini" onClick={() => action(r.id, "approve")} disabled={busy === r.id}><CheckSquare size={12} /></button>}
                      {r.moderation_status !== "blocked" && <button className="button ghost mini danger" onClick={() => action(r.id, "block")} disabled={busy === r.id}><Ban size={12} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModSecurityLogs({ logs }) {
  return (
    <div className="db-section">
      <SectionHeader title="Logs de sécurité" subtitle="Alertes et comportements anormaux détectés." />
      {!logs.length ? <EmptyState icon={ShieldCheck} title="Aucune alerte sécurité récente" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Action</th><th>Utilisateur</th><th>Sévérité</th><th>IP (hash)</th><th>Date</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><code>{l.action}</code></td>
                  <td>{l.user_name || "Anonyme"}</td>
                  <td><StatusBadge status={l.severity} /></td>
                  <td><code className="wm-id">{l.ip_hash}</code></td>
                  <td>{timeAgo(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModAuditLog({ log }) {
  return (
    <div className="db-section">
      <SectionHeader title="Historique de modération" />
      {!log.length ? <EmptyState icon={FileText} title="Aucune action enregistrée" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Action</th><th>Modérateur</th><th>Entité</th><th>ID</th><th>Date</th></tr></thead>
            <tbody>
              {log.map(l => (
                <tr key={l.id}><td><code>{l.action}</code></td><td>{l.actor_name}</td><td>{l.entity_type}</td><td><code className="wm-id">{l.entity_id.slice(0,12)}</code></td><td>{timeAgo(l.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminDashboard({ notify }) {
  const { user } = window.__undiscover_auth_ctx || {};
  const [section, setSection] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = window.__undiscover_use_data(`/dashboards/admin`, [user?.id, refreshKey]);

  if (!user || user.role !== "admin") return <div className="db-auth-required"><ShieldAlert size={32} /><p>Accès Admin requis.</p></div>;

  const refresh = () => setRefreshKey(k => k + 1);
  const items = [
    ["overview",  "Vue d'ensemble",    HomeIcon],
    ["users",     "Utilisateurs",      Users],
    ["releases",  "Tracks & Dubpacks", Music2],
    ["campaigns", "Campagnes",         Zap],
    ["tickets",   "Support",           MessageCircle],
    ["payments",  "Paiements",         Wallet],
    ["reports",   "Modération",        Flag],
    ["security",  "Sécurité",          ShieldAlert],
    ["logs",      "Logs admin",        FileText],
    ["settings",  "Paramètres",        Settings],
  ];

  return (
    <DashboardShell sidebar={
      <Sidebar title="Admin" subtitle="Panneau d'administration" items={items} section={section} setSection={setSection}
        footer={<div className="db-sidebar-footer"><span className="role-chip role-admin">admin</span><a href="/dashboard">Dashboard artiste</a></div>}
      />
    }>
      {loading ? <div className="db-loading"><Loader2 className="spin" size={28} /></div> :
       error ? <AlertCard type="error" title="Erreur" text={error} /> : (
        <>
          {section === "overview" && <AdminOverview data={data} />}
          {section === "users" && <AdminUsers users={data.users} roleDistribution={data.role_distribution} notify={notify} onRefresh={refresh} />}
          {section === "releases" && <AdminReleases releases={data.releases} notify={notify} onRefresh={refresh} />}
          {section === "campaigns" && <AdminCampaigns campaigns={data.campaigns} notify={notify} onRefresh={refresh} />}
          {section === "tickets" && <AdminTickets tickets={data.tickets || []} ticketMessages={data.ticket_messages || []} notify={notify} onRefresh={refresh} />}
          {section === "payments" && <AdminPayments payouts={data.payouts} notify={notify} onRefresh={refresh} />}
          {section === "reports" && <ModReports reports={data.reports} notify={notify} onRefresh={refresh} />}
          {section === "security" && <ModSecurityLogs logs={data.security_logs} />}
          {section === "logs" && <ModAuditLog log={data.audit_log} />}
          {section === "settings" && <AdminSettings notify={notify} />}
        </>
      )}
    </DashboardShell>
  );
}

function AdminTickets({ tickets, ticketMessages, notify, onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  const filtered = tickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || (t.topic || "").toLowerCase().includes(q) || (t.name || "").toLowerCase().includes(q) || (t.email || "").toLowerCase().includes(q) || (t.user_name || "").toLowerCase().includes(q);
  });
  const selected = selectedId ? tickets.find(t => t.id === selectedId) : null;
  const messages = ticketMessages.filter(m => m.ticket_id === selectedId);

  const updateStatus = async (id, status) => {
    setBusy(id + status);
    try {
      await window.__undiscover_request(`/dashboards/staff/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      notify("Ticket mis à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };

  const deleteTicket = async (id) => {
    if (!window.confirm("Supprimer définitivement ce ticket et ses messages ?")) return;
    setBusy(id + "del");
    try {
      await window.__undiscover_request(`/dashboards/admin/tickets/${id}`, { method: "DELETE" });
      notify("Ticket supprimé."); setSelectedId(null); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setReplyBusy(true);
    try {
      await window.__undiscover_request(`/staff/tickets/${selectedId}/reply`, { method: "POST", body: JSON.stringify({ body: replyText }) });
      setReplyText(""); notify("Réponse envoyée."); onRefresh();
    } catch (e) { notify(e.message); } finally { setReplyBusy(false); }
  };

  const openCount = tickets.filter(t => t.status === "open").length;
  const pendingCount = tickets.filter(t => t.status === "pending").length;

  return (
    <div className="db-section">
      <div className="db-section-header">
        <div><h2>Tickets support</h2><p>{tickets.length} ticket(s) · {openCount} ouverts · {pendingCount} en attente</p></div>
      </div>
      <div className="admin-tickets-layout">
        <div className="atl-list">
          <div className="atl-list-head">
            <FilterBar value={search} onChange={setSearch} placeholder="Rechercher..." />
          </div>
          <div className="atl-filters">
            {["all","open","pending","resolved","closed"].map(s => (
              <button key={s} type="button" className={`filter-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "Tous" : s}
              </button>
            ))}
          </div>
          <div className="atl-items">
            {!filtered.length
              ? <div style={{ padding: "24px 14px", color: "rgba(255,255,255,.25)", fontSize: 13, textAlign: "center" }}>Aucun ticket</div>
              : filtered.map(t => (
                <button key={t.id} type="button" className={`atl-item ${selectedId === t.id ? "active" : ""}`} onClick={() => setSelectedId(t.id)}>
                  <div className="atl-item-top">
                    <span className="atl-topic">{t.topic}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="atl-item-from">{t.user_name || t.name} · {t.email}</div>
                  <div className="atl-item-date">{timeAgo(t.created_at)}</div>
                </button>
              ))
            }
          </div>
        </div>

        {selected ? (
          <div className="atl-thread">
            <div className="atl-thread-head">
              <div>
                <strong>{selected.topic}</strong>
                <span>{selected.user_name || selected.name} · {selected.email}</span>
              </div>
              <div className="atl-thread-actions">
                {selected.status !== "resolved" && (
                  <button className="button ghost mini" type="button" disabled={!!busy} onClick={() => updateStatus(selected.id, "resolved")}>
                    <CheckSquare size={12} /> Résoudre
                  </button>
                )}
                {selected.status !== "closed" && (
                  <button className="button ghost mini" type="button" disabled={!!busy} onClick={() => updateStatus(selected.id, "closed")}>
                    <X size={12} /> Fermer
                  </button>
                )}
                <button className="button ghost mini danger" type="button" disabled={busy === selected.id + "del"} onClick={() => deleteTicket(selected.id)}>
                  <Trash size={12} />
                </button>
              </div>
            </div>
            <div className="atl-messages">
              {messages.map(m => (
                <div key={m.id} className={`atl-msg atl-msg-${m.sender_type}`}>
                  <div className="atl-msg-meta">
                    <strong>{m.sender_type === "staff" ? (m.sender_name || "Staff") : m.sender_type === "system" ? "Système" : (selected.user_name || selected.name)}</strong>
                    <span>{new Date(m.created_at).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <p>{m.body}</p>
                </div>
              ))}
              {!messages.length && <div style={{ color: "rgba(255,255,255,.25)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>Aucun message</div>}
            </div>
            <div className="atl-reply">
              <textarea className="atl-reply-input" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Écrire une réponse..." rows={3}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }} />
              <button className="button accent" type="button" onClick={sendReply} disabled={replyBusy || !replyText.trim()}>
                {replyBusy ? <Loader2 className="spin" size={14} /> : <Send size={14} />} Envoyer
              </button>
            </div>
          </div>
        ) : (
          <div className="atl-empty-thread">
            <Inbox size={28} />
            <span>Sélectionne un ticket pour voir la conversation</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminOverview({ data }) {
  const { overview, series, role_distribution } = data;
  return (
    <div className="db-section">
      <SectionHeader title="Vue d'ensemble Admin" subtitle="Santé globale de la plateforme Undisc0ver." />
      <div className="stat-grid stat-grid-4">
        <StatCard label="Utilisateurs" value={fmtNum(overview.users_total)} icon={Users} color="#22c55e" delta={`+${overview.users_week} cette semaine`} deltaDir="up" series={series.users} />
        <StatCard label="Revenus totaux" value={fmt(overview.revenue_total)} icon={Wallet} color="#8b5cf6" series={series.revenue} />
        <StatCard label="Revenus (30j)" value={fmt(overview.revenue_month)} icon={DollarSign} color="#22c55e" />
        <StatCard label="Ventes" value={fmtNum(overview.sales_total)} icon={Tag} color="#3b82f6" />
      </div>
      <div className="stat-grid stat-grid-4">
        <StatCard label="Tracks publiées" value={fmtNum(overview.releases_published)} icon={Music2} color="#06b6d4" series={series.releases} />
        <StatCard label="Campagnes actives" value={overview.campaigns_active} icon={Zap} color="#22c55e" />
        <StatCard label="Utilisateurs Pro" value={overview.users_pro} icon={Star} color="#f59e0b" />
        <StatCard label="Signalements ouverts" value={overview.reports_open} icon={Flag} color={overview.reports_open > 0 ? "#ef4444" : "#22c55e"} />
      </div>

      {overview.reports_open > 0 && <AlertCard type="error" title={`${overview.reports_open} signalement(s) copyright en attente`} />}
      {overview.security_warnings > 0 && <AlertCard type="warning" title={`${overview.security_warnings} alerte(s) sécurité cette semaine`} />}
      {overview.payout_pending > 0 && <AlertCard type="info" title={`${overview.payout_pending} demande(s) de payout en attente`} />}

      <div className="db-two-col">
        <div className="db-chart-card">
          <div className="chart-head"><Users size={15} /><span>Croissance utilisateurs — 30j</span></div>
          <LineChart data={series.users} color="#22c55e" />
        </div>
        <div className="db-chart-card">
          <div className="chart-head"><DollarSign size={15} /><span>Revenus — 30j</span></div>
          <LineChart data={series.revenue} color="#8b5cf6" formatY={v => `€${(v/100).toFixed(0)}`} />
        </div>
      </div>

      {role_distribution.length > 0 && (
        <div className="db-role-dist">
          <div className="chart-head"><Users size={14} /><span>Répartition des rôles</span></div>
          <div className="role-dist-list">
            {role_distribution.map(r => (
              <div key={r.role} className="role-dist-item">
                <span className={`role-chip role-${r.role}`}>{r.role}</span>
                <div className="role-bar-wrap"><div className="role-bar" style={{ width: `${Math.round((r.count / data.overview.users_total) * 100)}%` }} /></div>
                <span>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUsers({ users, roleDistribution, notify, onRefresh }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(null);

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    return true;
  });

  const updateUser = async (userId, updates) => {
    setBusy(userId);
    try {
      await window.__undiscover_request(`/dashboards/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(updates) });
      notify("Utilisateur mis à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); setConfirm(null); }
  };

  return (
    <div className="db-section">
      <SectionHeader title="Gestion utilisateurs" subtitle={`${users.length} utilisateurs au total`} />
      {confirm && <ConfirmDialog title={confirm.title} text={confirm.text} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <FilterBar value={search} onChange={setSearch} placeholder="Nom, email…">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">Tous les rôles</option>
          <option value="user">User</option>
          <option value="staff">Staff</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </FilterBar>
      {!filtered.length ? <EmptyState icon={Users} title="Aucun utilisateur trouvé" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Pro</th><th>Vérifié</th><th>Inscrit</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td><small>{u.email}</small></td>
                  <td>
                    <select value={u.role} className="role-select" onChange={e => {
                      const newRole = e.target.value;
                      if (newRole === "admin") {
                        setConfirm({ title: "Promouvoir Admin", text: "Cette action est irréversible sans une autre session admin.", danger: true, onConfirm: () => updateUser(u.id, { role: newRole }) });
                      } else { updateUser(u.id, { role: newRole }); }
                    }} disabled={busy === u.id}>
                      <option value="user">User</option>
                      <option value="staff">Staff</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td><input type="checkbox" checked={!!u.pro} onChange={e => updateUser(u.id, { pro: e.target.checked })} disabled={busy === u.id} /></td>
                  <td><input type="checkbox" checked={!!u.verified} onChange={e => updateUser(u.id, { verified: e.target.checked })} disabled={busy === u.id} /></td>
                  <td>{timeAgo(u.created_at)}</td>
                  <td><div className="db-actions"><a href={`/artist/${u.id}`} className="button ghost mini"><Eye size={12} /></a></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminReleases({ releases, notify, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const action = async (id, act) => {
    setBusy(id);
    try {
      await window.__undiscover_request(`/dashboards/moderator/action`, { method: "POST", body: JSON.stringify({ entity_type: "release", entity_id: id, action: act }) });
      notify("Release mise à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };

  const filtered = releases.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.artist_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "paid" && !r.price_cents) return false;
    if (filter === "blocked" && r.moderation_status !== "blocked") return false;
    if (filter === "review" && r.moderation_status !== "review") return false;
    if (filter === "reported" && !r.report_count) return false;
    return true;
  });

  return (
    <div className="db-section">
      <SectionHeader title="Toutes les tracks" subtitle={`${releases.length} releases sur la plateforme`} />
      <FilterBar value={search} onChange={setSearch} placeholder="Titre, artiste…">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Toutes</option>
          <option value="paid">Payantes</option>
          <option value="review">En revue</option>
          <option value="blocked">Bloquées</option>
          <option value="reported">Signalées</option>
        </select>
      </FilterBar>
      <div className="db-table-wrap">
        <table className="db-table">
          <thead><tr><th>Track</th><th>Artiste</th><th>Type</th><th>Statut</th><th>Écoutes</th><th>Prix</th><th>Signalements</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td><div className="db-release-cell"><div className="db-thumb" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={10} />}</div><strong>{r.title}</strong></div></td>
                <td>{r.artist_name}</td>
                <td><span className="db-tag">{r.kind}</span></td>
                <td><StatusBadge status={r.moderation_status} /></td>
                <td>{fmtNum(r.plays)}</td>
                <td>{r.price_cents ? fmt(r.price_cents) : "Gratuit"}</td>
                <td>{r.report_count > 0 ? <span style={{ color: "#ef4444", fontWeight: 700 }}>{r.report_count}</span> : "—"}</td>
                <td>
                  <div className="db-actions">
                    <a href={`/release/${r.id}`} className="button ghost mini"><Eye size={12} /></a>
                    {r.moderation_status !== "published" && <button className="button ghost mini" onClick={() => action(r.id, "approve")} disabled={busy === r.id}><CheckSquare size={12} /></button>}
                    {r.moderation_status !== "blocked" && <button className="button ghost mini danger" onClick={() => action(r.id, "block")} disabled={busy === r.id}><Ban size={12} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCampaigns({ campaigns, notify, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const action = async (id, act, reason = "") => {
    setBusy(id);
    try {
      if (act === "approve") await window.__undiscover_request(`/dashboards/staff/campaigns/${id}/approve`, { method: "POST" });
      else if (act === "reject") await window.__undiscover_request(`/dashboards/staff/campaigns/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: reason || "Non conforme." }) });
      else if (act === "suspend") await window.__undiscover_request(`/campaigns/${id}/cancel`, { method: "POST" });
      notify("Campagne mise à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setBusy(""); }
  };

  const filtered = campaigns.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all" && c.status !== filter) return false;
    return true;
  });

  return (
    <div className="db-section">
      <SectionHeader title="Toutes les campagnes" subtitle={`${campaigns.length} campagnes`} />
      <FilterBar value={search} onChange={setSearch} placeholder="Nom campagne…">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Toutes</option>
          <option value="active">Actives</option>
          <option value="under_review">En revue</option>
          <option value="rejected">Refusées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </FilterBar>
      <div className="db-table-wrap">
        <table className="db-table">
          <thead><tr><th>Campagne</th><th>Artiste</th><th>Type</th><th>Statut</th><th>Budget</th><th>Impressions</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><strong>{c.title}</strong></td>
                <td>{c.artist_name}</td>
                <td><span className="db-tag">{c.campaign_type}</span></td>
                <td><StatusBadge status={c.status} /></td>
                <td>{fmt(c.budget_cents)}</td>
                <td>{fmtNum(c.impressions)}</td>
                <td>
                  <div className="db-actions">
                    {c.status === "under_review" && <button className="button ghost mini" onClick={() => action(c.id, "approve")} disabled={busy === c.id}><CheckSquare size={12} /></button>}
                    {c.status === "under_review" && <button className="button ghost mini danger" onClick={() => action(c.id, "reject", "Non conforme.")} disabled={busy === c.id}><XSquare size={12} /></button>}
                    {["active","paused"].includes(c.status) && <button className="button ghost mini danger" onClick={() => action(c.id, "suspend")} disabled={busy === c.id}><Ban size={12} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPayments({ payouts, notify, onRefresh }) {
  const [busy, setBusy] = useState("");
  const update = async (id, status, note = "") => {
    setBusy(id);
    try { await window.__undiscover_request(`/dashboards/admin/payouts/${id}`, { method: "PATCH", body: JSON.stringify({ status, staff_note: note }) }); notify("Payout mis à jour."); onRefresh(); }
    catch (e) { notify(e.message); } finally { setBusy(""); }
  };
  const totalPending = payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
  return (
    <div className="db-section">
      <SectionHeader title="Paiements & Payouts" subtitle="Demandes de retrait artistes." />
      {totalPending > 0 && <AlertCard type="info" title={`${fmt(totalPending)} en attente de traitement`} />}
      {!payouts.length ? <EmptyState icon={Wallet} title="Aucun payout" /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Artiste</th><th>Montant</th><th>Méthode</th><th>Bénéficiaire</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.user_name}</strong><small>{p.user_email}</small></td>
                  <td style={{ color: "#22c55e", fontWeight: 700 }}>{fmt(p.amount_cents)}</td>
                  <td>{p.method.toUpperCase()}</td>
                  <td>{p.account_holder} ···{p.destination_last4}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{timeAgo(p.created_at)}</td>
                  <td>
                    <div className="db-actions">
                      {p.status === "pending" && <>
                        <button className="button ghost mini" onClick={() => update(p.id, "paid", "Traité")} disabled={busy === p.id}><CheckSquare size={12} /> Payer</button>
                        <button className="button ghost mini danger" onClick={() => update(p.id, "rejected", "Refusé")} disabled={busy === p.id}><XSquare size={12} /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminSettings({ notify }) {
  return (
    <div className="db-section">
      <SectionHeader title="Paramètres plateforme" subtitle="Configuration globale d'Undisc0ver." />
      <div className="db-settings-grid">
        <div className="db-setting-card">
          <Settings size={20} />
          <h3>Paramètres généraux</h3>
          <p>Limites upload, configuration email, options plateforme.</p>
          <a href="/settings" className="button ghost">Configurer</a>
        </div>
        <div className="db-setting-card">
          <Zap size={20} />
          <h3>Campagnes</h3>
          <p>Prix, types, emplacements, limites parallèles.</p>
          <button className="button ghost" type="button" onClick={() => notify("Bientôt disponible.")}>Configurer</button>
        </div>
        <div className="db-setting-card">
          <ShieldCheck size={20} />
          <h3>Sécurité</h3>
          <p>Rate limits, tokens, watermarks, DMCA.</p>
          <button className="button ghost" type="button" onClick={() => notify("Bientôt disponible.")}>Configurer</button>
        </div>
        <div className="db-setting-card">
          <Globe size={20} />
          <h3>SEO</h3>
          <p>Sitemap, robots.txt, meta globales.</p>
          <a href="/sitemap.xml" target="_blank" className="button ghost">Voir sitemap</a>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function LabelDashboard({ notify }) {
  const { user } = window.__undiscover_auth_ctx || {};
  const [section, setSection] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = window.__undiscover_use_data(`/dashboards/label`, [user?.id, refreshKey]);

  if (!user) return <div className="db-auth-required"><Lock size={32} /><p>Connexion requise.</p></div>;
  const hasAccess = String(user.plan || "").toLowerCase() === "label" || ["label", "admin"].includes(user.role);
  if (!hasAccess) return <div className="db-auth-required"><ShieldAlert size={32} /><p>Accès Label requis.</p></div>;

  const refresh = () => setRefreshKey(k => k + 1);

  const items = [
    ["overview",  "Vue d'ensemble", HomeIcon],
    ["branding",  "Identité du label", Star],
    ["roster",    "Artistes",        Users],
    ["catalog",   "Catalogue",       Music2],
    ["analytics", "Analytics",       BarChart3],
    ["campaigns", "Campagnes",       Zap],
  ];

  return (
    <DashboardShell sidebar={
      <Sidebar title="Label Dashboard" subtitle={data?.profile?.name || "Mon label"} items={items} section={section} setSection={setSection}
        footer={
          <div className="db-sidebar-footer">
            <span className="role-chip role-label">label</span>
            <a href="/dashboard"><HomeIcon size={14} /> Retour</a>
          </div>
        }
      />
    }>
      {loading ? <div className="db-loading"><Loader2 className="spin" size={28} /></div> :
       error ? <AlertCard type="error" title="Erreur" text={error} /> : (
        <>
          {section === "overview"  && <LabelOverview data={data} />}
          {section === "branding"  && <LabelBranding profile={data.profile} notify={notify} onRefresh={refresh} />}
          {section === "roster"    && <LabelRoster roster={data.roster} notify={notify} onRefresh={refresh} />}
          {section === "catalog"   && <LabelCatalog catalog={data.catalog} notify={notify} onRefresh={refresh} />}
          {section === "analytics" && <LabelAnalytics stats={data.stats} series={data.series} roster={data.roster} catalog={data.catalog} />}
          {section === "campaigns" && <LabelCampaigns campaigns={data.campaigns} />}
        </>
      )}
    </DashboardShell>
  );
}

function LabelOverview({ data }) {
  const { stats, roster, catalog, series } = data;
  const topArtist = roster[0];
  const recentReleases = catalog.slice(0, 5);

  return (
    <div className="db-section">
      <SectionHeader title="Vue d'ensemble" subtitle="Activité globale de ton label." />

      <div className="stat-grid">
        <StatCard label="Artistes roster" value={fmtNum(stats.total_artists)} icon={Users} color="#22c55e" />
        <StatCard label="Tracks publiées" value={fmtNum(stats.total_releases)} icon={Music2} color="#3b82f6" />
        <StatCard label="Écoutes totales" value={fmtNum(stats.plays)} icon={Headphones} color="#8b5cf6" series={series.plays} />
        <StatCard label="Followers combinés" value={fmtNum(stats.total_followers)} icon={UserPlus} color="#f59e0b" />
        <StatCard label="Ventes" value={fmtNum(stats.sales)} icon={DollarSign} color="#06b6d4" />
        <StatCard label="Revenus" value={fmt(stats.revenue_cents)} icon={Wallet} color="#22c55e" />
      </div>

      <div className="db-two-col">
        <div className="db-chart-card">
          <div className="chart-head"><Headphones size={15} /><span>Écoutes — 30 jours (tous artistes)</span></div>
          <LineChart data={series.plays} color="#8b5cf6" />
        </div>
        <div className="db-chart-card">
          <div className="chart-head"><Users size={15} /><span>Roster — performance</span></div>
          {roster.length === 0 ? <EmptyState icon={Users} title="Aucun artiste" text="Ajoute des artistes dans l'onglet Roster." /> : (
            <div className="label-roster-mini">
              {roster.slice(0, 6).map(a => (
                <div key={a.id} className="lrm-row">
                  <div className="db-thumb sm" style={{ backgroundImage: a.avatar_url ? `url(${a.avatar_url})` : undefined, borderRadius: "50%" }}>{!a.avatar_url && <Users size={10} />}</div>
                  <span className="lrm-name">{a.name}</span>
                  <span className="lrm-plays">{fmtNum(a.total_plays)} écoutes</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="db-chart-card">
        <div className="chart-head"><Music2 size={15} /><span>Sorties récentes</span></div>
        {recentReleases.length === 0 ? <EmptyState icon={Music2} title="Aucune release" /> : (
          <div className="db-table-wrap" style={{ border: "none" }}>
            <table className="db-table">
              <thead><tr><th>Track</th><th>Artiste</th><th>Statut</th><th>Écoutes</th><th>Revenus</th></tr></thead>
              <tbody>
                {recentReleases.map(r => (
                  <tr key={r.id}>
                    <td><div className="db-release-cell"><div className="db-thumb sm" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={10} />}</div><strong>{r.title}</strong></div></td>
                    <td>{r.artist_name}</td>
                    <td><StatusBadge status={r.moderation_status} /></td>
                    <td>{fmtNum(r.plays)}</td>
                    <td style={{ color: "#22c55e" }}>{fmt(r.revenue_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LabelBranding({ profile, notify, onRefresh }) {
  const [form, setForm] = useState({
    name: profile?.name || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
    banner_url: profile?.banner_url || "",
    genre: profile?.genre || "",
    location: profile?.location || "",
  });
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm({
      name: profile?.name || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
      banner_url: profile?.banner_url || "",
      genre: profile?.genre || "",
      location: profile?.location || "",
    });
  }, [profile?.name, profile?.updated_at]);

  const save = async () => {
    setSaving(true);
    try {
      await window.__undiscover_request("/dashboards/label/branding", { method: "PATCH", body: JSON.stringify(form) });
      notify("Profil du label mis à jour."); onRefresh();
    } catch (e) { notify(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="db-section">
      <SectionHeader title="Identité du label" subtitle="Personnalise l'image et le profil public de ton label." />

      <div className="label-branding-grid">
        {/* Preview */}
        <div className="label-preview-card">
          <div className="lp-banner" style={{ backgroundImage: form.banner_url ? `url(${form.banner_url})` : undefined }}>
            {!form.banner_url && <span className="lp-banner-empty">Bannière</span>}
          </div>
          <div className="lp-body">
            <div className="lp-avatar" style={{ backgroundImage: form.avatar_url ? `url(${form.avatar_url})` : undefined }}>
              {!form.avatar_url && <Star size={20} />}
            </div>
            <strong>{form.name || "Nom du label"}</strong>
            <p>{form.bio || "Bio du label…"}</p>
            <span>{form.genre} · {form.location}</span>
          </div>
        </div>

        {/* Form */}
        <div className="label-branding-form">
          <div className="lb-field"><label>Nom du label</label><input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Ex: Future Records" /></div>
          <div className="lb-field"><label>Bio</label><textarea value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="Présente ton label en quelques lignes…" rows={4} /></div>
          <div className="lb-row2">
            <div className="lb-field"><label>Genre principal</label><input value={form.genre} onChange={e => update("genre", e.target.value)} placeholder="Ex: Afrobeats" /></div>
            <div className="lb-field"><label>Localisation</label><input value={form.location} onChange={e => update("location", e.target.value)} placeholder="Ex: Paris, FR" /></div>
          </div>
          <div className="lb-field"><label>URL Logo / Avatar</label><input value={form.avatar_url} onChange={e => update("avatar_url", e.target.value)} placeholder="https://…" /></div>
          <div className="lb-field"><label>URL Bannière</label><input value={form.banner_url} onChange={e => update("banner_url", e.target.value)} placeholder="https://…" /></div>
          <button className="button accent" onClick={save} disabled={saving} type="button" style={{ marginTop: 8 }}>
            {saving ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
            {saving ? "Sauvegarde…" : "Sauvegarder le profil"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabelRoster({ roster, notify, onRefresh }) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState("");

  const addArtist = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await window.__undiscover_request("/dashboards/label/roster/add", { method: "POST", body: JSON.stringify({ email }) });
      notify("Artiste ajouté au roster."); setEmail(""); onRefresh();
    } catch (e) { notify(e.message); } finally { setAdding(false); }
  };

  const removeArtist = async (artistId, name) => {
    if (!confirm(`Retirer ${name} du roster ?`)) return;
    setRemoving(artistId);
    try {
      await window.__undiscover_request(`/dashboards/label/roster/${artistId}`, { method: "DELETE" });
      notify("Artiste retiré du roster."); onRefresh();
    } catch (e) { notify(e.message); } finally { setRemoving(""); }
  };

  return (
    <div className="db-section">
      <SectionHeader title="Artistes du roster" subtitle={`${roster.length} artiste(s) dans ton label.`} />

      <div className="label-add-artist">
        <div className="db-search-wrap" style={{ flex: 1 }}>
          <Search size={14} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email de l'artiste à ajouter…" onKeyDown={e => e.key === "Enter" && addArtist()} />
        </div>
        <button className="button accent" onClick={addArtist} disabled={adding || !email.trim()} type="button">
          {adding ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />} Ajouter
        </button>
      </div>

      {roster.length === 0 ? (
        <EmptyState icon={Users} title="Roster vide" text="Ajoute des artistes par leur email pour constituer ton roster." />
      ) : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Artiste</th><th>Genre</th><th>Tracks</th><th>Écoutes</th><th>Revenus</th><th>Ajouté</th><th>Actions</th></tr></thead>
            <tbody>
              {roster.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="db-release-cell">
                      <div className="db-thumb" style={{ backgroundImage: a.avatar_url ? `url(${a.avatar_url})` : undefined, borderRadius: "50%" }}>{!a.avatar_url && <Users size={12} />}</div>
                      <div><strong>{a.name}</strong><small>{a.location}</small></div>
                    </div>
                  </td>
                  <td><span className="db-tag">{a.genre}</span></td>
                  <td>{fmtNum(a.releases_count)}</td>
                  <td>{fmtNum(a.total_plays)}</td>
                  <td style={{ color: "#22c55e" }}>{fmt(a.total_revenue)}</td>
                  <td>{timeAgo(a.added_at)}</td>
                  <td>
                    <div className="db-actions">
                      <a href={`/artist/${a.id}`} className="button ghost mini"><Eye size={12} /></a>
                      <button className="button ghost mini danger" onClick={() => removeArtist(a.id, a.name)} disabled={removing === a.id} type="button"><Trash size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LabelCatalog({ catalog, notify, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = catalog.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.artist_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "paid" && !r.price_cents) return false;
    if (filter === "free" && r.price_cents) return false;
    if (filter === "published" && r.moderation_status !== "published") return false;
    if (filter === "review" && r.moderation_status !== "review") return false;
    return true;
  });

  return (
    <div className="db-section">
      <SectionHeader title="Catalogue" subtitle={`${catalog.length} releases dans ton label.`} />
      <FilterBar value={search} onChange={setSearch} placeholder="Titre, artiste…">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Toutes</option>
          <option value="published">Publiées</option>
          <option value="review">En revue</option>
          <option value="paid">Payantes</option>
          <option value="free">Gratuites</option>
        </select>
      </FilterBar>

      {!filtered.length ? <EmptyState icon={Music2} title="Aucune release" text="Le catalogue est vide. Ajoute des artistes ou upload des tracks." /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Track</th><th>Artiste</th><th>Type</th><th>Statut</th><th>Écoutes</th><th>Likes</th><th>Prix</th><th>Revenus</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="db-release-cell">
                      <div className="db-thumb" style={{ backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined }}>{!r.cover_url && <Music2 size={10} />}</div>
                      <div><strong>{r.title}</strong><small>{r.kind}</small></div>
                    </div>
                  </td>
                  <td>{r.artist_name}</td>
                  <td><span className="db-tag">{r.genre}</span></td>
                  <td><StatusBadge status={r.moderation_status} /></td>
                  <td>{fmtNum(r.plays)}</td>
                  <td>{fmtNum(r.likes)}</td>
                  <td>{r.price_cents ? fmt(r.price_cents) : "Gratuit"}</td>
                  <td style={{ color: "#22c55e" }}>{fmt(r.revenue_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LabelAnalytics({ stats, series, roster, catalog }) {
  const topByPlays = [...roster].sort((a, b) => b.total_plays - a.total_plays).slice(0, 8);
  const topByRevenue = [...roster].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5);

  return (
    <div className="db-section">
      <SectionHeader title="Analytics label" subtitle="Stats combinées de tous tes artistes." />

      <div className="stat-grid">
        <StatCard label="Écoutes totales" value={fmtNum(stats.plays)} icon={Headphones} color="#8b5cf6" />
        <StatCard label="Followers combinés" value={fmtNum(stats.total_followers)} icon={Users} color="#22c55e" />
        <StatCard label="Téléchargements" value={fmtNum(stats.downloads)} icon={Download} color="#3b82f6" />
        <StatCard label="Revenus totaux" value={fmt(stats.revenue_cents)} icon={Wallet} color="#f59e0b" />
      </div>

      <div className="db-chart-card">
        <div className="chart-head"><Headphones size={15} /><span>Écoutes combinées — 30 jours</span></div>
        <LineChart data={series.plays} color="#8b5cf6" />
      </div>

      <div className="db-two-col">
        <div className="db-chart-card">
          <div className="chart-head"><TrendingUp size={15} /><span>Top artistes — Écoutes</span></div>
          {topByPlays.length === 0 ? <EmptyState icon={Users} title="Aucun artiste" /> : (
            <div className="label-bar-list">
              {topByPlays.map((a, i) => {
                const maxPlays = topByPlays[0]?.total_plays || 1;
                return (
                  <div key={a.id} className="lbl-row">
                    <span className="lbl-rank">#{i + 1}</span>
                    <div className="db-thumb sm" style={{ backgroundImage: a.avatar_url ? `url(${a.avatar_url})` : undefined, borderRadius: "50%" }}>{!a.avatar_url && <Users size={8} />}</div>
                    <span className="lbl-name">{a.name}</span>
                    <div className="lbl-bar-wrap"><div className="lbl-bar" style={{ width: `${(a.total_plays / maxPlays) * 100}%` }} /></div>
                    <span className="lbl-val">{fmtNum(a.total_plays)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="db-chart-card">
          <div className="chart-head"><Wallet size={15} /><span>Top artistes — Revenus</span></div>
          {topByRevenue.length === 0 ? <EmptyState icon={DollarSign} title="Aucune vente" /> : (
            <div className="label-bar-list">
              {topByRevenue.map((a, i) => {
                const maxRev = topByRevenue[0]?.total_revenue || 1;
                return (
                  <div key={a.id} className="lbl-row">
                    <span className="lbl-rank">#{i + 1}</span>
                    <span className="lbl-name">{a.name}</span>
                    <div className="lbl-bar-wrap"><div className="lbl-bar" style={{ width: `${(a.total_revenue / maxRev) * 100}%`, background: "#22c55e" }} /></div>
                    <span className="lbl-val" style={{ color: "#22c55e" }}>{fmt(a.total_revenue)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LabelCampaigns({ campaigns }) {
  const active = campaigns.filter(c => c.status === "active");
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  return (
    <div className="db-section">
      <SectionHeader title="Campagnes" subtitle="Toutes les campagnes de tes artistes." />
      <div className="stat-grid">
        <StatCard label="Campagnes actives" value={active.length} icon={Zap} color="#22c55e" />
        <StatCard label="Impressions totales" value={fmtNum(totalImpressions)} icon={Eye} color="#3b82f6" />
        <StatCard label="Clics totaux" value={fmtNum(totalClicks)} icon={Activity} color="#f59e0b" />
      </div>
      {!campaigns.length ? <EmptyState icon={Zap} title="Aucune campagne" text="Tes artistes n'ont pas encore lancé de campagnes." /> : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead><tr><th>Campagne</th><th>Artiste</th><th>Type</th><th>Statut</th><th>Impressions</th><th>Clics</th><th>Budget</th></tr></thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong>{c.release_title && <small> · {c.release_title}</small>}</td>
                  <td>{c.artist_name}</td>
                  <td><span className="db-tag">{c.campaign_type}</span></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{fmtNum(c.impressions)}</td>
                  <td>{fmtNum(c.clicks)}</td>
                  <td>{fmt(c.budget_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
