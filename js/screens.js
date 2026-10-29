/* Telas do aplicativo: home, partida, competições, carreira, editor, mercado e extras. */

import {
  VERSION, SEASON, DIFFICULTIES, FORMATIONS, MENTALITIES, UNLOCKABLES,
  ALL_TEAMS, ALL_PLAYERS, COMPETITIONS, HERO_NEWS, getTeam, getLeague,
  playerValueLabel, defaultLineup, overallForSquad, formatMoney, nextMatchDate, slug
} from './data.js';
import { state, app, favoriteTeam, randomOpponent, teamLeagueName, save } from './state.js';
import { $, esc, crest, teamCard, playerRow, pageHead, toast, updateChrome } from './ui.js';
import { tableHtml, sortedTable } from './competitions.js';
import { careerNextFixture } from './career.js';

function compCard(comp) {
  return `<button class="comp-card" data-action="comp-open" data-comp="${comp.id}" style="--accent:${comp.color}">
    <span class="comp-glow"></span><span class="comp-tag">${comp.type === 'cup' ? 'COPA' : 'LIGA'}</span>
    <span class="comp-icon">${comp.icon}</span><span class="comp-country">${esc(comp.country)} · ${esc(comp.confed)}</span>
    <h3>${esc(comp.short)}</h3>
    <span class="comp-meta"><span><b>${comp.teams.length}</b> times</span><span>${esc(comp.format)}</span><span><b>${comp.prize || 1000}</b> PES</span></span>
  </button>`;
}

