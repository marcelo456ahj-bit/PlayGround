import { LEAGUES, NEWS, getTeam, getLeague, STADIUMS, CAMERAS, DIFFICULTIES, WEATHERS, COMPETITIONS } from "./data.js";
import { save } from "./store.js";
import { crest, escapeHTML, formatCoins, icon, stadiumForTeam, weatherIcon } from "./ui.js";

const topTeams = () =>
  LEAGUES.filter((league) => league.id !== "selecoes")
    .flatMap((league) => league.teams)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 5);

const rivalFor = (team) => {
  const league = getLeague(team.leagueId);
  const rivals = league.teams.filter((item) => item.id !== team.id).sort((a, b) => b.overall - a.overall);
  return rivals[0] || league.teams[1];
};

const careerCard = () => {
  if (save.master) {
    const master = save.master;
    const team = getTeam(master.teamId);
    const fixture = master.league ? master.league.rounds[master.league.roundIndex]?.matches.find((match) => !match.played && (match.home === team.id || match.away === team.id)) : null;
    return `
      <button class="tile" data-go="master">
        <span class="tile-badge hot">CONTINUAR</span>
        <span class="tile-icon">${icon("master")}</span>
        <span class="tile-copy"><strong>Master League</strong><small>${escapeHTML(team.name)} · ${fixture ? "próxima rodada" : "central do clube"}</small></span>
      </button>`;
  }
  return `
    <button class="tile" data-go="master">
      <span class="tile-badge">CARREIRA</span>
      <span class="tile-icon">${icon("master")}</span>
      <span class="tile-copy"><strong>Master League</strong><small>Assuma um clube e construa um império</small></span>
    </button>`;
};

const starCard = () => {
  if (save.star) {
    return `
      <button class="tile" data-go="star">
        <span class="tile-badge hot">${save.star.overall} GERAL</span>
        <span class="tile-icon">${icon("star")}</span>
        <span class="tile-copy"><strong>Rumo ao Estrelato</strong><small>${escapeHTML(save.star.name)} · ${escapeHTML(getTeam(save.star.clubId).name)}</small></span>
      </button>`;
  }
  return `
    <button class="tile" data-go="star">
      <span class="tile-badge">NOVO</span>
      <span class="tile-icon">${icon("star")}</span>
      <span class="tile-copy"><strong>Rumo ao Estrelato</strong><small>Crie seu jogador e conquiste o mundo</small></span>
    </button>`;
};

