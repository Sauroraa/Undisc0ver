import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Copy,
  CreditCard,
  CircleCheck,
  Dribbble,
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Facebook,
  FileText,
  Filter as FilterIcon,
  Github,
  HelpCircle,
  Headphones as HeadsetIcon,
  Heart,
  Home as HomeIcon,
  Instagram,
  Info,
  LifeBuoy,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Music2,
  Package,
  Plus,
  Phone,
  Play,
  RefreshCw,
  Search,
  Server,
  ShoppingCart,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SquareArrowOutUpRight,
  Tag,
  Trash,
  Twitter,
  Upload,
  UserPlus,
  Users,
  Wallet,
  Wifi as WifiIcon,
  X
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import * as THREE from "three";
import "./styles.css";

const API = "/api";
const AuthContext = createContext(null);
const I18nContext = createContext(null);
const DOWNLOAD_GATE_ACTIONS = [
  {
    id: "like",
    label: "Like",
    title: "Like the release",
    description: "Add the track to liked releases before download."
  },
  {
    id: "follow",
    label: "Follow",
    title: "Follow the artist",
    description: "Grow the artist audience with one clean follow."
  },
  {
    id: "share",
    label: "Share",
    title: "Share the release",
    description: "Copy the release link or share it before unlock."
  },
  {
    id: "comment",
    label: "Comment",
    title: "Leave a comment",
    description: "Ask fans for quick feedback before the WAV opens."
  }
];

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Francais", short: "FR" },
  { code: "nl", label: "Nederlands", short: "NL" },
  { code: "de", label: "Deutsch", short: "DE" }
];

const TRANSLATIONS = {
  fr: {
    "Home": "Accueil",
    "Release": "Sorties",
    "Releases": "Sorties",
    "Artists": "Artistes",
    "Support": "Support",
    "Upload": "Uploader",
    "Sign In": "Connexion",
    "Sign Up": "Inscription",
    "Get Started": "Commencer",
    "Settings": "Parametres",
    "Dashboard": "Dashboard",
    "Catalog": "Catalogue",
    "Payouts": "Paiements",
    "Analytics": "Analytics",
    "Overview": "Vue d'ensemble",
    "Workflow": "Workflow",
    "Upload release": "Uploader une sortie",
    "Help center": "Centre d'aide",
    "Profile": "Profil",
    "Pricing": "Tarifs",
    "Charts": "Classements",
    "Explore": "Explorer",
    "Upload release": "Uploader une sortie",
    "Explore catalog": "Explorer le catalogue",
    "See what is moving this week.": "Voir ce qui bouge cette semaine.",
    "Publish a track, EP or dubpack.": "Publier un track, EP ou dubpack.",
    "Browse new drops and free downloads.": "Parcourir les nouvelles sorties et free downloads.",
    "Compare plans and checkout flows.": "Comparer les plans et les paiements.",
    "Artist index": "Index artistes",
    "Artist dashboard": "Dashboard artiste",
    "Getting started": "Demarrage",
    "Release guide": "Guide de sortie",
    "Community": "Communaute",
    "Help Center": "Centre d'aide",
    "Documentation": "Documentation",
    "System Status": "Statut systeme",
    "Upgrade to U0 Pro": "Passer a U0 Pro",
    "for advanced analytics, unlimited catalog and faster payouts": "pour analytics avances, catalogue illimite et paiements plus rapides",
    "The yard is open": "Le yard est ouvert",
    "Ship your release": "Expedie ta sortie",
    "direct to the crowd.": "direct au public.",
    "Undiscover gives electronic artists a fast, direct storefront for tracks, EPs and dubpacks. Upload, share, sell and grow without a middleman.": "Undiscover donne aux artistes electro une vitrine rapide et directe pour tracks, EPs et dubpacks. Upload, partage, vends et grandis sans intermediaire.",
    "Start uploading": "Commencer l'upload",
    "Request a demo": "Demander une demo",
    "Trusted by": "Adopte par",
    "independent artists and DJs.": "artistes independants et DJs.",
    "Powering direct drops for artists": "Propulse les drops directs des artistes",
    "Fresh crates": "Caisses fraiches",
    "New releases moving through the yard.": "Nouvelles sorties en mouvement dans le yard.",
    "Tracks, EPs and dubpacks shown like a dock wall: raw artwork, clean signals, quick actions.": "Tracks, EPs et dubpacks affiches comme un mur de dock : artwork brut, signaux propres, actions rapides.",
    "Browse releases": "Parcourir les sorties",
    "Warehouse rail": "Rail d'entrepot",
    "New releases": "Nouvelles sorties",
    "Swipe, wheel or tap the side covers to browse the latest drops.": "Swipe, molette ou touche les covers laterales pour parcourir les derniers drops.",
    "Explore drops": "Explorer les drops",
    "Explore": "Explorer",
    "Trending offers": "Offres tendance",
    "Fast cards for releases, free downloads and paid dubpacks.": "Cards rapides pour sorties, free downloads et dubpacks payants.",
    "Open charts": "Ouvrir les charts",
    "Chart movers": "Mouvements du chart",
    "Explore all": "Tout explorer",
    "Trending": "Tendance",
    "See all": "Tout voir",
    "Dubpacks": "Dubpacks",
    "Browse all": "Tout parcourir",
    "Built for makers, loved by electronic artists.": "Construit pour les createurs, adore par les artistes electro.",
    "Undiscover gives producers a sharper way to package tracks, prove demand and sell directly to their audience.": "Undiscover donne aux producteurs une facon plus nette de packager leurs tracks, prouver la demande et vendre directement a leur public.",
    "Find releases built for DJs.": "Trouve des sorties faites pour les DJs.",
    "Tracks, EPs and dubpacks from independent electronic artists.": "Tracks, EPs et dubpacks d'artistes electro independants.",
    "Search artist, track, genre...": "Rechercher artiste, track, genre...",
    "Trending this week": "Tendance cette semaine",
    "Ranked by plays, sales energy and yard noise.": "Classe par plays, energie ventes et bruit du yard.",
    "Independent producers, clean storefronts.": "Producteurs independants, vitrines propres.",
    "Follow artists, browse catalogs and message for bookings.": "Suis les artistes, parcours les catalogues et envoie des messages pour bookings.",
    "Search artist or genre...": "Rechercher artiste ou genre...",
    "Verified": "Verifie",
    "Top signal": "Signal fort",
    "No releases yet": "Aucune sortie",
    "Upload coming soon": "Upload bientot disponible",
    "followers": "abonnes",
    "releases": "sorties",
    "plays": "plays",
    "likes": "likes",
    "downloads": "downloads",
    "Message": "Message",
    "Follow": "Suivre",
    "Following": "Suivi",
    "Free": "Gratuit",
    "Free download": "Download gratuit",
    "Preview": "Preview",
    "Download WAV": "Telecharger WAV",
    "Preparing...": "Preparation...",
    "Buy": "Acheter",
    "By": "Par",
    "New release": "Nouvelle sortie",
    "Upload a track, EP or dubpack.": "Upload un track, EP ou dubpack.",
    "Local demo upload: metadata is saved in SQLite and appears instantly across the site.": "Demo locale : les metadonnees sont sauvegardees dans SQLite et apparaissent instantanement sur le site.",
    "Audio file upload": "Upload fichier audio",
    "Drag and drop or choose file to upload": "Glisse-depose ou choisis un fichier a uploader",
    "Recommended max. size: 500 MB. Accepted file types: WAV, MP3, AIFF.": "Taille max recommandee : 500 MB. Types acceptes : WAV, MP3, AIFF.",
    "Processing audio": "Traitement audio",
    "Ready": "Pret",
    "Track title": "Titre du track",
    "Type": "Type",
    "Genre": "Genre",
    "Tracks": "Tracks",
    "Duration": "Duree",
    "Fixed price": "Prix fixe",
    "Price EUR": "Prix EUR",
    "Download gate": "Gate de download",
    "None": "Aucun",
    "Email required": "Email requis",
    "Follow required": "Follow requis",
    "Description": "Description",
    "Publish release": "Publier la sortie",
    "Pricing based on your success.": "Tarifs bases sur ton succes.",
    "One yard. Two ways to grow.": "Un yard. Deux facons de grandir.",
    "Start free, then upgrade when your catalog needs pro tools, advanced analytics and payout acceleration.": "Commence gratuit, puis upgrade quand ton catalogue a besoin d'outils pro, analytics avances et paiements acceleres.",
    "Monthly": "Mensuel",
    "Yearly": "Annuel",
    "Get Started Now": "Commencer maintenant",
    "Why Undiscover?": "Pourquoi Undiscover ?",
    "Side-by-side. No fluff.": "Comparaison directe. Sans blabla.",
    "Available balance": "Solde disponible",
    "Good evening,": "Bonsoir,",
    "Manage releases, revenue and direct audience signals from one compact console.": "Gere sorties, revenus et signaux d'audience depuis une console compacte.",
    "New release": "Nouvelle sortie",
    "View profile": "Voir profil",
    "You have new payout activity.": "Nouvelle activite de paiement.",
    "Your demo revenue has updated from recent checkout actions.": "Tes revenus demo ont ete mis a jour apres les derniers checkouts.",
    "Review payouts": "Voir paiements",
    "Catalog metadata needs attention.": "Les metadonnees catalogue demandent attention.",
    "One release is missing final artwork. Add the crate mark before public launch.": "Une sortie manque d'artwork final. Ajoute la crate mark avant le lancement public.",
    "Open catalog": "Ouvrir catalogue",
    "Connected": "Connecte",
    "Edit": "Modifier",
    "Notifications": "Notifications",
    "Read": "Lire",
    "Artwork missing": "Artwork manquant",
    "Fix": "Corriger",
    "Team Invitation": "Invitation d'equipe",
    "Invited 5 minutes ago": "Invite il y a 5 minutes",
    "Revenue": "Revenus",
    "Downloads": "Downloads",
    "Followers": "Abonnes",
    "Share link shortener": "Raccourcisseur de lien",
    "Prepare compact release links for stories, bios and DJ promo sends.": "Prepare des liens compacts pour stories, bios et envois promo DJ.",
    "Long release URL": "URL longue de sortie",
    "Shorten": "Raccourcir",
    "Reset": "Reset",
    "Copy": "Copier",
    "Copied": "Copie",
    "Revenue - last 7 days": "Revenus - 7 derniers jours",
    "Sign in to your account": "Connexion a ton compte",
    "Create an account": "Creer un compte",
    "Enter your email below to sign in": "Entre ton email pour te connecter",
    "Enter your details below to sign up": "Entre tes infos pour t'inscrire",
    "Artist name": "Nom d'artiste",
    "Password": "Mot de passe",
    "Don't have an account?": "Pas encore de compte ?",
    "Already have an account?": "Deja un compte ?",
    "Or continue with": "Ou continuer avec",
    "Continue with Google": "Continuer avec Google",
    "Welcome back. The yard is still open.": "Bon retour. Le yard est toujours ouvert.",
    "Create an account. Ship your next release.": "Cree un compte. Expedie ta prochaine sortie.",
    "Login required": "Connexion requise",
    "Login": "Connexion",
    "Page not found": "Page introuvable",
    "Go Back": "Retour",
    "Go Home": "Accueil"
  },
  nl: {},
  de: {}
};

TRANSLATIONS.nl = {
  "Home": "Home", "Release": "Releases", "Releases": "Releases", "Artists": "Artiesten", "Support": "Support", "Upload": "Uploaden",
  "Sign In": "Inloggen", "Sign Up": "Registreren", "Get Started": "Starten", "Settings": "Instellingen", "Dashboard": "Dashboard", "Catalog": "Catalogus", "Payouts": "Uitbetalingen", "Analytics": "Analytics", "Overview": "Overzicht",
  "The yard is open": "De yard is open", "Ship your release": "Verzend je release", "direct to the crowd.": "direct naar je publiek.", "Start uploading": "Begin met uploaden", "Request a demo": "Demo aanvragen",
  "Fresh crates": "Nieuwe crates", "New releases moving through the yard.": "Nieuwe releases bewegen door de yard.", "Browse releases": "Releases bekijken", "Trending offers": "Trending aanbiedingen", "Open charts": "Charts openen",
  "Find releases built for DJs.": "Vind releases gemaakt voor DJs.", "Trending this week": "Trending deze week", "Independent producers, clean storefronts.": "Onafhankelijke producers, nette storefronts.",
  "Search artist, track, genre...": "Zoek artiest, track, genre...", "Search artist or genre...": "Zoek artiest of genre...", "Verified": "Geverifieerd", "Top signal": "Top signaal",
  "followers": "volgers", "releases": "releases", "Message": "Bericht", "Follow": "Volgen", "Following": "Volgend", "Free": "Gratis", "Free download": "Gratis download",
  "Download WAV": "WAV downloaden", "Preparing...": "Voorbereiden...", "Buy": "Kopen", "New release": "Nieuwe release", "Upload a track, EP or dubpack.": "Upload een track, EP of dubpack.",
  "Track title": "Tracktitel", "Duration": "Duur", "Fixed price": "Vaste prijs", "Price EUR": "Prijs EUR", "Description": "Beschrijving", "Publish release": "Release publiceren",
  "Pricing": "Prijzen", "Pricing based on your success.": "Prijzen gebaseerd op je succes.", "Monthly": "Maandelijks", "Yearly": "Jaarlijks",
  "Available balance": "Beschikbaar saldo", "Good evening,": "Goedenavond,", "New release": "Nieuwe release", "View profile": "Profiel bekijken",
  "Connected": "Verbonden", "Notifications": "Meldingen", "Team Invitation": "Teamuitnodiging", "Revenue": "Omzet", "Downloads": "Downloads", "Followers": "Volgers",
  "Share link shortener": "Linkverkorter", "Long release URL": "Lange release-URL", "Shorten": "Verkorten", "Copy": "Kopieren", "Copied": "Gekopieerd",
  "Sign in to your account": "Log in op je account", "Create an account": "Maak een account", "Password": "Wachtwoord", "Continue with Google": "Doorgaan met Google",
  "Login required": "Login vereist", "Login": "Inloggen", "Page not found": "Pagina niet gevonden", "Go Back": "Terug", "Go Home": "Naar home"
};

TRANSLATIONS.de = {
  "Home": "Start", "Release": "Releases", "Releases": "Releases", "Artists": "Kunstler", "Support": "Support", "Upload": "Upload",
  "Sign In": "Anmelden", "Sign Up": "Registrieren", "Get Started": "Loslegen", "Settings": "Einstellungen", "Dashboard": "Dashboard", "Catalog": "Katalog", "Payouts": "Auszahlungen", "Analytics": "Analytics", "Overview": "Ubersicht",
  "The yard is open": "Der Yard ist offen", "Ship your release": "Versende dein Release", "direct to the crowd.": "direkt zum Publikum.", "Start uploading": "Upload starten", "Request a demo": "Demo anfragen",
  "Fresh crates": "Frische Crates", "New releases moving through the yard.": "Neue Releases bewegen sich durch den Yard.", "Browse releases": "Releases ansehen", "Trending offers": "Trending Angebote", "Open charts": "Charts offnen",
  "Find releases built for DJs.": "Finde Releases fur DJs.", "Trending this week": "Diese Woche im Trend", "Independent producers, clean storefronts.": "Unabhangige Producer, klare Storefronts.",
  "Search artist, track, genre...": "Artist, Track, Genre suchen...", "Search artist or genre...": "Artist oder Genre suchen...", "Verified": "Verifiziert", "Top signal": "Top Signal",
  "followers": "Follower", "releases": "Releases", "Message": "Nachricht", "Follow": "Folgen", "Following": "Folgt", "Free": "Gratis", "Free download": "Gratis Download",
  "Download WAV": "WAV herunterladen", "Preparing...": "Vorbereitung...", "Buy": "Kaufen", "New release": "Neues Release", "Upload a track, EP or dubpack.": "Lade einen Track, eine EP oder ein Dubpack hoch.",
  "Track title": "Tracktitel", "Duration": "Dauer", "Fixed price": "Festpreis", "Price EUR": "Preis EUR", "Description": "Beschreibung", "Publish release": "Release veroffentlichen",
  "Pricing": "Preise", "Pricing based on your success.": "Preise basierend auf deinem Erfolg.", "Monthly": "Monatlich", "Yearly": "Jahrlich",
  "Available balance": "Verfugbares Guthaben", "Good evening,": "Guten Abend,", "New release": "Neues Release", "View profile": "Profil ansehen",
  "Connected": "Verbunden", "Notifications": "Benachrichtigungen", "Team Invitation": "Teameinladung", "Revenue": "Umsatz", "Downloads": "Downloads", "Followers": "Follower",
  "Share link shortener": "Link-Kurzer", "Long release URL": "Lange Release-URL", "Shorten": "Kurzen", "Copy": "Kopieren", "Copied": "Kopiert",
  "Sign in to your account": "Bei deinem Konto anmelden", "Create an account": "Konto erstellen", "Password": "Passwort", "Continue with Google": "Mit Google fortfahren",
  "Login required": "Login erforderlich", "Login": "Anmelden", "Page not found": "Seite nicht gefunden", "Go Back": "Zuruck", "Go Home": "Zur Startseite"
};

Object.assign(TRANSLATIONS.nl, {
  "Undiscover gives electronic artists a fast, direct storefront for tracks, EPs and dubpacks. Upload, share, sell and grow without a middleman.": "Undiscover geeft elektronische artiesten een snelle, directe storefront voor tracks, EPs en dubpacks. Upload, deel, verkoop en groei zonder tussenpersoon.",
  "Powering direct drops for artists": "Directe drops voor artiesten",
  "Tracks, EPs and dubpacks shown like a dock wall: raw artwork, clean signals, quick actions.": "Tracks, EPs en dubpacks als een dockwand: rauwe artwork, heldere signalen, snelle acties.",
  "Warehouse rail": "Warehouse rail",
  "New releases": "Nieuwe releases",
  "Swipe, wheel or tap the side covers to browse the latest drops.": "Swipe, scroll of tik op de zijkanten om de nieuwste drops te bekijken.",
  "Fast cards for releases, free downloads and paid dubpacks.": "Snelle kaarten voor releases, gratis downloads en betaalde dubpacks.",
  "Built for makers, loved by electronic artists.": "Gemaakt voor makers, geliefd bij elektronische artiesten.",
  "Undiscover gives producers a sharper way to package tracks, prove demand and sell directly to their audience.": "Undiscover geeft producers een scherpere manier om tracks te verpakken, vraag te bewijzen en direct aan hun publiek te verkopen.",
  "Tracks, EPs and dubpacks from independent electronic artists.": "Tracks, EPs en dubpacks van onafhankelijke elektronische artiesten.",
  "Ranked by plays, sales energy and yard noise.": "Gerangschikt op plays, verkoopenergie en yard-signalen.",
  "Follow artists, browse catalogs and message for bookings.": "Volg artiesten, bekijk catalogi en stuur berichten voor bookings.",
  "No releases yet": "Nog geen releases",
  "Upload coming soon": "Upload komt binnenkort",
  "Direct club music catalog, free gates, dubpacks and release drops.": "Directe clubmuziekcatalogus, free gates, dubpacks en release drops.",
  "Upload a track, EP or dubpack.": "Upload een track, EP of dubpack.",
  "Local demo upload: metadata is saved in SQLite and appears instantly across the site.": "Lokale demo-upload: metadata wordt opgeslagen in SQLite en verschijnt direct op de site.",
  "Audio file upload": "Audiobestand uploaden",
  "Drag and drop or choose file to upload": "Sleep een bestand of kies een bestand om te uploaden",
  "Recommended max. size: 500 MB. Accepted file types: WAV, MP3, AIFF.": "Aanbevolen max. grootte: 500 MB. Geaccepteerde types: WAV, MP3, AIFF.",
  "Processing audio": "Audio verwerken",
  "Ready": "Klaar",
  "Type": "Type",
  "Tracks": "Tracks",
  "Download gate": "Download gate",
  "None": "Geen",
  "Email required": "Email vereist",
  "Follow required": "Follow vereist",
  "Pricing based on your success.": "Prijzen gebaseerd op je succes.",
  "One yard. Two ways to grow.": "Een yard. Twee manieren om te groeien.",
  "Start free, then upgrade when your catalog needs pro tools, advanced analytics and payout acceleration.": "Start gratis en upgrade wanneer je catalogus pro tools, geavanceerde analytics en snellere uitbetalingen nodig heeft.",
  "Why Undiscover?": "Waarom Undiscover?",
  "Side-by-side. No fluff.": "Naast elkaar. Geen ruis.",
  "Manage releases, revenue and direct audience signals from one compact console.": "Beheer releases, omzet en directe publieksignalen vanuit een compacte console.",
  "You have new payout activity.": "Je hebt nieuwe uitbetalingsactiviteit.",
  "Your demo revenue has updated from recent checkout actions.": "Je demo-omzet is bijgewerkt door recente checkout-acties.",
  "Review payouts": "Uitbetalingen bekijken",
  "Catalog metadata needs attention.": "Catalogusmetadata heeft aandacht nodig.",
  "One release is missing final artwork. Add the crate mark before public launch.": "Een release mist definitieve artwork. Voeg de crate mark toe voor publicatie.",
  "Open catalog": "Catalogus openen",
  "Edit": "Bewerken",
  "Read": "Lezen",
  "Artwork missing": "Artwork ontbreekt",
  "Fix": "Oplossen",
  "Invited 5 minutes ago": "5 minuten geleden uitgenodigd",
  "Prepare compact release links for stories, bios and DJ promo sends.": "Maak compacte release-links voor stories, bios en DJ promo-sends.",
  "Reset": "Resetten",
  "Revenue - last 7 days": "Omzet - laatste 7 dagen",
  "Enter your email below to sign in": "Vul je email in om in te loggen",
  "Enter your details below to sign up": "Vul je gegevens in om te registreren",
  "Artist name": "Artiestennaam",
  "Don't have an account?": "Nog geen account?",
  "Already have an account?": "Al een account?",
  "Or continue with": "Of ga verder met",
  "Welcome back. The yard is still open.": "Welkom terug. De yard is nog open.",
  "Create an account. Ship your next release.": "Maak een account. Verzend je volgende release."
});

Object.assign(TRANSLATIONS.de, {
  "Undiscover gives electronic artists a fast, direct storefront for tracks, EPs and dubpacks. Upload, share, sell and grow without a middleman.": "Undiscover gibt elektronischen Kunstlern eine schnelle, direkte Storefront fur Tracks, EPs und Dubpacks. Uploaden, teilen, verkaufen und wachsen ohne Zwischenhandler.",
  "Powering direct drops for artists": "Direkte Drops fur Kunstler",
  "Tracks, EPs and dubpacks shown like a dock wall: raw artwork, clean signals, quick actions.": "Tracks, EPs und Dubpacks wie eine Dockwand: rohe Artworks, klare Signale, schnelle Aktionen.",
  "Warehouse rail": "Warehouse Rail",
  "New releases": "Neue Releases",
  "Swipe, wheel or tap the side covers to browse the latest drops.": "Swipe, scroll oder tippe auf die seitlichen Cover, um die neuesten Drops zu durchsuchen.",
  "Fast cards for releases, free downloads and paid dubpacks.": "Schnelle Karten fur Releases, Gratis-Downloads und bezahlte Dubpacks.",
  "Built for makers, loved by electronic artists.": "Gebaut fur Maker, geliebt von elektronischen Kunstlern.",
  "Undiscover gives producers a sharper way to package tracks, prove demand and sell directly to their audience.": "Undiscover gibt Producern eine klarere Art, Tracks zu verpacken, Nachfrage zu zeigen und direkt ans Publikum zu verkaufen.",
  "Tracks, EPs and dubpacks from independent electronic artists.": "Tracks, EPs und Dubpacks von unabhangigen elektronischen Kunstlern.",
  "Ranked by plays, sales energy and yard noise.": "Sortiert nach Plays, Verkaufsenergie und Yard-Signalen.",
  "Follow artists, browse catalogs and message for bookings.": "Folge Kunstlern, durchsuche Kataloge und schreibe fur Bookings.",
  "No releases yet": "Noch keine Releases",
  "Upload coming soon": "Upload kommt bald",
  "Direct club music catalog, free gates, dubpacks and release drops.": "Direkter Clubmusik-Katalog, Free Gates, Dubpacks und Release Drops.",
  "Local demo upload: metadata is saved in SQLite and appears instantly across the site.": "Lokaler Demo-Upload: Metadaten werden in SQLite gespeichert und erscheinen sofort auf der Website.",
  "Audio file upload": "Audiodatei hochladen",
  "Drag and drop or choose file to upload": "Datei ziehen oder zum Upload auswahlen",
  "Recommended max. size: 500 MB. Accepted file types: WAV, MP3, AIFF.": "Empfohlene max. Grosse: 500 MB. Akzeptierte Typen: WAV, MP3, AIFF.",
  "Processing audio": "Audio wird verarbeitet",
  "Ready": "Bereit",
  "Type": "Typ",
  "Tracks": "Tracks",
  "Download gate": "Download Gate",
  "None": "Keins",
  "Email required": "Email erforderlich",
  "Follow required": "Follow erforderlich",
  "One yard. Two ways to grow.": "Ein Yard. Zwei Wege zu wachsen.",
  "Start free, then upgrade when your catalog needs pro tools, advanced analytics and payout acceleration.": "Starte kostenlos und upgrade, wenn dein Katalog Pro-Tools, erweiterte Analytics und schnellere Auszahlungen braucht.",
  "Why Undiscover?": "Warum Undiscover?",
  "Side-by-side. No fluff.": "Direkter Vergleich. Kein Ballast.",
  "Manage releases, revenue and direct audience signals from one compact console.": "Verwalte Releases, Umsatz und direkte Publikumssignale in einer kompakten Konsole.",
  "You have new payout activity.": "Neue Auszahlungsaktivitat vorhanden.",
  "Your demo revenue has updated from recent checkout actions.": "Dein Demo-Umsatz wurde durch aktuelle Checkouts aktualisiert.",
  "Review payouts": "Auszahlungen prufen",
  "Catalog metadata needs attention.": "Katalog-Metadaten brauchen Aufmerksamkeit.",
  "One release is missing final artwork. Add the crate mark before public launch.": "Einem Release fehlt das finale Artwork. Fuge vor dem Launch die Crate Mark hinzu.",
  "Open catalog": "Katalog offnen",
  "Edit": "Bearbeiten",
  "Read": "Lesen",
  "Artwork missing": "Artwork fehlt",
  "Fix": "Beheben",
  "Invited 5 minutes ago": "Vor 5 Minuten eingeladen",
  "Prepare compact release links for stories, bios and DJ promo sends.": "Erstelle kompakte Release-Links fur Stories, Bios und DJ-Promos.",
  "Reset": "Zurucksetzen",
  "Revenue - last 7 days": "Umsatz - letzte 7 Tage",
  "Enter your email below to sign in": "Gib deine Email ein, um dich anzumelden",
  "Enter your details below to sign up": "Gib deine Daten ein, um dich zu registrieren",
  "Artist name": "Kunstlername",
  "Don't have an account?": "Noch kein Konto?",
  "Already have an account?": "Schon ein Konto?",
  "Or continue with": "Oder fortfahren mit",
  "Welcome back. The yard is still open.": "Willkommen zuruck. Der Yard ist noch offen.",
  "Create an account. Ship your next release.": "Erstelle ein Konto. Versende dein nachstes Release."
});

