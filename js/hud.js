/* HUD da partida: placar, estatísticas, overlays, controles touch e pausa. */

import { DIFFICULTIES, MENTALITIES, FORMATIONS, CAMERAS, WEATHERS } from './data.js';
import { Audio } from './audio.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

const PHRASES = {
  goal: ['GOOOOL! O estádio veio abaixo!', 'Que pintura! A torcida delira!', 'É gol! Que jogada sensacional!'],
  save: ['Defesaço do goleiro!', 'Que intervenção! Salvou o time!'],
  post: ['Na trave! Que azar!', 'No ferro! Faltou pouco!'],
  foul: ['Falta! O juiz não perdoou.', 'Entrada dura e falta marcada.'],
  chance: ['Perigo na área!', 'Grande jogada ofensiva!'],
  tackle: ['Desarme limpo no meio-campo!', 'Que carrinho! Recuperou a bola!'],
  ambient: ['A torcida empurra o time!', 'O jogo segue equilibrado.', 'Boa troca de passes no meio-campo.', 'O estádio está em festa hoje!']
};

export class MatchHud {
  constructor(root, engine) {
    this.root = root;
    this.engine = engine;
    this.lastPause = false;
    this.commentTimer = 0;
    this.commentLife = 0;
    this.lastFrame = 0;
    this.minimapTimer = 0;
    this.lastGoal = 0;
    this.lastRed = 0;
    this.lastState = '';
    this.mounted = false;
    this._commentary = '';
    this._commentaryKind = 'ambient';
    this.resizeHandler = () => this.updateOrientation();
  }

  crest(team, cls = '') {
    const shape = team.crest?.shape === 'round' ? 'shape-round' : team.crest?.shape === 'square' ? 'shape-square' : '';
    return `<span class="crest ${cls} ${shape}" style="--c1:${team.colors.primary};--c2:${team.crest?.fg || team.colors.secondary};--c3:${team.colors.secondary}"><span class="crest-star">★</span><span class="crest-abbr">${team.abbr}</span></span>`;
  }

