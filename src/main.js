import { CAMERAS, COMPETITIONS, DIFFICULTIES, FORMATIONS, LEAGUES, NEWS, STADIUMS, WEATHERS, getTeam, getLeague } from "./data.js";
import {
  save,
  persist,
  initializeData,
  recordMatch,
  addCoins,
  addXp,
  levelInfo,
  awardTrophy,
  setFavorite
} from "./store.js";
import { buildLineup } from "./match-utils.js";
import { AudioEngine } from "./audio.js";
import { MatchEngine } from "./match.js";
import {
  standingsTable,
  currentUserFixture,
  simulateLeagueRound,
  completeLeagueRound,
  completeCupRound,
  createCompetitionState
} from "./competition-engine.js";
import {
  crest,
  escapeHTML,
  formatCoins,
  icon,
  modalShell,
  openModal,
  closeModal,
  renderNav,
  stadiumForTeam,
  toast
} from "./ui.js";
import { renderHome, renderQuick, bindQuick, renderMultiplayer, bindMultiplayer } from "./screens-home.js";
import { renderCompetitions, renderCompetitionHub, bindCompetition, simulateCompetitionRound } from "./screens-competition.js";
import {
  renderMaster,
  renderStar,
  bindMaster,
  bindStar,
  createStarState,
  finalizeMasterSeason,
  finalizeStarSeason,
  newMasterSeason,
  newStarSeason,
  acceptStarOffer
} from "./screens-career.js";
import { renderTransfers, bindTransfers, playerValue } from "./screens-transfers.js";
import { renderEditor, bindEditor } from "./screens-editor.js";
import { renderTraining, bindTraining } from "./screens-training.js";
import { renderExtras, bindExtras, renderSettings, bindSettings } from "./screens-extras.js";

const audio = new AudioEngine();

