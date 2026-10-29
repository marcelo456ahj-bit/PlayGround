/* Inicialização e ligação de eventos da interface. */

import {
  ALL_TEAMS, ALL_PLAYERS, COMPETITIONS, UNLOCKABLES, getTeam, getLeague
} from './data.js';
import { state, app, favoriteTeam, save, applyOverrides } from './state.js';
import {
  $, $$, esc, crest, toast, openModal, closeModal, openSettings,
  saveSettings, ensureAudio, updateChrome
} from './ui.js';
import { render, setView } from './screens.js';
import {
  quickStart, launchMatch, openWizard, renderWizard, wizardNext, wizardBack,
  wizardLaunch, wizardPickSide, wizardPickTeam, wizardLeagueFilter,
  resultRematch, resultContinue
} from './match-flow.js';
import {
  makeLeagueRun, newCupRun, compRunHtml, simulateCompRound, userFixture
} from './competitions.js';
import {
  startCareer, careerNextFixture, simulateCareerRound, careerNextSeason
} from './career.js';
import { Audio } from './audio.js';

/* ---------------- Competições ---------------- */

function ensureCompRun(compId) {
  const comp = COMPETITIONS.find(c => c.id === compId);
  if (!comp) return null;
  let run = state.comps[compId];
  if (!run || run.compId !== compId) {
    const teamId = favoriteTeam().id;
    run = comp.type === 'league' ? makeLeagueRun(teamId, comp.teams) : newCupRun(teamId, comp.teams);
    run.compId = compId;
    state.comps[compId] = run;
    save(true);
  }
  return { comp, run };
}

function openComp(compId) {
  const found = ensureCompRun(compId);
  if (!found) { toast('Competição indisponível.', '!', true); return; }
  const { comp, run } = found;
  app.compId = compId;
  openModal({
    eyebrow: `${comp.confed} · ${comp.type === 'cup' ? 'MATA-MATA' : 'LIGA'}`,
    title: `<span style="color:${comp.color}">${comp.icon}</span> ${esc(comp.name)}`,
    desc: `${comp.format} · ${comp.teams.length} times · Campeão leva ${comp.prize || 1000} PES`,
    body: `<div class="row wrap" style="margin-bottom:12px"><span class="pill lime">${comp.country}</span><span class="pill teal">${esc(favoriteTeam().name)}</span><span class="spacer"></span><span class="kicker">${esc(comp.season || 'TEMPORADA 2027')}</span></div>${compRunHtml(comp, run)}`,
    foot: `<button class="btn btn-ghost" data-action="close-modal">Fechar</button><span class="spacer"></span><span class="foot-note">Progresso salvo automaticamente</span>`
  });
}

function playComp(compId) {
  const found = ensureCompRun(compId);
  if (!found) return;
  const { comp, run } = found;
  if (run.done) { toast('Esta competição já terminou.', '!', true); return; }
  let homeId, awayId;
  if (run.kind === 'league') {
    const fx = userFixture(run);
    if (!fx) { simulateCompRound(comp, run); save(); openComp(compId); return; }
    homeId = fx.home; awayId = fx.away;
  } else {
    if (run.eliminated) { simulateCompRound(comp, run); save(); openComp(compId); return; }
    const round = run.rounds[run.round] || [];
    const m = round.find(x => x.a === run.teamId || x.b === run.teamId);
    if (!m) { simulateCompRound(comp, run); save(); openComp(compId); return; }
    homeId = m.a; awayId = m.b;
  }
  launchMatch({
    homeId, awayId,
    userSide: homeId === run.teamId ? 'home' : 'away',
    competitionName: comp.short,
    stadium: getTeam(homeId)?.stadium?.name,
    requireWinner: comp.type === 'cup',
    context: { kind: 'comp', compId }
  });
}

function simulateComp(compId) {
  const found = ensureCompRun(compId);
  if (!found) return;
  const { comp, run } = found;
  if (run.done) { toast('Competição já encerrada.', '!', true); return; }
  simulateCompRound(comp, run);
  save();
  updateChrome();
  openComp(compId);
  toast(run.done ? (run.champion === run.teamId ? 'Você é campeão!' : 'Competição encerrada.') : 'Rodada simulada.', '✓');
}

/* ---------------- Carreira ---------------- */

