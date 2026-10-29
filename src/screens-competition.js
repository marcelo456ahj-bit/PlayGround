import { COMPETITIONS, getTeam } from "./data.js";
import { save, persist, awardTrophy, addCoins } from "./store.js";
import {
  competitionPool,
  currentRound,
  currentUserFixture,
  leaguePosition,
  standingsTable,
  competitionChampion,
  userIsEliminated,
  simulateLeagueRound,
  simulateCupRound
} from "./competition-engine.js";
import { crest, escapeHTML, formatCoins, icon, modalShell, openModal, closeModal, toast } from "./ui.js";

const formatName = (state) => state.format === "cup" ? "Mata-mata" : "Pontos corridos";

const compCard = (comp, state, index) => {
  const champion = state && state.finished ? competitionChampion(state) : null;
  const position = state && state.format === "league" ? leaguePosition(state, state.teamId) : null;
  const roundLabel = state && !state.finished ? (state.format === "cup" ? currentRound(state)?.name : `${state.roundIndex + 1}ª rodada`) : null;
  return `
    <article class="comp-card" style="--comp:${comp.color};--comp2:${comp.accent}">
      <div class="comp-card-top">
        <span class="comp-index">0${index + 1}</span>
        <span class="comp-badge">${formatName(state || comp)}</span>
      </div>
      <div class="comp-art">
        <div class="comp-trophy">${icon("trophy")}</div>
        <span class="comp-initial">${escapeHTML(comp.name.slice(0, 2).toUpperCase())}</span>
      </div>
      <div class="comp-copy">
        <span class="eyebrow">${state ? `TEMPORADA ${state.season}` : "NOVO TORNEIO"}</span>
        <h3>${escapeHTML(comp.name)}</h3>
        <p>${escapeHTML(comp.description)}</p>
      </div>
      <div class="comp-meta">
        <span><b>${competitionPool(comp).length}</b> equipes</span>
        <span><b>${formatCoins(comp.prize)}</b> moedas</span>
      </div>
      ${state ? `
        <div class="comp-progress">
          <div class="comp-progress-copy">
            <span>${champion ? `Campeão: ${escapeHTML(champion.short)}` : escapeHTML(roundLabel || "Concluído")}</span>
            <b>${champion ? "FIM" : `${Math.min(100, Math.round((state.roundIndex / Math.max(1, state.rounds.length)) * 100))}%`}</b>
          </div>
          <div class="progress-track"><i style="width:${champion ? 100 : Math.min(100, Math.round((state.roundIndex / Math.max(1, state.rounds.length)) * 100))}%"></i></div>
        </div>` : ""}
      <div class="comp-actions">
        ${state
          ? `<button class="primary-btn small-btn" data-comp-continue="${comp.id}">${champion ? "Ver resultado" : "Continuar"} ${icon("arrow")}</button>`
          : `<button class="primary-btn small-btn" data-comp-open="${comp.id}">Começar torneio ${icon("arrow")}</button>`}
        ${position ? `<span class="comp-pos">${position}º lugar</span>` : ""}
      </div>
    </article>
  `;
};

