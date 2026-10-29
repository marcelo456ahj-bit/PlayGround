import { FORMATIONS, LEAGUES, STADIUMS, getTeam } from "./data.js";
import { save, persist } from "./store.js";
import { crest, escapeHTML, icon, modalShell, openModal, closeModal, toast } from "./ui.js";

const editState = (app) => {
  if (!app.editor) app.editor = { tab: "team", teamId: save.favoriteTeam, playerId: null };
  return app.editor;
};

const editableTeams = () => LEAGUES.filter((league) => league.id !== "selecoes").flatMap((league) => league.teams);

const teamOptions = (selectedId) => LEAGUES.map((league) => `
  <optgroup label="${escapeHTML(league.name)}">
    ${league.teams.map((team) => `<option value="${team.id}" ${team.id === selectedId ? "selected" : ""}>${escapeHTML(team.name)} · ${team.overall}</option>`).join("")}
  </optgroup>`).join("");

const positionStats = (position, overall) => {
  const adjust = (key) => {
    const map = {
      GOL: { pace: -18, shot: -25, pass: -4, dribble: -14, defense: 10, physical: 4 },
      ZAG: { pace: -7, shot: -18, pass: -4, dribble: -10, defense: 12, physical: 8 },
      VOL: { pace: -3, shot: -8, pass: 2, dribble: -2, defense: 9, physical: 6 },
      MC: { pace: 0, shot: -2, pass: 7, dribble: 2, defense: 3, physical: 2 },
      MEI: { pace: 2, shot: 4, pass: 8, dribble: 7, defense: -8, physical: -2 },
      ATA: { pace: 5, shot: 9, pass: -2, dribble: 5, defense: -12, physical: 2 },
      PD: { pace: 8, shot: 5, pass: 1, dribble: 8, defense: -10, physical: -2 },
      PE: { pace: 8, shot: 5, pass: 1, dribble: 8, defense: -10, physical: -2 },
      LD: { pace: 5, shot: -7, pass: 0, dribble: 0, defense: 4, physical: 3 },
      LE: { pace: 5, shot: -7, pass: 0, dribble: 0, defense: 4, physical: 3 }
    };
    return Math.max(30, Math.min(99, overall + (map[position]?.[key] || 0)));
  };
  return { pace: adjust("pace"), shot: adjust("shot"), pass: adjust("pass"), dribble: adjust("dribble"), defense: adjust("defense"), physical: adjust("physical") };
};

const playerOptions = (team, selectedId) => [...team.squad]
  .sort((a, b) => b.overall - a.overall)
  .map((player) => `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>#${player.number} ${escapeHTML(player.name)} · ${player.position} · ${player.overall}</option>`)
  .join("");

const teamEditor = (app) => {
  const state = editState(app);
  const team = getTeam(state.teamId);
  return `
    <div class="editor-layout">
      <div class="panel">
        <div class="panel-head"><h3>Identidade do clube</h3><span class="eyebrow">EDITANDO</span></div>
        <div class="panel-body">
          <label class="field wide" style="margin-bottom:12px"><span>Clube</span><div class="select-wrap"><select data-editor-team>${teamOptions(team.id)}</select></div></label>
          <div class="team-preview">
            ${crest(team, "xl")}
            <div><span>${escapeHTML(team.city)}</span><strong>${escapeHTML(team.name)}</strong><small>${team.overall} OVR · ${escapeHTML(team.stadium)}</small></div>
            <div class="kit-preview"><i style="background:${team.primary}"></i><i style="background:${team.secondary}"></i><i style="background:${team.accent}"></i></div>
          </div>
          <div class="form-grid">
            <label class="field wide"><span>Nome do clube</span><input id="editTeamName" maxlength="32" value="${escapeHTML(team.name)}"></label>
            <label class="field"><span>Abreviação</span><input id="editTeamShort" maxlength="4" value="${escapeHTML(team.short)}"></label>
            <label class="field"><span>Cidade</span><input id="editTeamCity" maxlength="28" value="${escapeHTML(team.city)}"></label>
            <label class="field"><span>Cor principal</span><div class="color-field"><input id="editTeamPrimary" type="color" value="${team.primary}"><code>${team.primary}</code></div></label>
            <label class="field"><span>Cor secundária</span><div class="color-field"><input id="editTeamSecondary" type="color" value="${team.secondary}"><code>${team.secondary}</code></div></label>
            <label class="field"><span>Cor de destaque</span><div class="color-field"><input id="editTeamAccent" type="color" value="${team.accent || "#ffffff"}"><code>${team.accent || "#ffffff"}</code></div></label>
            <label class="field"><span>Estádio</span><div class="select-wrap"><select id="editTeamStadium">${STADIUMS.map((stadium) => `<option value="${stadium.name}" ${stadium.name === team.stadium ? "selected" : ""}>${stadium.name}</option>`).join("")}</select></div></label>
            <label class="field"><span>Formação</span><div class="select-wrap"><select id="editTeamFormation">${Object.keys(FORMATIONS).map((key) => `<option value="${key}" ${key === team.formation ? "selected" : ""}>${key} · ${FORMATIONS[key].name}</option>`).join("")}</select></div></label>
            <label class="field wide"><span>Estilo de jogo</span><select id="editTeamStyle">${["Posse de bola", "Transição rápida", "Equilibrado", "Pressão alta", "Contra-ataque"].map((style) => `<option ${style === team.style ? "selected" : ""}>${style}</option>`).join("")}</select></label>
          </div>
          <div class="editor-actions">
            <button class="primary-btn" data-editor-save-team>${icon("check")} Salvar clube</button>
            <button class="ghost-btn" data-editor-reset-team>${icon("close")} Restaurar original</button>
          </div>
        </div>
      </div>
      <aside class="panel">
        <div class="panel-head"><h3>Resumo do elenco</h3><span class="eyebrow">${team.squad.length}</span></div>
        <div class="panel-body">
          <div class="career-stat-grid">
            <div><span>Overall</span><b>${team.overall}</b></div>
            <div><span>Reputação</span><b>${team.reputation}</b></div>
            <div><span>Formação</span><b>${escapeHTML(team.formation)}</b></div>
            <div><span>Liga</span><b>${escapeHTML(team.leagueName || "")}</b></div>
          </div>
          <div class="spacer-16"></div>
          <div class="coach-quote">As alterações de identidade aparecem imediatamente nos menus, nas partidas e nos escudos. As cores são aplicadas aos uniformes.</div>
          <div class="spacer-16"></div>
          <button class="ghost-btn" style="width:100%" data-editor-tab="player">${icon("users")} Editar jogadores do clube</button>
        </div>
      </aside>
    </div>`;
};

