import { LEAGUES, TEAM_INDEX, getTeam, getCompetition, COMPETITIONS, BALLS, LOCKED_ITEMS } from "./data.js";

const SAVE_KEY = "pes2027-stickman-save-v1";

const defaultSave = () => ({
  version: 1,
  profile: {
    name: "Treinador",
    coins: 4200,
    xp: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    trophies: {},
    achievements: []
  },
  settings: {
    difficulty: "profissional",
    camera: "broadcast",
    weather: "clear",
    stadium: "maracana",
    matchMinutes: 6,
    narration: true,
    voice: true,
    replay: true,
    tilt: false,
    crowd: 0.8,
    music: 0.32,
    sfx: 0.8,
    commentary: 0.75,
    quality: "high"
  },
  selectedBall: "classic",
  selectedKit: "primary",
  unlocks: { balls: ["classic"], kits: ["primary"] },
  favoriteTeam: "brasileirao-fla",
  edits: { teams: {}, players: {} },
  moves: [],
  competitions: {},
  master: null,
  star: null,
  lastMatch: null,
  daily: { date: "", played: false },
  stats: { bestWin: 0, cleanSheets: 0, hatTricks: 0 }
});

const mergeSave = (base, loaded) => {
  const result = { ...base, ...loaded };
  result.profile = { ...base.profile, ...(loaded.profile || {}) };
  result.settings = { ...base.settings, ...(loaded.settings || {}) };
  result.unlocks = { ...base.unlocks, ...(loaded.unlocks || {}) };
  result.edits = { teams: {}, players: {}, ...(loaded.edits || {}) };
  result.stats = { ...base.stats, ...(loaded.stats || {}) };
  result.competitions = loaded.competitions || {};
  return result;
};

export const loadSave = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return mergeSave(defaultSave(), JSON.parse(raw));
  } catch {
    return defaultSave();
  }
};

export const save = loadSave();

export const persist = () => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    return false;
  }
  return true;
};

const findTeamByPlayerId = (playerId) => {
  for (const league of LEAGUES) {
    for (const team of league.teams) {
      if (team.squad.some((player) => player.id === playerId)) return team;
    }
  }
  return null;
};

export const applyEdits = () => {
  Object.entries(save.edits.teams || {}).forEach(([teamId, edit]) => {
    const team = TEAM_INDEX.get(teamId);
    if (!team) return;
    ["name", "short", "city", "primary", "secondary", "accent", "stadium", "formation", "style"].forEach((key) => {
      if (edit[key] !== undefined) team[key] = edit[key];
    });
  });
  Object.entries(save.edits.players || {}).forEach(([teamId, players]) => {
    const team = TEAM_INDEX.get(teamId);
    if (!team) return;
    Object.entries(players).forEach(([playerId, edit]) => {
      const player = team.squad.find((item) => item.id === playerId);
      if (!player) return;
      ["name", "shortName", "number", "position", "overall", "pace", "shot", "pass", "dribble", "defense", "physical", "age", "foot"].forEach((key) => {
        if (edit[key] !== undefined) player[key] = edit[key];
      });
    });
  });
  (save.edits.newPlayers || []).forEach((entry) => {
    const team = TEAM_INDEX.get(entry.teamId);
    if (!team || !entry.player) return;
    if (!team.squad.some((player) => player.id === entry.player.id)) team.squad.push({ ...entry.player });
  });
};

export const applyMoves = () => {
  (save.moves || []).forEach((move) => {
    const fromTeam = TEAM_INDEX.get(move.from);
    const toTeam = TEAM_INDEX.get(move.to);
    if (!fromTeam || !toTeam || fromTeam.id === toTeam.id) return;
    if (toTeam.squad.some((player) => player.id === move.playerId)) return;
    const index = fromTeam.squad.findIndex((player) => player.id === move.playerId);
    if (index < 0) return;
    const [player] = fromTeam.squad.splice(index, 1);
    toTeam.squad.push(player);
  });
};

export const applyStarPresence = () => {
  if (!save.star || !save.star.player) return;
  const star = save.star.player;
  LEAGUES.forEach((league) => {
    league.teams.forEach((team) => {
      const index = team.squad.findIndex((player) => player.id === star.id);
      if (index >= 0 && team.id !== save.star.clubId) team.squad.splice(index, 1);
    });
  });
  const club = TEAM_INDEX.get(save.star.clubId);
  if (club && !club.squad.some((player) => player.id === star.id)) club.squad.push({ ...star });
};

