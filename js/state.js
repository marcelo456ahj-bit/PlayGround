/* Estado persistente, perfil e overrides do editor/mercado. */

import {
  VERSION, SEASON, LEAGUES, NATIONAL_LEAGUE, ALL_TEAMS, ALL_PLAYERS, TEAMS,
  getTeam, getLeague
} from './data.js';

export const SAVE_KEY = 'pes2027-stickman-save-v1';

export function defaultState() {
  return {
    version: VERSION,
    coins: 2500,
    profile: { name: 'COMANDANTE', level: 1, xp: 0 },
    favoriteId: 'brasileirao-flamengo',
    settings: {
      difficulty: 'profissional', halfLength: 4, camera: 'transmissao', weather: 'limpo',
      quality: 'alta', tilt: false, showControls: true, commentary: true,
      master: .8, music: .55, sfx: .8, crowd: .7
    },
    unlocks: [],
    equipped: [],
    editorTeams: {},
    roster: {},
    marketBudgets: {},
    comps: {},
    career: null,
    careerTab: 'overview',
    record: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0 },
    lastSave: Date.now()
  };
}

function loadState() {
  const base = defaultState();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!raw || typeof raw !== 'object') return base;
    return {
      ...base, ...raw,
      profile: { ...base.profile, ...(raw.profile || {}) },
      settings: { ...base.settings, ...(raw.settings || {}) },
      record: { ...base.record, ...(raw.record || {}) },
      unlocks: Array.isArray(raw.unlocks) ? raw.unlocks : [],
      equipped: Array.isArray(raw.equipped) ? raw.equipped : [],
      editorTeams: raw.editorTeams || {},
      roster: raw.roster || {},
      marketBudgets: raw.marketBudgets || {},
      comps: raw.comps || {},
      career: raw.career || null
    };
  } catch { return base; }
}

export const state = loadState();

export const app = {
  view: 'home',
  currentMatch: null,
  currentConfig: null,
  wizard: null,
  compId: null,
  compFilter: 'all',
  editorTeam: state.favoriteId,
  marketTeam: state.favoriteId,
  marketQuery: '',
  marketPos: 'TODOS',
  heroRaf: 0,
  lastContext: null,
  result: null
};

export function save(silent = false) {
  state.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage full */ }
  const ind = document.getElementById('save-indicator');
  if (ind) {
    ind.textContent = 'Salvo agora';
    clearTimeout(save._t);
    save._t = setTimeout(() => { ind.textContent = 'Salvo automaticamente'; }, 1800);
  }
  if (!silent) {
    const coins = document.getElementById('coin-count');
    if (coins) coins.textContent = state.coins.toLocaleString('pt-BR');
  }
}

function ensureStarPlayer() {
  const c = state.career;
  if (!c || c.mode !== 'star' || !c.player) return;
  const team = getTeam(c.teamId);
  if (!team) return;
  if (!team.squad.some(p => p.id === c.player.id)) team.squad.unshift(c.player);
}

export function applyOverrides() {
  for (const [id, o] of Object.entries(state.editorTeams || {})) {
    const t = TEAMS[id];
    if (!t) continue;
    if (o.name) { t.name = o.name; t.short = o.name.length > 16 ? o.name.slice(0, 14) + '.' : o.name; }
    t.colors.primary = o.primary || t.colors.primary;
    t.colors.secondary = o.secondary || t.colors.secondary;
    t.colors.accent = o.accent || t.colors.accent;
    t.colors.shorts = o.shorts || t.colors.shorts;
    t.colors.socks = o.socks || t.colors.socks;
    t.crest.bg = o.primary || t.crest.bg;
    t.crest.fg = o.accent || t.crest.fg;
    t.crest.symbol = o.symbol || t.crest.symbol;
    t.crest.shape = o.shape || t.crest.shape;
    if (o.stadiumName) t.stadium.name = o.stadiumName;
    if (o.stadiumCapacity) t.stadium.capacity = Number(o.stadiumCapacity) || t.stadium.capacity;
    if (o.formation) t.formation = o.formation;
    if (o.mentality) t.mentality = o.mentality;
  }
  for (const [id, r] of Object.entries(state.roster || {})) {
    const t = TEAMS[id];
    if (!t) continue;
    if (r.sold?.length) t.squad = t.squad.filter(p => !r.sold.includes(p.id));
    for (const pid of r.bought || []) {
      const p = ALL_PLAYERS.find(x => x.id === pid);
      if (p && !t.squad.some(x => x.id === pid)) t.squad.push(p);
    }
  }
  ensureStarPlayer();
}

applyOverrides();

export function favoriteTeam() {
  return getTeam(state.favoriteId) || getTeam(LEAGUES[0]?.teams[0]?.id) || ALL_TEAMS[0];
}

export function randomOpponent(exclude = []) {
  const pool = ALL_TEAMS.filter(t => !exclude.includes(t.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

export function leaguesAll() {
  return [...LEAGUES, NATIONAL_LEAGUE];
}

export function teamLeagueName(team) {
  return getLeague(team.leagueId)?.name || team.country;
}

export const SEASON_YEAR = SEASON;