const playerEditor = (app) => {
  const state = editState(app);
  const team = getTeam(state.teamId);
  const player = team.squad.find((item) => item.id === state.playerId) || [...team.squad].sort((a, b) => b.overall - a.overall)[0];
  if (!player) return `<div class="empty-state">${icon("users")}<strong>Elenco vazio</strong></div>`;
  state.playerId = player.id;
  const statRow = (key, label) => `
    <label class="stat-slider"><span>${label}</span><input type="range" min="30" max="99" value="${player[key]}" data-player-stat="${key}"><b>${player[key]}</b></label>`;
  return `
    <div class="editor-layout">
      <div class="panel">
        <div class="panel-head"><h3>Editar jogador</h3><span class="eyebrow">${escapeHTML(team.short)}</span></div>
        <div class="panel-body">
          <div class="form-grid">
            <label class="field wide"><span>Clube</span><div class="select-wrap"><select data-editor-team>${teamOptions(team.id)}</select></div></label>
            <label class="field wide"><span>Jogador</span><div class="select-wrap"><select data-editor-player>${playerOptions(team, player.id)}</select></div></label>
            <label class="field wide"><span>Nome</span><input id="editPlayerName" maxlength="28" value="${escapeHTML(player.name)}"></label>
            <label class="field"><span>Apelido</span><input id="editPlayerShort" maxlength="12" value="${escapeHTML(player.shortName)}"></label>
            <label class="field"><span>Camisa</span><input id="editPlayerNumber" type="number" min="1" max="99" value="${player.number}"></label>
            <label class="field"><span>Posição</span><select id="editPlayerPosition">${["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PD", "PE", "ATA"].map((position) => `<option ${position === player.position ? "selected" : ""}>${position}</option>`).join("")}</select></label>
            <label class="field"><span>Idade</span><input id="editPlayerAge" type="number" min="16" max="45" value="${player.age}"></label>
            <label class="field"><span>Overall</span><input id="editPlayerOverall" type="number" min="45" max="99" value="${player.overall}"></label>
            <label class="field"><span>Pé</span><select id="editPlayerFoot"><option ${player.foot === "Direito" ? "selected" : ""}>Direito</option><option ${player.foot === "Esquerdo" ? "selected" : ""}>Esquerdo</option></select></label>
          </div>
          <div class="stat-editor">
            ${statRow("pace", "Ritmo")}
            ${statRow("shot", "Finalização")}
            ${statRow("pass", "Passe")}
            ${statRow("dribble", "Drible")}
            ${statRow("defense", "Defesa")}
            ${statRow("physical", "Físico")}
          </div>
          <div class="editor-actions">
            <button class="primary-btn" data-editor-save-player>${icon("check")} Salvar jogador</button>
            <button class="ghost-btn" data-editor-new-player>${icon("users")} Novo jogador</button>
            <button class="ghost-btn" data-editor-reset-player>${icon("close")} Restaurar</button>
          </div>
        </div>
      </div>
      <aside class="panel">
        <div class="panel-head"><h3>Prévia do atleta</h3></div>
        <div class="panel-body">
          <div class="player-preview">
            <div class="player-ovr" id="playerPreviewOvr">${player.overall}</div>
            <div class="player-shirt" style="--c1:${team.primary};--c2:${team.secondary}">${player.number}</div>
            <div><span>${player.position} · ${player.age} anos</span><strong id="playerPreviewName">${escapeHTML(player.name)}</strong><small>${escapeHTML(team.name)}</small></div>
          </div>
          <div class="attribute-grid compact" style="margin-top:14px">
            ${[["Ritmo", "pace"], ["Finalização", "shot"], ["Passe", "pass"], ["Drible", "dribble"], ["Defesa", "defense"], ["Físico", "physical"]].map(([label, key]) => `
              <div class="attribute"><span>${label}</span><div class="meter-track"><i id="preview-${key}" style="width:${player[key]}%"></i></div><b id="preview-value-${key}">${player[key]}</b></div>`).join("")}
          </div>
        </div>
      </aside>
    </div>`;
};