export function renderHome() {
  const fav = favoriteTeam();
  const c = state.career;
  const next = careerNextFixture();
  const hero = `<section class="hero">
    <div class="hero-copy">
      <div class="hero-kicker">TEMPORADA ${SEASON} · FOOTBALL LIVES HERE</div>
      <h1>PES 2027<b>STICKMAN 2D</b></h1>
      <p>Carreiras, Libertadores, Champions, Brasileirão e multiplayer local em um só lugar. Controle stickmen, chute de onde quiser e leve seu clube ao topo do mundo.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" data-action="quick" data-mode="friendly">Jogo rápido</button>
        <button class="btn btn-teal" data-action="career-mode" data-mode="master">Iniciar carreira</button>
        <button class="btn btn-ghost" data-action="open-wizard">Criar partida</button>
      </div>
      <div class="hero-stats"><div><b>${ALL_TEAMS.length}</b><span>TIMES</span></div><div><b>${ALL_PLAYERS.length}</b><span>JOGADORES</span></div><div><b>${COMPETITIONS.length}</b><span>COMPETIÇÕES</span></div><div><b>${state.coins.toLocaleString('pt-BR')}</b><span>CRÉDITOS</span></div></div>
    </div>
    <div class="hero-art">
      <canvas id="hero-canvas"></canvas>
      <div class="hero-badge"><span class="edition">EDIÇÃO 2027</span><span>2.5D STICKMAN ENGINE</span><span>PT-BR · TOUCH</span></div>
      <div class="hero-corner"><span class="dot"></span> ESTÁDIO AO VIVO · ${esc(fav.stadium.name.toUpperCase())}</div>
    </div>
  </section>
  <div class="quick-modes">
    <button class="quick-mode" data-action="quick" data-mode="friendly"><span class="qm-ico">⚽</span><b>Amistoso</b><small>${esc(fav.name)} pronto para jogar</small></button>
    <button class="quick-mode" data-action="open-wizard" data-mode="2p"><span class="qm-ico">👥</span><b>2 Jogadores</b><small>Mesmo dispositivo, dois controles</small></button>
    <button class="quick-mode" data-action="open-wizard" data-mode="training"><span class="qm-ico">◎</span><b>Treino</b><small>Teste chutes, dribles e táticas</small></button>
    <button class="quick-mode" data-action="quick" data-mode="penalty"><span class="qm-ico">◉</span><b>Pênaltis</b><small>Treino de cobranças decisivas</small></button>
  </div>`;
  const continueCard = c ? `<div class="panel panel-hover" style="display:flex;flex-direction:column;justify-content:space-between">
      <div><div class="panel-title">Sua carreira <span class="spacer"></span><span class="pill lime">${c.mode === 'star' ? 'RUMO AO ESTRELATO' : 'MASTER LEAGUE'}</span></div>
      <div class="team-row">${crest(getTeam(c.teamId), 'crest-lg')}<div class="tr-copy"><b style="font-size:15px">${esc(getTeam(c.teamId)?.name)}</b><small>Temporada ${c.season} · ${c.run?.round || 0}/${c.run?.fixtures.length || 0} rodadas · ${c.coins} PES</small></div></div></div>
      ${next ? `<div class="notice" style="margin-top:14px"><span class="n-ico">◈</span><span>Próximo: ${esc(getTeam(next.home)?.short)} × ${esc(getTeam(next.away)?.short)} · Rodada ${c.run.round + 1}</span></div><button class="btn btn-primary btn-block" style="margin-top:12px" data-action="career-play">Continuar carreira</button>` : `<button class="btn btn-primary btn-block" style="margin-top:14px" data-action="nav" data-view="career">Ver carreira</button>`}
    </div>` : `<div class="panel" style="display:flex;flex-direction:column;justify-content:space-between">
      <div><div class="panel-title">Modo carreira</div><p class="small muted" style="line-height:1.6">Assuma um clube na Master League ou crie seu jogador e trilhe o Rumo ao Estrelato. Transferências, objetivos, calendário e troféus.</p></div>
      <div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-action="career-mode" data-mode="master">Master League</button><button class="btn btn-teal btn-sm" data-action="career-mode" data-mode="star">Rumo ao Estrelato</button></div>
    </div>`;
  const compCards = COMPETITIONS.filter(c => ['libertadores', 'champions', 'brasileirao'].includes(c.id)).map(compCard).join('');
  return `${hero}
    <div class="section-head"><h2>Continue de onde parou</h2><div class="line"></div><button class="link" data-action="nav" data-view="career">carreira →</button></div>
    <div class="grid grid-3">
      ${continueCard}
      <div class="panel"><div class="panel-title">Favorito do comandante <span class="spacer"></span><span class="pill teal">MEU TIME</span></div>
        <div class="team-row">${crest(fav, 'crest-lg')}<div class="tr-copy"><b style="font-size:15px">${esc(fav.name)}</b><small>${esc(teamLeagueName(fav))} · ${overallForSquad(fav)} OVR</small></div></div>
        <div class="divider"></div><div class="row wrap"><button class="btn btn-sm btn-primary" data-action="quick" data-mode="friendly">Jogar agora</button><button class="btn btn-sm btn-ghost" data-action="nav" data-view="transfers">Mercado</button><button class="btn btn-sm btn-ghost" data-action="nav" data-view="editor">Editar</button></div>
      </div>
      <div class="panel"><div class="panel-title">Missões rápidas</div>
        <div class="objective ${state.record.wins >= 1 ? 'is-done' : ''}"><span class="ob-check">${state.record.wins >= 1 ? '✓' : ''}</span><span class="ob-copy">Vença uma partida<small>${state.record.wins} vitórias registradas</small></span><span class="ob-progress">1</span></div>
        <div class="objective ${state.unlocks.length >= 1 ? 'is-done' : ''}"><span class="ob-check">${state.unlocks.length >= 1 ? '✓' : ''}</span><span class="ob-copy">Desbloqueie um extra<small>${state.unlocks.length} itens na coleção</small></span><span class="ob-progress">1</span></div>
        <div class="objective ${state.record.goals >= 10 ? 'is-done' : ''}"><span class="ob-check">${state.record.goals >= 10 ? '✓' : ''}</span><span class="ob-copy">Marque 10 gols<small>${state.record.goals} gols marcados</small></span><span class="ob-progress">10</span></div>
      </div>
    </div>
    <div class="section-head"><h2>Competições em destaque</h2><div class="line"></div><button class="link" data-action="nav" data-view="comps">ver todas →</button></div>
    <div class="grid grid-3">${compCards}</div>
    <div class="ticker"><span class="tk-tag">PES NEWS</span><div class="tk-track"><div class="tk-inner">${[...HERO_NEWS, ...HERO_NEWS].map(n => `<span>${esc(n)}</span>`).join('')}</div></div></div>`;
}

