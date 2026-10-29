import { COMPETITIONS, FORMATIONS, LEAGUES, getTeam } from "./data.js";
import { save, persist, awardTrophy, addCoins, addXp, applyStarPresence } from "./store.js";
import {
  createCompetitionState,
  currentRound,
  currentUserFixture,
  leaguePosition,
  standingsTable,
  competitionChampion,
  simulateLeagueRound
} from "./competition-engine.js";
import { crest, escapeHTML, formatCoins, formatMoney, icon, modalShell, openModal, closeModal, toast } from "./ui.js";

const leagueCompFor = (team) => {
  const map = {
    brasileirao: "BRASILEIRAO",
    premier: "PREMIER",
    laliga: "LALIGA",
    seriea: "SERIEA",
    bundesliga: "BUNDESLIGA",
    ligue1: "LIGUE1"
  };
  return COMPETITIONS.find((comp) => comp.id === map[team.leagueId]) || COMPETITIONS[0];
};

const startBudget = (team) => team.overall >= 88 ? 118000000 : team.overall >= 84 ? 82000000 : team.overall >= 79 ? 56000000 : 34000000;

const positionTarget = (team) => team.overall >= 87 ? 1 : team.overall >= 84 ? 3 : team.overall >= 80 ? 5 : 8;

const masterObjectiveDefs = (master) => {
  const target = master.objectives.position;
  return [
    { id: "position", label: `Terminar entre os ${target} primeiros`, target, progress: master.seasonEnd ? master.seasonEnd.position : leaguePosition(master.league, master.teamId), money: 2500 },
    { id: "wins", label: `Vencer ${master.objectives.wins} partidas`, target: master.objectives.wins, progress: master.wins || 0, money: 1800 },
    { id: "goals", label: `Marcar ${master.objectives.goals} gols`, target: master.objectives.goals, progress: master.goals || 0, money: 1500 }
  ];
};

const miniTable = (state, userTeamId, limit) => {
  const rows = standingsTable(state);
  let list = rows.slice(0, limit || 6);
  if (!list.some((row) => row.teamId === userTeamId)) {
    const user = rows.find((row) => row.teamId === userTeamId);
    if (user) list = [...list, user];
  }
  return `
    <div class="mini-table">
      ${list.map((row) => `
        <div class="mini-row ${row.teamId === userTeamId ? "user" : ""}">
          <span>${row.position}</span>
          ${crest(row.team, "xs")}
          <strong>${escapeHTML(row.team.short)}</strong>
          <em>${row.pts} pts</em>
        </div>`).join("")}
    </div>`;
};

const nextFixtureCard = (state, dataAttrs, label) => {
  const fixture = currentUserFixture(state);
  if (!fixture) {
    return `
      <div class="next-fixture" style="text-align:center">
        <span class="eyebrow">${escapeHTML(label || "PRÓXIMO JOGO")}</span>
        <h2 style="font-family:var(--display);font-size:20px;margin:10px 0">Rodada concluída</h2>
        <p style="font-size:9px;color:var(--muted);margin-bottom:14px">Avance para a próxima rodada ou simule a competição.</p>
      </div>`;
  }
  const home = getTeam(fixture.home);
  const away = getTeam(fixture.away);
  return `
    <div class="next-fixture">
      <span class="eyebrow">${escapeHTML(label || "PRÓXIMO JOGO")} · ${escapeHTML(currentRound(state)?.name || `${state.roundIndex + 1}ª RODADA`)}</span>
      <div class="next-fixture-row">
        <div class="next-team">${crest(home, "md")}<strong>${escapeHTML(home.name)}</strong></div>
        <div class="next-vs">VS<small>${escapeHTML(home.stadium)}</small></div>
        <div class="next-team">${crest(away, "md")}<strong>${escapeHTML(away.name)}</strong></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="primary-btn" ${dataAttrs.play}>${icon("play")} Jogar partida</button>
        <button class="ghost-btn" ${dataAttrs.sim}>${icon("calendar")} Simular rodada</button>
      </div>
    </div>`;
};