export const renderHome = (app) => {
  const favorite = getTeam(save.favoriteTeam);
  const rival = app.state.featuredAway || rivalFor(favorite);
  const stadium = stadiumForTeam(favorite);
  const teams = topTeams();
  const last = save.lastMatch;
  const season = 2027;
  const news = NEWS.slice(0, 4);
  return `
    <div class="screen">
      <div class="hero">
        <div class="hero-bg"></div>
        <div class="hero-art">
          <div class="hero-pitch"></div>
          <div class="stick"></div>
          <div class="ball"></div>
        </div>
        <div class="hero-content">
          <div class="hero-kicker"><i></i> TEMPORADA ${season} · FUTEBOL SEM LIMITES</div>
          <h1 class="hero-title">PES 2027<br><em>STICKMAN 2D</em></h1>
          <p class="hero-desc">Ligas, copas, carreira e rivalidade. Controle cada passe, cada drible e cada finalização na experiência de futebol mais completa do seu dispositivo.</p>
          <div class="hero-teams">
            <div class="hero-team">${crest(favorite)}<span>${escapeHTML(favorite.name)}</span></div>
            <div class="hero-vs">VS</div>
            <div class="hero-team">${crest(rival)}<span>${escapeHTML(rival.name)}</span></div>
          </div>
          <div class="hero-actions">
            <button class="primary-btn" data-go="quick">${icon("play")} Jogar agora</button>
            <button class="ghost-btn" data-go="competitions">${icon("trophy")} Competições</button>
          </div>
          <div class="hero-meta">
            <span><i></i> ${escapeHTML(stadium.name)}</span>
            <span><i></i> ${save.settings.matchMinutes} MIN</span>
            <span><i></i> ${escapeHTML(DIFFICULTIES.find((item) => item.id === save.settings.difficulty)?.name || "Profissional")}</span>
          </div>
        </div>
      </div>

      <div class="section-row">
        <div class="section-title">Central de comando</div>
        <button class="section-link" data-go="extras">Ver tudo ${icon("arrow")}</button>
      </div>

      <div class="menu-grid">
        <button class="tile" data-go="quick">
          <span class="tile-badge">RÁPIDO</span>
          <span class="tile-icon">${icon("play")}</span>
          <span class="tile-copy"><strong>Partida rápida</strong><small>Escolha os times e entre em campo</small></span>
        </button>
        <button class="tile" data-go="competitions">
          <span class="tile-badge">10 TORNEIOS</span>
          <span class="tile-icon">${icon("trophy")}</span>
          <span class="tile-copy"><strong>Competições</strong><small>Brasileirão, Champions, Libertadores</small></span>
        </button>
        ${careerCard()}
        ${starCard()}
        <button class="tile" data-go="transfers">
          <span class="tile-badge">MERCADO</span>
          <span class="tile-icon">${icon("transfer")}</span>
          <span class="tile-copy"><strong>Transferências</strong><small>Negocie craques e monte seu elenco</small></span>
        </button>
        <button class="tile" data-go="editor">
          <span class="tile-badge">CRIATIVO</span>
          <span class="tile-icon">${icon("edit")}</span>
          <span class="tile-copy"><strong>Editor completo</strong><small>Times, jogadores, uniformes e escudos</small></span>
        </button>
        <button class="tile" data-go="training">
          <span class="tile-badge">EVOLUA</span>
          <span class="tile-icon">${icon("training")}</span>
          <span class="tile-copy"><strong>Centro de treinos</strong><small>Finalização, pênaltis e reflexos</small></span>
        </button>
        <button class="tile" data-go="multiplayer">
          <span class="tile-badge">LOCAL</span>
          <span class="tile-icon">${icon("users")}</span>
          <span class="tile-copy"><strong>Multijogador</strong><small>Desafie um amigo no mesmo aparelho</small></span>
        </button>
      </div>

      <div class="dashboard-grid" style="margin-top:16px">
        <div class="panel">
          <div class="panel-head">
            <h3>Giro do futebol</h3>
            <button class="section-link" data-go="competitions">Notícias</button>
          </div>
          <div class="panel-body news-list">
            ${news.map((item, index) => `
              <div class="news-item">
                <span class="news-index">0${index + 1}</span>
                <div class="news-copy">${escapeHTML(item)}<span>PES News · há ${index + 1}h</span></div>
              </div>`).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h3>Elite mundial</h3>
            <span class="eyebrow">RANKING</span>
          </div>
          <div class="panel-body top-teams">
            ${teams.map((team, index) => `
              <div class="top-team">
                <span>${String(index + 1).padStart(2, "0")}</span>
                ${crest(team, "sm")}
                <strong>${escapeHTML(team.name)}</strong>
                <em>${team.overall}</em>
              </div>`).join("")}
          </div>
        </div>
      </div>

      ${last ? `
      <div class="section-row"><div class="section-title">Último resultado</div><button class="section-link" data-go="quick">Revanche ${icon("arrow")}</button></div>
      <div class="panel" style="padding:13px 15px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        ${crest(getTeam(last.homeId), "sm")}
        <strong style="font-family:var(--display);font-size:14px">${escapeHTML(last.homeName)}</strong>
        <span style="font-family:var(--display);font-size:22px;color:var(--lime);letter-spacing:2px">${last.score[0]} : ${last.score[1]}</span>
        <strong style="font-family:var(--display);font-size:14px">${escapeHTML(last.awayName)}</strong>
        ${crest(getTeam(last.awayId), "sm")}
        <span style="margin-left:auto;font-size:8px;color:var(--muted)">${escapeHTML(last.competition || "Amistoso")} · ${last.minute}</span>
      </div>` : ""}
    </div>
  `;
};

const leagueTabs = (active) => LEAGUES.map((league) => `
  <button class="league-tab ${active === league.id ? "active" : ""}" data-quick-league="${league.id}">${escapeHTML(league.short)}</button>
`).join("");

const quickTeamCard = (team, active) => `
  <button class="team-card ${active ? "active" : ""}" data-quick-team="${team.id}">
    ${crest(team)}
    <strong>${escapeHTML(team.name)}</strong>
    <span><small>${escapeHTML(team.short)}</small><b>${team.overall}</b></span>
  </button>
`;