Object.assign(TRANSLATIONS.fr, {
  "All rights reserved.": "Tous droits reserves.",
  "Get release notes": "Recevoir les notes de sortie",
  "About": "A propos",
  "Brand concept": "Concept de marque",
  "Careers": "Carrieres",
  "Services": "Services",
  "Sell dubpacks": "Vendre des dubpacks",
  "Checkout demo": "Demo checkout",
  "Helpful Links": "Liens utiles",
  "FAQs": "FAQ",
  "Live chat": "Chat live",
  "Contact": "Contact",
  "Feature": "Fonctionnalite",
  "Features": "Fonctionnalites",
  "Others": "Autres",
  "Compare plans": "Comparer les plans",
  "Public artist profile": "Profil artiste public",
  "Upload tracks and EPs": "Upload tracks et EPs",
  "Free download gates": "Gates de download gratuit",
  "Advanced analytics": "Analytics avances",
  "Dubpack storefront": "Storefront dubpack",
  "Priority support": "Support prioritaire",
  "Custom checkout notes": "Notes checkout personnalisees",
  "Unlimited catalog": "Catalogue illimite",
  "Fast payout queue": "File payout rapide",
  "How do I publish a release?": "Comment publier une sortie ?",
  "Can I update pricing after upload?": "Puis-je modifier le prix apres upload ?",
  "How do artists get support?": "Comment les artistes obtiennent du support ?",
  "Checkout": "Checkout",
  "Complete your Undiscover purchase.": "Finalise ton achat Undiscover.",
  "Demo payment form for subscriptions and paid releases. No real card is charged.": "Formulaire de paiement demo pour abonnements et sorties payantes. Aucune vraie carte n'est debitee.",
  "or pay using credit card": "ou payer par carte bancaire",
  "Card holder full name": "Nom complet du titulaire",
  "Enter your full name": "Entre ton nom complet",
  "Card Number": "Numero de carte",
  "Expiry Date": "Date d'expiration",
  "Tune your artist workspace.": "Ajuste ton workspace artiste.",
  "Local account preferences for profile, catalog behavior, notifications and plan selection.": "Preferences locales pour profil, catalogue, notifications et choix du plan.",
  "Personal information": "Informations personnelles",
  "Update the public-facing artist identity used across Undiscover.": "Modifie l'identite artiste publique utilisee sur Undiscover.",
  "Email": "Email",
  "Location": "Localisation",
  "Role": "Role",
  "Artist owner": "Owner artiste",
  "Workspace settings": "Parametres workspace",
  "Control how your catalog appears to listeners, DJs and promoters.": "Controle comment ton catalogue apparait aux auditeurs, DJs et promoteurs.",
  "Workspace name": "Nom du workspace",
  "Visibility": "Visibilite",
  "Public": "Public",
  "Private": "Prive",
  "Workspace description": "Description workspace",
  "Plan type": "Type de plan",
  "Select the plan that matches your release cycle.": "Choisis le plan adapte a ton cycle de sorties.",
  "recommended": "recommande",
  "Why artists use Undiscover": "Pourquoi les artistes utilisent Undiscover",
  "Direct checkout and free gates": "Checkout direct et gates gratuits",
  "Catalog analytics without noise": "Analytics catalogue sans bruit",
  "Release pages made for sharing": "Pages release faites pour le partage",
  "Learn more": "En savoir plus",
  "Cancel": "Annuler",
  "Save settings": "Enregistrer"
});

Object.assign(TRANSLATIONS.nl, {
  "All rights reserved.": "Alle rechten voorbehouden.", "Get release notes": "Ontvang release notes", "About": "Over", "Brand concept": "Merkconcept", "Careers": "Vacatures", "Services": "Diensten", "Sell dubpacks": "Dubpacks verkopen", "Checkout demo": "Checkout demo", "Helpful Links": "Handige links", "FAQs": "FAQ", "Live chat": "Live chat", "Contact": "Contact",
  "Feature": "Functie", "Features": "Functies", "Others": "Anderen", "Compare plans": "Plannen vergelijken", "Public artist profile": "Publiek artiestenprofiel", "Upload tracks and EPs": "Tracks en EPs uploaden", "Free download gates": "Gratis download gates", "Advanced analytics": "Geavanceerde analytics", "Dubpack storefront": "Dubpack storefront", "Priority support": "Prioriteitssupport", "Custom checkout notes": "Aangepaste checkout-notities", "Unlimited catalog": "Onbeperkte catalogus", "Fast payout queue": "Snelle uitbetalingsrij",
  "How do I publish a release?": "Hoe publiceer ik een release?", "Can I update pricing after upload?": "Kan ik prijzen aanpassen na upload?", "How do artists get support?": "Hoe krijgen artiesten support?",
  "Checkout": "Checkout", "Complete your Undiscover purchase.": "Voltooi je Undiscover-aankoop.", "Demo payment form for subscriptions and paid releases. No real card is charged.": "Demo-betaalformulier voor abonnementen en betaalde releases. Er wordt geen echte kaart belast.", "or pay using credit card": "of betaal met creditcard", "Card holder full name": "Volledige naam kaarthouder", "Enter your full name": "Vul je volledige naam in", "Card Number": "Kaartnummer", "Expiry Date": "Vervaldatum",
  "Tune your artist workspace.": "Stem je artiestenworkspace af.", "Local account preferences for profile, catalog behavior, notifications and plan selection.": "Lokale accountvoorkeuren voor profiel, catalogusgedrag, meldingen en plankeuze.", "Personal information": "Persoonlijke informatie", "Update the public-facing artist identity used across Undiscover.": "Werk de publieke artiestenidentiteit bij die op Undiscover wordt gebruikt.", "Email": "Email", "Location": "Locatie", "Role": "Rol", "Artist owner": "Artiest eigenaar", "Workspace settings": "Workspace instellingen", "Control how your catalog appears to listeners, DJs and promoters.": "Bepaal hoe je catalogus verschijnt voor luisteraars, DJs en promotors.", "Workspace name": "Workspace naam", "Visibility": "Zichtbaarheid", "Public": "Publiek", "Private": "Prive", "Workspace description": "Workspace beschrijving", "Plan type": "Plantype", "Select the plan that matches your release cycle.": "Kies het plan dat bij je releasecyclus past.", "recommended": "aanbevolen", "Why artists use Undiscover": "Waarom artiesten Undiscover gebruiken", "Learn more": "Meer weten", "Cancel": "Annuleren", "Save settings": "Opslaan"
});

Object.assign(TRANSLATIONS.de, {
  "All rights reserved.": "Alle Rechte vorbehalten.", "Get release notes": "Release Notes erhalten", "About": "Uber", "Brand concept": "Markenkonzept", "Careers": "Karriere", "Services": "Services", "Sell dubpacks": "Dubpacks verkaufen", "Checkout demo": "Checkout Demo", "Helpful Links": "Hilfreiche Links", "FAQs": "FAQ", "Live chat": "Live Chat", "Contact": "Kontakt",
  "Feature": "Funktion", "Features": "Funktionen", "Others": "Andere", "Compare plans": "Plane vergleichen", "Public artist profile": "Offentliches Kunstlerprofil", "Upload tracks and EPs": "Tracks und EPs hochladen", "Free download gates": "Gratis Download Gates", "Advanced analytics": "Erweiterte Analytics", "Dubpack storefront": "Dubpack Storefront", "Priority support": "Prioritats-Support", "Custom checkout notes": "Individuelle Checkout-Notizen", "Unlimited catalog": "Unbegrenzter Katalog", "Fast payout queue": "Schnelle Auszahlungsschlange",
  "How do I publish a release?": "Wie veroffentliche ich ein Release?", "Can I update pricing after upload?": "Kann ich Preise nach dem Upload andern?", "How do artists get support?": "Wie bekommen Kunstler Support?",
  "Checkout": "Checkout", "Complete your Undiscover purchase.": "Schliesse deinen Undiscover-Kauf ab.", "Demo payment form for subscriptions and paid releases. No real card is charged.": "Demo-Zahlungsformular fur Abos und bezahlte Releases. Keine echte Karte wird belastet.", "or pay using credit card": "oder mit Kreditkarte zahlen", "Card holder full name": "Vollstandiger Name des Karteninhabers", "Enter your full name": "Gib deinen vollstandigen Namen ein", "Card Number": "Kartennummer", "Expiry Date": "Ablaufdatum",
  "Tune your artist workspace.": "Passe deinen Kunstler-Workspace an.", "Local account preferences for profile, catalog behavior, notifications and plan selection.": "Lokale Kontoeinstellungen fur Profil, Katalogverhalten, Benachrichtigungen und Planwahl.", "Personal information": "Personliche Informationen", "Update the public-facing artist identity used across Undiscover.": "Aktualisiere die offentliche Kunstleridentitat auf Undiscover.", "Email": "Email", "Location": "Standort", "Role": "Rolle", "Artist owner": "Kunstler Owner", "Workspace settings": "Workspace Einstellungen", "Control how your catalog appears to listeners, DJs and promoters.": "Steuere, wie dein Katalog fur Horer, DJs und Promoter erscheint.", "Workspace name": "Workspace Name", "Visibility": "Sichtbarkeit", "Public": "Offentlich", "Private": "Privat", "Workspace description": "Workspace Beschreibung", "Plan type": "Plantyp", "Select the plan that matches your release cycle.": "Wahle den Plan, der zu deinem Release-Zyklus passt.", "recommended": "empfohlen", "Why artists use Undiscover": "Warum Kunstler Undiscover nutzen", "Learn more": "Mehr erfahren", "Cancel": "Abbrechen", "Save settings": "Speichern"
});

Object.assign(TRANSLATIONS.fr, {
  "Support": "Support",
  "Upgrade to U0 Pro": "Upgrade naar U0 Pro",
  "Trusted by": "Vertrouwd door",
  "independent artists and DJs.": "onafhankelijke artiesten en DJs.",
  "+ Direct": "+ Direct",
  "+ Built-in": "+ Ingebouwd",
  "Upload release": "Uploader une sortie",
  "Artist dashboard": "Dashboard artiste",
  "Direct storefront for electronic artists. Upload, share and sell tracks, EPs and dubpacks without a middleman.": "Storefront direct pour artistes electro. Upload, partage et vends tracks, EPs et dubpacks sans intermediaire.",
  "Undiscover turned our private dub workflow into a storefront. Uploading, gating and selling edits finally feels direct.": "Undiscover a transforme notre workflow de dubs prives en storefront. Upload, gates et ventes d'edits sont enfin directs.",
  "No bloated marketplace energy. Just clean releases, clean stats, and a checkout I can send to promoters.": "Pas d'energie marketplace gonflee. Juste des sorties propres, des stats propres et un checkout que je peux envoyer aux promoteurs.",
  "The free download gates are exactly what I needed for mailing-list growth.": "Les gates de free download sont exactement ce qu'il me fallait pour faire grandir ma mailing-list.",
  "The artist page feels like a real catalog, not a social feed trying to sell me ads.": "La page artiste ressemble a un vrai catalogue, pas a un feed social qui essaie de me vendre des pubs.",
  "Techno artist": "Artiste techno",
  "Label manager": "Manager label",
  "Browse all ->": "Tout parcourir ->",
  "Simple plans for artists who want to publish, sell and measure their releases without a heavy platform stack.": "Des plans simples pour les artistes qui veulent publier, vendre et mesurer leurs sorties sans stack lourde.",
  "+ Direct": "+ Direct",
  "+ Built-in": "+ Integre",
  "FREE DL": "FREE DL",
  "TRACK": "TRACK",
  "Artist operating system": "Systeme d'exploitation artiste",
  "Catalog, sales and audience signals in one clean yard.": "Catalogue, ventes et signaux d'audience dans un yard propre.",
  "Revenue live": "Revenus live",
  "Latest tracks": "Derniers tracks",
  "U0 Pro plans and checkout are live": "Les plans U0 Pro et le checkout sont en ligne",
  "New": "Nouveau",
  "Previous release": "Sortie precedente",
  "Next release": "Sortie suivante",
  "Previous offers": "Offres precedentes",
  "Next offers": "Offres suivantes",
  "Setup time": "Temps de setup",
  "Artist storefront": "Storefront artiste",
  "Dubpack sales": "Ventes dubpack",
  "Free gates": "Gates gratuits",
  "Payout signal": "Signal paiement",
  "Middleman energy": "Energie intermediaire",
  "Best value for artists testing a release cycle.": "Meilleur choix pour tester un cycle de sortie.",
  "Unlock savings with an annual commitment.": "Debloque des economies avec l'annuel.",
  "Start Your Journey": "Commencer le parcours",
  "Access to all release tools with no hidden fees.": "Acces a tous les outils de sortie sans frais caches.",
  "Create an artist account, open Upload, add your audio metadata and choose free, fixed price or gated download. The release appears instantly in your local catalog.": "Cree un compte artiste, ouvre Upload, ajoute tes metadonnees audio et choisis gratuit, prix fixe ou gate. La sortie apparait instantanement dans ton catalogue local.",
  "Yes. In this local build, pricing and catalog settings are modeled in the dashboard/settings flow. A production build would expose edit controls per release.": "Oui. Dans cette version locale, les prix et reglages catalogue sont modelises dans dashboard/settings. En production, chaque sortie aurait ses controles d'edition.",
  "Use the account menu, the footer support links, or the live chat demo. Undiscover keeps support focused on catalog, checkout and payout questions.": "Utilise le menu compte, les liens support du footer ou la demo live chat. Undiscover concentre le support sur catalogue, checkout et paiements.",
  "PayPal selected.": "PayPal selectionne.",
  "Apple Pay selected.": "Apple Pay selectionne.",
  "Google Pay selected.": "Google Pay selectionne.",
  "Checkout completed in local demo mode.": "Checkout termine en mode demo local.",
  "Settings saved locally.": "Parametres enregistres localement.",
  "Plans": "Plans",
  "artist console": "console artiste",
  "verified artist": "artiste verifie",
  "new": "nouveau",
  "vs last week": "vs semaine derniere",
  "vs last": "vs precedent",
  "Team Invitation": "Invitation d'equipe",
  "Kokonut Club invited you to join": "Kokonut Club t'a invite a rejoindre",
  "Undiscover Label Team": "Equipe Label Undiscover",
  "Share link shortener": "Raccourcisseur de lien partage",
  "URL invalide. Exemple: https://releaseyrd.com/track": "URL invalide. Exemple : https://releaseyrd.com/track",
  "Ajoute un lien a raccourcir.": "Ajoute un lien a raccourcir.",
  "Short link generated locally.": "Lien court genere localement.",
  "Short link copied.": "Lien court copie.",
  "Logout": "Deconnexion",
  "Account created.": "Compte cree.",
  "Logged in.": "Connecte.",
  "Playing": "Lecture",
  "Release uploaded, scanned and published.": "Sortie uploadee, scannee et publiee.",
  "Release blocked by copyright scan.": "Sortie bloquee par le scan copyright.",
  "Release sent to moderation review.": "Sortie envoyee en review moderation.",
  "Copyright clearance": "Verification copyright",
  "Every upload is consent-logged and scanned before public publishing.": "Chaque upload enregistre le consentement et est scanne avant publication.",
  "Rights owner or license holder": "Titulaire des droits ou licence",
  "I confirm I own the rights to this audio or have a valid license to publish, share and sell it on Undiscover.": "Je confirme posseder les droits de cet audio ou avoir une licence valide pour le publier, partager et vendre sur Undiscover.",
  "scan provider": "provider scan",
  "review threshold": "seuil review",
  "auto-block threshold": "seuil blocage auto",
  "Report copyright": "Signaler copyright",
  "Copyright takedown request": "Demande de retrait copyright",
  "Use this form if you represent the rights holder for this release.": "Utilise ce formulaire si tu representes l'ayant droit de cette sortie.",
  "Your name": "Ton nom",
  "Rights owner": "Titulaire des droits",
  "Evidence URL": "URL de preuve",
  "Reason": "Motif",
  "Submit takedown": "Envoyer le retrait",
  "Report received. This release has been moved to review.": "Signalement recu. Cette sortie est placee en review.",
  "Copyright report received.": "Signalement copyright recu.",
  "Copyright center": "Centre copyright",
  "Rights checks and takedowns": "Verification des droits et retraits",
  "Uploads are consent-logged, scanned locally in this demo, and moved out of public pages when a match or report needs review.": "Les uploads enregistrent le consentement, sont scannes localement dans cette demo et sortent du public en cas de match ou signalement.",
  "published": "publie",
  "in review": "en review",
  "blocked": "bloque",
  "Published": "Publie",
  "In review": "En review",
  "Blocked": "Bloque",
  "track(s)": "track(s)",
  "Remove file": "Retirer le fichier",
  "Remove example": "Retirer l'exemple",
  "Example only - upload audio above": "Exemple seulement - upload audio au-dessus",
  "Example file removed from the demo preview.": "Fichier exemple retire de la preview demo.",
  "Search": "Recherche",
  "No results": "Aucun resultat",
  "Page not found": "Page introuvable",
  "We could not find that page in the yard.": "Impossible de trouver cette page dans le yard."
});

Object.assign(TRANSLATIONS.nl, {
  "Support": "Support",
  "Upload": "Uploaden",
  "Upload release": "Release uploaden",
  "Artist dashboard": "Artiestendashboard",
  "for advanced analytics, unlimited catalog and faster payouts": "voor geavanceerde analytics, onbeperkte catalogus en snellere uitbetalingen",
  "Direct storefront for electronic artists. Upload, share and sell tracks, EPs and dubpacks without a middleman.": "Directe storefront voor elektronische artiesten. Upload, deel en verkoop tracks, EPs en dubpacks zonder tussenpersoon.",
  "Undiscover turned our private dub workflow into a storefront. Uploading, gating and selling edits finally feels direct.": "Undiscover maakte van onze private dub-workflow een storefront. Uploaden, gaten en edits verkopen voelt eindelijk direct.",
  "No bloated marketplace energy. Just clean releases, clean stats, and a checkout I can send to promoters.": "Geen opgeblazen marketplace-gevoel. Alleen nette releases, nette stats en een checkout die ik naar promotors kan sturen.",
  "The free download gates are exactly what I needed for mailing-list growth.": "De gratis download gates zijn precies wat ik nodig had voor mailinglijstgroei.",
  "The artist page feels like a real catalog, not a social feed trying to sell me ads.": "De artiestenpagina voelt als een echte catalogus, niet als een social feed die advertenties verkoopt.",
  "Techno artist": "Techno-artiest",
  "Label manager": "Labelmanager",
  "Browse all": "Alles bekijken",
  "Browse all ->": "Alles bekijken ->",
  "Simple plans for artists who want to publish, sell and measure their releases without a heavy platform stack.": "Eenvoudige plannen voor artiesten die releases willen publiceren, verkopen en meten zonder zware platformstack.",
  "Sign up": "Registreren",
  "FREE DL": "FREE DL",
  "TRACK": "TRACK",
  "Artist operating system": "Artiest besturingssysteem",
  "Catalog, sales and audience signals in one clean yard.": "Catalogus, sales en publiekssignalen in een nette yard.",
  "Revenue live": "Omzet live",
  "Latest tracks": "Nieuwste tracks",
  "U0 Pro plans and checkout are live": "U0 Pro-plannen en checkout zijn live",
  "New": "Nieuw",
  "Previous release": "Vorige release",
  "Next release": "Volgende release",
  "Previous offers": "Vorige aanbiedingen",
  "Next offers": "Volgende aanbiedingen",
  "Setup time": "Setup-tijd",
  "Artist storefront": "Artiest storefront",
  "Dubpack sales": "Dubpack sales",
  "Free gates": "Gratis gates",
  "Payout signal": "Uitbetalingssignaal",
  "Middleman energy": "Tussenpersoon-energie",
  "Best value for artists testing a release cycle.": "Beste keuze voor artiesten die een releasecyclus testen.",
  "Unlock savings with an annual commitment.": "Ontgrendel korting met een jaarplan.",
  "Start Your Journey": "Start je traject",
  "Access to all release tools with no hidden fees.": "Toegang tot alle release-tools zonder verborgen kosten.",
  "Create an artist account, open Upload, add your audio metadata and choose free, fixed price or gated download. The release appears instantly in your local catalog.": "Maak een artiestenaccount, open Upload, voeg audiometadata toe en kies gratis, vaste prijs of gated download. De release verschijnt direct in je lokale catalogus.",
  "Yes. In this local build, pricing and catalog settings are modeled in the dashboard/settings flow. A production build would expose edit controls per release.": "Ja. In deze lokale build zitten prijs- en catalogusinstellingen in dashboard/settings. In productie krijgt elke release eigen edit-controls.",
  "Use the account menu, the footer support links, or the live chat demo. Undiscover keeps support focused on catalog, checkout and payout questions.": "Gebruik het accountmenu, de supportlinks in de footer of de live chat-demo. Undiscover houdt support gericht op catalogus, checkout en uitbetalingen.",
  "Plans": "Plannen",
  "artist console": "artiestenconsole",
  "verified artist": "geverifieerde artiest",
  "new": "nieuw",
  "vs last week": "vs vorige week",
  "vs last": "vs vorige",
  "Logout": "Uitloggen",
  "Copyright clearance": "Copyrightcontrole",
  "Every upload is consent-logged and scanned before public publishing.": "Elke upload wordt met toestemming gelogd en gescand voor publicatie.",
  "Rights owner or license holder": "Rechthebbende of licentiehouder",
  "I confirm I own the rights to this audio or have a valid license to publish, share and sell it on Undiscover.": "Ik bevestig dat ik de rechten bezit of een geldige licentie heb om dit audiofragment op Undiscover te publiceren, delen en verkopen.",
  "Report copyright": "Copyright melden",
  "Copyright takedown request": "Copyright takedown-verzoek",
  "Your name": "Je naam",
  "Rights owner": "Rechthebbende",
  "Evidence URL": "Bewijs-URL",
  "Reason": "Reden",
  "Submit takedown": "Takedown verzenden",
  "Copyright center": "Copyrightcentrum",
  "Rights checks and takedowns": "Rechtenchecks en takedowns",
  "published": "gepubliceerd",
  "in review": "in review",
  "blocked": "geblokkeerd",
  "Published": "Gepubliceerd",
  "In review": "In review",
  "Blocked": "Geblokkeerd",
  "track(s)": "track(s)",
  "Remove file": "Bestand verwijderen",
  "Remove example": "Voorbeeld verwijderen",
  "Example only - upload audio above": "Alleen voorbeeld - upload audio hierboven",
  "Search": "Zoeken",
  "No results": "Geen resultaten"
});