export const renderMaster = (app) => {
  if (!save.master) return renderMasterIntro(app);
  const master = save.master;
  const team = getTeam(master.teamId);
  const comp = COMPETITIONS.find((item) => item.id === master.league.compId);
  const position = leaguePosition(master.league, team.id);
  const objectives = masterObjectiveDefs(master);
  const topSquad = [...team.squad].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const seasonDone = Boolean(master.seasonEnd);
  const confidence = Math.max(8, Math.min(99, master.confidence || 64));
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">MODO CARREIRA / TEMPORADA ${master.season}</span>
          <h1 class="screen-title">Master League</h1>
          <p class="screen-sub">${escapeHTML(team.name)} · ${escapeHTML(comp.name)} · ${master.league.rounds.length - master.league.roundIndex} rodadas restantes</p>
        </div>
        <div class="head-actions">
          <div class="coin-chip">${icon("coin")} ${formatMoney(master.budget)}</div>
          <div class="club-mini">${crest(team, "sm")}<div><span>SEU CLUBE</span><b>${escapeHTML(team.name)}</b></div></div>
        </div>
      </div>

      ${seasonDone ? renderMasterSeasonEnd(master, team, comp) : nextFixtureCard(master.league, {
        play: 'data-master-play',
        sim: 'data-master-sim'
      }, "PRÓXIMO COMPROMISSO")}

      <div class="career-layout">
        <div>
          <div class="panel">
            <div class="panel-head"><h3>${escapeHTML(comp.name)}</h3><span class="eyebrow">${position}º LUGAR</span></div>
            <div class="panel-body">${miniTable(master.league, team.id, 7)}</div>
            <div class="panel-foot" style="display:flex;gap:8px">
              <button class="ghost-btn small-btn" style="flex:1" data-master-table>${icon("chart")} Classificação completa</button>
              ${!seasonDone ? `<button class="ghost-btn small-btn" data-master-season-sim>Simular temporada</button>` : ""}
            </div>
          </div>

          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Objetivos da diretoria</h3><span class="eyebrow">${seasonDone ? "AVALIAÇÃO" : "EM ANDAMENTO"}</span></div>
            <div class="panel-body">
              <div class="objective-list">
                ${objectives.map((objective) => {
                  const done = seasonDone ? (objective.id === "position" ? master.seasonEnd.position <= objective.target : objective.id === "wins" ? master.wins >= objective.target : master.goals >= objective.target) : false;
                  const value = Math.min(100, Math.round((objective.progress / objective.target) * 100));
                  return `
                    <div class="objective ${done ? "done" : ""}">
                      <span class="check">${icon(done ? "check" : "trophy")}</span>
                      <div><strong>${escapeHTML(objective.label)}</strong><small>${objective.progress} de ${objective.target}</small><div class="progress-track" style="margin-top:5px"><i style="width:${Math.max(4, value)}%"></i></div></div>
                      <em>+${formatCoins(objective.money)}</em>
                    </div>`;
                }).join("")}
              </div>
            </div>
          </div>

          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Elenco principal</h3><button class="section-link" data-go="transfers">Mercado ${icon("arrow")}</button></div>
            <div class="panel-body">
              <div class="squad-list">
                ${topSquad.map((player) => `
                  <div class="squad-row">
                    <span class="shirt-no">${player.number}</span>
                    <div><strong>${escapeHTML(player.name)}</strong><small>${player.position} · ${player.age} anos</small></div>
                    <span class="ovr">${player.overall}</span>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div class="panel">
            <div class="panel-head"><h3>Clube</h3><span class="eyebrow">GESTÃO</span></div>
            <div class="panel-body">
              <div class="club-badge-card">${crest(team, "lg")}<strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.stadium)} · ${escapeHTML(team.city)}</span></div>
              <div class="meter-block">
                <div class="meter-label"><span>Confiança da diretoria</span><b>${confidence}%</b></div>
                <div class="meter-track"><i style="width:${confidence}%"></i></div>
              </div>
              <div class="career-stat-grid">
                <div><span>Temporada</span><b>${master.season}</b></div>
                <div><span>Posição</span><b>${position}º</b></div>
                <div><span>Vitórias</span><b>${master.wins || 0}</b></div>
                <div><span>Gols</span><b>${master.goals || 0}</b></div>
              </div>
              <div class="spacer-16"></div>
              <button class="primary-btn" style="width:100%" data-go="transfers">${icon("transfer")} Contratar jogadores</button>
              <button class="ghost-btn" style="width:100%;margin-top:7px" data-master-formations>${icon("settings")} Ajustar formação</button>
              <button class="ghost-btn" style="width:100%;margin-top:7px" data-go="training">${icon("training")} Centro de treinos</button>
            </div>
          </div>
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Últimos resultados</h3></div>
            <div class="panel-body">
              <div class="form-strip">
                ${(master.form || []).slice(-5).map((item) => `<span class="${item === "V" ? "win" : item === "E" ? "draw" : "loss"}">${item}</span>`).join("") || '<span class="empty-form">Sem jogos</span>'}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
};

const renderMasterIntro = () => `
  <div class="screen">
    <div class="career-hero master-hero">
      <div class="career-hero-copy">
        <span class="eyebrow">MODO CARREIRA / MASTER LEAGUE</span>
        <h1 class="screen-title" style="font-size:42px">Construa um<br><em>império.</em></h1>
        <p class="screen-sub">Assuma um clube, gerencie o orçamento, contrate craques e conduza sua equipe ao topo do futebol mundial.</p>
        <div class="career-hero-actions">
          <button class="primary-btn" data-master-start>${icon("master")} Iniciar carreira</button>
          <button class="ghost-btn" data-go="competitions">${icon("trophy")} Ver competições</button>
        </div>
        <div class="career-points">
          <span>${icon("check")} Transferências e orçamento</span>
          <span>${icon("check")} Objetivos da diretoria</span>
          <span>${icon("check")} Temporadas ilimitadas</span>
          <span>${icon("check")} Troféus e reputação</span>
        </div>
      </div>
      <div class="career-hero-art">
        <div class="big-trophy">${icon("trophy")}</div>
        <span class="ghost-word">MASTER</span>
      </div>
    </div>
    <div class="menu-grid" style="margin-top:16px">
      <div class="tile"><span class="tile-icon">${icon("transfer")}</span><span class="tile-copy"><strong>Mercado vivo</strong><small>Contrate jogadores com o orçamento do clube</small></span></div>
      <div class="tile"><span class="tile-icon">${icon("chart")}</span><span class="tile-copy"><strong>Objetivos</strong><small>Cumpra metas e ganhe confiança</small></span></div>
      <div class="tile"><span class="tile-icon">${icon("trophy")}</span><span class="tile-copy"><strong>Legado</strong><small>Acumule títulos em várias temporadas</small></span></div>
      <div class="tile"><span class="tile-icon">${icon("training")}</span><span class="tile-copy"><strong>Evolução</strong><small>Treine e evolua o elenco</small></span></div>
    </div>
  </div>
`;

const renderMasterSeasonEnd = (master, team, comp) => {
  const end = master.seasonEnd;
  const champion = end.championId ? getTeam(end.championId) : null;
  const objectives = masterObjectiveDefs(master);
  return `
    <div class="season-banner">
      <div class="season-copy">
        <span class="eyebrow">FIM DA TEMPORADA ${master.season}</span>
        <h2>${end.position === 1 ? "Campeão!" : `${end.position}º lugar`}</h2>
        <p>${escapeHTML(team.name)} terminou ${escapeHTML(comp.name)} em ${end.position}º lugar. ${champion ? `O título ficou com ${escapeHTML(champion.name)}.` : ""}</p>
        <div class="season-objectives">
          ${objectives.map((objective) => {
            const done = objective.id === "position" ? end.position <= objective.target : objective.id === "wins" ? end.wins >= objective.target : end.goals >= objective.target;
            return `<span class="${done ? "done" : "fail"}">${icon(done ? "check" : "close")} ${escapeHTML(objective.label)}</span>`;
          }).join("")}
        </div>
      </div>
      <div class="season-prize">
        <span>PREMIAÇÃO RECEBIDA</span>
        <b>+${formatCoins(end.coins)}</b>
        <small>moedas · orçamento +${formatMoney(end.budgetBonus)}</small>
        <button class="primary-btn" style="margin-top:14px" data-master-new-season>${icon("calendar")} Iniciar temporada ${master.season + 1}</button>
      </div>
    </div>`;
};

export const bindMaster = (app) => {
  const view = document.getElementById("view");
  view.querySelector("[data-master-start]")?.addEventListener("click", () => {
    app.audio.click();
    app.openTeamPicker({
      title: "Escolha seu clube",
      eyebrow: "MASTER LEAGUE",
      pool: LEAGUES.filter((league) => !["libertadores", "mundo", "selecoes"].includes(league.id)).flatMap((league) => league.teams),
      selectedId: save.favoriteTeam,
      onPick: (team) => app.confirmMasterStart(team)
    });
  });
  view.querySelector("[data-master-play]")?.addEventListener("click", () => {
    const master = save.master;
    const fixture = currentUserFixture(master.league);
    if (!fixture) return;
    app.showPreMatch(fixture.home, fixture.away, {
      type: "master",
      returnScreen: "master",
      userTeamId: master.teamId,
      compId: master.league.compId,
      compName: COMPETITIONS.find((item) => item.id === master.league.compId)?.name
    }, { ...app.quickOptions(), stadium: getTeam(master.teamId).stadium ? app.quick.stadium : app.quick.stadium, competition: "Master League" });
  });
  view.querySelector("[data-master-sim]")?.addEventListener("click", () => app.simulateMasterRound());
  view.querySelector("[data-master-season-sim]")?.addEventListener("click", () => app.simulateMasterSeason());
  view.querySelector("[data-master-new-season]")?.addEventListener("click", () => app.startNextMasterSeason());
  view.querySelector("[data-master-table]")?.addEventListener("click", () => app.showFullTable(save.master.league));
  view.querySelector("[data-master-formations]")?.addEventListener("click", () => app.openFormationModal());
};

const starPositions = [
  ["ATA", "Atacante"], ["PD", "Ponta direita"], ["PE", "Ponta esquerda"],
  ["MEI", "Meia atacante"], ["MC", "Meio-campista"], ["VOL", "Volante"],
  ["LD", "Lateral direito"], ["LE", "Lateral esquerdo"], ["ZAG", "Zagueiro"], ["GOL", "Goleiro"]
];

const starStats = (position) => {
  const base = {
    ATA: { pace: 66, shot: 68, pass: 58, dribble: 64, defense: 34, physical: 61 },
    PD: { pace: 72, shot: 62, pass: 61, dribble: 70, defense: 36, physical: 56 },
    PE: { pace: 72, shot: 62, pass: 61, dribble: 70, defense: 36, physical: 56 },
    MEI: { pace: 63, shot: 59, pass: 70, dribble: 66, defense: 46, physical: 57 },
    MC: { pace: 60, shot: 54, pass: 68, dribble: 61, defense: 55, physical: 60 },
    VOL: { pace: 56, shot: 47, pass: 62, dribble: 54, defense: 67, physical: 66 },
    LD: { pace: 67, shot: 43, pass: 58, dribble: 58, defense: 63, physical: 61 },
    LE: { pace: 67, shot: 43, pass: 58, dribble: 58, defense: 63, physical: 61 },
    ZAG: { pace: 53, shot: 36, pass: 52, dribble: 46, defense: 70, physical: 70 },
    GOL: { pace: 48, shot: 26, pass: 48, dribble: 38, defense: 72, physical: 65 }
  };
  return base[position] || base.ATA;
};

const starPotential = (club) => 88 + (club.overall >= 84 ? 5 : club.overall >= 80 ? 3 : 1);

export const renderStar = (app) => {
  if (!save.star) return renderStarIntro(app);
  const star = save.star;
  const club = getTeam(star.clubId);
  const comp = COMPETITIONS.find((item) => item.id === star.league.compId);
  const position = leaguePosition(star.league, club.id);
  const nextFixture = currentUserFixture(star.league);
  const rating = star.appearances ? (star.ratingTotal / star.appearances).toFixed(2).replace(".", ",") : "6,00";
  const progress = Math.round(((star.overall - 60) / Math.max(1, star.potential - 60)) * 100);
  const seasonDone = Boolean(star.seasonEnd);
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">RUMO AO ESTRELATO / TEMPORADA ${star.season}</span>
          <h1 class="screen-title">Sua jornada</h1>
          <p class="screen-sub">${escapeHTML(star.name)} · ${escapeHTML(club.name)} · ${escapeHTML(comp.name)}</p>
        </div>
        <div class="head-actions">
          <div class="coin-chip">${icon("star")} ${star.overall} GERAL</div>
          <div class="club-mini">${crest(club, "sm")}<div><span>SEU CLUBE</span><b>${escapeHTML(club.name)}</b></div></div>
        </div>
      </div>

      ${seasonDone ? renderStarSeasonEnd(star, club, comp) : `
        <div class="star-banner">
          <div class="star-player-card">
            <div class="star-avatar">${escapeHTML(star.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase())}<small>${star.number}</small></div>
            <div class="star-player-info">
              <span class="eyebrow">${escapeHTML(star.position)} · ${star.age} ANOS</span>
              <h2>${escapeHTML(star.name)}</h2>
              <div class="star-rating-row"><b>${star.overall}</b><span>OVERALL</span><em>Potencial ${star.potential}</em></div>
              <div class="meter-track" style="margin-top:7px"><i style="width:${Math.min(100, progress)}%"></i></div>
            </div>
          </div>
          <div class="star-season-stats">
            <div><span>Jogos</span><b>${star.appearances}</b></div>
            <div><span>Gols</span><b>${star.seasonGoals || star.goals}</b></div>
            <div><span>Assist.</span><b>${star.seasonAssists || star.assists}</b></div>
            <div><span>Nota média</span><b>${rating}</b></div>
            <div><span>Posição</span><b>${position}º</b></div>
            <div><span>Salário</span><b>${formatCoins(star.contract?.wage || 0)}</b></div>
          </div>
        </div>
      `}

      <div class="career-layout">
        <div>
          ${!seasonDone ? nextFixtureCard(star.league, { play: 'data-star-play', sim: 'data-star-sim' }, "PRÓXIMO JOGO") : ""}
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>${escapeHTML(comp.name)}</h3><span class="eyebrow">${position}º LUGAR</span></div>
            <div class="panel-body">${miniTable(star.league, club.id, 7)}</div>
            <div class="panel-foot" style="display:flex;gap:8px">
              <button class="ghost-btn small-btn" style="flex:1" data-star-table>${icon("chart")} Classificação completa</button>
              ${!seasonDone ? `<button class="ghost-btn small-btn" data-star-sim-season>Simular temporada</button>` : ""}
            </div>
          </div>
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Atributos do jogador</h3><span class="eyebrow">EVOLUÇÃO</span></div>
            <div class="panel-body">
              <div class="attribute-grid">
                ${[["Ritmo", star.player.pace], ["Finalização", star.player.shot], ["Passe", star.player.pass], ["Drible", star.player.dribble], ["Defesa", star.player.defense], ["Físico", star.player.physical]].map(([label, value]) => `
                  <div class="attribute"><span>${label}</span><div class="meter-track"><i style="width:${value}%"></i></div><b>${value}</b></div>`).join("")}
              </div>
            </div>
          </div>
        </div>
        <aside>
          <div class="panel">
            <div class="panel-head"><h3>Carreira</h3><span class="eyebrow">PERFIL</span></div>
            <div class="panel-body">
              <div class="career-stat-grid">
                <div><span>Temporada</span><b>${star.season}</b></div>
                <div><span>Clube</span><b>${escapeHTML(club.short)}</b></div>
                <div><span>XP</span><b>${formatCoins(star.xp || 0)}</b></div>
                <div><span>Nível</span><b>${Math.floor((star.xp || 0) / 1000) + 1}</b></div>
              </div>
              <div class="spacer-16"></div>
              <button class="primary-btn" style="width:100%" data-go="training">${icon("training")} Treinar e evoluir</button>
              <button class="ghost-btn" style="width:100%;margin-top:7px" data-go="transfers">${icon("transfer")} Ver mercado</button>
            </div>
          </div>
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Propostas</h3><span class="eyebrow">${(star.offers || []).length}</span></div>
            <div class="panel-body">
              ${(star.offers || []).length ? star.offers.map((offer) => {
                const offerClub = getTeam(offer.clubId);
                return `<div class="offer-row">${crest(offerClub, "xs")}<div><strong>${escapeHTML(offerClub.name)}</strong><small>${formatMoney(offer.wage)} / temporada</small></div><button class="mini-btn" data-star-accept="${offer.clubId}">Aceitar</button></div>`;
              }).join("") : `<div class="empty-mini">${icon("transfer")}<span>Sem propostas no momento</span></div>`}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
};

const renderStarIntro = () => `
  <div class="screen">
    <div class="career-hero star-hero">
      <div class="career-hero-copy">
        <span class="eyebrow">MODO CARREIRA / RUMO AO ESTRELATO</span>
        <h1 class="screen-title" style="font-size:42px">De promessa a<br><em>lenda.</em></h1>
        <p class="screen-sub">Crie seu jogador, escolha o clube dos sonhos e escreva uma história única no futebol. Gols, assistências e atuações abrem portas para os gigantes.</p>
        <div class="career-hero-actions">
          <button class="primary-btn" data-star-create>${icon("star")} Criar jogador</button>
          <button class="ghost-btn" data-go="training">${icon("training")} Ver treinos</button>
        </div>
        <div class="career-points">
          <span>${icon("check")} Atributos personalizados</span>
          <span>${icon("check")} Evolução por desempenho</span>
          <span>${icon("check")} Propostas de clubes</span>
          <span>${icon("check")} Carreira temporada a temporada</span>
        </div>
      </div>
      <div class="career-hero-art">
        <div class="star-burst">${icon("star")}</div>
        <span class="ghost-word">ESTRELATO</span>
      </div>
    </div>
  </div>
`;

const renderStarSeasonEnd = (star, club, comp) => {
  const end = star.seasonEnd;
  return `
    <div class="season-banner star-season-banner">
      <div class="season-copy">
        <span class="eyebrow">FIM DA TEMPORADA ${star.season}</span>
        <h2>${end.championId === club.id ? "Campeão!" : `${end.position}º lugar`}</h2>
        <p>${escapeHTML(star.name)} encerrou a temporada com ${end.goals} gols, ${end.assists} assistências e nota média ${String(end.rating).replace(".", ",")}.</p>
        <div class="season-objectives">
          <span class="done">${icon("check")} ${end.appearances} jogos disputados</span>
          <span class="done">${icon("check")} ${escapeHTML(comp.name)}</span>
          <span class="${end.offers > 0 ? "done" : "fail"}">${icon(end.offers > 0 ? "check" : "close")} ${end.offers} propostas recebidas</span>
        </div>
      </div>
      <div class="season-prize">
        <span>EVOLUÇÃO</span>
        <b>${star.overall} OVR</b>
        <small>Potencial ${star.potential}</small>
        <button class="primary-btn" style="margin-top:14px" data-star-new-season>${icon("calendar")} Nova temporada</button>
      </div>
    </div>`;
};

export const bindStar = (app) => {
  const view = document.getElementById("view");
  view.querySelector("[data-star-create]")?.addEventListener("click", () => openCreateStar(app));
  view.querySelector("[data-star-play]")?.addEventListener("click", () => {
    const star = save.star;
    const fixture = currentUserFixture(star.league);
    if (!fixture) return;
    app.showPreMatch(fixture.home, fixture.away, {
      type: "star",
      returnScreen: "star",
      userTeamId: star.clubId,
      compId: star.league.compId,
      compName: COMPETITIONS.find((item) => item.id === star.league.compId)?.name
    }, { ...app.quickOptions(), competition: "Rumo ao Estrelato" });
  });
  view.querySelector("[data-star-sim]")?.addEventListener("click", () => app.simulateStarRound());
  view.querySelector("[data-star-sim-season]")?.addEventListener("click", () => app.simulateStarSeason());
  view.querySelector("[data-star-table]")?.addEventListener("click", () => app.showFullTable(save.star.league));
  view.querySelector("[data-star-new-season]")?.addEventListener("click", () => app.startNextStarSeason());
  view.querySelectorAll("[data-star-accept]").forEach((button) => {
    button.addEventListener("click", () => app.acceptStarOffer(button.dataset.starAccept));
  });
};

const openCreateStar = (app) => {
  const clubOptions = LEAGUES.filter((league) => ["brasileirao", "premier", "laliga", "seriea", "bundesliga", "ligue1"].includes(league.id))
    .map((league) => `<optgroup label="${escapeHTML(league.name)}">${league.teams.map((team) => `<option value="${team.id}" ${team.id === save.favoriteTeam ? "selected" : ""}>${escapeHTML(team.name)} · ${team.overall}</option>`).join("")}</optgroup>`).join("");
  openModal(modalShell("Crie seu jogador", "RUMO AO ESTRELATO", `
    <div class="create-star-layout">
      <div class="create-star-form">
        <div class="form-grid">
          <label class="field wide"><span>Nome do jogador</span><input id="starName" maxlength="22" placeholder="Ex.: Gabriel Silva" value=""></label>
          <label class="field"><span>Posição</span><select id="starPosition">${starPositions.map(([value, label]) => `<option value="${value}">${label} · ${value}</option>`).join("")}</select></label>
          <label class="field"><span>Camisa</span><input id="starNumber" type="number" min="1" max="99" value="10"></label>
          <label class="field"><span>Idade</span><input id="starAge" type="number" min="16" max="21" value="18"></label>
          <label class="field wide"><span>Clube inicial</span><select id="starClub">${clubOptions}</select></label>
        </div>
        <div class="coach-quote" style="margin-top:12px">Cada partida rende XP. Quanto melhor sua nota, mais rápido você evolui rumo ao potencial máximo.</div>
      </div>
      <div class="create-star-preview">
        <div class="star-avatar large" id="starPreview">GS<small>10</small></div>
        <strong id="starPreviewName">Seu craque</strong>
        <span>ATA · 18 anos · 64 OVR</span>
        <div class="potential-chip">Potencial 90</div>
      </div>
    </div>`,
  `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn" data-star-create-confirm>${icon("star")} Começar carreira</button>`));

  const nameInput = document.getElementById("starName");
  const numberInput = document.getElementById("starNumber");
  const positionSelect = document.getElementById("starPosition");
  const ageInput = document.getElementById("starAge");
  const preview = document.getElementById("starPreview");
  const previewName = document.getElementById("starPreviewName");
  const refresh = () => {
    const name = nameInput.value.trim() || "Seu craque";
    const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
    preview.firstChild.textContent = initials;
    preview.querySelector("small").textContent = numberInput.value || "10";
    previewName.textContent = name;
  };
  [nameInput, numberInput].forEach((input) => input.addEventListener("input", refresh));
  positionSelect.addEventListener("change", refresh);
  document.querySelector("[data-star-create-confirm]")?.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (name.length < 3) {
      toast("Digite um nome com pelo menos 3 caracteres.");
      nameInput.focus();
      return;
    }
    app.createStar({
      name,
      position: positionSelect.value,
      number: Math.max(1, Math.min(99, Number(numberInput.value) || 10)),
      age: Math.max(16, Math.min(21, Number(ageInput.value) || 18)),
      clubId: document.getElementById("starClub").value
    });
    closeModal();
  });
};

