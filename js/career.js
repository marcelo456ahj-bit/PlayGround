import { RNG, clamp, uid, deepClone } from './util.js';
import { generateFixtures, simulateScore, getTeam, teamOverall } from './data.js';

function powerOfTwo(n) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

export function roundLabel(count) {
  if (count >= 32) return 'Fase de 32';
  if (count >= 16) return 'Oitavas de Final';
  if (count >= 8) return 'Quartas de Final';
  if (count >= 4) return 'Semifinal';
  if (count >= 2) return 'Final';
  return 'Encerrado';
}

function fixture(home, away, round) {
  return {
    id: uid('fx'), home, away, round,
    played: false, homeGoals: null, awayGoals: null,
    winner: home === away ? home : null, bye: !home || !away
  };
}

export function createLeagueCompetition(world, leagueId, userTeamId, seed = 'season') {
  const lg = world.leagues.find(l => l.id === leagueId);
  if (!lg) return null;
  const rng = new RNG(`${seed}:${leagueId}:${Date.now()}`);
  const rounds = generateFixtures(lg.teamIds, rng, true).map((round, ri) =>
    round.map(m => fixture(m.home, m.away, ri))
  );
  const comp = {
    id: uid('comp'), kind: 'league', leagueId, name: lg.name, country: lg.country,
    flag: lg.flag, icon: '🏆', desc: 'Temporada em pontos corridos.',
    teamIds: lg.teamIds.slice(), userTeamId, season: 1, round: 0,
    fixtures: rounds, rounds: null, champion: null, history: [],
    createdAt: Date.now()
  };
  return comp;
}

export function createCupCompetition(world, compDef, userTeamId, seed = 'cup') {
  const teams = compDef.teamIds.slice();
  const rng = new RNG(`${seed}:${compDef.id}:${Date.now()}`);
  const size = Math.max(2, powerOfTwo(teams.length));
  const list = rng.shuffle(teams.slice());
  while (list.length < size) list.push(null);
  const first = [];
  for (let i = 0; i < list.length; i += 2) {
    const home = list[i], away = list[i + 1];
    if (!home && !away) continue;
    first.push(fixture(home, away, 0));
  }
  const comp = {
    id: uid('comp'), kind: 'cup', cupId: compDef.id, name: compDef.name,
    country: compDef.country, flag: compDef.flag, icon: compDef.icon || '🏆',
    desc: compDef.desc || '', teamIds: compDef.teamIds.slice(), userTeamId,
    season: 1, round: 0, fixtures: null, rounds: [first], champion: null,
    history: [], createdAt: Date.now()
  };
  return comp;
}

export function createCompetition(world, compDef, userTeamId, seed) {
  if (compDef.kind === 'league') return createLeagueCompetition(world, compDef.leagueId, userTeamId, seed);
  return createCupCompetition(world, compDef, userTeamId, seed);
}

export function compRounds(comp) {
  return comp.kind === 'league' ? comp.fixtures : comp.rounds;
}

export function currentRound(comp) {
  const rounds = compRounds(comp);
  return rounds ? rounds[comp.round] || [] : [];
}

export function allFixtures(comp) {
  return (compRounds(comp) || []).flat();
}

export function fixtureForTeam(comp, teamId, round = comp.round) {
  const rounds = compRounds(comp);
  return (rounds?.[round] || []).find(f => f.home === teamId || f.away === teamId) || null;
}

export function nextUserFixture(comp) {
  if (!comp?.userTeamId || comp.champion) return null;
  if (comp.kind === 'cup') {
    const f = fixtureForTeam(comp, comp.userTeamId);
    if (f && !f.played) return f;
    return null;
  }
  const rounds = comp.fixtures;
  for (let r = comp.round; r < rounds.length; r++) {
    const f = rounds[r].find(x => (x.home === comp.userTeamId || x.away === comp.userTeamId) && !x.played);
    if (f) return f;
  }
  return null;
}

export function userIsAlive(comp) {
  if (comp.champion) return comp.champion === comp.userTeamId;
  if (comp.kind === 'league') return true;
  return !!(fixtureForTeam(comp, comp.userTeamId) || comp.round === 0);
}

