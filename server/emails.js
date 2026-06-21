// server/emails.js — Undisc0ver branded email templates
// All templates return { subject, html } for use with sendEmail()

const C = {
  bg: "#09090B",
  card: "#111117",
  border: "#1D1D26",
  accent: "#22C55E",
  accentDark: "#16A34A",
  accentAlpha: "#22C55E1A",
  accentBorder: "#22C55E30",
  text: "#F4F4F5",
  textSub: "#8B8B9A",
  textMuted: "#52525E",
  danger: "#EF4444",
  dangerAlpha: "#EF44441A",
  dangerBorder: "#EF444430",
  warning: "#F59E0B",
  warningAlpha: "#F59E0B1A",
  warningBorder: "#F59E0B30",
};

function siteUrl() {
  return String(process.env.PUBLIC_SITE_URL || "https://undisc0ver.com").replace(/\/$/, "");
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(bodyHtml, { subject = "", preheader = "" } = {}) {
  const base = siteUrl();
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${esc(subject)}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    body{height:100%!important;margin:0!important;padding:0!important;width:100%!important;background-color:${C.bg}}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important}
    u+#body a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit}
    #MessageViewBody a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit}
    @media only screen and (min-device-width:320px) and (max-device-width:480px){.mobile-wrap{width:100%!important;max-width:100%!important}.mobile-pad{padding-left:20px!important;padding-right:20px!important}}
  </style>
</head>
<body id="body" style="margin:0;padding:0;background-color:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ""}

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Container 580px -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" class="mobile-wrap" style="max-width:580px;width:100%;">

          <!-- ── Logo ── -->
          <tr>
            <td align="center" style="padding:0 0 28px;">
              <a href="${base}" style="text-decoration:none;display:inline-block;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:${C.accentAlpha};border:1px solid ${C.accentBorder};border-radius:12px;padding:13px 22px;">
                      <span style="font-size:20px;font-weight:700;color:${C.text};letter-spacing:-0.4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Undisc<span style="color:${C.accent};">0</span>ver</span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- ── Card ── -->
          <tr>
            <td style="background-color:${C.card};border-radius:16px;border:1px solid ${C.border};overflow:hidden;">

              <!-- Accent bar -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="height:3px;background:linear-gradient(90deg,${C.accent} 0%,${C.accentDark} 60%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>

              <!-- Body content -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="mobile-pad" style="padding:40px 44px 36px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:28px 0 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:0 0 14px;border-top:1px solid ${C.border};padding-top:20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 10px;"><a href="${base}" style="font-size:12px;color:${C.textMuted};text-decoration:none;font-family:-apple-system,sans-serif;">Accueil</a></td>
                        <td style="color:${C.border};font-size:12px;font-family:sans-serif;">·</td>
                        <td style="padding:0 10px;"><a href="${base}/explore" style="font-size:12px;color:${C.textMuted};text-decoration:none;font-family:-apple-system,sans-serif;">Explorer</a></td>
                        <td style="color:${C.border};font-size:12px;font-family:sans-serif;">·</td>
                        <td style="padding:0 10px;"><a href="${base}/support" style="font-size:12px;color:${C.textMuted};text-decoration:none;font-family:-apple-system,sans-serif;">Support</a></td>
                        <td style="color:${C.border};font-size:12px;font-family:sans-serif;">·</td>
                        <td style="padding:0 10px;"><a href="${base}/privacy" style="font-size:12px;color:${C.textMuted};text-decoration:none;font-family:-apple-system,sans-serif;">Confidentialité</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:11px;line-height:1.7;color:${C.textMuted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      © ${new Date().getFullYear()} Undisc0ver — Plateforme musicale pour artistes indépendants<br/>
                      Tu reçois cet email car tu possèdes un compte sur <a href="${base}" style="color:${C.textMuted};text-decoration:underline;">undisc0ver.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Reusable components ──────────────────────────────────────────────────────

function h1(text) {
  return `<p style="margin:0 0 10px;font-size:26px;font-weight:700;color:${C.text};line-height:1.25;letter-spacing:-0.6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${esc(text)}</p>`;
}

function h2(text) {
  return `<p style="margin:24px 0 8px;font-size:15px;font-weight:600;color:${C.text};letter-spacing:0;font-family:-apple-system,sans-serif;">${esc(text)}</p>`;
}

function p(html, muted = false) {
  const col = muted ? C.textSub : C.text;
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${col};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${html}</p>`;
}

function small(html) {
  return `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${C.textSub};font-family:-apple-system,sans-serif;">${html}</p>`;
}

function hr() {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;"><tr><td style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

function btn(label, url, danger = false) {
  const bg = danger ? C.danger : C.accent;
  const fg = danger ? "#FFFFFF" : "#000000";
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr>
      <td align="center" style="border-radius:10px;background-color:${bg};">
        <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:${fg};text-decoration:none;border-radius:10px;letter-spacing:-0.1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${esc(label)}</a>
      </td>
    </tr>
  </table>`;
}

function badge(text, type = "info") {
  const cfg = {
    info:    { bg: C.accentAlpha,   border: C.accentBorder,  color: C.accent  },
    warning: { bg: C.warningAlpha,  border: C.warningBorder, color: C.warning },
    danger:  { bg: C.dangerAlpha,   border: C.dangerBorder,  color: C.danger  },
    success: { bg: C.accentAlpha,   border: C.accentBorder,  color: C.accent  },
  };
  const s = cfg[type] || cfg.info;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:18px 0;">
    <tr>
      <td style="background-color:${s.bg};border-left:3px solid ${s.color};border-radius:0 8px 8px 0;padding:13px 16px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:${C.textSub};font-family:-apple-system,sans-serif;">${text}</p>
      </td>
    </tr>
  </table>`;
}

function infoTable(rows = []) {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:11px 16px;font-size:12px;font-weight:600;color:${C.textMuted};font-family:-apple-system,sans-serif;text-transform:uppercase;letter-spacing:0.4px;width:130px;border-bottom:1px solid ${C.border};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:11px 16px;font-size:14px;color:${C.text};font-family:-apple-system,sans-serif;border-bottom:1px solid ${C.border};">${value}</td>
    </tr>
  `).join("");
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border:1px solid ${C.border};border-radius:10px;overflow:hidden;">${cells}</table>`;
}

function statRow(stats = []) {
  const count = stats.length;
  const cells = stats.map(({ label, value }) => `
    <td align="center" style="padding:16px 8px;border-right:1px solid ${C.border};">
      <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:${C.text};font-family:-apple-system,sans-serif;letter-spacing:-0.5px;">${esc(String(value))}</p>
      <p style="margin:0;font-size:11px;color:${C.textMuted};font-family:-apple-system,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">${esc(label)}</p>
    </td>
  `).join("");
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border:1px solid ${C.border};border-radius:10px;overflow:hidden;"><tr>${cells}</tr></table>`;
}

function linkList(items = []) {
  const rows = items.map(([icon, label, url]) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width:28px;font-size:16px;vertical-align:middle;">${icon}</td>
            <td style="vertical-align:middle;"><a href="${esc(url)}" style="font-size:14px;color:${C.textSub};text-decoration:none;font-family:-apple-system,sans-serif;">${esc(label)}</a></td>
            <td align="right" style="vertical-align:middle;"><a href="${esc(url)}" style="font-size:14px;color:${C.accent};text-decoration:none;font-family:-apple-system,sans-serif;">→</a></td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">${rows}</table>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

export function passwordResetEmail(user, resetUrl) {
  const name = esc(user.name || "Artiste");
  const body = `
    ${h1("Réinitialisation de mot de passe")}
    ${p(`Bonjour <strong style="color:${C.text};">${name}</strong>,`)}
    ${p("Tu as demandé à réinitialiser ton mot de passe Undisc0ver. Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe sécurisé.", true)}
    ${btn("Réinitialiser mon mot de passe", resetUrl)}
    ${badge(`⏱ Ce lien est valide pendant <strong>1 heure</strong> seulement et ne peut être utilisé qu'une seule fois.`, "warning")}
    ${hr()}
    ${small(`Si tu n'as pas demandé cette réinitialisation, ignore cet email — ton mot de passe reste inchangé.<br/>Lien de secours&nbsp;: <span style="word-break:break-all;color:${C.textMuted};">${esc(resetUrl)}</span>`)}
  `;
  return {
    subject: "Réinitialisation de ton mot de passe — Undisc0ver",
    html: layout(body, {
      subject: "Réinitialisation de mot de passe",
      preheader: "Clique pour réinitialiser ton mot de passe Undisc0ver. Lien valide 1 heure."
    })
  };
}

export function welcomeEmail(user) {
  const base = siteUrl();
  const name = esc(user.name || "Artiste");
  const body = `
    ${h1("Bienvenue sur Undisc0ver 🎵")}
    ${p(`Salut <strong style="color:${C.text};">${name}</strong>, on est ravis de t'accueillir !`)}
    ${p("Undisc0ver est la plateforme musicale pour artistes indépendants. Upload tes sons, partage tes dubpacks, suis tes stats et découvre de nouveaux talents.", true)}
    ${btn("Commencer à uploader", `${base}/upload`)}
    ${hr()}
    ${h2("Par où commencer ?")}
    ${linkList([
      ["🎵", "Upload ta première track ou dubpack", `${base}/upload`],
      ["🎨", "Complète ton profil artiste", `${base}/settings`],
      ["🔍", "Découvre d'autres artistes", `${base}/explore`],
      ["📊", "Consulte ton dashboard", `${base}/dashboard`],
    ])}
    ${small(`Des questions ? <a href="${base}/support" style="color:${C.accent};text-decoration:none;">Notre équipe est là pour t'aider.</a>`)}
  `;
  return {
    subject: "Bienvenue sur Undisc0ver 🎵",
    html: layout(body, {
      subject: "Bienvenue sur Undisc0ver",
      preheader: "Ta plateforme musicale pour artistes indépendants est prête. Commence à uploader."
    })
  };
}

export function purchaseConfirmationEmail(user, release, amountCents) {
  const base = siteUrl();
  const name = esc(user.name || "Acheteur");
  const title = esc(release.title || "");
  const artist = esc(release.artist || release.artist_name || "");
  const amount = `${(amountCents / 100).toFixed(2).replace(".", ",")} €`;
  const body = `
    ${h1("Achat confirmé ✓")}
    ${p(`Merci <strong style="color:${C.text};">${name}</strong> ! Ton achat a bien été enregistré.`)}
    ${infoTable([
      ["Titre", `<strong style="color:${C.text};">${title}</strong>`],
      ["Type", esc(release.kind || "Track")],
      ["Artiste", artist],
      ["Montant", `<strong style="color:${C.accent};">${amount}</strong>`],
    ])}
    ${badge(`✓ Tu peux maintenant télécharger <strong>${title}</strong> depuis la page du son.`, "success")}
    ${btn("Accéder à mon achat", `${base}/release/${esc(release.id)}`)}
    ${hr()}
    ${small(`Tous tes achats sont disponibles dans <a href="${base}/dashboard" style="color:${C.accent};text-decoration:none;">ton espace</a>. Pour toute question, <a href="${base}/support" style="color:${C.accent};text-decoration:none;">contacte notre support</a>.`)}
  `;
  return {
    subject: `Achat confirmé — ${release.title}`,
    html: layout(body, {
      subject: `Achat confirmé — ${release.title}`,
      preheader: `Ton achat de "${release.title}" est confirmé. Télécharge maintenant.`
    })
  };
}

export function bookingRequestEmail(artist, { requesterName, requesterEmail, eventDate, eventType, message }) {
  const base = siteUrl();
  const artistName = esc(artist.name || "Artiste");
  const body = `
    ${h1("Nouvelle demande de booking")}
    ${p(`Bonjour <strong style="color:${C.text};">${artistName}</strong>, tu as reçu une nouvelle demande de booking !`)}
    ${infoTable([
      ["Demandeur", `<strong style="color:${C.text};">${esc(requesterName)}</strong>`],
      ["Email", `<a href="mailto:${esc(requesterEmail)}" style="color:${C.accent};text-decoration:none;">${esc(requesterEmail)}</a>`],
      ["Date", esc(eventDate) || `<span style="color:${C.textMuted};">À définir</span>`],
      ["Type d'event", esc(eventType) || `<span style="color:${C.textMuted};">Non précisé</span>`],
      ["Message", `<span style="line-height:1.6;">${esc(message)}</span>`],
    ])}
    ${btn("Voir dans mon dashboard", `${base}/dashboard`)}
    ${hr()}
    ${small(`Pour répondre à cette demande, contacte directement <a href="mailto:${esc(requesterEmail)}" style="color:${C.accent};text-decoration:none;">${esc(requesterEmail)}</a>.`)}
  `;
  return {
    subject: `Nouvelle demande de booking — ${requesterName}`,
    html: layout(body, {
      subject: "Nouvelle demande de booking",
      preheader: `${requesterName} t'envoie une demande de booking.`
    })
  };
}

export function supportTicketEmail(user, ticket) {
  const base = siteUrl();
  const name = esc((user && user.name) || ticket.name || "Utilisateur");
  const body = `
    ${h1("Ticket de support reçu")}
    ${p(`Bonjour <strong style="color:${C.text};">${name}</strong>,`)}
    ${p("Ton message a bien été reçu par l'équipe Undisc0ver. Nous reviendrons vers toi dès que possible.", true)}
    ${infoTable([
      ["Référence", `<code style="font-family:monospace;font-size:13px;color:${C.accent};">#${esc(ticket.id || "—")}</code>`],
      ["Sujet", esc(ticket.topic || "—")],
      ["Statut", `<span style="color:${C.warning};">En cours de traitement</span>`],
    ])}
    ${badge("Nous traitons les demandes du lundi au vendredi. Les délais varient selon le volume.", "info")}
    ${hr()}
    ${small(`Besoin d'une réponse urgente ? Consulte notre <a href="${base}/faq" style="color:${C.accent};text-decoration:none;">FAQ</a>.`)}
  `;
  return {
    subject: "Ton ticket de support a été reçu — Undisc0ver",
    html: layout(body, {
      subject: "Ticket support créé",
      preheader: "L'équipe Undisc0ver a bien reçu ton message."
    })
  };
}

export function campaignStatusEmail(user, campaign, status) {
  const base = siteUrl();
  const name = esc(user.name || "Artiste");
  const title = esc(campaign.title || "Ta campagne");
  const cfg = {
    active:    { label: "Active ✓",   msg: "Ta campagne est maintenant en ligne et visible sur Undisc0ver.", type: "success" },
    paused:    { label: "En pause",   msg: "Ta campagne a été mise en pause.",                               type: "warning" },
    completed: { label: "Terminée",   msg: "Ta campagne est terminée. Consulte tes stats pour les résultats.", type: "info" },
    rejected:  { label: "Refusée ✗", msg: "Ta campagne a été refusée. Contacte le support pour les détails.", type: "danger" },
    cancelled: { label: "Annulée",   msg: "Ta campagne a été annulée.",                                     type: "warning" },
  };
  const s = cfg[status] || cfg.active;
  const body = `
    ${h1(`Campagne ${s.label}`)}
    ${p(`Bonjour <strong style="color:${C.text};">${name}</strong>,`)}
    ${p(`Mise à jour concernant ta campagne <strong style="color:${C.text};">${title}</strong> :`, true)}
    ${badge(s.msg, s.type)}
    ${btn("Voir mes campagnes", `${base}/dashboard`)}
  `;
  return {
    subject: `Campagne ${s.label} — ${campaign.title}`,
    html: layout(body, {
      subject: `Campagne ${s.label}`,
      preheader: `Mise à jour de ta campagne "${campaign.title}".`
    })
  };
}

export function copyrightNoticeEmail(artist, { releaseTitle, releaseId, reason }) {
  const base = siteUrl();
  const name = esc(artist.name || "Artiste");
  const body = `
    ${h1("Signalement copyright reçu")}
    ${p(`Bonjour <strong style="color:${C.text};">${name}</strong>,`)}
    ${p("Un signalement de violation de droits d'auteur a été déposé sur l'un de tes contenus. Il a été placé en révision en attendant l'examen de notre équipe.", true)}
    ${infoTable([
      ["Contenu", `<strong style="color:${C.text};">${esc(releaseTitle || "—")}</strong>`],
      ["Motif", esc(reason || "—")],
      ["Statut", `<span style="color:${C.warning};">En révision</span>`],
    ])}
    ${badge("⚠ Si tu penses que ce signalement est incorrect, contacte notre équipe en fournissant la preuve que tu détiens les droits sur ce contenu.", "warning")}
    ${btn("Contacter le support", `${base}/support`)}
    ${releaseId ? btn("Voir le contenu concerné", `${base}/release/${esc(releaseId)}`, false) : ""}
    ${hr()}
    ${small("Notre équipe examine tous les signalements dans les plus brefs délais. Un contenu incorrectement signalé sera réactivé après vérification.")}
  `;
  return {
    subject: "Signalement copyright sur ton contenu — Undisc0ver",
    html: layout(body, {
      subject: "Signalement copyright",
      preheader: "Un signalement a été déposé sur l'un de tes contenus Undisc0ver."
    })
  };
}

export function downloadReceiptEmail(user, release, { watermarkId, downloadCount, maxDownloads }) {
  const base = siteUrl();
  const name = esc(user.name || "Acheteur");
  const title = esc(release.title || "");
  const body = `
    ${h1("Téléchargement enregistré")}
    ${p(`Bonjour <strong style="color:${C.text};">${name}</strong>,`)}
    ${p(`Ton téléchargement de <strong style="color:${C.text};">${title}</strong> a bien été enregistré.`, true)}
    ${infoTable([
      ["Fichier", `<strong style="color:${C.text};">${title}</strong>`],
      ["Téléchargement", `${downloadCount} / ${maxDownloads} autorisé${maxDownloads > 1 ? "s" : ""}`],
      ["Trace ID", `<code style="font-family:monospace;font-size:12px;color:${C.textMuted};">${esc(watermarkId)}</code>`],
    ])}
    ${badge("Ce fichier est lié à ton compte. Ne le partage pas — chaque exemplaire téléchargé est tracé de manière unique.", "warning")}
    ${btn("Voir mes achats", `${base}/dashboard`)}
  `;
  return {
    subject: `Téléchargement confirmé — ${release.title}`,
    html: layout(body, {
      subject: `Téléchargement — ${release.title}`,
      preheader: `Ton téléchargement de "${release.title}" est enregistré.`
    })
  };
}

export function staffTicketReplyEmail(user, ticket, replyBody) {
  const base = siteUrl();
  const name = esc((user && user.name) || ticket.name || "Utilisateur");
  const body = `
    ${h1("Réponse à ton ticket")}
    ${p(`Bonjour <strong style="color:${C.text};">${name}</strong>,`)}
    ${p("L'équipe Undisc0ver a répondu à ton ticket de support.", true)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:${C.bg};border:1px solid ${C.border};border-radius:10px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.4px;font-family:-apple-system,sans-serif;">Réponse du support</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:${C.text};font-family:-apple-system,sans-serif;">${esc(replyBody)}</p>
        </td>
      </tr>
    </table>
    ${infoTable([["Référence", `<code style="font-family:monospace;font-size:13px;color:${C.accent};">#${esc(ticket.id || "—")}</code>`]])}
    ${hr()}
    ${small(`Si tu as d'autres questions, <a href="${base}/support" style="color:${C.accent};text-decoration:none;">ouvre un nouveau ticket</a>.`)}
  `;
  return {
    subject: `Réponse à ton ticket #${ticket.id} — Undisc0ver`,
    html: layout(body, {
      subject: "Réponse à ton ticket",
      preheader: "L'équipe Undisc0ver a répondu à ta demande de support."
    })
  };
}
