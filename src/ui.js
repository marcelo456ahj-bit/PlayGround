import { STADIUMS } from "./data.js";

export const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/></svg>',
  master: '<svg viewBox="0 0 24 24"><path d="M4 20v-6l4-2v-3l4-5 4 5v3l4 2v6Z"/><path d="M9 20v-4h6v4"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 2.9 6.3 6.9.8-5 4.8 1.3 6.8L12 17.5l-6.1 3.2 1.3-6.8-5-4.8 6.9-.8Z"/></svg>',
  transfer: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="m4 16-1 5 5-1L20 8l-4-4Z"/><path d="m14 6 4 4"/></svg>',
  training: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m12 8 3 2v4l-3 2-3-2v-4Z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></svg>',
  extras: '<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="3"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10Z"/><path d="M12 3v4M4 10l4 1M20 10l-4 1M7 19l2-4M17 19l-2-4"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2 20 5v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5Z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5h5M9.5 14.5h5M12 8v8"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 7h3l2-2h6l2 2h3v12H4Z"/><circle cx="12" cy="13" r="3"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  rain: '<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
  snow: '<svg viewBox="0 0 24 24"><path d="M12 2v20M4 7l16 10M20 7 4 17M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4 1-1 4M21 11l-4 1 1 4"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 18Z"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  whistle: '<svg viewBox="0 0 24 24"><path d="M14 8h6l-2 5h-4"/><path d="M14 8a6 6 0 1 0 0 9"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  cloudSave: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 18Z"/><path d="m9 14 2 2 4-5"/></svg>'
};

export const icon = (name, className) => {
  const svg = ICONS[name] || ICONS.ball;
  if (!className) return svg;
  return svg.replace("<svg ", `<svg class="${className}" `);
};

export const crest = (team, size, extra) => {
  if (!team) return "";
  const classes = ["crest", size, extra].filter(Boolean).join(" ");
  return `<span class="${classes}" style="--c1:${team.primary};--c2:${team.secondary};--c3:${team.accent || "#fff"}" title="${escapeHTML(team.name)}">${escapeHTML(team.short)}</span>`;
};

export const formatCoins = (value) => new Intl.NumberFormat("pt-BR").format(Math.round(value || 0));

export const formatMoney = (value) => {
  if (value >= 1000000) return `€ ${(value / 1000000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1000) return `€ ${Math.round(value / 1000)} mil`;
  return `€ ${value}`;
};

export const stadiumForTeam = (team) => {
  if (!team) return STADIUMS[0];
  return STADIUMS.find((stadium) => stadium.name === team.stadium) || STADIUMS[0];
};

export const NAV_ITEMS = [
  { id: "home", label: "Início", icon: "home" },
  { id: "quick", label: "Partida Rápida", icon: "play" },
  { id: "competitions", label: "Competições", icon: "trophy" },
  { id: "master", label: "Master League", icon: "master", badge: "CARREIRA" },
  { id: "star", label: "Rumo ao Estrelato", icon: "star", badge: "NOVO" },
  { id: "transfers", label: "Transferências", icon: "transfer" },
  { id: "editor", label: "Editor", icon: "edit" },
  { id: "training", label: "Treinos", icon: "training" },
  { id: "multiplayer", label: "Multijogador", icon: "users" },
  { id: "extras", label: "Extras", icon: "extras" },
  { id: "settings", label: "Ajustes", icon: "settings" }
];

export const renderNav = (active) => {
  return NAV_ITEMS.map((item, index) => `
    <button class="nav-item ${active === item.id ? "active" : ""}" data-go="${item.id}">
      ${icon(item.icon)}
      <span>${item.label}</span>
      ${item.badge ? `<small>${item.badge}</small>` : ""}
    </button>
    ${index === 5 || index === 8 ? '<div class="nav-sep"></div>' : ""}
  `).join("");
};

let toastTimer = null;
export const toast = (message) => {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
};

export const openModal = (html, options) => {
  const root = document.getElementById("modalRoot");
  if (!root) return null;
  root.innerHTML = html;
  root.classList.remove("hidden");
  root.dataset.closable = options && options.closable === false ? "false" : "true";
  return root;
};

export const closeModal = () => {
  const root = document.getElementById("modalRoot");
  if (!root) return;
  root.classList.add("hidden");
  root.innerHTML = "";
};

export const modalShell = (title, eyebrow, body, foot, wide) => `
  <div class="modal-sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}">
    <div class="modal-head">
      <div class="modal-head-copy">
        <span class="eyebrow">${escapeHTML(eyebrow || "PES 2027")}</span>
        <h2>${escapeHTML(title)}</h2>
      </div>
      <button class="modal-close" data-close-modal aria-label="Fechar">${icon("close")}</button>
    </div>
    <div class="modal-body">${body}</div>
    ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
  </div>
`;

export const weatherIcon = (id) => {
  const map = { clear: "sun", cloudy: "cloud", rain: "rain", night: "moon", snow: "snow" };
  return icon(map[id] || "sun");
};

export const badgeTeam = (team, size) => {
  if (!team) return "";
  return `<div class="badge" style="--b1:${team.primary};--b2:${team.secondary}">${escapeHTML(team.short)}</div>`;
};
