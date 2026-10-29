/* Fluxo de partida: wizard, início, resultado, replays e recompensas. */

import {
  DIFFICULTIES, CAMERAS, WEATHERS, ALL_TEAMS, COMPETITIONS, getTeam, getLeague,
  overallForSquad
} from './data.js';
import { state, app, favoriteTeam, randomOpponent, save } from './state.js';
import { $, esc, crest, toast, openModal, closeModal, statLine, ensureAudio } from './ui.js';
import { applyCompResult } from './competitions.js';
import { applyCareerResult } from './career.js';
import { MatchEngine } from './engine.js';
import { Audio } from './audio.js';
import { setView } from './screens.js';

export function currentMatchSettings(extra = {}) {
  return {
    difficulty: state.settings.difficulty,
    halfLength: state.settings.halfLength,
    camera: state.settings.camera,
    weather: state.settings.weather,
    quality: state.settings.quality,
    tilt: state.settings.tilt,
    showControls: state.settings.showControls,
    ...extra
  };
}

export function launchMatch(cfg) {
  closeModal();
  cancelAnimationFrame(app.heroRaf);
  ensureAudio();
  Audio.stopCommentary();
  const homeId = cfg.homeId || favoriteTeam().id;
  const awayId = cfg.awayId || randomOpponent([homeId]).id;
  const opts = {
    canvas: $('#match-canvas'), uiRoot: $('#match-ui'),
    homeId, awayId,
    userSide: cfg.userSide || 'home',
    twoPlayer: !!cfg.twoPlayer,
    cpuVsCpu: cfg.userSide === 'cpu' || !!cfg.cpuVsCpu,
    mode: cfg.mode || 'match',
    drill: cfg.drill,
    difficulty: cfg.difficulty || state.settings.difficulty,
    weather: cfg.weather || state.settings.weather,
    camera: cfg.camera || state.settings.camera,
    halfLength: cfg.halfLength || state.settings.halfLength,
    quality: cfg.quality || state.settings.quality,
    tilt: cfg.tilt ?? state.settings.tilt,
    showControls: cfg.showControls ?? state.settings.showControls,
    requireWinner: !!cfg.requireWinner,
    replay: true,
    competitionName: cfg.competitionName || 'Amistoso',
    stadium: cfg.stadium,
    homeLineup: cfg.homeLineup,
    awayLineup: cfg.awayLineup,
    onFinish: (result) => onMatchFinished(result, cfg),
    onExit: () => onMatchExited()
  };
  app.currentConfig = cfg;
  try {
    app.currentMatch = new MatchEngine(opts);
    app.currentMatch.start();
  } catch (err) {
    console.error(err);
    toast('Não foi possível iniciar a partida. Verifique o console.', '!', true);
  }
}

export function quickStart(mode = 'friendly') {
  const home = favoriteTeam();
  const away = randomOpponent([home.id]);
  const base = { homeId: home.id, awayId: away.id, competitionName: 'Amistoso' };
  if (mode === 'training') launchMatch({ ...base, mode: 'training', competitionName: 'Treino Livre' });
  else if (mode === 'penalty') launchMatch({ ...base, mode: 'penalty', competitionName: 'Treino de Pênaltis' });
  else if (mode === '2p') launchMatch({ ...base, twoPlayer: true, competitionName: 'Multiplayer Local' });
  else if (mode === 'cpu') launchMatch({ ...base, userSide: 'cpu', competitionName: 'CPU vs CPU' });
  else launchMatch(base);
}

function awardMatch(result) {
  let coins = 0, xp = 0;
  if (result.mode === 'training') { coins = 25; xp = 10; }
  else if (result.userSide === 'cpu') { coins = 60; xp = 20; }
  else if (result.userWin) { coins = 280; xp = 90; }
  else if (result.draw) { coins = 120; xp = 45; }
  else { coins = 70; xp = 30; }
  result.reward = { coins, xp, goals: result.score.home + result.score.away };
  state.coins += coins;
  state.record.matches++;
  if (result.userWin) state.record.wins++;
  else if (result.draw) state.record.draws++;
  else state.record.losses++;
  state.record.goals += result.score[result.userSide] || 0;
  state.profile.xp += xp;
  state.profile.level = Math.max(1, 1 + Math.floor(state.profile.xp / 1000));
  save(true);
  return result.reward;
}