Object.assign(TRANSLATIONS.de, {
  "Support": "Hilfe",
  "Upgrade to U0 Pro": "Auf U0 Pro upgraden",
  "Trusted by": "Vertraut von",
  "independent artists and DJs.": "unabhangigen Kunstlern und DJs.",
  "+ Direct": "+ Direkt",
  "+ Built-in": "+ Integriert",
  "Upload": "Upload",
  "Upload release": "Release hochladen",
  "Artist dashboard": "Kunstlerdashboard",
  "for advanced analytics, unlimited catalog and faster payouts": "fur erweiterte Analytics, unbegrenzten Katalog und schnellere Auszahlungen",
  "Direct storefront for electronic artists. Upload, share and sell tracks, EPs and dubpacks without a middleman.": "Direkte Storefront fur elektronische Kunstler. Uploaden, teilen und Tracks, EPs und Dubpacks ohne Zwischenhandler verkaufen.",
  "Undiscover turned our private dub workflow into a storefront. Uploading, gating and selling edits finally feels direct.": "Undiscover hat unseren privaten Dub-Workflow in eine Storefront verwandelt. Uploads, Gates und Edit-Verkauf fuhlen sich endlich direkt an.",
  "No bloated marketplace energy. Just clean releases, clean stats, and a checkout I can send to promoters.": "Keine aufgeblahte Marketplace-Energie. Nur klare Releases, klare Stats und ein Checkout fur Promoter.",
  "The free download gates are exactly what I needed for mailing-list growth.": "Die Gratis-Download-Gates sind genau das, was ich fur Mailinglisten-Wachstum brauchte.",
  "The artist page feels like a real catalog, not a social feed trying to sell me ads.": "Die Kunstlerseite fuhlt sich wie ein echter Katalog an, nicht wie ein Social Feed voller Werbung.",
  "Techno artist": "Techno-Kunstler",
  "Label manager": "Labelmanager",
  "Browse all": "Alles ansehen",
  "Browse all ->": "Alles ansehen ->",
  "Simple plans for artists who want to publish, sell and measure their releases without a heavy platform stack.": "Einfache Plane fur Kunstler, die Releases veroffentlichen, verkaufen und messen wollen, ohne schwere Plattform-Stack.",
  "Sign up": "Registrieren",
  "FREE DL": "FREE DL",
  "TRACK": "TRACK",
  "Artist operating system": "Kunstler-Betriebssystem",
  "Catalog, sales and audience signals in one clean yard.": "Katalog, Sales und Publikumssignale in einem klaren Yard.",
  "Revenue live": "Umsatz live",
  "Latest tracks": "Neueste Tracks",
  "U0 Pro plans and checkout are live": "U0 Pro Plane und Checkout sind live",
  "New": "Neu",
  "Previous release": "Vorheriges Release",
  "Next release": "Nachstes Release",
  "Previous offers": "Vorherige Angebote",
  "Next offers": "Nachste Angebote",
  "Setup time": "Setup-Zeit",
  "Artist storefront": "Kunstler-Storefront",
  "Dubpack sales": "Dubpack-Verkaufe",
  "Free gates": "Gratis Gates",
  "Payout signal": "Auszahlungssignal",
  "Middleman energy": "Zwischenhandler-Energie",
  "Best value for artists testing a release cycle.": "Beste Wahl fur Kunstler, die einen Release-Zyklus testen.",
  "Unlock savings with an annual commitment.": "Spare mit einem Jahresplan.",
  "Start Your Journey": "Reise starten",
  "Access to all release tools with no hidden fees.": "Zugang zu allen Release-Tools ohne versteckte Gebuhren.",
  "Create an artist account, open Upload, add your audio metadata and choose free, fixed price or gated download. The release appears instantly in your local catalog.": "Erstelle ein Kunstlerkonto, offne Upload, fuge Audio-Metadaten hinzu und wahle gratis, Festpreis oder Gate. Das Release erscheint sofort in deinem lokalen Katalog.",
  "Yes. In this local build, pricing and catalog settings are modeled in the dashboard/settings flow. A production build would expose edit controls per release.": "Ja. In dieser lokalen Version sind Preis- und Katalogeinstellungen im Dashboard/Settings-Flow modelliert. In Produktion gabe es Edit-Controls pro Release.",
  "Use the account menu, the footer support links, or the live chat demo. Undiscover keeps support focused on catalog, checkout and payout questions.": "Nutze das Accountmenu, Supportlinks im Footer oder die Live-Chat-Demo. Undiscover fokussiert Support auf Katalog, Checkout und Auszahlungen.",
  "Plans": "Plane",
  "artist console": "Kunstlerkonsole",
  "verified artist": "verifizierter Kunstler",
  "new": "neu",
  "vs last week": "vs letzte Woche",
  "vs last": "vs zuletzt",
  "Logout": "Abmelden",
  "Copyright clearance": "Copyright-Prufung",
  "Every upload is consent-logged and scanned before public publishing.": "Jeder Upload wird mit Zustimmung geloggt und vor Veroffentlichung gescannt.",
  "Rights owner or license holder": "Rechteinhaber oder Lizenzinhaber",
  "I confirm I own the rights to this audio or have a valid license to publish, share and sell it on Undiscover.": "Ich bestatige, dass ich die Rechte besitze oder eine gultige Lizenz habe, um dieses Audio auf Undiscover zu veroffentlichen, zu teilen und zu verkaufen.",
  "Report copyright": "Copyright melden",
  "Copyright takedown request": "Copyright-Takedown-Anfrage",
  "Your name": "Dein Name",
  "Rights owner": "Rechteinhaber",
  "Evidence URL": "Nachweis-URL",
  "Reason": "Grund",
  "Submit takedown": "Takedown senden",
  "Copyright center": "Copyright-Zentrum",
  "Rights checks and takedowns": "Rechtechecks und Takedowns",
  "published": "veroffentlicht",
  "in review": "in Prufung",
  "blocked": "blockiert",
  "Published": "Veroffentlicht",
  "In review": "In Prufung",
  "Blocked": "Blockiert",
  "track(s)": "Track(s)",
  "Remove file": "Datei entfernen",
  "Remove example": "Beispiel entfernen",
  "Example only - upload audio above": "Nur Beispiel - Audio oben hochladen",
  "Search": "Suche",
  "No results": "Keine Ergebnisse"
});

const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();
let activeTranslationLanguage = "en";

function preserveSpacing(source, translated) {
  const lead = source.match(/^\s*/)?.[0] || "";
  const tail = source.match(/\s*$/)?.[0] || "";
  return `${lead}${translated}${tail}`;
}

function translateValue(value, lang) {
  if (lang === "en" || !value) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const dict = TRANSLATIONS[lang] || {};
  if (dict[trimmed]) return preserveSpacing(value, dict[trimmed]);
  const normalized = trimmed.replace(/\s+/g, " ");
  if (dict[normalized]) return preserveSpacing(value, dict[normalized]);
  if (trimmed.includes(" - ")) {
    const translatedParts = trimmed.split(/\s+-\s+/).map((part) => dict[part] || part);
    if (translatedParts.join(" - ") !== trimmed) return preserveSpacing(value, translatedParts.join(" - "));
  }
  const goodEvening = trimmed.match(/^Good evening,\s*(.+)$/);
  if (goodEvening) return preserveSpacing(value, `${dict["Good evening,"] || "Good evening,"} ${goodEvening[1]}`);
  const verifiedArtist = trimmed.match(/^(.+)\s-\sverified artist$/i);
  if (verifiedArtist) return preserveSpacing(value, `${verifiedArtist[1]} - ${dict["verified artist"] || "verified artist"}`);
  const trusted = trimmed.match(/^Trusted by\s*(.+)\s*independent artists and DJs\.$/);
  if (trusted) return preserveSpacing(value, `${dict["Trusted by"] || "Trusted by"} ${trusted[1]} ${dict["independent artists and DJs."] || "independent artists and DJs."}`);
  const plays = trimmed.match(/^(.+)\splays$/);
  if (plays) return preserveSpacing(value, `${plays[1]} ${dict.plays || "plays"}`);
  const followers = trimmed.match(/^(.+)\sfollowers$/);
  if (followers) return preserveSpacing(value, `${followers[1]} ${dict.followers || "followers"}`);
  const releases = trimmed.match(/^(.+)\sreleases$/);
  if (releases) return preserveSpacing(value, `${releases[1]} ${dict.releases || "releases"}`);
  const tracks = trimmed.match(/^(.+)\strack\(s\)$/);
  if (tracks) return preserveSpacing(value, `${tracks[1]} ${dict["track(s)"] || "track(s)"}`);
  const tracksLong = trimmed.match(/^(.+)\strack\(s\)\s-\s(.+)$/);
  if (tracksLong) return preserveSpacing(value, `${tracksLong[1]} ${dict["track(s)"] || "track(s)"} - ${tracksLong[2]}`);
  const buy = trimmed.match(/^Buy\s(.+)$/);
  if (buy) return preserveSpacing(value, `${dict.Buy || "Buy"} ${buy[1]}`);
  const notifications = trimmed.match(/^(\d+)\sNotifications$/);
  if (notifications) return preserveSpacing(value, `${notifications[1]} ${dict.Notifications || "Notifications"}`);
  const newCount = trimmed.match(/^\+(\d+)\snew$/);
  if (newCount) return preserveSpacing(value, `+${newCount[1]} ${dict.new || "new"}`);
  return value;
}

function translateNodeTree(root, lang) {
  if (!root || root.nodeType !== 1) return;
  const skipTags = new Set(["SCRIPT", "STYLE", "CODE", "PRE"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || skipTags.has(parent.tagName) || parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const nextValue = translateValue(originalTextNodes.get(node), lang);
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
  });

  root.querySelectorAll?.("input[placeholder], textarea[placeholder], [aria-label], [title]").forEach((element) => {
    let attrs = originalAttributes.get(element);
    if (!attrs) {
      attrs = {};
      ["placeholder", "aria-label", "title"].forEach((attr) => {
        if (element.hasAttribute(attr)) attrs[attr] = element.getAttribute(attr);
      });
      originalAttributes.set(element, attrs);
    }
    Object.entries(attrs).forEach(([attr, original]) => {
      const nextValue = translateValue(original, lang);
      if (element.getAttribute(attr) !== nextValue) element.setAttribute(attr, nextValue);
    });
  });
}

function TranslationRuntime({ language }) {
  useEffect(() => {
    activeTranslationLanguage = language;
    document.documentElement.lang = language;
    translateNodeTree(document.body, language);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          const node = mutation.target;
          if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
          const nextValue = translateValue(originalTextNodes.get(node), activeTranslationLanguage);
          if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) translateNodeTree(node, activeTranslationLanguage);
          if (node.nodeType === 3 && node.nodeValue.trim()) {
            originalTextNodes.set(node, node.nodeValue);
            const nextValue = translateValue(node.nodeValue, activeTranslationLanguage);
            if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);
  return null;
}

function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem("undiscover_language") || "en");
  const value = useMemo(() => ({
    language,
    languages: LANGUAGES,
    setLanguage(next) {
      localStorage.setItem("undiscover_language", next);
      setLanguageState(next);
    },
    t(value) {
      return translateValue(value, language);
    }
  }), [language]);
  return <I18nContext.Provider value={value}><TranslationRuntime language={language} />{children}</I18nContext.Provider>;
}

function useI18n() {
  return useContext(I18nContext);
}

function money(cents) {
  if (!cents) return "Free";
  return `${Math.round(cents / 100)} EUR`;
}

function shortNumber(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

function initials(value = "") {
  return String(value)
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U0";
}

function isImageAvatar(value = "") {
  return /^https?:\/\//i.test(value) || String(value).startsWith("/") || /^data:image\//i.test(value);
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

function artistHandle(artist = {}) {
  return artist.artist_slug || artist.slug || artist.id;
}

function artistPath(artist = {}) {
  return `#/artist/${artistHandle(artist)}`;
}

function artistPublicUrl(artist = {}) {
  return `https://undisc0ver.com/artist/${artistHandle(artist)}`;
}

function useCloseOnOutsideClick(open, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return ref;
}

async function request(path, options = {}) {
  const token = localStorage.getItem("undiscover_token");
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

async function uploadAudio(file) {
  const token = localStorage.getItem("undiscover_token");
  const formData = new FormData();
  formData.append("audio", file);
  const res = await fetch(`${API}/uploads/audio`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur upload audio");
  return data.file;
}

async function uploadImage(file) {
  const token = localStorage.getItem("undiscover_token");
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${API}/uploads/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur upload image");
  return data.file;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request("/me").then((data) => setUser(data.user)).catch(() => localStorage.removeItem("undiscover_token")).finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      localStorage.setItem("undiscover_token", data.token);
      setUser(data.user);
    },
    async register(payload) {
      const data = await request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("undiscover_token", data.token);
      setUser(data.user);
    },
    async loginWithToken(token) {
      localStorage.setItem("undiscover_token", token);
      const data = await request("/me");
      setUser(data.user);
    },
    async logout() {
      await request("/auth/logout", { method: "POST" }).catch(() => {});
      localStorage.removeItem("undiscover_token");
      setUser(null);
      location.hash = "#/";
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

function getCurrentRoute() {
  if (location.hash) return location.hash.slice(1) || "/";
  const cleanPath = `${location.pathname}${location.search}`.replace(/\/$/, "") || "/";
  return cleanPath === "" ? "/" : cleanPath;
}

function useHashRoute() {
  const [route, setRoute] = useState(getCurrentRoute);
  useEffect(() => {
    const onRouteChange = () => setRoute(getCurrentRoute());
    addEventListener("hashchange", onRouteChange);
    addEventListener("popstate", onRouteChange);
    return () => {
      removeEventListener("hashchange", onRouteChange);
      removeEventListener("popstate", onRouteChange);
    };
  }, []);
  return route;
}

function Typewriter({ text, speed = 55, cursor = "|" }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText("");
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayText}
      <span className="type-cursor">{cursor}</span>
    </span>
  );
}

const BRAND_ASSETS = {
  mark: "/brand/undiscover-mark.png",
  icon: "/brand/undiscover-icon.png"
};

const COMPANY_INFO = {
  name: "Undiscover",
  domain: "undisc0ver.com",
  email: "hello@undisc0ver.com",
  phone: "087 84 40 00",
  phoneHref: "tel:+3287844000",
  companyNumber: "1031.598.463",
  affiliation: "SauroraaSNC",
  registeredArea: "Belgium"
};

const SEO_BASE_URL = "https://undisc0ver.com";
const SEO_DEFAULT = {
  title: "Undiscover: Storefront direct pour artistes electro, tracks, EPs et dubpacks",
  description: "Undiscover aide les artistes electro a uploader, partager et vendre tracks, EPs et dubpacks en direct, avec download gates, checkout, analytics et payouts.",
  image: `${SEO_BASE_URL}/brand/undiscover-icon.png`
};
const SEO_PAGES = {
  "/": SEO_DEFAULT,
  "/explore": {
    title: "Explorer les sorties electro, tracks, EPs et dubpacks - Undiscover",
    description: "Parcours les sorties publiees sur Undiscover : tracks, EPs, dubpacks, free downloads et releases payantes d'artistes independants."
  },
  "/artists": {
    title: "Artistes independants et producteurs electro - Undiscover",
    description: "Decouvre les artistes inscrits sur Undiscover, leurs catalogues publics, leurs sorties et leurs storefronts directs."
  },
  "/charts": {
    title: "Classements tracks et dubpacks electro - Undiscover",
    description: "Consulte les sorties qui performent sur Undiscover, classees par plays, ventes, downloads et signal catalogue."
  },
  "/upload": {
    title: "Uploader une sortie musicale - Undiscover",
    description: "Publie un track, une EP ou un dubpack avec metadata, audio upload, droits, download gates et moderation avant mise en ligne."
  },
  "/pricing": {
    title: "Tarifs Undiscover pour artistes et labels",
    description: "Compare les plans Undiscover pour publier, vendre et mesurer tes sorties sans marketplace lourde."
  },
  "/support": {
    title: "Support Undiscover - aide upload, paiements et catalogue",
    description: "Contacte le support Undiscover pour les uploads, download gates, payouts, copyright reviews, checkout et setup catalogue."
  },
  "/faq": {
    title: "FAQ Undiscover - upload, ventes, gates et support",
    description: "Reponses rapides aux questions sur les releases, les prix, les paiements, les download gates et le support Undiscover."
  },
  "/getting-started": {
    title: "Bien demarrer sur Undiscover",
    description: "Guide de lancement pour configurer son profil artiste, uploader sa premiere sortie et publier un catalogue propre."
  },
  "/release-guide": {
    title: "Guide de sortie musicale - Undiscover",
    description: "Guide operationnel pour uploader, verifier les droits, configurer les download gates, vendre et suivre les performances."
  },
  "/legal": {
    title: "Mentions legales - Undiscover",
    description: "Informations editeur, contact, numero d'entreprise et details operationnels de la plateforme Undiscover."
  },
  "/terms": {
    title: "Conditions d'utilisation - Undiscover",
    description: "Regles d'utilisation de la plateforme Undiscover pour artistes, auditeurs, equipes et comptes inscrits."
  },
  "/sales-terms": {
    title: "Conditions de vente - Undiscover",
    description: "Conditions de vente applicables aux sorties digitales, dubpacks, abonnements et services disponibles sur Undiscover."
  },
  "/privacy": {
    title: "Confidentialite et donnees personnelles - Undiscover",
    description: "Politique de confidentialite Undiscover pour les comptes, catalogues, paiements, support et donnees operationnelles."
  },
  "/acceptable-use": {
    title: "Utilisation acceptable - Undiscover",
    description: "Regles de securite, contenu, copyright et anti-abus pour utiliser Undiscover proprement."
  },
  "/careers": {
    title: "Carrieres - Undiscover",
    description: "Roles support, moderation catalogue et operations plateforme pour aider les artistes a publier proprement."
  }
};
const SEO_NAVIGATION = [
  ["Explorer les sorties", "/explore"],
  ["Artistes", "/artists"],
  ["Classements", "/charts"],
  ["Uploader une sortie", "/upload"],
  ["Tarifs", "/pricing"],
  ["Support", "/support"],
  ["FAQ", "/faq"],
  ["Guide de sortie", "/release-guide"]
];

function routePath(route) {
  const path = String(route || "/").split("?")[0];
  if (path.startsWith("/release/")) return "/release";
  if (path.startsWith("/artist/")) return "/artist";
  return path || "/";
}

function routeCanonical(route) {
  const cleanRoute = String(route || "/").split("?")[0];
  if (cleanRoute === "/") return SEO_BASE_URL;
  return `${SEO_BASE_URL}${cleanRoute}`;
}

function setMetaAttribute(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attrs.match || {}).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  Object.entries(attrs.value || {}).forEach(([key, value]) => element.setAttribute(key, value));
}

function setLinkAttribute(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("link");
    Object.entries(attrs.match || {}).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  Object.entries(attrs.value || {}).forEach(([key, value]) => element.setAttribute(key, value));
}

function Seo({ route }) {
  useEffect(() => {
    const path = routePath(route);
    const routeSeo = path === "/release"
      ? { title: "Sortie musicale sur Undiscover", description: "Page publique d'une sortie Undiscover avec audio, metadata, artiste, prix, download gate et checkout." }
      : path === "/artist"
        ? { title: "Profil artiste sur Undiscover", description: "Page publique d'un artiste Undiscover avec catalogue, releases, plays, followers et contact booking." }
        : SEO_PAGES[path] || SEO_DEFAULT;
    const title = routeSeo.title || SEO_DEFAULT.title;
    const description = routeSeo.description || SEO_DEFAULT.description;
    const canonical = routeCanonical(route);
    const image = routeSeo.image || SEO_DEFAULT.image;
    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: COMPANY_INFO.name,
        url: SEO_BASE_URL,
        logo: SEO_DEFAULT.image,
        email: COMPANY_INFO.email,
        telephone: COMPANY_INFO.phone,
        legalName: COMPANY_INFO.affiliation,
        identifier: COMPANY_INFO.companyNumber
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: COMPANY_INFO.name,
        url: SEO_BASE_URL,
        description: SEO_DEFAULT.description,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SEO_BASE_URL}/explore?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Undiscover main pages",
        itemListElement: SEO_NAVIGATION.map(([name, href], index) => ({
          "@type": "SiteNavigationElement",
          position: index + 1,
          name,
          url: `${SEO_BASE_URL}${href}`
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: canonical,
        isPartOf: { "@type": "WebSite", name: COMPANY_INFO.name, url: SEO_BASE_URL }
      }
    ];

    document.title = title;
    setMetaAttribute('meta[name="description"]', { match: { name: "description" }, value: { content: description } });
    setMetaAttribute('meta[name="robots"]', { match: { name: "robots" }, value: { content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" } });
    setMetaAttribute('meta[property="og:type"]', { match: { property: "og:type" }, value: { content: "website" } });
    setMetaAttribute('meta[property="og:site_name"]', { match: { property: "og:site_name" }, value: { content: COMPANY_INFO.name } });
    setMetaAttribute('meta[property="og:title"]', { match: { property: "og:title" }, value: { content: title } });
    setMetaAttribute('meta[property="og:description"]', { match: { property: "og:description" }, value: { content: description } });
    setMetaAttribute('meta[property="og:url"]', { match: { property: "og:url" }, value: { content: canonical } });
    setMetaAttribute('meta[property="og:image"]', { match: { property: "og:image" }, value: { content: image } });
    setMetaAttribute('meta[name="twitter:card"]', { match: { name: "twitter:card" }, value: { content: "summary_large_image" } });
    setMetaAttribute('meta[name="twitter:title"]', { match: { name: "twitter:title" }, value: { content: title } });
    setMetaAttribute('meta[name="twitter:description"]', { match: { name: "twitter:description" }, value: { content: description } });
    setMetaAttribute('meta[name="twitter:image"]', { match: { name: "twitter:image" }, value: { content: image } });
    setLinkAttribute('link[rel="canonical"]', { match: { rel: "canonical" }, value: { href: canonical } });

    let script = document.head.querySelector("#structured-data");
    if (!script) {
      script = document.createElement("script");
      script.id = "structured-data";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
  }, [route]);
  return null;
}

function BrandMark({ className = "", label = "Undiscover" }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden={label ? undefined : "true"}>
      <img src={BRAND_ASSETS.mark} alt={label || ""} />
    </span>
  );
}

function Logo({ compact = false }) {
  return (
    <a className="logo" href="#/">
      <BrandMark label="Undiscover" />
      {!compact && <strong>Undiscover</strong>}
    </a>
  );
}

function GLSLHills({ speed = 0.5 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
    const clock = new THREE.Clock();
    const uniforms = { time: { value: 0 } };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(256, 256, 128, 128),
      new THREE.RawShaderMaterial({
        uniforms,
        vertexShader: `
          attribute vec3 position;
          uniform mat4 projectionMatrix;
          uniform mat4 modelViewMatrix;
          uniform float time;
          varying vec3 vPosition;

          mat4 rotateMatrixX(float radian) {
            return mat4(1.0,0.0,0.0,0.0,0.0,cos(radian),-sin(radian),0.0,0.0,sin(radian),cos(radian),0.0,0.0,0.0,0.0,1.0);
          }
          vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
          vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
          vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
          vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
          float cnoise(vec3 P){
            vec3 Pi0=floor(P); vec3 Pi1=Pi0+vec3(1.0); Pi0=mod289(Pi0); Pi1=mod289(Pi1);
            vec3 Pf0=fract(P); vec3 Pf1=Pf0-vec3(1.0);
            vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x); vec4 iy=vec4(Pi0.yy,Pi1.yy);
            vec4 iz0=Pi0.zzzz; vec4 iz1=Pi1.zzzz;
            vec4 ixy=permute(permute(ix)+iy); vec4 ixy0=permute(ixy+iz0); vec4 ixy1=permute(ixy+iz1);
            vec4 gx0=ixy0*(1.0/7.0); vec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5; gx0=fract(gx0);
            vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0); vec4 sz0=step(gz0,vec4(0.0));
            gx0-=sz0*(step(0.0,gx0)-0.5); gy0-=sz0*(step(0.0,gy0)-0.5);
            vec4 gx1=ixy1*(1.0/7.0); vec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5; gx1=fract(gx1);
            vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1); vec4 sz1=step(gz1,vec4(0.0));
            gx1-=sz1*(step(0.0,gx1)-0.5); gy1-=sz1*(step(0.0,gy1)-0.5);
            vec3 g000=vec3(gx0.x,gy0.x,gz0.x); vec3 g100=vec3(gx0.y,gy0.y,gz0.y); vec3 g010=vec3(gx0.z,gy0.z,gz0.z); vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
            vec3 g001=vec3(gx1.x,gy1.x,gz1.x); vec3 g101=vec3(gx1.y,gy1.y,gz1.y); vec3 g011=vec3(gx1.z,gy1.z,gz1.z); vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
            vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
            g000*=norm0.x; g010*=norm0.y; g100*=norm0.z; g110*=norm0.w;
            vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
            g001*=norm1.x; g011*=norm1.y; g101*=norm1.z; g111*=norm1.w;
            float n000=dot(g000,Pf0); float n100=dot(g100,vec3(Pf1.x,Pf0.yz)); float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)); float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
            float n001=dot(g001,vec3(Pf0.xy,Pf1.z)); float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z)); float n011=dot(g011,vec3(Pf0.x,Pf1.yz)); float n111=dot(g111,Pf1);
            vec3 fade_xyz=fade(Pf0); vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
            vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y); return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);
          }
          void main(void) {
            vec3 updatePosition=(rotateMatrixX(radians(90.0))*vec4(position,1.0)).xyz;
            float sin1=sin(radians(updatePosition.x/128.0*90.0));
            vec3 noisePosition=updatePosition+vec3(0.0,0.0,time*-30.0);
            float noise1=cnoise(noisePosition*0.08);
            float noise2=cnoise(noisePosition*0.06);
            float noise3=cnoise(noisePosition*0.4);
            vec3 lastPosition=updatePosition+vec3(0.0, noise1*sin1*8.0+noise2*sin1*8.0+noise3*(abs(sin1)*2.0+0.5)+pow(sin1,2.0)*40.0, 0.0);
            vPosition=lastPosition;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(lastPosition,1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying vec3 vPosition;
          void main(void) {
            float opacity=(116.0-length(vPosition))/256.0*0.72;
            vec3 color=vec3(0.831,0.91,0.341);
            gl_FragColor=vec4(color, opacity);
          }
        `,
        transparent: true
      })
    );

    scene.add(mesh);
    camera.position.set(0, 16, 125);
    camera.lookAt(new THREE.Vector3(0, 28, 0));

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const render = () => {
      uniforms.time.value += clock.getDelta() * speed;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    resize();
    window.addEventListener("resize", resize);
    render();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
    };
  }, [speed]);

  return <canvas className="glsl-hills" ref={canvasRef} aria-hidden="true" />;
}

function CrateMark({ className = "" }) {
  return <span className={`crate-mark ${className}`} />;
}

function App() {
  const route = useHashRoute();
  const { user, loading: authLoading } = useAuth();
  const [toast, setToast] = useState("");
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(() => localStorage.getItem("undiscover_hide_upgrade") !== "1");
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  };
  const playRelease = (release) => {
    setNowPlaying(release);
    setIsPlaying(true);
  };
  const closeUpgradeBanner = () => {
    localStorage.setItem("undiscover_hide_upgrade", "1");
    setShowUpgradeBanner(false);
  };

  const page = renderRoute(route, notify, playRelease);
  return (
    <div>
      <Seo route={route} />
      <Topbar notify={notify} />
      {!authLoading && user && showUpgradeBanner && <UpgradeBanner onClose={closeUpgradeBanner} />}
      {page}
      <Footer4Col />
      <LiveSupport notify={notify} />
      <MusicPlayer release={nowPlaying} isPlaying={isPlaying} setIsPlaying={setIsPlaying} onClose={() => setNowPlaying(null)} notify={notify} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MusicPlayer({ release, isPlaying, setIsPlaying, onClose, notify }) {
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const durationParts = String(release?.duration || "06:00").split(":").map((part) => Number.parseInt(part, 10) || 0);
  const durationSeconds = durationParts.length === 2 ? (durationParts[0] * 60) + durationParts[1] : 360;
  const audioDuration = audioRef.current?.duration && Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : durationSeconds;
  const currentSeconds = Math.min(audioDuration, Math.floor((progress / 100) * audioDuration));
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [release?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!release || !audio) return undefined;
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        notify("Audio playback could not start.");
      });
    } else {
      audio.pause();
    }
    return undefined;
  }, [release, isPlaying]);

  if (!release) return null;
  const seek = (percent) => {
    const audio = audioRef.current;
    setProgress(percent);
    if (audio?.duration && Number.isFinite(audio.duration)) audio.currentTime = (percent / 100) * audio.duration;
  };

  return (
    <aside className="music-player" aria-label="Now playing">
      {release.audio_url && (
        <audio
          ref={audioRef}
          src={release.audio_url}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            if (audio.duration && Number.isFinite(audio.duration)) setProgress((audio.currentTime / audio.duration) * 100);
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}
      <div className="music-player-shell">
        <button className="music-play-main" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <span className="pause-bars"><i /><i /></span> : <Play size={18} fill="currentColor" />}
        </button>
        <PackArtwork release={release} />
        <div className="music-player-info">
          <span>{isPlaying ? "Now playing" : "Paused"} - {release.kind} - {release.genre}</span>
          <strong>{release.title}</strong>
          <small>{release.artist} - {shortNumber(release.plays)} plays - {release.duration}</small>
        </div>
        <div className="music-player-center">
          <div className="music-wave" onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            seek(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)));
          }}>
            {Array.from({ length: 38 }).map((_, index) => {
              const active = (index / 37) * 100 <= progress;
              return <i key={index} className={active ? "active" : ""} style={{ height: `${20 + ((index * 13) % 36)}px` }} />;
            })}
          </div>
          <div className="music-time"><span>{formatTime(currentSeconds)}</span><span>{formatTime(Math.floor(audioDuration))}</span></div>
        </div>
        <div className="music-player-actions">
          <LikeButton key={`like-${release.id}`} release={release} notify={notify} />
          {release.free ? <DownloadButton release={release} notify={notify} compact /> : <BuyButton release={release} notify={notify} compact />}
          <a className="button ghost" href={`#/release/${release.id}`}><ArrowUpRight size={16} /></a>
          <button className="button ghost icon-only" onClick={onClose} aria-label="Close player"><X size={16} /></button>
        </div>
      </div>
    </aside>
  );
}

