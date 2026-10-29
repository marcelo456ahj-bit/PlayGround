import { LEAGUES, getTeam } from "./data.js";
import { save, persist, signPlayer } from "./store.js";
import { crest, escapeHTML, formatCoins, formatMoney, icon, modalShell, openModal, closeModal, toast } from "./ui.js";

const POSITION_GROUPS = [
  { id: "all", label: "Todos" },
  { id: "GOL", label: "Goleiros" },
  { id: "DEF", label: "Defensores" },
  { id: "MID", label: "Meias" },
  { id: "ATT", label: "Atacantes" }
];

const groupOf = (position) => {
  if (position === "GOL") return "GOL";
  if (["ZAG", "LD", "LE"].includes(position)) return "DEF";
  if (["VOL", "MC", "MEI"].includes(position)) return "MID";
  return "ATT";
};

export const playerValue = (player) => {
  const ageFactor = player.age <= 23 ? 1.25 : player.age <= 29 ? 1 : 0.65;
  return Math.max(250000, Math.round((player.overall - 48) ** 2 * 62000 * ageFactor / 100000) * 100000);
};

const transferState = (app) => {
  if (!app.transfers) app.transfers = { league: "all", position: "all", search: "", sort: "overall" };
  return app.transfers;
};

const marketPlayers = (app, teamId) => {
  const state = transferState(app);
  let list = LEAGUES.filter((league) => ["brasileirao", "premier", "laliga", "seriea", "bundesliga", "ligue1", "mundo", "libertadores"].includes(league.id))
    .filter((league) => state.league === "all" || league.id === state.league)
    .flatMap((league) => league.teams.filter((team) => team.id !== teamId).flatMap((team) => team.squad.map((player) => ({ player, team }))));
  if (state.position !== "all") list = list.filter((entry) => groupOf(entry.player.position) === state.position);
  if (state.search) {
    const query = state.search.toLowerCase();
    list = list.filter((entry) => entry.player.name.toLowerCase().includes(query) || entry.team.name.toLowerCase().includes(query));
  }
  if (state.sort === "value") list.sort((a, b) => playerValue(b.player) - playerValue(a.player));
  else if (state.sort === "age") list.sort((a, b) => a.player.age - b.player.age);
  else if (state.sort === "position") list.sort((a, b) => a.player.position.localeCompare(b.player.position) || b.player.overall - a.player.overall);
  else list.sort((a, b) => b.player.overall - a.player.overall);
  return list;
};