function onMatchFinished(result, cfg) {
  const ctx = cfg.context || { kind: 'friendly' };
  if (ctx.kind === 'comp') {
    const comp = COMPETITIONS.find(c => c.id === ctx.compId) || null;
    const run = state.comps[ctx.compId];
    if (comp && run) applyCompResult(comp, run, result);
  }
  if (ctx.kind === 'career') applyCareerResult(result);
  result.reward = awardMatch(result);
  app.lastContext = ctx;
  app.result = result;
  state.lastResult = { result, ctx };
  save(true);
  showResult(result, ctx);
}

function onMatchExited() {
  app.currentMatch = null;
  app.currentConfig = null;
  const root = document.getElementById('match-root');
  if (root) root.hidden = true;
  setView(state.currentView || 'match');
  Audio.playMusic('menu');
}

export function showResult(result, ctx) {
  const eng = app.currentMatch;
  if (!eng) return;
  const home = result.homeTeam || getTeam(result.homeId);
  const away = result.awayTeam || getTeam(result.awayId);
  const userWin = result.userSide === 'home' ? result.score.home > result.score.away : result.score.away > result.score.home;
  const draw = result.score.home === result.score.away;
  const title = eng.training ? 'Treino encerrado' : result.userSide === 'cpu' ? 'Fim de jogo' : userWin ? 'Vitória!' : draw ? 'Empate' : 'Derrota';
  const sub = eng.training ? 'Bom treino. Ajuste as táticas e volte para a decisão.' : `${result.competitionName} · ${Math.round(result.minute)} minutos`;
  const goals = (result.goals || []).map(g => `<div class="fixture-row"><span class="fx-date">${g.minute}'</span><span class="fx-teams">⚽ ${esc(g.player.data.name)} <span class="dim">· ${g.side === 'home' ? esc(home.name) : esc(away.name)}${g.own ? ' (gc)' : ''}</span></span></div>`).join('') || '<div class="empty-state" style="padding:18px"><p>Nenhum gol nesta partida.</p></div>';
  const mvp = result.mvp ? `${esc(result.mvp.name)} · ${esc(result.mvp.team)} · nota ${result.mvp.rating.toFixed(1)}` : '—';
  const shootout = result.shootout ? `<div class="notice" style="margin-top:10px"><span class="n-ico">◉</span><span>Pênaltis: ${home.abbr} ${result.shootout.home} × ${result.shootout.away} ${away.abbr}</span></div>` : '';
  const contextLabel = ctx.kind === 'career' ? 'Voltar à carreira' : ctx.kind === 'comp' ? 'Voltar à competição' : 'Continuar';
  const canRematch = ctx.kind === 'friendly';
  eng.uiRoot.insertAdjacentHTML('beforeend', `
    <div class="result-overlay" id="result-overlay">
      <div class="result-card">
        <div class="result-head">
          <div class="rh-kicker">${esc(sub)}</div>
          <h2>${title}</h2>
          <div class="result-scoreline">
            <div class="rs-team">${crest(home, 'crest-lg')}<span>${esc(home.name)}</span></div>
            <div class="rs-score">${result.score.home}<small> × </small>${result.score.away}</div>
            <div class="rs-team">${crest(away, 'crest-lg')}<span>${esc(away.name)}</span></div>
          </div>
          ${shootout}
        </div>
        <div class="result-body">
          <div>
            <div class="rb-title">Estatísticas da partida</div>
            ${statLine('Posse de bola', Math.round(result.possession.home) + '%', Math.round(result.possession.away) + '%')}
            ${statLine('Finalizações', result.stats.home.shots, result.stats.away.shots)}
            ${statLine('No alvo', result.stats.home.onTarget, result.stats.away.onTarget)}
            ${statLine('Passes', result.stats.home.passes, result.stats.away.passes)}
            ${statLine('Faltas', result.stats.home.fouls, result.stats.away.fouls)}
            ${statLine('Defesas', result.stats.home.saves, result.stats.away.saves)}
          </div>
          <div>
            <div class="rb-title">Melhor em campo</div>
            <div class="panel" style="padding:14px;margin-bottom:12px"><div class="row">${crest(home, 'crest-sm')}<div><b style="font-size:12px">${mvp}</b><div class="kicker" style="margin-top:3px">MVP PES 2027</div></div></div></div>
            <div class="rb-title">Gols</div>
            <div>${goals}</div>
          </div>
        </div>
        <div class="result-foot">
          <span class="reward">◈ +${result.reward?.coins || 0} PES</span>
          <span class="reward">✦ +${result.reward?.xp || 0} XP</span>
          <span class="rf-spacer"></span>
          ${canRematch ? '<button class="btn btn-ghost btn-sm" data-action="result-rematch">Revanche</button>' : ''}
          <button class="btn btn-primary" data-action="result-continue">${contextLabel}</button>
        </div>
      </div>
    </div>`);
  Audio.sfx(result.userWin ? 'trophy' : 'whistle');
}

