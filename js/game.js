import { RNG } from './util.js';
import {
  createWorld, DEFAULT_SETTINGS, defaultProfile, SAVE_VERSION, GAME_VERSION,
  getTeam, leagueTeams, allClubTeams, nationalTeams, classicTeams, competitionsFor,
  stadiumById, autoLineup, teamOverall, getFormation, isStadiumUnlocked, isTeamUnlocked,
  FORMATIONS, UNLOCKABLES
} from './data.js';
import { Match, FIELD } from './match.js';
import { Renderer } from './render.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { SaveSystem } from './save.js';
import {
  createCompetition, createLeagueCompetition, nextUserFixture, fixtureForTeam,
  recordResult, simulateOtherFixtures, simulateRestOfRound, simulateCupToEnd,
  progress, userPosition, currentRound, allFixtures, compMeta
} from './career.js';
import { UI, esc } from './ui.js';
import {
  menuScreen, quickScreen, settingsScreen, storeScreen, editorScreen, editorTeamScreen,
  profileScreen, savesScreen, creditsScreen, computeOverall, POSITIONS, CAMERA_NAMES
} from './screens.js';
import {
  competitionsScreen, compDetailScreen, compHubScreen, masterNewScreen, masterHubScreen,
  legendNewScreen, legendHubScreen, trainingScreen, transfersScreen, resultScreen, statBars
} from './screens-career.js';

export class Game {
  constructor() {
    this.profile = null;
    this.world = null;
    this.competition = null;
    this.career = null;
    this.mode = 'quick';
    this.currentMatch = null;
    this.matchContext = null;
    this.finishedMatch = null;
    this.resultShown = false;
    this.lastResult = null;
    this.lastTime = 0;
    this.rotateDismissed = false;
    this.isTouch = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches;
    this.quick = {
      local: false, side: 'home', tab: 'clubs', leagueId: 'brasileirao',
      home: null, away: null, difficulty: 2, time: 360, weather: 'auto',
      camera: 'dynamic', stadium: 'auto', autoReplay: true
    };
    this.compPick = null;
    this.masterPick = { leagueId: 'brasileirao', teamId: null };
    this.editorTeamId = null;
    this.transferClubId = null;
    this._editingPlayer = null;
    this.pendingDeleteSlot = null;
  }

