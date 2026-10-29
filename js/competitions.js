/* Simulação de ligas e copas, tabelas e progresso de competições. */

import { getTeam, teamRating, generateFixtures } from './data.js';
import { state } from './state.js';
import { crest, esc, statLine } from './ui.js';

export function makeTable(ids) {
  const t = {};
  for (const id of ids) t[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  return t;
}

export function applyTableResult(table, homeId, awayId, hs, as) {
  if (!table[homeId] || !table[awayId]) return;
  const h = table[homeId], a = table[awayId];
  h.p++; a.p++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
  if (hs > as) { h.w++; a.l++; h.pts += 3; }
  else if (hs < as) { a.w++; h.l++; a.pts += 3; }
  else { h.d++; a.d++; h.pts++; a.pts++; }
}

export function sortedTable(run) {
  return Object.entries(run.table).map(([id, s]) => ({ id, ...s, gd: s.gf - s.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || teamRating(getTeam(a.id)) - teamRating(getTeam(b.id)));
}

export function simulateScore(homeId, awayId) {
  const hr = teamRating(getTeam(homeId)) || 70;
  const ar = teamRating(getTeam(awayId)) || 70;
  const diff = (hr - ar) / 20;
  let hs = Math.max(0, Math.round(.55 + diff * .55 + Math.random() * 2.1));
  let as = Math.max(0, Math.round(.5 - diff * .38 + Math.random() * 1.9));
  hs = Math.min(6, hs); as = Math.min(6, as);
  if (hs === as && Math.random() < .18) { if (Math.random() < .5) hs++; else as++; }
  return { hs, as };
}

export function makeLeagueRun(teamId, ids) {
  let teams = [...new Set(ids)];
  if (!teams.includes(teamId)) teams.push(teamId);
  if (teams.length % 2) teams.push('BYE');
  return {
    kind: 'league', teamId, teams: teams.filter(t => t !== 'BYE'),
    fixtures: generateFixtures(teams, false),
    round: 0, table: makeTable(teams.filter(t => t !== 'BYE')),
    done: false, champion: null, log: []
  };
}

export function userFixture(run) {
  const round = run.fixtures[run.round] || [];
  return round.find(m => m.home === run.teamId || m.away === run.teamId) || null;
}

export function applyLeagueRound(run, resultFixture) {
  const round = run.fixtures[run.round] || [];
  for (const m of round) {
    let hs, as;
    if (resultFixture && m.home === resultFixture.home && m.away === resultFixture.away) { hs = resultFixture.hs; as = resultFixture.as; }
    else ({ hs, as } = simulateScore(m.home, m.away));
    applyTableResult(run.table, m.home, m.away, hs, as);
    run.log.push({ round: run.round, home: m.home, away: m.away, hs, as, user: m.home === run.teamId || m.away === run.teamId });
  }
  run.round++;
  if (run.round >= run.fixtures.length) {
    run.done = true;
    run.champion = sortedTable(run)[0].id;
  }
}

export function newCupRun(teamId, ids) {
  let pool = [...new Set(ids)].slice(0, 8);
  if (!pool.includes(teamId)) pool[pool.length - 1] = teamId;
  pool = pool.sort(() => Math.random() - .5);
  const matches = [];
  for (let i = 0; i < pool.length; i += 2) matches.push({ a: pool[i], b: pool[i + 1], sa: null, sb: null, winner: null });
  return { kind: 'cup', teamId, rounds: [matches], round: 0, done: false, eliminated: false, champion: null };
}

function cupWinner(a, b, sa, sb) {
  if (sa !== sb) return sa > sb ? a : b;
  return Math.random() < .5 ? a : b;
}

function simulateCupMatch(m) {
  const { hs, as } = simulateScore(m.a, m.b);
  m.sa = hs; m.sb = as;
  m.winner = cupWinner(m.a, m.b, hs, as);
}

export function advanceCup(run, resultMatch) {
  const round = run.rounds[run.round];
  for (const m of round) {
    if (resultMatch && m.a === resultMatch.a && m.b === resultMatch.b) {
      m.sa = resultMatch.hs; m.sb = resultMatch.as;
      m.winner = cupWinner(m.a, m.b, m.sa, m.sb);
    } else if (!m.winner) simulateCupMatch(m);
  }
  const winners = round.map(m => m.winner);
  if (resultMatch && !winners.includes(run.teamId)) run.eliminated = true;
  run.round++;
  if (winners.length <= 1) {
    run.done = true;
    run.champion = winners[0];
    return;
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1], sa: null, sb: null, winner: null });
  run.rounds.push(next);
  if (run.eliminated) finishCupSimulation(run);
}

export function finishCupSimulation(run) {
  while (!run.done) {
    const round = run.rounds[run.round];
    for (const m of round) if (!m.winner) simulateCupMatch(m);
    const winners = round.map(m => m.winner);
    run.round++;
    if (winners.length <= 1) { run.done = true; run.champion = winners[0]; break; }
    const next = [];
    for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1], sa: null, sb: null, winner: null });
    run.rounds.push(next);
  }
}

