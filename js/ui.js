import { escapeHtml, money, moneyShort } from './util.js';
import { crestSvg } from './data.js';

export const esc = escapeHtml;
export const fmtMoney = money;
export const fmtMoneyShort = moneyShort;

export function crest(team, size = 46, cls = 'crest') {
  return `<span class="${cls}" style="width:${size}px;height:${Math.round(size * 1.08)}px">${crestSvg(team, { size })}</span>`;
}

export function crestMini(team, size = 20) {
  return `<span class="crest-mini" style="width:${size}px;height:${Math.round(size * 1.1)}px">${crestSvg(team, { size })}</span>`;
}

export function teamBadge(team, opts = {}) {
  if (!team) return '<span class="muted">—</span>';
  return `<span class="team-badge">${crestMini(team, opts.size || 24)}<b>${esc(team.name)}</b></span>`;
}

export function page({ title, sub = '', body = '', foot = '', back = null, className = '' }) {
  return `
  <div class="screen ${className}">
    <div class="screen-inner">
      <div class="screen-head">
        ${back ? `<button class="btn ghost small" data-nav="${esc(back)}">‹ Voltar</button>` : ''}
        <div class="screen-title">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>
        <div class="spacer"></div>
        <span class="pill">PES 2027</span>
      </div>
      <div class="screen-body">${body}</div>
      ${foot ? `<div class="screen-foot">${foot}</div>` : ''}
    </div>
  </div>`;
}

export function empty(text) {
  return `<div class="empty">${esc(text)}</div>`;
}