  mount() {
    this.mounted = true;
    const e = this.engine;
    this.root.innerHTML = `
      <div class="scoreboard" id="scoreboard">
        <div class="sb-team home">
          ${this.crest(e.homeTeam)}
          <div><span>${e.homeTeam.abbr}</span><div class="sb-cards" id="cards-home"></div></div>
        </div>
        <div class="sb-score">
          <b id="score-home">0</b>
          <div class="sb-clock"><strong id="clock">00'</strong><small id="half-label">1º TEMPO</small></div>
          <b id="score-away">0</b>
        </div>
        <div class="sb-team away">
          ${this.crest(e.awayTeam)}
          <div><span>${e.awayTeam.abbr}</span><div class="sb-cards" id="cards-away"></div></div>
        </div>
      </div>
      <div class="match-top-right">
        <span class="match-tag weather" id="weather-tag">${e.weather.icon} ${e.weather.name.toUpperCase()}</span>
        <button class="match-btn" data-mact="camera" title="Trocar câmera">⌾</button>
        <button class="match-btn" data-mact="replay" title="Replay">↺</button>
        <button class="match-btn" data-mact="pause" title="Pausar">❚❚</button>
      </div>
      <div class="minimap"><canvas id="minimap" width="320" height="184"></canvas></div>
      <div class="commentary" id="commentary"><div class="c-ico">🎙</div><div class="c-copy"><b>NARRAÇÃO</b><span id="commentary-text">A bola rola no gramado!</span></div></div>
      <div class="stamina-wrap"><div class="st-label"><span>ENERGIA</span><span id="stamina-num">100%</span></div><div class="stamina-bar"><i id="stamina-bar"></i></div></div>
      <div class="kb-hint">
        <span><b>WASD / SETAS</b> mover</span>
        <span><b>ESPAÇO</b> passe · <b>J</b> chute</span>
        <span><b>K</b> drible/desarme · <b>SHIFT</b> correr</span>
        <span><b>C</b> trocar · <b>P</b> pausar</span>
      </div>
      <div class="match-hint" id="match-hint">JOYSTICK PARA MOVER · SEGURE CHUTE PARA ENCHER A BARRA</div>
      <div class="touch-control joystick" id="joystick"><div class="stick"></div></div>
      <div class="touch-control action-pad">
        <button class="act-btn act-pass" data-action="pass"><span class="ab-ico">⇢</span><b>PASSE</b></button>
        <button class="act-btn act-shoot" data-action="shoot"><span class="ab-ico">⚽</span><b>CHUTE</b><span class="charge-ring"></span></button>
        <button class="act-btn act-dribble" data-action="dribble"><span class="ab-ico">✦</span><b>DRIBLE</b></button>
        <button class="act-btn act-sprint" data-action="sprint"><span class="ab-ico">»</span><b>CORRER</b></button>
        <button class="act-btn act-switch" data-action="switch"><span class="ab-ico">⇄</span><b>TROCAR</b></button>
      </div>`;
    this.refs = {
      scoreHome: this.root.querySelector('#score-home'),
      scoreAway: this.root.querySelector('#score-away'),
      clock: this.root.querySelector('#clock'),
      half: this.root.querySelector('#half-label'),
      cardsHome: this.root.querySelector('#cards-home'),
      cardsAway: this.root.querySelector('#cards-away'),
      commentary: this.root.querySelector('#commentary'),
      commentaryText: this.root.querySelector('#commentary-text'),
      staminaBar: this.root.querySelector('#stamina-bar'),
      staminaNum: this.root.querySelector('#stamina-num'),
      minimap: this.root.querySelector('#minimap'),
      weather: this.root.querySelector('#weather-tag'),
      hint: this.root.querySelector('#match-hint')
    };
    this.bind();
    this.updateOrientation();
    window.addEventListener('resize', this.resizeHandler);
    setTimeout(() => { if (this.refs.hint) this.refs.hint.style.opacity = '.35'; }, 6000);
  }