export function renderMatch() {
  const fav = favoriteTeam();
  const top = ALL_TEAMS.slice().sort((a, b) => overallForSquad(b) - overallForSquad(a)).slice(0, 8);
  return `${pageHead('CENTRAL DE PARTIDA', 'Entre em <span>campo</span>', 'Escolha o modo, monte o confronto e jogue com controles touch ou teclado.', `<button class="btn btn-ghost" data-action="open-wizard" data-mode="2p">2 Jogadores</button><button class="btn btn-primary" data-action="open-wizard">Nova partida</button>`)}
    <div class="grid grid-4">
      <button class="feature-card" data-action="quick" data-mode="friendly"><div class="fc-art"></div><div class="fc-shade"></div><div class="fc-kicker">RÁPIDO</div><h3>Amistoso</h3><p>${esc(fav.name)} entra em campo contra um adversário aleatório.</p><span class="fc-cta">Jogar agora →</span></button>
      <button class="feature-card" data-action="open-wizard" data-mode="training"><div class="fc-shade"></div><div class="fc-kicker">LIVRE</div><h3>Treino</h3><p>Sem pressão de resultado. Teste finalizações, passes e dribles.</p><span class="fc-cta">Treinar →</span></button>
      <button class="feature-card" data-action="quick" data-mode="penalty"><div class="fc-shade"></div><div class="fc-kicker">DECISÃO</div><h3>Pênaltis</h3><p>Treine cobranças com a barra de força e o goleiro adversário.</p><span class="fc-cta">Cobrar →</span></button>
      <button class="feature-card" data-action="quick" data-mode="cpu"><div class="fc-shade"></div><div class="fc-kicker">SIMULAÇÃO</div><h3>CPU vs CPU</h3><p>Assista ao confronto e estude a IA em ação.</p><span class="fc-cta">Assistir →</span></button>
    </div>
    <div class="section-head"><h2>Monte seu confronto</h2><div class="line"></div><span class="kicker">${DIFFICULTIES.find(d => d.id === state.settings.difficulty)?.name} · ${state.settings.halfLength} MIN</span></div>
    <div class="panel" style="padding:22px">
      <div class="versus-pick" style="margin-bottom:0">
        <button class="versus-side" data-action="open-wizard">${crest(fav, 'crest-xl')}<span class="vs-label">SEU TIME</span><b>${esc(fav.name)}</b><small>${overallForSquad(fav)} OVR</small></button>
        <div class="versus-mid">VS</div>
        <button class="versus-side" data-action="open-wizard">${crest(randomOpponent([fav.id]), 'crest-xl')}<span class="vs-label">ESCOLHA O ADVERSÁRIO</span><b>Personalize</b><small>Clique para montar</small></button>
      </div>
      <div class="row wrap" style="justify-content:center;margin-top:16px"><button class="btn btn-primary" data-action="open-wizard">Escolher times e opções</button></div>
    </div>
    <div class="section-head"><h2>Elite mundial</h2><div class="line"></div><span class="kicker">MELHORES AVALIAÇÕES</span></div>
    <div class="grid grid-2">${top.map(t => teamCard(t, 'wiz-quick-team')).join('')}</div>`;
}

export function renderComps() {
  const filters = [['all', 'Todas'], ['league', 'Ligas'], ['cup', 'Copas'], ['national', 'Seleções']];
  const list = COMPETITIONS.filter(c => app.compFilter === 'all' || (app.compFilter === 'league' ? c.type === 'league' : app.compFilter === 'cup' ? c.type === 'cup' : c.teams.some(id => getTeam(id)?.isNational)));
  return `${pageHead('COMPETIÇÕES', 'Conquiste o <span>mundo</span>', 'Ligas nacionais, Libertadores, Champions, Copa do Mundo e torneios eliminatórios. Seu progresso fica salvo.', `<button class="btn btn-ghost" data-action="comp-team-list">Ver seleções</button>`)}
    <div class="tabs">${filters.map(([id, label]) => `<button class="tab ${app.compFilter === id ? 'is-active' : ''}" data-action="comp-filter" data-filter="${id}">${label}</button>`).join('')}</div>
    <div class="grid grid-3">${list.map(compCard).join('')}</div>`;
}

function careerObjectiveHtml(o) {
  const done = o.value >= o.target;
  return `<div class="objective ${done ? 'is-done' : ''}"><span class="ob-check">${done ? '✓' : ''}</span><span class="ob-copy">${esc(o.label)}<small>Progresso da temporada</small></span><span class="ob-progress">${o.value}/${o.target}</span></div>`;
}