export function bar(value, max = 100, cls = '') {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="bar ${cls}"><i style="width:${pct}%"></i></div>`;
}

export function stars(n) {
  const full = Math.round(n);
  return `<span class="stars">${'★'.repeat(Math.max(0, full))}${'☆'.repeat(Math.max(0, 5 - full))}</span>`;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this.hud = document.getElementById('match-hud');
    this.touch = document.getElementById('touch-controls');
    this.toasts = document.getElementById('toasts');
    this.modalLayer = document.getElementById('modal-layer');
    this.ticker = document.getElementById('commentary-ticker');
    this.powerWrap = document.getElementById('power-wrap');
    this.powerFill = document.getElementById('power-fill');
    this.replayBadge = document.getElementById('replay-badge');
    this.eventBanner = document.getElementById('event-banner');
    this.eventMain = document.getElementById('event-main');
    this.eventSub = document.getElementById('event-sub');
    this.broadcastEl = document.getElementById('broadcast');
    this.rotateHint = document.getElementById('rotate-hint');
    this._toastTimers = new Set();
    this._tickerTimer = null;
    this._bannerTimer = null;
    this._broadcastTimer = null;
    this._lastHud = '';
    document.getElementById('rotate-dismiss')?.addEventListener('click', () => {
      this.rotateHint?.classList.add('hidden');
      this.game.rotateDismissed = true;
    });
  }

  setScreen(html) {
    if (!this.root) return;
    this.root.classList.remove('playing');
    this.root.innerHTML = html;
    this.root.scrollTop = 0;
  }

  setPlaying(on) {
    this.root.classList.toggle('playing', on);
    if (on) this.root.innerHTML = '';
    this.hud?.classList.toggle('hidden', !on);
  }

  toast(text, kind = '', ms = 2200) {
    if (!this.toasts) return;
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = text;
    this.toasts.appendChild(d);
    const t = setTimeout(() => {
      d.style.opacity = '0';
      d.style.transition = 'opacity .25s';
      setTimeout(() => d.remove(), 260);
      this._toastTimers.delete(t);
    }, ms);
    this._toastTimers.add(t);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
  }

  modal({ title, sub = '', body = '', actions = [{ label: 'Fechar', value: 'close', cls: 'ghost' }] }) {
    if (!this.modalLayer) return;
    this.modalLayer.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3>
      ${sub ? `<div class="modal-sub">${esc(sub)}</div>` : ''}
      <div class="modal-body">${body}</div>
      <div class="modal-actions">${actions.map(a => `<button class="btn ${a.cls || ''}" data-modal-action="${esc(a.value)}">${esc(a.label)}</button>`).join('')}</div>
    </div>`;
    this.modalLayer.classList.remove('hidden');
  }

  closeModal() {
    if (!this.modalLayer) return;
    this.modalLayer.classList.add('hidden');
    this.modalLayer.innerHTML = '';
  }

  setHUD(match) {
    if (!match) return;
    const h = match.home, a = match.away;
    const clock = match.clockText();
    const phase = match.training ? 'TREINO' : match.phase === 'halftime' ? 'INTERVALO' : match.phase === 'fulltime' ? 'FIM DE JOGO' : match.phase === 'penalty' ? 'PÊNALTI' : match.half === 1 ? '1º TEMPO' : '2º TEMPO';
    const key = `${match.score.home}:${match.score.away}:${clock}:${phase}:${h.id}:${a.id}`;
    if (key !== this._lastHud) {
      this._lastHud = key;
      const hs = document.getElementById('hud-home-score');
      const as = document.getElementById('hud-away-score');
      if (hs) hs.textContent = match.score.home;
      if (as) as.textContent = match.score.away;
      const hc = document.getElementById('hud-clock');
      if (hc) hc.textContent = clock;
      const hp = document.getElementById('hud-phase');
      if (hp) hp.textContent = phase;
      const ha = document.getElementById('hud-home-abbr');
      if (ha) ha.textContent = h.short || h.name.slice(0, 3).toUpperCase();
      const aa = document.getElementById('hud-away-abbr');
      if (aa) aa.textContent = a.short || a.name.slice(0, 3).toUpperCase();
      const hcrest = document.getElementById('hud-home-crest');
      if (hcrest) hcrest.innerHTML = crestSvg(h, { size: 20 });
      const acrest = document.getElementById('hud-away-crest');
      if (acrest) acrest.innerHTML = crestSvg(a, { size: 20 });
    }
    this.setPower(match);
    this.replayBadge?.classList.toggle('hidden', match.phase !== 'replay');
  }

  setPower(match) {
    if (!this.powerWrap || !this.powerFill) return;
    let side = match.userSide || 'home';
    if (match.phase === 'penalty' && match.penalty) side = match.penalty.side;
    const v = Math.max(match.charge?.[side] || 0, match.control?.[side]?.chargeT || 0);
    const show = v > .02 && (match.phase === 'play' || match.phase === 'penalty');
    this.powerWrap.classList.toggle('hidden', !show);
    if (show) this.powerFill.style.width = `${Math.min(100, v * 100)}%`;
  }

  showTouch(v) {
    this.touch?.classList.toggle('hidden', !v);
  }

  commentary(text, ms = 3000) {
    if (!this.ticker || !text) return;
    this.ticker.textContent = text;
    this.ticker.classList.add('show');
    clearTimeout(this._tickerTimer);
    this._tickerTimer = setTimeout(() => this.ticker.classList.remove('show'), ms);
  }

  banner(main, sub = '', ms = 1800) {
    if (!this.eventBanner) return;
    this.eventMain.textContent = main;
    this.eventSub.textContent = sub;
    this.eventBanner.classList.remove('hidden');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this.eventBanner.classList.add('hidden'), ms);
  }

  broadcast(main, sub = '', ms = 2600) {
    if (!this.broadcastEl) return;
    this.broadcastEl.innerHTML = `<b>${esc(main)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    this.broadcastEl.classList.remove('hidden');
    clearTimeout(this._broadcastTimer);
    this._broadcastTimer = setTimeout(() => this.broadcastEl.classList.add('hidden'), ms);
  }

  clearMatchUI() {
    this._lastHud = '';
    this.hud?.classList.add('hidden');
    this.touch?.classList.add('hidden');
    this.powerWrap?.classList.add('hidden');
    this.replayBadge?.classList.add('hidden');
    this.eventBanner?.classList.add('hidden');
    this.broadcastEl?.classList.add('hidden');
    this.ticker?.classList.remove('show');
  }
}