  bind() {
    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mact]');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      const act = btn.dataset.mact;
      Audio.sfx('click');
      const eng = this.engine;
      if (act === 'pause') eng.togglePause();
      else if (act === 'resume') eng.resume();
      else if (act === 'subs') eng.openSubs();
      else if (act === 'tactics') eng.openTactics();
      else if (act === 'camera') eng.cycleCamera();
      else if (act === 'replay') eng.playReplay();
      else if (act === 'exit') { if (confirm('Sair da partida? O progresso deste jogo será perdido.')) eng.exitMatch(); }
      else if (act === 'continue-half') eng.startSecondHalf();
      else if (act === 'close-subs') this.closeSubs();
      else if (act === 'close-tactics') this.closeTactics();
      else if (act === 'sub-tab') eng.selectSubTab(btn.dataset.side);
      else if (act === 'sub-out') { eng.chooseSub('out', btn.dataset.id); }
      else if (act === 'sub-in') { eng.chooseSub('in', btn.dataset.id); }
      else if (act === 'confirm-sub') eng.confirmSub();
      else if (act === 'formation') eng.setFormation(btn.dataset.side, btn.dataset.formation);
      else if (act === 'mentality') eng.setMentality(btn.dataset.side, btn.dataset.mentality);
      else if (act === 'shootout-continue') eng.finishShootout();
      else if (act === 'continue-pause') { /* noop */ }
    });
    const actionDown = (e) => {
      const btn = e.target.closest('.act-btn');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      btn.classList.add('is-down');
      const act = btn.dataset.action;
      const eng = this.engine;
      if (act === 'pass') eng.doPass(eng.userSide);
      else if (act === 'shoot') { btn.classList.add('is-charging'); eng.shootStart(eng.userSide); }
      else if (act === 'dribble') eng.doTackleOrDribble(eng.userSide);
      else if (act === 'switch') eng.switchPlayer(eng.userSide);
      else if (act === 'sprint') { eng.action.sprint = true; }
    };
    const actionUp = (e) => {
      const btn = e.target.closest('.act-btn');
      if (!btn) return;
      btn.classList.remove('is-down');
      const act = btn.dataset.action;
      const eng = this.engine;
      if (act === 'shoot') { btn.classList.remove('is-charging'); eng.shootRelease(eng.userSide); }
      else if (act === 'sprint') eng.action.sprint = false;
    };
    this.root.addEventListener('pointerdown', actionDown);
    this.root.addEventListener('pointerup', actionUp);
    this.root.addEventListener('pointercancel', (e) => {
      const btn = e.target.closest('.act-btn');
      if (btn) { btn.classList.remove('is-down', 'is-charging'); this.engine.action.sprint = false; }
    });
    const joy = this.root.querySelector('#joystick');
    if (joy) {
      const stick = joy.querySelector('.stick');
      const move = (clientX, clientY, e) => {
        e?.preventDefault?.();
        const rect = joy.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = clientX - cx, dy = clientY - cy;
        const max = rect.width * .31;
        const len = Math.hypot(dx, dy);
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.engine.joystick.x = dx / max;
        this.engine.joystick.z = dy / max;
        this.engine.joystick.active = true;
      };
      joy.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        joy.setPointerCapture?.(e.pointerId);
        this.engine.joystick.id = e.pointerId;
        move(e.clientX, e.clientY, e);
      });
      joy.addEventListener('pointermove', (e) => {
        if (this.engine.joystick.id !== e.pointerId) return;
        move(e.clientX, e.clientY, e);
      });
      const end = (e) => {
        if (this.engine.joystick.id !== e.pointerId && this.engine.joystick.id !== null) return;
        this.engine.joystick.id = null;
        this.engine.joystick.active = false;
        this.engine.joystick.x = 0;
        this.engine.joystick.z = 0;
        stick.style.transform = 'translate(-50%, -50%)';
      };
      joy.addEventListener('pointerup', end);
      joy.addEventListener('pointercancel', end);
      joy.addEventListener('lostpointercapture', end);
    }
  }

  updateOrientation() {
    const rootEl = document.getElementById('match-root');
    if (!rootEl) return;
    rootEl.classList.toggle('portrait-hint', window.innerHeight > window.innerWidth && window.innerWidth < 800);
  }

  update(dt) {
    const e = this.engine;
    const refs = this.refs;
    this.commentTimer -= dt;
    this.commentLife -= dt;
    if (this.commentLife <= 0) refs.commentary.classList.remove('is-visible');
    if (!refs.scoreHome) return;
    if (refs.scoreHome.textContent !== String(e.score.home)) refs.scoreHome.textContent = e.score.home;
    if (refs.scoreAway.textContent !== String(e.score.away)) refs.scoreAway.textContent = e.score.away;
    const mins = Math.floor(e.minute);
    refs.clock.textContent = `${String(mins).padStart(2, '0')}'`;
    refs.half.textContent = e.training ? 'TREINO' : e.half === 1 ? '1º TEMPO' : '2º TEMPO';
    const ch = e.sides.home.lineup.filter(p => !p.sentOff && p.card > 0).length;
    const ca = e.sides.away.lineup.filter(p => !p.sentOff && p.card > 0).length;
    if (this.lastCardsHome !== ch) { this.lastCardsHome = ch; refs.cardsHome.innerHTML = '<i></i>'.repeat(ch); }
    if (this.lastCardsAway !== ca) { this.lastCardsAway = ca; refs.cardsAway.innerHTML = '<i></i>'.repeat(ca); }

    const ctrl = e.getControlled(e.userSide) || e.players.find(p => p.side === e.userSide);
    if (ctrl) {
      refs.staminaBar.style.width = `${Math.max(0, ctrl.stamina)}%`;
      refs.staminaNum.textContent = `${Math.round(ctrl.stamina)}%`;
      refs.staminaBar.style.background = ctrl.stamina < 30 ? 'linear-gradient(90deg,#ff7b3c,#ff4a5a)' : 'linear-gradient(90deg,#36e5c0,#c8ff3d)';
    }

    // state-driven overlays
    if (e.state !== 'intro') {
      const intro = this.root.querySelector('#match-intro');
      if (intro) intro.remove();
    }
    if (e.state === 'goal') {
      if (this.lastGoal !== e.score.home + e.score.away) {
        this.lastGoal = e.score.home + e.score.away;
        this.say('goal', 5);
      }
    }
    if (e.cardBanner && e.cardBanner.life > 2.2) {
      this.say(e.cardBanner.card === 'red' ? 'foul' : 'foul', 3);
    }
    if (e.state === 'penalty' && this.lastState !== 'penalty') {
      this.say('chance', 4);
    }
    this.lastState = e.state;

    // contextual commentary
    if (this.commentTimer <= 0 && e.state === 'play') {
      this.commentTimer = 9 + Math.random() * 7;
      if (Math.random() < .68) this.say('ambient', 3);
    }

    // charge ring
    const shootBtn = this.root.querySelector('.act-shoot');
    if (shootBtn) {
      const st = e.userSide === 'home' ? e.action : e.action2;
      shootBtn.classList.toggle('is-charging', !!st.chargeHeld);
      shootBtn.style.setProperty('--charge', `${st.charge * 100}%`);
      const ring = shootBtn.querySelector('.charge-ring');
      if (ring) ring.style.clipPath = `inset(0 ${100 - st.charge * 100}% 0 0)`;
    }

    this.minimapTimer += dt;
    if (this.minimapTimer > .16) { this.minimapTimer = 0; this.drawMinimap(); }
  }

  say(kind, duration = 3) {
    const arr = PHRASES[kind] || PHRASES.ambient;
    let text = arr[Math.floor(Math.random() * arr.length)];
    if (this.engine.scorerBanner) text = `${this.engine.scorerBanner.name} marca para ${this.engine.scorerBanner.team}!`;
    this.refs.commentaryText.textContent = text;
    this.refs.commentary.classList.add('is-visible');
    this.commentLife = duration;
    this._commentary = text;
  }

  drawMinimap() {
    const cv = this.refs.minimap;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const e = this.engine;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d3a24'); g.addColorStop(1, '#0a291a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(220,255,235,.35)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.beginPath(); ctx.moveTo(w / 2, 8); ctx.lineTo(w / 2, h - 8); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 18, 0, TAU); ctx.stroke();
    const map = (x, z) => ({ x: 8 + (x - 80) / 1440 * (w - 16), y: 8 + (z - 38) / 594 * (h - 16) });
    for (const p of e.players) {
      if (p.sentOff) continue;
      const q = map(p.x, p.z);
      ctx.fillStyle = e.sides[p.side].team.colors.primary;
      ctx.beginPath(); ctx.arc(q.x, q.y, p.controlled ? 3.4 : 2.3, 0, TAU); ctx.fill();
      if (p.controlled) { ctx.strokeStyle = '#c8ff3d'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    const b = map(e.ball.x, e.ball.z);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,61,.9)'; ctx.lineWidth = 1; ctx.stroke();
  }

  showIntro() {
    const e = this.engine;
    const side = e.userSide === 'cpu' ? 'home' : e.userSide;
    const team = side === 'home' ? e.homeTeam : e.awayTeam;
    const opp = side === 'home' ? e.awayTeam : e.homeTeam;
    this.remove('#match-intro');
    const div = document.createElement('div');
    div.className = 'match-overlay';
    div.id = 'match-intro';
    div.innerHTML = `
      <div class="mo-card">
        <div class="mo-kicker">${e.opts.competitionName || 'AMISTOSO INTERNACIONAL'}</div>
        <div class="mo-title">${e.stadium.name}<br><span>${e.weather.name}</span></div>
        <div class="mo-teams">
          <div class="mo-team">${this.crest(team, 'crest-xl')}<span>${team.name}</span></div>
          <div class="mo-vs">VS</div>
          <div class="mo-team">${this.crest(opp, 'crest-xl')}<span>${opp.name}</span></div>
        </div>
        <div class="mo-footer">${e.training ? 'TREINO LIVRE' : `${e.halfLength} MIN POR TEMPO`} · ${e.difficulty.name.toUpperCase()} · ${(e.opts.competitionName || 'AMISTOSO').toUpperCase()}</div>
      </div>`;
    this.root.appendChild(div);
  }

  showGoal(team, scorer, ownGoal) {
    this.remove('#goal-overlay');
    const div = document.createElement('div');
    div.className = 'goal-overlay';
    div.id = 'goal-overlay';
    div.innerHTML = `
      <div class="goal-flash" style="--goal-color:${team.colors.primary}"></div>
      <div class="goal-title" style="--goal-color:${team.colors.primary}">
        <div class="gt-kicker">${this.engine.half === 1 ? '1º TEMPO' : '2º TEMPO'}</div>
        <h1>G<em>O</em>L!</h1>
        <div class="gt-team">${team.name}</div>
        <div class="gt-scorer">${scorer && !ownGoal ? `${scorer.data.name} · ${Math.round(this.engine.minute)}'` : ownGoal ? 'GOL CONTRA' : ''}</div>
      </div>`;
    this.root.appendChild(div);
  }

  hideGoal() { this.remove('#goal-overlay'); }

  showCard(p, card) {
    const el = document.createElement('div');
    el.className = 'match-tag';
    el.style.cssText = `position:absolute;top:48%;left:50%;transform:translate(-50%,-50%);z-index:26;padding:10px 18px;font-size:10px;letter-spacing:1px;font-family:var(--mono);color:#fff;background:rgba(4,10,7,.92);border:1px solid ${card === 'red' ? '#ff4a5a' : '#ffd84a'};border-radius:8px;`;
    el.textContent = `${card === 'red' ? 'CARTÃO VERMELHO' : 'CARTÃO AMARELO'} · ${p.data.name}`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  showPenaltyHint(side) {
    const el = document.createElement('div');
    el.className = 'match-hint';
    el.style.bottom = '120px';
    el.textContent = side === this.engine.userSide ? 'PÊNALTI! MIRE COM O JOYSTICK E SEGURE CHUTE' : 'PÊNALTI PARA O ADVERSÁRIO';
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  showReplayTag() {
    if (this.root.querySelector('#replay-tag')) return;
    const el = document.createElement('div');
    el.id = 'replay-tag';
    el.className = 'match-tag';
    el.style.cssText = 'position:absolute;top:64px;left:50%;transform:translateX(-50%);color:#c8ff3d;border-color:rgba(200,255,61,.4);padding:6px 12px;letter-spacing:2px;';
    el.textContent = '● REPLAY';
    this.root.appendChild(el);
  }

  hideReplayTag() { this.remove('#replay-tag'); }

  showHalftime() {
    this.remove('#halftime-overlay');
    const e = this.engine;
    const st = e.stats;
    const poss = e.possessionPct();
    const div = document.createElement('div');
    div.className = 'match-overlay';
    div.id = 'halftime-overlay';
    div.innerHTML = `
      <div class="pause-card" style="text-align:center">
        <div class="mo-kicker" style="font-family:var(--mono);font-size:9px;letter-spacing:4px;color:var(--teal)">INTERVALO</div>
        <h2 style="margin:8px 0 2px">Fim do primeiro tempo</h2>
        <div class="result-scoreline" style="margin:14px 0">
          <div class="rs-team">${this.crest(e.homeTeam)}<span>${e.homeTeam.name}</span></div>
          <div class="rs-score">${e.score.home}<small> × </small>${e.score.away}</div>
          <div class="rs-team">${this.crest(e.awayTeam)}<span>${e.awayTeam.name}</span></div>
        </div>
        <div style="text-align:left;margin-top:10px">
          ${this.statLine('Posse de bola', Math.round(poss.home) + '%', Math.round(poss.away) + '%', poss.home, poss.away)}
          ${this.statLine('Finalizações', st.home.shots, st.away.shots, st.home.shots, st.away.shots)}
          ${this.statLine('No alvo', st.home.onTarget, st.away.onTarget, st.home.onTarget, st.away.onTarget)}
          ${this.statLine('Passes', st.home.passes, st.away.passes, st.home.passes, st.away.passes)}
        </div>
        <div class="row" style="justify-content:center;margin-top:18px;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-mact="subs">Substituições</button>
          <button class="btn btn-ghost btn-sm" data-mact="tactics">Táticas</button>
          <button class="btn btn-primary" data-mact="continue-half">Iniciar 2º tempo</button>
        </div>
        <div class="mo-footer" style="margin-top:14px">Os jogadores voltam para o segundo tempo</div>
      </div>`;
    this.root.appendChild(div);
  }

  statLine(label, a, b, av, bv) {
    const total = Math.max(1, Number(av) + Number(bv));
    const pa = Number(av) / total * 100;
    return `<div class="match-stat-line"><b>${a}</b><div><div class="msl-bar"><i style="width:${pa}%"></i><i style="width:${100 - pa}%"></i></div><div class="msl-label">${label}</div></div><b>${b}</b></div>`;
  }

  hideHalftime() { this.remove('#halftime-overlay'); }

  showPause() {
    this.remove('#pause-overlay');
    const e = this.engine;
    const poss = e.possessionPct();
    const div = document.createElement('div');
    div.className = 'pause-overlay';
    div.id = 'pause-overlay';
    div.innerHTML = `
      <div class="pause-card">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div>
            <h2>Pausa</h2>
            <div class="pause-sub">${e.homeTeam.name} ${e.score.home} × ${e.score.away} ${e.awayTeam.name} · ${Math.floor(e.minute)}'</div>
          </div>
          <span class="pill lime">${e.difficulty.name}</span>
        </div>
        <div class="grid grid-3" style="gap:8px">
          <div class="panel" style="padding:12px"><div class="kicker">POSSE</div><div style="font-family:var(--display);font-size:20px">${Math.round(poss.home)}<small style="font-size:10px;color:var(--dim)">%</small> <span style="color:var(--dim)">×</span> ${Math.round(poss.away)}<small style="font-size:10px;color:var(--dim)">%</small></div></div>
          <div class="panel" style="padding:12px"><div class="kicker">FINALIZAÇÕES</div><div style="font-family:var(--display);font-size:20px">${e.stats.home.shots} <span style="color:var(--dim)">×</span> ${e.stats.away.shots}</div></div>
          <div class="panel" style="padding:12px"><div class="kicker">FALTAS</div><div style="font-family:var(--display);font-size:20px">${e.stats.home.fouls} <span style="color:var(--dim)">×</span> ${e.stats.away.fouls}</div></div>
        </div>
        <div class="pause-actions">
          <button class="btn btn-primary" data-mact="resume">▶ Continuar</button>
          <button class="btn" data-mact="subs">⇄ Substituições</button>
          <button class="btn" data-mact="tactics">◈ Táticas</button>
          <button class="btn" data-mact="camera">⌾ Câmera: ${CAMERAS.find(c => c.id === e.cameraMode)?.name || 'TV'}</button>
          <button class="btn" data-mact="replay">↺ Replay</button>
          <button class="btn btn-danger" data-mact="exit">Sair da partida</button>
        </div>
        <div class="divider"></div>
        <div class="row wrap" style="justify-content:space-between">
          <span class="kicker">${WEATHERS.find(w => w.id === e.weather.id)?.name} · ${e.stadium.name}</span>
          <span class="kicker">${e.twoPlayer ? '2 JOGADORES' : '1 JOGADOR'} · ${e.userSide === 'cpu' ? 'CPU VS CPU' : 'MODO CARREIRA'}</span>
        </div>
      </div>`;
    this.root.appendChild(div);
  }

  hidePause() { this.remove('#pause-overlay'); }

  showSubs(side = 'home') {
    this.remove('#subs-overlay');
    const e = this.engine;
    const cfg = e.sides[side];
    const onField = cfg.lineup.filter(p => !p.sentOff);
    const bench = cfg.bench;
    const selOut = e.subState.out, selIn = e.subState.in;
    const row = (p, kind) => {
      const selected = kind === 'out' ? selOut === p.id : selIn === p.id;
      return `<button class="player-row ${selected ? 'is-selected' : ''}" data-mact="${kind === 'out' ? 'sub-out' : 'sub-in'}" data-id="${p.id}">
        <span class="pr-num">${p.num}</span><span class="pr-pos">${p.pos}</span>
        <span class="pr-name">${p.data.name}</span>
        <span class="pr-meta">${p.data.age} anos</span>
        <span class="pr-ovr">${p.data.rating}</span>
      </button>`;
    };
    const div = document.createElement('div');
    div.className = 'sub-overlay';
    div.id = 'subs-overlay';
    div.innerHTML = `
      <div class="sub-card">
        <div class="row" style="justify-content:space-between;margin-bottom:12px">
          <div><div class="kicker">SUBSTITUIÇÕES · ${e.substitutions[side]}/${e.maxSubs}</div><h2 style="margin:4px 0 0;font-family:var(--display);font-style:italic;text-transform:uppercase">${cfg.team.name}</h2></div>
          <button class="modal-close" data-mact="close-subs">×</button>
        </div>
        <div class="tabs" style="margin-bottom:12px">
          <button class="tab ${side === 'home' ? 'is-active' : ''}" data-mact="sub-tab" data-side="home">${e.homeTeam.abbr} · Casa</button>
          <button class="tab ${side === 'away' ? 'is-active' : ''}" data-mact="sub-tab" data-side="away">${e.awayTeam.abbr} · Fora</button>
        </div>
        <div class="grid grid-2" style="gap:14px">
          <div><div class="kicker" style="margin-bottom:6px">EM CAMPO · escolha quem sai</div><div class="player-list">${onField.map(p => row(p, 'out')).join('')}</div></div>
          <div><div class="kicker" style="margin-bottom:6px">BANCO · escolha quem entra</div><div class="player-list">${bench.map(p => row(p, 'in')).join('') || '<div class="empty-state"><p>Sem jogadores no banco.</p></div>'}</div></div>
        </div>
        <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
          <span class="kicker">${selOut ? 'Saída selecionada' : 'Selecione a saída'} → ${selIn ? 'Entrada selecionada' : 'Selecione a entrada'}</span>
          <button class="btn btn-primary btn-sm" data-mact="confirm-sub">Confirmar substituição</button>
        </div>
      </div>`;
    this.root.appendChild(div);
  }

  closeSubs() {
    this.remove('#subs-overlay');
    const e = this.engine;
    if (e.paused) this.showPause();
    else if (e.state === 'halftime') this.showHalftime();
  }

  showTactics() {
    this.remove('#tactics-overlay');
    const e = this.engine;
    const formationBtns = (side) => Object.entries(FORMATIONS).map(([id, f]) => `
      <button class="tab ${e.sides[side].formationId === id ? 'is-active' : ''}" data-mact="formation" data-side="${side}" data-formation="${id}">${id}</button>`).join('');
    const mentalityBtns = (side) => MENTALITIES.map(m => `
      <button class="tab ${e.sides[side].mentality === m.id ? 'is-active' : ''}" data-mact="mentality" data-side="${side}" data-mentality="${m.id}">${m.name}</button>`).join('');
    const div = document.createElement('div');
    div.className = 'sub-overlay';
    div.id = 'tactics-overlay';
    div.innerHTML = `
      <div class="sub-card" style="width:min(94vw,880px)">
        <div class="row" style="justify-content:space-between;margin-bottom:14px">
          <div><div class="kicker">TÁTICAS DA EQUIPE</div><h2 style="margin:4px 0 0;font-family:var(--display);font-style:italic;text-transform:uppercase">Ajustes de jogo</h2></div>
          <button class="modal-close" data-mact="close-tactics">×</button>
        </div>
        <div class="grid grid-2" style="gap:16px">
          ${['home', 'away'].map(side => `
            <div class="panel" style="padding:14px">
              <div class="row" style="margin-bottom:8px">${this.crest(e.sides[side].team, 'crest-sm')}<b style="font-size:11px">${e.sides[side].team.name}</b></div>
              <div class="kicker" style="margin:10px 0 5px">FORMAÇÃO</div>
              <div class="seg">${formationBtns(side)}</div>
              <div class="kicker" style="margin:12px 0 5px">POSTURA</div>
              <div class="seg">${mentalityBtns(side)}</div>
              <div class="divider"></div>
              <div class="kicker">${MENTALITIES.find(m => m.id === e.sides[side].mentality)?.desc || ''}</div>
            </div>`).join('')}
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:14px">
          <button class="btn btn-primary btn-sm" data-mact="close-tactics">Aplicar e voltar</button>
        </div>
      </div>`;
    this.root.appendChild(div);
    Audio.sfx('navigate');
  }

  closeTactics() {
    this.remove('#tactics-overlay');
    const e = this.engine;
    if (e.paused) this.showPause();
    else if (e.state === 'halftime') this.showHalftime();
  }

  showShootout(so) {
    this.remove('#shootout-overlay');
    const e = this.engine;
    const dots = (kicks) => kicks.map(k => `<span style="color:${k.scored ? '#c8ff3d' : '#ff4a5a'}">${k.scored ? '●' : '×'}</span>`).join(' ');
    const div = document.createElement('div');
    div.className = 'match-overlay';
    div.id = 'shootout-overlay';
    div.innerHTML = `
      <div class="pause-card" style="text-align:center;max-width:640px">
        <div class="mo-kicker">DISPUTA DE PÊNALTIS</div>
        <h2 style="margin:8px 0">${e.homeTeam.name} <span style="color:var(--lime)">${so.home}</span> × <span style="color:var(--teal)">${so.away}</span> ${e.awayTeam.name}</h2>
        <div class="grid grid-2" style="text-align:left;margin-top:16px">
          <div class="panel" style="padding:14px"><div class="kicker">${e.homeTeam.abbr}</div><div style="font-size:20px;letter-spacing:5px;margin:8px 0">${dots(so.homeKicks)}</div><div class="small muted">${so.homeKicks.map(k => k.scored ? `${k.player} ✓` : `${k.player} ×`).join('<br>')}</div></div>
          <div class="panel" style="padding:14px"><div class="kicker">${e.awayTeam.abbr}</div><div style="font-size:20px;letter-spacing:5px;margin:8px 0">${dots(so.awayKicks)}</div><div class="small muted">${so.awayKicks.map(k => k.scored ? `${k.player} ✓` : `${k.player} ×`).join('<br>')}</div></div>
        </div>
        <button class="btn btn-primary" style="margin-top:18px" data-mact="shootout-continue">Ver resultado</button>
      </div>`;
    this.root.appendChild(div);
  }

  hideAll() {
    for (const sel of ['#pause-overlay', '#subs-overlay', '#tactics-overlay', '#halftime-overlay', '#goal-overlay', '#shootout-overlay', '#match-intro', '#replay-tag']) this.remove(sel);
  }

  remove(sel) { this.root.querySelectorAll(sel).forEach(el => el.remove()); }

  toast(text, icon = '✓') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.cssText = 'position:absolute;top:80px;left:50%;transform:translateX(-50%);z-index:30;';
    el.innerHTML = `<span class="t-ico">${icon}</span><span>${text}</span>`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }
}
