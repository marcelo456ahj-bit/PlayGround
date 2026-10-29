/* Componentes visuais compartilhados e utilidades de DOM. */

import { overallForSquad, getLeague } from './data.js';
import { state, teamLeagueName } from './state.js';
import { Audio } from './audio.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function crest(team, size = '') {
  if (!team) return '';
  const shape = team.crest?.shape === 'round' ? 'shape-round' : team.crest?.shape === 'square' ? 'shape-square' : '';
  return `<span class="crest ${size} ${shape}" style="--c1:${team.colors.primary};--c2:${team.crest?.fg || team.colors.secondary};--c3:${team.colors.secondary}"><span class="crest-star">★</span><span class="crest-abbr">${esc(team.abbr)}</span></span>`;
}

export function teamCard(team, action = 'pick-team', extra = '') {
  return `<button class="team-card" data-action="${action}" data-id="${team.id}">
    ${crest(team, 'crest-sm')}
    <span class="tr-copy"><b>${esc(team.name)}</b><small>${esc(teamLeagueName(team))}</small></span>
    <span class="tc-meta"><b>${overallForSquad(team)}</b>OVR</span>${extra}
  </button>`;
}

export function playerRow(p, extra = '') {
  return `<div class="player-row">
    <span class="pr-num">${p.num}</span><span class="pr-pos">${p.pos}</span>
    <span class="pr-name">${esc(p.name)}${p.star ? ' <span class="pill lime" style="padding:1px 4px;font-size:6px">CRAQUE</span>' : ''}</span>
    <span class="pr-meta">${p.age} anos · ${esc(p.nationality)}</span>
    <span class="pr-ovr">${p.rating}</span>${extra}
  </div>`;
}

export function pageHead(eyebrow, title, desc, actions = '') {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
}

export function statLine(label, a, b) {
  const av = Number(a) || 0, bv = Number(b) || 0;
  const total = Math.max(1, av + bv);
  const pa = av / total * 100;
  return `<div class="match-stat-line"><b>${a}</b><div><div class="msl-bar"><i style="width:${pa}%"></i><i style="width:${100 - pa}%"></i></div><div class="msl-label">${label}</div></div><b>${b}</b></div>`;
}

