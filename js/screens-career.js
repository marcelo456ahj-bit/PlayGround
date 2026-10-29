import { fmt, money, moneyShort, escapeHtml, clamp } from './util.js';
import {
  LEAGUES, FORMATIONS, STADIUMS, allClubTeams, leagueTeams, competitionsFor,
  teamOverall, stadiumById, isStadiumUnlocked
} from './data.js';
import {
  nextUserFixture, currentRound, compMeta, computeTable, userPosition,
  roundLabel, allFixtures
} from './career.js';
import { page, esc, crest, crestMini, teamBadge, empty, bar, stars, fmtMoney } from './ui.js';
import { DIFF_NAMES, CAMERA_NAMES, WEATHER_NAMES, POSITIONS, ratingClass, overallColor, computeOverall } from './screens.js';

export function tableHtml(g, comp, highlightId = null) {
  const table = computeTable(comp);
  const user = highlightId || comp.userTeamId;
  return `<div class="panel"><div class="panel-title">CLASSIFICAÇÃO</div><div class="table-wrap"><table class="tbl"><thead><tr><th class="pos">#</th><th>Time</th><th class="num">P</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">GP</th><th class="num">GC</th><th class="num">SG</th></tr></thead><tbody>
    ${table.map((r, i) => { const t = g.team(r.teamId); return `<tr class="${r.teamId === user ? 'me' : ''}"><td class="pos">${i + 1}</td><td><div class="team-badge">${crestMini(t, 18)}<b>${esc(t?.name || '')}</b></div></td><td class="num pts">${r.pts}</td><td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td><td class="num">${r.gf - r.ga}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}