export const createStarState = (form) => {
  const club = getTeam(form.clubId);
  const stats = starStats(form.position);
  const id = `star-${Date.now()}`;
  const potential = starPotential(club);
  const player = {
    id,
    name: form.name,
    shortName: form.name.split(" ").slice(-1)[0].slice(0, 10),
    number: form.number,
    position: form.position,
    overall: 64,
    potential,
    age: form.age,
    foot: "Direito",
    nationality: "Brasil",
    ...stats
  };
  const comp = leagueCompFor(club);
  save.star = {
    id,
    name: form.name,
    position: form.position,
    number: form.number,
    age: form.age,
    clubId: club.id,
    overall: 64,
    potential,
    xp: 0,
    appearances: 0,
    goals: 0,
    assists: 0,
    ratingTotal: 0,
    seasonGoals: 0,
    seasonAssists: 0,
    season: 2027,
    league: createCompetitionState(comp, club.id, 2027),
    contract: { wage: 18000, years: 3 },
    offers: [],
    seasonEnd: null,
    history: [],
    player
  };
  applyStarPresence();
  persist();
  return save.star;
};

export const finalizeMasterSeason = (app) => {
  const master = save.master;
  if (!master || !master.league.finished || master.seasonEnd) return;
  const comp = COMPETITIONS.find((item) => item.id === master.league.compId);
  const position = leaguePosition(master.league, master.teamId);
  const champion = competitionChampion(master.league);
  const objectives = masterObjectiveDefs(master);
  let coins = 0;
  const results = objectives.map((objective) => {
    const done = objective.id === "position" ? position <= objective.target : objective.id === "wins" ? (master.wins || 0) >= objective.target : (master.goals || 0) >= objective.target;
    if (done) coins += objective.money;
    return { ...objective, done };
  });
  const titleBonus = position === 1 ? 6000 : position <= 4 ? 2200 : 500;
  coins += titleBonus;
  const budgetBonus = position === 1 ? 42000000 : position <= 4 ? 26000000 : position <= 8 ? 15000000 : 8000000;
  master.budget = (master.budget || 0) + budgetBonus;
  master.confidence = Math.max(10, Math.min(99, (master.confidence || 64) + (position <= 4 ? 9 : position <= 8 ? 2 : -8)));
  master.seasonEnd = {
    position,
    championId: champion ? champion.id : null,
    coins,
    budgetBonus,
    objectives: results,
    wins: master.wins || 0,
    goals: master.goals || 0
  };
  master.history = master.history || [];
  master.history.push({ season: master.season, position, champion: champion ? champion.id : null, coins });
  addCoins(coins, true);
  if (champion && champion.id === master.teamId) {
    awardTrophy(comp.id, `${comp.name} · Master League`);
    app.audio.success();
    toast(`Campeão da ${comp.name}! +${formatCoins(coins)} moedas`);
  } else {
    app.audio.coin();
    toast(`Temporada encerrada em ${position}º lugar. +${formatCoins(coins)} moedas`);
  }
  persist();
};