const buildOptions = (app) => {
  const quick = app.quick;
  return `
    <div class="option-block">
      <label>Duração <span>minutos por partida</span></label>
      <div class="segmented" style="--cols:4">
        ${[4, 6, 8, 10].map((minutes) => `<button class="${quick.matchMinutes === minutes ? "active" : ""}" data-quick-opt="matchMinutes" data-value="${minutes}">${minutes} MIN</button>`).join("")}
      </div>
    </div>
    <div class="option-block">
      <label>Dificuldade</label>
      <div class="select-wrap">
        <select data-quick-select="difficulty">
          ${DIFFICULTIES.map((item) => `<option value="${item.id}" ${quick.difficulty === item.id ? "selected" : ""}>${item.name}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="option-block">
      <label>Clima</label>
      <div class="segmented" style="--cols:5">
        ${WEATHERS.map((weather) => `<button class="${quick.weather === weather.id ? "active" : ""}" title="${weather.name}" data-quick-opt="weather" data-value="${weather.id}">${weatherIcon(weather.id)}</button>`).join("")}
      </div>
    </div>
    <div class="option-block">
      <label>Estádio</label>
      <div class="select-wrap">
        <select data-quick-select="stadium">
          ${STADIUMS.map((stadium) => `<option value="${stadium.id}" ${quick.stadium === stadium.id ? "selected" : ""}>${stadium.name} · ${stadium.city}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="option-block">
      <label>Câmera</label>
      <div class="select-wrap">
        <select data-quick-select="camera">
          ${CAMERAS.map((camera) => `<option value="${camera.id}" ${quick.camera === camera.id ? "selected" : ""}>${camera.name}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="option-block">
      <label>Modo de jogo</label>
      <div class="segmented" style="--cols:2">
        <button class="${quick.controlMode === "single" ? "active" : ""}" data-quick-opt="controlMode" data-value="single">1 JOGADOR</button>
        <button class="${quick.controlMode === "local" ? "active" : ""}" data-quick-opt="controlMode" data-value="local">2 JOGADORES</button>
      </div>
    </div>
    <div class="option-block" style="margin-bottom:0">
      <div class="toggle-row">
        <div class="toggle-copy"><strong>Narração PT-BR</strong><small>Comentários e locução de lances</small></div>
        <button class="switch ${quick.narration ? "on" : ""}" data-quick-toggle="narration" aria-label="Narração"></button>
      </div>
      <div class="toggle-row">
        <div class="toggle-copy"><strong>Replay automático</strong><small>Reveja os gols em slow motion</small></div>
        <button class="switch ${quick.replay ? "on" : ""}" data-quick-toggle="replay" aria-label="Replay"></button>
      </div>
      <div class="toggle-row">
        <div class="toggle-copy"><strong>Inclinação do aparelho</strong><small>Controle auxiliar por acelerômetro</small></div>
        <button class="switch ${quick.tilt ? "on" : ""}" data-quick-toggle="tilt" aria-label="Inclinação"></button>
      </div>
    </div>
  `;
};

export const renderQuick = (app) => {
  const quick = app.quick;
  const league = getLeague(quick.filter || getTeam(quick.homeId).leagueId);
  const teams = league.teams;
  const home = getTeam(quick.homeId);
  const away = getTeam(quick.awayId);
  const stadium = STADIUMS.find((item) => item.id === quick.stadium) || stadiumForTeam(home);
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">AMISTOSO / PARTIDA RÁPIDA</span>
          <h1 class="screen-title">Entre em campo</h1>
          <p class="screen-sub">Escolha seu clube, defina o adversário e ajuste a experiência. Tudo pronto para o apito inicial.</p>
        </div>
        <div class="head-actions">
          <button class="ghost-btn small-btn" data-quick-random>${icon("ball")} Aleatório</button>
          <button class="ghost-btn small-btn" data-quick-swap>${icon("transfer")} Trocar lados</button>
        </div>
      </div>

      <div class="setup-grid">
        <div>
          <div class="filter-row">
            <div class="league-tabs">${leagueTabs(league.id)}</div>
          </div>
          <div class="panel" style="padding:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">
              <strong style="font-family:var(--display);font-size:13px;letter-spacing:0.7px;text-transform:uppercase">Escolha seu time · ${escapeHTML(league.name)}</strong>
              <span style="font-size:8px;color:var(--muted)">${teams.length} clubes</span>
            </div>
            <div class="team-grid" style="margin-top:0">
              ${teams.map((team) => quickTeamCard(team, team.id === home.id)).join("")}
            </div>
          </div>
          <div class="panel" style="margin-top:10px;padding:14px 16px">
            <div class="section-title" style="font-size:13px;margin-bottom:12px">Opções da partida</div>
            <div class="editor-fields" style="grid-template-columns:1fr 1fr">
              ${buildOptions(app)}
            </div>
          </div>
        </div>

        <aside class="matchup-card">
          <span class="eyebrow">PRÉVIA DO CONFRONTO</span>
          <div class="matchup-row">
            <div class="matchup-team">
              ${crest(home, "lg")}
              <strong>${escapeHTML(home.name)}</strong>
              <span>${escapeHTML(home.city)}</span>
            </div>
            <div class="matchup-vs">VS</div>
            <div class="matchup-team">
              ${crest(away, "lg")}
              <strong>${escapeHTML(away.name)}</strong>
              <span>${escapeHTML(away.city)}</span>
            </div>
          </div>
          <div class="matchup-meta">
            <div><span>Estádio</span><b>${escapeHTML(stadium.name)}</b></div>
            <div><span>Clima</span><b>${escapeHTML(WEATHERS.find((item) => item.id === quick.weather)?.name || "Céu limpo")}</b></div>
            <div><span>Dificuldade</span><b>${escapeHTML(DIFFICULTIES.find((item) => item.id === quick.difficulty)?.name || "Profissional")}</b></div>
            <div><span>Controle</span><b>${quick.controlMode === "local" ? "2 jogadores locais" : "CPU / 1 jogador"}</b></div>
          </div>
          <button class="ghost-btn" style="width:100%;margin-top:10px" data-quick-opponent>${icon("users")} Trocar adversário</button>
          <button class="primary-btn" data-quick-start>${icon("play")} Iniciar partida</button>
          <div style="text-align:center;font-size:7px;color:var(--muted-2);margin-top:8px;letter-spacing:0.8px">JOYSTICK VIRTUAL · TOQUE E ARRASTE</div>
        </aside>
      </div>
    </div>
  `;
};

export const bindQuick = (app) => {
  const view = document.getElementById("view");
  view.querySelectorAll("[data-quick-league]").forEach((button) => {
    button.addEventListener("click", () => {
      app.audio.click();
      app.quick.filter = button.dataset.quickLeague;
      const league = getLeague(app.quick.filter);
      if (!league.teams.some((team) => team.id === app.quick.homeId)) {
        app.quick.homeId = league.teams[0].id;
        app.quick.awayId = league.teams[1].id;
        app.quick.stadium = stadiumForTeam(league.teams[0]).id;
      }
      app.render();
    });
  });
  view.querySelectorAll("[data-quick-team]").forEach((button) => {
    button.addEventListener("click", () => {
      app.audio.click();
      const teamId = button.dataset.quickTeam;
      if (app.quick.awayId === teamId) app.quick.awayId = app.quick.homeId;
      app.quick.homeId = teamId;
      app.quick.stadium = stadiumForTeam(getTeam(teamId)).id;
      app.render();
    });
  });
  view.querySelectorAll("[data-quick-opt]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.quickOpt;
      const raw = button.dataset.value;
      const value = key === "matchMinutes" ? Number(raw) : raw;
      app.quick[key] = value;
      app.audio.click();
      app.render();
    });
  });
  view.querySelectorAll("[data-quick-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.quickToggle;
      app.quick[key] = !app.quick[key];
      app.audio.click();
      if (key === "tilt" && app.quick.tilt) app.requestMotionPermission();
      app.render();
    });
  });
  view.querySelectorAll("[data-quick-select]").forEach((select) => {
    select.addEventListener("change", () => {
      app.quick[select.dataset.quickSelect] = select.value;
      app.audio.click();
      app.render();
    });
  });
  view.querySelector("[data-quick-random]")?.addEventListener("click", () => {
    app.audio.click();
    const league = getLeague(app.quick.filter || getTeam(app.quick.homeId).leagueId);
    const pool = [...league.teams].sort(() => Math.random() - 0.5);
    app.quick.homeId = pool[0].id;
    app.quick.awayId = pool[1].id;
    app.quick.stadium = stadiumForTeam(pool[0]).id;
    app.render();
  });
  view.querySelector("[data-quick-swap]")?.addEventListener("click", () => {
    app.audio.click();
    [app.quick.homeId, app.quick.awayId] = [app.quick.awayId, app.quick.homeId];
    app.quick.stadium = stadiumForTeam(getTeam(app.quick.homeId)).id;
    app.render();
  });
  view.querySelector("[data-quick-opponent]")?.addEventListener("click", () => {
    app.audio.click();
    app.openTeamPicker({
      title: "Escolher adversário",
      pool: LEAGUES.flatMap((league) => league.teams),
      selectedId: app.quick.awayId,
      excludeId: app.quick.homeId,
      onPick: (team) => {
        app.quick.awayId = team.id;
        app.render();
      }
    });
  });
  view.querySelector("[data-quick-start]")?.addEventListener("click", () => {
    app.audio.whistle(false);
    const home = getTeam(app.quick.homeId);
    const away = getTeam(app.quick.awayId);
    app.showPreMatch(home.id, away.id, { type: "quick", returnScreen: "home" }, {
      matchMinutes: app.quick.matchMinutes,
      difficulty: app.quick.difficulty,
      weather: app.quick.weather,
      stadium: app.quick.stadium,
      camera: app.quick.camera,
      controlMode: app.quick.controlMode,
      narration: app.quick.narration,
      replay: app.quick.replay,
      tilt: app.quick.tilt,
      competition: "Amistoso"
    });
  });
};

