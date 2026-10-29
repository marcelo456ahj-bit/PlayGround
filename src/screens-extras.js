import { BALLS, CAMERAS, DIFFICULTIES, LEAGUES, LOCKED_ITEMS, TROPHIES, WEATHERS } from "./data.js";
import { save, persist, buyUnlockable, selectBall, resetSave, levelInfo } from "./store.js";
import { crest, escapeHTML, formatCoins, icon, modalShell, openModal, closeModal, toast } from "./ui.js";

const extrasState = (app) => {
  if (!app.extras) app.extras = { tab: "store", dbLeague: null };
  return app.extras;
};

const TROPHY_ALIASES = {
  br: ["br", "BRASILEIRAO"],
  libertadores: ["libertadores", "LIBERTADORES"],
  champions: ["champions", "CHAMPIONS"],
  copa: ["copa", "COPABRASIL"],
  mundo: ["mundo", "MUNDIAL"]
};

const trophyCount = (id) => {
  const aliases = TROPHY_ALIASES[id] || [id];
  return aliases.reduce((sum, key) => sum + (save.profile.trophies[key] || 0), 0);
};

const itemPreview = (item) => {
  if (item.type === "ball") {
    const ball = BALLS.find((entry) => entry.id === item.item) || BALLS[0];
    return `<div class="store-ball" style="--b1:${ball.primary};--b2:${ball.secondary}"><i></i></div>`;
  }
  return `<div class="store-kit ${item.item}"><span>10</span></div>`;
};

const storeTab = () => {
  const canBuy = (item) => item.type === "ball" ? save.unlocks.balls.includes(item.item) : save.unlocks.kits.includes(item.item);
  return `
    <div class="store-head">
      <div class="coin-chip big">${icon("coin")} ${formatCoins(save.profile.coins)} moedas</div>
      <p>Desbloqueie bolas e uniformes especiais. Os itens ficam disponíveis em todas as partidas.</p>
    </div>
    <div class="store-grid">
      ${LOCKED_ITEMS.map((item) => {
        const owned = canBuy(item);
        const selected = item.type === "ball" ? save.selectedBall === item.item : save.selectedKit === item.item;
        return `
          <article class="store-card ${owned ? "owned" : ""}">
            ${itemPreview(item)}
            <div class="store-copy">
              <span class="eyebrow">${item.type === "ball" ? "BOLA" : "UNIFORME"}</span>
              <h3>${escapeHTML(item.name)}</h3>
              <div class="store-price">${owned ? (selected ? "Em uso" : "Desbloqueado") : `${formatCoins(item.price)} moedas`}</div>
            </div>
            ${owned
              ? `<button class="mini-btn" data-store-select="${item.id}" ${selected ? "disabled" : ""}>${selected ? "Selecionado" : "Usar"}</button>`
              : `<button class="primary-btn small-btn" data-store-buy="${item.id}">${icon("coin")} Comprar</button>`}
          </article>`;
      }).join("")}
    </div>`;
};

const trophiesTab = () => `
  <div class="trophy-room">
    ${TROPHIES.map((trophy) => {
      const count = trophyCount(trophy.id);
      return `
        <div class="trophy-card ${count ? "won" : ""}">
          <div class="trophy-icon" style="--trophy:${trophy.color}">${icon("trophy")}</div>
          <strong>${escapeHTML(trophy.name)}</strong>
          <span>${count ? `${count}x conquistado` : "Ainda não conquistado"}</span>
        </div>`;
    }).join("")}
  </div>
  <div class="panel" style="margin-top:12px">
    <div class="panel-head"><h3>Galeria de conquistas</h3><span class="eyebrow">${save.profile.achievements.length} DESBLOQUEADAS</span></div>
    <div class="panel-body">
      ${save.profile.achievements.length ? `<div class="achievement-list">${save.profile.achievements.map((achievement) => `<span>${icon("trophy")} ${escapeHTML(achievement)}</span>`).join("")}</div>` : `<div class="empty-mini">${icon("trophy")}<span>Vença torneios para preencher sua galeria</span></div>`}
    </div>
  </div>`;

const databaseTab = (app) => {
  const state = extrasState(app);
  return `
    <div class="db-grid">
      ${LEAGUES.map((league) => `
        <div class="db-league">
          <div class="db-league-head">
            <div><span class="eyebrow">${league.teams.length} EQUIPES</span><h3>${escapeHTML(league.name)}</h3></div>
            <span class="db-region">${escapeHTML(league.region || league.short)}</span>
          </div>
          <div class="db-team-list">
            ${league.teams.slice(0, 6).map((team) => `<div class="db-team">${crest(team, "xs")}<span>${escapeHTML(team.name)}</span><b>${team.overall}</b></div>`).join("")}
          </div>
          <button class="ghost-btn small-btn" style="width:100%;margin-top:8px" data-db-league="${league.id}">Ver todos os clubes</button>
        </div>`).join("")}
    </div>`;
};