export const finalizeStarSeason = (app) => {
  const star = save.star;
  if (!star || !star.league.finished || star.seasonEnd) return;
  const club = getTeam(star.clubId);
  const comp = COMPETITIONS.find((item) => item.id === star.league.compId);
  const position = leaguePosition(star.league, club.id);
  const champion = competitionChampion(star.league);
  const rating = star.appearances ? Number((star.ratingTotal / star.appearances).toFixed(2)) : 6;
  const offers = [];
  if (star.overall >= 72 || star.seasonGoals >= 12) {
    const allClubs = LEAGUES.filter((league) => ["brasileirao", "premier", "laliga", "seriea", "bundesliga", "ligue1"].includes(league.id))
      .flatMap((league) => league.teams)
      .filter((team) => team.id !== club.id && team.overall > club.overall)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 4);
    allClubs.slice(0, star.overall >= 80 ? 3 : 2).forEach((team) => offers.push({
      clubId: team.id,
      wage: Math.round((star.overall - 55) * 2600 + 12000),
      prestige: team.overall
    }));
  }
  star.offers = offers;
  star.seasonEnd = {
    position,
    championId: champion ? champion.id : null,
    goals: star.seasonGoals || 0,
    assists: star.seasonAssists || 0,
    rating,
    appearances: star.appearances || 0,
    offers: offers.length
  };
  star.history = star.history || [];
  star.history.push({ season: star.season, clubId: star.clubId, goals: star.seasonGoals || 0, assists: star.seasonAssists || 0, rating });
  const reward = Math.round(1200 + (star.seasonGoals || 0) * 90 + (star.seasonAssists || 0) * 55 + (position === 1 ? 4000 : 0));
  addCoins(reward, true);
  addXp(700 + (star.seasonGoals || 0) * 20);
  star.xp = (star.xp || 0) + 700 + (star.seasonGoals || 0) * 20;
  if (champion && champion.id === club.id) awardTrophy(comp.id, `${comp.name} · Rumo ao Estrelato`);
  persist();
  toast(`Temporada encerrada. ${offers.length} propostas recebidas.`);
};