export const renderEditor = (app) => {
  const state = editState(app);
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">EDITOR / PERSONALIZAÇÃO TOTAL</span>
          <h1 class="screen-title">Crie do seu jeito</h1>
          <p class="screen-sub">Ajuste clubes, uniformes, estádios, formações, jogadores e atributos. Suas alterações ficam salvas neste dispositivo.</p>
        </div>
        <div class="head-actions">
          <div class="segmented" style="--cols:2;min-width:250px">
            <button class="${state.tab === "team" ? "active" : ""}" data-editor-tab="team">${icon("shield")} Clubes</button>
            <button class="${state.tab === "player" ? "active" : ""}" data-editor-tab="player">${icon("users")} Jogadores</button>
          </div>
        </div>
      </div>
      ${state.tab === "team" ? teamEditor(app) : playerEditor(app)}
    </div>
  `;
};

const readTeamForm = () => ({
  name: document.getElementById("editTeamName").value.trim(),
  short: document.getElementById("editTeamShort").value.trim().toUpperCase(),
  city: document.getElementById("editTeamCity").value.trim(),
  primary: document.getElementById("editTeamPrimary").value,
  secondary: document.getElementById("editTeamSecondary").value,
  accent: document.getElementById("editTeamAccent").value,
  stadium: document.getElementById("editTeamStadium").value,
  formation: document.getElementById("editTeamFormation").value,
  style: document.getElementById("editTeamStyle").value
});

export const bindEditor = (app) => {
  const view = document.getElementById("view");
  const state = editState(app);
  view.querySelectorAll("[data-editor-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.editorTab;
      app.audio.click();
      app.render();
    });
  });
  view.querySelector("[data-editor-team]")?.addEventListener("change", (event) => {
    state.teamId = event.target.value;
    state.playerId = null;
    app.render();
  });
  view.querySelector("[data-editor-player]")?.addEventListener("change", (event) => {
    state.playerId = event.target.value;
    app.render();
  });
  view.querySelector("[data-editor-tab='player']")?.addEventListener("click", () => {
    state.tab = "player";
    state.playerId = null;
  });

  view.querySelectorAll("input[type=color]").forEach((input) => input.addEventListener("input", () => {
    const code = input.parentElement.querySelector("code");
    if (code) code.textContent = input.value;
    const preview = view.querySelector(".team-preview .crest");
    if (preview) {
      if (input.id === "editTeamPrimary") preview.style.setProperty("--c1", input.value);
      if (input.id === "editTeamSecondary") preview.style.setProperty("--c2", input.value);
      if (input.id === "editTeamAccent") preview.style.setProperty("--c3", input.value);
    }
  }));

  view.querySelectorAll("[data-player-stat]").forEach((input) => input.addEventListener("input", () => {
    const key = input.dataset.playerStat;
    const label = input.parentElement.querySelector("b");
    const bar = document.getElementById(`preview-${key}`);
    const value = document.getElementById(`preview-value-${key}`);
    if (label) label.textContent = input.value;
    if (bar) bar.style.width = `${input.value}%`;
    if (value) value.textContent = input.value;
  }));
  ["editPlayerName", "editPlayerOverall", "editPlayerAge"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      if (id === "editPlayerName") {
        const preview = document.getElementById("playerPreviewName");
        if (preview) preview.textContent = document.getElementById(id).value || "Jogador";
      }
      if (id === "editPlayerOverall") {
        const preview = document.getElementById("playerPreviewOvr");
        if (preview) preview.textContent = document.getElementById(id).value;
      }
    });
  });

  view.querySelector("[data-editor-save-team]")?.addEventListener("click", () => {
    const team = getTeam(state.teamId);
    const data = readTeamForm();
    if (!data.name || !data.short) {
      toast("Preencha nome e abreviação do clube.");
      return;
    }
    Object.assign(team, data);
    save.edits.teams[team.id] = { ...(save.edits.teams[team.id] || {}), ...data };
    persist();
    app.audio.success();
    toast("Clube atualizado com sucesso.");
    app.render();
  });
  view.querySelector("[data-editor-reset-team]")?.addEventListener("click", () => {
    toast("Reabra o editor após recarregar para restaurar o time original.");
  });
  view.querySelector("[data-editor-save-player]")?.addEventListener("click", () => {
    const team = getTeam(state.teamId);
    const player = team.squad.find((item) => item.id === state.playerId);
    if (!player) return;
    const data = {
      name: document.getElementById("editPlayerName").value.trim(),
      shortName: document.getElementById("editPlayerShort").value.trim(),
      number: Math.max(1, Math.min(99, Number(document.getElementById("editPlayerNumber").value) || player.number)),
      position: document.getElementById("editPlayerPosition").value,
      overall: Math.max(45, Math.min(99, Number(document.getElementById("editPlayerOverall").value) || player.overall)),
      age: Math.max(16, Math.min(45, Number(document.getElementById("editPlayerAge").value) || player.age)),
      foot: document.getElementById("editPlayerFoot").value
    };
    view.querySelectorAll("[data-player-stat]").forEach((input) => {
      data[input.dataset.playerStat] = Number(input.value);
    });
    if (!data.name) {
      toast("Informe o nome do jogador.");
      return;
    }
    Object.assign(player, data);
    save.edits.players[team.id] = save.edits.players[team.id] || {};
    save.edits.players[team.id][player.id] = { ...(save.edits.players[team.id][player.id] || {}), ...data };
    persist();
    app.audio.success();
    toast("Jogador atualizado com sucesso.");
    app.render();
  });
  view.querySelector("[data-editor-new-player]")?.addEventListener("click", () => openNewPlayer(app, state.teamId));
  view.querySelector("[data-editor-reset-player]")?.addEventListener("click", () => {
    toast("Reabra o editor após recarregar para restaurar o jogador original.");
  });
};

const openNewPlayer = (app, teamId) => {
  const team = getTeam(teamId);
  openModal(modalShell("Novo jogador", "EDITOR", `
    <div class="form-grid">
      <label class="field wide"><span>Nome</span><input id="newPlayerName" maxlength="28" placeholder="Nome do jogador"></label>
      <label class="field"><span>Posição</span><select id="newPlayerPosition">${["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PD", "PE", "ATA"].map((position) => `<option>${position}</option>`).join("")}</select></label>
      <label class="field"><span>Camisa</span><input id="newPlayerNumber" type="number" min="1" max="99" value="${team.squad.length + 1}"></label>
      <label class="field"><span>Idade</span><input id="newPlayerAge" type="number" min="16" max="40" value="20"></label>
      <label class="field"><span>Overall</span><input id="newPlayerOverall" type="number" min="45" max="94" value="68"></label>
    </div>`,
  `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn" data-new-player-confirm>${icon("check")} Criar jogador</button>`));
  document.querySelector("[data-new-player-confirm]")?.addEventListener("click", () => {
    const name = document.getElementById("newPlayerName").value.trim();
    if (name.length < 3) {
      toast("Informe um nome válido.");
      return;
    }
    const position = document.getElementById("newPlayerPosition").value;
    const overall = Math.max(45, Math.min(94, Number(document.getElementById("newPlayerOverall").value) || 68));
    const age = Math.max(16, Math.min(40, Number(document.getElementById("newPlayerAge").value) || 20));
    const number = Math.max(1, Math.min(99, Number(document.getElementById("newPlayerNumber").value) || 1));
    const stats = positionStats(position, overall);
    const player = {
      id: `${team.id}-custom-${Date.now()}`,
      name,
      shortName: name.split(" ").slice(-1)[0].slice(0, 10),
      number,
      position,
      overall,
      ...stats,
      stamina: Math.min(99, overall + 5),
      age,
      foot: "Direito",
      nationality: "Brasil",
      value: Math.round((overall ** 2) * (age < 24 ? 19 : 12) / 100) * 1000,
      wage: Math.round(overall * 190),
      form: 4,
      goals: 0,
      assists: 0,
      apps: 0
    };
    team.squad.push(player);
    save.edits.newPlayers = save.edits.newPlayers || [];
    save.edits.newPlayers.push({ teamId: team.id, player });
    persist();
    closeModal();
    app.audio.success();
    toast(`${name} criado no ${team.name}.`);
    app.editor.playerId = player.id;
    app.render();
  });
};