function openCareerModal(mode) {
  const teamId = favoriteTeam().id;
  const teams = ALL_TEAMS.filter(t => !t.isNational && t.leagueId !== 'selecoes');
  openModal({
    eyebrow: mode === 'star' ? 'RUMO AO ESTRELATO' : 'MASTER LEAGUE',
    title: mode === 'star' ? 'Crie seu jogador' : 'Assuma um clube',
    desc: mode === 'star' ? 'Escolha o clube, o nome e a posição do seu craque. A carreira começa na temporada 2027.' : 'Escolha o clube que você vai comandar nesta temporada.',
    body: `<div class="form-grid">
      <div class="field span-2"><label>CLUBE</label><select class="select" id="career-team">${teams.map(t => `<option value="${t.id}" ${t.id === teamId ? 'selected' : ''}>${esc(t.name)} · ${esc(getLeague(t.leagueId)?.name || t.country)}</option>`).join('')}</select></div>
      ${mode === 'star' ? `<div class="field"><label>NOME DO JOGADOR</label><input class="input" id="career-name" maxlength="22" placeholder="Ex.: RONALDO JR" /></div><div class="field"><label>POSIÇÃO</label><select class="select" id="career-pos"><option value="ATA">ATA — Atacante</option><option value="PON">PON — Ponta</option><option value="MEI">MEI — Meia</option></select></div>` : ''}
    </div>
    <div class="notice" style="margin-top:14px"><span class="n-ico">i</span><span>Dificuldade atual: <b>${state.settings.difficulty}</b>. Você pode alterar nas configurações ou no wizard de partida.</span></div>`,
    foot: `<button class="btn btn-ghost" data-action="close-modal">Cancelar</button><span class="spacer"></span><button class="btn btn-primary" data-action="career-start" data-mode="${mode}">Começar carreira</button>`
  });
}

function startCareerFromModal(mode) {
  const teamId = $('#career-team')?.value || favoriteTeam().id;
  const name = ($('#career-name')?.value || 'NOVO CRAQUE').trim().toUpperCase() || 'NOVO CRAQUE';
  const pos = $('#career-pos')?.value || 'ATA';
  const career = startCareer(mode, teamId, name, pos);
  if (!career) { toast('Não foi possível iniciar a carreira.', '!', true); return; }
  save();
  closeModal();
  setView('career');
  toast(mode === 'star' ? 'Sua história começa agora!' : 'Boa sorte no comando!', '★');
}

function playCareer() {
  const c = state.career;
  if (!c) { openCareerModal('master'); return; }
  const fx = careerNextFixture();
  if (!fx) { toast('A temporada terminou. Inicie uma nova temporada.', '!', true); return; }
  const league = getLeague(getTeam(c.teamId)?.leagueId);
  launchMatch({
    homeId: fx.home, awayId: fx.away,
    userSide: fx.home === c.teamId ? 'home' : 'away',
    competitionName: league?.name || 'Liga',
    stadium: getTeam(fx.home)?.stadium?.name,
    context: { kind: 'career' }
  });
}

function simCareer() {
  if (!state.career) return;
  if (state.career.run.done) { toast('Temporada já encerrada.', '!', true); return; }
  simulateCareerRound();
  save();
  updateChrome();
  if (app.view === 'career') setView('career');
  toast('Rodada simulada.', '✓');
}

/* ---------------- Editor ---------------- */

function saveEditor() {
  const team = getTeam(app.editorTeam) || favoriteTeam();
  const existing = state.editorTeams[team.id] || {};
  state.editorTeams[team.id] = {
    ...existing,
    name: $('#ed-name')?.value.trim() || team.name,
    primary: $('#ed-primary')?.value || team.colors.primary,
    secondary: $('#ed-secondary')?.value || team.colors.secondary,
    accent: $('#ed-accent')?.value || team.colors.accent,
    shorts: $('#ed-shorts')?.value || team.colors.shorts,
    socks: existing.socks || team.colors.socks,
    symbol: $('#ed-symbol')?.value || team.crest.symbol,
    shape: $('#ed-shape')?.value || team.crest.shape,
    stadiumName: $('#ed-stadium')?.value.trim() || team.stadium.name,
    stadiumCapacity: Number($('#ed-capacity')?.value) || team.stadium.capacity,
    formation: $('#ed-formation')?.value || team.formation,
    mentality: $('#ed-mentality')?.value || team.mentality
  };
  applyOverrides();
  save();
  setView('editor');
  toast('Time atualizado.', '✓');
}

