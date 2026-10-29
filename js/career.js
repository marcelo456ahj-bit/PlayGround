/* Regras dos modos Master League e Rumo ao Estrelato. */

import { SEASON, getTeam, getLeague, ALL_TEAMS, slug } from './data.js';
import { state } from './state.js';
import { makeLeagueRun, applyLeagueRound, userFixture, sortedTable, tableHtml } from './competitions.js';

export function createStarPlayer(name, pos, teamId, rating = 68) {
  const team = getTeam(teamId);
  const id = `star-${slug(name)}-${Date.now().toString(36)}`;
  return {
    id, name: name || 'Novo Craque', short: (name || 'Craque').split(' ').slice(-1)[0], teamId,
    pos, num: 10, rating, pace: rating + 4, shoot: rating + (pos === 'ATA' ? 6 : 2),
    pass: rating, dribble: rating + 3, defense: rating - (pos === 'ATA' ? 18 : 8), physical: rating - 2,
    stamina: 78, age: 18, nationality: team.country, foot: 'Direito', form: 82, morale: 88,
    value: 2400000, wage: 18, injured: 0, card: 0, skin: '#dba173', hair: '#2a1d14',
    hairStyle: 1, boots: '#c8ff3d', star: true, apps: 0, goals: 0
  };
}

export function startCareer(mode, teamId, name = 'NOVO CRAQUE', pos = 'ATA') {
  const team = getTeam(teamId);
  if (!team) return null;
  const league = getLeague(team.leagueId);
  const ids = league ? league.teams.map(t => t.id) : ALL_TEAMS.slice(0, 20).map(t => t.id);
  const run = makeLeagueRun(teamId, ids);
  const career = {
    mode, teamId, name: state.profile.name, season: SEASON, created: Date.now(),
    run, coins: 1500, xp: 0, trophies: [], history: [],
    objectives: [
      { id: 'wins', label: 'Vença 5 partidas', target: 5, value: 0 },
      { id: 'goals', label: 'Marque 15 gols', target: 15, value: 0 },
      { id: 'top4', label: 'Termine no G4', target: 1, value: 0 }
    ]
  };
  if (mode === 'star') {
    career.player = createStarPlayer(name, pos, teamId);
    team.squad.unshift(career.player);
    career.objectives.push({ id: 'starGoals', label: `Marque 10 gols com ${name}`, target: 10, value: 0 });
  }
  state.career = career;
  state.careerTab = 'overview';
  return career;
}

export function careerNextFixture() {
  const c = state.career;
  if (!c || !c.run) return null;
  return userFixture(c.run);
}

export function applyCareerResult(result) {
  const c = state.career;
  if (!c) return;
  const homeId = result.homeId, awayId = result.awayId;
  applyLeagueRound(c.run, { home: homeId, away: awayId, hs: result.score.home, as: result.score.away });
  const playerSide = c.teamId === homeId ? 'home' : 'away';
  const myGoals = result.score[playerSide] || 0;
  const oppGoals = result.score[playerSide === 'home' ? 'away' : 'home'] || 0;
  c.xp += 40 + (myGoals > oppGoals ? 75 : myGoals === oppGoals ? 30 : 12);
  c.coins += 250 + myGoals * 40;
  const wins = c.run.log.filter(x => x.user && ((x.home === c.teamId && x.hs > x.as) || (x.away === c.teamId && x.as > x.hs))).length;
  const goals = c.run.log.filter(x => x.user).reduce((a, x) => a + (x.home === c.teamId ? x.hs : x.as), 0);
  const obj = (id) => c.objectives.find(o => o.id === id);
  if (obj('wins')) obj('wins').value = wins;
  if (obj('goals')) obj('goals').value = goals;
  if (c.mode === 'star' && c.player) {
    c.player.apps = (c.player.apps || 0) + 1;
    const starGoals = (result.goals || []).filter(g => g.player?.data?.name === c.player.name).length;
    c.player.goals = (c.player.goals || 0) + starGoals;
    c.player.rating = Math.min(92, Math.round((c.player.rating + (starGoals ? .8 : .18)) * 10) / 10);
    if (obj('starGoals')) obj('starGoals').value = c.player.goals;
    c.player.value = Math.round((c.player.value || 2400000) * 1.035);
  }
  if (c.run.done) {
    c.run.position = sortedTable(c.run).findIndex(r => r.id === c.teamId) + 1;
    if (obj('top4')) obj('top4').value = c.run.position <= 4 ? 1 : 0;
    if (c.run.champion === c.teamId) c.trophies.push(`Temporada ${c.season}`);
  }
  c.history.unshift({ season: c.season, round: c.run.round, homeId, awayId, score: { ...result.score } });
  if (c.history.length > 20) c.history.pop();
}

export function careerNextSeason() {
  const c = state.career;
  if (!c) return;
  c.season++;
  const team = getTeam(c.teamId);
  const league = getLeague(team.leagueId);
  c.run = makeLeagueRun(c.teamId, (league || { teams: [] }).teams.map(t => t.id));
  c.objectives = [
    { id: 'wins', label: 'Vença 5 partidas', target: 5, value: 0 },
    { id: 'goals', label: 'Marque 15 gols', target: 15, value: 0 },
    { id: 'top4', label: 'Termine no G4', target: 1, value: 0 }
  ];
  if (c.mode === 'star' && c.player) c.objectives.push({ id: 'starGoals', label: `Marque 10 gols com ${c.player.name}`, target: 10, value: c.player.goals || 0 });
}

export function simulateCareerRound() {
  const c = state.career;
  if (!c || c.run.done) return;
  applyLeagueRound(c.run, null);
  const goals = c.run.log.filter(x => x.user).reduce((a, x) => a + (x.home === c.teamId ? x.hs : x.as), 0);
  const wins = c.run.log.filter(x => x.user && ((x.home === c.teamId && x.hs > x.as) || (x.away === c.teamId && x.as > x.hs))).length;
  const obj = (id) => c.objectives.find(o => o.id === id);
  if (obj('wins')) obj('wins').value = wins;
  if (obj('goals')) obj('goals').value = goals;
  if (c.run.done) {
    c.run.position = sortedTable(c.run).findIndex(r => r.id === c.teamId) + 1;
    if (obj('top4')) obj('top4').value = c.run.position <= 4 ? 1 : 0;
  }
  c.xp += 15;
}

export { tableHtml };