const SettingsFilled = ({ className = "" }) => (
  <svg className={className} height="16" viewBox="0 0 16 16" width="16" aria-hidden="true">
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.5 0h-3l-.274 1.46a.5.5 0 0 1-.349.394c-.248.086-.489.186-.722.3a.5.5 0 0 1-.526-.033L3.404 1.282 1.282 3.404l.839 1.226a.5.5 0 0 1 .033.526 7.09 7.09 0 0 0-.3.722.5.5 0 0 1-.394.348L0 6.5v3l1.46.274a.5.5 0 0 1 .394.349c.086.248.186.489.3.722a.5.5 0 0 1-.033.526l-.839 1.225 2.122 2.122 1.226-.839a.5.5 0 0 1 .526-.033c.233.114.474.214.722.3a.5.5 0 0 1 .348.394L6.5 16h3l.274-1.46a.5.5 0 0 1 .349-.394c.248-.086.489-.186.722-.3a.5.5 0 0 1 .526.033l1.225.839 2.122-2.122-.839-1.226a.5.5 0 0 1-.033-.526c.114-.233.214-.474.3-.722a.5.5 0 0 1 .394-.348L16 9.5v-3l-1.46-.274a.5.5 0 0 1-.394-.349 7.09 7.09 0 0 0-.3-.722.5.5 0 0 1 .033-.526l.839-1.225-2.122-2.122-1.226.839a.5.5 0 0 1-.526.033 7.09 7.09 0 0 0-.722-.3.5.5 0 0 1-.348-.394L9.5 0ZM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
    />
  </svg>
);

function UpgradeBanner({ onClose }) {
  const [isHovered, setIsHovered] = useState(false);
  const iconVariants = {
    hidden: { x: 0, y: 0, opacity: 0, rotate: 0 },
    visible: ({ x, y }) => ({
      x,
      y,
      opacity: 1,
      rotate: 360,
      transition: { x: { duration: .3 }, y: { duration: .3 }, opacity: { duration: .3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }
    })
  };

  return (
    <div className="upgrade-banner-wrap">
      <AnimatePresence>
        <motion.div className="upgrade-banner-shell" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: .35 }}>
          <motion.div initial="hidden" animate={isHovered ? "visible" : "hidden"} variants={iconVariants} custom={{ x: -10, y: -10 }} className="upgrade-gear one">
            <SettingsFilled />
          </motion.div>
          <motion.div initial="hidden" animate={isHovered ? "visible" : "hidden"} variants={iconVariants} custom={{ x: 10, y: 10 }} className="upgrade-gear two">
            <SettingsFilled />
          </motion.div>
          <div className="upgrade-banner">
            <a href="#/pricing" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>Upgrade to U0 Pro</a>
            <span>for advanced analytics, unlimited catalog and faster payouts</span>
            <button onClick={onClose} aria-label="Close upgrade banner"><X size={16} /></button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HeroPill({ href, label, announcement = "New" }) {
  return (
    <motion.a
      href={href}
      className="hero-pill"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .8, ease: "easeOut" }}
    >
      <span>{announcement}</span>
      <p>{label}</p>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M8.781 5.333 5.205 1.757l.943-.943L11.333 6l-5.185 5.185-.943-.943 3.576-3.576H.667V5.333h8.114Z" fill="currentColor" />
      </svg>
    </motion.a>
  );
}

function TrustedAvatarStack() {
  const { data } = useData("/artists", []);
  const artists = data?.artists || [];
  const visibleArtists = artists
    .map((artist) => ({
      ...artist,
      logo: [artist.logo_url, artist.avatar_url].find((src) => isImageAvatar(src))
    }))
    .filter((artist) => artist.logo)
    .slice(0, 4);
  const releaseCount = artists.reduce((sum, artist) => sum + Number(artist.releases || 0), 0);
  const userLabel = `${artists.length} utilisateur${artists.length > 1 ? "s" : ""} inscrit${artists.length > 1 ? "s" : ""}`;
  const releaseLabel = `${shortNumber(releaseCount)} sortie${releaseCount > 1 ? "s" : ""} publique${releaseCount > 1 ? "s" : ""}`;

  return (
    <div className="trusted-stack" aria-label="Utilisateurs inscrits sur Undiscover" data-no-translate>
      <div className="trusted-avatars">
        {visibleArtists.map((artist, idx) => (
          <a
            className="trusted-user-link hover-avatar"
            href={artistPath(artist)}
            key={artist.id}
            style={{ zIndex: visibleArtists.length - idx }}
            aria-label={artist.name}
          >
            <span className="trusted-avatar-face">
              <img src={artist.logo} alt="" />
            </span>
          </a>
        ))}
      </div>
      <p><strong>{userLabel}</strong> · {releaseLabel}</p>
    </div>
  );
}

function Alert({ variant = "default", title, description, action, href = "#" }) {
  const Icon = variant === "destructive" ? AlertTriangle : Info;
  return (
    <div className={`alert-box ${variant}`}>
      <Icon size={18} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {action && <a href={href}>{action}</a>}
      </div>
    </div>
  );
}

function AlertBadge({ variant = "info", icon: Icon, label, action }) {
  return (
    <span className={`alert-badge ${variant}`}>
      <span>{Icon && <Icon size={15} />} {label}</span>
      {action && (
        <>
          <i />
          <a href={action.href}>{action.label}{action.icon && <action.icon size={15} />}</a>
        </>
      )}
    </span>
  );
}

function TeamInvitation({ notify }) {
  const [status, setStatus] = useState("pending");
  if (status !== "pending") {
    return (
      <div className={`team-invitation ${status}`}>
        <BrandMark className="avatar brand-avatar" label="Undiscover" />
        <div>
          <strong>{status === "accepted" ? "Invitation accepted" : "Invitation declined"}</strong>
          <p>{status === "accepted" ? "You joined the Undiscover Label Team." : "The team invite was dismissed."}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="team-invitation">
      <div className="team-avatar">
        <span className="avatar">KC</span>
        <i />
      </div>
      <div className="team-copy">
        <strong>Team Invitation</strong>
        <p>Kokonut Club invited you to join <b>Undiscover Label Team</b></p>
        <small>Invited 5 minutes ago</small>
      </div>
      <div className="team-actions">
        <button
          type="button"
          className="decline"
          aria-label="Decline invitation"
          onClick={() => {
            setStatus("declined");
            notify("Team invitation declined.");
          }}
        >
          <X size={16} />
        </button>
        <button
          type="button"
          className="accept"
          aria-label="Accept invitation"
          onClick={() => {
            setStatus("accepted");
            notify("Team invitation accepted.");
          }}
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}

function SparklesText({ text, colors = { first: "#d4e857", second: "#b8cc3a" }, sparklesCount = 9 }) {
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    const makeSparkle = () => ({
      id: `${Math.random()}-${Date.now()}`,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: Math.random() > .5 ? colors.first : colors.second,
      delay: Math.random() * 2,
      scale: Math.random() + .35
    });
    setSparkles(Array.from({ length: sparklesCount }, makeSparkle));
    const timer = setInterval(() => {
      setSparkles(Array.from({ length: sparklesCount }, makeSparkle));
    }, 1800);
    return () => clearInterval(timer);
  }, [colors.first, colors.second, sparklesCount]);

  return (
    <span className="sparkles-text">
      {sparkles.map((sparkle) => (
        <motion.svg
          key={sparkle.id}
          className="sparkle"
          initial={{ opacity: 0, left: sparkle.x, top: sparkle.y }}
          animate={{ opacity: [0, 1, 0], scale: [0, sparkle.scale, 0], rotate: [75, 120, 150] }}
          transition={{ duration: .8, delay: sparkle.delay }}
          width="21"
          height="21"
          viewBox="0 0 21 21"
        >
          <path
            d="M9.825 0.844c.23-.629 1.12-.629 1.35 0l.687 1.876C12.401 4.192 12.392 6.392 13.5 7.5c1.108 1.108 3.308 1.099 4.78 1.638l1.876.687c.63.23.63 1.12 0 1.35l-1.876.687c-1.472.539-3.172.53-4.78 1.638-1.108 1.108-1.099 3.308-1.638 4.78l-.687 1.876c-.23.63-1.12.63-1.35 0l-.687-1.876C8.599 16.808 8.608 14.608 7.5 13.5c-1.108-1.108-3.308-1.099-4.78-1.638l-1.876-.687c-.629-.23-.629-1.12 0-1.35l1.876-.687C4.192 8.599 6.392 8.608 7.5 7.5c1.108-1.108 1.099-3.308 1.638-4.78L9.825.844Z"
            fill={sparkle.color}
          />
        </motion.svg>
      ))}
      <strong>{text}</strong>
    </span>
  );
}