export function endMatchAndGo(callback) {
  const eng = app.currentMatch;
  if (eng) eng.destroy();
  app.currentMatch = null;
  app.currentConfig = null;
  const root = document.getElementById('match-root');
  if (root) root.hidden = true;
  Audio.stopCommentary();
  Audio.playMusic('menu');
  callback?.();
}

export function resultRematch() {
  const cfg = app.currentConfig;
  if (!cfg) return;
  endMatchAndGo(() => launchMatch(cfg));
}

export function resultContinue() {
  const ctx = app.lastContext || { kind: 'friendly' };
  const wasComp = ctx.kind === 'comp' ? ctx.compId : null;
  const wasCareer = ctx.kind === 'career';
  endMatchAndGo(() => {
    if (wasComp) {
      setView('comps');
      setTimeout(() => window.dispatchEvent(new CustomEvent('pes-open-comp', { detail: wasComp })), 40);
    } else if (wasCareer) setView('career');
    else setView('match');
  });
}

/* ---------------- Wizard ---------------- */

export function openWizard(mode = 'friendly') {
  const home = favoriteTeam();
  const away = randomOpponent([home.id]);
  app.wizard = {
    step: 1, mode, homeId: home.id, awayId: away.id, active: 'home',
    leagueFilter: home.leagueId || 'brasileirao', twoPlayer: mode === '2p',
    options: {
      difficulty: state.settings.difficulty, halfLength: state.settings.halfLength,
      weather: state.settings.weather, camera: state.settings.camera,
      quality: state.settings.quality, tilt: state.settings.tilt,
      showControls: state.settings.showControls !== false,
      stadium: home.stadium.name
    }
  };
  renderWizard();
}

function wizardTeams() {
  const league = getLeague(app.wizard.leagueFilter);
  return league ? league.teams : ALL_TEAMS;
}