export function recordResult(comp, f, homeGoals, awayGoals) {
  if (!f || f.played) return;
  f.played = true;
  f.homeGoals = Math.max(0, Math.round(homeGoals));
  f.awayGoals = Math.max(0, Math.round(awayGoals));
  if (f.homeGoals === f.awayGoals) {
    if (comp.kind === 'cup') {
      const winner = Math.random() < .5 ? f.home : f.away;
      f.penalties = true;
      f.winner = winner;
    } else {
      f.winner = null;
    }
  } else {
    f.winner = f.homeGoals > f.awayGoals ? f.home : f.away;
  }
}

export function simulateFixture(world, f, rng = new RNG(Math.random() * 1e9 | 0), neutral = true) {
  if (!f || f.played || f.bye) return;
  const home = getTeam(world, f.home), away = getTeam(world, f.away);
  if (!home || !away) return;
  const score = simulateScore(home, away, rng, neutral);
  recordResult({ kind: 'league' }, f, score.home, score.away);
}

export function simulateOtherFixtures(world, comp, keepId = null) {
  const round = currentRound(comp);
  const rng = new RNG(`${comp.id}:${comp.round}:${Date.now()}`);
  for (const f of round) {
    if (f.id === keepId || f.played || f.bye) continue;
    simulateFixture(world, f, rng);
  }
}

export function simulateRestOfRound(world, comp) {
  simulateOtherFixtures(world, comp, null);
  progress(comp);
}

export function progress(comp) {
  if (comp.kind === 'league') {
    const round = comp.fixtures[comp.round] || [];
    if (round.length && round.every(f => f.played || f.bye)) {
      comp.round++;
      while (comp.round < comp.fixtures.length && comp.fixtures[comp.round].every(f => f.played)) comp.round++;
    }
    if (comp.round >= comp.fixtures.length && !comp.champion) {
      const table = computeTable(comp);
      comp.champion = table[0]?.teamId || null;
      comp.history.push({ season: comp.season, champion: comp.champion });
    }
    return;
  }
  const round = comp.rounds[comp.round] || [];
  if (!round.length || !round.every(f => f.played || f.bye)) return;
  const winners = round.map(f => f.winner).filter(Boolean);
  if (winners.length <= 1) {
    comp.champion = winners[0] || null;
    if (comp.champion) comp.history.push({ season: comp.season, champion: comp.champion, cup: comp.name });
    return;
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i];
    const away = winners[i + 1] || null;
    next.push(fixture(home, away, comp.round + 1));
  }
  comp.rounds.push(next);
  comp.round++;
}

export function simulateCupToEnd(world, comp) {
  if (comp.kind !== 'cup') return;
  let guard = 0;
  while (!comp.champion && guard++ < 12) {
    simulateRestOfRound(world, comp);
  }
}

export function computeTable(comp) {
  const rows = new Map();
  for (const id of comp.teamIds) rows.set(id, { teamId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  for (const f of allFixtures(comp)) {
    if (!f.played || f.bye) continue;
    const h = rows.get(f.home), a = rows.get(f.away);
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += f.homeGoals; h.ga += f.awayGoals;
    a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.w++; a.l++; h.pts += 3; }
    else if (f.awayGoals > f.homeGoals) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort((a, b) =>
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.teamId.localeCompare(b.teamId)
  );
}

export function userPosition(comp) {
  if (comp.kind !== 'league') return null;
  const table = computeTable(comp);
  return table.findIndex(r => r.teamId === comp.userTeamId) + 1;
}

export function compMeta(comp) {
  if (!comp) return {};
  if (comp.kind === 'league') {
    return { label: `Rodada ${Math.min(comp.round + 1, comp.fixtures.length)}/${comp.fixtures.length}`, round: comp.round };
  }
  const round = comp.rounds[comp.round] || [];
  return { label: roundLabel(round.length * 2), remaining: round.filter(f => !f.played).length };
}

export function cloneComp(comp) {
  return deepClone(comp);
}