export const renderTransfers = (app) => {
  const state = transferState(app);
  const teamId = save.master ? save.master.teamId : save.favoriteTeam;
  const team = getTeam(teamId);
  const budget = save.master ? save.master.budget : null;
  const list = marketPlayers(app, teamId);
  const shown = list.slice(0, 70);
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">MERCADO DE TRANSFERÊNCIAS / JANELA ABERTA</span>
          <h1 class="screen-title">Central de contratações</h1>
          <p class="screen-sub">Encontre o jogador certo para o seu projeto. Valores calculados por overall, idade e potencial.</p>
        </div>
        <div class="head-actions">
          <div class="club-mini">${crest(team, "sm")}<div><span>${save.master ? "SEU CLUBE" : "CLUBE FAVORITO"}</span><b>${escapeHTML(team.name)}</b></div></div>
          <div class="coin-chip">${icon("coin")} ${budget !== null ? formatMoney(budget) : "Sem carreira ativa"}</div>
        </div>
      </div>

      ${!save.master ? `
        <div class="notice-banner">
          <span>${icon("lock")}</span>
          <div><strong>Negociações disponíveis na Master League</strong><small>Abra uma carreira para receber um orçamento e contratar jogadores para o seu clube.</small></div>
          <button class="primary-btn small-btn" data-go="master">Abrir carreira</button>
        </div>` : ""}

      <div class="transfer-toolbar">
        <div class="search-box">
          ${icon("search")}
          <input id="transferSearch" placeholder="Buscar jogador ou clube..." value="${escapeHTML(state.search)}" autocomplete="off">
        </div>
        <div class="select-wrap">
          <select data-transfer-league>
            <option value="all" ${state.league === "all" ? "selected" : ""}>Todas as ligas</option>
            ${LEAGUES.filter((league) => ["brasileirao", "premier", "laliga", "seriea", "bundesliga", "ligue1", "mundo", "libertadores"].includes(league.id)).map((league) => `<option value="${league.id}" ${state.league === league.id ? "selected" : ""}>${escapeHTML(league.name)}</option>`).join("")}
          </select>
        </div>
        <div class="select-wrap">
          <select data-transfer-sort>
            <option value="overall" ${state.sort === "overall" ? "selected" : ""}>Melhor overall</option>
            <option value="value" ${state.sort === "value" ? "selected" : ""}>Maior valor</option>
            <option value="age" ${state.sort === "age" ? "selected" : ""}>Mais jovem</option>
            <option value="position" ${state.sort === "position" ? "selected" : ""}>Posição</option>
          </select>
        </div>
      </div>

      <div class="league-tabs" style="margin-bottom:10px">
        ${POSITION_GROUPS.map((group) => `<button class="league-tab ${state.position === group.id ? "active" : ""}" data-transfer-position="${group.id}">${group.label}</button>`).join("")}
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>Jogadores disponíveis</h3>
          <span class="eyebrow">${list.length} ENCONTRADOS</span>
        </div>
        <div class="table-wrap">
          <table class="data-table transfer-table">
            <thead><tr><th>Jogador</th><th>Clube</th><th>Pos.</th><th>Idade</th><th>OVR</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${shown.map(({ player, team: club }) => {
                const value = playerValue(player);
                const affordable = budget !== null && budget >= value;
                return `
                  <tr>
                    <td><div class="player-cell"><span class="player-pill">${player.position}</span><strong>${escapeHTML(player.name)}</strong><small>#${player.number} · ${player.foot}</small></div></td>
                    <td><div class="table-team">${crest(club, "xs")}<span>${escapeHTML(club.short)}</span></div></td>
                    <td>${player.position}</td>
                    <td>${player.age}</td>
                    <td><b class="ovr ${player.overall >= 85 ? "elite" : ""}">${player.overall}</b></td>
                    <td><b class="price">${formatMoney(value)}</b></td>
                    <td><span class="status-pill ${affordable ? "ok" : "no"}">${budget === null ? "Carreira" : affordable ? "Disponível" : "Alto custo"}</span></td>
                    <td><button class="mini-btn" data-transfer-sign="${player.id}" ${budget === null ? "disabled" : ""}>${icon("transfer")} Contratar</button></td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        ${!shown.length ? `<div class="empty-state">${icon("search")}<strong>Nenhum jogador encontrado</strong><span>Ajuste os filtros e tente novamente.</span></div>` : ""}
      </div>
    </div>
  `;
};

export const bindTransfers = (app) => {
  const view = document.getElementById("view");
  const search = view.querySelector("#transferSearch");
  if (search) {
    let timer = null;
    search.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        transferState(app).search = search.value.trim();
        app.render();
        const next = document.getElementById("transferSearch");
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      }, 260);
    });
  }
  view.querySelectorAll("[data-transfer-position]").forEach((button) => {
    button.addEventListener("click", () => {
      transferState(app).position = button.dataset.transferPosition;
      app.audio.click();
      app.render();
    });
  });
  view.querySelector("[data-transfer-league]")?.addEventListener("change", (event) => {
    transferState(app).league = event.target.value;
    app.render();
  });
  view.querySelector("[data-transfer-sort]")?.addEventListener("change", (event) => {
    transferState(app).sort = event.target.value;
    app.render();
  });
  view.querySelectorAll("[data-transfer-sign]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!save.master) {
        toast("Abra uma carreira Master League para contratar.");
        return;
      }
      const playerId = button.dataset.transferSign;
      const teamId = save.master.teamId;
      let found = null;
      LEAGUES.forEach((league) => league.teams.forEach((team) => {
        const player = team.squad.find((item) => item.id === playerId);
        if (player) found = { player, team };
      }));
      if (!found) return;
      const value = playerValue(found.player);
      openModal(modalShell("Confirmar contratação", "MERCADO", `
        <div class="signing-card">
          <div class="signing-player">
            ${crest(found.team, "md")}
            <div><span>${escapeHTML(found.team.name)}</span><h3>${escapeHTML(found.player.name)}</h3><small>${found.player.position} · ${found.player.overall} OVR · ${found.player.age} anos</small></div>
          </div>
          <div class="signing-values">
            <div><span>Valor do passe</span><b>${formatMoney(value)}</b></div>
            <div><span>Orçamento atual</span><b>${formatMoney(save.master.budget)}</b></div>
            <div><span>Salário estimado</span><b>${formatMoney(found.player.wage * 1000)} / temp.</b></div>
          </div>
          <p class="modal-text">A contratação será imediata e o jogador entrará no elenco do ${escapeHTML(getTeam(teamId).name)}.</p>
        </div>`,
      `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn" data-transfer-confirm="${playerId}">${icon("check")} Fechar contrato</button>`));
      document.querySelector("[data-transfer-confirm]")?.addEventListener("click", () => {
        const result = signPlayer(playerId, teamId, value);
        if (!result.ok) {
          toast(result.message);
          return;
        }
        closeModal();
        app.audio.coin();
        toast(result.message);
        app.render();
      });
    });
  });
};