export const renderCompetitions = (app) => {
  const active = Object.keys(save.competitions).length;
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">TORNEIOS OFICIAIS / TEMPORADA 2027</span>
          <h1 class="screen-title">Competições</h1>
          <p class="screen-sub">Levante troféus em ligas nacionais, copas continentais e no maior torneio de seleções do planeta.</p>
        </div>
        <div class="head-actions">
          <div class="coin-chip">${icon("trophy")} ${active} ${active === 1 ? "torneio ativo" : "torneios ativos"}</div>
        </div>
      </div>
      <div class="comp-grid">
        ${COMPETITIONS.map((comp, index) => compCard(comp, save.competitions[comp.id], index)).join("")}
      </div>
    </div>
  `;
};

const bracketRound = (round, teamId) => `
  <div class="bracket-round">
    <div class="bracket-round-title">${escapeHTML(round.name)}</div>
    ${round.matches.map((match, index) => {
      const home = getTeam(match.home);
      const away = getTeam(match.away);
      return `
        <div class="bracket-match ${match.played ? "played" : ""}">
          <span class="bracket-no">${index + 1}</span>
          <div class="bracket-team ${match.winner === home.id ? "winner" : ""} ${home.id === teamId ? "user" : ""}">
            ${crest(home, "xs")}<span>${escapeHTML(home.short)}</span><b>${match.score ? match.score[0] : "-"}</b>
          </div>
          <div class="bracket-team ${match.winner === away.id ? "winner" : ""} ${away.id === teamId ? "user" : ""}">
            ${crest(away, "xs")}<span>${escapeHTML(away.short)}</span><b>${match.score ? match.score[1] : "-"}</b>
          </div>
          ${match.pens ? `<span class="bracket-pens">pên. ${match.pens[0]}-${match.pens[1]}</span>` : ""}
        </div>`;
    }).join("")}
  </div>
`;

const tableRows = (state) => {
  const rows = standingsTable(state);
  return rows.map((row) => `
    <tr class="${row.teamId === state.teamId ? "user-row" : ""}">
      <td class="pos">${row.position}</td>
      <td><div class="table-team">${crest(row.team, "xs")}<strong>${escapeHTML(row.team.name)}</strong></div></td>
      <td>${row.p}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td>
      <td>${row.gf}</td><td>${row.ga}</td><td>${row.gd > 0 ? `+${row.gd}` : row.gd}</td>
      <td class="pts">${row.pts}</td>
      <td><div class="form-dots">${row.form.slice(-3).map((item) => `<i class="${item === "V" ? "win" : item === "E" ? "draw" : "loss"}">${item}</i>`).join("") || "-"}</div></td>
    </tr>`).join("");
};

const roundFixtures = (state) => {
  const round = currentRound(state);
  if (!round) return "";
  return `
    <div class="fixture-list">
      ${round.matches.map((match) => {
        const home = getTeam(match.home);
        const away = getTeam(match.away);
        const isUser = match.home === state.teamId || match.away === state.teamId;
        return `
          <div class="fixture ${isUser ? "user-fixture" : ""}">
            <div class="fixture-team home"><span>${escapeHTML(home.short)}</span>${crest(home, "xs")}</div>
            <div class="fixture-score">${match.played ? `${match.score[0]} - ${match.score[1]}` : "VS"}</div>
            <div class="fixture-team away">${crest(away, "xs")}<span>${escapeHTML(away.short)}</span></div>
            ${match.played ? `<span class="fixture-done">${icon("check")}</span>` : ""}
          </div>`;
      }).join("")}
    </div>`;
};

const finalize = (app, comp, state) => {
  if (!state.finished || state.champion !== state.teamId || state.awarded) return;
  state.awarded = true;
  awardTrophy(comp.id, `${comp.name} ${state.season}`);
  addCoins(comp.prize, true);
  persist();
  app.audio.success();
  toast(`Campeão! ${comp.name} conquistada. +${formatCoins(comp.prize)} moedas`);
};

export const renderCompetitionHub = (app) => {
  const comp = COMPETITIONS.find((item) => item.id === app.state.compId) || COMPETITIONS[0];
  const state = save.competitions[comp.id];
  if (!state) {
    app.state.compId = null;
    app.screen = "competitions";
    app.render();
    return "";
  }
  finalize(app, comp, state);
  const team = getTeam(state.teamId);
  const champion = competitionChampion(state);
  const fixture = currentUserFixture(state);
  const round = currentRound(state);
  const position = state.format === "league" ? leaguePosition(state, state.teamId) : null;
  const eliminated = userIsEliminated(state);
  const nextHome = fixture ? getTeam(fixture.home) : null;
  const nextAway = fixture ? getTeam(fixture.away) : null;
  return `
    <div class="screen">
      <div class="screen-head" style="--comp:${comp.color}">
        <div class="screen-head-copy">
          <button class="back-link" data-go="competitions">${icon("arrow")} Todas as competições</button>
          <span class="eyebrow" style="margin-top:10px">${escapeHTML(comp.name)} / TEMPORADA ${state.season}</span>
          <h1 class="screen-title">${escapeHTML(comp.name)}</h1>
          <p class="screen-sub">${escapeHTML(comp.description)}</p>
        </div>
        <div class="head-actions">
          <div class="club-mini">${crest(team, "sm")}<div><span>SEU CLUBE</span><b>${escapeHTML(team.name)}</b></div></div>
          ${position ? `<div class="coin-chip">${position}º LUGAR</div>` : ""}
        </div>
      </div>

      ${state.finished ? `
        <div class="trophy-banner">
          <div class="trophy-glow">${icon("trophy")}</div>
          <div>
            <span class="eyebrow">TORNEIO ENCERRADO</span>
            <h2>${escapeHTML(champion ? champion.name : "Sem campeão")}</h2>
            <p>${champion && champion.id === state.teamId ? `Parabéns! Você conquistou ${comp.name}.` : `O troféu ficou com ${escapeHTML(champion ? champion.name : "outra equipe")}.`}</p>
          </div>
          <div class="trophy-prize"><span>PREMIAÇÃO</span><b>+${formatCoins(comp.prize)}</b><small>moedas</small></div>
          <button class="primary-btn" data-comp-new="${comp.id}">${icon("trophy")} Novo torneio</button>
        </div>` : ""}

      <div class="comp-layout">
        <div>
          ${fixture && !eliminated ? `
            <div class="next-fixture">
              <span class="eyebrow">PRÓXIMO COMPROMISSO · ${escapeHTML(round?.name || "")}</span>
              <div class="next-fixture-row">
                <div class="next-team">${crest(nextHome, "md")}<strong>${escapeHTML(nextHome.name)}</strong></div>
                <div class="next-vs">VS<small>${escapeHTML(comp.name)}</small></div>
                <div class="next-team">${crest(nextAway, "md")}<strong>${escapeHTML(nextAway.name)}</strong></div>
              </div>
              <button class="primary-btn" data-comp-play="${comp.id}">${icon("play")} Entrar em campo</button>
            </div>` : `
            <div class="next-fixture" style="text-align:center">
              <span class="eyebrow">${state.finished ? "TORNEIO ENCERRADO" : eliminated ? "ELIMINADO" : "SEM PARTIDA"}</span>
              <h2 style="font-family:var(--display);font-size:22px;margin:9px 0">${state.finished ? escapeHTML(champion?.name || "") : eliminated ? "Sua campanha terminou" : "Aguardando rodada"}</h2>
              <p style="font-size:9px;color:var(--muted);max-width:420px;margin:0 auto">${state.finished ? "Confira a classificação final e prepare-se para o próximo desafio." : "Simule a rodada para acompanhar o restante da competição."}</p>
            </div>`}

          <div class="panel" style="margin-top:10px">
            <div class="panel-head">
              <h3>${state.format === "cup" ? "Chaveamento" : "Classificação"}</h3>
              <span class="eyebrow">${state.format === "cup" ? "MATA-MATA" : "PONTOS CORRIDOS"}</span>
            </div>
            ${state.format === "cup" ? `
              <div class="bracket-scroll"><div class="bracket">${state.rounds.map((item) => bracketRound(item, state.teamId)).join("")}</div></div>
            ` : `
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th><th>Forma</th></tr></thead>
                  <tbody>${tableRows(state)}</tbody>
                </table>
              </div>`}
          </div>
        </div>

        <aside>
          <div class="panel">
            <div class="panel-head"><h3>Rodada atual</h3><span class="eyebrow">${escapeHTML(round?.name || "FINAL")}</span></div>
            <div class="panel-body">${state.finished ? `<div class="empty-mini">${icon("trophy")}<span>Temporada encerrada</span></div>` : roundFixtures(state)}</div>
            ${!state.finished ? `
              <div class="panel-foot" style="display:flex;gap:7px">
                <button class="ghost-btn small-btn" style="flex:1" data-comp-sim="${comp.id}">${icon("calendar")} Simular</button>
                <button class="ghost-btn small-btn danger-hover" data-comp-abandon="${comp.id}" title="Abandonar torneio">${icon("close")}</button>
              </div>` : ""}
          </div>
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Sua campanha</h3></div>
            <div class="panel-body">
              <div class="career-stat-grid">
                <div><span>Clube</span><b>${escapeHTML(team.short)}</b></div>
                <div><span>Posição</span><b>${position ? `${position}º` : "-"}</b></div>
                <div><span>Rodada</span><b>${Math.min(state.roundIndex + 1, state.rounds.length)}/${state.rounds.length}</b></div>
                <div><span>Prêmio</span><b>${formatCoins(comp.prize)}</b></div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
};