export const initializeData = () => {
  applyEdits();
  applyMoves();
  applyStarPresence();
};

export const levelInfo = () => {
  const xp = save.profile.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const current = xp % 1000;
  return { level, current, next: 1000, progress: Math.round((current / 1000) * 100) };
};

export const addXp = (amount) => {
  save.profile.xp = Math.max(0, (save.profile.xp || 0) + Math.round(amount));
  return levelInfo();
};

export const addCoins = (amount, silent) => {
  save.profile.coins = Math.max(0, (save.profile.coins || 0) + Math.round(amount));
  if (!silent) persist();
  return save.profile.coins;
};

export const recordMatch = (snapshot, context, rewards) => {
  const homeScore = snapshot.score[0];
  const awayScore = snapshot.score[1];
  const userSide = context.userSide || 0;
  const userGoals = userSide === 0 ? homeScore : awayScore;
  const opponentGoals = userSide === 0 ? awayScore : homeScore;
  save.profile.matches += 1;
  save.profile.goals += userGoals;
  if (userGoals > opponentGoals) save.profile.wins += 1;
  else if (userGoals === opponentGoals) save.profile.draws += 1;
  else save.profile.losses += 1;
  if (userGoals > opponentGoals && userGoals - opponentGoals > (save.stats.bestWin || 0)) save.stats.bestWin = userGoals - opponentGoals;
  if (opponentGoals === 0) save.stats.cleanSheets = (save.stats.cleanSheets || 0) + 1;
  const careerPlayer = snapshot.career;
  if (careerPlayer && careerPlayer.goals >= 3) save.stats.hatTricks = (save.stats.hatTricks || 0) + 1;
  addCoins(rewards.coins || 0, true);
  addXp(rewards.xp || 0);
  persist();
};

export const awardTrophy = (trophyId, name) => {
  save.profile.trophies[trophyId] = (save.profile.trophies[trophyId] || 0) + 1;
  if (!save.profile.achievements.includes(name)) save.profile.achievements.push(name);
  addCoins(2500, true);
  addXp(1200);
  persist();
};

export const buyUnlockable = (itemId) => {
  const item = LOCKED_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, message: "Item não encontrado." };
  const owned = item.type === "ball" ? save.unlocks.balls : save.unlocks.kits;
  if (owned.includes(item.item)) return { ok: false, message: "Item já desbloqueado." };
  if (save.profile.coins < item.price) return { ok: false, message: "Moedas insuficientes." };
  save.profile.coins -= item.price;
  owned.push(item.item);
  if (item.type === "ball") save.selectedBall = item.item;
  if (item.type === "kit") save.selectedKit = item.item;
  persist();
  return { ok: true, message: `${item.name} desbloqueado!` };
};

export const selectBall = (id) => {
  if (!BALLS.some((ball) => ball.id === id)) return;
  if (!save.unlocks.balls.includes(id)) return;
  save.selectedBall = id;
  persist();
};

export const signPlayer = (playerId, buyerTeamId, price) => {
  const buyer = TEAM_INDEX.get(buyerTeamId);
  if (!buyer) return { ok: false, message: "Clube inválido." };
  const seller = findTeamByPlayerId(playerId);
  if (!seller) return { ok: false, message: "Jogador não encontrado." };
  if (seller.id === buyerTeamId) return { ok: false, message: "Jogador já pertence ao seu clube." };
  if (save.master && save.master.budget < price) return { ok: false, message: "Orçamento insuficiente." };
  if (save.master) save.master.budget -= price;
  const index = seller.squad.findIndex((player) => player.id === playerId);
  const [player] = seller.squad.splice(index, 1);
  buyer.squad.push(player);
  save.moves.push({ playerId, from: seller.id, to: buyerTeamId });
  persist();
  return { ok: true, message: `${player.name} contratado!`, player };
};

export const setFavorite = (teamId) => {
  if (!TEAM_INDEX.has(teamId)) return;
  save.favoriteTeam = teamId;
  persist();
};

export const resetSave = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    return false;
  }
  return true;
};

export const domesticCompetitionForTeam = (team) => {
  const map = {
    brasileirao: "BRASILEIRAO",
    premier: "PREMIER",
    laliga: "LALIGA",
    seriea: "SERIEA",
    bundesliga: "BUNDESLIGA",
    ligue1: "LIGUE1"
  };
  return map[team.leagueId] ? getCompetition(map[team.leagueId]) : null;
};

export const domesticCompetitions = () => COMPETITIONS.filter((competition) => competition.format === "league");
