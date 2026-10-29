import { LEAGUES, COMPETITIONS, getTeam, getCompetition } from "./data.js";

const teamName = (id) => getTeam(id).name;

export const competitionTeamIds = (comp) => {
  if (!comp) return [];
  if (comp.id === "CHAMPIONS") {
    const ids = [];
    ["premier", "laliga", "seriea", "bundesliga"].forEach((leagueId) => {
      const league = LEAGUES.find((item) => item.id === leagueId);
      ids.push(...league.teams.slice().sort((a, b) => b.overall - a.overall).slice(0, 4).map((team) => team.id));
    });
    return ids;
  }
  const league = LEAGUES.find((item) => item.id === comp.leagueId);
  return league ? league.teams.map((team) => team.id) : [];
};

export const competitionPool = (comp) => competitionTeamIds(comp).map((id) => getTeam(id));

const shuffle = (items) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const random = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[random]] = [copy[random], copy[index]];
  }
  return copy;
};

const roundRobin = (teamIds) => {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const rounds = [];
  const length = teams.length;
  for (let round = 0; round < length - 1; round += 1) {
    const pairs = [];
    for (let index = 0; index < length / 2; index += 1) {
      const home = teams[index];
      const away = teams[length - 1 - index];
      if (home && away) {
        if ((round + index) % 2 === 0) pairs.push([home, away]);
        else pairs.push([away, home]);
      }
    }
    rounds.push(pairs);
    const last = teams.pop();
    teams.splice(1, 0, last);
  }
  return rounds;
};

const emptyRow = () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] });

export const createLeagueState = (comp, teamId, season) => {
  const ids = competitionTeamIds(comp);
  const rounds = roundRobin(ids);
  return {
    format: "league",
    compId: comp.id,
    season: season || 2027,
    teamId,
    roundIndex: 0,
    rounds: rounds.map((pairs, index) => ({
      index,
      matches: pairs.map(([home, away]) => ({ home, away, played: false, score: null }))
    })),
    standings: Object.fromEntries(ids.map((id) => [id, emptyRow()])),
    finished: false,
    champion: null
  };
};

export const createCupState = (comp, teamId, season) => {
  const ids = shuffle(competitionTeamIds(comp)).slice(0, 16);
  const pairs = [];
  for (let index = 0; index < ids.length; index += 2) {
    pairs.push({ home: ids[index], away: ids[index + 1], played: false, score: null, winner: null, pens: null });
  }
  return {
    format: "cup",
    compId: comp.id,
    season: season || 2027,
    teamId,
    roundIndex: 0,
    rounds: [{ name: "Oitavas de final", matches: pairs }],
    finished: false,
    champion: null
  };
};

export const createCompetitionState = (comp, teamId, season) => {
  return comp.format === "cup" ? createCupState(comp, teamId, season) : createLeagueState(comp, teamId, season);
};

const applyResult = (state, fixture) => {
  if (!fixture.score || fixture.played) return;
  fixture.played = true;
  const homeGoals = fixture.score[0];
  const awayGoals = fixture.score[1];
  const home = state.standings[fixture.home];
  const away = state.standings[fixture.away];
  if (!home || !away) return;
  home.p += 1;
  away.p += 1;
  home.gf += homeGoals;
  home.ga += awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;
  if (homeGoals > awayGoals) {
    home.w += 1;
    away.l += 1;
    home.pts += 3;
    home.form.push("V");
    away.form.push("D");
  } else if (homeGoals < awayGoals) {
    away.w += 1;
    home.l += 1;
    away.pts += 3;
    away.form.push("V");
    home.form.push("D");
  } else {
    home.d += 1;
    away.d += 1;
    home.pts += 1;
    away.pts += 1;
    home.form.push("E");
    away.form.push("E");
  }
  home.form = home.form.slice(-5);
  away.form = away.form.slice(-5);
};

export const standingsTable = (state) => {
  return Object.entries(state.standings)
    .map(([teamId, row]) => ({ teamId, team: getTeam(teamId), ...row, gd: row.gf - row.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name))
    .map((entry, index) => ({ ...entry, position: index + 1 }));
};

export const leaguePosition = (state, teamId) => {
  const row = standingsTable(state).find((entry) => entry.teamId === teamId);
  return row ? row.position : 0;
};

const poisson = (lambda) => {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= Math.random();
  } while (product > limit);
  return count - 1;
};

export const simulateScore = (homeId, awayId) => {
  const home = getTeam(homeId);
  const away = getTeam(awayId);
  const difference = home.overall - away.overall;
  const homeExpected = Math.max(0.25, 1.38 + difference * 0.045 + 0.22);
  const awayExpected = Math.max(0.2, 1.08 - difference * 0.04);
  return [Math.min(6, poisson(homeExpected)), Math.min(6, poisson(awayExpected))];
};

const simulateFixture = (state, fixture) => {
  fixture.score = simulateScore(fixture.home, fixture.away);
  fixture.played = true;
  if (state.standings) applyResult(state, fixture);
  if (state.format === "cup") {
    if (fixture.score[0] === fixture.score[1]) {
      const homePens = 3 + Math.floor(Math.random() * 3);
      let awayPens = 3 + Math.floor(Math.random() * 3);
      if (awayPens === homePens) awayPens += Math.random() > 0.5 ? 1 : -1;
      fixture.pens = [Math.max(0, homePens), Math.max(0, awayPens)];
      fixture.winner = fixture.pens[0] > fixture.pens[1] ? fixture.home : fixture.away;
    } else {
      fixture.winner = fixture.score[0] > fixture.score[1] ? fixture.home : fixture.away;
    }
  }
};