function Footer4Col() {
  const socialLinks = [
    { icon: Facebook, label: "Facebook", href: "https://facebook.com" },
    { icon: Instagram, label: "Instagram", href: "https://instagram.com" },
    { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
    { icon: Github, label: "GitHub", href: "https://github.com" },
    { icon: Dribbble, label: "Dribbble", href: "https://dribbble.com" }
  ];
  const columns = [
    {
      title: "About",
      links: [
        ["Brand concept", "#/"],
        ["Artists", "#/artists"],
        ["Charts", "#/charts"],
        ["Pricing", "#/pricing"],
        ["Careers", "#/careers"]
      ]
    },
    {
      title: "Services",
      links: [
        ["Upload release", "#/upload"],
        ["Sell dubpacks", "#/explore?kind=Dubpack"],
        ["Artist dashboard", "#/dashboard"],
        ["Payouts", "#/payouts"],
        ["Checkout", "#/checkout"]
      ]
    },
    {
      title: "Helpful Links",
      links: [
        ["FAQs", "#/faq"],
        ["Support", "#/support"],
        ["Live chat", "#/support", true],
        ["Getting started", "#/getting-started"],
        ["Release guide", "#/release-guide"]
      ]
    },
    {
      title: "Legal",
      links: [
        ["Legal notice", "#/legal"],
        ["Terms of use", "#/terms"],
        ["Sales terms", "#/sales-terms"],
        ["Privacy", "#/privacy"],
        ["Acceptable use", "#/acceptable-use"]
      ]
    }
  ];
  const contactInfo = [
    { icon: Phone, label: "Phone", text: COMPANY_INFO.phone, href: COMPANY_INFO.phoneHref },
    { icon: FileText, label: "Company no.", text: COMPANY_INFO.companyNumber, href: "#/legal" },
    { icon: MapPin, label: "Registered in", text: COMPANY_INFO.registeredArea, href: "#/legal" }
  ];

  return (
    <footer className="footer-column">
      <div className="footer-inner">
        <div className="footer-main">
          <section className="footer-brand">
            <Logo />
            <p>Direct storefront for electronic artists. Upload, share and sell tracks, EPs and dubpacks without a middleman.</p>
            <small className="footer-company">Affiliated to {COMPANY_INFO.affiliation} · {COMPANY_INFO.domain}</small>
            <NewsletterInput />
            <ul className="footer-socials">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a href={href} aria-label={label} target="_blank" rel="noreferrer"><Icon size={20} /></a>
                </li>
              ))}
            </ul>
          </section>
          <div className="footer-directory">
            <div className="footer-columns">
              {columns.map((column) => (
                <section key={column.title}>
                  <h2>{column.title}</h2>
                  <ul>
                    {column.links.map(([text, href, live]) => (
                      <li key={text}>
                        <a className={live ? "live-link" : ""} href={href}>
                          <span>{text}</span>
                          {live && <i />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <section className="footer-contact-card" aria-labelledby="footer-contact-title">
              <div>
                <span className="eyebrow">Contact</span>
                <h2 id="footer-contact-title">Support and business</h2>
              </div>
              <a className="footer-email-link" href={`mailto:${COMPANY_INFO.email}`}>
                <Mail size={19} />
                <span>
                  <small>Email</small>
                  <strong>{COMPANY_INFO.email}</strong>
                </span>
              </a>
              <ul className="footer-contact">
                {contactInfo.map(({ icon: Icon, label, text, href }) => (
                  <li key={label}>
                    <a href={href}>
                      <Icon size={17} />
                      <span>
                        <small>{label}</small>
                        <strong>{text}</strong>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p>For release help, billing and catalog questions, email the team or open a support ticket.</p>
            </section>
          </div>
        </div>
        <div className="footer-bottom">
          <span>All rights reserved.</span>
          <span>&copy; 2026 {COMPANY_INFO.name} · Company no. {COMPANY_INFO.companyNumber}</span>
        </div>
      </div>
    </footer>
  );
}

function NewsletterInput() {
  const id = useId();
  return (
    <div className="newsletter-input">
      <label htmlFor={id}>Get release notes</label>
      <div>
        <input id={id} type="email" placeholder="Email" />
        <button aria-label="Subscribe"><Download size={16} /></button>
      </div>
    </div>
  );
}

function LiveSupport({ notify }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    topic: "Live support",
    message: ""
  });
  const [ticket, setTicket] = useState(null);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const send = async () => {
    if (!form.message.trim() || !form.email.trim() || !form.name.trim()) return;
    try {
      const data = await request("/support/tickets", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setTicket(data.ticket);
      setForm((current) => ({ ...current, message: "" }));
      notify(`Ticket ${data.ticket.id} opened.`);
    } catch (err) {
      notify(err.message);
    }
  };
  return (
    <div className={open ? "live-support open" : "live-support"}>
      {open && (
        <div className="live-support-panel">
          <div><b>Live support</b><button onClick={() => setOpen(false)} aria-label="Close live support"><X size={15} /></button></div>
          <p>Open a real staff ticket for gates, payouts, copyright review or catalog setup.</p>
          <div className="live-support-fields">
            <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Name" />
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="Email" />
            <select value={form.topic} onChange={(event) => update("topic", event.target.value)}>
              <option>Live support</option>
              <option>Upload issue</option>
              <option>Download gate</option>
              <option>Payouts</option>
              <option>Copyright review</option>
            </select>
          </div>
          <textarea value={form.message} onChange={(event) => update("message", event.target.value)} placeholder="Write your message..." />
          {ticket && <span className="ticket-confirmation">Ticket {ticket.id} · {ticket.status}</span>}
          <button className="button accent" onClick={send}><MessageCircle size={16} /> Send ticket</button>
        </div>
      )}
      <button className="live-support-button" onClick={() => setOpen((value) => !value)}>
        <HeadsetIcon size={18} />
        <span>Live support</span>
        <i />
      </button>
    </div>
  );
}

function Topbar({ notify }) {
  const { user, logout } = useAuth();
  const { language, languages, setLanguage } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const topbarRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!topbarRef.current?.contains(event.target)) setOpenMenu(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const menuGroups = [
    {
      key: "release",
      label: "Release",
      items: [
        { href: "#/upload", label: "Upload release", description: "Publish a track, EP or dubpack." },
        { href: "#/explore", label: "Explore catalog", description: "Browse new drops and free downloads." },
        { href: "#/charts", label: "Charts", description: "See what is moving this week." },
        { href: "#/pricing", label: "Pricing", description: "Compare plans and checkout flows." }
      ]
    },
    {
      key: "artists",
      label: "Artists",
      items: [
        { href: "#/artists", label: "Artist index", icon: Users },
        { href: "#/dashboard", label: "Artist dashboard", icon: BarChart3 },
        { href: "#/payouts", label: "Payouts", icon: Wallet }
      ]
    },
    {
      key: "support",
      label: "Support",
      items: [
        { href: "#/getting-started", label: "Getting started", icon: BookOpen },
        { href: "#/release-guide", label: "Release guide", icon: FileText },
        { href: "#/support", label: "Live support", icon: LifeBuoy }
      ]
    }
  ];

  return (
    <header className="topbar" ref={topbarRef}>
      <div className="topbar-inner">
        <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Logo />
        <nav className={mobileOpen ? "nav-links open" : "nav-links"}>
          <a href="#/">Home</a>
          {menuGroups.map((group) => (
            <div className="nav-menu" key={group.key}>
              <button
                aria-expanded={openMenu === group.key}
                aria-haspopup="menu"
                onClick={() => setOpenMenu(openMenu === group.key ? null : group.key)}
              >
                {group.label}
              </button>
              {openMenu === group.key && (
                <div className="nav-popover" role="menu">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a key={item.label} href={item.href} role="menuitem" onClick={() => { setMobileOpen(false); setOpenMenu(null); }}>
                        {Icon && <Icon size={16} />}
                        <span>
                          <strong>{item.label}</strong>
                          {item.description && <small>{item.description}</small>}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="nav-actions">
          <label className="language-select" aria-label="Language selector" data-no-translate>
            <span>{languages.find((item) => item.code === language)?.short || "EN"}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <InfoMenu notify={notify} />
          {user && <NotificationMenu notify={notify} />}
          <a className="button ghost upload-action" href="#/upload"><Upload size={16} /> Upload</a>
          {user ? <UserMenu user={user} logout={logout} /> : <><a className="button ghost" href="#/login">Sign In</a><a className="button accent" href="#/register">Get Started</a></>}
        </div>
      </div>
    </header>
  );
}

function InfoMenu({ notify }) {
  const [open, setOpen] = useState(false);
  const menuRef = useCloseOnOutsideClick(open, () => setOpen(false));
  return (
    <div className="dropdown" ref={menuRef}>
      <button className="icon-button" onClick={() => setOpen((value) => !value)} aria-label="Open information menu"><Info size={17} /></button>
      {open && (
        <div className="dropdown-panel">
          <b>Information</b>
          <button onClick={() => notify("Help center opened.")}><HelpCircle size={15} /> Help Center</button>
          <button onClick={() => notify("Documentation opened.")}><FileText size={15} /> Documentation</button>
          <button onClick={() => notify("Community panel opened.")}><Users size={15} /> Community</button>
          <button onClick={() => notify("System status: services are online.")}><Settings size={15} /> System Status</button>
        </div>
      )}
    </div>
  );
}

function NotificationMenu({ notify }) {
  const [open, setOpen] = useState(false);
  const menuRef = useCloseOnOutsideClick(open, () => setOpen(false));
  const [selected, setSelected] = useState("all");
  const notes = [
    { id: "1", category: "updates", icon: Info, title: "Catalog update", description: "A new analytics view has been deployed.", time: "just now" },
    { id: "2", category: "alerts", icon: AlertTriangle, title: "Artwork missing", description: "One release needs final cover artwork.", time: "1h ago" },
    { id: "3", category: "reminders", icon: CalendarIcon, title: "Payout reminder", description: "Review your payout settings before Friday.", time: "2h ago" },
    { id: "4", category: "updates", icon: Bell, title: "Weekly report", description: "Your weekly catalog summary is ready.", time: "1d ago" }
  ];
  const categories = ["all", "updates", "alerts", "reminders"];
  const filtered = selected === "all" ? notes : notes.filter((item) => item.category === selected);
  return (
    <div className="dropdown" ref={menuRef}>
      <button className="icon-button badge-button" onClick={() => setOpen((value) => !value)} aria-label="Open notifications"><Bell size={17} /><span>{notes.length}</span></button>
      {open && (
        <div className="dropdown-panel wide notifications-filter">
          <b><span><FilterIcon /> Notifications</span><em>{notes.length} new</em></b>
          <div className="notification-tabs">
            {categories.map((category) => <button className={selected === category ? "active" : ""} key={category} onClick={() => setSelected(category)}>{category}</button>)}
          </div>
          <div className="notification-list">
            {filtered.length === 0 ? <p>No notifications in this category</p> : filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => notify(item.description)}>
                  <span><Icon size={15} /><strong>{item.title}</strong></span>
                  <small>{item.time}</small>
                  <em>{item.description}</em>
                </button>
              );
            })}
          </div>
          <button onClick={() => notify("All notifications marked as read.")}>View all notifications</button>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useCloseOnOutsideClick(open, () => setOpen(false));
  return (
    <div className="dropdown" ref={menuRef}>
      <button className="icon-button user-trigger" onClick={() => setOpen((value) => !value)} aria-label="Open account menu">
        <CircleUserRound size={17} />
        <span>{user.avatar}</span>
      </button>
      {open && (
        <div className="dropdown-panel">
          <b>Signed in as <small>{user.email}</small></b>
          <a href={artistPath(user)}>Profile</a>
          <a href="#/settings">Settings</a>
          <a href="#/dashboard">Dashboard</a>
          <a href="#/catalog">Catalog</a>
          {["staff", "moderator", "admin"].includes(user.role) && <a href="#/staff">Staff panel</a>}
          <a href="#/payouts">Payouts</a>
          <button onClick={logout}><LogOut size={15} /> Logout</button>
        </div>
      )}
    </div>
  );
}

function renderRoute(route, notify, playRelease) {
  const [path, query] = route.split("?");
  if (path === "/") return <Home notify={notify} playRelease={playRelease} />;
  if (path === "/explore") return <Explore notify={notify} query={query} playRelease={playRelease} />;
  if (path === "/charts") return <Charts notify={notify} playRelease={playRelease} />;
  if (path === "/artists") return <Artists notify={notify} />;
  if (path.startsWith("/artist/")) return <ArtistProfile id={path.split("/").pop()} notify={notify} playRelease={playRelease} />;
  if (path.startsWith("/release/")) return <ReleaseDetail id={path.split("/").pop()} notify={notify} playRelease={playRelease} />;
  if (path === "/upload") return <UploadPage notify={notify} />;
  if (path === "/pricing") return <PricingPage notify={notify} />;
  if (path === "/checkout") return <CheckoutPage notify={notify} query={query} />;
  if (path === "/settings") return <SettingsPage notify={notify} />;
  if (path === "/support") return <SupportPage notify={notify} />;
  if (path === "/faq") return <FaqPage />;
  if (path === "/getting-started") return <GettingStartedPage />;
  if (path === "/release-guide") return <ReleaseGuidePage />;
  if (path === "/legal") return <LegalNoticePage />;
  if (path === "/terms") return <TermsOfUsePage />;
  if (path === "/sales-terms" || path === "/cgv") return <SalesTermsPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/acceptable-use") return <AcceptableUsePage />;
  if (path === "/careers") return <CareersPage />;
  if (path === "/staff") return <StaffPanel notify={notify} />;
  if (path === "/dashboard") return <Dashboard notify={notify} playRelease={playRelease} section="overview" />;
  if (path === "/catalog") return <Dashboard notify={notify} playRelease={playRelease} section="catalog" />;
  if (path === "/analytics") return <Dashboard notify={notify} playRelease={playRelease} section="analytics" />;
  if (path === "/payouts") return <Dashboard notify={notify} playRelease={playRelease} section="payouts" />;
  if (path === "/login") return <AuthPage mode="login" notify={notify} />;
  if (path === "/register") return <AuthPage mode="register" notify={notify} />;
  if (path === "/auth/google-callback") return <GoogleAuthCallback query={query} notify={notify} />;
  return <NotFound />;
}

function useData(path, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: "" });
    request(path)
      .then((data) => alive && setState({ loading: false, data, error: "" }))
      .catch((err) => alive && setState({ loading: false, data: null, error: err.message }));
    return () => { alive = false; };
  }, deps);
  return state;
}

function SupportPage({ notify }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", topic: "Upload help", message: "" });
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const topics = [
    { label: "Upload help", icon: Upload, text: "Audio, metadata, artwork or publishing blocked." },
    { label: "Download gate", icon: ArrowDownToLine, text: "Like, follow, share or comment gates." },
    { label: "Payouts", icon: Wallet, text: "Revenue, checkout, paid releases and balances." },
    { label: "Copyright review", icon: ShieldCheck, text: "Rights checks, reports, takedowns or blocked releases." },
    { label: "Account access", icon: CircleUserRound, text: "Login, profile, staff roles or workspace access." }
  ];
  const supportStats = [
    ["Tickets", "Routed to staff"],
    ["Priority", "Copyright & payouts"],
    ["Contact", COMPANY_INFO.email]
  ];
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSent("");
    try {
      const data = await request("/support/tickets", { method: "POST", body: JSON.stringify(form) });
      setSent(`Ticket ${data.ticket.id} opened. Staff will answer from the staff panel.`);
      setForm((current) => ({ ...current, message: "" }));
      notify("Support ticket created.");
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <main className="page support-page">
      <section className="support-hero">
        <div>
          <span className="eyebrow">Support</span>
          <h1>Get help without the noise.</h1>
          <p>Open a tracked ticket for uploads, download gates, payouts, copyright reviews or account access. The team answers from the staff panel.</p>
        </div>
        <aside className="support-status-panel" aria-label="Support status">
          <span><i /> Online</span>
          <strong>Real tickets, real routing.</strong>
          <p>Every request is saved, assigned and visible to staff, moderators and admins.</p>
        </aside>
      </section>

      <div className="support-grid">
        <form className="support-ticket-form" onSubmit={submit}>
          <div className="support-form-head">
            <div>
              <span className="eyebrow">New ticket</span>
              <h2>Tell us what is blocked</h2>
            </div>
            <span className="support-ticket-badge"><MessageCircle size={15} /> Staff queue</span>
          </div>

          <div className="support-topic-grid" role="list" aria-label="Support topics">
            {topics.map(({ label, icon: Icon, text }) => (
              <button
                className={form.topic === label ? "selected" : ""}
                key={label}
                type="button"
                onClick={() => update("topic", label)}
              >
                <Icon size={17} />
                <span><strong>{label}</strong><small>{text}</small></span>
              </button>
            ))}
          </div>

          <div className="form-grid">
            <label>Name<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Artist or team name" required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder={COMPANY_INFO.email} required /></label>
          </div>
          <label>Message<textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Add the release title, account email, screenshot link or anything staff should check first." required /></label>
          {error && <p className="error">{error}</p>}
          {sent && <p className="success-text">{sent}</p>}
          <button className="button accent" type="submit"><MessageCircle size={16} /> Open support ticket</button>
        </form>

        <aside className="support-side">
          <section className="support-contact-panel">
            <span className="eyebrow">Direct contact</span>
            <a href={`mailto:${COMPANY_INFO.email}`}><Mail size={18} /><span>Email<strong>{COMPANY_INFO.email}</strong></span></a>
            <a href={COMPANY_INFO.phoneHref}><Phone size={18} /><span>Phone<strong>{COMPANY_INFO.phone}</strong></span></a>
          </section>

          <section className="support-info-panel">
            <span className="eyebrow">Queue</span>
            {supportStats.map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </section>

          <section className="support-help-panel">
            <span className="eyebrow">Before sending</span>
            <ul>
              <li><CircleCheck size={15} /> Include the release or artist name.</li>
              <li><CircleCheck size={15} /> Use the email linked to your account.</li>
              <li><CircleCheck size={15} /> For copyright, add rights owner details.</li>
            </ul>
            <a className="button ghost" href="#/faq"><HelpCircle size={16} /> Browse FAQ</a>
            <a className="button ghost" href="#/release-guide"><FileText size={16} /> Release guide</a>
          </section>
        </aside>
      </div>
    </main>
  );
}

function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const items = [
    { category: "Uploads", q: "How do I publish a release?", a: "Create an artist account, open Upload, add metadata, choose pricing, choose download-gate actions, attach the real audio file and publish." },
    { category: "Uploads", q: "Can I publish without downloads?", a: "Yes. Disable downloadable access during upload. The release stays stream-only and no WAV download button is shown." },
    { category: "Gates", q: "How do download gates work?", a: "The artist selects required actions like Like, Follow, Share or Comment. Fans complete those actions before the download unlocks." },
    { category: "Gates", q: "Can I require several actions?", a: "Yes. You can combine actions. The release detail page checks each required action before enabling the download." },
    { category: "Payments", q: "How are paid releases handled?", a: "Paid releases go through checkout and are recorded in the database with revenue, downloads and catalog analytics." },
    { category: "Copyright", q: "What happens after a copyright report?", a: "Staff, moderators and admins can review reports in the staff panel, move releases to review, block them or remove them from public pages." },
    { category: "Support", q: "Is live support real?", a: "Yes. The live widget and support page create support tickets in the database. Staff can update ticket status from the staff panel." },
    { category: "Account", q: "Who can access the staff panel?", a: "Only users with Staff, Moderator or Admin roles. Admins can also change user roles." }
  ];
  const categories = ["All", ...new Set(items.map((item) => item.category))];
  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesQuery = !normalized || `${item.q} ${item.a} ${item.category}`.toLowerCase().includes(normalized);
    return matchesCategory && matchesQuery;
  });
  return (
    <main className="page narrow faq-page">
      <PageHeader eyebrow="FAQ" title="Answers that actually help." text="Search upload, gate, payout, copyright and support questions." />
      <div className="faq-toolbar">
        <label className="search compact"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the FAQ..." /></label>
        <div className="faq-tabs">
          {categories.map((item) => <button className={item === category ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </div>
      <div className="faq-list">
        {filtered.map((item) => (
          <details className="card faq-item" key={item.q} open={filtered.length <= 3}>
            <summary><span>{item.category}</span><strong>{item.q}</strong><ChevronDown size={17} /></summary>
            <p className="muted">{item.a}</p>
          </details>
        ))}
        {!filtered.length && <article className="empty"><h2>No answer found</h2><p>Open a support ticket and the team will answer from the staff panel.</p><a className="button accent" href="#/support">Open support</a></article>}
      </div>
    </main>
  );
}

function GuideChecklist({ items, compact = false }) {
  return (
    <div className={compact ? "guide-checklist compact" : "guide-checklist"}>
      {items.map((item) => <span key={item}><CircleCheck size={16} /> {item}</span>)}
    </div>
  );
}

function GettingStartedPage() {
  const steps = [
    { number: "01", icon: CircleUserRound, title: "Create the artist base", text: "Register, complete the artist profile, keep the public name clean and make sure the account email is current.", href: "#/register", action: "Create account" },
    { number: "02", icon: Upload, title: "Prepare the first drop", text: "Add title, genre, track count, duration, pricing, audio file and download availability before publishing.", href: "#/upload", action: "Upload release" },
    { number: "03", icon: ShieldCheck, title: "Clear rights and gates", text: "Confirm ownership, choose stream-only or downloadable access, and keep gate actions short enough for listeners to finish.", href: "#/release-guide", action: "Read guide" },
    { number: "04", icon: BarChart3, title: "Track the signal", text: "Use dashboard and analytics to monitor plays, downloads, sales, followers, support tickets and catalog health.", href: "#/dashboard", action: "Open dashboard" }
  ];
  const launchCards = [
    { icon: FileText, title: "Metadata", text: "Use exact release names, artist credits, genre and track counts. Avoid temporary placeholders." },
    { icon: ArrowDownToLine, title: "Downloads", text: "Enable gates only when a downloadable file is meant to be delivered." },
    { icon: Wallet, title: "Checkout", text: "Check pricing before sharing paid drops, especially dubpacks and subscriptions." }
  ];
  const checklist = [
    "Use real artist profiles only",
    "Upload audio you own or are licensed to distribute",
    "Review title, genre, duration and price before sharing",
    "Keep support tickets and copyright reviews visible to staff",
    "Submit the sitemap in Search Console after deployment"
  ];

  return (
    <main className="page getting-started-page">
      <section className="getting-started-hero">
        <div>
          <span className="eyebrow">Getting started</span>
          <h1>Launch Undiscover cleanly.</h1>
          <p>A practical setup path for artists, labels and staff before the first public drop.</p>
          <div className="button-row">
            <a className="button accent" href="#/upload"><Upload size={16} /> Upload release</a>
            <a className="button ghost" href="#/release-guide"><BookOpen size={16} /> Release guide</a>
          </div>
        </div>
        <aside className="getting-started-summary">
          <span>Setup path</span>
          <strong>4 steps</strong>
          <p>Account, release, rights and analytics in one clean launch flow.</p>
        </aside>
      </section>

      <section className="getting-started-layout">
        <div className="getting-started-steps">
          {steps.map(({ number, icon: Icon, title, text, href, action }) => (
            <article className="getting-started-step" key={number}>
              <span className="step-number">{number}</span>
              <Icon size={20} />
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
              <a href={href}>{action} <ArrowRight size={15} /></a>
            </article>
          ))}
        </div>

        <aside className="getting-started-sidebar">
          <section className="launch-checklist-card">
            <span className="eyebrow">Production checklist</span>
            <h2>Before the first public link</h2>
            <GuideChecklist items={checklist} compact />
          </section>
          <section className="launch-help-card">
            <span className="eyebrow">Need help?</span>
            <p>Open a support ticket if upload, payout, gates or copyright review blocks the launch.</p>
            <a className="button ghost" href="#/support"><MessageCircle size={16} /> Contact support</a>
          </section>
        </aside>
      </section>

      <section className="launch-card-grid">
        {launchCards.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon size={19} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function ReleaseGuidePage() {
  const sections = [
    ["Metadata", "Use an exact title, artist name, genre, track count, duration and price. Avoid misleading names or third-party brands unless licensed."],
    ["Audio", "Upload the master file you want to stream or deliver. If downloads are disabled, fans can play the release without receiving the file."],
    ["Download gate", "Choose Like, Follow, Share and/or Comment. Keep the gate short for free downloads and stricter for promo WAV campaigns."],
    ["Rights", "Publish only content you own or have permission to distribute. Reports can move releases to review or remove them from public pages."],
    ["After release", "Watch plays, downloads, revenue and support tickets from the dashboard and staff panel."]
  ];
  return (
    <main className="page legal-page">
      <PageHeader eyebrow="Release guide" title="Ship music without messy edges." text="A clean operating guide for uploads, download gates, payments and copyright checks." />
      <section className="legal-grid">
        {sections.map(([title, text]) => <article className="card legal-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}
      </section>
      <article className="card legal-card accent-card">
        <h2>Recommended gate presets</h2>
        <GuideChecklist items={["Free WAV: Like + Follow", "Promo campaign: Follow + Share + Comment", "Paid release: no gate, checkout only", "Private review: keep moderation status on review"]} />
      </article>
    </main>
  );
}

function LegalPageShell({ eyebrow, title, text, children }) {
  return (
    <main className="page legal-page">
      <PageHeader eyebrow={eyebrow} title={title} text={text} />
      <article className="legal-identity-card">
        <div className="legal-brand-row">
          <Logo />
          <span className="legal-status"><ShieldCheck size={15} /> Operational legal base</span>
        </div>
        <div className="legal-identity-grid">
          <span><small>Platform</small><strong>{COMPANY_INFO.name}</strong></span>
          <span><small>Company no.</small><strong>{COMPANY_INFO.companyNumber}</strong></span>
          <span><small>Affiliation</small><strong>{COMPANY_INFO.affiliation}</strong></span>
          <span><small>Contact</small><strong>{COMPANY_INFO.email}</strong></span>
        </div>
      </article>
      {children}
      <article className="legal-note">
        <ShieldCheck size={18} />
        <p>These pages are a production-ready operational base. Before public launch, have the final wording validated by a legal professional and complete any mandatory registered-office details required for your exact entity.</p>
      </article>
    </main>
  );
}

function LegalNoticePage() {
  const legalSections = [
    {
      icon: Building2,
      title: "Publisher",
      details: [
        ["Operator", COMPANY_INFO.name],
        ["Platform", COMPANY_INFO.domain],
        ["Company no.", COMPANY_INFO.companyNumber],
        ["Affiliation", COMPANY_INFO.affiliation]
      ],
      text: "Undiscover operates a storefront platform for electronic artists, labels and listeners."
    },
    {
      icon: Mail,
      title: "Contact",
      details: [
        ["Email", COMPANY_INFO.email],
        ["Phone", COMPANY_INFO.phone],
        ["Support", "Tracked tickets through the support page"]
      ],
      text: "Support requests should be sent through the support page so each request is created, assigned and tracked."
    },
    {
      icon: Server,
      title: "Hosting and technical operation",
      details: [
        ["Runtime", "Debian, Docker, Nginx"],
        ["Storage", "Persistent database and upload volume"],
        ["Logs", "Security, abuse prevention and reliability"]
      ],
      text: "The production stack is designed for a persistent server deployment with controlled logs and operational monitoring."
    },
    {
      icon: LifeBuoy,
      title: "Complaints",
      details: [
        ["Account", "Open a support ticket"],
        ["Payment", `Email ${COMPANY_INFO.email}`],
        ["Copyright", "Reports may lead to review, blocking or removal"]
      ],
      text: "For account, payment, copyright or data requests, contact support with the relevant release, account or rights-owner details."
    }
  ];

  return (
    <LegalPageShell eyebrow="Legal notice" title="Publisher and platform information." text="Company, contact and operational details for Undiscover.">
      <section className="legal-notice-grid">
        {legalSections.map(({ icon: Icon, title, details, text }) => (
          <article className="legal-info-card" key={title}>
            <div className="legal-info-head">
              <Icon size={19} />
              <h2>{title}</h2>
            </div>
            <p>{text}</p>
            <dl>
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </LegalPageShell>
  );
}

function TermsOfUsePage() {
  const terms = [
    ["Accounts", "Users must provide accurate information, protect credentials and keep contact details updated. Undiscover may suspend accounts used for fraud, abuse, spam, illegal uploads or security attacks."],
    ["Artist content", "Artists keep ownership of their music, artwork and metadata. By uploading, they grant Undiscover the rights needed to host, stream, promote, sell, gate and deliver that content through the platform."],
    ["Download gates", "Artists may require Like, Follow, Share or Comment actions before downloads. Gates must not be used for deception, fake engagement or prohibited content."],
    ["Moderation", "Staff, moderators and admins can review, block, remove or restore content when required for copyright, safety, payment, legal or technical reasons."],
    ["Availability", "Undiscover aims to keep the service stable, but maintenance, hosting issues, payment provider issues or legal reviews may temporarily affect access."]
  ];
  return (
    <LegalPageShell eyebrow="Terms of use" title="Rules for using Undiscover." text="The platform rules for artists, listeners, staff and account holders.">
      <section className="legal-stack">{terms.map(([title, text]) => <article className="card legal-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</section>
    </LegalPageShell>
  );
}

function SalesTermsPage() {
  const terms = [
    ["Scope", "These sales terms cover digital releases, downloads, dubpacks, subscriptions, artist tools and related services sold or enabled through Undiscover."],
    ["Prices and payment", "Prices are displayed before checkout. Paid releases and subscriptions are charged through the available checkout flow. Taxes, invoices and payment references must match the final production payment provider setup."],
    ["Digital delivery", "Digital content is delivered by account access, streaming, download unlock or direct file access when enabled by the artist."],
    ["Withdrawal and refunds", "For consumers, distance contracts may include a 14-day withdrawal right. For digital content, this right can be lost once immediate access or download begins after clear consent. Refund requests are reviewed case by case for duplicate payments, failed delivery or legal takedowns."],
    ["Artist payouts", "Artist balances are calculated from completed paid transactions minus platform fees, refunds, chargebacks, taxes and corrections. Payouts may be delayed during fraud, copyright or identity reviews."],
    ["Abuse and chargebacks", "Fraud, stolen payment methods, artificial downloads or abusive refund behavior can lead to blocked access and account review."]
  ];
  return (
    <LegalPageShell eyebrow="Sales terms" title="CGV for digital music and artist tools." text="Commercial terms for purchases, downloads, subscriptions and payouts.">
      <section className="legal-stack">{terms.map(([title, text]) => <article className="card legal-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</section>
    </LegalPageShell>
  );
}

function PrivacyPage() {
  const sections = [
    ["Controller", `${COMPANY_INFO.name}, company no. ${COMPANY_INFO.companyNumber}, affiliated to ${COMPANY_INFO.affiliation}, can be contacted at ${COMPANY_INFO.email}.`],
    ["Data collected", "Account details, artist profiles, uploaded audio/artwork, release metadata, gate actions, purchases, payment status, support tickets, moderation logs, device/browser logs and security events."],
    ["Purposes", "Provide accounts, host releases, process downloads and purchases, operate support, prevent abuse, moderate copyright reports, maintain security and comply with legal obligations."],
    ["Legal bases", "Processing may rely on contract performance, legal obligations, legitimate interests, consent where required and defense of legal claims."],
    ["Retention", "Operational data is kept as long as needed for the account, contracts, support, legal duties, fraud prevention and accounting. Deleted public content may remain in backups for a limited technical period."],
    ["Rights", "Users may request access, rectification, deletion, restriction, portability, objection and information about automated processing where applicable."],
    ["Processors", "Hosting, storage, payment, email, analytics, security and support providers may process data for Undiscover under appropriate safeguards."]
  ];
  return (
    <LegalPageShell eyebrow="Privacy" title="Privacy and data protection." text="How Undiscover handles account, catalog, support and operational data.">
      <section className="legal-stack">{sections.map(([title, text]) => <article className="card legal-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</section>
    </LegalPageShell>
  );
}

function AcceptableUsePage() {
  const rules = [
    ["Copyright", "Do not upload music, samples, artwork, vocals, packs or metadata unless you own the rights or have a valid license."],
    ["Illegal content", "Do not use the platform for unlawful, hateful, threatening, harassing, fraudulent, malware-related or privacy-invasive content."],
    ["Platform integrity", "Do not scrape, attack, overload, bypass gates, manipulate plays/downloads, resell accounts or interfere with other users."],
    ["Takedowns", "Rights holders can report content through support. Reports should identify the work, the release, the rights holder and the reason for removal."],
    ["Repeat abuse", "Repeated copyright, payment, spam or security violations can lead to account restrictions, withheld payouts, blocked releases or account termination."]
  ];
  return (
    <LegalPageShell eyebrow="Acceptable use" title="Clean catalog rules." text="The content, copyright and abuse rules that keep the platform usable.">
      <section className="legal-stack">{rules.map(([title, text]) => <article className="card legal-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</section>
    </LegalPageShell>
  );
}

function CareersPage() {
  return (
    <main className="page narrow">
      <PageHeader eyebrow="Careers" title="Build the artist storefront layer." text="Staff, Moderator and Admin roles are ready for production operations." />
      <div className="release-grid">
        {["Support staff", "Catalog moderator", "Platform admin"].map((role) => <article className="card" key={role}><h2>{role}</h2><p className="muted">Help artists ship releases, clear tickets and keep the catalog clean.</p><a className="button ghost" href="#/support">Contact us</a></article>)}
      </div>
    </main>
  );
}

function StaffPanel({ notify }) {
  const { user } = useAuth();
  const { data, loading, error } = useData("/staff/overview", [user?.id]);
  if (!user) return <AuthRequired />;
  if (!["staff", "moderator", "admin"].includes(user.role)) return <ErrorPage message="Staff access required." />;
  if (loading) return <main className="page dashboard-page"><SkeletonList /></main>;
  if (error) return <ErrorPage message={error} />;
  const setRole = async (id, role) => {
    await request(`/staff/users/${id}/role`, { method: "POST", body: JSON.stringify({ role }) });
    notify("Role updated.");
    location.reload();
  };
  const moderate = async (id, status) => {
    await request(`/staff/releases/${id}/moderate`, { method: "POST", body: JSON.stringify({ status }) });
    notify("Release moderation updated.");
    location.reload();
  };
  const ticketStatus = async (id, status) => {
    await request(`/staff/tickets/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
    notify("Ticket updated.");
    location.reload();
  };
  return (
    <main className="page dashboard-page">
      <div className="staff-shell">
        <PageHeader eyebrow="Staff panel" title="Manage the full site." text="Roles, moderation, support tickets and takedowns in one production console." />
        <section className="dashboard-kpi-grid">
          <Metric icon={<Users />} label="Users" value={data.users.length} delta={`${data.users.filter((u) => u.role !== "user").length} staff`} />
          <Metric icon={<Package />} label="Releases" value={data.releases.length} delta={`${data.releases.filter((r) => r.moderation_status === "review").length} review`} />
          <Metric icon={<LifeBuoy />} label="Tickets" value={data.tickets.length} delta={`${data.tickets.filter((t) => t.status === "open").length} open`} />
          <Metric icon={<ShieldAlert />} label="Reports" value={data.reports.length} delta="copyright" />
        </section>
        <div className="staff-grid">
          <section className="staff-card">
            <SectionTitle title="Roles" />
            {data.users.map((item) => <div className="staff-row" key={item.id}><span className="avatar">{item.avatar}</span><strong>{item.name}<small>{item.email}</small></strong><select value={item.role} disabled={user.role !== "admin"} onChange={(e) => setRole(item.id, e.target.value)}><option value="user">User</option><option value="staff">Staff</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></div>)}
          </section>
          <section className="staff-card">
            <SectionTitle title="Moderation" />
            {data.releases.slice(0, 8).map((release) => <div className="staff-row" key={release.id}><span className={`avatar ${release.color}`}>{release.avatar}</span><strong>{release.title}<small>{release.artist} - {release.scan_status}</small></strong><select value={release.moderation_status} onChange={(e) => moderate(release.id, e.target.value)}><option>published</option><option>review</option><option>blocked</option><option>removed</option></select></div>)}
          </section>
          <section className="staff-card">
            <SectionTitle title="Live support tickets" />
            {data.tickets.length ? data.tickets.map((ticket) => <div className="staff-ticket" key={ticket.id}><b>{ticket.topic}</b><p>{ticket.message}</p><small>{ticket.name} - {ticket.email}</small><select value={ticket.status} onChange={(e) => ticketStatus(ticket.id, e.target.value)}><option>open</option><option>pending</option><option>closed</option></select></div>) : <p className="muted">No support tickets yet.</p>}
          </section>
          <section className="staff-card">
            <SectionTitle title="Copyright reports" />
            {data.reports.length ? data.reports.map((report) => <div className="staff-ticket" key={report.id}><b>{report.release_title}</b><p>{report.reason}</p><small>{report.reporter_email} - {report.status}</small></div>) : <p className="muted">No takedown reports.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function ContainerScroll({ titleComponent, children }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section className="scroll-showcase" ref={containerRef}>
      <motion.div className="scroll-title" style={{ y: translate }}>
        {titleComponent}
      </motion.div>
      <motion.div className="scroll-device" style={{ rotateX: rotate, scale }}>
        <div className="scroll-screen">{children}</div>
      </motion.div>
    </section>
  );
}

function ProductScrollDemo() {
  return (
    <ContainerScroll
      titleComponent={
        <>
          <p className="label">Artist operating system</p>
          <h2>Catalog, sales and audience signals in one clean yard.</h2>
        </>
      }
    >
      <CurrentDashboardPreview />
    </ContainerScroll>
  );
}

function CurrentDashboardPreview() {
  return (
    <div className="current-dashboard-preview">
      <aside className="preview-sidebar">
        <Logo />
        {["Overview", "Catalog", "Analytics", "Payouts"].map((item, index) => (
          <span className={index === 0 ? "active" : ""} key={item}>{item}</span>
        ))}
      </aside>
      <section className="preview-main">
        <div className="preview-hero">
          <div>
            <p className="label">Verified artist workspace</p>
            <h3>Your live dashboard</h3>
            <span>Manage releases, revenue and audience signals from one clean console.</span>
          </div>
          <article>
            <BrandMark className="mini-icon" label="Undiscover" />
            <small>Available balance</small>
            <strong>1501 EUR</strong>
            <em>+18% vs last week</em>
          </article>
        </div>
        <div className="preview-kpis">
          <Metric icon={<Wallet />} label="Revenue" value="1501 EUR" delta="+18%" />
          <Metric icon={<BarChart3 />} label="Plays" value="13k" delta="+9%" />
          <Metric icon={<ArrowDownToLine />} label="Downloads" value="1.4k" delta="+31%" />
          <Metric icon={<UserPlus />} label="Followers" value="2" delta="+42 new" />
        </div>
        <div className="preview-bottom">
          <div className="preview-insight">
            <p className="label">Top signal</p>
            <strong>Top release</strong>
            <span>Real plays, downloads and checkout revenue are tracked from the database.</span>
          </div>
          <div className="preview-bars">
            {[34, 48, 42, 86, 38, 60, 54].map((height, index) => <i className={index === 3 ? "hot" : ""} style={{ height }} key={height} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function ScrambleButton({ children = "Explore drops", href = "#/explore" }) {
  const [displayText, setDisplayText] = useState(children);
  const [scrambling, setScrambling] = useState(false);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const scramble = () => {
    if (scrambling) return;
    setScrambling(true);
    let tick = 0;
    const timer = setInterval(() => {
      setDisplayText(children.split("").map((letter, index) => {
        if (letter === " ") return " ";
        if (index < tick) return children[index];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      tick += 1;
      if (tick > children.length) {
        clearInterval(timer);
        setDisplayText(children);
        setScrambling(false);
      }
    }, 28);
  };
  return <a className="button accent scramble-button" href={href} onMouseEnter={scramble}>{displayText}</a>;
}

function Marquee({ children, reverse = false, speed = 28 }) {
  return (
    <div className="marquee-row" style={{ "--duration": `${speed}s` }}>
      <div className={reverse ? "marquee-track reverse" : "marquee-track"}>{children}</div>
      <div className={reverse ? "marquee-track reverse" : "marquee-track"} aria-hidden="true">{children}</div>
    </div>
  );
}

function ReleaseMarqueeCTA({ releases }) {
  const items = releases.slice(0, 4);
  if (!items.length) return null;
  return (
    <section className="release-marquee-cta">
      <div className="release-marquee-copy">
        <p className="label">Fresh crates</p>
        <h2>New releases moving through the yard.</h2>
        <p>Tracks, EPs and dubpacks shown like a dock wall: raw artwork, clean signals, quick actions.</p>
        <ScrambleButton href="#/explore">Browse releases</ScrambleButton>
      </div>
      <div className="release-marquee-wall">
        <Marquee reverse speed={26}>
          {items.map((release) => <MarqueeTile key={`a-${release.id}`} release={release} />)}
        </Marquee>
        <Marquee speed={32}>
          {[...items].reverse().map((release) => <MarqueeTile key={`b-${release.id}`} release={release} />)}
        </Marquee>
      </div>
    </section>
  );
}

function MarqueeTile({ release }) {
  return (
    <a className="marquee-tile" href={`#/release/${release.id}`}>
      <PackArtwork release={release} />
      <strong>{release.title}</strong>
      <span>{release.artist}</span>
    </a>
  );
}

function ShuffleTrackGrid({ releases }) {
  const base = releases.slice(0, 5);
  if (!base.length) {
    return (
      <div className="shuffle-track-grid hero-release-showcase hero-empty-catalog" aria-label="Undiscover catalog empty">
        <div>
          <BrandMark label="Undiscover" />
          <span>Catalog ready</span>
          <strong>No public releases yet</strong>
          <small>Publish the first real track from the artist dashboard.</small>
          <a className="button accent" href="#/upload"><Upload size={16} /> Upload release</a>
        </div>
      </div>
    );
  }
  const [featured, ...secondary] = base;
  const sideItems = secondary.slice(0, 2);
  const stripItems = base.slice(0, 4);

  return (
    <div className="shuffle-track-grid hero-release-showcase" aria-label="Latest Undiscover tracks">
      <motion.a
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .55 }}
        className="hero-focus-release"
        href={`#/release/${featured.id}`}
      >
        <PackArtwork release={featured} />
        <span>{featured.genre}</span>
        <strong>{featured.title}</strong>
        <small>{featured.artist} - {money(featured.price_cents)}</small>
      </motion.a>
      <div className="hero-side-releases">
        {sideItems.map((release, index) => (
          <motion.a
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: .45, delay: .1 + index * .08 }}
            className="hero-compact-release"
            href={`#/release/${release.id}`}
            key={release.id}
          >
            <PackArtwork release={release} />
            <span>{release.genre}</span>
            <strong>{release.title}</strong>
            <small>{release.artist}</small>
          </motion.a>
        ))}
      </div>
      <div className="hero-release-strip">
        {stripItems.map((release) => (
          <a href={`#/release/${release.id}`} key={`strip-${release.id}`}>
            <i className={`avatar ${release.color}`}>{release.avatar}</i>
            <span>{release.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function HeroLatestTracks({ releases, playRelease }) {
  const latest = releases.slice(0, 2);
  return (
    <aside className="hero-latest-panel">
      <div className="hero-latest-head">
        <span>Latest tracks</span>
        <a href="#/explore">See all <ArrowRight size={14} /></a>
      </div>
      <div className="hero-latest-list">
        {latest.length ? latest.map((release, index) => (
          <article key={release.id}>
            <button className="play" onClick={() => playRelease(release)} aria-label={`Play ${release.title}`}><Play size={13} fill="currentColor" /></button>
            <span className={`avatar ${release.color}`}>{release.avatar}</span>
            <a href={`#/release/${release.id}`}>
              <strong>{release.title}</strong>
              <small>{release.artist} - {release.genre}</small>
            </a>
            <em>{index + 1}</em>
          </article>
        )) : <p className="muted">No public tracks yet. Upload a real release to populate this rail.</p>}
      </div>
    </aside>
  );
}

function wrapIndex(min, max, value) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

const railSpring = { type: "spring", stiffness: 300, damping: 30, mass: 1 };
const railTapSpring = { type: "spring", stiffness: 450, damping: 18, mass: 1 };

function FocusRail({ releases, title = "New releases", subtitle = "Swipe, wheel or tap the side covers to browse the latest drops." }) {
  const items = releases.slice(0, 5);
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const lastWheelTime = useRef(0);
  if (!items.length) return null;
  const count = items.length;
  const activeIndex = wrapIndex(0, count, active);
  const activeItem = items[activeIndex];
  const previous = () => setActive((value) => value - 1);
  const next = () => setActive((value) => value + 1);

  useEffect(() => {
    if (hovering) return undefined;
    const timer = setInterval(next, 5200);
    return () => clearInterval(timer);
  }, [hovering]);

  const onWheel = (event) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 420) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) > 20) {
      delta > 0 ? next() : previous();
      lastWheelTime.current = now;
    }
  };

  const onDragEnd = (_, info) => {
    const swipe = Math.abs(info.offset.x) * info.velocity.x;
    if (swipe < -9000) next();
    if (swipe > 9000) previous();
  };

  return (
    <section
      className="focus-rail"
      tabIndex={0}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onWheel={onWheel}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
      }}
    >
      <div className="focus-rail-ambience" />
      <div className="focus-rail-head">
        <p className="label">Warehouse rail</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <motion.div className="focus-stage" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={onDragEnd}>
        {[-2, -1, 0, 1, 2].map((offset) => {
          const absolute = active + offset;
          const release = items[wrapIndex(0, count, absolute)];
          const center = offset === 0;
          const distance = Math.abs(offset);
          return (
            <motion.button
              type="button"
              className={center ? "focus-card center" : "focus-card"}
              key={`${release.id}-${absolute}`}
              onClick={() => offset ? setActive((value) => value + offset) : location.hash = `#/release/${release.id}`}
              animate={{
                x: offset * 260,
                z: -distance * 160,
                scale: center ? 1 : 0.82,
                rotateY: offset * -18,
                opacity: center ? 1 : Math.max(0.18, 1 - distance * 0.45),
                filter: `blur(${center ? 0 : distance * 3}px) brightness(${center ? 1 : 0.56})`
              }}
              transition={(prop) => prop === "scale" ? railTapSpring : railSpring}
              style={{ transformStyle: "preserve-3d" }}
              aria-label={`Open ${release.title}`}
            >
              <PackArtwork release={release} large />
              <span>{release.kind}</span>
            </motion.button>
          );
        })}
      </motion.div>
      <div className="focus-info">
        <AnimatePresence mode="wait">
          <motion.div key={activeItem.id} initial={{ opacity: 0, y: 10, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}>
            <span className="label">{activeItem.genre} - {money(activeItem.price_cents)}</span>
            <h3>{activeItem.title}</h3>
            <p>{activeItem.artist} - {activeItem.tracks} track(s) - {activeItem.duration}</p>
          </motion.div>
        </AnimatePresence>
        <div className="focus-controls">
          <button type="button" onClick={previous} aria-label="Previous release"><ChevronLeft size={20} /></button>
          <span>{activeIndex + 1} / {count}</span>
          <button type="button" onClick={next} aria-label="Next release"><ChevronRight size={20} /></button>
          <a className="button accent" href={`#/release/${activeItem.id}`}>Explore <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </section>
  );
}

function OfferCarousel({ releases, title = "Trending offers", action = "Open charts" }) {
  const rail = useRef(null);
  const offers = releases.slice(0, 8);
  if (!offers.length) return null;
  const scroll = (direction) => rail.current?.scrollBy({ left: direction * 330, behavior: "smooth" });
  return (
    <section className="offer-section">
      <div className="section-title offer-title">
        <div><h2>{title}</h2><p>Fast cards for releases, free downloads and paid dubpacks.</p></div>
        <div className="offer-controls">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous offers"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next offers"><ChevronRight size={18} /></button>
          <a href="#/charts">{action} <ArrowRight size={15} /></a>
        </div>
      </div>
      <div className="offer-rail" ref={rail}>
        {offers.map((release) => (
          <motion.a whileHover={{ y: -4 }} className="offer-card" href={`#/release/${release.id}`} key={release.id}>
            <PackArtwork release={release} />
            <span className="offer-tag"><Tag size={14} /> {release.free ? "Free download" : money(release.price_cents)}</span>
            <h3>{release.title}</h3>
            <p>{release.artist} - {release.genre}</p>
            <small>{shortNumber(release.plays)} plays</small>
          </motion.a>
        ))}
      </div>
    </section>
  );
}

function Home({ notify, playRelease }) {
  const { data, loading } = useData("/releases", []);
  const releases = data?.releases || [];
  const trending = releases.slice(0, 3);
  const packs = releases.filter((item) => item.kind === "Dubpack").slice(0, 3);
  return (
    <main className="home-page">
      <section className="hero landing-hero full-bleed-hero">
        <GLSLHills speed={0.42} />
        <div className="hero-copy">
          <HeroPill href="#/pricing" announcement="New" label="Production catalog, gates and checkout are live" />
          <p className="label">The yard is open</p>
          <h1>Ship your release<br /><span><SparklesText text="direct to the crowd." /></span></h1>
          <p>Undiscover gives electronic artists a fast, direct storefront for tracks, EPs and dubpacks. Upload, share, sell and grow without a middleman.</p>
          <div className="hero-actions">
            <a className="button accent" href="#/upload"><Upload size={17} /> Start uploading</a>
            <a className="button ghost" href="#/explore">Browse catalog</a>
          </div>
          <TrustedAvatarStack />
        </div>
        <div className="hero-visual-stage">
          <ShuffleTrackGrid releases={releases} />
          <HeroLatestTracks releases={releases} playRelease={playRelease} />
        </div>
      </section>
      <div className="page">
        <LogoSlider />
        {!loading && <ReleaseMarqueeCTA releases={releases} />}
        {!loading && <FocusRail releases={releases} />}
        {!loading && <OfferCarousel releases={releases} />}
        <ProductScrollDemo />
        <Testimonials />
        <section className="section">
          <SectionTitle title="Trending" link="#/charts" action="See all" />
          {loading ? <SkeletonList /> : trending.length ? <ReleaseRows releases={trending} notify={notify} playRelease={playRelease} ranked /> : <EmptyCatalogState />}
        </section>
        <section className="section">
          <SectionTitle title="Dubpacks" link="#/explore?kind=Dubpack" action="Browse all" />
          {packs.length ? <div className="pack-grid">{packs.map((release) => <PackCard key={release.id} release={release} />)}</div> : <EmptyCatalogState title="No dubpacks yet" text="Publish the first real dubpack from the upload page." />}
        </section>
      </div>
    </main>
  );
}

function EmptyCatalogState({ title = "No public releases yet", text = "The production catalog is empty until artists upload and publish real releases." }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      <a className="button accent" href="#/upload"><Upload size={16} /> Upload release</a>
    </div>
  );
}

function Testimonials() {
  const quotes = [
    {
      size: "large",
      logo: "U0 PRO",
      quote: "Undiscover turned our private dub workflow into a storefront. Uploading, gating and selling edits finally feels direct.",
      name: "Independent artist",
      role: "Producer",
      avatar: "IA"
    },
    {
      size: "wide",
      quote: "No bloated marketplace energy. Just clean releases, clean stats, and a checkout I can send to promoters.",
      name: "Label owner",
      role: "Catalog manager",
      avatar: "LO"
    },
    {
      quote: "The free download gates are exactly what I needed for mailing-list growth.",
      name: "Download-gate user",
      role: "Artist",
      avatar: "DG"
    },
    {
      quote: "The artist page feels like a real catalog, not a social feed trying to sell me ads.",
      name: "Milo Varen",
      role: "Label manager",
      avatar: "MV"
    }
  ];

  return (
    <section className="testimonials-section">
      <div className="testimonials-head">
        <h2>Built for makers, loved by electronic artists.</h2>
        <p>Undiscover gives producers a sharper way to package tracks, prove demand and sell directly to their audience.</p>
      </div>
      <div className="testimonial-grid">
        {quotes.map((item) => (
          <article className={`testimonial-card ${item.size || ""}`} key={item.name}>
            {item.logo && <div className="testimonial-logo">{item.logo}</div>}
            <blockquote>
              <p>{item.quote}</p>
              <footer>
                <span className="avatar">{item.avatar}</span>
                <span><cite>{item.name}</cite><small>{item.role}</small></span>
              </footer>
            </blockquote>
          </article>
        ))}
      </div>
    </section>
  );
}

function LogoSlider() {
  const { data: releasesData } = useData("/releases", []);
  const { data: artistsData } = useData("/artists", []);
  const releases = releasesData?.releases || [];
  const artists = artistsData?.artists || [];
  const releaseLabels = releases
    .slice(0, 10)
    .map((release) => `${release.title} - ${release.artist}`);
  const artistLabels = artists
    .slice(0, 10)
    .map((artist) => artist.name);
  const labels = releaseLabels.length ? releaseLabels : artistLabels.length ? artistLabels : ["Undiscover"];
  const marqueeLabels = labels.length > 1 ? [...labels, ...labels] : [...labels, ...labels, ...labels, ...labels];

  return (
    <section className="logo-slider-section">
      <p>Powering direct drops for artists</p>
      <div className="logo-slider" aria-label="Undiscover artist and label network">
        <div className="logo-track" data-no-translate>
          {marqueeLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>
      </div>
    </section>
  );
}

function Explore({ notify, playRelease }) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("All");
  const { data, loading } = useData(`/releases?q=${encodeURIComponent(q)}&genre=${encodeURIComponent(genre)}`, [q, genre]);
  const genres = ["All", "Tech House", "Techno", "Melodic", "Afro House"];
  return (
    <main className="page">
      <PageHeader eyebrow="Explore" title="Find releases built for DJs." text="Tracks, EPs and dubpacks from independent electronic artists." />
      <div className="toolbar">
        <label className="search"><Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artist, track, genre..." /></label>
        <div className="chips">{genres.map((item) => <button key={item} className={genre === item ? "chip active" : "chip"} onClick={() => setGenre(item)}>{item}</button>)}</div>
      </div>
      {loading ? <SkeletonList /> : <ReleaseGrid releases={data.releases} notify={notify} playRelease={playRelease} />}
    </main>
  );
}

function Charts({ notify, playRelease }) {
  const { data, loading } = useData("/releases", []);
  return (
    <main className="page">
      <PageHeader eyebrow="Charts" title="Trending this week" text="Ranked by plays, sales energy and yard noise." />
      {loading ? <SkeletonList /> : <><OfferCarousel releases={data.releases} title="Chart movers" action="Explore all" /><ReleaseRows releases={data.releases} notify={notify} playRelease={playRelease} ranked /></>}
    </main>
  );
}

function Artists({ notify }) {
  const [q, setQ] = useState("");
  const { data, loading } = useData(`/artists?q=${encodeURIComponent(q)}`, [q]);
  return (
    <main className="page">
      <PageHeader eyebrow="Artists" title="Independent producers, clean storefronts." text="Follow artists, browse catalogs and message for bookings." />
      <div className="toolbar"><label className="search"><Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artist or genre..." /></label></div>
      {loading ? <SkeletonList /> : <div className="artist-grid">{data.artists.map((artist) => <ArtistCard key={artist.id} artist={artist} notify={notify} />)}</div>}
    </main>
  );
}

function ArtistProfile({ id, notify, playRelease }) {
  const { data, loading, error } = useData(`/artists/${id}`, [id]);
  if (loading) return <main className="page"><SkeletonList /></main>;
  if (error) return <ErrorPage message={error} />;
  const { artist, releases } = data;
  const totalDownloads = releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const totalSales = releases.reduce((sum, release) => sum + Number(release.sales || 0), 0);
  const revenue = releases.reduce((sum, release) => sum + Number(release.revenue_cents || 0), 0);
  const topRelease = [...releases].sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0))[0];
  const freeCount = releases.filter((release) => release.free).length;
  const paidCount = Math.max(releases.length - freeCount, 0);
  const socialLinks = (() => { try { return JSON.parse(artist.social_links || "{}"); } catch { return {}; } })();
  const profileUrl = artistPublicUrl(artist);
  const copyProfile = async () => {
    await navigator.clipboard?.writeText(profileUrl);
    notify("Profile link copied.");
  };
  return (
    <main className="page artist-profile-page">
      <section className={`artist-profile-hero ${artist.pro ? "is-pro" : ""}`}>
        <div className={`artist-profile-banner tone-${artist.id.includes("nala") ? "blue" : artist.id.includes("mosser") ? "red" : "green"}`}>
          {artist.banner_url ? <img className="artist-banner-image" src={artist.banner_url} alt="" /> : <><div className="profile-banner-noise" /><CrateMark className="cover-crate" /></>}
          <div className="profile-banner-copy">
            <span>Public artist profile</span>
            <strong>{artist.name}</strong>
          </div>
          <div className="profile-banner-meter" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ height: `${22 + (index % 6) * 9}px` }} />)}
          </div>
        </div>
        <div className="artist-profile-panel">
          <div className="artist-identity">
            <span className="artist-avatar-xl">{artist.logo_url || artist.avatar_url ? <img src={artist.logo_url || artist.avatar_url} alt="" /> : artist.avatar}</span>
            <div>
              <div className="profile-badges">
                <span className="badge soft">{artist.genre}</span>
                {artist.verified ? <span className="badge accent">Verified</span> : null}
                {artist.pro ? <span className="badge dark">U0 Pro</span> : null}
              </div>
              <h1>{artist.name}</h1>
              <p>{artist.bio || "Direct club music catalog, free gates, dubpacks and release drops."}</p>
              <div className="artist-location-line">
                <span><MapPin size={15} /> {artist.location}</span>
                <span><Music2 size={15} /> {artist.releases_count} releases</span>
                <span><HeadsetIcon size={15} /> Direct bookings</span>
              </div>
              <div className="button-row">
                <FollowButton artistId={artist.id} notify={notify} />
                <button className="button ghost" onClick={() => notify("Message thread opened.")}><MessageCircle size={16} /> Message</button>
                <button className="button ghost" onClick={copyProfile}><Copy size={16} /> Copy link</button>
              </div>
              <div className="artist-social-links">
                {Object.entries(socialLinks).filter(([, href]) => href).map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}<ExternalLink size={13} /></a>)}
              </div>
            </div>
          </div>

          <aside className="artist-profile-card">
            <span className="label">Top release</span>
            <strong>{topRelease?.title || "No releases yet"}</strong>
            <small>{topRelease ? `${shortNumber(topRelease.plays)} plays - ${shortNumber(topRelease.downloads)} downloads` : "Upload coming soon"}</small>
            {topRelease ? <a className="button accent" href={`#/release/${topRelease.id}`}>Open release <ArrowUpRight size={16} /></a> : <a className="button accent" href="#/upload">Upload release <Upload size={16} /></a>}
          </aside>
        </div>
      </section>

      <section className="artist-profile-stats">
        <article><BarChart3 size={18} /><span>Plays</span><strong>{shortNumber(artist.plays)}</strong><small>Public catalog reach</small></article>
        <article><Download size={18} /><span>Downloads</span><strong>{shortNumber(totalDownloads)}</strong><small>{freeCount} free gate(s)</small></article>
        <article><ShoppingCart size={18} /><span>Sales</span><strong>{shortNumber(totalSales)}</strong><small>{paidCount} paid drop(s)</small></article>
        <article><Wallet size={18} /><span>Revenue</span><strong>{money(revenue)}</strong><small>Tracked from purchases</small></article>
      </section>

      <section className="artist-profile-grid">
        <article className="artist-detail-card">
          <span className="label">Artist signal</span>
          <h2>Built for clubs, DJs and direct fans.</h2>
          <p>{artist.name} keeps the storefront focused: clear releases, fast actions, direct messages and a catalog that feels like a real crate.</p>
          <div className="profile-mini-list">
            <span><ShieldCheck size={15} /> Rights-aware uploads</span>
            <span><WifiIcon size={15} /> Live release signals</span>
            <span><Mail size={15} /> Booking and promo contact</span>
          </div>
        </article>
        <article className="artist-detail-card compact">
          <span className="label">Catalog status</span>
          <div className="catalog-ratio">
            <b>{releases.length || 0}</b>
            <span>published</span>
          </div>
          <div className="catalog-bars">
            <i style={{ width: `${releases.length ? Math.max(18, (freeCount / releases.length) * 100) : 0}%` }}><span>Free</span></i>
            <i style={{ width: `${releases.length ? Math.max(18, (paidCount / releases.length) * 100) : 0}%` }}><span>Paid</span></i>
          </div>
        </article>
      </section>

      <section className="section profile-releases-section">
        <SectionTitle title="Latest releases" />
        <ProfileReleaseList releases={releases} notify={notify} playRelease={playRelease} />
      </section>
    </main>
  );
}

function ProfileReleaseList({ releases, notify, playRelease }) {
  if (!releases.length) return <div className="empty"><h2>No releases yet</h2><p>This artist has not published a release.</p></div>;
  return (
    <div className="profile-release-list">
      {releases.map((release) => (
        <article className="profile-release-card" key={release.id}>
          <button className="play" onClick={() => playRelease(release)} aria-label={`Play ${release.title}`}><Play size={14} fill="currentColor" /></button>
          <PackArtwork release={release} />
          <div className="profile-release-copy">
            <p className="label">{release.kind} - {release.genre}</p>
            <h3><a href={`#/release/${release.id}`}>{release.title}</a></h3>
            <span>{release.tracks} track(s) - {release.duration} - {release.gate || "No gate"}</span>
          </div>
          <div className="profile-release-meta">
            <span className={release.free ? "price free" : "price"}>{money(release.price_cents)}</span>
            <small>{shortNumber(release.plays)} plays</small>
            <small>{shortNumber(release.downloads)} downloads</small>
          </div>
          <div className="profile-release-actions">
            <LikeButton release={release} notify={notify} />
            {release.free ? <DownloadButton release={release} notify={notify} compact /> : <BuyButton release={release} notify={notify} compact />}
          </div>
        </article>
      ))}
    </div>
  );
}

function ReleaseDetail({ id, notify, playRelease }) {
  const { data, loading, error } = useData(`/releases/${id}`, [id]);
  const [reportOpen, setReportOpen] = useState(false);
  if (loading) return <main className="page"><SkeletonList /></main>;
  if (error) return <ErrorPage message={error} />;
  const release = data.release;
  return (
    <main className="page release-detail-page">
      <section className="release-detail-hero">
        <PackArtwork release={release} large />
        <div className="release-detail-copy">
          <p className="label">{release.kind} - {release.genre} - {release.visibility || "public"}</p>
          <h1>{release.title}</h1>
          <p className="muted">By <a href={artistPath({ id: release.user_id, artist_slug: release.artist_slug })}>{release.artist}</a> - {release.tracks} track(s) - {release.duration}</p>
          <p>{release.description}</p>
          <div className="release-share-line">
            <span>https://undisc0ver.com/release/{release.id}</span>
            <button className="button ghost" type="button" onClick={() => navigator.clipboard?.writeText(`https://undisc0ver.com/release/${release.id}`)}><Copy size={15} /> Copy link</button>
          </div>
        </div>
      </section>
      <section className="release-detail-body">
        <div>
        <div className="button-row">
          <button className="button accent" type="button" onClick={() => playRelease(release)}><Play size={16} fill="currentColor" /> Play</button>
          <LikeButton release={release} notify={notify} />
          {release.free ? <ReleaseDownloadGate release={release} notify={notify} /> : <BuyButton release={release} notify={notify} />}
          <button className="button ghost" type="button" onClick={() => setReportOpen((value) => !value)}><ShieldAlert size={16} /> Report copyright</button>
        </div>
        <div className="stats card-stats">
          <b>{shortNumber(release.plays)}<span>plays</span></b>
          <b>{shortNumber(release.downloads)}<span>downloads</span></b>
          <b>{shortNumber(release.sales || 0)}<span>sales</span></b>
          <b>{release.likes}<span>likes</span></b>
        </div>
        {reportOpen && <TakedownReportForm release={release} notify={notify} />}
        </div>
        <ReleaseComments release={release} initialComments={data.comments || []} notify={notify} />
      </section>
    </main>
  );
}

function ReleaseComments({ release, initialComments, notify }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!user) return location.hash = "#/login";
    await request(`/releases/${release.id}/comments`, { method: "POST", body: JSON.stringify({ body }) });
    setComments([{ id: `local-${Date.now()}`, body, name: user.name, avatar: user.avatar, avatar_url: user.avatar_url, created_at: new Date().toISOString() }, ...comments]);
    setBody("");
    notify("Comment added.");
  };
  return (
    <aside className="release-comments-card">
      <h2>Comments</h2>
      <form onSubmit={submit}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment..." />
        <button className="button accent" type="submit"><MessageCircle size={16} /> Comment</button>
      </form>
      <div className="release-comment-list">
        {comments.length ? comments.map((comment) => (
          <article key={comment.id}>
            <span className="avatar">{comment.avatar || initials(comment.name)}</span>
            <div><strong>{comment.name}</strong><p>{comment.body}</p></div>
          </article>
        )) : <p className="muted">No comments yet.</p>}
      </div>
    </aside>
  );
}

function UploadPage({ notify }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", kind: "Track", genre: "Tech House", tracks: 1, duration: "06:00", price: 8, free: false, download_enabled: true, gate_actions: [], gate: "No gate", description: "", rights_confirmed: false, rights_owner: "", visibility: "public" });
  const [file, setFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState("");
  const { data: copyrightConfig } = useData("/copyright/config", []);
  if (!user) return <AuthRequired />;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleGate = (action) => setForm((current) => {
    const gateActions = current.gate_actions.includes(action)
      ? current.gate_actions.filter((item) => item !== action)
      : [...current.gate_actions, action];
    return {
      ...current,
      gate_actions: gateActions,
      gate: gateActions.length ? gateActions.map((item) => `${item} required`).join(", ") : "No gate"
    };
  });
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!file) throw new Error("Ajoute un fichier audio avant publication.");
      const uploadedAudio = await uploadAudio(file);
      const uploadedCover = coverFile ? await uploadImage(coverFile) : null;
      const payload = {
        ...form,
        audio_url: uploadedAudio.url,
        audio_file_name: uploadedAudio.name,
        audio_mime: uploadedAudio.mime,
        audio_size: uploadedAudio.size,
        cover_url: uploadedCover?.url || "",
        gate_actions: form.download_enabled ? form.gate_actions : [],
        gate: form.download_enabled ? form.gate : "Downloads disabled"
      };
      const data = await request("/releases", { method: "POST", body: JSON.stringify(payload) });
      if (data.release.moderation_status === "published") {
        notify("Release uploaded, scanned and published.");
        location.hash = `#/release/${data.release.id}`;
      } else {
        notify(data.release.moderation_status === "blocked" ? "Release blocked by copyright scan." : "Release sent to moderation review.");
        location.hash = "#/catalog";
      }
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <main className="page narrow">
      <PageHeader eyebrow="New release" title="Upload a track, EP or dubpack." text="Metadata is saved to the production database and appears after rights checks pass." />
      <form className="form-card" onSubmit={submit}>
        <FileUploadPanel file={file} setFile={setFile} notify={notify} />
        <ImageUploadPanel file={coverFile} setFile={setCoverFile} title="Cover artwork" text="Upload a square JPG, PNG or WebP cover for this release." defaultWidth={1400} defaultHeight={1400} />
        <label>Track title<input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Your release title" required /></label>
        <div className="form-grid">
          <label>Type<select value={form.kind} onChange={(e) => update("kind", e.target.value)}><option>Track</option><option>EP</option><option>Dubpack</option></select></label>
          <label>Genre<select value={form.genre} onChange={(e) => update("genre", e.target.value)}><option>Tech House</option><option>Techno</option><option>Melodic</option><option>Afro House</option><option>Drum & Bass</option><option>Hard Techno</option><option>Riddim</option><option>Dubstep</option></select></label>
          <label>Tracks<input type="number" min="1" value={form.tracks} onChange={(e) => update("tracks", e.target.value)} /></label>
          <label>Duration<input value={form.duration} onChange={(e) => update("duration", e.target.value)} /></label>
        </div>
        <label>Visibility<select value={form.visibility} onChange={(e) => update("visibility", e.target.value)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></label>
        <div className="segmented">
          <button type="button" className={form.free ? "active" : ""} onClick={() => update("free", true)}>Free</button>
          <button type="button" className={!form.free ? "active" : ""} onClick={() => update("free", false)}>Fixed price</button>
        </div>
        {!form.free && <label>Price EUR<input type="number" min="1" value={form.price} onChange={(e) => update("price", e.target.value)} /></label>}
        <section className="download-gate-builder">
          <div className="gate-builder-head">
            <div>
              <span className="eyebrow">Download gateway</span>
              <h3>Choose fan actions before download.</h3>
              <p>Build a clean Hypeddit-style gate: fans complete selected actions, then the WAV unlocks.</p>
            </div>
            <strong>{form.download_enabled ? `${form.gate_actions.length} action${form.gate_actions.length > 1 ? "s" : ""}` : "Stream only"}</strong>
          </div>
          <label className="check-line gate-download-toggle">
            <input type="checkbox" checked={form.download_enabled} onChange={(e) => update("download_enabled", e.target.checked)} />
            <span><b>Enable downloadable WAV</b><small>Turn off for stream-only releases.</small></span>
          </label>
          {form.download_enabled ? (
            <div className="gate-action-grid">
              {DOWNLOAD_GATE_ACTIONS.map((action) => (
                <button type="button" className={form.gate_actions.includes(action.id) ? "selected" : ""} onClick={() => toggleGate(action.id)} key={action.id}>
                  <GateActionIcon action={action.id} />
                  <span>
                    <b>{action.label}</b>
                    <small>{action.description}</small>
                  </span>
                  {form.gate_actions.includes(action.id) && <Check size={16} />}
                </button>
              ))}
            </div>
          ) : <p className="muted">Stream-only mode: buy/listen pages stay live, WAV download stays hidden.</p>}
          {form.download_enabled && (
            <div className="gate-summary">
              <ShieldCheck size={16} />
              <span>{form.gate_actions.length ? `Fans must complete: ${form.gate_actions.map(gateActionLabel).join(" + ")}.` : "No action selected: the WAV button unlocks instantly after login."}</span>
            </div>
          )}
        </section>
        <label>Description<textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the release..." /></label>
        <CopyrightCompliancePanel form={form} update={update} config={copyrightConfig} />
        {error && <p className="error">{error}</p>}
        <button className="button accent" type="submit"><Upload size={17} /> Publish release</button>
      </form>
    </main>
  );
}

function CopyrightCompliancePanel({ form, update, config }) {
  return (
    <section className="copyright-panel">
      <div className="copyright-panel-head">
        <ShieldCheck size={18} />
        <div>
          <h3>Copyright clearance</h3>
          <p>Every upload is consent-logged and scanned before public publishing.</p>
        </div>
      </div>
      <label>Rights owner or license holder<input value={form.rights_owner} onChange={(e) => update("rights_owner", e.target.value)} placeholder="e.g. Artist name / label entity" /></label>
      <label className="check-line">
        <input type="checkbox" checked={form.rights_confirmed} onChange={(e) => update("rights_confirmed", e.target.checked)} />
        <span>I confirm I own the rights to this audio or have a valid license to publish, share and sell it on Undiscover.</span>
      </label>
      <div className="scan-policy-grid">
        <span><b>{config?.provider || "off"}</b> scan provider</span>
        <span><b>{config?.review_threshold || 45}%</b> review threshold</span>
        <span><b>{config?.block_threshold || 80}%</b> auto-block threshold</span>
      </div>
      <p className="copyright-note">For production, set COPYRIGHT_SCAN_PROVIDER to AudD or ACRCloud and keep the takedown address active: {config?.takedown_email || "copyright@undisc0ver.com"}.</p>
    </section>
  );
}

function TakedownReportForm({ release, notify }) {
  const [form, setForm] = useState({ reporter_name: "", reporter_email: "", rights_owner: "", reason: "", evidence_url: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      await request(`/releases/${release.id}/report`, { method: "POST", body: JSON.stringify(form) });
      setStatus("Report received. This release has been moved to review.");
      notify("Copyright report received.");
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="takedown-form" onSubmit={submit}>
      <div>
        <h3>Copyright takedown request</h3>
        <p>Use this form if you represent the rights holder for this release.</p>
      </div>
      <div className="form-grid">
        <label>Your name<input value={form.reporter_name} onChange={(e) => update("reporter_name", e.target.value)} required /></label>
        <label>Email<input type="email" value={form.reporter_email} onChange={(e) => update("reporter_email", e.target.value)} required /></label>
      </div>
      <label>Rights owner<input value={form.rights_owner} onChange={(e) => update("rights_owner", e.target.value)} required /></label>
      <label>Evidence URL<input value={form.evidence_url} onChange={(e) => update("evidence_url", e.target.value)} placeholder="https://..." /></label>
      <label>Reason<textarea value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="Describe the claim and the protected work." required /></label>
      {error && <p className="error">{error}</p>}
      {status && <p className="success-text">{status}</p>}
      <button className="button accent" type="submit"><ShieldAlert size={16} /> Submit takedown</button>
    </form>
  );
}

function FileUploadPanel({ file, setFile, notify }) {
  const fileInputId = useId();
  const [progress, setProgress] = useState(0);
  const readableSize = file ? `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(1)} MB` : "";
  useEffect(() => {
    if (!file) {
      setProgress(0);
      return undefined;
    }
    setProgress(18);
    const steps = [36, 58, 77, 100];
    const timers = steps.map((value, index) => setTimeout(() => setProgress(value), 260 * (index + 1)));
    return () => timers.forEach(clearTimeout);
  }, [file]);
  return (
    <section className="file-upload-card">
      <h3>Audio file upload</h3>
      <label className="file-dropzone" htmlFor={fileInputId}>
        <Upload size={26} />
        <span>Drag and drop or choose file to upload</span>
        <input id={fileInputId} type="file" accept=".wav,.mp3,.aiff,.aif,audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      <p>Recommended max. size: 500 MB. Accepted file types: WAV, MP3, AIFF.</p>
      {file ? (
        <div className="uploaded-file transfer-item">
          <span>{progress < 100 ? <Loader2 className="spin" size={20} /> : <File size={20} />}</span>
          <div>
            <strong>{file.name}</strong>
            <small>{readableSize} - {progress < 100 ? "Processing audio" : "Ready"}</small>
            <i className="transfer-progress"><b style={{ width: `${progress}%` }} /></i>
          </div>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove file"><Trash size={16} /></button>
        </div>
      ) : (
        <div className="uploaded-file muted-file">
          <span><FileSpreadsheet size={20} /></span>
          <div><strong>No audio selected</strong><small>Choose a WAV, MP3 or AIFF file to attach to this release.</small></div>
          <button type="button" onClick={() => notify("Choose an audio file to continue.")} aria-label="No file selected"><X size={16} /></button>
        </div>
      )}
    </section>
  );
}

async function editImageFile(file, options) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const width = Math.max(64, Number(options.width) || image.naturalWidth);
    const height = Math.max(64, Number(options.height) || image.naturalHeight);
    const zoom = Math.max(.2, Number(options.zoom) || 1);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (width - drawWidth) / 2 + (Number(options.offsetX) || 0);
    const y = (height - drawHeight) / 2 + (Number(options.offsetY) || 0);
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .92));
    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}-${width}x${height}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function ImageUploadPanel({ file, setFile, title = "Image upload", text = "Upload a JPG, PNG or WebP image.", defaultWidth = 1200, defaultHeight = 1200 }) {
  const fileInputId = useId();
  const [sourceFile, setSourceFile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState({ width: defaultWidth, height: defaultHeight, zoom: 1, offsetX: 0, offsetY: 0 });
  const preview = file ? URL.createObjectURL(file) : "";
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const chooseFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setSourceFile(nextFile);
    setFile(nextFile);
    setEditing(!!nextFile);
    setSettings({ width: defaultWidth, height: defaultHeight, zoom: 1, offsetX: 0, offsetY: 0 });
  };
  const applyEdit = async () => {
    if (!sourceFile && !file) return;
    setBusy(true);
    try {
      setFile(await editImageFile(sourceFile || file, settings));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };
  const removeImage = () => {
    setSourceFile(null);
    setFile(null);
    setEditing(false);
  };
  return (
    <section className="file-upload-card image-upload-card">
      <h3>{title}</h3>
      <label className="file-dropzone image-dropzone" htmlFor={fileInputId}>
        {preview ? <img src={preview} alt="" /> : <Upload size={24} />}
        <span>{file ? file.name : text}</span>
        <input id={fileInputId} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseFile} />
      </label>
      {file && editing && (
        <div className="image-edit-controls">
          <label>Width<input type="number" min="64" max="4000" value={settings.width} onChange={(e) => updateSetting("width", e.target.value)} /></label>
          <label>Height<input type="number" min="64" max="4000" value={settings.height} onChange={(e) => updateSetting("height", e.target.value)} /></label>
          <label>Zoom<input type="range" min=".5" max="3" step=".05" value={settings.zoom} onChange={(e) => updateSetting("zoom", e.target.value)} /></label>
          <label>X<input type="number" value={settings.offsetX} onChange={(e) => updateSetting("offsetX", e.target.value)} /></label>
          <label>Y<input type="number" value={settings.offsetY} onChange={(e) => updateSetting("offsetY", e.target.value)} /></label>
          <button className="button accent" type="button" onClick={applyEdit} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Settings size={16} />} Apply resize</button>
        </div>
      )}
      {file && <button className="button ghost" type="button" onClick={removeImage}><Trash size={16} /> Remove image</button>}
    </section>
  );
}

function PricingPage({ notify }) {
  return (
    <main className="page">
      <PageHeader eyebrow="Pricing" title="Pricing based on your success." text="Simple plans for artists who want to publish, sell and measure their releases without a heavy platform stack." />
      <section className="pricing-section">
        <div className="pricing-intro">
          <span className="outline-tag">Pricing</span>
          <h2>One yard. Two ways to grow.</h2>
          <p>Start free, then upgrade when your catalog needs pro tools, advanced analytics and payout acceleration.</p>
        </div>
        <div className="pricing-card">
          <Plus className="corner top-left" size={20} />
          <Plus className="corner top-right" size={20} />
          <Plus className="corner bottom-left" size={20} />
          <Plus className="corner bottom-right" size={20} />
          <article>
            <div className="plan-head"><h3>Monthly</h3><span><s>9 EUR</s><b>11% off</b></span></div>
            <p>Best value for artists testing a release cycle.</p>
            <div className="price-line"><small>EUR</small><strong>7.99</strong><span>/month</span></div>
            <a className="button ghost" href="#/checkout">Start Your Journey</a>
          </article>
          <article className="featured-plan">
            <span className="border-trail" />
            <div className="plan-head"><h3>Yearly</h3><span><s>9 EUR</s><b>22% off</b></span></div>
            <p>Unlock savings with an annual commitment.</p>
            <div className="price-line"><small>EUR</small><strong>6.99</strong><span>/month</span></div>
            <a className="button accent" href="#/checkout">Get Started Now</a>
          </article>
        </div>
        <p className="secure-note"><ShieldCheck size={16} /> Access to all release tools with no hidden fees.</p>
      </section>
      <EightBitCTA />
      <CompareTable />
      <FAQAccordion />
    </main>
  );
}

function EightBitCTA() {
  const rows = [
    { feature: "Setup time", yours: "2 minutes", theirs: "2 hours" },
    { feature: "Artist storefront", yours: "+ Direct", theirs: "- Buried" },
    { feature: "Dubpack sales", yours: "+ Built-in", theirs: "- Workaround" },
    { feature: "Free gates", yours: "+ Native", theirs: "- Manual" },
    { feature: "Payout signal", yours: "+ Clear", theirs: "- Noisy" },
    { feature: "Middleman energy", yours: "LOW", theirs: "MAX" }
  ];
  return (
    <section className="eightbit-cta">
      <div className="eightbit-head">
        <h2>Why Undiscover?</h2>
        <p>Side-by-side. No fluff.</p>
      </div>
      <div className="eightbit-card">
        <div className="eightbit-row eightbit-header">
          <span>Feature</span>
          <b>Undiscover</b>
          <b>Others</b>
        </div>
        {rows.map((row) => (
          <div className="eightbit-row" key={row.feature}>
            <span>{row.feature}</span>
            <strong>{row.yours}</strong>
            <em>{row.theirs}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareTable() {
  const features = [
    { name: "Public artist profile", included: "starter" },
    { name: "Upload tracks and EPs", included: "starter" },
    { name: "Free download gates", included: "starter" },
    { name: "Advanced analytics", included: "pro" },
    { name: "Dubpack storefront", included: "pro" },
    { name: "Priority support", included: "pro" },
    { name: "Custom checkout notes", included: "all" },
    { name: "Unlimited catalog", included: "all" },
    { name: "Fast payout queue", included: "all" }
  ];
  const plans = [
    { name: "Free", level: "starter" },
    { name: "Pro", level: "pro" },
    { name: "Label", level: "all" }
  ];
  const shouldShowCheck = (included, level) => {
    if (included === "all") return true;
    if (included === "pro" && (level === "pro" || level === "all")) return true;
    return included === "starter" && (level === "starter" || level === "pro" || level === "all");
  };
  return (
    <section className="compare-section">
      <SectionTitle title="Compare plans" />
      <div className="compare-table">
        <div className="compare-row compare-head">
          <span>Features</span>
          {plans.map((plan) => <b key={plan.level}>{plan.name}</b>)}
        </div>
        {features.map((feature) => (
          <div className="compare-row" key={feature.name}>
            <span>{feature.name}</span>
            {plans.map((plan) => (
              <i key={plan.level}>{shouldShowCheck(feature.included, plan.level) ? <Check size={18} /> : "-"}</i>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQAccordion() {
  const [open, setOpen] = useState("item-1");
  const items = [
    {
      icon: Package,
      title: "How do I publish a release?",
      content: "Create an artist account, open Upload, add your audio metadata and choose free, fixed price or gated download. The release appears after rights checks pass."
    },
    {
      icon: RefreshCw,
      title: "Can I update pricing after upload?",
      content: "Yes. Pricing and catalog settings are managed from the dashboard/settings flow."
    },
    {
      icon: HeadsetIcon,
      title: "How do artists get support?",
      content: "Use the account menu, the footer support links, or live chat. Undiscover keeps support focused on catalog, checkout and payout questions."
    }
  ];
  return (
    <section className="faq-section">
      <SectionTitle title="FAQ" />
      <div className="accordion">
        {items.map((item, index) => {
          const id = `item-${index + 1}`;
          const Icon = item.icon;
          const isOpen = open === id;
          return (
            <article className={isOpen ? "accordion-item open" : "accordion-item"} key={item.title}>
              <button onClick={() => setOpen(isOpen ? "" : id)}>
                <span><Icon size={17} /> {item.title}</span>
                <ChevronDown size={17} />
              </button>
              {isOpen && <p>{item.content}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CheckoutPage({ notify, query }) {
  const releaseId = new URLSearchParams(query || "").get("release");
  return (
    <main className="page checkout-page">
      <PageHeader eyebrow="Checkout" title="Complete your Undiscover purchase." text="Complete a paid release or subscription checkout." />
      <PaymentForm notify={notify} releaseId={releaseId} />
    </main>
  );
}

function PaymentForm({ notify, releaseId }) {
  const [form, setForm] = useState({ name: "", card: "", expiry: "", cvv: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (releaseId) await request(`/releases/${releaseId}/buy`, { method: "POST" });
    notify("Checkout completed.");
    location.hash = "#/dashboard";
  };
  return (
    <form className="payment-card" onSubmit={submit}>
      <div className="payment-options">
        <button type="button" onClick={() => notify("PayPal selected.")}>PayPal</button>
        <button type="button" onClick={() => notify("Apple Pay selected.")}>Apple Pay</button>
        <button type="button" onClick={() => notify("Google Pay selected.")}>G Pay</button>
      </div>
      <div className="payment-separator"><span>or pay using credit card</span></div>
      <label>Card holder full name<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Enter your full name" required /></label>
      <label>Card Number<input value={form.card} onChange={(e) => update("card", e.target.value)} placeholder="0000 0000 0000 0000" inputMode="numeric" required /></label>
      <div className="form-grid">
        <label>Expiry Date<input value={form.expiry} onChange={(e) => update("expiry", e.target.value)} placeholder="01/28" required /></label>
        <label>CVV<input value={form.cvv} onChange={(e) => update("cvv", e.target.value)} placeholder="CVV" inputMode="numeric" type="password" required /></label>
      </div>
      <button className="button accent" type="submit"><CreditCard size={17} /> Checkout</button>
    </form>
  );
}

function SettingsPage({ notify }) {
  const auth = useAuth();
  const { user } = auth;
  const plans = [
    { name: "Creator", price: "0 EUR", features: ["Public artist profile", "3 active releases", "Community support"] },
    { name: "Pro", price: "7.99 EUR", recommended: true, features: ["Unlimited releases", "Advanced analytics", "Fast payout queue"] },
    { name: "Label", price: "29 EUR", features: ["Multiple artists", "Client portal", "Priority support"] }
  ];
  const [selected, setSelected] = useState("Pro");
  const socialLinks = (() => { try { return JSON.parse(user?.social_links || "{}"); } catch { return {}; } })();
  const [profile, setProfile] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    location: user?.location || "",
    genre: user?.genre || "Tech House",
    bio: user?.bio || "",
    avatar_url: user?.avatar_url || "",
    logo_url: user?.logo_url || "",
    banner_url: user?.banner_url || "",
    artist_slug: user?.artist_slug || "",
    workspace_visibility: user?.workspace_visibility || "public",
    instagram: socialLinks.instagram || "",
    soundcloud: socialLinks.soundcloud || "",
    spotify: socialLinks.spotify || "",
    website: socialLinks.website || ""
  }));
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  if (!user) return <AuthRequired />;
  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: key === "artist_slug" ? normalizeArtistSlug(value) : value }));
  const profilePreviewUrl = `https://undisc0ver.com/artist/${profile.artist_slug || user.id}`;
  const submit = async (event) => {
    event.preventDefault();
    const logo = logoFile ? await uploadImage(logoFile) : null;
    const banner = bannerFile ? await uploadImage(bannerFile) : null;
    await request("/me/settings", {
      method: "PATCH",
      body: JSON.stringify({
        ...profile,
        logo_url: logo?.url || profile.logo_url,
        avatar_url: logo?.url || profile.avatar_url,
        banner_url: banner?.url || profile.banner_url
      })
    });
    await auth.loginWithToken(localStorage.getItem("undiscover_token"));
    notify("Settings saved.");
  };
  return (
    <main className="page settings-page">
      <PageHeader eyebrow="Settings" title="Tune your artist workspace." text="Account preferences for profile, catalog behavior, notifications and plan selection." />
      <form className="settings-form" onSubmit={submit}>
        <section className="settings-block">
          <div><h2>Personal information</h2><p>Update the public-facing artist identity used across Undiscover.</p></div>
          <div className="settings-fields">
            <label>Artist name<input value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} /></label>
            <label>Email<input type="email" value={profile.email} onChange={(e) => updateProfile("email", e.target.value)} /></label>
            <label>Location<input value={profile.location} onChange={(e) => updateProfile("location", e.target.value)} /></label>
            <label>Genre<select value={profile.genre} onChange={(e) => updateProfile("genre", e.target.value)}><option>Tech House</option><option>Techno</option><option>Melodic</option><option>Afro House</option><option>Drum & Bass</option><option>Hard Techno</option><option>Riddim</option><option>Dubstep</option></select></label>
            <label>Custom profile link<input value={profile.artist_slug} onChange={(e) => updateProfile("artist_slug", e.target.value)} placeholder="chamber" /><small>{profilePreviewUrl}</small></label>
            <label>Role<input defaultValue="Artist owner" disabled /></label>
          </div>
        </section>
        <section className="settings-block">
          <div><h2>Brand assets</h2><p>Set your public logo/profile picture and banner.</p></div>
          <div className="settings-fields">
            <ImageUploadPanel file={logoFile} setFile={setLogoFile} title="Logo / profile picture" text="Upload your artist logo or profile picture." defaultWidth={800} defaultHeight={800} />
            <ImageUploadPanel file={bannerFile} setFile={setBannerFile} title="Banner" text="Upload a wide banner for your artist page." defaultWidth={1920} defaultHeight={640} />
            <label>Logo URL<input value={profile.logo_url} onChange={(e) => updateProfile("logo_url", e.target.value)} placeholder="https://..." /></label>
            <label>Banner URL<input value={profile.banner_url} onChange={(e) => updateProfile("banner_url", e.target.value)} placeholder="https://..." /></label>
          </div>
        </section>
        <section className="settings-block">
          <div><h2>Workspace settings</h2><p>Control how your catalog appears to listeners, DJs and promoters.</p></div>
          <div className="settings-fields">
            <label>Visibility<select value={profile.workspace_visibility} onChange={(e) => updateProfile("workspace_visibility", e.target.value)}><option value="public">Public</option><option value="private">Private</option></select></label>
            <label className="full">Bio<textarea value={profile.bio} onChange={(e) => updateProfile("bio", e.target.value)} /></label>
            <label>Instagram<input value={profile.instagram} onChange={(e) => updateProfile("instagram", e.target.value)} placeholder="https://instagram.com/..." /></label>
            <label>SoundCloud<input value={profile.soundcloud} onChange={(e) => updateProfile("soundcloud", e.target.value)} placeholder="https://soundcloud.com/..." /></label>
            <label>Spotify<input value={profile.spotify} onChange={(e) => updateProfile("spotify", e.target.value)} placeholder="https://open.spotify.com/..." /></label>
            <label>Website<input value={profile.website} onChange={(e) => updateProfile("website", e.target.value)} placeholder="https://..." /></label>
          </div>
        </section>
        <section className="settings-block">
          <div><h2>Plan type</h2><p>Select the plan that matches your release cycle.</p></div>
          <div className="plan-options">
            {plans.map((plan) => (
              <button type="button" className={selected === plan.name ? "plan-option selected" : "plan-option"} key={plan.name} onClick={() => setSelected(plan.name)}>
                <span><strong>{plan.name}</strong>{plan.recommended && <em>recommended</em>}</span>
                <ul>{plan.features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}</ul>
                <b>{plan.price}<small>/mo</small></b>
              </button>
            ))}
          </div>
        </section>
        <aside className="settings-highlight">
          <h2>Why artists use Undiscover</h2>
          {["Direct checkout and free gates", "Catalog analytics without noise", "Release pages made for sharing"].map((feature) => (
            <p key={feature}><CircleCheck size={18} /> {feature}</p>
          ))}
          <a href="#/pricing">Learn more <ExternalLink size={15} /></a>
        </aside>
        <div className="settings-actions">
          <a className="button ghost" href="#/dashboard">Cancel</a>
          <button className="button accent" type="submit">Save settings</button>
        </div>
      </form>
    </main>
  );
}

function DashboardSidebar({ section }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const main = [
    { href: "#/dashboard", label: "Overview", icon: HomeIcon, id: "overview" },
    { href: "#/catalog", label: "Catalog", icon: Package, id: "catalog" },
    { href: "#/analytics", label: "Analytics", icon: BarChart3, id: "analytics" },
    { href: "#/payouts", label: "Payouts", icon: Wallet, id: "payouts" }
  ];
  const tools = [
    { href: "#/upload", label: "Upload release", icon: Upload },
    { href: "#/settings", label: "Settings", icon: Settings },
    { href: "#/pricing", label: "Plans", icon: CreditCard },
    ...(["staff", "moderator", "admin"].includes(user?.role) ? [{ href: "#/staff", label: "Staff panel", icon: ShieldCheck }] : [])
  ];
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-head">
        <Logo />
        <span>artist console</span>
      </div>
      <nav>
        {main.map((item) => {
          const Icon = item.icon;
          return <a key={item.id} className={section === item.id ? "active" : ""} href={item.href}><Icon size={17} /> {item.label}</a>;
        })}
      </nav>
      <button className="sidebar-menu-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        <span><BookOpen size={17} /> Workflow</span><ChevronDown size={16} className={open ? "up" : ""} />
      </button>
      {open && (
        <nav className="sidebar-submenu">
          {tools.map((item) => {
            const Icon = item.icon;
            return <a key={item.href} href={item.href}><Icon size={16} /> {item.label}</a>;
          })}
        </nav>
      )}
      <div className="sidebar-footer">
        <a href="#/explore"><LifeBuoy size={16} /> Help center</a>
        <a href="#/settings"><CircleUserRound size={16} /> Profile</a>
      </div>
    </aside>
  );
}

function LinkShortenerWidget({ notify }) {
  const siteOrigin = "https://undisc0ver.com";
  const [longLink, setLongLink] = useState(`${siteOrigin}/release/your-release-id?utm=club`);
  const [shortLink, setShortLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const shorten = async () => {
    setError("");
    setCopied(false);
    if (!longLink.trim()) return setError("Ajoute un lien a raccourcir.");
    try {
      new URL(longLink);
    } catch {
      return setError("URL invalide. Exemple: https://undisc0ver.com/release/id");
    }
    setLoading(true);
    try {
      const data = await request("/short-links", { method: "POST", body: JSON.stringify({ url: longLink }) });
      setShortLink(data.short_url);
      notify("Short link generated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const copy = async () => {
    if (!shortLink) return;
    await navigator.clipboard?.writeText(shortLink).catch(() => {});
    setCopied(true);
    notify("Short link copied.");
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className="link-shortener-card">
      <div className="link-shortener-head">
        <LinkIcon size={22} />
        <div>
          <h2>Share link shortener</h2>
          <p>Prepare compact release links for stories, bios and DJ promo sends.</p>
        </div>
      </div>
      <label>Long release URL<input value={longLink} onChange={(event) => setLongLink(event.target.value)} placeholder="https://releaseyrd.com/..." /></label>
      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button className="button accent" type="button" onClick={shorten} disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : <LinkIcon size={16} />} Shorten</button>
        <button className="button ghost" type="button" onClick={() => { setLongLink(""); setShortLink(""); setError(""); }}><RefreshCw size={16} /> Reset</button>
      </div>
      <AnimatePresence>
        {shortLink && (
          <motion.div className="short-link-result" initial={{ opacity: 0, y: 10, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>
            <span>{shortLink}</span>
            <button type="button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ProfileLinkEditor({ user, notify }) {
  const auth = useAuth();
  const [slug, setSlug] = useState(user.artist_slug || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const socialLinks = (() => { try { return JSON.parse(user.social_links || "{}"); } catch { return {}; } })();
  const preview = `https://undisc0ver.com/artist/${slug || user.id}`;
  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await request("/me/settings", {
        method: "PATCH",
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          location: user.location,
          bio: user.bio,
          genre: user.genre,
          avatar_url: user.avatar_url,
          logo_url: user.logo_url,
          banner_url: user.banner_url,
          workspace_visibility: user.workspace_visibility,
          instagram: socialLinks.instagram || "",
          soundcloud: socialLinks.soundcloud || "",
          spotify: socialLinks.spotify || "",
          website: socialLinks.website || "",
          artist_slug: slug
        })
      });
      await auth.loginWithToken(localStorage.getItem("undiscover_token"));
      notify("Profile link saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(preview).catch(() => {});
    notify("Profile link copied.");
  };
  return (
    <section className="profile-link-card">
      <div className="link-shortener-head">
        <CircleUserRound size={22} />
        <div>
          <h2>Clean profile link</h2>
          <p>Set a short public artist URL for bios, promos and stories.</p>
        </div>
      </div>
      <label>Artist URL<input value={slug} onChange={(event) => setSlug(normalizeArtistSlug(event.target.value))} placeholder="chamber" /></label>
      <div className="short-link-result always-visible">
        <span>{preview}</span>
        <button type="button" onClick={copy}><Copy size={16} /> Copy</button>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="button accent" type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Save link</button>
    </section>
  );
}

function DashboardHero({ user, stats }) {
  return (
    <section className="dashboard-hero">
      <div>
        <p className="label">{user.name} - verified artist</p>
        <h1>Good evening, {user.name.split(" ")[0]}</h1>
        <p>Manage releases, revenue, downloads and direct audience signals from a clean full-screen workspace.</p>
        <div className="dashboard-hero-actions">
          <a className="button accent" href="#/upload"><Upload size={16} /> New release</a>
          <a className="button ghost" href={artistPath(user)}><CircleUserRound size={16} /> View profile</a>
        </div>
      </div>
      <aside>
        <BrandMark className="mini-icon" label="Undiscover" />
        <small>Available balance</small>
        <strong>{money(stats.revenue)}</strong>
        <em>+18% vs last week</em>
      </aside>
    </section>
  );
}

function Dashboard({ section, notify, playRelease }) {
  const { user } = useAuth();
  const { data, loading, error } = useData("/dashboard", [user?.id]);
  if (!user) return <AuthRequired />;
  if (loading) return <main className="page"><SkeletonList /></main>;
  if (error) return <ErrorPage message={error} />;
  const { stats, releases } = data;
  const topRelease = [...releases].sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0))[0];
  const paidReleases = releases.filter((release) => !release.free).length;
  const freeReleases = releases.length - paidReleases;
  return (
    <main className="page dashboard-page">
      <div className="dashboard-shell">
        <DashboardSidebar section={section} />
        <div className="dashboard-content">
          <DashboardHero user={user} stats={stats} />
          <section className="dashboard-kpi-grid">
            <Metric icon={<Wallet />} label="Revenue" value={money(stats.revenue)} delta={`${shortNumber(stats.sales || 0)} sales`} />
            <Metric icon={<BarChart3 />} label="Plays" value={shortNumber(stats.plays)} delta={`${shortNumber(releases.length)} releases`} />
            <Metric icon={<ArrowDownToLine />} label="Downloads" value={shortNumber(stats.downloads)} delta={`${shortNumber(stats.comments || 0)} comments`} />
            <Metric icon={<UserPlus />} label="Followers" value={shortNumber(stats.followers)} delta="live count" />
          </section>
          {section === "overview" && (
            <>
              <section className="dashboard-command-grid">
                <DashboardInsight title="Top signal" icon={WifiIcon} value={topRelease?.title || "No release yet"} text={topRelease ? `${shortNumber(topRelease.plays)} plays, ${shortNumber(topRelease.downloads)} downloads and ${money(topRelease.revenue_cents || 0)} tracked.` : "Upload your first release to unlock signal."} href="#/analytics" action="Open analytics" />
                <DashboardInsight title="Catalog health" icon={ShieldCheck} value={`${releases.length} live drops`} text={`${freeReleases} free gate(s), ${paidReleases} paid release(s), rights checks active.`} href="#/catalog" action="Review catalog" />
              </section>
              <div className="dashboard-overview-grid">
                <ProfileLinkEditor user={user} notify={notify} />
                <LinkShortenerWidget notify={notify} />
                <RevenueBars releases={releases} />
              </div>
            </>
          )}
          {section === "catalog" && (
            <>
              <CopyrightConsole releases={releases} />
              <ReleaseRows releases={releases} notify={notify} playRelease={playRelease} showModeration />
            </>
          )}
          {section === "analytics" && <Analytics releases={releases} stats={stats} />}
          {section === "payouts" && <Payouts stats={stats} notify={notify} />}
        </div>
      </div>
    </main>
  );
}

function CopyrightConsole({ releases }) {
  const reviewCount = releases.filter((release) => release.moderation_status === "review").length;
  const blockedCount = releases.filter((release) => release.moderation_status === "blocked").length;
  const clearCount = releases.filter((release) => release.moderation_status === "published").length;
  return (
    <section className="copyright-console">
      <div>
        <p className="label">Copyright center</p>
        <h2>Rights checks and takedowns</h2>
        <p>Uploads are consent-logged, scanned by the configured provider, and moved out of public pages when a match or report needs review.</p>
      </div>
      <div className="copyright-console-stats">
        <span><b>{clearCount}</b> published</span>
        <span><b>{reviewCount}</b> in review</span>
        <span><b>{blockedCount}</b> blocked</span>
      </div>
    </section>
  );
}

function GoogleAuthCallback({ query, notify }) {
  const auth = useAuth();
  const [message, setMessage] = useState("Connexion Google en cours...");

  useEffect(() => {
    const params = new URLSearchParams(query || "");
    const token = params.get("token");
    const error = params.get("error");
    if (error) {
      setMessage(error);
      notify(error);
      return;
    }
    if (!token) {
      setMessage("Google auth did not return a token.");
      return;
    }
    auth.loginWithToken(token)
      .then(() => {
        notify("Logged in with Google.");
        location.hash = "#/dashboard";
      })
      .catch((err) => {
        localStorage.removeItem("undiscover_token");
        setMessage(err.message || "Google login failed.");
      });
  }, [query]);

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-card">
          <Logo />
          <div className="auth-title">
            <h1>Google login</h1>
            <p>{message}</p>
          </div>
          <a className="button ghost" href="#/login">Back to login</a>
        </div>
      </section>
      <section className="auth-visual">
        <div className="auth-mark"><BrandMark label="Undiscover" /><span>Undiscover</span></div>
      </section>
    </main>
  );
}

function AuthPage({ mode, notify }) {
  const auth = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", genre: "Tech House" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") await auth.login(form.email, form.password);
      else await auth.register(form);
      notify(mode === "login" ? "Logged in." : "Account created.");
      location.hash = "#/dashboard";
    } catch (err) {
      setError(err.message);
    }
  };
  const isLogin = mode === "login";
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Logo />
        <form className="auth-card" onSubmit={submit} autoComplete="on">
          <div className="auth-title">
            <h1>{isLogin ? "Sign in to your account" : "Create an account"}</h1>
            <p>{isLogin ? "Enter your email below to sign in" : "Enter your details below to sign up"}</p>
          </div>
          {mode === "register" && <label>Artist name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your artist name" required autoComplete="name" /></label>}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="m@example.com" required autoComplete="email" /></label>
          <label>
            Password
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" required autoComplete={isLogin ? "current-password" : "new-password"} />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {mode === "register" && <label>Genre<select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}><option>Tech House</option><option>Techno</option><option>Melodic</option><option>Afro House</option><option>Drum & Bass</option><option>Hard Techno</option><option>Riddim</option><option>Dubstep</option></select></label>}
          {error && <p className="error">{error}</p>}
          <button className="button auth-submit" type="submit">{isLogin ? "Sign In" : "Sign Up"}</button>
          <p className="auth-toggle">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            {" "}
            <a href={isLogin ? "#/register" : "#/login"}>{isLogin ? "Sign up" : "Sign in"}</a>
          </p>
          <div className="auth-separator"><span>Or continue with</span></div>
          <button className="button google-button" type="button" onClick={() => { location.href = "/api/auth/google/start"; }}>
            <span>G</span>
            Continue with Google
          </button>
        </form>
      </section>
      <section className="auth-visual">
        <div className="auth-mark">
          <BrandMark label="Undiscover" />
          <CrateMark />
        </div>
        <blockquote>
          <p>
            "<Typewriter
              key={mode}
              text={isLogin ? "Welcome back. The yard is still open." : "Create an account. Ship your next release."}
            />"
          </p>
          <cite>Undiscover</cite>
        </blockquote>
      </section>
    </main>
  );
}

function ReleaseRows({ releases, notify, playRelease, ranked = false, showModeration = false }) {
  return <div className="release-rows">{releases.map((release, index) => <ReleaseRow key={release.id} release={release} index={index} notify={notify} playRelease={playRelease} ranked={ranked} showModeration={showModeration} />)}</div>;
}

function ReleaseRow({ release, index, notify, playRelease, ranked, showModeration }) {
  return (
    <article className="release-row">
      {ranked && <span className="rank">{index + 1}</span>}
      <button className="play" onClick={() => playRelease(release)} aria-label={`Play ${release.title}`}><Play size={14} fill="currentColor" /></button>
      <span className={`avatar ${release.color}`}>{release.avatar}</span>
      <a className="release-main" href={`#/release/${release.id}`}><strong>{release.title}</strong><span>{release.artist} - {release.genre} - {release.duration}</span></a>
      {showModeration && <ModerationBadge release={release} />}
      <span className={release.free ? "price free" : "price"}>{money(release.price_cents)}</span>
      <small>{shortNumber(release.plays)}</small>
    </article>
  );
}

function ModerationBadge({ release }) {
  const status = release.moderation_status || "published";
  const label = status === "blocked" ? "Blocked" : status === "review" ? "In review" : "Published";
  return (
    <span className={`moderation-badge ${status}`}>
      {label}
      {release.scan_score ? <small>{release.scan_score}%</small> : null}
    </span>
  );
}

function ReleaseGrid({ releases, notify, playRelease }) {
  return <div className="release-grid">{releases.map((release) => <ReleaseCard key={release.id} release={release} notify={notify} playRelease={playRelease} />)}</div>;
}

function ReleaseCard({ release, notify, playRelease }) {
  return (
    <article className="card release-card">
      <PackArtwork release={release} />
      <p className="label">{release.kind} - {release.genre}</p>
      <h2><a href={`#/release/${release.id}`}>{release.title}</a></h2>
      <p className="muted">{release.artist} - {release.tracks} track(s)</p>
      <div className="button-row"><button className="button ghost" type="button" onClick={() => playRelease(release)}><Play size={16} fill="currentColor" /> Play</button><SplitPreviewButton href={`#/release/${release.id}`} />{release.free ? <DownloadButton release={release} notify={notify} compact /> : <BuyButton release={release} notify={notify} compact />}</div>
    </article>
  );
}

function SplitPreviewButton({ href }) {
  return (
    <span className="split-button">
      <a href={href}>Preview</a>
      <a href={href} aria-label="Open release"><SquareArrowOutUpRight size={16} /></a>
    </span>
  );
}

function PackCard({ release }) {
  return (
    <a className="pack-card" href={`#/release/${release.id}`}>
      <PackArtwork release={release} />
      <strong>{release.title}</strong>
      <span>{release.artist} - {release.tracks} tracks</span>
      <b>{money(release.price_cents)}</b>
    </a>
  );
}

function PackArtwork({ release, large = false }) {
  return (
    <div className={`pack-art ${release.color || "green"} ${large ? "large" : ""}`}>
      {release.cover_url ? <img src={release.cover_url} alt="" /> : <CrateMark />}
    </div>
  );
}

function gateActionLabel(action) {
  return DOWNLOAD_GATE_ACTIONS.find((item) => item.id === action)?.label || action;
}

function gateActionTitle(action) {
  return DOWNLOAD_GATE_ACTIONS.find((item) => item.id === action)?.title || gateActionLabel(action);
}

function GateActionIcon({ action, size = 16 }) {
  if (action === "follow") return <UserPlus size={size} />;
  if (action === "like") return <Heart size={size} />;
  if (action === "share") return <ExternalLink size={size} />;
  if (action === "comment") return <MessageCircle size={size} />;
  return <ShieldCheck size={size} />;
}

function LikeButton({ release, notify }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(release.likes || 0);
  const click = async () => {
    if (!user) return location.hash = "#/login";
    const data = await request(`/releases/${release.id}/like`, { method: "POST" });
    setLikes(data.likes);
    notify(data.liked ? "Added to liked releases." : "Removed from liked releases.");
  };
  return <button className="button ghost" onClick={click}><Heart size={16} /> {likes}</button>;
}

function ReleaseDownloadGate({ release, notify }) {
  const { user } = useAuth();
  const { data, loading } = useData(user ? `/releases/${release.id}/gate` : "/health", [release.id, user?.id]);
  if (!release.download_enabled) return <div className="download-disabled"><ShieldCheck size={16} /> Download disabled by artist. Streaming and release page stay public.</div>;
  if (!user) return <a className="button accent" href="#/login"><ArrowDownToLine size={16} /> Login to unlock download</a>;
  if (loading) return <button className="button ghost" disabled><Loader2 className="spin" size={16} /> Checking gate...</button>;
  const required = data?.required || [];
  const done = data?.done || [];
  if (!required.length || data?.unlocked) return <DownloadButton release={release} notify={notify} />;
  return <DownloadGateChecklist release={release} required={required} done={done} notify={notify} />;
}

function DownloadGateChecklist({ release, required, done, notify }) {
  const [state, setState] = useState({ done, comment: "", busy: "" });
  useEffect(() => {
    setState((current) => ({ ...current, done }));
  }, [done]);
  const complete = async (action) => {
    try {
      setState((current) => ({ ...current, busy: action }));
      if (action === "share") {
        const shareUrl = `https://undisc0ver.com/release/${release.id}`;
        if (navigator.share) {
          await navigator.share({ title: release.title, text: `Listen to ${release.title} on Undiscover`, url: shareUrl });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          notify("Release link copied.");
        }
      }
      const data = await request(`/releases/${release.id}/gate-action`, { method: "POST", body: JSON.stringify({ action, note: state.comment }) });
      setState((current) => ({ ...current, done: data.done, busy: "", comment: action === "comment" ? "" : current.comment }));
      notify(`${gateActionLabel(action)} completed.`);
    } catch (err) {
      setState((current) => ({ ...current, busy: "" }));
      notify(err.message);
    }
  };
  const isDone = (action) => state.done.includes(action);
  const allDone = required.every(isDone);
  return (
    <section className="download-gate-panel">
      <div className="gate-builder-head">
        <div>
          <span className="eyebrow">Download gateway</span>
          <h3>Unlock WAV download</h3>
          <p>Complete {required.length} selected action{required.length > 1 ? "s" : ""} to open the download.</p>
        </div>
        <strong>{state.done.length}/{required.length}</strong>
      </div>
      <div className="gate-check-list">
        {required.map((action) => (
          <button key={action} type="button" className={isDone(action) ? "done" : ""} disabled={isDone(action) || state.busy === action} onClick={() => complete(action)}>
            <GateActionIcon action={action} />
            <span>
              <b>{gateActionTitle(action)}</b>
              <small>{isDone(action) ? "Completed" : action === "share" ? "Copy/share the release link" : "Required before download"}</small>
            </span>
            {state.busy === action ? <Loader2 className="spin" size={16} /> : isDone(action) ? <Check size={16} /> : <ArrowRight size={16} />}
          </button>
        ))}
      </div>
      {required.includes("comment") && !isDone("comment") && <textarea value={state.comment} onChange={(e) => setState((current) => ({ ...current, comment: e.target.value }))} placeholder="Leave a quick comment before unlocking..." />}
      <div className="gate-summary">
        <ShieldCheck size={16} />
        <span>{allDone ? "Gateway complete. Your WAV download is ready." : `Missing: ${required.filter((action) => !isDone(action)).map(gateActionLabel).join(", ")}.`}</span>
      </div>
      {allDone && <DownloadButton release={release} notify={notify} />}
    </section>
  );
}

function DownloadButton({ release, notify, compact = false }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const click = async () => {
    if (!user) return location.hash = "#/login";
    setDownloading(true);
    try {
      const data = await request(`/releases/${release.id}/download`, { method: "POST" });
      if (data.url) {
        const link = document.createElement("a");
        link.href = data.url;
        link.download = data.file_name || release.audio_file_name || `${release.title}.wav`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      notify("Download unlocked and counted.");
    } catch (err) {
      notify(err.message);
    } finally {
      setDownloading(false);
    }
  };
  if (!release.download_enabled) return <button className="button ghost" disabled><ShieldCheck size={16} /> Stream only</button>;
  return <button className="button ghost" onClick={click} disabled={downloading}>{downloading ? <Loader2 className="spin" size={16} /> : <ArrowDownToLine size={16} />} {downloading ? "Preparing..." : compact ? "WAV" : "Download WAV"}</button>;
}

function BuyButton({ release, notify, compact = false }) {
  const { user } = useAuth();
  const click = async () => {
    if (!user) return location.hash = "#/login";
    notify(`Checkout opened for ${release.title}.`);
    location.hash = `#/checkout?release=${release.id}`;
  };
  return <button className="button accent" onClick={click}><ShoppingCart size={16} /> {compact ? money(release.price_cents) : `Buy ${money(release.price_cents)}`}</button>;
}

function FollowButton({ artistId, notify }) {
  const { user } = useAuth();
  const [followed, setFollowed] = useState(false);
  const click = async () => {
    if (!user) return location.hash = "#/login";
    const data = await request(`/artists/${artistId}/follow`, { method: "POST" });
    setFollowed(data.followed);
    notify(data.followed ? "Artist followed." : "Artist unfollowed.");
  };
  return <button className="button accent" onClick={click}><UserPlus size={16} /> {followed ? "Following" : "Follow"}</button>;
}

function ArtistCard({ artist, notify }) {
  return (
    <article className="card artist-card">
      <span className="avatar">{artist.avatar}</span>
      <div>
        <h2><a href={artistPath(artist)}>{artist.name}</a> {artist.pro ? <span className="badge dark">U0 Pro</span> : null}</h2>
        <p>{artist.genre} - {shortNumber(artist.followers)} followers</p>
      </div>
      <FollowButton artistId={artist.id} notify={notify} />
    </article>
  );
}

function Metric({ icon, label, value, delta }) {
  return <article className="metric">{icon}<span>{label}</span><strong>{value}</strong><em>{delta}</em></article>;
}

function DashboardInsight({ title, icon: Icon, value, text, href, action }) {
  return (
    <article className="dashboard-insight">
      <Icon size={20} />
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{text}</p>
      <a href={href}>{action} <ArrowUpRight size={15} /></a>
    </article>
  );
}

function RevenueBars({ releases = [] }) {
  const seed = releases.length ? releases.reduce((sum, release) => sum + Number(release.plays || 0), 0) : 100;
  const values = [34, 48, 42, 74, 51, 68, 60].map((value, index) => Math.max(24, Math.min(96, value + ((seed + index * 11) % 17) - 8)));
  return (
    <section className="chart-panel">
      <div className="chart-head">
        <div>
          <p className="label">Revenue</p>
          <h2>Last 7 days</h2>
        </div>
        <span>Live data</span>
      </div>
      <div className="bars">
        {values.map((height, index) => <span key={`${height}-${index}`} style={{ height: `${height}px` }} className={index === 3 ? "hot" : ""} />)}
      </div>
    </section>
  );
}

function Analytics({ releases, stats }) {
  const sorted = [...releases].sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0));
  const top = sorted[0];
  const totalDownloads = releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const totalPlays = releases.reduce((sum, release) => sum + Number(release.plays || 0), 0);
  const totalSales = releases.reduce((sum, release) => sum + Number(release.sales || 0), 0);
  const totalLikes = releases.reduce((sum, release) => sum + Number(release.likes || 0), 0);
  const totalComments = releases.reduce((sum, release) => sum + Number(release.comments || 0), 0);
  const conversion = totalPlays ? ((totalDownloads / totalPlays) * 100).toFixed(1) : "0.0";
  const revenuePerPlay = totalPlays ? (stats.revenue / totalPlays / 100).toFixed(2) : "0.00";
  const funnel = [
    { label: "Plays", value: totalPlays, icon: BarChart3 },
    { label: "Downloads", value: totalDownloads, icon: Download },
    { label: "Sales", value: totalSales, icon: ShoppingCart }
  ];
  const maxFunnel = Math.max(...funnel.map((item) => item.value), 1);
  return (
    <section className="analytics-suite">
      <div className="analytics-hero-card">
        <p className="label">Analytics</p>
        <h2>Audience and revenue signals</h2>
        <p>{top ? `${top.title} is leading the catalog with ${shortNumber(top.plays)} plays and ${shortNumber(top.downloads)} downloads.` : "Upload your first release to unlock analytics."}</p>
        <div className="analytics-pill-row">
          <span><WifiIcon size={15} /> Conversion {conversion}%</span>
          <span><Wallet size={15} /> EUR/play {revenuePerPlay}</span>
          <span><Heart size={15} /> {shortNumber(totalLikes)} likes</span>
          <span><MessageCircle size={15} /> {shortNumber(totalComments)} comments</span>
          <span><Package size={15} /> {releases.length} tracked releases</span>
        </div>
      </div>
      <div className="analytics-grid">
        <RevenueBars releases={releases} />
        <article className="analytics-card">
          <div className="chart-head">
            <div>
              <p className="label">Funnel</p>
              <h2>Listener actions</h2>
            </div>
          </div>
          <div className="funnel-list">
            {funnel.map((item) => {
              const Icon = item.icon;
              return (
                <div className="funnel-item" key={item.label}>
                  <span><Icon size={16} /> {item.label}</span>
                  <strong>{shortNumber(item.value)}</strong>
                  <i><b style={{ width: `${Math.max(8, (item.value / maxFunnel) * 100)}%` }} /></i>
                </div>
              );
            })}
          </div>
        </article>
        <article className="analytics-card wide">
          <div className="chart-head">
            <div>
              <p className="label">Catalog ranking</p>
              <h2>Top performing releases</h2>
            </div>
            <a href="#/catalog">Manage <ArrowUpRight size={15} /></a>
          </div>
          <div className="analytics-release-table">
            {sorted.map((release, index) => (
              <a href={`#/release/${release.id}`} key={release.id}>
                <span>{index + 1}</span>
                <strong>{release.title}</strong>
                <small>{release.genre}</small>
                <b>{shortNumber(release.plays)} plays</b>
                <em>{shortNumber(release.downloads)} downloads</em>
                <i>{shortNumber(release.likes || 0)} likes · {money(release.revenue_cents || 0)}</i>
              </a>
            ))}
            {!sorted.length && <p className="muted">No analytics yet. Upload a release to start tracking real plays, likes, comments, downloads and sales.</p>}
          </div>
        </article>
        <article className="analytics-card">
          <div className="chart-head">
            <div>
              <p className="label">Insights</p>
              <h2>Next clean move</h2>
            </div>
          </div>
          <div className="analytics-notes">
            <p><CircleCheck size={16} /> Push the top release to stories with a short link.</p>
            <p><CircleCheck size={16} /> Keep one free gate live to grow followers.</p>
            <p><CircleCheck size={16} /> Review paid drops weekly for price friction.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function Payouts({ stats, notify }) {
  return <section className="card payouts"><Wallet size={32} /><h2>{money(stats.revenue)} available</h2><p className="muted">Payout ledger from completed purchases.</p><button className="button accent" onClick={() => notify("Payout request queued.")}>Request payout</button></section>;
}

function PageHeader({ eyebrow, title, text }) {
  return <header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{text && <p>{text}</p>}</header>;
}

function SectionTitle({ title, link, action }) {
  return <div className="section-title"><h2>{title}</h2>{link && <a href={link}>{action} {"->"}</a>}</div>;
}

function SkeletonList() {
  return <div className="skeleton-list"><span /><span /><span /></div>;
}

function AuthRequired() {
  return <main className="page"><div className="empty"><h1>Login required</h1><p>Connecte-toi pour utiliser cette page.</p><a className="button accent" href="#/login">Login</a></div></main>;
}

function ErrorPage({ message }) {
  return <main className="page"><div className="empty"><h1>Something broke</h1><p>{message}</p></div></main>;
}

function NotFound() {
  return (
    <main className="not-found-page">
      <NotFoundCanvas />
      <section className="not-found-message">
        <p className="label">Signal lost</p>
        <h1>404</h1>
        <h2>Page not found</h2>
        <p>The release, artist or route you are looking for may have moved out of the yard.</p>
        <div className="button-row">
          <button className="button ghost" onClick={() => history.back()}><ArrowLeft size={17} /> Go Back</button>
          <a className="button accent" href="#/"><HomeIcon size={17} /> Go Home</a>
        </div>
      </section>
    </main>
  );
}

function NotFoundCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let raf = 0;
    const circles = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      circles.length = 0;
      for (let i = 0; i < 180; i += 1) {
        circles.push({
          x: canvas.width * (1.1 + Math.random() * 1.8),
          y: canvas.height * (-.15 + Math.random() * 1.3),
          size: canvas.width / 1200,
          speed: canvas.width / (90 + Math.random() * 80)
        });
      }
    };
    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#d4e857";
      circles.forEach((circle) => {
        if (frame < 520) {
          circle.x -= circle.speed;
          circle.size += canvas.width / 12000;
        }
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas className="not-found-canvas" ref={canvasRef} aria-hidden="true" />;
}

createRoot(document.getElementById("root")).render(<I18nProvider><AuthProvider><App /></AuthProvider></I18nProvider>);