export function toast(text, icon = '✓', error = false) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast${error ? ' is-error' : ''}`;
  el.innerHTML = `<span class="t-ico">${icon}</span><span>${esc(text)}</span>`;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function updateChrome() {
  const coins = $('#coin-count');
  if (coins) coins.textContent = state.coins.toLocaleString('pt-BR');
  const av = $('#profile-avatar');
  if (av) av.textContent = String(state.profile.level).padStart(2, '0');
  const pn = $('#profile-name');
  if (pn) pn.textContent = state.profile.name.toUpperCase();
  const pl = $('#profile-level');
  if (pl) pl.textContent = `NÍVEL ${state.profile.level}`;
  const contexts = { home: 'CENTRAL DE COMANDO', match: 'CENTRAL DE PARTIDA', comps: 'COMPETIÇÕES', career: 'CARREIRA', editor: 'EDITOR DE TIMES', transfers: 'MERCADO DA BOLA', extras: 'EXTRAS & LOJA' };
  const viewKey = state.currentView || document.querySelector('.nav-item.is-active')?.dataset.view || 'home';
  const ctx = $('#topbar-context');
  if (ctx) ctx.textContent = contexts[viewKey] || 'CENTRAL DE COMANDO';
  $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === state.currentView));
}

export function openModal({ eyebrow = 'PES 2027', title = '', desc = '', body = '', foot = '', wide = false, narrow = false }) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div>
    <div class="modal ${wide ? 'modal-wide' : ''} ${narrow ? 'modal-narrow' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><div class="mh-copy"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div><button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
  root.classList.add('is-open');
  const bodyEl = $('.modal-body', root);
  if (bodyEl) bodyEl.scrollTop = 0;
  Audio.sfx('navigate');
}

export function closeModal() {
  const root = $('#modal-root');
  root.classList.remove('is-open');
  root.innerHTML = '';
}

export function openSettings() {
  const s = state.settings;
  openModal({
    eyebrow: 'CONFIGURAÇÕES', title: 'Ajustes do jogo', desc: 'Áudio, dificuldade, câmera, clima e controles.',
    body: `<div class="grid grid-2">
      <div class="panel" style="padding:16px"><div class="panel-title">Áudio</div>
        <div class="field" style="margin-bottom:12px"><label>VOLUME GERAL <span id="v-master">${Math.round(s.master * 100)}%</span></label><input type="range" min="0" max="1" step=".05" value="${s.master}" class="range" data-slider="master" /></div>
        <div class="field" style="margin-bottom:12px"><label>MÚSICA <span id="v-music">${Math.round(s.music * 100)}%</span></label><input type="range" min="0" max="1" step=".05" value="${s.music}" class="range" data-slider="music" /></div>
        <div class="field" style="margin-bottom:12px"><label>EFEITOS <span id="v-sfx">${Math.round(s.sfx * 100)}%</span></label><input type="range" min="0" max="1" step=".05" value="${s.sfx}" class="range" data-slider="sfx" /></div>
        <div class="field"><label>TORCIDA <span id="v-crowd">${Math.round(s.crowd * 100)}%</span></label><input type="range" min="0" max="1" step=".05" value="${s.crowd}" class="range" data-slider="crowd" /></div>
        <label class="check"><input type="checkbox" id="set-commentary" ${s.commentary ? 'checked' : ''} /> Narração por voz (pt-BR)</label>
      </div>
      <div class="panel" style="padding:16px"><div class="panel-title">Partida</div>
        <div class="field" style="margin-bottom:10px"><label>DIFICULDADE</label><select class="select" id="set-diff">${['amador', 'profissional', 'estrela', 'lenda'].map(d => `<option value="${d}" ${s.difficulty === d ? 'selected' : ''}>${d.toUpperCase()}</option>`).join('')}</select></div>
        <div class="field" style="margin-bottom:10px"><label>DURAÇÃO DE CADA TEMPO</label><select class="select" id="set-half">${[2, 3, 4, 5, 6, 8, 10].map(m => `<option value="${m}" ${s.halfLength === m ? 'selected' : ''}>${m} minutos</option>`).join('')}</select></div>
        <div class="field" style="margin-bottom:10px"><label>CÂMERA PADRÃO</label><select class="select" id="set-camera">${['transmissao', 'dinamica', 'aerea', 'classica'].map(c => `<option value="${c}" ${s.camera === c ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}</select></div>
        <div class="field" style="margin-bottom:10px"><label>CLIMA PADRÃO</label><select class="select" id="set-weather">${['limpo', 'nublado', 'chuva', 'noite', 'neve'].map(w => `<option value="${w}" ${s.weather === w ? 'selected' : ''}>${w.toUpperCase()}</option>`).join('')}</select></div>
        <label class="check"><input type="checkbox" id="set-tilt" ${s.tilt ? 'checked' : ''} /> Acelerômetro / inclinação</label>
        <label class="check"><input type="checkbox" id="set-controls" ${s.showControls !== false ? 'checked' : ''} /> Mostrar controles touch</label>
      </div>
    </div>`,
    foot: `<button class="btn btn-ghost" data-action="close-modal">Cancelar</button><span class="spacer"></span><span class="foot-note">As configurações ficam salvas no dispositivo.</span><button class="btn btn-primary" data-action="save-settings">Salvar configurações</button>`
  });
}

export function saveSettings() {
  const s = state.settings;
  const num = (id, fallback) => Number($(id)?.value ?? fallback);
  s.master = num('#v-master', s.master * 100) / 100;
  s.music = num('#v-music', s.music * 100) / 100;
  s.sfx = num('#v-sfx', s.sfx * 100) / 100;
  s.crowd = num('#v-crowd', s.crowd * 100) / 100;
  s.difficulty = $('#set-diff')?.value || s.difficulty;
  s.halfLength = Number($('#set-half')?.value || s.halfLength);
  s.camera = $('#set-camera')?.value || s.camera;
  s.weather = $('#set-weather')?.value || s.weather;
  s.tilt = !!$('#set-tilt')?.checked;
  s.showControls = !!$('#set-controls')?.checked;
  s.commentary = !!$('#set-commentary')?.checked;
  Audio.setSettings(s);
  return s;
}

export function ensureAudio() {
  try {
    Audio.init();
    Audio.setSettings(state.settings);
    if (!document.body.classList.contains('match-active')) Audio.playMusic('menu');
  } catch { /* optional */ }
}