export const currentUserFixture = (state) => {
  if (!state || state.finished) return null;
  const round = state.rounds[state.roundIndex];
  if (!round) return null;
  return round.matches.find((match) => !match.played && (match.home === state.teamId || match.away === state.teamId)) || null;
};

export const currentRound = (state) => (state ? state.rounds[state.roundIndex] : null);

const finalizeLeague = (state) => {
  if (state.roundIndex < state.rounds.length) return;
  state.finished = true;
  state.champion = standingsTable(state)[0]?.teamId || null;
};

export const completeLeagueRound = (state, userScore) => {
  if (state.finished) return state;
  const round = state.rounds[state.roundIndex];
  if (!round) return state;
  const userFixture = round.matches.find((match) => !match.played && (match.home === state.teamId || match.away === state.teamId));
  if (userFixture && userScore) {
    userFixture.score = userScore;
    userFixture.played = true;
    applyResult(state, userFixture);
  }
  round.matches.forEach((fixture) => {
    if (!fixture.played) simulateFixture(state, fixture);
  });
  state.roundIndex += 1;
  finalizeLeague(state);
  return state;
};

export const simulateLeagueRound = (state) => {
  if (state.finished) return state;
  const round = state.rounds[state.roundIndex];
  if (!round) return state;
  round.matches.forEach((fixture) => {
    if (!fixture.played) simulateFixture(state, fixture);
  });
  state.roundIndex += 1;
  finalizeLeague(state);
  return state;
};

const cupRoundWinner = (fixture) => fixture.winner || (fixture.score[0] >= fixture.score[1] ? fixture.home : fixture.away);

const buildNextCupRound = (state, winners) => {
  if (!winners.length) return;
  const names = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
  if (state.rounds.length >= 4) {
    const finalMatch = state.rounds[3].matches[0];
    state.champion = cupRoundWinner(finalMatch);
    state.finished = true;
    return;
  }
  const pairs = [];
  for (let index = 0; index < winners.length; index += 2) {
    if (winners[index + 1]) pairs.push({ home: winners[index], away: winners[index + 1], played: false, score: null, winner: null, pens: null });
  }
  state.rounds.push({ name: names[state.rounds.length], matches: pairs });
  state.roundIndex += 1;
  if (state.rounds.length === 4) {
    state.roundIndex = 3;
  }
};

export const completeCupRound = (state, userScore) => {
  if (state.finished) return state;
  const round = state.rounds[state.roundIndex];
  if (!round) return state;
  const userFixture = round.matches.find((match) => !match.played && (match.home === state.teamId || match.away === state.teamId));
  if (userFixture && userScore) {
    userFixture.score = userScore;
    userFixture.played = true;
    if (userScore[0] === userScore[1]) {
      const userPens = 4 + Math.floor(Math.random() * 2);
      const opponentPens = 3 + Math.floor(Math.random() * 2);
      userFixture.pens = userFixture.home === state.teamId ? [userPens, opponentPens] : [opponentPens, userPens];
      userFixture.winner = userFixture.pens[0] > userFixture.pens[1] ? userFixture.home : userFixture.away;
    } else {
      userFixture.winner = userScore[0] > userScore[1] ? userFixture.home : userFixture.away;
    }
  }
  round.matches.forEach((fixture) => {
    if (!fixture.played) simulateFixture(state, fixture);
  });
  if (round.matches.length === 1) {
    state.champion = cupRoundWinner(round.matches[0]);
    state.finished = true;
    return state;
  }
  const winners = round.matches.map((fixture) => cupRoundWinner(fixture));
  buildNextCupRound(state, winners);
  return state;
};

export const simulateCupRound = (state) => {
  if (state.finished) return state;
  const round = state.rounds[state.roundIndex];
  if (!round) return state;
  round.matches.forEach((fixture) => {
    if (!fixture.played) simulateFixture(state, fixture);
  });
  if (round.matches.length === 1) {
    state.champion = cupRoundWinner(round.matches[0]);
    state.finished = true;
    return state;
  }
  const winners = round.matches.map((fixture) => cupRoundWinner(fixture));
  buildNextCupRound(state, winners);
  return state;
};

export const simulateCupTournament = (state) => {
  let guard = 0;
  while (!state.finished && guard < 10) {
    simulateCupRound(state);
    guard += 1;
  }
  return state;
};

export const playLeagueFixture = (state, fixtureId, score) => {
  if (state.format !== "league") return completeCupRound(state, score);
  return completeLeagueRound(state, score);
};

export const competitionChampion = (state) => (state && state.champion ? getTeam(state.champion) : null);

export const userIsEliminated = (state) => {
  if (!state || state.format !== "cup" || !state.teamId) return false;
  if (state.finished) return state.champion !== state.teamId;
  return state.rounds.some((round) => round.matches.some((match) => match.played && (match.home === state.teamId || match.away === state.teamId) && cupRoundWinner(match) !== state.teamId));
};

export const fixtureLabel = (fixture) => ({
  home: getTeam(fixture.home),
  away: getTeam(fixture.away),
  score: fixture.score,
  played: fixture.played
});

export const getCompetitionById = (id) => COMPETITIONS.find((comp) => comp.id === id) || getCompetition(id);

export const teamDisplay = (id) => teamName(id);
