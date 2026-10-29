(function () {
  'use strict';

  const PES = window.PES;
  const AU = window.PESAudio;
  const SAVE_KEY = 'pes2027_stickman_save_v2';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = PES.clamp;

  const ICONS = {
    play: '<path d="M7 4l13 8-13 8z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 5-4 5-4-5z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5v2a3 3 0 003 3M16 6h3v2a3 3 0 01-3 3M12 13v4M8 21h8M9 17h6"/>',
    controller: '<path d="M6 8h12a4 4 0 014 4v1a4 4 0 01-7 2l-1-1h-4l-1 1a4 4 0 01-7-2v-1a4 4 0 014-4z"/><path d="M8 11v3M6.5 12.5h3M16 12h.01M18 14h.01"/>',
    transfer: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16zM14 6l4 4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.8-1L14.5 3h-5l-.3 2.1a7 7 0 00-1.8 1l-2.3-1-2 3.4L5 10a7 7 0 000 2l-2 1.5 2 3.4 2.3-1a7 7 0 001.8 1l.3 2.1h5l.3-2.1a7 7 0 001.8-1l2.3 1 2-3.4-2-1.5a7 7 0 00.1-1z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.3"/><path d="M16 15c3 0 5 1.8 5 4.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    shirt: '<path d="M8 4l4 2 4-2 4 3-2 4-2-1v10H8V10l-2 1-2-4z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    whistle: '<path d="M4 12a5 5 0 005 5h6l5 3v-8a5 5 0 00-5-5H9a5 5 0 00-5 5z"/><circle cx="9" cy="12" r="2"/>',
    camera: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
    replay: '<path d="M4 12a8 8 0 108-8 8 8 0 00-6 3L4 9"/><path d="M4 4v5h5"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9zM17 9a5 5 0 010 6M19.5 6.5a8 8 0 010 11"/>',
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1z"/>',
    comps: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5v2a3 3 0 003 3M16 6h3v2a3 3 0 01-3 3M12 13v4M8 21h8M9 17h6"/>',
    career: '<path d="M4 20V9l8-5 8 5v11M8 20v-6h8v6M4 20h16"/>',
    star: '<path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.1l5.8-.8z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    save: '<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h8V3M7 21v-7h10v7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 12h11L21 8H7"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    weather: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    whistleOff: '<path d="M3 3l18 18"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8"/>',
    ballSmall: '<circle cx="12" cy="12" r="8"/><path d="M12 8l3.5 2.5-1.3 4.5h-4.4L8.5 10.5z"/>'
  };

  function defaultSave() {
    return {
      version: 2, createdAt: Date.now(), updatedAt: Date.now(),
      profile: { name: 'Craque', coins: 1200 },
      settings: {
        music: true, sfx: true, narration: true, volume: .75, musicVolume: .3,
        vibration: true, quality: 'alta', tilt: false, camera: 'dynamic',
        difficulty: 'profissional', replayAuto: true, hintSeen: false
      },
      unlocked: { stadiums: ['arena-aurora', 'estadio-palmeiras', 'coliseu-sul', 'arena-pacifico'], balls: ['classic'], kits: ['default'], celebrations: ['classic'], equip: { ball: 'classic', kit: 'default', celebration: 'classic' } },
      trophies: [], achievements: [], stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, cleanSheets: 0 },
      career: null, legend: null, tournament: null,
      edits: { teams: {}, players: {}, customPlayers: [] }
    };
  }

  const G = window.PESGame = {
    save: null, screen: 'splash', stack: [], ctx: {}, setup: null, pick: {}, compPick: null,
    match: null, matchContext: null, lastResult: null, screens: {}, actions: {},
    st: { joystick: { home: false, away: false }, tilt: { x: 0, y: 0, base: null, enabled: false } },
    featured: null, matchUI: null,

    init() {
      this.load();
      this.registerCore();
      this.bindGlobal();
      this.applySettings();
      this.go('splash', {}, { replace: true });
    },

    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        this.save = raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
      } catch (e) { this.save = defaultSave(); }
      const d = defaultSave();
      this.save.settings = Object.assign(d.settings, this.save.settings || {});
      this.save.unlocked = Object.assign(d.unlocked, this.save.unlocked || {});
      this.save.unlocked.equip = Object.assign(d.unlocked.equip, this.save.unlocked.equip || {});
      this.save.edits = Object.assign(d.edits, this.save.edits || {});
      this.save.stats = Object.assign(d.stats, this.save.stats || {});
      if (!Array.isArray(this.save.trophies)) this.save.trophies = [];
      PES.applyEdits(this.save.edits);
      this.setup = {
        home: this.save.lastHome || 'brasileirao-rio-rubro',
        away: this.save.lastAway || 'premier-manchester-sky',
        stadium: '', weather: 'limpo', timeOfDay: 'noite',
        difficulty: this.save.settings.difficulty, duration: 4,
        camera: this.save.settings.camera, tilt: this.save.settings.tilt, humans: 1
      };
      if (!PES.getTeam(this.setup.home)) this.setup.home = 'brasileirao-rio-rubro';
      if (!PES.getTeam(this.setup.away)) this.setup.away = 'premier-manchester-sky';
      this.featured = this.save.lastFeatured && this.save.lastFeatured.length === 2 ? this.save.lastFeatured : this.pickFeatured();
    },

    pickFeatured() {
      const pool = PES.teams.filter(t => !t.isNational && t.rating >= 84);
      const seed = Math.floor(Date.now() / 86400000) % pool.length;
      const a = pool[seed % pool.length], b = pool[(seed + 7) % pool.length];
      return [a.id, b.id];
    },

    saveNow(silent) {
      this.save.updatedAt = Date.now();
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) {}
      if (!silent) this.toast('Progresso salvo');
      this.updateTopbar();
    },

    resetSave() {
      this.save = defaultSave();
      PES.applyEdits(this.save.edits);
      this.saveNow(true);
      this.setup = { home: 'brasileirao-rio-rubro', away: 'premier-manchester-sky', stadium: '', weather: 'limpo', timeOfDay: 'noite', difficulty: 'profissional', duration: 4, camera: 'dynamic', tilt: false, humans: 1 };
      this.stack = [];
      this.go('menu', {}, { replace: true });
    },

    applySettings() {
      const s = this.save.settings;
      if (AU) {
        AU.setSettings({ music: s.music, sfx: s.sfx, narration: s.narration, volume: s.volume, musicVolume: s.musicVolume });
      }
    },

    award(n) {
      this.save.profile.coins += n;
      this.updateTopbar();
    },

    /* ---------- Helpers ---------- */
    icon(name, cls) {
      return `<svg class="${cls || ''}" viewBox="0 0 24 24">${ICONS[name] || ICONS.ball}</svg>`;
    },

    crest(team, size = 52, extra) {
      if (!team) return '';
      const c = team.colors || {};
      const stars = team.rating >= 87 ? '<span class="star"></span>' : '';
      return `<span class="crest ${extra || ''}" style="--c1:${c.primary || '#35e6ff'};--c2:${c.secondary || '#07121c'};--c3:${c.accent || '#c9ff3d'};--cs:${size}px;width:${size}px;height:${Math.round(size * 1.12)}px"><span class="shield"></span>${stars}<span class="letters">${esc(team.short || 'PES')}</span></span>`;
    },

    flag(team) {
      if (!team) return '';
      const c = team.colors || {};
      return `<span class="flag" style="--f1:${c.primary || '#35e6ff'};color:${c.secondary || '#041018'}">${esc(team.flag || team.short || '')}</span>`;
    },

    money(v) {
      if (v >= 1000) return `€${(v / 1000).toFixed(1)}B`;
      return `€${Number(v).toFixed(1)}M`;
    },

    ordinal(n) { return `${n}º`; },

    toast(msg, kind) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.className = 'toast show' + (kind ? ' ' + kind : '');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { el.className = 'toast'; }, 2300);
    },

    modal(html) {
      const ov = document.getElementById('overlay');
      ov.innerHTML = `<div class="modal">${html}</div>`;
      ov.classList.remove('hidden');
      return ov;
    },

    closeModal() {
      const ov = document.getElementById('overlay');
      ov.classList.add('hidden');
      ov.innerHTML = '';
    },

    go(screen, ctx, opts) {
      opts = opts || {};
      if (!opts.replace && screen !== this.screen) this.stack.push({ screen: this.screen, ctx: this.ctx });
      if (this.stack.length > 30) this.stack.shift();
      this.screen = screen;
      this.ctx = ctx || {};
      this.render();
      if (AU) AU.ui();
    },

    back() {
      if (this.match) { this.toast('Finalize ou saia da partida primeiro'); return; }
      const prev = this.stack.pop();
      if (prev) { this.screen = prev.screen; this.ctx = prev.ctx; this.render(); if (AU) AU.uiBack(); }
      else this.go('menu', {}, { replace: true });
    },

    render() {
      const root = document.getElementById('screen');
      const topbar = document.getElementById('topbar');
      const nav = document.getElementById('bottomnav');
      const isSplash = this.screen === 'splash';
      const isMatch = this.screen === 'match';
      topbar.classList.toggle('hidden', isSplash || isMatch);
      nav.classList.toggle('hidden', isSplash || isMatch || this.screen === 'result');
      document.getElementById('app').classList.toggle('in-match', isMatch);
      const backBtn = topbar.querySelector('[data-action="back"]');
      if (backBtn) backBtn.style.visibility = ['menu', 'splash'].includes(this.screen) ? 'hidden' : 'visible';
      root.classList.toggle('no-nav', isSplash || this.screen === 'result');
      const fn = this.screens[this.screen];
      root.innerHTML = fn ? fn.call(this, this.ctx) : `<div class="empty">Tela indisponível.</div>`;
      root.scrollTop = 0;
      this.updateTopbar();
      this.updateNav();
      const after = this.afterRender && this.afterRender[this.screen];
      if (after) after.call(this, this.ctx);
    },

    updateTopbar() {
      const coins = document.getElementById('coin-value');
      if (coins) coins.textContent = this.save.profile.coins;
    },

    updateNav() {
      const map = { menu: 'home', competitions: 'comps', compSetup: 'comps', compHub: 'comps', play: 'play', teamSelect: 'play', master: 'career', legend: 'career', transfers: 'career', editor: 'extras', options: 'extras', extras: 'extras', training: 'play', multiplayer: 'play' };
      const active = map[this.screen];
      document.querySelectorAll('#bottomnav [data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === active));
    },

    bindGlobal() {
      document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const action = el.dataset.action;
        const fn = this.actions[action];
        if (fn) { e.preventDefault(); fn.call(this, el, e); }
      });
      document.querySelectorAll('#bottomnav [data-action]').forEach(b => {
        b.addEventListener('click', () => { if (AU) AU.ui(); });
      });
    },

    setInput(side, key, val) {
      if (!this.match || !this.match.inputs[side]) return;
      this.match.inputs[side][key] = val;
    },

    vibrate(ms) {
      if (this.save.settings.vibration && navigator.vibrate) navigator.vibrate(ms || 18);
    },

    /* ---------- Core screens ---------- */
    registerCore() {
      this.screens.splash = () => `
        <div class="splash">
          <div class="splash-ball" aria-hidden="true"></div>
          <div class="splash-inner">
            <div class="splash-badge">${this.icon('star')} TEMPORADA 2027 · TOUCH EDITION</div>
            <h1 class="splash-title"><span class="accent-word">PES</span> 2027<span class="outline">STICKMAN 2D</span></h1>
            <p class="splash-sub">FUTEBOL COMPLETO · CARREIRA · MULTIPLAYER LOCAL</p>
            <div class="splash-actions">
              <button class="btn primary" data-action="enter" aria-label="Start">${this.icon('play')} JOGAR</button>
              ${this.save.career || this.save.legend ? `<button class="btn dark" data-action="continue-career">${this.icon('career')} CONTINUAR</button>` : ''}
            </div>
          </div>
          <div class="splash-silhouette" aria-hidden="true">
            <svg viewBox="0 0 1200 300" preserveAspectRatio="none"><path d="M0 300V160c80-20 120-90 190-90s80 60 140 60 70-100 150-100 90 115 165 115 65-70 130-70 80 70 150 70 80-60 150-60 95 85 175 85v130z"/></svg>
          </div>
          <div class="splash-foot">PES 2027 STICKMAN 2D · JOGO COMPLETO PARA PHONE E TABLET · ${new Date().getFullYear()}</div>
        </div>`,

      this.screens.menu = () => {
        const feat = this.featured ? PES.getTeam(this.featured[0]) && [PES.getTeam(this.featured[0]), PES.getTeam(this.featured[1])] : null;
        const f = feat && feat[0] && feat[1] ? feat : [PES.teams[0], PES.teams[7]];
        const next = this.nextCareerMatch();
        const trophies = this.save.trophies.slice(-3).reverse();
        return `
        <div class="menu-wrap">
          <div class="menu-welcome">
            <div>
              <p class="eyebrow">Bem-vindo de volta</p>
              <h1>OLÁ, <span>${esc(this.save.profile.name)}</span></h1>
              <p>${this.save.career ? 'Sua carreira continua. O próximo jogo espera por você.' : this.save.legend ? 'Sua lenda está em campo. Mais uma temporada começa.' : 'Escolha um modo e entre em campo. Tudo pronto para jogar.'}</p>
            </div>
            <div class="row wrap">
              <span class="chip lime">${this.icon('trophy')} ${this.save.trophies.length} títulos</span>
              <span class="chip cyan">${this.icon('ball')} ${this.save.stats.matches} jogos</span>
            </div>
          </div>

          <div class="hero-match" style="--hc:${f[0].colors.primary};--ac:${f[1].colors.primary}">
            <div class="hero-side">
              ${this.crest(f[0], 92)}
              <div class="h-name">${esc(f[0].name)}</div>
              <div class="h-sub">${esc(f[0].leagueName)}</div>
            </div>
            <div class="hero-vs">
              <div class="vs">VS</div>
              <div class="comp">Partida em destaque</div>
            </div>
            <div class="hero-side">
              ${this.crest(f[1], 92)}
              <div class="h-name">${esc(f[1].name)}</div>
              <div class="h-sub">${esc(f[1].leagueName)}</div>
            </div>
            <button class="btn primary hero-play" data-action="quickplay">${this.icon('play')} JOGAR AGORA</button>
          </div>

          ${next ? `<div class="mini-card" style="margin-top:12px;width:100%;justify-content:space-between;padding:12px 16px">
            <div class="row">${this.icon('calendar')}<div><b>Próximo jogo · ${esc(next.label)}</b><span>${esc(next.team.name)} · ${next.dateText}</span></div></div>
            <button class="btn small cyan" data-action="continue-career">Continuar</button>
          </div>` : ''}

          <div class="menu-grid">
            <button class="menu-tile" data-action="play"><span class="t-icon">${this.icon('ball')}</span><span class="t-title">Partida Rápida</span><span class="t-sub">Amistoso com times e estádios à sua escolha</span></button>
            <button class="menu-tile lime-accent" data-action="competitions"><span class="t-icon">${this.icon('trophy')}</span><span class="t-title">Competições</span><span class="t-sub">Ligas, copas, Libertadores e Champions</span></button>
            <button class="menu-tile magenta-accent" data-action="master"><span class="t-icon">${this.icon('career')}</span><span class="t-title">Master League</span><span class="t-sub">${this.save.career ? 'Temporada em andamento' : 'Construa um clube campeão'}</span>${this.save.career ? '<span class="t-badge">ATIVO</span>' : ''}</button>
            <button class="menu-tile orange-accent" data-action="legend"><span class="t-icon">${this.icon('star')}</span><span class="t-title">Rumo ao Estrelato</span><span class="t-sub">Crie seu jogador e vire lenda</span>${this.save.legend ? '<span class="t-badge">ATIVO</span>' : ''}</button>
            <button class="menu-tile" data-action="transfers"><span class="t-icon">${this.icon('transfer')}</span><span class="t-title">Transferências</span><span class="t-sub">Mercado, propostas e negociações</span></button>
            <button class="menu-tile lime-accent" data-action="editor"><span class="t-icon">${this.icon('edit')}</span><span class="t-title">Editor</span><span class="t-sub">Times, jogadores, uniformes e escudos</span></button>
            <button class="menu-tile orange-accent" data-action="training"><span class="t-icon">${this.icon('target')}</span><span class="t-title">Treino</span><span class="t-sub">Passe, chute, drible e pênaltis</span></button>
            <button class="menu-tile magenta-accent" data-action="multiplayer"><span class="t-icon">${this.icon('users')}</span><span class="t-title">Multiplayer</span><span class="t-sub">Dois jogadores no mesmo dispositivo</span></button>
          </div>

          <div class="menu-strip">
            <div class="mini-card">${this.icon('settings', '')}<div><b>Opções</b><span>Áudio, tilt e salvamento</span></div><button class="btn small" data-action="options">Abrir</button></div>
            <div class="mini-card">${this.icon('star')}<div><b>Extras</b><span>Loja, troféus e desbloqueáveis</span></div><button class="btn small" data-action="extras">Abrir</button></div>
            ${trophies.map(t => `<div class="mini-card">${this.icon('trophy')}<div><b>${esc(t.name)}</b><span>${esc(t.club || t.team || 'Conquista')}</span></div></div>`).join('')}
          </div>
        </div>`;
      };

      this.screens.play = () => {
        const home = PES.getTeam(this.setup.home), away = PES.getTeam(this.setup.away);
        const stadiums = PES.STADIUMS.filter(s => !s.unlock || this.save.unlocked.stadiums.includes(s.id));
        const stadiumVal = this.setup.stadium || home.stadium;
        return `
        <div>
          <div class="page-head">
            <div><p class="eyebrow">Partida rápida</p><h1 class="page-title">ENTRE EM CAMPO</h1><p class="page-sub">Escolha os times, o palco e as condições do jogo. Depois é só tocar no joystick e jogar.</p></div>
            <button class="btn small" data-action="squad-preview">${this.icon('users')} Escalações</button>
          </div>
          <div class="setup-grid">
            <div class="card matchup-card">
              <div class="matchup-teams">
                <button class="team-pick" data-action="pick-team" data-side="home">
                  ${this.crest(home, 78)}
                  <span class="tp-name">${esc(home.name)}</span>
                  <span class="tp-meta">${esc(home.leagueName)} · ${home.rating}</span>
                  <span class="tp-change">TROCAR TIME</span>
                </button>
                <div class="vs-badge">VS</div>
                <button class="team-pick" data-action="pick-team" data-side="away">
                  ${this.crest(away, 78)}
                  <span class="tp-name">${esc(away.name)}</span>
                  <span class="tp-meta">${esc(away.leagueName)} · ${away.rating}</span>
                  <span class="tp-change">TROCAR TIME</span>
                </button>
              </div>
              <div class="grid g2" style="margin-top:18px">
                <div class="card soft">
                  <div class="card-title">Casa</div>
                  <div class="row">${this.crest(home, 38)}<div><b>${esc(home.name)}</b><div class="muted" style="font-size:11px">${esc(home.stadium)} · ${esc(home.city)}</div></div></div>
                  <div class="pill-row"><span class="chip lime">${home.rating} geral</span><span class="chip">${esc(home.formation)}</span></div>
                </div>
                <div class="card soft">
                  <div class="card-title">Visitante</div>
                  <div class="row">${this.crest(away, 38)}<div><b>${esc(away.name)}</b><div class="muted" style="font-size:11px">${esc(away.stadium)} · ${esc(away.city)}</div></div></div>
                  <div class="pill-row"><span class="chip lime">${away.rating} geral</span><span class="chip">${esc(away.formation)}</span></div>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-title">Configuração</div>
              <div class="opt-list">
                <div class="opt-row"><div class="opt-label">Estádio<small>${esc(stadiumVal)}</small></div>
                  <select id="stadium-select" data-action="set-stadium">
                    ${stadiums.map(s => `<option value="${esc(s.name)}" ${stadiumVal === s.name ? 'selected' : ''}>${esc(s.name)} · ${s.capacity.toLocaleString('pt-BR')}</option>`).join('')}
                  </select>
                </div>
                <div class="opt-row"><div class="opt-label">Clima</div><div class="seg" data-seg="weather">
                  ${['limpo', 'chuva', 'neve', 'neblina'].map(w => `<button data-action="set-weather" data-value="${w}" class="${this.setup.weather === w ? 'on' : ''}">${w === 'limpo' ? 'Limpo' : w === 'chuva' ? 'Chuva' : w === 'neve' ? 'Neve' : 'Neblina'}</button>`).join('')}
                </div></div>
                <div class="opt-row"><div class="opt-label">Horário</div><div class="seg">
                  ${[['dia', 'Dia'], ['entardecer', 'Tarde'], ['noite', 'Noite']].map(([v, l]) => `<button data-action="set-time" data-value="${v}" class="${this.setup.timeOfDay === v ? 'on' : ''}">${l}</button>`).join('')}
                </div></div>
                <div class="opt-row"><div class="opt-label">Dificuldade</div><div class="seg">
                  ${PES.DIFFICULTIES.map(d => `<button data-action="set-difficulty" data-value="${d.id}" class="${this.setup.difficulty === d.id ? 'on' : ''}">${d.name}</button>`).join('')}
                </div></div>
                <div class="opt-row"><div class="opt-label">Duração<small>minutos reais por partida</small></div><div class="seg">
                  ${[3, 4, 6, 8].map(d => `<button data-action="set-duration" data-value="${d}" class="${this.setup.duration === d ? 'on' : ''}">${d} min</button>`).join('')}
                </div></div>
                <div class="opt-row"><div class="opt-label">Câmera</div><div class="seg">
                  ${[['dynamic', 'Dinâmica'], ['broadcast', 'TV'], ['close', 'Close'], ['top', 'Aérea'], ['player', 'Jogador']].map(([v, l]) => `<button data-action="set-camera" data-value="${v}" class="${this.setup.camera === v ? 'on' : ''}">${l}</button>`).join('')}
                </div></div>
                <div class="opt-row"><div class="opt-label">Tilt<small>Sensor de movimento do aparelho</small></div>
                  <div class="seg"><button data-action="toggle-tilt" class="${this.setup.tilt ? 'on' : ''}">${this.setup.tilt ? 'Ligado' : 'Desligado'}</button></div>
                </div>
                <div class="opt-row"><div class="opt-label">Replay automático</div>
                  <div class="seg"><button data-action="toggle-replay" class="${this.save.settings.replayAuto ? 'on' : ''}">${this.save.settings.replayAuto ? 'Sim' : 'Não'}</button></div>
                </div>
              </div>
              <button class="btn primary block" style="margin-top:18px" data-action="start-friendly">${this.icon('play')} COMEÇAR PARTIDA</button>
              <button class="btn block" style="margin-top:8px" data-action="multiplayer">${this.icon('users')} Jogar com um amigo</button>
            </div>
          </div>
        </div>`;
      };

      this.screens.teamSelect = () => {
        const ctx = this.ctx || {};
        let teams;
        if (ctx.pool) teams = ctx.pool.map(id => PES.getTeam(id)).filter(Boolean);
        else {
          const league = this.pick.league || 'all';
          if (league === 'all') teams = PES.teams.filter(t => !t.isNational);
          else if (league === 'national') teams = PES.nationalTeams;
          else teams = PES.teams.filter(t => t.leagueId === league);
        }
        const leagues = [{ id: 'all', name: 'Todos' }, ...PES.LEAGUES.map(l => ({ id: l.id, name: l.name })), { id: 'national', name: 'Seleções' }];
        const currentSide = ctx.side;
        return `
        <div>
          <div class="page-head"><div><p class="eyebrow">${ctx.title || 'Escolher time'}</p><h1 class="page-title">${ctx.title ? esc(ctx.title) : 'ESCOLHA SEU TIME'}</h1><p class="page-sub">${ctx.subtitle || 'Filtre por liga e toque em um clube para selecionar.'}</p></div></div>
          ${!ctx.pool ? `<div class="league-tabs">
            ${leagues.map(l => `<button data-action="filter-team-league" data-value="${l.id}" class="${(this.pick.league || 'all') === l.id ? 'on' : ''}">${esc(l.name)}</button>`).join('')}
          </div>` : ''}
          <div class="team-grid">
            ${teams.map(t => `<button class="team-card ${this.setup && this.setup[currentSide] === t.id ? 'selected' : ''}" data-action="select-team" data-team="${t.id}">
              ${this.crest(t, 42)}
              <div style="min-width:0"><b>${esc(t.name)}</b><small>${esc(t.leagueName || t.country)}${t.isNational ? ' · Seleção' : ''}</small></div>
              <span class="ovr">${t.rating}</span>
            </button>`).join('')}
          </div>
        </div>`;
      };

      this.screens.competitions = () => {
        const groups = [
          { title: 'Ligas nacionais', desc: 'Temporadas completas com tabela e rodadas', comps: PES.COMPETITIONS.filter(c => c.type === 'league') },
          { title: 'Copas continentais', desc: 'Mata-mata de gigantes', comps: PES.COMPETITIONS.filter(c => ['libertadores', 'champions'].includes(c.id)) },
          { title: 'Copas nacionais e torneios', desc: 'Mata-mata curto e imprevisível', comps: PES.COMPETITIONS.filter(c => ['copabrasil', 'torneio'].includes(c.id)) },
          { title: 'Seleções', desc: 'Copa do Mundo, Copa América e Eurocopa', comps: PES.COMPETITIONS.filter(c => ['mundial', 'copaamerica', 'euro'].includes(c.id)) }
        ];
        return `
        <div>
          <div class="page-head">
            <div><p class="eyebrow">Competições</p><h1 class="page-title">O CAMINHO ATÉ A TAÇA</h1><p class="page-sub">Dispute ligas completas, copas continentais e torneios de seleções. Cada competição tem tabela, calendário e premiação.</p></div>
            ${this.save.tournament ? `<button class="btn cyan" data-action="resume-tournament">${this.icon('play')} Continuar ${esc(PES.getCompetition(this.save.tournament.compId)?.name || '')}</button>` : ''}
          </div>
          ${groups.map(g => `<div class="section-title">${esc(g.title)}</div><div class="comp-grid">
            ${g.comps.map(c => `<button class="comp-card" data-action="open-comp" data-comp="${c.id}">
              <span class="cc-mark"></span>
              <span class="trophy-mark">${this.icon(c.type === 'league' ? 'shield' : 'trophy')}</span>
              <div class="cc-region">${esc(c.region)}${c.size ? ' · ' + c.size + ' times' : ''}</div>
              <h3>${esc(c.name)}</h3>
              <p>${esc(c.desc)}</p>
              <div class="cc-foot">${c.type === 'league' ? '<span class="chip cyan">Tabela</span><span class="chip">38 rodadas</span>' : '<span class="chip lime">Mata-mata</span>'}<span class="chip">${c.type === 'league' ? 'Liga' : 'Copa'}</span></div>
            </button>`).join('')}
          </div>`).join('')}
        </div>`;
      };

      this.screens.compSetup = () => {
        const comp = PES.getCompetition(this.ctx.compId);
        if (!comp) return '<div class="empty">Competição não encontrada.</div>';
        const pool = this.poolForComp(comp);
        const selected = this.compPick && this.compPick.compId === comp.id ? this.compPick.teamId : null;
        return `
        <div>
          <div class="page-head">
            <div><p class="eyebrow">${esc(comp.region)} · ${comp.type === 'league' ? 'Liga' : 'Copa'}</p><h1 class="page-title">${esc(comp.name)}</h1><p class="page-sub">${esc(comp.desc)}</p></div>
          </div>
          <div class="card" style="margin-bottom:16px">
            <div class="row wrap">
              <span class="chip lime">${this.icon('trophy')} ${comp.type === 'league' ? 'Tabela + rodadas' : 'Mata-mata'}</span>
              <span class="chip">${pool.length} equipes</span>
              <span class="chip cyan">${comp.type === 'league' ? '38 rodadas' : (pool.length === 16 ? 'Oitavas → Final' : 'Quartas → Final')}</span>
              ${this.save.tournament && this.save.tournament.compId === comp.id ? '<span class="chip green">Em andamento</span>' : ''}
            </div>
          </div>
          <div class="section-title">Escolha seu time</div>
          <div class="team-grid">
            ${pool.map(t => `<button class="team-card ${selected === t.id ? 'selected' : ''}" data-action="select-comp-team" data-team="${t.id}" data-comp="${comp.id}">
              ${this.crest(t, 42)}<div><b>${esc(t.name)}</b><small>${esc(t.leagueName || t.country)}</small></div><span class="ovr">${t.rating}</span>
            </button>`).join('')}
          </div>
          <div class="row" style="margin-top:18px;justify-content:flex-end">
            <button class="btn ${selected ? 'primary' : ''}" data-action="start-comp" data-comp="${comp.id}" ${selected ? '' : 'disabled'}>${this.icon('play')} Iniciar competição</button>
          </div>
        </div>`;
      };

      this.screens.compHub = () => {
        const state = this.save.tournament;
        if (!state) return '<div class="empty">Nenhuma competição ativa.</div>';
        const comp = PES.getCompetition(state.compId);
        const team = PES.getTeam(state.teamId);
        const next = this.nextTournamentFixture(state);
        const finished = state.finished;
        return `
        <div>
          <div class="page-head">
            <div><p class="eyebrow">${esc(comp.name)}</p><h1 class="page-title">${state.type === 'league' ? (finished ? 'TEMPORADA ENCERRADA' : 'SUA CAMPANHA') : (finished ? 'CAMPEÃO!' : 'MATA-MATA')}</h1>
              <p class="page-sub">${esc(team.name)} · ${state.type === 'league' ? `Rodada ${Math.min(state.round + 1, state.rounds.length)} de ${state.rounds.length}` : (state.champion ? 'A taça tem dono.' : 'Cada jogo pode ser o último.')}</p></div>
            <div class="row">${finished ? `<button class="btn primary" data-action="new-comp" data-comp="${comp.id}">Nova competição</button>` : `<button class="btn cyan" data-action="simulate-tournament">${this.icon('replay')} Simular rodada</button>`}</div>
          </div>
          ${finished ? `<div class="career-hero" style="--club:${PES.getTeam(state.champion || state.teamId)?.colors.primary || '#c9ff3d'};margin-bottom:16px">
            <div class="career-club">${this.crest(PES.getTeam(state.champion || state.teamId), 78)}<div><h2>${esc(PES.getTeam(state.champion || state.teamId)?.name || 'Campeão')}</h2><p>${esc(comp.name)} · ${state.type === 'league' ? 'Campeão da temporada' : 'Campeão do mata-mata'}</p></div></div>
            <div class="row" style="margin-top:16px"><span class="chip lime">${this.icon('trophy')} Troféu conquistado</span><span class="chip">${this.save.profile.coins} moedas</span></div>
          </div>` : ''}
          ${next ? `<div class="card" style="margin-bottom:16px">
            <div class="career-next">
              <div class="opp">${this.crest(PES.getTeam(next.opponent), 56)}<div><span class="muted">${next.home ? 'Em casa' : 'Fora de casa'} · ${esc(next.label)}</span><b>${esc(PES.getTeam(next.opponent)?.name || '')}</b><span>${esc(next.dateText)}</span></div></div>
              <button class="btn primary" data-action="play-tournament">${this.icon('play')} Jogar</button>
            </div>
          </div>` : ''}
          <div class="tabs"><button class="on">${state.type === 'league' ? 'Tabela' : 'Chaveamento'}</button></div>
          ${state.type === 'league' ? this.tableHTML(state, state.teamId) : this.bracketHTML(state)}
          ${state.type === 'league' ? `<div class="section-title">Seus jogos</div><div class="fixture-list">${this.userFixturesHTML(state)}</div>` : ''}
        </div>`;
      };

      this.screens.result = () => this.resultHTML(this.ctx);
    },

    /*__GAME_PART2__*/
  };

  window.PESGame = G;
})();