export const renderExtras = (app) => {
  const state = extrasState(app);
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">EXTRAS / COLEÇÃO E HISTÓRIA</span>
          <h1 class="screen-title">Muito além do campo</h1>
          <p class="screen-sub">Desbloqueie itens, reviva conquistas e explore o banco de dados completo do jogo.</p>
        </div>
        <div class="head-actions">
          <div class="profession-chip"><b>${levelInfo().level}</b><span>NÍVEL</span></div>
          <div class="coin-chip">${icon("coin")} ${formatCoins(save.profile.coins)}</div>
        </div>
      </div>
      <div class="segmented extras-tabs" style="--cols:3;max-width:510px;margin-bottom:14px">
        <button class="${state.tab === "store" ? "active" : ""}" data-extras-tab="store">${icon("coin")} Loja</button>
        <button class="${state.tab === "trophies" ? "active" : ""}" data-extras-tab="trophies">${icon("trophy")} Troféus</button>
        <button class="${state.tab === "database" ? "active" : ""}" data-extras-tab="database">${icon("shield")} Banco de dados</button>
      </div>
      ${state.tab === "store" ? storeTab() : state.tab === "trophies" ? trophiesTab() : databaseTab(app)}
    </div>
  `;
};

export const bindExtras = (app) => {
  const view = document.getElementById("view");
  view.querySelectorAll("[data-extras-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      extrasState(app).tab = button.dataset.extrasTab;
      app.audio.click();
      app.render();
    });
  });
  view.querySelectorAll("[data-store-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      const result = buyUnlockable(button.dataset.storeBuy);
      if (!result.ok) {
        app.audio.back();
        toast(result.message);
        return;
      }
      app.audio.coin();
      toast(result.message);
      app.render();
    });
  });
  view.querySelectorAll("[data-store-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = LOCKED_ITEMS.find((entry) => entry.id === button.dataset.storeSelect);
      if (!item) return;
      if (item.type === "ball") selectBall(item.item);
      else {
        save.selectedKit = item.item;
        persist();
      }
      app.audio.click();
      toast(`${item.name} equipado.`);
      app.render();
    });
  });
  view.querySelectorAll("[data-db-league]").forEach((button) => {
    button.addEventListener("click", () => {
      const league = LEAGUES.find((item) => item.id === button.dataset.dbLeague);
      openModal(modalShell(league.name, "BANCO DE DADOS", `
        <div class="db-modal-grid">
          ${league.teams.map((team) => `
            <div class="db-modal-team">
              ${crest(team, "sm")}
              <div><strong>${escapeHTML(team.name)}</strong><small>${escapeHTML(team.city)} · ${escapeHTML(team.stadium)}</small></div>
              <b>${team.overall}</b>
            </div>`).join("")}
        </div>`, `<button class="primary-btn" data-close-modal>Fechar</button>`, true));
    });
  });
};

export const renderSettings = () => {
  const settings = save.settings;
  const level = levelInfo();
  const slider = (key, label, value) => `
    <div class="setting-slider">
      <div><span>${label}</span><b data-setting-value="${key}">${Math.round(value * 100)}%</b></div>
      <input type="range" min="0" max="100" value="${Math.round(value * 100)}" data-setting-volume="${key}">
    </div>`;
  const toggle = (key, label, desc) => `
    <div class="toggle-row">
      <div class="toggle-copy"><strong>${label}</strong><small>${desc}</small></div>
      <button class="switch ${settings[key] ? "on" : ""}" data-setting-toggle="${key}" aria-label="${label}"></button>
    </div>`;
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">AJUSTES / EXPERIÊNCIA</span>
          <h1 class="screen-title">Configurações</h1>
          <p class="screen-sub">Ajuste áudio, controles, acessibilidade e preferências de jogo. Tudo é salvo automaticamente.</p>
        </div>
      </div>
      <div class="settings-layout">
        <div>
          <div class="panel">
            <div class="panel-head"><h3>Áudio</h3><span class="eyebrow">MIXAGEM</span></div>
            <div class="panel-body">
              ${slider("music", "Música", settings.music)}
              ${slider("sfx", "Efeitos sonoros", settings.sfx)}
              ${slider("commentary", "Narração", settings.commentary)}
              ${slider("crowd", "Torcida", settings.crowd)}
              ${toggle("voice", "Voz sintetizada", "Locução falada em português brasileiro")}
              <button class="ghost-btn small-btn" data-test-audio>${icon("play")} Testar áudio</button>
            </div>
          </div>
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Jogo</h3><span class="eyebrow">PADRÕES</span></div>
            <div class="panel-body">
              <div class="form-grid">
                <label class="field"><span>Dificuldade</span><select data-setting-select="difficulty">
                  ${DIFFICULTIES.map((item) => `<option value="${item.id}" ${settings.difficulty === item.id ? "selected" : ""}>${item.name}</option>`).join("")}
                </select></label>
                <label class="field"><span>Câmera padrão</span><select data-setting-select="camera">
                  ${CAMERAS.map((item) => `<option value="${item.id}" ${settings.camera === item.id ? "selected" : ""}>${item.name}</option>`).join("")}
                </select></label>
                <label class="field"><span>Duração padrão</span><select data-setting-select="matchMinutes">
                  ${[4, 6, 8, 10].map((minutes) => `<option value="${minutes}" ${Number(settings.matchMinutes) === minutes ? "selected" : ""}>${minutes} minutos</option>`).join("")}
                </select></label>
                <label class="field"><span>Clima padrão</span><select data-setting-select="weather">
                  ${WEATHERS.map((item) => `<option value="${item.id}" ${settings.weather === item.id ? "selected" : ""}>${item.name}</option>`).join("")}
                </select></label>
              </div>
              <div class="spacer-16"></div>
              ${toggle("narration", "Narração de partida", "Comentários automáticos durante os jogos")}
              ${toggle("replay", "Replays automáticos", "Reveja os gols em slow motion")}
              ${toggle("tilt", "Inclinação do aparelho", "Controle auxiliar por acelerômetro em dispositivos móveis")}
              <button class="ghost-btn small-btn" data-motion-permission>${icon("training")} Ativar sensores de movimento</button>
            </div>
          </div>
          <div class="panel danger-panel" style="margin-top:10px">
            <div class="panel-head"><h3>Dados do jogo</h3><span class="eyebrow">ZONA DE PERIGO</span></div>
            <div class="panel-body">
              <p class="modal-text">O progresso fica salvo neste navegador. Você pode apagar carreiras, torneios, editor e moedas.</p>
              <button class="ghost-btn small-btn danger" data-reset-save>${icon("close")} Apagar todo o progresso</button>
            </div>
          </div>
        </div>
        <aside>
          <div class="panel">
            <div class="panel-head"><h3>Perfil</h3><span class="eyebrow">${escapeHTML(save.profile.name)}</span></div>
            <div class="panel-body">
              <div class="profile-card-large">
                <div class="profile-avatar">${escapeHTML((save.profile.name || "T").slice(0, 1).toUpperCase())}</div>
                <div><strong>${escapeHTML(save.profile.name)}</strong><span>Nível ${level.level} · ${level.current}/${level.next} XP</span></div>
              </div>
              <div class="progress-track" style="margin:10px 0 14px"><i style="width:${level.progress}%"></i></div>
              <div class="career-stat-grid">
                <div><span>Partidas</span><b>${save.profile.matches}</b></div>
                <div><span>Vitórias</span><b>${save.profile.wins}</b></div>
                <div><span>Gols</span><b>${save.profile.goals}</b></div>
                <div><span>Troféus</span><b>${Object.values(save.profile.trophies).reduce((a, b) => a + b, 0)}</b></div>
              </div>
            </div>
          </div>
          <div class="panel" style="margin-top:10px">
            <div class="panel-head"><h3>Sobre</h3><span class="eyebrow">V1.0</span></div>
            <div class="panel-body about-copy">
              <strong>PES 2027 Stickman 2D</strong>
              <span>Futebol 2D para navegador, feito para jogar em qualquer tela.</span>
              <span>120 clubes e seleções · 10 competições · carreira · editor · multijogador local</span>
              <small>Projeto independente. Nenhuma afiliação com ligas ou marcas reais.</small>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
};

export const bindSettings = (app) => {
  const view = document.getElementById("view");
  view.querySelectorAll("[data-setting-volume]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.settingVolume;
      save.settings[key] = Number(input.value) / 100;
      const label = view.querySelector(`[data-setting-value="${key}"]`);
      if (label) label.textContent = `${input.value}%`;
      app.audio.setSettings(save.settings);
      persist();
    });
  });
  view.querySelectorAll("[data-setting-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.settingToggle;
      save.settings[key] = !save.settings[key];
      button.classList.toggle("on", save.settings[key]);
      persist();
      if (key === "tilt" && save.settings.tilt) app.requestMotionPermission();
    });
  });
  view.querySelectorAll("[data-setting-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const key = select.dataset.settingSelect;
      save.settings[key] = key === "matchMinutes" ? Number(select.value) : select.value;
      persist();
    });
  });
  view.querySelector("[data-test-audio]")?.addEventListener("click", () => {
    app.audio.ensure();
    app.audio.success();
    app.audio.say("goal");
  });
  view.querySelector("[data-motion-permission]")?.addEventListener("click", () => app.requestMotionPermission());
  view.querySelector("[data-reset-save]")?.addEventListener("click", () => {
    openModal(modalShell("Apagar todo o progresso?", "ZONA DE PERIGO", `<p class="modal-text">Todas as carreiras, torneios, edições, moedas e troféus serão removidos permanentemente deste navegador.</p>`,
      `<button class="ghost-btn" data-close-modal>Cancelar</button><button class="primary-btn danger" data-reset-confirm>Apagar tudo</button>`));
    document.querySelector("[data-reset-confirm]")?.addEventListener("click", () => {
      resetSave();
      window.location.reload();
    });
  });
};