export const bindCompetition = (app) => {
  const view = document.getElementById("view");
  view.querySelectorAll("[data-comp-open]").forEach((button) => {
    button.addEventListener("click", () => {
      app.audio.click();
      const comp = COMPETITIONS.find((item) => item.id === button.dataset.compOpen);
      app.openTeamPicker({
        title: `Escolha seu clube · ${comp.name}`,
        eyebrow: "INÍCIO DE TORNEIO",
        pool: competitionPool(comp),
        selectedId: save.favoriteTeam,
        onPick: (team) => app.confirmCompetitionStart(comp, team)
      });
    });
  });
  view.querySelectorAll("[data-comp-continue]").forEach((button) => {
    button.addEventListener("click", () => {
      app.audio.click();
      app.state.compId = button.dataset.compContinue;
      app.navigate("compHub");
    });
  });
  view.querySelectorAll("[data-comp-play]").forEach((button) => {
    button.addEventListener("click", () => {
      const comp = COMPETITIONS.find((item) => item.id === button.dataset.compPlay);
      const state = save.competitions[comp.id];
      const fixture = currentUserFixture(state);
      if (!fixture) return;
      app.showPreMatch(fixture.home, fixture.away, {
        type: "competition",
        compId: comp.id,
        compName: comp.name,
        returnScreen: "compHub",
        userTeamId: state.teamId
      }, {
        ...app.quickOptions(),
        weather: app.quick.weather,
        stadium: app.quick.stadium,
        competition: comp.name
      });
    });
  });
  view.querySelectorAll("[data-comp-sim]").forEach((button) => {
    button.addEventListener("click", () => {
      app.simulateCompetition(button.dataset.compSim);
    });
  });
  view.querySelectorAll("[data-comp-abandon]").forEach((button) => {
    button.addEventListener("click", () => {
      const compId = button.dataset.compAbandon;
      openModal(modalShell("Abandonar torneio?", "ATENÇÃO", `<p class="modal-text">O progresso atual em <b>${escapeHTML(COMPETITIONS.find((item) => item.id === compId)?.name || "competição")}</b> será perdido. Esta ação não pode ser desfeita.</p>`,
        `<button class="ghost-btn" data-close-modal>Continuar jogando</button><button class="primary-btn danger" data-comp-abandon-confirm="${compId}">Abandonar</button>`));
      document.querySelector("[data-comp-abandon-confirm]")?.addEventListener("click", () => {
        delete save.competitions[compId];
        persist();
        closeModal();
        app.state.compId = null;
        app.navigate("competitions");
        toast("Torneio abandonado.");
      });
    });
  });
  view.querySelectorAll("[data-comp-new]").forEach((button) => {
    button.addEventListener("click", () => {
      app.audio.click();
      delete save.competitions[button.dataset.compNew];
      persist();
      app.navigate("competitions");
    });
  });
};

export const simulateCompetitionRound = (app, compId) => {
  const comp = COMPETITIONS.find((item) => item.id === compId);
  const state = save.competitions[compId];
  if (!comp || !state || state.finished) return;
  const before = state.roundIndex;
  if (state.format === "cup") simulateCupRound(state);
  else simulateLeagueRound(state);
  persist();
  finalize(app, comp, state);
  toast(state.finished ? "Torneio encerrado." : `Rodada ${before + 1} simulada.`);
  app.render();
};