export const renderMultiplayer = (app) => {
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">LOCAL / MESMO APARELHO</span>
          <h1 class="screen-title">Multijogador</h1>
          <p class="screen-sub">Desafie um amigo no sofá. O jogador 1 usa o joystick virtual; o jogador 2 utiliza o teclado.</p>
        </div>
      </div>
      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-head"><h3>Como jogar em dupla</h3><span class="eyebrow">LOCAL</span></div>
          <div class="panel-body">
            <div class="objective-list">
              <div class="objective"><span class="check">${icon("check")}</span><div><strong>Jogador 1 · Time da casa</strong><small>Joystick virtual + botões na tela</small></div><em>TOUCH</em></div>
              <div class="objective"><span class="check">${icon("check")}</span><div><strong>Jogador 2 · Time visitante</strong><small>Setas para mover · , passe · . chute · / correr · ; carrinho</small></div><em>TECLADO</em></div>
              <div class="objective"><span class="check">${icon("check")}</span><div><strong>Partida com 2 controles</strong><small>Selecione o modo 2 JOGADORES na configuração da partida</small></div><em>1x1</em></div>
            </div>
            <div class="spacer-16"></div>
            <button class="primary-btn" data-multi-start>${icon("play")} Montar partida local</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Controles do jogador 2</h3><span class="eyebrow">TECLADO</span></div>
          <div class="panel-body">
            <div class="stat-bars">
              <div class="stat-bar-row"><span style="text-align:left">Mover</span><div class="stat-bar-track"><i style="width:100%"></i></div><span>SETAS</span></div>
              <div class="stat-bar-row"><span style="text-align:left">Passe</span><div class="stat-bar-track"><i style="width:80%"></i></div><span>VÍRGULA</span></div>
              <div class="stat-bar-row"><span style="text-align:left">Chute</span><div class="stat-bar-track"><i style="width:65%"></i></div><span>PONTO</span></div>
              <div class="stat-bar-row"><span style="text-align:left">Correr</span><div class="stat-bar-track"><i style="width:55%"></i></div><span>BARRA</span></div>
              <div class="stat-bar-row"><span style="text-align:left">Carrinho</span><div class="stat-bar-track"><i style="width:45%"></i></div><span>PONTO E VÍRGULA</span></div>
            </div>
            <div class="spacer-16"></div>
            <div class="coach-quote">Dica: no modo local, cada jogador controla o atleta mais próximo da bola do seu próprio time.</div>
          </div>
        </div>
      </div>
      <div class="section-row"><div class="section-title">Clássicos rápidos</div></div>
      <div class="menu-grid">
        ${[["brasileirao-fla", "brasileirao-pal"], ["premier-ars", "premier-liv"], ["laliga-rma", "laliga-bar"], ["seriea-int", "seriea-mil"]].map(([a, b]) => `
          <button class="tile" data-multi-classic="${a}|${b}">
            <span class="tile-icon">${icon("users")}</span>
            <span class="tile-copy"><strong>${escapeHTML(getTeam(a).name)} vs ${escapeHTML(getTeam(b).name)}</strong><small>Iniciar duelo local</small></span>
          </button>`).join("")}
      </div>
    </div>
  `;
};

export const bindMultiplayer = (app) => {
  document.querySelector("[data-multi-start]")?.addEventListener("click", () => {
    app.quick.controlMode = "local";
    app.navigate("quick");
  });
  document.querySelectorAll("[data-multi-classic]").forEach((button) => {
    button.addEventListener("click", () => {
      const [homeId, awayId] = button.dataset.multiClassic.split("|");
      app.showPreMatch(homeId, awayId, { type: "quick", returnScreen: "home" }, {
        ...app.quickOptions(),
        controlMode: "local",
        competition: "Duelo local"
      });
    });
  });
};