export const newMasterSeason = (app) => {
  const master = save.master;
  if (!master) return;
  const comp = COMPETITIONS.find((item) => item.id === master.league.compId);
  master.season += 1;
  master.league = createCompetitionState(comp, master.teamId, master.season);
  master.seasonEnd = null;
  master.wins = 0;
  master.goals = 0;
  master.form = [];
  master.objectives = { position: positionTarget(getTeam(master.teamId)), wins: 8, goals: 24 };
  persist();
  app.audio.success();
  toast(`Temporada ${master.season} iniciada.`);
  app.render();
};

export const newStarSeason = (app) => {
  const star = save.star;
  if (!star) return;
  const club = getTeam(star.clubId);
  const comp = leagueCompFor(club);
  star.season += 1;
  star.age += 1;
  star.player.age = star.age;
  star.league = createCompetitionState(comp, club.id, star.season);
  star.seasonEnd = null;
  star.offers = [];
  star.seasonGoals = 0;
  star.seasonAssists = 0;
  star.appearances = 0;
  star.ratingTotal = 0;
  persist();
  app.audio.success();
  toast(`Temporada ${star.season} iniciada.`);
  app.render();
};

export const acceptStarOffer = (app, clubId) => {
  const star = save.star;
  if (!star) return;
  const oldClub = getTeam(star.clubId);
  const newClub = getTeam(clubId);
  const offer = (star.offers || []).find((item) => item.clubId === clubId) || { wage: 24000 };
  oldClub.squad = oldClub.squad.filter((player) => player.id !== star.player.id);
  newClub.squad.push({ ...star.player, overall: star.overall, age: star.age });
  star.clubId = newClub.id;
  star.contract = { wage: offer.wage, years: 3 };
  const comp = leagueCompFor(newClub);
  star.league = createCompetitionState(comp, newClub.id, star.season);
  star.offers = [];
  star.seasonEnd = null;
  persist();
  app.audio.success();
  toast(`Transferência concluída: ${newClub.name}!`);
  app.render();
};