export function renderWizard() {
  const w = app.wizard;
  if (!w) return;
  const home = getTeam(w.homeId), away = getTeam(w.awayId);
  const steps = [1, 2, 3].map(i => `<div class="step-dot ${i < w.step ? 'is-done' : i === w.step ? 'is-active' : ''}"><i></i></div>`).join('');
  let body = '', foot = '';
  if (w.step === 1) {
    const leagueOptions = [getLeague(w.leagueFilter), ...new Set(ALL_TEAMS.map(t => getLeague(t.leagueId)))].filter(Boolean);
    const uniqueLeagues = [];
    const seen = new Set();
    for (const l of leagueOptions) { if (!seen.has(l.id)) { seen.add(l.id); uniqueLeagues.push(l); } }
    const teams = wizardTeams();
    body = `<div class="steps">${steps}</div>
      <div class="versus-pick">
        <button class="versus-side ${w.active === 'home' ? 'is-selected' : ''}" data-action="wiz-side" data-side="home">${crest(home, 'crest-lg')}<span class="vs-label">CASA</span><b>${esc(home.name)}</b><small>${overallForSquad(home)} OVR</small></button>
        <div class="versus-mid">VS</div>
        <button class="versus-side ${w.active === 'away' ? 'is-selected' : ''}" data-action="wiz-side" data-side="away">${crest(away, 'crest-lg')}<span class="vs-label">FORA</span><b>${esc(away.name)}</b><small>${overallForSquad(away)} OVR</small></button>
      </div>
      <div class="row wrap" style="margin-bottom:10px">
        <select class="select" id="wiz-league" data-change="wiz-league" style="max-width:290px">${uniqueLeagues.map(l => `<option value="${l.id}" ${w.leagueFilter === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
        <span class="kicker">Escolhendo: ${w.active === 'home' ? 'CASA' : 'FORA'}</span>
      </div>
      <div class="team-picker">${teams.map(t => `<button class="team-card ${t.id === (w.active === 'home' ? w.homeId : w.awayId) ? 'is-selected' : ''}" data-action="wiz-team" data-id="${t.id}">${crest(t, 'crest-sm')}<span class="tr-copy"><b>${esc(t.name)}</b><small>${esc(t.country)}</small></span><span class="tc-meta"><b>${overallForSquad(t)}</b>OVR</span></button>`).join('')}</div>`;
    foot = `<button class="btn btn-ghost" data-action="close-modal">Cancelar</button><span class="spacer"></span><span class="foot-note">${w.mode === 'training' ? 'TREINO' : w.mode === '2p' ? '2 JOGADORES' : w.mode === 'cpu' ? 'CPU VS CPU' : 'AMISTOSO'}</span><button class="btn btn-primary" data-action="wiz-next">Continuar</button>`;
  } else if (w.step === 2) {
    body = `<div class="steps">${steps}</div>
      <div class="form-grid">
        <div class="field"><label>DIFICULDADE</label><select class="select" id="wiz-diff">${DIFFICULTIES.map(d => `<option value="${d.id}" ${state.settings.difficulty === d.id ? 'selected' : ''}>${d.name} — ${d.desc}</option>`).join('')}</select></div>
        <div class="field"><label>DURAÇÃO DE CADA TEMPO</label><select class="select" id="wiz-half">${[2, 3, 4, 5, 6, 8, 10].map(m => `<option value="${m}" ${state.settings.halfLength === m ? 'selected' : ''}>${m} minutos</option>`).join('')}</select></div>
        <div class="field"><label>CLIMA</label><select class="select" id="wiz-weather">${WEATHERS.map(x => `<option value="${x.id}" ${state.settings.weather === x.id ? 'selected' : ''}>${x.icon} ${x.name}</option>`).join('')}</select></div>
        <div class="field"><label>CÂMERA</label><select class="select" id="wiz-camera">${CAMERAS.map(x => `<option value="${x.id}" ${state.settings.camera === x.id ? 'selected' : ''}>${x.name} — ${x.desc}</option>`).join('')}</select></div>
        <div class="field"><label>ESTÁDIO</label><input class="input" id="wiz-stadium" value="${esc(w.options.stadium)}" /></div>
        <div class="field"><label>QUALIDADE GRÁFICA</label><select class="select" id="wiz-quality">${['alta', 'media', 'baixa'].map(q => `<option value="${q}" ${state.settings.quality === q ? 'selected' : ''}>${q.toUpperCase()}</option>`).join('')}</select></div>
        <div class="span-2">
          <label class="check"><input type="checkbox" id="wiz-two" ${w.twoPlayer ? 'checked' : ''} /> Dois jogadores no mesmo dispositivo (P2: I/J/K/L + N/M/B/V)</label>
          <label class="check"><input type="checkbox" id="wiz-tilt" ${w.options.tilt ? 'checked' : ''} /> Usar acelerômetro / inclinação no celular</label>
          <label class="check"><input type="checkbox" id="wiz-controls" ${w.options.showControls ? 'checked' : ''} /> Mostrar controles touch na tela</label>
        </div>
      </div>`;
    foot = `<button class="btn btn-ghost" data-action="wiz-back">Voltar</button><span class="spacer"></span><button class="btn btn-primary" data-action="wiz-next">Continuar</button>`;
  } else {
    body = `<div class="steps">${steps}</div>
      <div class="panel" style="padding:22px;text-align:center">
        <div class="mo-kicker" style="font-family:var(--mono);font-size:9px;letter-spacing:4px;color:var(--teal)">CONFRONTO CONFIRMADO</div>
        <div class="result-scoreline" style="margin:20px 0 6px">
          <div class="rs-team">${crest(home, 'crest-lg')}<span>${esc(home.name)}</span><small class="kicker">${overallForSquad(home)} OVR</small></div>
          <div class="rs-score" style="font-size:32px">VS</div>
          <div class="rs-team">${crest(away, 'crest-lg')}<span>${esc(away.name)}</span><small class="kicker">${overallForSquad(away)} OVR</small></div>
        </div>
        <div class="grid grid-3" style="margin-top:18px;text-align:left">
          <div class="panel" style="padding:12px"><div class="kicker">MODO</div><b style="font-size:11px">${w.mode === 'training' ? 'Treino' : w.mode === '2p' ? '2 Jogadores' : w.mode === 'cpu' ? 'CPU vs CPU' : 'Amistoso'}</b></div>
          <div class="panel" style="padding:12px"><div class="kicker">DIFICULDADE</div><b style="font-size:11px">${DIFFICULTIES.find(d => d.id === w.options.difficulty)?.name || 'Profissional'}</b></div>
          <div class="panel" style="padding:12px"><div class="kicker">TEMPO</div><b style="font-size:11px">${w.options.halfLength} min por tempo</b></div>
        </div>
        <div class="notice" style="margin-top:14px;text-align:left"><span class="n-ico">i</span><span>Controles: joystick na tela, botões de passe/chute/drible/correr, teclado WASD + espaço/J/K e Shift. Use P para pausar.</span></div>
      </div>`;
    foot = `<button class="btn btn-ghost" data-action="wiz-back">Voltar</button><span class="spacer"></span><button class="btn btn-primary" data-action="wiz-launch">Entrar em campo</button>`;
  }
  openModal({
    eyebrow: 'Central de partida', title: w.mode === 'training' ? 'Treino livre' : w.mode === '2p' ? 'Multiplayer local' : w.mode === 'cpu' ? 'CPU vs CPU' : 'Nova partida',
    desc: 'Monte o confronto, ajuste o clima e entre em campo.', body, foot, wide: true
  });
}

export function wizardNext() {
  const w = app.wizard;
  if (!w) return;
  if (w.step === 1) {
    if (w.homeId === w.awayId) { toast('Escolha times diferentes.', '!', true); return; }
    w.step = 2;
  } else if (w.step === 2) {
    w.options = {
      difficulty: $('#wiz-diff')?.value || w.options.difficulty,
      halfLength: Number($('#wiz-half')?.value || w.options.halfLength),
      weather: $('#wiz-weather')?.value || w.options.weather,
      camera: $('#wiz-camera')?.value || w.options.camera,
      quality: $('#wiz-quality')?.value || w.options.quality,
      tilt: !!$('#wiz-tilt')?.checked,
      showControls: !!$('#wiz-controls')?.checked,
      stadium: $('#wiz-stadium')?.value.trim() || w.options.stadium
    };
    w.twoPlayer = !!$('#wiz-two')?.checked;
    w.step = 3;
  }
  renderWizard();
}

export function wizardBack() {
  if (!app.wizard) return;
  app.wizard.step = Math.max(1, app.wizard.step - 1);
  renderWizard();
}

export function wizardLaunch() {
  const w = app.wizard;
  if (!w) return;
  const o = w.options || {};
  launchMatch({
    homeId: w.homeId, awayId: w.awayId,
    userSide: w.mode === 'cpu' ? 'cpu' : 'home',
    twoPlayer: w.twoPlayer || w.mode === '2p',
    mode: w.mode === 'training' ? 'training' : 'match',
    difficulty: o.difficulty || state.settings.difficulty,
    halfLength: Number(o.halfLength || state.settings.halfLength),
    weather: o.weather || state.settings.weather,
    camera: o.camera || state.settings.camera,
    quality: o.quality || state.settings.quality,
    tilt: !!o.tilt,
    showControls: o.showControls !== false,
    stadium: o.stadium || undefined,
    competitionName: w.mode === 'training' ? 'Treino Livre' : w.mode === '2p' ? 'Multiplayer Local' : w.mode === 'cpu' ? 'CPU vs CPU' : 'Amistoso'
  });
}

export function wizardLeagueFilter(value) {
  if (!app.wizard) return;
  app.wizard.leagueFilter = value;
  renderWizard();
}

export function wizardPickSide(side) {
  if (!app.wizard) return;
  app.wizard.active = side;
  const activeTeam = side === 'home' ? app.wizard.homeId : app.wizard.awayId;
  const t = getTeam(activeTeam);
  if (t) app.wizard.leagueFilter = t.leagueId;
  renderWizard();
}

export function wizardPickTeam(id) {
  if (!app.wizard) return;
  if (app.wizard.active === 'home') {
    if (id === app.wizard.awayId) { toast('Este time já está do outro lado.', '!', true); return; }
    app.wizard.homeId = id;
  } else {
    if (id === app.wizard.homeId) { toast('Este time já está do outro lado.', '!', true); return; }
    app.wizard.awayId = id;
  }
  renderWizard();
}