function resetEditor() {
  const team = getTeam(app.editorTeam) || favoriteTeam();
  delete state.editorTeams[team.id];
  save();
  toast('Alterações restauradas ao recarregar.', '↺');
  setTimeout(() => location.reload(), 500);
}

/* ---------------- Mercado ---------------- */

function buyPlayer(playerId) {
  const team = getTeam(app.marketTeam) || favoriteTeam();
  const player = ALL_PLAYERS.find(p => p.id === playerId);
  if (!player) return;
  if (team.squad.some(p => p.id === playerId)) { toast('Jogador já está no elenco.', '!', true); return; }
  const budget = state.marketBudgets[team.id] ?? team.transferBudget;
  const price = Math.round(player.value * 1.15);
  if (budget < price) { toast('Verba insuficiente para esta contratação.', '!', true); return; }
  state.marketBudgets[team.id] = budget - price;
  const roster = state.roster[team.id] || { bought: [], sold: [] };
  roster.bought = Array.isArray(roster.bought) ? roster.bought : [];
  roster.sold = Array.isArray(roster.sold) ? roster.sold : [];
  if (!roster.bought.includes(playerId)) roster.bought.push(playerId);
  roster.sold = roster.sold.filter(id => id !== playerId);
  state.roster[team.id] = roster;
  applyOverrides();
  save();
  setView('transfers');
  toast(`${player.name} contratado por ${Math.round(price / 1000)} mil PES.`, '✓');
}

function sellPlayer(playerId) {
  const team = getTeam(app.marketTeam) || favoriteTeam();
  const player = team.squad.find(p => p.id === playerId);
  if (!player) return;
  if (team.squad.length <= 14) { toast('Elenco muito pequeno para vender.', '!', true); return; }
  const budget = state.marketBudgets[team.id] ?? team.transferBudget;
  state.marketBudgets[team.id] = budget + Math.round(player.value * .85);
  const roster = state.roster[team.id] || { bought: [], sold: [] };
  roster.bought = (Array.isArray(roster.bought) ? roster.bought : []).filter(id => id !== playerId);
  roster.sold = Array.isArray(roster.sold) ? roster.sold : [];
  if (!roster.sold.includes(playerId)) roster.sold.push(playerId);
  state.roster[team.id] = roster;
  applyOverrides();
  save();
  setView('transfers');
  toast(`${player.name} vendido.`, '✓');
}

/* ---------------- Loja ---------------- */

function buyUnlock(id) {
  const item = UNLOCKABLES.find(u => u.id === id);
  if (!item || state.unlocks.includes(id)) return;
  if (state.coins < item.price) { toast('Créditos insuficientes.', '!', true); return; }
  state.coins -= item.price;
  state.unlocks.push(id);
  save();
  updateChrome();
  setView('extras');
  Audio.sfx('unlock');
  toast(`${item.name} desbloqueado!`, '◈');
}

/* ---------------- Eventos ---------------- */