export function cupRoundName(totalRounds, index) {
  const left = totalRounds - index;
  if (left === 1) return 'FINAL';
  if (left === 2) return 'SEMIFINAL';
  if (left === 3) return 'QUARTAS';
  if (left === 4) return 'OITAVAS';
  return `FASE ${index + 1}`;
}

export function compRunTitle(comp, run) {
  if (run.done) return run.champion === run.teamId ? 'CAMPEÃO' : 'CAMPANHA ENCERRADA';
  return run.kind === 'cup' ? cupRoundName(run.rounds.length, run.round) : `RODADA ${run.round + 1} / ${run.fixtures.length}`;
}

export function tableHtml(run, userTeamId) {
  const rows = sortedTable(run);
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>#</th><th>Time</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">GP</th><th class="num">GC</th><th class="num">SG</th><th class="num">PTS</th></tr></thead>
    <tbody>${rows.map((r, i) => {
      const t = getTeam(r.id);
      return `<tr class="${r.id === userTeamId ? 'is-user' : ''}"><td><span class="pos-badge ${i < 4 ? 'ucl' : i >= rows.length - 4 ? 'rel' : ''}">${i + 1}</span></td><td><div class="team-row">${crest(t, 'crest-sm')}<span>${esc(t?.short || t?.name || r.id)}</span></div></td><td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td><td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num pts">${r.pts}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

export function compRunHtml(comp, run) {
  const team = getTeam(run.teamId);
  const status = run.done ? (run.champion === run.teamId ? 'CAMPEÃO' : run.champion ? `CAMPEÃO: ${getTeam(run.champion)?.name}` : 'ENCERRADO') : compRunTitle(comp, run);
  if (run.kind === 'league') {
    const next = userFixture(run);
    return `
      <div class="notice" style="margin-bottom:14px"><span class="n-ico">◈</span><span>${esc(team?.name)} · ${status}. ${run.done ? 'A temporada terminou.' : 'Sua próxima partida está pronta.'}</span></div>
      ${next ? `<div class="panel" style="padding:16px;margin-bottom:14px">
        <div class="row" style="justify-content:space-between"><div class="kicker">PRÓXIMO JOGO</div><div class="pill teal">${run.round + 1}/${run.fixtures.length}</div></div>
        <div class="result-scoreline" style="margin:12px 0 8px">
          <div class="rs-team">${crest(getTeam(next.home), 'crest-sm')}<span>${esc(getTeam(next.home)?.name)}</span></div>
          <div class="rs-score" style="font-size:26px">×</div>
          <div class="rs-team">${crest(getTeam(next.away), 'crest-sm')}<span>${esc(getTeam(next.away)?.name)}</span></div>
        </div>
        <div class="row" style="justify-content:center;gap:8px">
          <button class="btn btn-primary btn-sm" data-action="play-comp" data-comp="${comp.id}">Jogar partida</button>
          <button class="btn btn-ghost btn-sm" data-action="sim-comp" data-comp="${comp.id}">Simular rodada</button>
        </div>
      </div>` : ''}
      ${tableHtml(run, team.id)}
      <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-ghost btn-xs" data-action="reset-comp" data-comp="${comp.id}">Reiniciar competição</button></div>`;
  }
  const rounds = run.rounds.map((round, i) => `
    <div class="panel" style="padding:12px;margin-bottom:10px">
      <div class="kicker" style="margin-bottom:8px">${cupRoundName(run.rounds.length, i)}</div>
      ${round.map(m => {
        const aw = m.winner;
        return `<div class="fixture-row"><span class="fx-teams">${crest(getTeam(m.a), 'crest-sm')} <span style="margin-left:4px" class="${aw === m.a ? 'lime' : ''}">${esc(getTeam(m.a)?.short)}</span></span><span class="fx-score">${m.sa ?? '-'} × ${m.sb ?? '-'}</span><span class="fx-teams" style="justify-content:flex-end">${crest(getTeam(m.b), 'crest-sm')} <span style="margin-right:4px" class="${aw === m.b ? 'lime' : ''}">${esc(getTeam(m.b)?.short)}</span></span></div>`;
      }).join('')}
    </div>`).join('');
  return `<div class="notice" style="margin-bottom:14px"><span class="n-ico">◈</span><span>${esc(team?.name)} · ${status}${run.eliminated ? ' · eliminado' : ''}</span></div>
    ${rounds}
    <div class="row" style="justify-content:center;gap:8px;margin-top:12px">
      ${!run.done ? `<button class="btn btn-primary btn-sm" data-action="play-comp" data-comp="${comp.id}">Jogar ${cupRoundName(run.rounds.length, run.round)}</button><button class="btn btn-ghost btn-sm" data-action="sim-comp" data-comp="${comp.id}">Simular fase</button>` : ''}
      <button class="btn btn-ghost btn-xs" data-action="reset-comp" data-comp="${comp.id}">Reiniciar</button>
    </div>`;
}

export function simulateCompRound(comp, run) {
  if (!run || run.done) return;
  if (run.kind === 'league') {
    applyLeagueRound(run, null);
  } else {
    const round = run.rounds[run.round] || [];
    const m = round.find(x => x.a === run.teamId || x.b === run.teamId);
    if (m) {
      const { hs, as } = simulateScore(m.a, m.b);
      advanceCup(run, { a: m.a, b: m.b, hs, as });
    } else {
      for (const x of round) if (!x.winner) simulateCupMatch(x);
      const winners = round.map(x => x.winner);
      run.round++;
      if (winners.length <= 1) { run.done = true; run.champion = winners[0]; }
      else {
        const next = [];
        for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1], sa: null, sb: null, winner: null });
        run.rounds.push(next);
        if (run.eliminated) finishCupSimulation(run);
      }
    }
  }
  if (run.champion === run.teamId && !run.rewarded) {
    run.rewarded = true;
    state.coins += comp.prize || 1000;
  }
}

export function applyCompResult(comp, run, result) {
  const homeId = result.homeId, awayId = result.awayId;
  const hs = result.score.home, as = result.score.away;
  if (run.kind === 'league') {
    applyLeagueRound(run, { home: homeId, away: awayId, hs, as });
  } else {
    const round = run.rounds[run.round] || [];
    const rm = round.find(m => (m.a === homeId && m.b === awayId) || (m.a === awayId && m.b === homeId));
    if (rm) {
      const flip = rm.a !== homeId;
      let sa = flip ? as : hs, sb = flip ? hs : as;
      if (result.shootout && sa === sb) {
        const homeWon = result.shootout.home > result.shootout.away;
        const aIsHome = rm.a === homeId;
        if ((aIsHome && homeWon) || (!aIsHome && !homeWon)) sa++; else sb++;
      }
      advanceCup(run, { a: rm.a, b: rm.b, hs: sa, as: sb });
    }
  }
  if (run.champion === run.teamId && !run.rewarded) {
    run.rewarded = true;
    state.coins += comp.prize || 1000;
  }
}

export { statLine };