export function bracketHtml(g, comp) {
  const rounds = comp.rounds || [];
  const cols = rounds.map(round => {
    const count = round.length * 2;
    return `<div class="bracket-col"><div class="tiny muted" style="letter-spacing:1px">${roundLabel(count)}</div>
      ${round.map(f => `<div class="bracket-match">
        <div class="bm ${f.winner === f.home ? 'win' : ''}"><span>${esc(g.team(f.home)?.short || g.team(f.home)?.name || '—')}</span><span>${f.played ? f.homeGoals : '-'}</span></div>
        <div class="bm ${f.winner === f.away ? 'win' : ''}"><span>${esc(g.team(f.away)?.short || g.team(f.away)?.name || '—')}</span><span>${f.played ? f.awayGoals : '-'}</span></div>
        ${f.penalties ? `<div class="tiny gold">Pênaltis: ${esc(g.team(f.winner)?.short || '')}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }).join('');
  return `<div class="panel"><div class="panel-title">CHAVEAMENTO</div><div class="bracket">${cols}</div></div>`;
}

export function roundFixturesHtml(g, comp) {
  const round = currentRound(comp);
  return `<div class="panel"><div class="panel-title">JOGOS · ${esc(compMeta(comp).label || '')}</div><div class="list">
    ${round.map(f => {
      const h = g.team(f.home), a = g.team(f.away);
      if (f.bye) return `<div class="row"><div class="grow"><b>${esc(h?.name || a?.name || '')}</b><small>Classificado por bye</small></div></div>`;
      return `<div class="row ${f.played ? '' : 'sel'}"><div class="grow">${teamBadge(h)}<div class="tiny muted" style="margin:2px 0">${f.played ? `${f.homeGoals} : ${f.awayGoals}` : 'vs'}</div>${teamBadge(a)}</div><span class="pill">${f.played ? 'ENCERRADO' : 'A JOGAR'}</span></div>`;
    }).join('') || empty('Sem jogos nesta fase')}
  </div></div>`;
}

export function competitionsScreen(g) {
  const comps = competitionsFor(g.world);
  const active = g.competition;
  return page({
    title: 'Competições',
    sub: 'LIGAS · COPAS · SELEÇÕES',
    back: 'menu',
    body: `
      ${active ? `<div class="panel" style="margin-bottom:12px"><div class="panel-title">COMPETIÇÃO ATIVA</div><div class="row"><div class="grow"><b>${esc(active.name)}</b><small>${esc(compMeta(active).label || '')}</small></div><button class="btn small primary" data-nav="comp-hub">Continuar</button></div></div>` : ''}
      <div class="grid cols-4">
        ${comps.map(c => {
          const isActive = active && (active.cupId === c.id || active.leagueId === c.leagueId);
          return `<button class="tile" data-act="open-comp" data-id="${c.id}">
            <span class="tile-icon">${c.icon || '🏆'}</span>
            <span class="tile-badge ${isActive ? 'gold' : ''}">${isActive ? 'ATIVA' : c.kind === 'league' ? 'LIGA' : 'MATA-MATA'}</span>
            <b>${esc(c.name)}</b>
            <small>${esc(c.country)} · ${c.teamIds.length} equipes</small>
          </button>`;
        }).join('')}
      </div>`
  });
}

export function compDetailScreen(g) {
  const comp = competitionsFor(g.world).find(c => c.id === g.compPick?.compId);
  if (!comp) return competitionsScreen(g);
  const teams = comp.teamIds.map(id => g.team(id)).filter(Boolean);
  const selected = g.compPick.teamId ? g.team(g.compPick.teamId) : null;
  return page({
    title: comp.name,
    sub: `${comp.country} · ${comp.teamIds.length} EQUIPES`,
    back: 'competitions',
    body: `
      <div class="panel"><div class="panel-title">SOBRE</div><div class="tiny muted">${esc(comp.desc)}</div>
        ${selected ? `<div class="team-badge" style="margin-top:10px">${crestMini(selected, 34)}<b>${esc(selected.name)}</b><span class="pill ${ratingClass(teamOverall(selected))}">${teamOverall(selected)} OVR</span></div>` : ''}
      </div>
      <div class="panel"><div class="panel-title">ESCOLHA SEU TIME</div>
        <div class="team-grid">${teams.map(t => `<button class="team-card ${g.compPick.teamId === t.id ? 'sel' : ''}" data-act="comp-team" data-team="${t.id}">
          ${crest(t, 42)}<b>${esc(t.name)}</b><small>${teamOverall(t)} OVR</small>
        </button>`).join('')}</div>
      </div>`,
    foot: `<button class="btn ghost" data-nav="competitions">Voltar</button><div class="spacer"></div><button class="btn primary" data-act="start-comp" ${selected ? '' : 'disabled'}>Iniciar competição ›</button>`
  });
}

export function compHubScreen(g) {
  const comp = g.competition;
  if (!comp) return competitionsScreen(g);
  const next = nextUserFixture(comp);
  const meta = compMeta(comp);
  const champion = comp.champion ? g.team(comp.champion) : null;
  const eliminated = comp.kind === 'cup' && !next && !comp.champion;
  const body = `
    <div class="grid cols-2" style="margin-bottom:12px">
      <div class="panel">
        <div class="panel-title">${esc(comp.name)}</div>
        <div class="tiny muted">${esc(comp.country)} · ${esc(meta.label || '')}</div>
        ${next ? `<div class="row" style="margin-top:10px"><div class="grow">${teamBadge(g.team(next.home))}<div class="tiny muted" style="margin:4px 0">vs</div>${teamBadge(g.team(next.away))}</div><button class="btn small primary" data-act="open-match">Jogar</button></div>`
          : champion ? `<div class="award" style="margin-top:10px"><span class="medal">🏆</span><div><b>Campeão: ${esc(champion.name)}</b><small>${esc(comp.name)}</small></div></div>`
            : eliminated ? `<div class="tiny red" style="margin-top:10px">Você foi eliminado.</div>` : `<div class="tiny muted" style="margin-top:10px">Temporada encerrada.</div>`}
        <div class="btn-row" style="margin-top:10px">
          <button class="btn small ghost" data-act="sim-round">Simular rodada</button>
          <button class="btn small ghost" data-act="sim-rest">Simular restante</button>
          ${comp.champion ? `<button class="btn small gold" data-act="new-season">Nova temporada</button>` : ''}
        </div>
      </div>
      <div class="panel"><div class="panel-title">SITUAÇÃO</div>${comp.kind === 'league' ? `<div class="tiny muted">Posição: <b class="gold">${userPosition(comp)}º</b> · Rodada ${Math.min(comp.round + 1, comp.fixtures.length)}/${comp.fixtures.length}</div>` : `<div class="tiny muted">${esc(meta.label || '')} · ${currentRound(comp).filter(f => !f.played).length} jogos restantes na fase</div>`}<div class="tiny muted" style="margin-top:8px">Time: <b>${esc(g.team(comp.userTeamId)?.name || '')}</b></div></div>
    </div>
    ${comp.kind === 'league' ? tableHtml(g, comp) : bracketHtml(g, comp)}
    ${roundFixturesHtml(g, comp)}
  `;
  return page({
    title: comp.name,
    sub: 'COMPETIÇÃO',
    back: 'competitions',
    body,
    foot: `<button class="btn ghost" data-nav="competitions">Competições</button><div class="spacer"></div><button class="btn ghost" data-act="save-now">Salvar</button><button class="btn primary" data-nav="menu">Menu</button>`
  });
}

export function masterNewScreen(g) {
  const leagues = LEAGUES.slice(0, 8);
  const teams = leagueTeams(g.world, g.masterPick.leagueId);
  const selected = g.masterPick.teamId ? g.team(g.masterPick.teamId) : null;
  return page({
    title: 'Master League',
    sub: 'COMANDE UM CLUBE',
    back: 'menu',
    body: `
      <div class="panel"><div class="panel-title">ESCOLHA A LIGA</div>
        <div class="chip-row">${leagues.map(l => `<button class="chip ${g.masterPick.leagueId === l.id ? 'sel' : ''}" data-act="master-league" data-league="${l.id}">${l.flag} ${esc(l.name)}</button>`).join('')}</div>
      </div>
      <div class="panel"><div class="panel-title">ESCOLHA O CLUBE</div><div class="team-grid">
        ${teams.map(t => `<button class="team-card ${g.masterPick.teamId === t.id ? 'sel' : ''}" data-act="master-team" data-team="${t.id}">${crest(t, 42)}<b>${esc(t.name)}</b><small>${teamOverall(t)} OVR</small></button>`).join('')}
      </div></div>`,
    foot: `<button class="btn ghost" data-nav="menu">Menu</button><div class="spacer"></div><button class="btn primary" data-act="create-master" ${selected ? '' : 'disabled'}>Assumir o clube ›</button>`
  });
}

export function masterHubScreen(g) {
  const career = g.career;
  if (!career || career.type !== 'master') return masterNewScreen(g);
  const team = g.team(career.teamId);
  const comp = g.competition;
  const next = comp ? nextUserFixture(comp) : null;
  const pos = comp?.kind === 'league' ? userPosition(comp) : null;
  return page({
    title: 'Master League',
    sub: `TEMPORADA ${career.season || 1}`,
    back: 'menu',
    body: `
      <div class="panel"><div class="hero-team">${crest(team, 70)}<div><h2>${esc(team.name)}</h2><small>${esc(team.leagueName)} · ${teamOverall(team)} OVR</small></div><div class="spacer"></div><div class="fact">CAIXA<b>${moneyShort(team.budget || 0)}</b></div></div>
        <div class="hero-facts"><div class="fact">POSIÇÃO<b>${pos ? pos + 'º' : '—'}</b></div><div class="fact">MOEDAS<b>${g.profile.coins}</b></div><div class="fact">TROFÉUS<b>${(g.profile.trophies || []).length}</b></div></div>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <div class="panel"><div class="panel-title">PRÓXIMA PARTIDA</div>
          ${next ? `<div class="list"><div class="row">${teamBadge(g.team(next.home))}<span class="pill">vs</span>${teamBadge(g.team(next.away))}</div></div><button class="btn primary" data-act="open-match" style="margin-top:10px;width:100%">Jogar partida</button>` : `<div class="tiny muted">Sem partida agendada.</div>`}
          <div class="btn-row" style="margin-top:10px"><button class="btn small ghost" data-act="sim-round">Simular rodada</button><button class="btn small ghost" data-act="sim-rest">Simular restante</button></div>
        </div>
        <div class="panel"><div class="panel-title">ELENCO</div><div class="list" style="max-height:240px;overflow:auto">${team.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 8).map(p => `<div class="row"><span class="ovr">${p.overall}</span><div class="grow"><b>${esc(p.name)}</b><small>${p.pos} · ${p.age} anos</small></div></div>`).join('')}</div></div>
      </div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn ghost" data-nav="transfers">Transferências</button>
        <button class="btn ghost" data-act="save-now">Salvar</button>
        <button class="btn ghost" data-nav="comp-hub">Competição</button>
      </div>
      ${comp ? tableHtml(g, comp, career.teamId) : ''}`,
    foot: `<button class="btn ghost" data-nav="menu">Menu</button><div class="spacer"></div><button class="btn primary" data-act="open-match" ${next ? '' : 'disabled'}>Próxima partida ›</button>`
  });
}

export function legendNewScreen(g) {
  const clubs = allClubTeams(g.world).sort((a, b) => teamOverall(b) - teamOverall(a));
  return page({
    title: 'Become a Legend',
    sub: 'CRIE SEU JOGADOR',
    back: 'menu',
    body: `
      <div class="split">
        <div class="panel"><div class="panel-title">SEU JOGADOR</div>
          <div class="field"><label>Nome</label><input class="input" id="legend-name" maxlength="22" value="${esc(g.profile.name || 'Craque')}"></div>
          <div class="field-row"><div class="field"><label>Posição</label><select class="input" id="legend-pos">${POSITIONS.map(p => `<option value="${p}" ${p === 'ATA' ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
            <div class="field"><label>Idade</label><input class="input" id="legend-age" type="number" min="16" max="24" value="18"></div></div>
          <div class="field"><label>Clube</label><select class="input" id="legend-club">${clubs.map(t => `<option value="${t.id}">${esc(t.name)} · ${teamOverall(t)} OVR</option>`).join('')}</select></div>
          <div class="tiny muted" style="margin-top:8px">Você começará com 68 de overall e potencial de 92. Jogue bem para evoluir.</div>
        </div>
        <div class="panel"><div class="panel-title">COMO FUNCIONA</div><div class="tiny muted" style="line-height:1.7">Você controla apenas o seu jogador em campo. A IA comanda o restante do time. Marque gols, dê assistências e mantenha boas notas para ganhar espaço e troféus. Você pode aceitar propostas de outros clubes na tela de transferências.</div></div>
      </div>`,
    foot: `<button class="btn ghost" data-nav="menu">Menu</button><div class="spacer"></div><button class="btn primary" data-act="create-legend">Começar carreira ›</button>`
  });
}

export function legendHubScreen(g) {
  const career = g.career;
  if (!career || career.type !== 'legend') return legendNewScreen(g);
  const team = g.team(career.teamId);
  const player = g.playerById(career.playerId);
  const comp = g.competition;
  const next = comp ? nextUserFixture(comp) : null;
  const pos = comp?.kind === 'league' ? userPosition(comp) : null;
  return page({
    title: 'Become a Legend',
    sub: `TEMPORADA ${career.season || 1}`,
    back: 'menu',
    body: `
      <div class="panel"><div class="hero-team">${crest(team, 68)}<div><h2>${esc(player?.name || 'Seu jogador')}</h2><small>${esc(team.name)} · ${esc(player?.pos || '')} · ${player?.overall || 68} OVR</small></div><div class="spacer"></div><div class="fact">NOTA MÉDIA<b>${(career.avg || 0).toFixed(1)}</b></div></div>
        <div class="hero-facts"><div class="fact">JOGOS<b>${career.apps || 0}</b></div><div class="fact">GOLS<b>${career.goals || 0}</b></div><div class="fact">ASSISTÊNCIAS<b>${career.assists || 0}</b></div><div class="fact">POSIÇÃO<b>${pos ? pos + 'º' : '—'}</b></div></div>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <div class="panel"><div class="panel-title">PRÓXIMA PARTIDA</div>
          ${next ? `<div class="list"><div class="row">${teamBadge(g.team(next.home))}<span class="pill">vs</span>${teamBadge(g.team(next.away))}</div></div><button class="btn primary" data-act="open-match" style="margin-top:10px;width:100%">Jogar partida</button>` : `<div class="tiny muted">Sem partida agendada.</div>`}
          <div class="btn-row" style="margin-top:10px"><button class="btn small ghost" data-act="sim-round">Simular rodada</button><button class="btn small ghost" data-act="sim-rest">Simular restante</button></div>
        </div>
        <div class="panel"><div class="panel-title">ATRIBUTOS</div>
          ${player ? Object.entries({ Ritmo: player.attrs.pace, Chute: player.attrs.shoot, Passe: player.attrs.pass, Drible: player.attrs.dribble, Defesa: player.attrs.defense, Físico: player.attrs.physical }).map(([k, v]) => `<div class="slider-row"><span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('') : ''}
        </div>
      </div>
      <div class="btn-row" style="margin-top:12px"><button class="btn ghost" data-nav="transfers">Transferências</button><button class="btn ghost" data-act="save-now">Salvar</button><button class="btn ghost" data-nav="comp-hub">Competição</button></div>
      ${comp ? tableHtml(g, comp, team.id) : ''}`,
    foot: `<button class="btn ghost" data-nav="menu">Menu</button><div class="spacer"></div><button class="btn primary" data-act="open-match" ${next ? '' : 'disabled'}>Jogar ›</button>`
  });
}

export function trainingScreen(g) {
  return page({
    title: 'Treino',
    sub: 'APERFEIÇOE SUAS HABILIDADES',
    back: 'menu',
    body: `<div class="grid cols-3">
      <button class="tile" data-act="start-training" data-drill="free"><span class="tile-icon">⚽</span><b>Jogo-treino</b><small>Partida livre sem cronômetro para testar jogadas, passes e chutes.</small></button>
      <button class="tile" data-act="start-training" data-drill="penalty"><span class="tile-icon">🎯</span><b>Pênaltis</b><small>Cobranças infinitas. Segure CHUTE para definir a força e use o analógico para mirar.</small></button>
      <button class="tile" data-act="start-training" data-drill="free"><span class="tile-icon">🔄</span><b>Posse de bola</b><small>Treino livre com foco em troca de passes e movimentação.</small></button>
    </div>
    <div class="panel" style="margin-top:12px"><div class="panel-title">CONTROLES</div><div class="tiny muted" style="line-height:1.8">Analógico: mover e correr · PASSE: toque curto · CHUTE: segure e solte · DRIBLE: finta rápida · CARRINHO: desarme deslizante. Teclado: WASD + J/K/L/H. No pênalti, use o analógico para mirar e segure CHUTE.</div></div>`
  });
}

export function transfersScreen(g) {
  const team = g.masterOrLegendTeam();
  if (!team) {
    return page({
      title: 'Transferências',
      sub: 'MERCADO DA BOLA',
      back: 'menu',
      body: `<div class="panel"><div class="tiny muted">As transferências ficam disponíveis na Master League e no Become a Legend. Crie uma carreira para contratar jogadores.</div></div>`,
      foot: `<button class="btn ghost" data-nav="menu">Menu</button><div class="spacer"></div><button class="btn primary" data-nav="master">Master League</button>`
    });
  }
  if (!g.transferClubId || g.transferClubId === team.id) {
    g.transferClubId = allClubTeams(g.world).find(t => t.id !== team.id && t.leagueId === team.leagueId)?.id || allClubTeams(g.world)[0]?.id;
  }
  const other = g.team(g.transferClubId);
  const targets = other ? other.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 14) : [];
  const budget = g.mode === 'master' ? (team.budget || 0) : g.profile.coins * 1000;
  const currencyLabel = g.mode === 'master' ? fmtMoney(budget) : `${g.profile.coins} moedas`;
  const squad = team.players.slice().sort((a, b) => b.overall - a.overall);
  return page({
    title: 'Transferências',
    sub: `${team.name.toUpperCase()} · ${currencyLabel}`,
    back: g.mode === 'master' ? 'master' : 'legend',
    body: `
      <div class="panel"><div class="panel-title">MERCADO</div>
        <div class="field"><label>Clube para observar</label><select class="input" id="transfer-club">${allClubTeams(g.world).filter(t => t.id !== team.id).sort((a, b) => teamOverall(b) - teamOverall(a)).map(t => `<option value="${t.id}" ${t.id === g.transferClubId ? 'selected' : ''}>${esc(t.name)} · ${teamOverall(t)} OVR</option>`).join('')}</select></div>
        <div class="list">${targets.map(p => {
          const affordable = g.mode === 'master' ? budget >= p.value : g.profile.coins >= Math.ceil(p.value / 1000);
          return `<div class="row"><span class="ovr" style="color:${overallColor(p.overall)}">${p.overall}</span><div class="grow"><b>${esc(p.name)}</b><small>${p.pos} · ${p.age} anos · ${moneyShort(p.value)}</small></div><button class="btn xs ${affordable ? 'green' : ''}" data-act="buy-player" data-player="${p.id}" ${affordable ? '' : 'disabled'}>Contratar</button></div>`;
        }).join('')}</div>
      </div>
      <div class="panel"><div class="panel-title">SEU ELENCO</div><div class="list" style="max-height:320px;overflow:auto">${squad.map(p => `<div class="row"><span class="ovr" style="color:${overallColor(p.overall)}">${p.overall}</span><div class="grow"><b>${esc(p.name)}</b><small>${p.pos} · ${p.age} anos · ${moneyShort(p.value)}</small></div><button class="btn xs ghost" data-act="sell-player" data-player="${p.id}">Vender</button></div>`).join('')}</div></div>`,
    foot: `<button class="btn ghost" data-nav="${g.mode === 'master' ? 'master' : 'legend'}">Voltar</button><div class="spacer"></div><button class="btn ghost" data-act="save-now">Salvar</button>`
  });
}

export function resultScreen(g, result) {
  const m = g.finishedMatch || g.currentMatch;
  const applied = g.lastResult || {};
  const stats = result.stats || m.getStats();
  const home = m.home, away = m.away;
  const win = applied.win, draw = applied.draw;
  const title = draw ? 'EMPATE' : win ? 'VITÓRIA!' : 'DERROTA';
  const cls = draw ? '' : win ? 'green' : 'red';
  const reward = applied.reward || 0;
  const canContinueCareer = ['competition', 'master', 'legend'].includes(g.matchContext?.type);
  const mvp = result.mvp;
  const mvpTeam = mvp ? g.team(m[mvp.side]?.id) : null;
  const mvpHtml = mvp ? `<div class="row"><span class="ovr" style="color:var(--gold)">${mvp.rating.toFixed(1)}</span><div class="grow"><b>${esc(mvp.name)}</b><small>${esc(mvp.pos)} · ${esc(mvpTeam?.name || '')}</small></div><span class="pill gold">MVP</span></div>` : empty('Sem dados');
  return page({
    title,
    sub: 'RESULTADO FINAL',
    body: `
      <div class="panel" style="text-align:center">
        <div class="result-score">
          <div class="result-team">${crest(home, 74)}<b>${esc(home.name)}</b><small>${home.short}</small></div>
          <div class="result-nums"><div class="result-line"><b class="${cls}">${result.score.home}</b><span>:</span><b class="${cls}">${result.score.away}</b></div><small>${esc(g.competition?.name || (m.training ? 'TREINO' : 'AMISTOSO'))}</small></div>
          <div class="result-team">${crest(away, 74)}<b>${esc(away.name)}</b><small>${away.short}</small></div>
        </div>
        <div class="pill ${win ? 'mid' : draw ? '' : 'att'}" style="margin-top:10px">${win ? 'VITÓRIA' : draw ? 'EMPATE' : 'DERROTA'} · +${reward} MOEDAS</div>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <div class="panel"><div class="panel-title">ESTATÍSTICAS</div>${statBars(stats)}</div>
        <div class="panel"><div class="panel-title">MELHOR EM CAMPO</div>${mvpHtml}</div>
      </div>
      ${canContinueCareer ? `<div class="panel" style="margin-top:12px"><div class="panel-title">COMPETIÇÃO</div><div class="tiny muted">${esc(g.competition?.name || '')} · ${esc(g.compMetaLabel())}</div></div>` : ''}`,
    foot: `<button class="btn ghost" data-act="result-menu">Menu</button>
      ${canContinueCareer ? `<button class="btn primary" data-act="result-continue">Continuar ›</button>` : `<button class="btn ghost" data-act="result-rematch">Revanche</button><button class="btn primary" data-act="result-continue">Continuar ›</button>`}`
  });
}

export function statBars(stats) {
  if (!stats?.home || !stats?.away) return empty('Sem estatísticas');
  const h = stats.home, a = stats.away;
  const rows = [
    ['Posse de bola', h.possessionPct || 0, a.possessionPct || 0, '%'],
    ['Finalizações', h.shots, a.shots],
    ['No alvo', h.onTarget, a.onTarget],
    ['Passes certos', h.passesOk, a.passesOk],
    ['Faltas', h.fouls, a.fouls],
    ['Escanteios', h.corners, a.corners],
    ['Defesas', h.saves, a.saves]
  ];
  return rows.map(([label, hv, av, suffix]) => {
    const max = Math.max(1, hv, av);
    return `<div class="stat-bar-row">
      <span>${hv}${suffix || ''}</span>
      <div><div class="track"><i class="l" style="width:${(hv / max) * 100}%"></i></div><div class="track" style="margin-top:2px"><i class="r" style="width:${(av / max) * 100}%"></i></div><label>${label}</label></div>
      <span>${av}${suffix || ''}</span>
    </div>`;
  }).join('');
}