const app = {
  audio,
  screen: "home",
  state: { compId: null, featuredAway: null },
  matchEngine: null,
  matchContext: null,
  pendingMatch: null,
  lastMatchResult: null,
  matchEnded: false,
  matchTimer: null,
  goalTimer: null,
  transferFilter: null,
  transfers: { league: "all", position: "all", search: "", sort: "overall" },
  editor: { tab: "team", teamId: save.favoriteTeam, playerId: null },
  extras: { tab: "store" },
  motionBase: null,
  motionBound: false,

  quickOptions() {
    return {
      matchMinutes: this.quick.matchMinutes,
      difficulty: this.quick.difficulty,
      weather: this.quick.weather,
      stadium: this.quick.stadium,
      camera: this.quick.camera,
      controlMode: this.quick.controlMode,
      narration: this.quick.narration,
      replay: this.quick.replay,
      tilt: this.quick.tilt
    };
  },

  render() {
    const view = document.getElementById("view");
    if (!view) return;
    let html = "";
    try {
      if (this.screen === "home") html = renderHome(this);
      else if (this.screen === "quick") html = renderQuick(this);
      else if (this.screen === "competitions") html = renderCompetitions(this);
      else if (this.screen === "compHub") html = renderCompetitionHub(this);
      else if (this.screen === "master") html = renderMaster(this);
      else if (this.screen === "star") html = renderStar(this);
      else if (this.screen === "transfers") html = renderTransfers(this);
      else if (this.screen === "editor") html = renderEditor(this);
      else if (this.screen === "training") html = renderTraining(this);
      else if (this.screen === "multiplayer") html = renderMultiplayer(this);
      else if (this.screen === "extras") html = renderExtras(this);
      else if (this.screen === "settings") html = renderSettings(this);
      else html = renderHome(this);
    } catch (error) {
      console.error(error);
      html = `<div class="screen"><div class="panel"><div class="panel-body"><h2 class="screen-title" style="font-size:28px">Não foi possível abrir esta tela</h2><p class="screen-sub">Tente voltar ao início e abrir novamente.</p><button class="primary-btn" data-go="home">Voltar ao início</button></div></div></div>`;
    }
    view.innerHTML = html;
    document.getElementById("mainNav").innerHTML = renderNav(this.navForScreen());
    this.updateTopbar();
    this.bindScreen();
    view.scrollTop = 0;
    window.scrollTo(0, 0);
    document.querySelector(".sidebar")?.classList.remove("open");
    document.title = this.titleForScreen();
  },

  navForScreen() {
    if (this.screen === "compHub") return "competitions";
    return this.screen;
  },

  titleForScreen() {
    const titles = {
      home: "PES 2027 STICKMAN 2D",
      quick: "Partida Rápida · PES 2027",
      competitions: "Competições · PES 2027",
      compHub: "Torneio · PES 2027",
      master: "Master League · PES 2027",
      star: "Rumo ao Estrelato · PES 2027",
      transfers: "Transferências · PES 2027",
      editor: "Editor · PES 2027",
      training: "Treinos · PES 2027",
      multiplayer: "Multijogador · PES 2027",
      extras: "Extras · PES 2027",
      settings: "Configurações · PES 2027"
    };
    return titles[this.screen] || "PES 2027 STICKMAN 2D";
  },

  bindScreen() {
    if (this.screen === "quick") bindQuick(this);
    if (this.screen === "multiplayer") bindMultiplayer(this);
    if (this.screen === "competitions" || this.screen === "compHub") bindCompetition(this);
    if (this.screen === "master") bindMaster(this);
    if (this.screen === "star") bindStar(this);
    if (this.screen === "transfers") bindTransfers(this);
    if (this.screen === "editor") bindEditor(this);
    if (this.screen === "training") bindTraining(this);
    if (this.screen === "extras") bindExtras(this);
    if (this.screen === "settings") bindSettings(this);
  },

  navigate(screen) {
    if (screen === "compHub" && !this.state.compId) screen = "competitions";
    this.screen = screen;
    closeModal();
    this.render();
  },

  updateTopbar() {
    const level = levelInfo();
    const coins = document.getElementById("profileCoins");
    if (coins) coins.querySelector("span").textContent = formatCoins(save.profile.coins);
    const levelEl = document.getElementById("profileLevel");
    if (levelEl) levelEl.textContent = `NÍVEL ${level.level}`;
    const progress = document.getElementById("levelProgress");
    if (progress) progress.style.width = `${level.progress}%`;
    const avatar = document.querySelector("#profileBtn span");
    if (avatar) avatar.textContent = (save.profile.name || "T").slice(0, 1).toUpperCase();
  },

  openTeamPicker(options) {
    const pool = [...new Map((options.pool || LEAGUES.flatMap((league) => league.teams)).map((team) => [team.id, team])).values()]
      .filter((team) => team.id !== options.excludeId);
    const body = `
      <div class="search-box" style="margin-bottom:10px">
        ${icon("search")}
        <input id="pickerSearch" placeholder="Buscar clube..." autocomplete="off">
      </div>
      <div class="picker-grid">
        ${pool.map((team) => `
          <button class="team-card ${team.id === options.selectedId ? "active" : ""}" data-picker-team="${team.id}" data-picker-name="${escapeHTML(team.name.toLowerCase())}">
            ${crest(team)}
            <strong>${escapeHTML(team.name)}</strong>
            <span><small>${escapeHTML(team.city)}</small><b>${team.overall}</b></span>
          </button>`).join("")}
      </div>`;
    openModal(modalShell(options.title || "Escolha um clube", options.eyebrow || "SELEÇÃO DE CLUBE", body,
      `<button class="ghost-btn" data-close-modal>Cancelar</button>`, true));
    const search = document.getElementById("pickerSearch");
    search?.focus();
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-picker-team]").forEach((card) => {
        card.classList.toggle("hidden", !card.dataset.pickerName.includes(query));
      });
    });
    document.querySelectorAll("[data-picker-team]").forEach((button) => {
      button.addEventListener("click", () => {
        const team = getTeam(button.dataset.pickerTeam);
        closeModal();
        options.onPick?.(team);
      });
    });
  },

  confirmCompetitionStart(comp, team) {
    const budget = Math.round(comp.prize / 2);
    openModal(modalShell("Confirmar torneio", "NOVO DESAFIO", `
      <div class="confirm-comp">
        <div class="confirm-comp-art" style="--comp:${comp.color}">${icon("trophy")}</div>
        <div>
          <span class="eyebrow">${comp.format === "cup" ? "MATA-MATA" : "PONTOS CORRIDOS"}</span>
          <h3>${escapeHTML(comp.name)}</h3>
          <p>${escapeHTML(comp.description)}</p>
        </div>
      </div>
      <div class="confirm-team-row">
        ${crest(team, "md")}
        <div><span>SEU CLUBE</span><strong>${escapeHTML(team.name)}</strong><small>${team.overall} OVR · ${escapeHTML(team.city)}</small></div>
        <div class="confirm-prize"><span>PREMIAÇÃO</span><b>${formatCoins(comp.prize)}</b></div>
      </div>`,
    `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn" data-confirm-comp="${comp.id}" data-confirm-team="${team.id}">${icon("play")} Iniciar torneio</button>`));
    document.querySelector("[data-confirm-comp]")?.addEventListener("click", () => {
      this.createCompetition(comp, team);
    });
  },

  createCompetition(comp, team) {
    save.competitions[comp.id] = createCompetitionState(comp, team.id, 2027);
    persist();
    this.state.compId = comp.id;
    closeModal();
    this.audio.success();
    toast(`${comp.name} iniciada com ${team.name}.`);
    this.navigate("compHub");
  },

  simulateCompetition(compId) {
    simulateCompetitionRound(this, compId);
  },

  confirmMasterStart(team) {
    const comp = COMPETITIONS.find((item) => item.id === ({ brasileirao: "BRASILEIRAO", premier: "PREMIER", laliga: "LALIGA", seriea: "SERIEA", bundesliga: "BUNDESLIGA", ligue1: "LIGUE1" })[team.leagueId]);
    const budget = team.overall >= 88 ? 118000000 : team.overall >= 84 ? 82000000 : team.overall >= 79 ? 56000000 : 34000000;
    openModal(modalShell("Iniciar Master League", "MODO CARREIRA", `
      <div class="confirm-team-row">
        ${crest(team, "md")}
        <div><span>SEU NOVO CLUBE</span><strong>${escapeHTML(team.name)}</strong><small>${team.overall} OVR · ${escapeHTML(team.stadium)}</small></div>
        <div class="confirm-prize"><span>ORÇAMENTO</span><b>${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(budget)}</b></div>
      </div>
      <div class="career-points" style="margin-top:14px">
        <span>${icon("trophy")} ${escapeHTML(comp?.name || "Liga nacional")}</span>
        <span>${icon("check")} Objetivo: terminar entre os ${team.overall >= 87 ? 1 : team.overall >= 84 ? 3 : team.overall >= 80 ? 5 : 8} primeiros</span>
        <span>${icon("transfer")} Mercado aberto</span>
        <span>${icon("calendar")} Temporadas ilimitadas</span>
      </div>`,
    `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn" data-confirm-master="${team.id}">${icon("master")} Assinar contrato</button>`));
    document.querySelector("[data-confirm-master]")?.addEventListener("click", () => this.createMaster(team));
  },

  createMaster(team) {
    const comp = COMPETITIONS.find((item) => item.id === ({ brasileirao: "BRASILEIRAO", premier: "PREMIER", laliga: "LALIGA", seriea: "SERIEA", bundesliga: "BUNDESLIGA", ligue1: "LIGUE1" })[team.leagueId]);
    const budget = team.overall >= 88 ? 118000000 : team.overall >= 84 ? 82000000 : team.overall >= 79 ? 56000000 : 34000000;
    save.master = {
      teamId: team.id,
      season: 2027,
      budget,
      confidence: 64,
      wins: 0,
      goals: 0,
      form: [],
      league: createCompetitionState(comp, team.id, 2027),
      objectives: { position: team.overall >= 87 ? 1 : team.overall >= 84 ? 3 : team.overall >= 80 ? 5 : 8, wins: 8, goals: 24 },
      seasonEnd: null,
      history: []
    };
    persist();
    closeModal();
    this.audio.success();
    toast(`Bem-vindo ao ${team.name}!`);
    this.navigate("master");
  },

  createStar(form) {
    createStarState(form);
    this.audio.success();
    toast(`Carreira de ${form.name} iniciada.`);
    this.navigate("star");
  },

  simulateMasterRound() {
    const master = save.master;
    if (!master || master.league.finished) return;
    const fixture = currentUserFixture(master.league);
    simulateLeagueRound(master.league);
    this.applyMasterSimulatedFixture(fixture);
    finalizeMasterSeason(this);
    this.render();
  },

  simulateMasterSeason() {
    const master = save.master;
    if (!master || master.league.finished) return;
    let guard = 0;
    while (!master.league.finished && guard < 50) {
      const fixture = currentUserFixture(master.league);
      simulateLeagueRound(master.league);
      this.applyMasterSimulatedFixture(fixture);
      guard += 1;
    }
    finalizeMasterSeason(this);
    toast("Temporada simulada.");
    this.render();
  },

  applyMasterSimulatedFixture(fixture) {
    const master = save.master;
    if (!fixture || !fixture.score) return;
    const userHome = fixture.home === master.teamId;
    const goalsFor = userHome ? fixture.score[0] : fixture.score[1];
    const goalsAgainst = userHome ? fixture.score[1] : fixture.score[0];
    master.wins = (master.wins || 0) + (goalsFor > goalsAgainst ? 1 : 0);
    master.goals = (master.goals || 0) + goalsFor;
    master.form = master.form || [];
    master.form.push(goalsFor > goalsAgainst ? "V" : goalsFor === goalsAgainst ? "E" : "D");
    master.form = master.form.slice(-6);
  },

  startNextMasterSeason() {
    newMasterSeason(this);
  },

  simulateStarRound() {
    const star = save.star;
    if (!star || star.league.finished) return;
    simulateLeagueRound(star.league);
    this.applyStarSimulation();
    finalizeStarSeason(this);
    this.render();
  },

  simulateStarSeason() {
    const star = save.star;
    if (!star || star.league.finished) return;
    let guard = 0;
    while (!star.league.finished && guard < 50) {
      simulateLeagueRound(star.league);
      this.applyStarSimulation();
      guard += 1;
    }
    finalizeStarSeason(this);
    toast("Temporada simulada.");
    this.render();
  },

  applyStarSimulation() {
    const star = save.star;
    if (!star) return;
    const chance = 0.22 + star.overall / 300;
    const goals = Math.random() < chance ? 1 : 0;
    const assists = Math.random() < chance * 0.55 ? 1 : 0;
    const rating = 6.1 + Math.random() * 2.1 + goals * 0.25;
    this.updateStarStats(goals, assists, rating);
  },

  updateStarStats(goals, assists, rating) {
    const star = save.star;
    if (!star) return;
    star.appearances += 1;
    star.goals += goals;
    star.assists += assists;
    star.seasonGoals = (star.seasonGoals || 0) + goals;
    star.seasonAssists = (star.seasonAssists || 0) + assists;
    star.ratingTotal += rating;
    const gained = Math.max(18, Math.round(60 + goals * 34 + assists * 18 + (rating - 6) * 26));
    star.xp = (star.xp || 0) + gained;
    addXp(gained);
    const target = Math.min(star.potential, 64 + Math.floor(star.xp / 260));
    if (target > star.overall) {
      const increase = target - star.overall;
      star.overall = target;
      star.player.overall = target;
      ["pace", "shot", "pass", "dribble", "defense", "physical"].forEach((key) => {
        star.player[key] = Math.min(99, star.player[key] + increase);
      });
      const club = getTeam(star.clubId);
      const squadPlayer = club.squad.find((player) => player.id === star.player.id);
      if (squadPlayer) Object.assign(squadPlayer, { ...star.player });
    }
    const club = getTeam(star.clubId);
    star.player.age = star.age;
    const squadPlayer = club.squad.find((player) => player.id === star.player.id);
    if (squadPlayer) Object.assign(squadPlayer, { age: star.age, overall: star.overall });
  },

  startNextStarSeason() {
    newStarSeason(this);
  },

  acceptStarOffer(clubId) {
    acceptStarOffer(this, clubId);
  },

  showFullTable(state) {
    const rows = standingsTable(state);
    const comp = COMPETITIONS.find((item) => item.id === state.compId);
    openModal(modalShell("Classificação completa", comp?.name || "COMPETIÇÃO", `
      <div class="table-wrap" style="max-height:60vh">
        <table class="data-table">
          <thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr></thead>
          <tbody>${rows.map((row) => `
            <tr class="${row.teamId === state.teamId ? "user-row" : ""}">
              <td class="pos">${row.position}</td>
              <td><div class="table-team">${crest(row.team, "xs")}<strong>${escapeHTML(row.team.name)}</strong></div></td>
              <td>${row.p}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td>
              <td>${row.gf}</td><td>${row.ga}</td><td>${row.gd > 0 ? `+${row.gd}` : row.gd}</td><td class="pts">${row.pts}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`, `<button class="primary-btn" data-close-modal>Fechar</button>`, true));
  },

  openFormationModal() {
    const master = save.master;
    if (!master) return;
    const team = getTeam(master.teamId);
    openModal(modalShell("Formação da equipe", team.name, `
      <label class="field wide"><span>Formação tática</span>
        <select id="masterFormation">${Object.keys(FORMATIONS).map((key) => `<option value="${key}" ${key === team.formation ? "selected" : ""}>${key} · ${FORMATIONS[key].name}</option>`).join("")}</select>
      </label>
      <div class="coach-quote" style="margin-top:12px">A formação é aplicada nas próximas partidas e pode ser ajustada durante o jogo no menu de pausa.</div>`,
    `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn" data-save-formation>${icon("check")} Salvar formação</button>`));
    document.querySelector("[data-save-formation]")?.addEventListener("click", () => {
      const formation = document.getElementById("masterFormation").value;
      team.formation = formation;
      save.edits.teams[team.id] = { ...(save.edits.teams[team.id] || {}), formation };
      persist();
      closeModal();
      toast("Formação atualizada.");
      this.render();
    });
  },

  showPreMatch(homeId, awayId, context, options) {
    const home = getTeam(homeId);
    const away = getTeam(awayId);
    const careerPlayerId = context.type === "star" ? save.star?.player.id : null;
    const homeCareer = careerPlayerId && home.squad.some((player) => player.id === careerPlayerId) ? careerPlayerId : null;
    const awayCareer = careerPlayerId && away.squad.some((player) => player.id === careerPlayerId) ? careerPlayerId : null;
    const homeLineup = buildLineup(home, home.formation, homeCareer);
    const awayLineup = buildLineup(away, away.formation, awayCareer);
    const stadium = STADIUMS.find((item) => item.name === home.stadium) || stadiumForTeam(home);
    const weather = WEATHERS.find((item) => item.id === options.weather) || WEATHERS[0];
    const difficulty = DIFFICULTIES.find((item) => item.id === options.difficulty) || DIFFICULTIES[1];
    this.pendingMatch = {
      homeId,
      awayId,
      context: { ...context, homeId, awayId },
      options: { ...options, stadium: stadium.id }
    };
    openModal(modalShell("Pré-jogo", context.compName || "AMISTOSO", `
      <div class="prematch-head">
        <div class="prematch-team">${crest(home, "lg")}<h3>${escapeHTML(home.name)}</h3><span>${escapeHTML(home.formation)} · ${home.overall} OVR</span></div>
        <div class="prematch-vs"><span>VS</span><small>${escapeHTML(stadium.name)}<br>${escapeHTML(weather.name)} · ${escapeHTML(difficulty.name)}</small></div>
        <div class="prematch-team">${crest(away, "lg")}<h3>${escapeHTML(away.name)}</h3><span>${escapeHTML(away.formation)} · ${away.overall} OVR</span></div>
      </div>
      <div class="lineup-cols">
        <div class="lineup-col">
          <div class="lineup-title">${escapeHTML(home.short)} <span>${options.controlMode === "local" ? "J1" : "SEU TIME"}</span></div>
          ${homeLineup.starters.map((player) => `<div class="lineup-row"><span>${player.position}</span><strong>${escapeHTML(player.name)}</strong><b>${player.overall}</b></div>`).join("")}
        </div>
        <div class="lineup-col">
          <div class="lineup-title">${escapeHTML(away.short)} <span>${options.controlMode === "local" ? "J2" : "CPU"}</span></div>
          ${awayLineup.starters.map((player) => `<div class="lineup-row"><span>${player.position}</span><strong>${escapeHTML(player.name)}</strong><b>${player.overall}</b></div>`).join("")}
        </div>
      </div>
      <div class="prematch-meta">
        <span>${icon("calendar")} ${options.matchMinutes} min</span>
        <span>${icon("camera")} ${CAMERAS.find((item) => item.id === options.camera)?.name || "Transmissão"}</span>
        <span>${icon("users")} ${options.controlMode === "local" ? "2 jogadores" : "1 jogador"}</span>
        <span>${options.narration ? "Narração ativa" : "Sem narração"}</span>
      </div>`,
    `<button class="ghost-btn" data-close-modal>Voltar</button><button class="primary-btn" data-kickoff>${icon("play")} Entrar em campo</button>`, true));
    document.querySelector("[data-kickoff]")?.addEventListener("click", () => {
      const pending = this.pendingMatch;
      closeModal();
      this.launchMatch(pending);
    });
  },

  launchMatch(pending) {
    if (!pending) return;
    const { homeId, awayId, context, options } = pending;
    const home = getTeam(homeId);
    const away = getTeam(awayId);
    const userTeamId = context.userTeamId || homeId;
    const userSide = home.id === userTeamId ? 0 : 1;
    const careerPlayerId = context.type === "star" ? save.star?.player.id : null;
    this.matchContext = { ...context, userSide, homeId, awayId };
    this.matchEnded = false;
    this.lastMatchResult = null;
    this.pendingMatch = null;
    document.getElementById("matchScreen").classList.remove("hidden");
    document.body.classList.add("match-active");
    this.hideMatchOverlays();
    document.getElementById("touchLayer").classList.remove("hidden");
    document.getElementById("p2Pad").classList.toggle("hidden", options.controlMode !== "local");
    document.getElementById("cameraLabel").textContent = CAMERAS.find((item) => item.id === (options.camera || "broadcast"))?.name || "Transmissão";
    document.getElementById("matchAudioBtn")?.classList.toggle("muted", audio.settings.master === 0);

    const engine = new MatchEngine({
      canvas: document.getElementById("matchCanvas"),
      audio,
      homeTeam: home,
      awayTeam: away,
      homeFormation: home.formation,
      awayFormation: away.formation,
      difficulty: options.difficulty,
      weather: options.weather,
      stadium: options.stadium,
      ball: save.selectedBall,
      camera: options.camera,
      controlMode: options.controlMode,
      matchMinutes: options.matchMinutes,
      replay: options.replay,
      narration: options.narration,
      crowd: save.settings.crowd,
      careerPlayerId,
      homeKit: save.selectedKit,
      awayKit: "primary",
      tilt: options.tilt && save.settings.tilt,
      onEvent: (type, payload) => this.handleMatchEvent(type, payload)
    });
    this.matchEngine = engine;
    engine.start();
    audio.setSettings(save.settings);
    this.bindMatchInputs();
    if (options.tilt && save.settings.tilt) this.bindMotion();
  },

  handleMatchEvent(type, payload) {
    if (type === "hud") this.updateMatchHud(payload);
    else if (type === "goal") this.showGoal(payload);
    else if (type === "replayStart") {
      document.getElementById("goalOverlay").classList.add("hidden");
      document.getElementById("replayBadge").classList.remove("hidden");
    } else if (type === "replayEnd") {
      document.getElementById("replayBadge").classList.add("hidden");
    } else if (type === "halftime") {
      this.showHalftime(payload);
    } else if (type === "end") {
      this.handleMatchEnd(payload);
    } else if (type === "commentary") {
      const text = document.getElementById("commentaryText");
      if (text) text.textContent = payload.text;
    } else if (type === "card") {
      toast(`${payload.player} recebeu cartão ${payload.type === "red" ? "vermelho" : "amarelo"}.`);
    } else if (type === "pauseRequest") {
      this.pauseMatch();
    } else if (type === "paused") {
      document.getElementById("pauseOverlay").classList.remove("hidden");
    } else if (type === "resumed") {
      document.getElementById("pauseOverlay").classList.add("hidden");
    }
  },

  updateMatchHud(hud) {
    const set = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    set("hudHomeScore", hud.score[0]);
    set("hudAwayScore", hud.score[1]);
    set("hudClock", hud.time);
    set("hudHalf", hud.half === 1 ? "1º TEMPO" : "2º TEMPO");
    set("hudHomeName", hud.homeTeam.name);
    set("hudAwayName", hud.awayTeam.name);
    set("hudHomeStyle", this.matchEngine?.homeFormation || "4-3-3");
    set("hudAwayStyle", this.matchEngine?.awayFormation || "4-4-2");
    const homeBadge = document.getElementById("hudHomeBadge");
    const awayBadge = document.getElementById("hudAwayBadge");
    if (homeBadge) {
      homeBadge.textContent = hud.homeTeam.short;
      homeBadge.style.background = hud.homeTeam.primary;
      homeBadge.style.color = hud.homeTeam.secondary;
    }
    if (awayBadge) {
      awayBadge.textContent = hud.awayTeam.short;
      awayBadge.style.background = hud.awayTeam.primary;
      awayBadge.style.color = hud.awayTeam.secondary;
    }
    set("statPossessionHome", `${hud.possession}%`);
    set("statPossessionAway", `${100 - hud.possession}%`);
    const bar = document.getElementById("possessionBar");
    if (bar) bar.style.width = `${hud.possession}%`;
    const stats = hud.stats || {};
    set("statShots", `${stats.home?.shots || 0}-${stats.away?.shots || 0}`);
    set("statFouls", `${stats.home?.fouls || 0}-${stats.away?.fouls || 0}`);
    set("staminaLabel", `ENERGIA ${hud.stamina}`);
    const stamina = document.getElementById("staminaBar");
    if (stamina) stamina.style.width = `${hud.stamina}%`;
    const power = document.getElementById("powerBar");
    if (power) power.style.width = `${Math.round((hud.charge || 0) * 100)}%`;
    set("controlledName", hud.controlled ? `CONTROLE: ${hud.controlled}` : "CONTROLE: —");
    if (hud.commentary) set("commentaryText", hud.commentary);
    const message = document.getElementById("matchMessage");
    if (message) {
      if (hud.message) {
        message.innerHTML = `<strong>${escapeHTML(hud.message.title)}</strong><span>${escapeHTML(hud.message.subtitle || "")}</span>`;
        message.classList.remove("hidden", "home", "away", "info");
        message.classList.add(hud.message.tone || "info");
      } else {
        message.classList.add("hidden");
      }
    }
    const countdown = document.getElementById("countdown");
    if (hud.state === "countdown" && hud.countdown > 0) {
      countdown.textContent = String(Math.max(1, Math.ceil(hud.countdown)));
      countdown.classList.remove("hidden");
    } else {
      countdown.classList.add("hidden");
    }
  },

  showGoal(goal) {
    const overlay = document.getElementById("goalOverlay");
    document.getElementById("goalKicker").textContent = goal.penalty ? "PÊNALTI CONVERTIDO" : "GOLAÇO";
    document.getElementById("goalScorer").textContent = goal.scorer;
    document.getElementById("goalAssist").textContent = goal.assist ? `Assistência: ${goal.assist}` : goal.team;
    overlay.classList.remove("hidden");
    clearTimeout(this.goalTimer);
    this.goalTimer = setTimeout(() => overlay.classList.add("hidden"), 1750);
  },

  showHalftime(snapshot) {
    document.getElementById("goalOverlay").classList.add("hidden");
    document.getElementById("countdown").classList.add("hidden");
    document.getElementById("halfScore").textContent = `${snapshot.score[0]} : ${snapshot.score[1]}`;
    const stats = snapshot.stats;
    document.getElementById("halfStats").innerHTML = [
      ["Posse de bola", `${Math.round(stats.home.possession / Math.max(0.01, stats.home.possession + stats.away.possession) * 100)}%`, `${Math.round(stats.away.possession / Math.max(0.01, stats.home.possession + stats.away.possession) * 100)}%`],
      ["Finalizações", stats.home.shots, stats.away.shots],
      ["No gol", stats.home.onTarget, stats.away.onTarget],
      ["Faltas", stats.home.fouls, stats.away.fouls]
    ].map(([label, home, away]) => `<div class="half-stat"><b>${home}</b><span>${label}</span><b>${away}</b></div>`).join("");
    document.getElementById("halfOverlay").classList.remove("hidden");
  },

  handleMatchEnd(snapshot) {
    if (this.matchEnded) return;
    this.matchEnded = true;
    clearTimeout(this.goalTimer);
    this.hideMatchOverlays();
    const context = this.matchContext;
    const userSide = context.userSide || 0;
    const userGoals = userSide === 0 ? snapshot.score[0] : snapshot.score[1];
    const opponentGoals = userSide === 0 ? snapshot.score[1] : snapshot.score[0];
    const result = userGoals > opponentGoals ? "win" : userGoals === opponentGoals ? "draw" : "loss";
    const difficulty = DIFFICULTIES.find((item) => item.id === (context.options?.difficulty || this.matchEngine?.difficulty?.id)) || DIFFICULTIES[1];
    const base = result === "win" ? 380 : result === "draw" ? 190 : 95;
    const coins = Math.round((base + userGoals * 45 + (opponentGoals === 0 ? 60 : 0)) * (difficulty.reward || 1));
    const xp = Math.round((result === "win" ? 150 : result === "draw" ? 90 : 55) + userGoals * 24 + (opponentGoals === 0 ? 45 : 0));
    const rewards = { coins, xp };
    recordMatch(snapshot, { ...context, userSide }, rewards);

    save.lastMatch = {
      homeId: context.homeId,
      awayId: context.awayId,
      homeName: snapshot.homeTeam.name,
      awayName: snapshot.awayTeam.name,
      score: snapshot.score,
      competition: context.compName || "Amistoso",
      minute: snapshot.time
    };

    const today = new Date().toISOString().slice(0, 10);
    if (save.daily.date !== today) save.daily = { date: today, played: false };
    let dailyBonus = 0;
    if (!save.daily.played && result === "win" && userGoals - opponentGoals >= 2) {
      save.daily.played = true;
      dailyBonus = 450;
      addCoins(dailyBonus, true);
    }

    if (context.type === "competition" && save.competitions[context.compId]) {
      this.applyCompetitionResult(context, snapshot);
    } else if (context.type === "master") {
      this.applyMasterResult(snapshot);
    } else if (context.type === "star") {
      this.applyStarResult(snapshot);
    }

    persist();
    this.lastMatchResult = { snapshot, context, rewards: { ...rewards, daily: dailyBonus }, userSide, result };
    this.showFulltime(snapshot, context, { ...rewards, daily: dailyBonus });
    this.audio.post();
    this.updateTopbar();
  },

  applyCompetitionResult(context, snapshot) {
    const state = save.competitions[context.compId];
    if (!state || state.finished) return;
    const comp = COMPETITIONS.find((item) => item.id === context.compId);
    if (state.format === "cup") completeCupRound(state, snapshot.score);
    else completeLeagueRound(state, snapshot.score);
    if (state.finished && state.champion === state.teamId && !state.awarded) {
      state.awarded = true;
      awardTrophy(comp.id, `${comp.name} ${state.season}`);
      addCoins(comp.prize, true);
      toast(`Campeão! ${comp.name}. +${formatCoins(comp.prize)} moedas`);
    }
  },

  applyMasterResult(snapshot) {
    const master = save.master;
    if (!master || master.league.finished) return;
    const userHome = this.matchContext.homeId === master.teamId;
    const userGoals = userHome ? snapshot.score[0] : snapshot.score[1];
    const opponentGoals = userHome ? snapshot.score[1] : snapshot.score[0];
    completeLeagueRound(master.league, snapshot.score);
    master.wins = (master.wins || 0) + (userGoals > opponentGoals ? 1 : 0);
    master.goals = (master.goals || 0) + userGoals;
    master.form = master.form || [];
    master.form.push(userGoals > opponentGoals ? "V" : userGoals === opponentGoals ? "E" : "D");
    master.form = master.form.slice(-6);
    master.confidence = Math.max(5, Math.min(99, (master.confidence || 64) + (userGoals > opponentGoals ? 2 : userGoals === opponentGoals ? 0 : -2)));
    finalizeMasterSeason(this);
  },

  applyStarResult(snapshot) {
    const star = save.star;
    if (!star || star.league.finished) return;
    const userHome = this.matchContext.homeId === star.clubId;
    completeLeagueRound(star.league, snapshot.score);
    const career = snapshot.career;
    const goals = career ? career.goals : 0;
    const assists = career ? career.assists : 0;
    const rating = career ? career.rating : 6.2;
    this.updateStarStats(goals, assists, rating);
    finalizeStarSeason(this);
  },

  showFulltime(snapshot, context, rewards) {
    const resultLabel = this.lastMatchResult?.result === "win" ? "VITÓRIA" : this.lastMatchResult?.result === "draw" ? "EMPATE" : "DERROTA";
    document.getElementById("fulltimeScore").textContent = `${snapshot.score[0]} : ${snapshot.score[1]}`;
    document.getElementById("fulltimeTeams").innerHTML = `
      <div class="fulltime-team">${crest(snapshot.homeTeam, "sm")}<strong>${escapeHTML(snapshot.homeTeam.name)}</strong></div>
      <div class="fulltime-result">${resultLabel}</div>
      <div class="fulltime-team">${crest(snapshot.awayTeam, "sm")}<strong>${escapeHTML(snapshot.awayTeam.name)}</strong></div>`;
    const stats = snapshot.stats;
    document.getElementById("fulltimeStats").innerHTML = [
      ["Posse de bola", `${Math.round(stats.home.possession / Math.max(0.01, stats.home.possession + stats.away.possession) * 100)}%`, `${Math.round(stats.away.possession / Math.max(0.01, stats.home.possession + stats.away.possession) * 100)}%`],
      ["Finalizações", stats.home.shots, stats.away.shots],
      ["No gol", stats.home.onTarget, stats.away.onTarget],
      ["Faltas", stats.home.fouls, stats.away.fouls]
    ].map(([label, home, away]) => `<div class="half-stat"><b>${home}</b><span>${label}</span><b>${away}</b></div>`).join("");
    document.getElementById("rewardRow").innerHTML = `
      <span>${icon("coin")} +${formatCoins(rewards.coins)} moedas</span>
      <span>${icon("star")} +${rewards.xp} XP</span>
      ${rewards.daily ? `<span class="daily-reward">${icon("check")} Desafio diário +${rewards.daily}</span>` : ""}`;
    const labels = {
      competition: "Voltar à competição",
      master: "Voltar à carreira",
      star: "Voltar ao jogador",
      quick: "Voltar ao início"
    };
    document.getElementById("fulltimeBtn").textContent = labels[context.type] || "Continuar";
    document.getElementById("fulltimeOverlay").classList.remove("hidden");
  },

  continueAfterMatch() {
    const context = this.matchContext;
    const screen = context?.returnScreen || "home";
    if (context?.compId) this.state.compId = context.compId;
    this.exitMatch();
    this.navigate(screen);
  },

  hideMatchOverlays() {
    ["pauseOverlay", "halfOverlay", "goalOverlay", "fulltimeOverlay"].forEach((id) => document.getElementById(id)?.classList.add("hidden"));
    document.getElementById("replayBadge")?.classList.add("hidden");
    document.getElementById("countdown")?.classList.add("hidden");
  },

  pauseMatch() {
    if (!this.matchEngine) return;
    if (document.getElementById("modalRoot").classList.contains("hidden")) this.matchEngine.pause();
  },

  resumeMatch() {
    this.matchEngine?.resume();
  },

  cycleCamera() {
    if (!this.matchEngine) return;
    const current = this.matchEngine.cameraMode || "broadcast";
    const index = CAMERAS.findIndex((item) => item.id === current);
    const next = CAMERAS[(index + 1) % CAMERAS.length];
    this.matchEngine.setCamera(next.id);
    document.getElementById("cameraLabel").textContent = next.name;
    toast(`Câmera: ${next.name}`);
  },

  openTacticsModal() {
    const engine = this.matchEngine;
    if (!engine) return;
    const side = this.matchContext?.userSide || 0;
    const key = side === 0 ? "home" : "away";
    const team = side === 0 ? engine.homeTeam : engine.awayTeam;
    const starters = engine.players.filter((player) => player.side === side);
    const bench = engine.bench[key];
    const tactics = engine.tactics[key];
    const formation = side === 0 ? engine.homeFormation : engine.awayFormation;
    openModal(modalShell("Escalação e táticas", team.name, `
      <div class="tactics-layout">
        <div>
          <label class="field wide"><span>Formação</span><select id="matchFormation">${Object.keys(FORMATIONS).map((item) => `<option value="${item}" ${item === formation ? "selected" : ""}>${item} · ${FORMATIONS[item].name}</option>`).join("")}</select></label>
          <div class="tactic-sliders">
            ${[["mentality", "Postura ofensiva"], ["line", "Linha defensiva"], ["press", "Intensidade de pressão"]].map(([field, label]) => `
              <label class="setting-slider"><div><span>${label}</span><b>${Math.round(tactics[field] * 100)}%</b></div><input type="range" min="0" max="100" value="${Math.round(tactics[field] * 100)}" data-match-tactic="${field}"></label>`).join("")}
          </div>
          <div class="coach-quote">Substituições utilizadas: ${engine.substitutions[key]}/3</div>
        </div>
        <div>
          <div class="lineup-title">SUBSTITUIÇÃO</div>
          <label class="field wide"><span>Sai</span><select id="subOut">${starters.map((player) => `<option value="${player.id}">#${player.number} ${escapeHTML(player.shortName)} · ${player.role} · ${player.stamina ? Math.round(player.stamina) : 100}%</option>`).join("")}</select></label>
          <label class="field wide"><span>Entra</span><select id="subIn">${bench.map((player) => `<option value="${player.id}">#${player.number} ${escapeHTML(player.shortName)} · ${player.position} · ${player.overall}</option>`).join("")}</select></label>
          <button class="ghost-btn" style="width:100%;margin-top:7px" data-match-sub ${engine.substitutions[key] >= 3 || !bench.length ? "disabled" : ""}>${icon("transfer")} Confirmar substituição</button>
          <div class="lineup-title" style="margin-top:14px">BANCO</div>
          <div class="bench-list">
            ${bench.slice(0, 7).map((player) => `<div class="bench-row"><span>${player.position}</span><strong>${escapeHTML(player.shortName)}</strong><b>${player.overall}</b></div>`).join("") || '<span class="empty-mini">Sem jogadores no banco</span>'}
          </div>
        </div>
      </div>`,
    `<button class="primary-btn" data-close-modal>${icon("check")} Voltar ao jogo</button>`, true));

    document.getElementById("matchFormation")?.addEventListener("change", (event) => {
      engine.setFormation(side, event.target.value);
      toast(`Formação alterada para ${event.target.value}.`);
    });
    document.querySelectorAll("[data-match-tactic]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.matchTactic;
        engine.setTactics(side, { [field]: Number(input.value) / 100 });
        const label = input.parentElement.querySelector("b");
        if (label) label.textContent = `${input.value}%`;
      });
    });
    document.querySelector("[data-match-sub]")?.addEventListener("click", () => {
      const outId = document.getElementById("subOut").value;
      const inId = document.getElementById("subIn").value;
      const ok = engine.substitute(side, outId, inId);
      toast(ok ? "Substituição realizada." : "Não foi possível realizar a substituição.");
      if (ok) {
        closeModal();
        this.openTacticsModal();
      }
    });
  },

  forfeitMatch() {
    openModal(modalShell("Sair da partida?", "ATENÇÃO", `<p class="modal-text">A partida será encerrada imediatamente e o resultado atual será registrado.</p>`,
      `<button class="ghost-btn" data-close-modal>Continuar jogando</button><button class="primary-btn danger" data-forfeit-confirm>Encerrar partida</button>`));
    document.querySelector("[data-forfeit-confirm]")?.addEventListener("click", () => {
      closeModal();
      this.matchEngine?.endMatch();
    });
  },

  toggleMatchAudio() {
    const muted = audio.settings.master !== 0;
    audio.settings.master = muted ? 0 : 0.65;
    audio.applyVolumes();
    document.getElementById("matchAudioBtn")?.classList.toggle("muted", muted);
    toast(muted ? "Áudio silenciado." : "Áudio ativado.");
  },

  bindMatchInputs() {
    const joystick = document.getElementById("joystick");
    const knob = document.getElementById("joystickKnob");
    if (!joystick || joystick.dataset.bound) return;
    joystick.dataset.bound = "true";
    let pointerId = null;
    const update = (event) => {
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const radius = rect.width * 0.34;
      const distance = Math.hypot(dx, dy);
      const scale = distance > radius ? radius / distance : 1;
      const x = (dx * scale) / radius;
      const y = (dy * scale) / radius;
      knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
      this.matchEngine?.setJoystick(x, y);
    };
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      pointerId = event.pointerId;
      joystick.setPointerCapture(pointerId);
      joystick.classList.add("active");
      update(event);
    });
    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      update(event);
    });
    const release = (event) => {
      if (pointerId !== null && event.pointerId !== pointerId) return;
      pointerId = null;
      joystick.classList.remove("active");
      knob.style.transform = "translate(0, 0)";
      this.matchEngine?.setJoystick(0, 0);
    };
    joystick.addEventListener("pointerup", release);
    joystick.addEventListener("pointercancel", release);
    joystick.addEventListener("lostpointercapture", release);

    document.querySelectorAll(".action-btn").forEach((button) => {
      const action = button.dataset.action;
      const press = (event) => {
        event.preventDefault();
        button.classList.add("pressed");
        this.matchEngine?.pressAction(action, 0);
      };
      const releaseAction = (event) => {
        event.preventDefault();
        button.classList.remove("pressed");
        this.matchEngine?.releaseAction(action, 0);
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", releaseAction);
      button.addEventListener("pointercancel", releaseAction);
      button.addEventListener("pointerleave", (event) => {
        if (event.buttons === 0) return;
        releaseAction(event);
      });
    });
  },

  bindMotion() {
    if (this.motionBound) return;
    this.motionBound = true;
    window.addEventListener("deviceorientation", (event) => {
      if (!this.matchEngine || !save.settings.tilt) return;
      if (event.gamma == null || event.beta == null) return;
      if (!this.motionBase) this.motionBase = { gamma: event.gamma, beta: event.beta };
      const x = (event.gamma - this.motionBase.gamma) / 26;
      const y = (event.beta - this.motionBase.beta) / 26;
      this.matchEngine.setTilt(x, y);
    });
  },

  async requestMotionPermission() {
    save.settings.tilt = true;
    persist();
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const state = await DeviceOrientationEvent.requestPermission();
        if (state !== "granted") {
          save.settings.tilt = false;
          persist();
          toast("Permissão de movimento negada.");
          return;
        }
      }
      this.bindMotion();
      toast("Sensores de movimento ativados.");
    } catch {
      toast("Não foi possível ativar o sensor neste navegador.");
    }
  },

  exitMatch() {
    this.matchEngine?.destroy();
    this.matchEngine = null;
    this.matchContext = null;
    this.motionBase = null;
    document.getElementById("matchScreen").classList.add("hidden");
    document.body.classList.remove("match-active");
    this.hideMatchOverlays();
    document.querySelectorAll(".action-btn").forEach((button) => button.classList.remove("pressed"));
    audio.settings.master = 0.65;
    audio.applyVolumes();
  },

  showProfile() {
    const level = levelInfo();
    openModal(modalShell("Seu perfil", "JOGADOR", `
      <div class="profile-card-large">
        <div class="profile-avatar">${escapeHTML((save.profile.name || "T").slice(0, 1).toUpperCase())}</div>
        <div><strong>${escapeHTML(save.profile.name)}</strong><span>Nível ${level.level} · ${level.current}/${level.next} XP</span></div>
      </div>
      <div class="progress-track" style="margin:12px 0 16px"><i style="width:${level.progress}%"></i></div>
      <div class="career-stat-grid">
        <div><span>Partidas</span><b>${save.profile.matches}</b></div>
        <div><span>Vitórias</span><b>${save.profile.wins}</b></div>
        <div><span>Empates</span><b>${save.profile.draws}</b></div>
        <div><span>Derrotas</span><b>${save.profile.losses}</b></div>
        <div><span>Gols</span><b>${save.profile.goals}</b></div>
        <div><span>Troféus</span><b>${Object.values(save.profile.trophies).reduce((sum, value) => sum + value, 0)}</b></div>
      </div>
      <div class="profile-favorite">
        <span>CLUBE FAVORITO</span>
        ${crest(getTeam(save.favoriteTeam), "sm")}
        <strong>${escapeHTML(getTeam(save.favoriteTeam).name)}</strong>
      </div>`,
    `<button class="ghost-btn" data-close-modal>Fechar</button><button class="primary-btn" data-go="settings">${icon("settings")} Configurações</button>`));
  }
};

initializeData();
if (!save.stats.training) save.stats.training = { finishing: 0, penalties: 0, reflex: 0, sessions: 0 };
save.edits.newPlayers = save.edits.newPlayers || [];
if (!save.daily) save.daily = { date: "", played: false };
audio.setSettings(save.settings);

const favorite = getTeam(save.favoriteTeam);
const favoriteLeague = getLeague(favorite.leagueId);
const rival = favoriteLeague.teams.find((team) => team.id !== favorite.id && team.overall >= favorite.overall - 2) || favoriteLeague.teams.find((team) => team.id !== favorite.id) || favoriteLeague.teams[1];
app.quick = {
  homeId: favorite.id,
  awayId: rival.id,
  filter: favorite.leagueId,
  matchMinutes: save.settings.matchMinutes,
  difficulty: save.settings.difficulty,
  weather: save.settings.weather,
  stadium: stadiumForTeam(favorite).id,
  camera: save.settings.camera,
  controlMode: "single",
  narration: save.settings.narration,
  replay: save.settings.replay,
  tilt: save.settings.tilt
};

const boot = document.getElementById("boot");
let bootDismissed = false;
const dismissBoot = () => {
  if (bootDismissed) return;
  bootDismissed = true;
  boot?.classList.add("done");
};
boot?.addEventListener("click", dismissBoot);
setTimeout(dismissBoot, 1500);

document.addEventListener("click", (event) => {
  const go = event.target.closest("[data-go]");
  if (go) {
    event.preventDefault();
    audio.click();
    go.closest(".sidebar")?.classList.remove("open");
    app.navigate(go.dataset.go);
    return;
  }
  if (event.target.closest("[data-close-modal]")) {
    closeModal();
    audio.back();
    return;
  }
  if (event.target.id === "modalRoot" && event.target.dataset.closable !== "false") {
    closeModal();
  }
  const avatar = event.target.closest("#settingsBtn");
  if (avatar) app.navigate("settings");
  const profile = event.target.closest("#profileBtn");
  if (profile) {
    audio.click();
    app.showProfile();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const modal = document.getElementById("modalRoot");
  if (modal && !modal.classList.contains("hidden")) {
    event.preventDefault();
    event.stopPropagation();
    closeModal();
  }
}, true);

document.getElementById("menuToggle")?.addEventListener("click", () => {
  audio.click();
  document.getElementById("sidebar").classList.toggle("open");
});

document.addEventListener("pointerdown", function unlockAudio() {
  audio.ensure();
  document.removeEventListener("pointerdown", unlockAudio);
}, { once: true });

document.getElementById("pauseBtn")?.addEventListener("click", () => app.pauseMatch());
document.getElementById("resumeBtn")?.addEventListener("click", () => app.resumeMatch());
document.getElementById("tacticsBtn")?.addEventListener("click", () => app.openTacticsModal());
document.getElementById("cameraBtn")?.addEventListener("click", () => app.cycleCamera());
document.getElementById("forfeitBtn")?.addEventListener("click", () => app.forfeitMatch());
document.getElementById("secondHalfBtn")?.addEventListener("click", () => {
  document.getElementById("halfOverlay").classList.add("hidden");
  app.matchEngine?.beginSecondHalf();
});
document.getElementById("halfSubBtn")?.addEventListener("click", () => app.openTacticsModal());
document.getElementById("skipReplayBtn")?.addEventListener("click", () => {
  document.getElementById("goalOverlay").classList.add("hidden");
  app.matchEngine?.skipReplay();
});
document.getElementById("fulltimeBtn")?.addEventListener("click", () => app.continueAfterMatch());
document.getElementById("matchAudioBtn")?.addEventListener("click", () => app.toggleMatchAudio());

const ticker = document.getElementById("newsTicker");
let newsIndex = 0;
if (ticker) {
  setInterval(() => {
    newsIndex = (newsIndex + 1) % NEWS.length;
    ticker.textContent = NEWS[newsIndex];
  }, 6000);
}

window.addEventListener("beforeunload", () => {
  app.matchEngine?.destroy();
  audio.musicStop();
});

app.render();