  async start() {
    this.save = new SaveSystem();
    const savedProfile = this.save.loadProfile();
    this.profile = savedProfile || defaultProfile();
    this.profile.settings = { ...DEFAULT_SETTINGS, ...(this.profile.settings || {}) };
    this.quick.difficulty = this.profile.settings.difficulty || 2;
    this.quick.time = this.profile.settings.time || 360;
    this.quick.weather = this.profile.settings.weather || 'auto';
    this.quick.camera = this.profile.settings.camera || 'dynamic';
    this.quick.autoReplay = this.profile.settings.autoReplay !== false;
    this.audio = new AudioEngine();
    this.audio.setSettings(this.profile.settings);
    this.input = new Input({ onPause: () => this.togglePause() });
    this.renderer = new Renderer(
      document.getElementById('game-canvas'),
      document.getElementById('bg-canvas'),
      this.audio
    );
    this.ui = new UI(this);
    this.ui.setScreen(`<div class="boot">
      <div class="boot-logo">PES 2027<span>STICKMAN 2D</span></div>
      <div class="boot-bar"><i id="boot-bar" style="width:12%"></i></div>
      <div class="boot-note" id="boot-note">Gerando o mundo do futebol...</div>
    </div>`);
    await new Promise(r => setTimeout(r, 60));
    this.world = createWorld('pes2027-stickman');
    const barEl = document.getElementById('boot-bar');
    const noteEl = document.getElementById('boot-note');
    if (barEl) barEl.style.width = '46%';
    if (noteEl) noteEl.textContent = 'Carregando salvamento...';
    await this.save.init();
    await new Promise(r => setTimeout(r, 40));
    const loaded = await this.save.loadSlot(this.profile.slot || 0);
    if (loaded && loaded.world && loaded.world.teams) {
      this.world = loaded.world;
      this.competition = loaded.competition || null;
      this.career = loaded.career || null;
      this.mode = loaded.mode || 'quick';
      if (this.career?.comp) this.competition = this.career.comp;
    }
    if (barEl) barEl.style.width = '100%';
    if (noteEl) noteEl.textContent = 'Pronto!';
    this.audio.setSettings(this.profile.settings);
    this.audio.setEpic((this.profile.unlocked || []).includes('commentary-epic'));
    this.refreshTouch();
    this.updateOrientation();
    this.bind();
    window.addEventListener('resize', () => this.updateOrientation());
    window.addEventListener('orientationchange', () => setTimeout(() => this.updateOrientation(), 120));
    setTimeout(() => this.showMenu(), 260);
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.frame(t));
  }

  bind() {
    this.ui.root.addEventListener('click', e => {
      const modalBtn = e.target.closest('[data-modal-action]');
      if (modalBtn) {
        e.preventDefault();
        this.audio.init(); this.audio.click();
        this.handleModal(modalBtn.dataset.modalAction);
        return;
      }
      const el = e.target.closest('[data-nav],[data-act]');
      if (!el) return;
      e.preventDefault();
      this.audio.init();
      this.audio.click();
      if (el.dataset.nav) this.navigate(el.dataset.nav, el);
      else if (el.dataset.act) this.action(el.dataset.act, el);
    });
    this.ui.root.addEventListener('change', e => this.onFieldChange(e));
    this.ui.root.addEventListener('input', e => this.onFieldInput(e));
    this.ui.modalLayer?.addEventListener('click', e => {
      const modalBtn = e.target.closest('[data-modal-action]');
      if (!modalBtn) return;
      e.preventDefault();
      this.audio.init(); this.audio.click();
      this.handleModal(modalBtn.dataset.modalAction);
    });
    this.ui.modalLayer?.addEventListener('change', e => this.onFieldChange(e));
    this.ui.modalLayer?.addEventListener('input', e => this.onFieldInput(e));
    document.querySelectorAll('[data-hud]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.init(); this.audio.click();
        const kind = btn.dataset.hud;
        if (kind === 'pause') this.togglePause();
        else if (kind === 'stats') this.statsModal();
        else if (kind === 'camera') this.cycleCamera();
      });
    });
    document.getElementById('game-canvas')?.addEventListener('pointerdown', () => {
      if (this.currentMatch?.phase === 'replay') this.currentMatch.skipReplay();
    });
    window.addEventListener('keydown', e => {
      if (!this.currentMatch) return;
      if ((e.code === 'Space' || e.code === 'Enter') && this.currentMatch.phase === 'replay') {
        this.currentMatch.skipReplay();
        e.preventDefault();
      }
    });
  }

  refreshTouch() {
    this.touchEnabled = this.isTouch || !!this.profile?.settings.forceTouch;
    this.input?.setTouchVisible(!!this.currentMatch && this.touchEnabled);
  }

  updateOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    const show = portrait && this.isTouch && !this.rotateDismissed && !this.currentMatch;
    this.ui.rotateHint?.classList.toggle('hidden', !show);
  }

  frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (this.currentMatch) {
      const m = this.currentMatch;
      m.update(dt);
      this.renderer.draw(m, dt);
      this.ui.setHUD(m);
    } else {
      this.renderer.drawMenuBackground(dt);
    }
    this.input.endFrame();
    requestAnimationFrame(t => this.frame(t));
  }

  navigate(name, el) {
    this.audio.init();
    if (name !== 'quick' && name !== 'local') this.quick.local = false;
    switch (name) {
      case 'menu': this.showMenu(); break;
      case 'quick': this.quick.local = false; this.ui.setScreen(quickScreen(this)); break;
      case 'local': this.quick.local = true; this.ui.setScreen(quickScreen(this)); break;
      case 'competitions': this.ui.setScreen(competitionsScreen(this)); break;
      case 'master': this.mode === 'master' ? this.masterHubScreen() : this.ui.setScreen(masterNewScreen(this)); break;
      case 'legend': this.mode === 'legend' ? this.legendHubScreen() : this.ui.setScreen(legendNewScreen(this)); break;
      case 'training': this.ui.setScreen(trainingScreen(this)); break;
      case 'store': this.ui.setScreen(storeScreen(this)); break;
      case 'settings': this.ui.setScreen(settingsScreen(this)); break;
      case 'editor': this.ui.setScreen(editorScreen(this)); break;
      case 'credits': this.ui.setScreen(creditsScreen()); break;
      case 'saves': this.savesScreen(); break;
      case 'profile': this.ui.setScreen(profileScreen(this)); break;
      case 'comp-detail': this.ui.setScreen(compDetailScreen(this)); break;
      case 'comp-hub': this.compHubScreen(); break;
      case 'master-new': this.ui.setScreen(masterNewScreen(this)); break;
      case 'legend-new': this.ui.setScreen(legendNewScreen(this)); break;
      case 'editor-team': this.ui.setScreen(editorTeamScreen(this)); break;
      case 'transfers': this.ui.setScreen(transfersScreen(this)); break;
      default: this.showMenu();
    }
  }

  action(act, el) {
    switch (act) {
      case 'continue-mode': this.continueMode(); break;
      case 'quick-side': this.quick.side = el.dataset.side === 'away' ? 'away' : 'home'; this.ui.setScreen(quickScreen(this)); break;
      case 'quick-tab': this.quick.tab = el.dataset.tab || 'clubs'; this.ui.setScreen(quickScreen(this)); break;
      case 'quick-league': this.quick.leagueId = el.dataset.league || 'brasileirao'; this.ui.setScreen(quickScreen(this)); break;
      case 'pick-team': this.pickQuickTeam(el.dataset.team); break;
      case 'swap-quick': { const h = this.quick.home; this.quick.home = this.quick.away; this.quick.away = h; this.ui.setScreen(quickScreen(this)); break; }
      case 'random-quick': this.randomQuick(); break;
      case 'start-quick': this.startQuick(); break;
      case 'open-comp': this.openComp(el.dataset.id); break;
      case 'comp-team': this.compPick.teamId = el.dataset.team; this.ui.setScreen(compDetailScreen(this)); break;
      case 'start-comp': this.startCompetition(); break;
      case 'sim-round': this.simulateRound(); break;
      case 'sim-rest': this.simulateRest(); break;
      case 'new-season': this.newSeason(); break;
      case 'open-match': this.openMatch(); break;
      case 'master-league': this.masterPick.leagueId = el.dataset.league || 'brasileirao'; this.masterPick.teamId = null; this.ui.setScreen(masterNewScreen(this)); break;
      case 'master-team': this.masterPick.teamId = el.dataset.team; this.ui.setScreen(masterNewScreen(this)); break;
      case 'create-master': this.createMaster(); break;
      case 'create-legend': this.createLegend(); break;
      case 'start-training': this.startTraining(el.dataset.drill || 'free'); break;
      case 'buy-item': this.buyItem(el.dataset.id); break;
      case 'open-team-editor': this.editorTeamId = el.dataset.team; this.ui.setScreen(editorTeamScreen(this)); break;
      case 'save-team': this.saveTeam(); break;
      case 'edit-player': this.editPlayer(el.dataset.player); break;
      case 'buy-player': this.buyPlayer(el.dataset.player); break;
      case 'sell-player': this.sellPlayer(el.dataset.player); break;
      case 'save-now': this.saveGame(true); break;
      case 'save-slot': this.profile.slot = Number(el.dataset.slot) || 0; this.saveProfile(); this.saveGame(true); break;
      case 'load-slot': this.loadSlot(Number(el.dataset.slot)); break;
      case 'delete-slot': this.confirmDeleteSlot(Number(el.dataset.slot)); break;
      case 'settings-tilt': this.enableTilt(); break;
      case 'reset-settings': this.resetSettings(); break;
      case 'result-continue': this.resultContinue(); break;
      case 'result-rematch': this.resultRematch(); break;
      case 'result-menu': this.resultMenu(); break;
      case 'tactic': this.setTactic(el.dataset.key, Number(el.dataset.value)); break;
      case 'sub-out': this.subsModal(el.dataset.out); break;
      case 'sub-in': this.doSub(el.dataset.out, el.dataset.in); break;
      case 'profile-save': this.saveProfileForm(); break;
      case 'profile-reset': this.confirmResetProfile(); break;
      default: break;
    }
  }

  showMenu() {
    this.ui.clearMatchUI();
    this.ui.setPlaying(false);
    this.ui.showTouch(false);
    this.ui.setScreen(menuScreen(this));
  }

  team(id) { return getTeam(this.world, id); }
  playerById(id) {
    for (const t of Object.values(this.world.teams)) {
      const p = t.players.find(x => x.id === id);
      if (p) return p;
    }
    return null;
  }
  compMetaLabel() { return this.competition ? compMeta(this.competition).label || '' : ''; }
  nextCareerFixture() {
    if (!this.competition || this.competition.champion) return null;
    return nextUserFixture(this.competition);
  }
  masterOrLegendTeam() {
    if (!this.career) return null;
    return this.team(this.career.teamId);
  }
  continueMode() {
    if (this.mode === 'master') this.masterHubScreen();
    else if (this.mode === 'legend') this.legendHubScreen();
    else if (this.competition) this.compHubScreen();
    else this.showMenu();
  }

  pickQuickTeam(id) {
    const t = this.team(id);
    if (!t) return;
    if (!isTeamUnlocked(this.profile, t)) { this.ui.toast('Desbloqueie esta lenda na Loja.', 'red'); return; }
    const q = this.quick;
    if (q.home === id) { q.home = null; q.side = 'home'; }
    else if (q.away === id) { q.away = null; q.side = 'away'; }
    else if (!q.home) { q.home = id; q.side = 'away'; }
    else if (!q.away) { q.away = id; q.side = 'home'; }
    else { q[q.side === 'away' ? 'away' : 'home'] = id; }
    this.audio.select();
    this.ui.setScreen(quickScreen(this));
  }

  randomQuick() {
    const q = this.quick;
    const pool = q.tab === 'nations' ? nationalTeams(this.world)
      : q.tab === 'classics' ? classicTeams(this.world).filter(t => isTeamUnlocked(this.profile, t))
        : leagueTeams(this.world, q.leagueId);
    const rng = new RNG(Date.now());
    const a = rng.pick(pool);
    const b = rng.pick(pool.filter(t => t.id !== a?.id)) || rng.pick(pool);
    q.home = a?.id || null;
    q.away = b?.id || null;
    this.ui.setScreen(quickScreen(this));
  }

  startQuick() {
    const q = this.quick;
    if (!q.home || !q.away) { this.ui.toast('Escolha os dois times.', 'red'); return; }
    if (q.home === q.away) { this.ui.toast('Escolha times diferentes.', 'red'); return; }
    const home = this.team(q.home), away = this.team(q.away);
    const stadium = q.stadium === 'auto'
      ? (isStadiumUnlocked(this.profile, home.stadiumId) ? stadiumById(home.stadiumId) : stadiumById('estadio-nacional'))
      : stadiumById(q.stadium);
    this.launchMatch(home, away, {
      userTeamId: home.id,
      localMultiplayer: q.local,
      difficulty: Number(q.difficulty),
      duration: Number(q.time),
      weather: q.weather,
      camera: q.camera,
      stadium,
      autoReplay: q.autoReplay,
      context: { type: q.local ? 'local' : 'quick' }
    });
  }

  launchMatch(home, away, opts = {}) {
    if (!home || !away) return;
    this.audio.init();
    this.audio.startMusic('match');
    this.audio.setEpic((this.profile.unlocked || []).includes('commentary-epic'));
    const context = opts.context || { type: 'quick' };
    this.currentMatch = new Match(home, away, {
      userTeamId: opts.userTeamId || home.id,
      userPlayerId: opts.userPlayerId || null,
      localMultiplayer: !!opts.localMultiplayer,
      difficulty: opts.difficulty ?? this.profile.settings.difficulty ?? 2,
      duration: opts.duration ?? this.profile.settings.time ?? 360,
      weather: opts.weather ?? this.profile.settings.weather ?? 'auto',
      camera: opts.camera ?? this.profile.settings.camera ?? 'dynamic',
      stadium: opts.stadium,
      autoReplay: opts.autoReplay !== false,
      training: !!opts.training,
      drill: opts.drill || null,
      neutral: !!opts.neutral,
      input: this.input,
      audio: this.audio,
      onEvent: e => this.onMatchEvent(e),
      onEnd: r => this.onMatchEnd(r)
    });
    this.matchContext = context;
    this.resultShown = false;
    this.finishedMatch = null;
    this.ui.setPlaying(true);
    this.ui.showTouch(this.touchEnabled);
    this.input.setP2Enabled(!!opts.localMultiplayer);
    this.input.setTouchVisible(this.touchEnabled);
    this.input.releaseAll();
    this.renderer.cam.x = FIELD.cx;
    this.renderer.cam.y = FIELD.cy;
    this.ui.banner(`${home.short || home.name} x ${away.short || away.name}`, opts.training ? 'TREINO' : 'BOLA ROLANDO', 1500);
    this.ui.toast(`${home.name} x ${away.name}`, '', 1800);
  }

  onMatchEvent(ev) {
    if (!ev) return;
    switch (ev.type) {
      case 'commentary': if (ev.text) this.ui.commentary(ev.text, 3200); break;
      case 'goal': {
        const team = ev.side === 'home' ? this.currentMatch.home : this.currentMatch.away;
        this.ui.banner('GOL!', `${team.short || team.name} · ${ev.scorer}${ev.own ? ' (contra)' : ''}`, 2400);
        this.ui.broadcast(team.short || team.name, ev.assist ? `Assistência: ${ev.assist}` : 'GOL!', 2400);
        break;
      }
      case 'card': this.ui.banner(ev.kind === 'red' ? 'CARTÃO VERMELHO' : 'CARTÃO AMARELO', ev.player, 1900); break;
      case 'sentoff': this.ui.toast(`${ev.player} foi expulso.`, 'red', 2500); break;
      case 'penalty-setup': this.ui.banner('PÊNALTI!', ev.side === 'home' ? this.currentMatch.home.name : this.currentMatch.away.name, 2200); break;
      case 'penalty-result': this.ui.banner(ev.result === 'gol' ? 'GOL!' : 'PERDEU!', ev.result === 'gol' ? 'Na cobrança' : 'O goleiro defendeu', 1800); break;
      case 'halftime': this.ui.broadcast('INTERVALO', `${this.currentMatch.score.home} : ${this.currentMatch.score.away}`, 2400); break;
      case 'secondhalf': this.ui.broadcast('2º TEMPO', 'Bola rolando', 1600); break;
      case 'fulltime': this.ui.broadcast('FIM DE JOGO', `${this.currentMatch.score.home} : ${this.currentMatch.score.away}`, 2600); break;
      case 'save': this.ui.toast('Grande defesa do goleiro!', 'gold', 1500); break;
      case 'substitution': this.ui.toast(`${ev.in} entrou no lugar de ${ev.out}`, 'green', 1800); break;
      case 'foul': this.ui.commentary('Falta marcada.', 1600); break;
      default: break;
    }
  }

  onMatchEnd(result) {
    if (this.resultShown) return;
    this.resultShown = true;
    this.finishedMatch = this.currentMatch;
    this.applyMatchResult(result);
    this.currentMatch?.setPaused(true);
    this.audio.stopMusic();
    setTimeout(() => {
      if (this.finishedMatch) this.showResult(result);
    }, 1400);
  }

  applyMatchResult(result) {
    const m = this.finishedMatch || this.currentMatch;
    if (!m || !result) return;
    const userSide = m.userSide;
    const userGoals = userSide === 'away' ? result.score.away : result.score.home;
    const oppGoals = userSide === 'away' ? result.score.home : result.score.away;
    const win = userGoals > oppGoals, draw = userGoals === oppGoals;
    const p = this.profile;
    p.matches = (p.matches || 0) + 1;
    if (win) p.wins = (p.wins || 0) + 1;
    else if (draw) p.draws = (p.draws || 0) + 1;
    else p.losses = (p.losses || 0) + 1;
    p.goals = (p.goals || 0) + userGoals;
    const reward = (win ? 160 : draw ? 90 : 50) + userGoals * 25;
    p.coins += reward;
    p.xp = (p.xp || 0) + (win ? 90 : draw ? 55 : 30) + userGoals * 10;
    p.level = 1 + Math.floor(p.xp / 900);
    const ctx = this.matchContext || {};
    if (['competition', 'master', 'legend'].includes(ctx.type)) {
      const comp = this.competition;
      if (comp) {
        let f = ctx.fixtureId ? allFixtures(comp).find(x => x.id === ctx.fixtureId) : null;
        if (!f) f = fixtureForTeam(comp, comp.userTeamId);
        if (f && !f.played) {
          recordResult(comp, f, result.score.home, result.score.away);
          simulateOtherFixtures(this.world, comp, f.id);
          progress(comp);
        }
        if (this.mode === 'master' && this.career) {
          const team = this.team(this.career.teamId);
          if (team) team.budget = (team.budget || 0) + (win ? 1200000 : draw ? 600000 : 300000);
          if (comp.champion) this.awardTrophy(comp.champion, comp.name);
        }
        if (this.mode === 'legend' && this.career) {
          const mp = m.players.find(x => x.id === this.career.playerId);
          if (mp) {
            this.career.apps = (this.career.apps || 0) + 1;
            this.career.goals = (this.career.goals || 0) + (mp.stats.goals || 0);
            this.career.assists = (this.career.assists || 0) + (mp.stats.assists || 0);
            this.career.ratingSum = (this.career.ratingSum || 0) + (mp.stats.rating || 6.5);
            this.career.avg = Math.round((this.career.ratingSum / this.career.apps) * 10) / 10;
            const wp = this.playerById(this.career.playerId);
            if (wp) {
              wp.stats = wp.stats || { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, rating: 0 };
              wp.stats.apps++;
              wp.stats.goals += mp.stats.goals || 0;
              wp.stats.assists += mp.stats.assists || 0;
              wp.stats.rating = this.career.avg;
            }
          }
          if (comp.champion) this.awardTrophy(comp.champion, comp.name);
        }
      }
    }
    if (ctx.type === 'training') p.coins += 20;
    this.lastResult = { ...result, win, draw, reward, userGoals, oppGoals };
    this.profile.lastSave = Date.now();
    this.saveProfile();
    this.saveGame(false);
  }

  awardTrophy(teamId, name) {
    if (this.career) {
      this.career.history = this.career.history || [];
      const key = `${name}:${this.career.season || 1}`;
      if (!this.career.history.some(h => h.key === key)) {
        this.career.history.push({ key, name, season: this.career.season || 1, champion: teamId, date: Date.now() });
      }
    }
    const p = this.profile;
    p.trophies = p.trophies || [];
    if (!p.trophies.some(t => t.name === name && t.season === (this.career?.season || 1))) {
      p.trophies.push({ name, season: this.career?.season || 1, teamId, date: Date.now() });
    }
  }

  showResult(result) {
    this.ui.setPlaying(false);
    this.ui.clearMatchUI();
    this.ui.setScreen(resultScreen(this, result));
  }

  resultContinue() {
    const type = this.matchContext?.type;
    this.exitMatch();
    if (type === 'competition') this.compHubScreen();
    else if (type === 'master') this.masterHubScreen();
    else if (type === 'legend') this.legendHubScreen();
    else this.showMenu();
  }
  resultMenu() { this.exitMatch(); this.showMenu(); }
  resultRematch() {
    const m = this.finishedMatch || this.currentMatch;
    if (!m) { this.exitMatch(); this.showMenu(); return; }
    const home = m.home, away = m.away, local = !!this.matchContext?.localMultiplayer;
    const ctx = this.matchContext?.type;
    this.exitMatch();
    this.launchMatch(home, away, {
      userTeamId: home.id,
      localMultiplayer: local,
      difficulty: this.profile.settings.difficulty,
      duration: this.profile.settings.time,
      weather: this.profile.settings.weather,
      camera: this.profile.settings.camera,
      autoReplay: this.profile.settings.autoReplay,
      context: { type: ctx === 'training' ? 'training' : 'quick' }
    });
  }

  exitMatch() {
    this.currentMatch = null;
    this.finishedMatch = null;
    this.matchContext = null;
    this.resultShown = false;
    this.ui.clearMatchUI();
    this.ui.setPlaying(false);
    this.ui.showTouch(false);
    this.input.setP2Enabled(false);
    this.input.setTouchVisible(false);
    this.audio.startMusic('menu');
  }

  togglePause() {
    const m = this.currentMatch;
    if (!m || m.finished) return;
    if (m.paused) {
      this.ui.closeModal();
      m.setPaused(false);
      this.audio.startMusic('match');
      return;
    }
    m.setPaused(true);
    this.pauseMenu();
  }

  pauseMenu() {
    const m = this.currentMatch;
    if (!m) return;
    const training = m.training;
    this.ui.modal({
      title: 'Pausado',
      sub: `${m.home.name} ${m.score.home} : ${m.score.away} ${m.away.name} · ${m.clockText()}`,
      body: `<div class="grid cols-2">
        <button class="tile" data-modal-action="resume" style="min-height:60px"><b>Continuar</b><small>Voltar ao jogo</small></button>
        <button class="tile" data-modal-action="stats" style="min-height:60px"><b>Estatísticas</b><small>Números da partida</small></button>
        <button class="tile" data-modal-action="tactics" style="min-height:60px"><b>Táticas</b><small>Formação e postura</small></button>
        <button class="tile" data-modal-action="subs" style="min-height:60px"><b>Substituições</b><small>${m.subCount[m.userSide || 'home']}/5 usadas</small></button>
      </div>`,
      actions: [
        { label: training ? 'Encerrar treino' : 'Abandonar partida', value: 'quit-confirm', cls: 'danger' },
        { label: 'Continuar', value: 'resume', cls: 'primary' }
      ]
    });
  }

  statsModal() {
    const m = this.currentMatch;
    if (!m) return;
    this.ui.modal({
      title: 'Estatísticas',
      sub: `${m.home.name} x ${m.away.name}`,
      body: `<div class="panel">${statBars(m.getStats())}</div>`,
      actions: [{ label: 'Voltar', value: 'back-pause', cls: 'primary' }]
    });
  }

  tacticsModal() {
    const m = this.currentMatch;
    if (!m) return;
    const side = m.userSide || 'home';
    const team = m.getSide(side);
    const labels = { mentality: ['Defensiva', 'Equilibrada', 'Ofensiva'], pressing: ['Baixa', 'Média', 'Alta'], width: ['Estreita', 'Normal', 'Aberta'], tempo: ['Lenta', 'Normal', 'Rápida'] };
    const rows = Object.entries(labels).map(([key, opts]) => `<div class="field"><label>${key === 'mentality' ? 'Postura' : key === 'pressing' ? 'Pressão' : key === 'width' ? 'Amplitude' : 'Ritmo'}</label>
      <div class="chip-row">${opts.map((n, i) => `<button class="chip ${team.tactics[key] === i + 1 ? 'sel' : ''}" data-act="tactic" data-key="${key}" data-value="${i + 1}">${n}</button>`).join('')}</div>
    </div>`).join('');
    this.ui.modal({
      title: 'Táticas',
      sub: team.name,
      body: `<div class="field"><label>Formação</label><select class="input" id="match-formation">${Object.keys(FORMATIONS).map(f => `<option value="${f}" ${team.formation === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>${rows}`,
      actions: [{ label: 'Fechar', value: 'close', cls: 'primary' }]
    });
  }

  setTactic(key, value) {
    const m = this.currentMatch;
    if (!m) return;
    m.setTactics(m.userSide || 'home', { [key]: value });
    this.tacticsModal();
  }

  subsModal(outId = null) {
    const m = this.currentMatch;
    if (!m) return;
    const side = m.userSide || 'home';
    if (!outId) {
      const active = m.activePlayers(side).slice().sort((a, b) => b.overall - a.overall);
      this.ui.modal({
        title: 'Substituições',
        sub: `Escolha quem sai · ${m.subCount[side]}/5`,
        body: `<div class="list">${active.map(p => `<div class="row"><span class="ovr">${p.overall}</span><div class="grow"><b>${p.name}</b><small>${p.pos} · ${p.stamina.toFixed(0)}% energia</small></div><button class="btn xs ghost" data-act="sub-out" data-out="${p.id}">Sair</button></div>`).join('')}</div>`,
        actions: [{ label: 'Voltar', value: 'back-pause', cls: 'primary' }]
      });
    } else {
      const out = m.byId.get(outId);
      const bench = m.getBench(side).filter(p => !p.isGK || out?.isGK);
      this.ui.modal({
        title: 'Quem entra?',
        sub: `Sai: ${out?.name || ''}`,
        body: bench.length ? `<div class="list">${bench.map(p => `<div class="row"><span class="ovr">${p.overall}</span><div class="grow"><b>${p.name}</b><small>${p.pos} · ${p.overall} OVR</small></div><button class="btn xs green" data-act="sub-in" data-out="${outId}" data-in="${p.id}">Entrar</button></div>`).join('')}</div>` : '<div class="empty">Sem reservas disponíveis</div>',
        actions: [{ label: 'Voltar', value: 'subs-back', cls: 'primary' }]
      });
    }
  }

  doSub(outId, inId) {
    const m = this.currentMatch;
    if (!m) return;
    const side = m.userSide || 'home';
    if (m.substitute(side, outId, inId)) {
      this.ui.closeModal();
      this.ui.toast('Substituição realizada.', 'green');
      m.setPaused(false);
      this.audio.startMusic('match');
    } else {
      this.ui.toast('Substituição inválida.', 'red');
    }
  }

  quitMatch() {
    const m = this.currentMatch;
    if (!m) return;
    const ctx = this.matchContext || {};
    m.quit();
    this.exitMatch();
    if (ctx.type === 'competition') this.compHubScreen();
    else if (ctx.type === 'master') this.masterHubScreen();
    else if (ctx.type === 'legend') this.legendHubScreen();
    else this.showMenu();
  }

  cycleCamera() {
    const m = this.currentMatch;
    if (!m) return;
    const order = ['dynamic', 'tv', 'close', 'wide'];
    const i = order.indexOf(m.cameraMode);
    m.cameraMode = order[(i + 1) % order.length];
    this.ui.toast(`Câmera: ${CAMERA_NAMES[m.cameraMode]}`, '', 1200);
  }

  openComp(id) {
    const comp = competitionsFor(this.world).find(c => c.id === id);
    if (!comp) return;
    if (this.competition && (this.competition.cupId === comp.id || this.competition.leagueId === comp.leagueId)) {
      this.compHubScreen();
      return;
    }
    this.compPick = { compId: id, teamId: null };
    this.ui.setScreen(compDetailScreen(this));
  }

  startCompetition() {
    const compDef = competitionsFor(this.world).find(c => c.id === this.compPick?.compId);
    if (!compDef || !this.compPick.teamId) return;
    this.mode = 'competition';
    this.competition = createCompetition(this.world, compDef, this.compPick.teamId, `comp-${Date.now()}`);
    this.career = null;
    this.compHubScreen();
    this.saveGame(false);
  }

  compHubScreen() {
    if (!this.competition) { this.ui.setScreen(competitionsScreen(this)); return; }
    this.ui.setScreen(compHubScreen(this));
  }

  openMatch() {
    const comp = this.competition;
    if (!comp) return;
    const f = nextUserFixture(comp);
    if (!f) { this.ui.toast('Nenhuma partida disponível.', 'red'); return; }
    const home = this.team(f.home), away = this.team(f.away);
    if (!home || !away) return;
    let ctxType = 'competition';
    if (this.mode === 'master') ctxType = 'master';
    else if (this.mode === 'legend') ctxType = 'legend';
    this.launchMatch(home, away, {
      userTeamId: comp.userTeamId,
      userPlayerId: this.mode === 'legend' ? this.career?.playerId : null,
      difficulty: this.profile.settings.difficulty,
      duration: this.profile.settings.time,
      weather: this.profile.settings.weather,
      camera: this.profile.settings.camera,
      autoReplay: this.profile.settings.autoReplay,
      neutral: comp.kind === 'cup',
      context: { type: ctxType, fixtureId: f.id }
    });
  }

  simulateRound() {
    const comp = this.competition;
    if (!comp || comp.champion) return;
    simulateRestOfRound(this.world, comp);
    this.saveGame(false);
    if (this.mode === 'master') this.masterHubScreen();
    else if (this.mode === 'legend') this.legendHubScreen();
    else this.compHubScreen();
    this.ui.toast('Rodada simulada.', '', 1500);
  }

  simulateRest() {
    const comp = this.competition;
    if (!comp) return;
    if (comp.kind === 'cup') simulateCupToEnd(this.world, comp);
    else {
      let guard = 0;
      while (!comp.champion && guard++ < 100) simulateRestOfRound(this.world, comp);
    }
    this.saveGame(false);
    if (this.mode === 'master') this.masterHubScreen();
    else if (this.mode === 'legend') this.legendHubScreen();
    else this.compHubScreen();
    this.ui.toast('Restante da competição simulado.', '', 1800);
  }

  newSeason() {
    const comp = this.competition;
    if (!comp) return;
    const teamId = comp.userTeamId;
    if (this.mode === 'master') {
      this.career.season = (this.career.season || 1) + 1;
      this.competition = createLeagueCompetition(this.world, this.team(this.career.teamId).leagueId, teamId, `master-${Date.now()}`);
      this.career.comp = this.competition;
      this.masterHubScreen();
    } else if (this.mode === 'legend') {
      this.career.season = (this.career.season || 1) + 1;
      this.competition = createLeagueCompetition(this.world, this.team(this.career.teamId).leagueId, teamId, `legend-${Date.now()}`);
      this.career.comp = this.competition;
      this.legendHubScreen();
    } else {
      const compDef = comp.kind === 'league'
        ? competitionsFor(this.world).find(c => c.leagueId === comp.leagueId)
        : competitionsFor(this.world).find(c => c.id === comp.cupId);
      if (compDef) {
        this.competition = createCompetition(this.world, compDef, teamId, `comp-${Date.now()}`);
        this.compHubScreen();
      }
    }
    this.saveGame(false);
  }

  masterHubScreen() { this.ui.setScreen(masterHubScreen(this)); }
  legendHubScreen() { this.ui.setScreen(legendHubScreen(this)); }

  createMaster() {
    const id = this.masterPick.teamId;
    if (!id) return;
    const team = this.team(id);
    this.mode = 'master';
    this.competition = createLeagueCompetition(this.world, team.leagueId, id, `master-${Date.now()}`);
    this.career = { type: 'master', teamId: id, season: 1, history: [], comp: this.competition, createdAt: Date.now() };
    this.saveGame(false);
    this.masterHubScreen();
    this.ui.broadcast('MASTER LEAGUE', team.name, 2200);
  }

  createLegend() {
    const nameEl = document.getElementById('legend-name');
    const posEl = document.getElementById('legend-pos');
    const ageEl = document.getElementById('legend-age');
    const clubEl = document.getElementById('legend-club');
    const name = (nameEl?.value || 'Craque').trim().slice(0, 22) || 'Craque';
    const pos = posEl?.value || 'ATA';
    const age = clamp(Number(ageEl?.value) || 18, 16, 24);
    const clubId = clubEl?.value;
    const team = this.team(clubId);
    if (!team) { this.ui.toast('Escolha um clube válido.', 'red'); return; }
    const rng = new RNG(`${name}:${Date.now()}`);
    const base = 68;
    const attr = {
      pace: Math.round(clamp(base + (pos === 'PON' || pos === 'LAT' ? 6 : pos === 'ATA' ? 3 : 0) + rng.gauss(0, 3), 45, 92)),
      shoot: Math.round(clamp(base + (pos === 'ATA' ? 8 : pos === 'PON' ? 3 : pos === 'MEI' ? 2 : pos === 'GOL' ? -25 : -4) + rng.gauss(0, 3), 40, 92)),
      pass: Math.round(clamp(base + (pos === 'MEI' || pos === 'VOL' ? 7 : 0) + rng.gauss(0, 3), 40, 92)),
      dribble: Math.round(clamp(base + (pos === 'PON' || pos === 'MEI' ? 6 : 0) + rng.gauss(0, 3), 40, 92)),
      defense: Math.round(clamp(base + (pos === 'ZAG' || pos === 'VOL' ? 9 : pos === 'ATA' ? -14 : 0) + rng.gauss(0, 3), 35, 92)),
      physical: Math.round(clamp(base + (pos === 'ZAG' || pos === 'VOL' ? 6 : 0) + rng.gauss(0, 3), 40, 92)),
      gk: pos === 'GOL' ? Math.round(clamp(base + 10, 45, 94)) : Math.round(clamp(base * .32, 10, 45))
    };
    const overall = computeOverall(pos, attr);
    const id = `p_legend_${Date.now().toString(36)}`;
    const player = {
      id, name, teamId: team.id, pos,
      posGroup: pos === 'GOL' ? 'GOL' : ['ZAG', 'LAT'].includes(pos) ? 'DEF' : ['VOL', 'MEI'].includes(pos) ? 'MEI' : 'ATA',
      num: 10, age, nat: team.country || 'Brasil', flag: team.flag || '🌍',
      attrs: attr, overall, potential: 92, value: 1200000, wage: 12000, form: 0, fitness: 100, morale: 90, growth: 0,
      foot: 'Direito', height: 178, weight: 74, skin: '#c6885c', hair: '#2b1a10', hairStyle: 'curto',
      squadRole: 'titular', stats: { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, rating: 0 }
    };
    team.players.push(player);
    autoLineup(team);
    if (!team.lineup.includes(id)) {
      const samePos = team.lineup.map(x => team.players.find(p => p.id === x)).filter(Boolean).findIndex(p => p.pos === pos);
      team.lineup[samePos >= 0 ? samePos : 9] = id;
      team.lineup = [...new Set(team.lineup)];
      if (team.lineup.length < 11) team.lineup.push(...team.players.filter(p => !team.lineup.includes(p.id)).slice(0, 11 - team.lineup.length).map(p => p.id));
    }
    this.mode = 'legend';
    this.competition = createLeagueCompetition(this.world, team.leagueId, team.id, `legend-${Date.now()}`);
    this.career = { type: 'legend', teamId: team.id, playerId: id, season: 1, apps: 0, goals: 0, assists: 0, ratingSum: 0, avg: 0, history: [], comp: this.competition, createdAt: Date.now() };
    this.saveGame(false);
    this.legendHubScreen();
    this.ui.broadcast('BECOME A LEGEND', `${name} começa no ${team.name}`, 2600);
  }

  startTraining(drill) {
    const home = this.quick.home ? this.team(this.quick.home) : leagueTeams(this.world, 'brasileirao')[0];
    let away = this.quick.away ? this.team(this.quick.away) : leagueTeams(this.world, 'brasileirao')[1];
    if (!home || !away || home.id === away.id) away = allClubTeams(this.world).find(t => t.id !== home?.id);
    this.launchMatch(home, away, {
      userTeamId: home.id,
      difficulty: 2,
      duration: 360,
      weather: 'clear',
      camera: 'dynamic',
      autoReplay: false,
      training: true,
      drill: drill === 'penalty' ? 'penalty' : null,
      context: { type: 'training', drill }
    });
  }

  buyPlayer(playerId) {
    const team = this.masterOrLegendTeam();
    if (!team) return;
    const from = Object.values(this.world.teams).find(t => t.players.some(p => p.id === playerId));
    const p = from?.players.find(x => x.id === playerId);
    if (!p || !from || from.id === team.id) return;
    if (this.mode === 'master') {
      if ((team.budget || 0) < p.value) { this.ui.toast('Caixa insuficiente.', 'red'); return; }
      team.budget -= p.value;
      from.budget = (from.budget || 0) + p.value;
    } else {
      const cost = Math.ceil(p.value / 1000);
      if (this.profile.coins < cost) { this.ui.toast(`Faltam ${cost - this.profile.coins} moedas.`, 'red'); return; }
      this.profile.coins -= cost;
    }
    from.players = from.players.filter(x => x.id !== playerId);
    p.teamId = team.id;
    p.squadRole = 'titular';
    team.players.push(p);
    autoLineup(from);
    autoLineup(team);
    this.ui.toast(`${p.name} é o novo reforço do ${team.name}!`, 'green', 2200);
    this.saveGame(false);
    this.ui.setScreen(transfersScreen(this));
  }

  sellPlayer(playerId) {
    const team = this.masterOrLegendTeam();
    if (!team) return;
    const p = team.players.find(x => x.id === playerId);
    if (!p) return;
    if (this.career?.type === 'legend' && this.career.playerId === playerId) { this.ui.toast('Você não pode vender seu próprio jogador.', 'red'); return; }
    if (team.players.length <= 14) { this.ui.toast('Elenco muito pequeno para vender.', 'red'); return; }
    const clubs = allClubTeams(this.world).filter(t => t.id !== team.id);
    const buyer = clubs[Math.floor(Math.random() * clubs.length)];
    if (!buyer) return;
    const fee = Math.round(p.value * .7);
    team.players = team.players.filter(x => x.id !== playerId);
    p.teamId = buyer.id;
    p.squadRole = 'reserva';
    buyer.players.push(p);
    if (this.mode === 'master') team.budget = (team.budget || 0) + fee;
    else this.profile.coins += Math.ceil(fee / 1000);
    autoLineup(team);
    autoLineup(buyer);
    this.ui.toast(`${p.name} vendido ao ${buyer.name}.`, '', 2200);
    this.saveGame(false);
    this.ui.setScreen(transfersScreen(this));
  }

  buyItem(id) {
    const item = UNLOCKABLES.find(x => x.id === id);
    if (!item) return;
    const p = this.profile;
    p.unlocked = p.unlocked || [];
    if (p.unlocked.includes(id)) { this.ui.toast('Você já possui este item.', '', 1400); return; }
    if (p.coins < item.price) { this.ui.toast('Moedas insuficientes.', 'red'); return; }
    p.coins -= item.price;
    p.unlocked.push(id);
    if (item.kind === 'commentary') this.audio.setEpic(true);
    this.saveProfile();
    this.saveGame(false);
    this.audio.select();
    this.ui.toast(`${item.name} desbloqueado!`, 'gold', 2000);
    this.ui.setScreen(storeScreen(this));
  }

  resetSettings() {
    this.profile.settings = { ...DEFAULT_SETTINGS };
    this.applySettings();
    this.saveProfile();
    this.ui.setScreen(settingsScreen(this));
    this.ui.toast('Configurações restauradas.', 'green');
  }

  applySettings() {
    const s = this.profile.settings;
    this.audio?.setSettings(s);
    if (this.renderer) this.renderer.setQuality(s.quality || 'auto');
    this.refreshTouch();
  }

  onFieldInput(e) {
    const el = e.target.closest('[data-setting],[data-opt]');
    if (!el) return;
    if (el.dataset.setting) {
      const key = el.dataset.setting;
      let v;
      if (el.type === 'range') v = Number(el.value) / Number(el.dataset.scale || 1);
      else if (el.type === 'checkbox') v = el.checked;
      else v = el.value;
      if (key === 'difficulty' || key === 'time') v = Number(v);
      this.profile.settings[key] = v;
      const label = document.getElementById('set-' + key);
      if (label) label.textContent = `${el.value}%`;
      this.applySettings();
      this.saveProfile();
    } else if (el.dataset.opt) {
      const key = el.dataset.opt;
      const v = el.type === 'checkbox' ? el.checked : el.value;
      this.quick[key] = key === 'difficulty' || key === 'time' ? Number(v) : v;
    }
  }

  onFieldChange(e) {
    const el = e.target.closest('[data-setting],[data-opt]');
    if (el) { this.onFieldInput(e); this.audio.select(); return; }
    if (e.target.id === 'transfer-club') {
      this.transferClubId = e.target.value;
      this.ui.setScreen(transfersScreen(this));
      return;
    }
    if (e.target.id === 'match-formation' && this.currentMatch) {
      this.currentMatch.setFormation(this.currentMatch.userSide || 'home', e.target.value);
      this.audio.select();
    }
  }

  enableTilt() {
    this.input.requestTilt().then(ok => {
      this.ui.toast(ok ? 'Inclinação ativada.' : 'Permissão não concedida.', ok ? 'green' : 'red', 2400);
      if (ok) { this.profile.settings.tilt = true; this.saveProfile(); }
      this.ui.setScreen(settingsScreen(this));
    });
  }

  saveTeam() {
    const team = this.team(this.editorTeamId);
    if (!team) return;
    const name = document.getElementById('editor-team-name')?.value.trim();
    const formation = document.getElementById('editor-formation')?.value;
    const stadiumId = document.getElementById('editor-stadium')?.value;
    const c1 = document.getElementById('editor-color1')?.value;
    const c2 = document.getElementById('editor-color2')?.value;
    const c3 = document.getElementById('editor-color3')?.value;
    if (name) team.name = name.slice(0, 30);
    if (formation && FORMATIONS[formation]) { team.formation = formation; autoLineup(team); }
    if (stadiumId) { team.stadiumId = stadiumId; team.stadium = stadiumById(stadiumId); }
    if (c1 && c2 && c3) team.colors = { ...team.colors, primary: c1, secondary: c2, accent: c3, shorts: c2 === '#ffffff' ? c1 : c2, socks: c1 };
    team.crest = { ...team.crest, initial: team.name.slice(0, 3).toUpperCase() };
    this.saveGame(false);
    this.ui.toast('Time atualizado.', 'green');
    this.ui.setScreen(editorTeamScreen(this));
  }

  editPlayer(playerId) {
    const team = this.team(this.editorTeamId);
    const p = team?.players.find(x => x.id === playerId);
    if (!p) return;
    this._editingPlayer = p;
    const attr = p.attrs;
    const slider = (k, label) => `<div class="slider-row"><span>${label}</span><input type="range" min="30" max="96" value="${attr[k]}" id="ep-${k}" style="width:100%"><b id="epv-${k}">${attr[k]}</b></div>`;
    this.ui.modal({
      title: 'Editar jogador',
      sub: p.name,
      body: `
        <div class="field-row"><div class="field"><label>Nome</label><input class="input" id="ep-name" value="${esc(p.name)}" maxlength="24"></div><div class="field"><label>Posição</label><select class="input" id="ep-pos">${POSITIONS.map(x => `<option value="${x}" ${p.pos === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
        <div class="field-row"><div class="field"><label>Idade</label><input class="input" id="ep-age" type="number" min="16" max="45" value="${p.age}"></div><div class="field"><label>Camisa</label><input class="input" id="ep-num" type="number" min="1" max="99" value="${p.num}"></div></div>
        ${slider('pace', 'Ritmo')}${slider('shoot', 'Chute')}${slider('pass', 'Passe')}${slider('dribble', 'Drible')}${slider('defense', 'Defesa')}${slider('physical', 'Físico')}`,
      actions: [{ label: 'Cancelar', value: 'close', cls: 'ghost' }, { label: 'Salvar jogador', value: 'save-player', cls: 'primary' }]
    });
    for (const k of ['pace', 'shoot', 'pass', 'dribble', 'defense', 'physical']) {
      const inp = document.getElementById('ep-' + k);
      inp?.addEventListener('input', () => {
        const v = document.getElementById('epv-' + k);
        if (v) v.textContent = inp.value;
      });
    }
  }

  savePlayerFromModal() {
    const p = this._editingPlayer;
    if (!p) { this.ui.closeModal(); return; }
    const name = document.getElementById('ep-name')?.value.trim();
    const pos = document.getElementById('ep-pos')?.value;
    const age = Number(document.getElementById('ep-age')?.value) || p.age;
    const num = Number(document.getElementById('ep-num')?.value) || p.num;
    if (name) p.name = name.slice(0, 24);
    if (POSITIONS.includes(pos)) p.pos = pos;
    p.age = clamp(age, 16, 45);
    p.num = clamp(num, 1, 99);
    for (const k of ['pace', 'shoot', 'pass', 'dribble', 'defense', 'physical']) {
      const el = document.getElementById('ep-' + k);
      if (el) p.attrs[k] = clamp(Number(el.value) || p.attrs[k], 30, 96);
    }
    p.overall = computeOverall(p.pos, p.attrs);
    p.potential = Math.max(p.overall, p.potential || p.overall);
    autoLineup(this.team(this.editorTeamId));
    this._editingPlayer = null;
    this.ui.closeModal();
    this.saveGame(false);
    this.ui.toast('Jogador atualizado.', 'green');
    this.ui.setScreen(editorTeamScreen(this));
  }

  saveProfileForm() {
    const name = document.getElementById('profile-name')?.value.trim();
    const fav = document.getElementById('profile-fav')?.value;
    if (name) this.profile.name = name.slice(0, 24);
    if (fav) this.profile.favoriteTeam = fav;
    this.saveProfile();
    this.saveGame(false);
    this.ui.toast('Perfil salvo.', 'green');
    this.ui.setScreen(profileScreen(this));
  }

  confirmResetProfile() {
    this.ui.modal({
      title: 'Apagar progresso?',
      sub: 'Essa ação não pode ser desfeita.',
      body: '<div class="tiny red">Todo o progresso do perfil, carreiras e desbloqueios será apagado.</div>',
      actions: [{ label: 'Cancelar', value: 'close', cls: 'ghost' }, { label: 'Apagar tudo', value: 'profile-reset-confirm', cls: 'danger' }]
    });
  }

  resetProfile() {
    this.profile = defaultProfile();
    this.profile.settings = { ...DEFAULT_SETTINGS };
    this.world = createWorld('pes2027-stickman');
    this.competition = null;
    this.career = null;
    this.mode = 'quick';
    this.quick.home = null;
    this.quick.away = null;
    this.save.clearProfile();
    this.save.deleteSlot(0);
    this.saveProfile();
    this.ui.closeModal();
    this.ui.toast('Progresso apagado.', '', 1600);
    this.showMenu();
  }

  async savesScreen() {
    const slots = await this.save.listSlots(4);
    this.ui.setScreen(savesScreen(this, slots));
  }

  async saveGame(showToast = false) {
    if (!this.world) return;
    const meta = {
      name: this.profile.name, mode: this.mode,
      team: this.career ? this.team(this.career.teamId)?.name : this.competition ? this.team(this.competition.userTeamId)?.name : 'Jogo',
      comp: this.competition?.name || '',
      updatedAt: Date.now()
    };
    const data = {
      version: SAVE_VERSION,
      meta,
      world: this.world,
      competition: this.competition,
      career: this.career,
      mode: this.mode,
      savedAt: Date.now()
    };
    const ok = await this.save.saveSlot(this.profile.slot || 0, data);
    if (showToast) this.ui.toast(ok ? 'Jogo salvo.' : 'Falha ao salvar.', ok ? 'green' : 'red', 1600);
    return ok;
  }

  async loadSlot(slot) {
    const data = await this.save.loadSlot(slot);
    if (!data || !data.world?.teams) { this.ui.toast('Slot vazio ou inválido.', 'red'); return; }
    if (this.currentMatch) this.exitMatch();
    this.world = data.world;
    this.competition = data.competition || null;
    this.career = data.career || null;
    this.mode = data.mode || 'quick';
    if (this.career?.comp) this.competition = this.career.comp;
    this.profile.slot = slot;
    this.saveProfile();
    this.ui.toast('Salvamento carregado.', 'green', 1800);
    if (this.mode === 'master' && this.career?.type === 'master') this.masterHubScreen();
    else if (this.mode === 'legend' && this.career?.type === 'legend') this.legendHubScreen();
    else if (this.competition) this.compHubScreen();
    else this.showMenu();
  }

  confirmDeleteSlot(slot) {
    this.pendingDeleteSlot = slot;
    this.ui.modal({
      title: 'Apagar salvamento?',
      sub: `Slot ${slot + 1}`,
      body: '<div class="tiny red">O save será removido permanentemente.</div>',
      actions: [{ label: 'Cancelar', value: 'close', cls: 'ghost' }, { label: 'Apagar', value: 'delete-slot-confirm', cls: 'danger' }]
    });
  }

  async deleteSlot(slot) {
    await this.save.deleteSlot(slot);
    this.pendingDeleteSlot = null;
    this.ui.closeModal();
    this.ui.toast('Salvamento apagado.', '', 1500);
    this.savesScreen();
  }

  saveProfile() {
    if (!this.profile || !this.save) return;
    this.profile.lastSave = Date.now();
    this.save.saveProfile(this.profile);
  }

  handleModal(action) {
    switch (action) {
      case 'close': this.ui.closeModal(); break;
      case 'resume': this.ui.closeModal(); this.currentMatch?.setPaused(false); this.audio.startMusic('match'); break;
      case 'stats': this.statsModal(); break;
      case 'tactics': this.tacticsModal(); break;
      case 'subs': this.subsModal(); break;
      case 'subs-back': this.subsModal(); break;
      case 'back-pause': this.pauseMenu(); break;
      case 'quit-confirm': this.ui.closeModal(); this.quitMatch(); break;
      case 'save-player': this.savePlayerFromModal(); break;
      case 'profile-reset-confirm': this.resetProfile(); break;
      case 'delete-slot-confirm': if (this.pendingDeleteSlot != null) this.deleteSlot(this.pendingDeleteSlot); break;
      default: this.ui.closeModal();
    }
  }
}