export function renderCareer() {
  const c = state.career;
  if (!c) {
    return `${pageHead('MODO CARREIRA', 'Sua <span>história</span>', 'Escolha entre comandar um clube ou criar um jogador e construir uma lenda do futebol mundial.', '')}
      <div class="grid grid-2">
        <div class="panel panel-hover" style="padding:26px">
          <div class="comp-icon" style="font-size:24px">🏟</div><div class="kicker">MODO CLÁSSICO</div><h2 style="font-family:var(--display);font-style:italic;text-transform:uppercase;margin:8px 0">Master League</h2>
          <p class="small muted" style="line-height:1.6">Assuma um clube, dispute a liga nacional, faça transferências, cumpra objetivos e construa uma dinastia. O calendário e a tabela são salvos.</p>
          <button class="btn btn-primary" style="margin-top:16px" data-action="career-mode" data-mode="master">Começar Master League</button>
        </div>
        <div class="panel panel-hover" style="padding:26px">
          <div class="comp-icon" style="font-size:24px">★</div><div class="kicker">MODO JOGADOR</div><h2 style="font-family:var(--display);font-style:italic;text-transform:uppercase;margin:8px 0">Rumo ao Estrelato</h2>
          <p class="small muted" style="line-height:1.6">Crie seu atacante, entre no elenco, marque gols, suba de avaliação e conquiste espaço na elite. O jogador evolui a cada partida.</p>
          <button class="btn btn-teal" style="margin-top:16px" data-action="career-mode" data-mode="star">Criar meu jogador</button>
        </div>
      </div>`;
  }
  const team = getTeam(c.teamId);
  const next = careerNextFixture();
  const pos = c.run ? sortedTable(c.run).findIndex(r => r.id === c.teamId) + 1 : 0;
  const wins = c.run?.log.filter(x => x.user && ((x.home === c.teamId && x.hs > x.as) || (x.away === c.teamId && x.as > x.hs))).length || 0;
  const tabs = [['overview', 'Visão geral'], ['squad', 'Elenco'], ['fixtures', 'Calendário'], ['table', 'Tabela']];
  let content = '';
  if (state.careerTab === 'overview') {
    content = `<div class="career-hero">
      <div class="career-club"><div class="cc-top">${crest(team, 'crest-xl')}<div class="cc-copy"><div class="kicker">${c.mode === 'star' ? 'RUMO AO ESTRELATO' : 'MASTER LEAGUE'} · TEMPORADA ${c.season}</div><h2>${esc(team.name)}</h2><p>${esc(teamLeagueName(team))} · ${c.run?.done ? `Campanha encerrada · ${pos}º lugar` : `${wins} vitórias nesta liga`}</p></div></div>
        <div class="cc-stats"><div><b>${pos || '—'}º</b><span>POSIÇÃO</span></div><div><b>${c.coins}</b><span>VERBA PES</span></div><div><b>${c.xp}</b><span>XP CARREIRA</span></div><div><b>${c.trophies.length}</b><span>TROFÉUS</span></div></div></div>
      <div class="career-next"><div class="cn-label">PRÓXIMO COMPROMISSO</div>
        ${next ? `<div class="cn-teams"><div class="cn-team">${crest(getTeam(next.home), 'crest-lg')}<span>${esc(getTeam(next.home)?.short)}</span></div><div class="cn-vs">VS</div><div class="cn-team">${crest(getTeam(next.away), 'crest-lg')}<span>${esc(getTeam(next.away)?.short)}</span></div></div><div class="cn-date">RODADA ${c.run.round + 1} · ${nextMatchDate(c.run.round)}</div><div class="cn-actions"><button class="btn btn-primary btn-sm" data-action="career-play">Jogar</button><button class="btn btn-ghost btn-sm" data-action="career-sim">Simular</button></div>` : `<div class="empty-state" style="padding:20px"><b>Temporada encerrada</b><p>${c.run?.champion === c.teamId ? 'Você foi campeão! Parabéns.' : 'Confira a classificação final e inicie uma nova temporada.'}</p><button class="btn btn-primary btn-sm" style="margin-top:12px" data-action="career-new-season">Nova temporada</button></div>`}
      </div>
    </div>
    ${c.mode === 'star' && c.player ? `<div class="panel" style="margin-bottom:16px"><div class="panel-title">Seu jogador <span class="spacer"></span><span class="pill lime">${c.player.rating} OVR</span></div>
      <div class="grid grid-4"><div class="team-row">${crest(team, 'crest-sm')}<div class="tr-copy"><b>${esc(c.player.name)}</b><small>${c.player.pos} · ${c.player.age} anos</small></div></div><div><div class="kicker">GOLS</div><b style="font-family:var(--display);font-size:22px">${c.player.goals || 0}</b></div><div><div class="kicker">JOGOS</div><b style="font-family:var(--display);font-size:22px">${c.player.apps || 0}</b></div><div><div class="kicker">VALOR</div><b style="font-family:var(--display);font-size:16px" class="lime">${playerValueLabel(c.player.value || 0)}</b></div></div>
    </div>` : ''}
    <div class="grid grid-2"><div class="panel"><div class="panel-title">Objetivos</div>${c.objectives.map(careerObjectiveHtml).join('')}</div>
      <div class="panel"><div class="panel-title">Últimos resultados</div>${(c.history || []).slice(0, 5).map(h => `<div class="fixture-row"><span class="fx-date">R${h.round}</span><span class="fx-teams">${esc(getTeam(h.homeId)?.short)} <span class="fx-score">${h.score.home} × ${h.score.away}</span> ${esc(getTeam(h.awayId)?.short)}</span></div>`).join('') || '<div class="empty-state" style="padding:20px"><p>Nenhum jogo disputado ainda.</p></div>'}</div></div>`;
  } else if (state.careerTab === 'squad') {
    content = `<div class="panel"><div class="panel-title">Elenco · ${esc(team.name)} <span class="spacer"></span><span class="pill">${team.squad.length} jogadores</span></div><div class="grid grid-2">${team.squad.map(p => playerRow(p, `<button class="btn btn-xs btn-ghost" data-action="career-player" data-id="${p.id}">Ver</button>`)).join('')}</div></div>`;
  } else if (state.careerTab === 'fixtures') {
    content = `<div class="panel"><div class="panel-title">Calendário · ${esc(team.name)}</div>${c.run.fixtures.map((round, i) => { const m = round.find(x => x.home === c.teamId || x.away === c.teamId); const log = c.run.log.find(x => x.round === i && x.user); if (!m) return ''; return `<div class="fixture-row"><span class="fx-date">R${i + 1}</span><span class="fx-teams">${esc(getTeam(m.home)?.short)} × ${esc(getTeam(m.away)?.short)}</span><span class="fx-score">${log ? `${log.hs} × ${log.as}` : '—'}</span><span class="fx-badge">${log ? 'FIM' : i === c.run.round ? 'PRÓXIMO' : 'AGENDADO'}</span></div>`; }).join('')}</div>`;
  } else {
    content = `<div class="panel"><div class="panel-title">Classificação · ${esc(teamLeagueName(team))}</div>${tableHtml(c.run, c.teamId)}</div>`;
  }
  return `${pageHead('MODO CARREIRA', c.mode === 'star' ? 'Rumo ao <span>Estrelato</span>' : 'Master <span>League</span>', `${esc(team.name)} · Temporada ${c.season} · ${c.run.done ? 'Temporada encerrada' : 'Continue sua campanha'}`, `<button class="btn btn-ghost" data-action="career-tab" data-tab="squad">Meu elenco</button><button class="btn btn-primary" data-action="career-play">Jogar próximo</button>`)}
    <div class="row wrap" style="margin-bottom:14px"><span class="pill lime">${c.mode === 'star' ? 'JOGADOR' : 'TÉCNICO'}</span><span class="pill teal">${DIFFICULTIES.find(d => d.id === state.settings.difficulty)?.name}</span><span class="pill">${c.run.round}/${c.run.fixtures.length} rodadas</span><span class="spacer"></span><button class="btn btn-danger btn-xs" data-action="career-reset">Recomeçar carreira</button></div>
    <div class="tabs">${tabs.map(([id, label]) => `<button class="tab ${state.careerTab === id ? 'is-active' : ''}" data-action="career-tab" data-tab="${id}">${label}</button>`).join('')}</div>
    ${content}`;
}