function handleAction(action, el) {
  ensureAudio();
  switch (action) {
    case 'nav':
      setView(el.dataset.view);
      break;
    case 'quick':
      quickStart(el.dataset.mode || 'friendly');
      break;
    case 'open-wizard':
      openWizard(el.dataset.mode || 'friendly');
      break;
    case 'comp-open':
      openComp(el.dataset.comp);
      break;
    case 'comp-filter':
      app.compFilter = el.dataset.filter;
      setView('comps');
      break;
    case 'comp-team-list':
      app.compFilter = 'national';
      setView('comps');
      break;
    case 'play-comp':
      playComp(el.dataset.comp);
      break;
    case 'sim-comp':
      simulateComp(el.dataset.comp);
      break;
    case 'reset-comp':
      state.comps[el.dataset.comp] = null;
      delete state.comps[el.dataset.comp];
      save(true);
      openComp(el.dataset.comp);
      toast('Competição reiniciada.', '↺');
      break;
    case 'career-mode':
      openCareerModal(el.dataset.mode || 'master');
      break;
    case 'career-start':
      startCareerFromModal(el.dataset.mode || 'master');
      break;
    case 'career-play':
      playCareer();
      break;
    case 'career-sim':
      simCareer();
      break;
    case 'career-tab':
      state.careerTab = el.dataset.tab || 'overview';
      setView('career');
      break;
    case 'career-new-season':
      careerNextSeason();
      save();
      setView('career');
      toast('Nova temporada iniciada.', '◈');
      break;
    case 'career-reset':
      openModal({
        eyebrow: 'CARREIRA', title: 'Recomeçar carreira?',
        desc: 'Todo o progresso da carreira atual será apagado. O restante do seu perfil permanece salvo.',
        body: '<div class="notice is-danger"><span class="n-ico">!</span><span>Esta ação não pode ser desfeita.</span></div>',
        foot: `<button class="btn btn-ghost" data-action="close-modal">Cancelar</button><span class="spacer"></span><button class="btn btn-danger" data-action="career-reset-confirm">Apagar carreira</button>`
      });
      break;
    case 'career-reset-confirm':
      state.career = null;
      save();
      closeModal();
      setView('career');
      toast('Carreira apagada.', '↺');
      break;
    case 'editor-reset':
      resetEditor();
      break;
    case 'editor-swatch': {
      const input = $('#ed-primary');
      if (input) input.value = el.dataset.color;
      const shirt = $('.kit-shirt');
      if (shirt) shirt.style.background = `linear-gradient(135deg,${el.dataset.color},${$('#ed-accent')?.value || el.dataset.color})`;
      break;
    }
    case 'editor-save':
      saveEditor();
      break;
    case 'market-search':
      app.marketQuery = $('#market-search')?.value || '';
      setView('transfers');
      break;
    case 'market-reset':
      app.marketQuery = '';
      app.marketPos = 'TODOS';
      setView('transfers');
      break;
    case 'market-buy':
      buyPlayer(el.dataset.id);
      break;
    case 'market-sell':
      sellPlayer(el.dataset.id);
      break;
    case 'buy-unlock':
      buyUnlock(el.dataset.id);
      break;
    case 'open-settings':
      openSettings();
      break;
    case 'save-settings':
      saveSettings();
      save();
      closeModal();
      updateChrome();
      render();
      toast('Configurações salvas.', '✓');
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'wiz-next':
      wizardNext();
      break;
    case 'wiz-back':
      wizardBack();
      break;
    case 'wiz-launch':
      wizardLaunch();
      break;
    case 'wiz-side':
      wizardPickSide(el.dataset.side);
      break;
    case 'wiz-team':
      wizardPickTeam(el.dataset.id);
      break;
    case 'result-rematch':
      resultRematch();
      break;
    case 'result-continue':
      resultContinue();
      break;
    default:
      break;
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (['pass', 'shoot', 'dribble', 'sprint', 'switch'].includes(action)) return;
  handleAction(action, el);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const kind = el.dataset.change;
  if (kind === 'wiz-league') wizardLeagueFilter(el.value);
  else if (kind === 'editor-team') { app.editorTeam = el.value; setView('editor'); }
  else if (kind === 'market-team') { app.marketTeam = el.value; setView('transfers'); }
  else if (kind === 'market-pos') { app.marketPos = el.value; setView('transfers'); }
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-slider]');
  if (!el) return;
  const label = document.getElementById(`v-${el.dataset.slider}`);
  if (label) label.textContent = `${Math.round(Number(el.value) * 100)}%`;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#modal-root')?.classList.contains('is-open')) closeModal();
  }
});

window.addEventListener('pes-open-comp', (e) => {
  if (e.detail) openComp(e.detail);
});

window.addEventListener('pointerdown', () => ensureAudio(), { once: true });

function boot() {
  try {
    render();
    updateChrome();
  } catch (err) {
    console.error('Falha ao iniciar a interface:', err);
    const screen = $('#screen');
    if (screen) {
      screen.innerHTML = `<div class="panel" style="padding:24px"><h2>Não foi possível carregar o jogo</h2><p class="small muted">${esc(err.message)}</p><button class="btn btn-primary" data-action="nav" data-view="home">Tentar novamente</button></div>`;
    }
  }
}

boot();

if (document.readyState !== 'complete') {
  window.addEventListener('load', () => { if (!state.currentView) { state.currentView = 'home'; updateChrome(); } }, { once: true });
}