export function renderEditor() {
  const team = getTeam(app.editorTeam) || favoriteTeam();
  const ov = state.editorTeams[team.id] || {};
  const colors = ['#c8102e', '#1c3f94', '#1b7f3f', '#f0c22a', '#ff7b3c', '#6b2c91', '#1c9bd6', '#f4f4f4', '#111111', '#c8ff3d', '#36e5c0', '#7a1f3d'];
  return `${pageHead('EDITOR DE TIMES', 'Crie sua <span>identidade</span>', 'Personalize nome, cores, uniforme, escudo, estádio e tática. As alterações são aplicadas no jogo e salvas automaticamente.', `<button class="btn btn-ghost" data-action="editor-reset">Restaurar</button>`)}
    <div class="row wrap" style="margin-bottom:16px"><select class="select" style="max-width:320px" data-change="editor-team">${ALL_TEAMS.map(t => `<option value="${t.id}" ${t.id === team.id ? 'selected' : ''}>${esc(t.name)} · ${esc(teamLeagueName(t))}</option>`).join('')}</select><span class="pill lime">${overallForSquad(team)} OVR</span></div>
    <div class="grid grid-2">
      <div class="panel"><div class="panel-title">Identidade</div>
        <div class="form-grid">
          <div class="field span-2"><label>NOME DO TIME</label><input class="input" id="ed-name" value="${esc(ov.name || team.name)}" maxlength="32" /></div>
          <div class="field"><label>COR PRINCIPAL</label><input class="input-color" type="color" id="ed-primary" value="${ov.primary || team.colors.primary}" /></div>
          <div class="field"><label>COR SECUNDÁRIA</label><input class="input-color" type="color" id="ed-secondary" value="${ov.secondary || team.colors.secondary}" /></div>
          <div class="field"><label>COR DE DESTAQUE</label><input class="input-color" type="color" id="ed-accent" value="${ov.accent || team.colors.accent}" /></div>
          <div class="field"><label>COR DO CALÇÃO</label><input class="input-color" type="color" id="ed-shorts" value="${ov.shorts || team.colors.shorts}" /></div>
          <div class="field"><label>SÍMBOLO DO ESCUDO</label><input class="input" id="ed-symbol" value="${esc(ov.symbol || team.crest.symbol)}" maxlength="3" /></div>
          <div class="field"><label>FORMATO DO ESCUDO</label><select class="select" id="ed-shape"><option value="" ${!team.crest.shape ? 'selected' : ''}>Clássico</option><option value="round" ${team.crest.shape === 'round' ? 'selected' : ''}>Redondo</option><option value="square" ${team.crest.shape === 'square' ? 'selected' : ''}>Moderno</option></select></div>
        </div>
        <div class="divider"></div><div class="kicker" style="margin-bottom:8px">PALETA RÁPIDA</div>
        <div class="swatch-row">${colors.map(c => `<button class="swatch" data-action="editor-swatch" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
      </div>
      <div class="panel"><div class="panel-title">Estádio e tática</div>
        <div class="form-grid">
          <div class="field span-2"><label>NOME DO ESTÁDIO</label><input class="input" id="ed-stadium" value="${esc(ov.stadiumName || team.stadium.name)}" /></div>
          <div class="field"><label>CAPACIDADE</label><input class="input" type="number" id="ed-capacity" value="${ov.stadiumCapacity || team.stadium.capacity}" min="5000" max="120000" step="1000" /></div>
          <div class="field"><label>FORMAÇÃO</label><select class="select" id="ed-formation">${Object.entries(FORMATIONS).map(([id, f]) => `<option value="${id}" ${team.formation === id ? 'selected' : ''}>${id} — ${f.name}</option>`).join('')}</select></div>
          <div class="field span-2"><label>POSTURA</label><select class="select" id="ed-mentality">${MENTALITIES.map(m => `<option value="${m.id}" ${team.mentality === m.id ? 'selected' : ''}>${m.name} — ${m.desc}</option>`).join('')}</select></div>
        </div>
        <div class="divider"></div>
        <div class="editor-preview" style="margin-bottom:0"><div class="kit-preview"><div class="kit-shirt" style="background:linear-gradient(135deg,${ov.primary || team.colors.primary},${ov.accent || team.colors.accent})"></div><div class="kit-shorts" style="background:${ov.shorts || team.colors.shorts}"></div><div class="kit-sock" style="background:${ov.socks || team.colors.socks}"></div></div><div>${crest(team, 'crest-lg')}<div class="kicker" style="margin-top:8px">PRÉVIA DO UNIFORME</div></div></div>
        <button class="btn btn-primary btn-block" style="margin-top:14px" data-action="editor-save">Salvar alterações</button>
      </div>
    </div>`;
}

export function renderTransfers() {
  const team = getTeam(app.marketTeam) || favoriteTeam();
  const budget = state.marketBudgets[team.id] ?? team.transferBudget;
  const q = app.marketQuery.trim().toLowerCase();
  const positions = ['TODOS', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA'];
  let market = ALL_PLAYERS.filter(p => p.teamId !== team.id);
  if (app.marketPos !== 'TODOS') market = market.filter(p => p.pos === app.marketPos);
  if (q) market = market.filter(p => p.name.toLowerCase().includes(q));
  market = market.sort((a, b) => b.rating - a.rating).slice(0, 40);
  const squad = team.squad.slice().sort((a, b) => b.rating - a.rating);
  return `${pageHead('MERCADO DA BOLA', 'Contrate <span>craques</span>', 'Negocie jogadores, gerencie a verba do clube e monte um elenco competitivo. Compra e venda são salvas.', `<button class="btn btn-ghost" data-action="market-reset">Limpar filtros</button>`)}
    <div class="row wrap" style="margin-bottom:14px"><select class="select" style="max-width:330px" data-change="market-team">${ALL_TEAMS.filter(t => !t.isNational).map(t => `<option value="${t.id}" ${t.id === team.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><span class="pill lime">${formatMoney(budget)} disponíveis</span><span class="pill teal">${team.squad.length} no elenco</span></div>
    <div class="grid grid-2">
      <div class="panel"><div class="panel-title">Mercado <span class="spacer"></span><span class="kicker">${market.length} jogadores</span></div>
        <div class="search-row"><div class="search-box"><input class="input" id="market-search" placeholder="Buscar jogador..." value="${esc(app.marketQuery)}" /></div><button class="btn btn-sm" data-action="market-search">Buscar</button><select class="select" style="max-width:120px" data-change="market-pos">${positions.map(p => `<option ${app.marketPos === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="player-list" style="max-height:520px;overflow-y:auto">${market.map(p => {
          const owned = team.squad.some(x => x.id === p.id);
          const price = Math.round(p.value * 1.15);
          return `<div class="player-row"><span class="pr-num">${p.num}</span><span class="pr-pos">${p.pos}</span><span class="pr-name">${esc(p.name)}<small class="dim" style="display:block;font-size:8px">${esc(getTeam(p.teamId)?.short)} · ${p.age} anos</small></span><span class="pr-ovr">${p.rating}</span><span class="pr-meta">${playerValueLabel(price)}</span><button class="btn btn-xs ${owned ? '' : 'btn-primary'}" ${owned || budget < price ? 'disabled' : ''} data-action="market-buy" data-id="${p.id}">${owned ? 'No elenco' : 'Contratar'}</button></div>`;
        }).join('') || '<div class="empty-state"><p>Nenhum jogador encontrado.</p></div>'}</div>
      </div>
      <div class="panel"><div class="panel-title">Seu elenco <span class="spacer"></span><span class="pill">${team.abbr} · ${overallForSquad(team)} OVR</span></div>
        <div class="player-list" style="max-height:560px;overflow-y:auto">${squad.map(p => {
          const inLineup = defaultLineup(team).includes(p.id);
          return `<div class="player-row"><span class="pr-num">${p.num}</span><span class="pr-pos">${p.pos}</span><span class="pr-name">${esc(p.name)}${inLineup ? ' <span class="pill teal" style="padding:1px 4px;font-size:6px">TITULAR</span>' : ''}</span><span class="pr-ovr">${p.rating}</span><span class="pr-meta">${playerValueLabel(p.value)}</span><button class="btn btn-xs btn-ghost" data-action="market-sell" data-id="${p.id}">Vender</button></div>`;
        }).join('')}</div>
      </div>
    </div>`;
}

export function renderExtras() {
  const owned = new Set(state.unlocks);
  return `${pageHead('EXTRAS & LOJA', 'Coleção <span>PES</span>', 'Use seus créditos para desbloquear uniformes, estádios, narração e modos especiais. Os itens ficam salvos na sua conta.', `<button class="btn btn-ghost" data-action="open-settings">Configurações</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">
      <div class="panel"><div class="panel-title">Carteira</div><div style="font-family:var(--display);font-size:30px" class="lime">${state.coins.toLocaleString('pt-BR')}</div><div class="kicker">CRÉDITOS PES</div><div class="divider"></div><span class="small muted">Ganhe créditos jogando partidas, competições e carreiras.</span></div>
      <div class="panel"><div class="panel-title">Coleção</div><div style="font-family:var(--display);font-size:30px">${state.unlocks.length}<span style="font-size:14px;color:var(--dim)">/${UNLOCKABLES.length}</span></div><div class="kicker">ITENS DESBLOQUEADOS</div><div class="divider"></div><span class="small muted">Todos os itens comprados ficam disponíveis permanentemente neste dispositivo.</span></div>
      <div class="panel"><div class="panel-title">Registro</div><div class="grid grid-2" style="gap:8px"><div><div class="kicker">PARTIDAS</div><b>${state.record.matches}</b></div><div><div class="kicker">VITÓRIAS</div><b class="lime">${state.record.wins}</b></div><div><div class="kicker">GOLS</div><b>${state.record.goals}</b></div><div><div class="kicker">NÍVEL</div><b>${state.profile.level}</b></div></div></div>
    </div>
    <div class="section-head"><h2>Loja de extras</h2><div class="line"></div><span class="kicker">${state.coins.toLocaleString('pt-BR')} PES</span></div>
    <div class="grid grid-3">${UNLOCKABLES.map(u => {
      const has = owned.has(u.id);
      return `<div class="panel panel-hover" style="display:flex;flex-direction:column">
        <div class="row" style="justify-content:space-between"><span class="comp-icon" style="margin:0;width:42px;height:42px;font-size:20px">${u.icon}</span><span class="pill ${has ? 'lime' : ''}">${has ? 'DESBLOQUEADO' : esc(u.type.toUpperCase())}</span></div>
        <h3 style="font-family:var(--display);font-style:italic;text-transform:uppercase;margin:12px 0 4px;font-size:15px">${esc(u.name)}</h3>
        <p class="small muted" style="line-height:1.5;flex:1">${esc(u.desc)}</p>
        <button class="btn btn-block ${has ? '' : 'btn-primary'}" style="margin-top:12px" ${has || state.coins < u.price ? 'disabled' : ''} data-action="buy-unlock" data-id="${u.id}">${has ? 'Na coleção' : `Comprar · ${u.price} PES`}</button>
      </div>`;
    }).join('')}</div>
    <div class="section-head"><h2>Créditos</h2><div class="line"></div></div>
    <div class="notice"><span class="n-ico">i</span><span>PES 2027 STICKMAN 2D · Engine 2.5D em canvas, áudio procedural WebAudio, narração por Web Speech API em pt-BR. Projeto demonstrativo. VERSION ${VERSION}.</span></div>`;
}

const views = { home: renderHome, match: renderMatch, comps: renderComps, career: renderCareer, editor: renderEditor, transfers: renderTransfers, extras: renderExtras };

export function render() {
  cancelAnimationFrame(app.heroRaf);
  const screen = $('#screen');
  if (!screen) return;
  state.currentView = app.view;
  screen.innerHTML = (views[app.view] || renderHome)();
  updateChrome();
  if (app.view === 'home') startHeroCanvas();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export function setView(view) {
  if (!views[view]) return;
  app.view = view;
  state.currentView = view;
  render();
}

/* ---------------- Hero canvas ---------------- */

export function startHeroCanvas() {
  const canvas = $('#hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const stick = (x, y, h, phase, color, flip = 1) => {
    const bob = Math.sin(phase) * h * .022;
    const leg = Math.sin(phase) * h * .16;
    const leg2 = Math.sin(phase + Math.PI) * h * .16;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, h * .045); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -h * .77, h * .1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h * .68); ctx.lineTo(0, -h * .3);
    ctx.moveTo(0, -h * .56); ctx.lineTo(-h * .16 * flip, -h * .38);
    ctx.moveTo(0, -h * .56); ctx.lineTo(h * .19 * flip, -h * .45);
    ctx.moveTo(0, -h * .3); ctx.lineTo(leg, 0);
    ctx.moveTo(0, -h * .3); ctx.lineTo(leg2, 0);
    ctx.stroke();
    ctx.restore();
  };
  const draw = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) { app.heroRaf = requestAnimationFrame(draw); return; }
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    t += .016;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a2518'); bg.addColorStop(.5, '#0d3423'); bg.addColorStop(1, '#143f2b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .25;
    for (let i = 0; i < 5; i++) {
      const lx = w * (.1 + i * .2);
      const g = ctx.createRadialGradient(lx, 0, 0, lx, 0, h * .6);
      g.addColorStop(0, 'rgba(255,255,240,.55)'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(lx - 60, 0, 120, h * .6);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#165c38';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.lineTo(w * .68, h * .32); ctx.lineTo(w * .32, h * .32); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(230,255,240,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .46, h * .32); ctx.lineTo(w * .38, h); ctx.moveTo(w * .54, h * .32); ctx.lineTo(w * .62, h); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(w * .5, h * .62, w * .09, h * .07, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,255,240,.22)';
    ctx.beginPath(); ctx.arc(w * .5, h * .63, w * .22, 0, Math.PI * 2); ctx.stroke();
    const sc = h / 300;
    stick(w * .56 + Math.sin(t * 1.1) * 14, h * .84, 88 * sc, t * 7, '#c8ff3d', 1);
    stick(w * .42 + Math.sin(t * .9 + 1) * 12, h * .86, 82 * sc, t * 7 + 1.6, '#f2f7ef', -1);
    stick(w * .66 + Math.cos(t * .8) * 10, h * .82, 72 * sc, t * 6 + 2, '#36e5c0', 1);
    stick(w * .31 + Math.cos(t * .75 + 2) * 10, h * .83, 74 * sc, t * 6 + .8, '#ff7b3c', -1);
    const bx = w * .5 + Math.sin(t * .55) * w * .17;
    const by = h * .78 + Math.abs(Math.sin(t * 2)) * 18;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 9 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a2518'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(bx, by, 4.5 * sc, 0, Math.PI * 2); ctx.stroke();
    app.heroRaf = requestAnimationFrame(draw);
  };
  draw();
}
