import { save, persist, addCoins, addXp } from "./store.js";
import { escapeHTML, formatCoins, icon, modalShell, openModal, closeModal, toast } from "./ui.js";

const trainingStats = () => {
  if (!save.stats.training) save.stats.training = { finishing: 0, penalties: 0, reflex: 0, sessions: 0 };
  return save.stats.training;
};

const drills = [
  {
    id: "finishing",
    name: "Precisão de chute",
    desc: "Pare o marcador no centro do alvo e acerte a finalização. Trabalha tempo de reação e mira.",
    icon: "ball",
    skill: "Finalização",
    difficulty: "Fácil"
  },
  {
    id: "penalties",
    name: "Disputa de pênaltis",
    desc: "Escolha o canto e engane o goleiro. Cinco cobranças para mostrar sangue frio.",
    icon: "shield",
    skill: "Frieza",
    difficulty: "Médio"
  },
  {
    id: "reflex",
    name: "Reflexos de goleiro",
    desc: "Espere o sinal e reaja o mais rápido possível. Treino ideal para defesas impossíveis.",
    icon: "training",
    skill: "Reflexo",
    difficulty: "Difícil"
  }
];

export const renderTraining = () => {
  const stats = trainingStats();
  const total = Object.entries(stats).filter(([key]) => key !== "sessions").reduce((sum, [, value]) => sum + value, 0);
  return `
    <div class="screen">
      <div class="screen-head">
        <div class="screen-head-copy">
          <span class="eyebrow">CENTRO DE TREINAMENTO / EVOLUÇÃO</span>
          <h1 class="screen-title">Aperfeiçoe seu jogo</h1>
          <p class="screen-sub">Treinos rápidos para melhorar reflexos, finalização e frieza. Cada sessão rende XP, moedas e novos recordes.</p>
        </div>
        <div class="head-actions">
          <div class="coin-chip">${icon("training")} ${stats.sessions || 0} sessões</div>
          <div class="coin-chip">${icon("star")} ${formatCoins(total)} pts</div>
        </div>
      </div>
      <div class="training-grid">
        ${drills.map((drill, index) => {
          const best = stats[drill.id] || 0;
          return `
            <article class="training-card">
              <div class="training-art">
                <span class="training-no">0${index + 1}</span>
                <div class="training-icon">${icon(drill.icon)}</div>
                <span class="difficulty-pill">${drill.difficulty}</span>
              </div>
              <div class="training-copy">
                <span class="eyebrow">${drill.skill}</span>
                <h3>${drill.name}</h3>
                <p>${drill.desc}</p>
                <div class="training-best"><span>Melhor resultado</span><b>${best ? `${best} pts` : "Sem registro"}</b></div>
                <button class="primary-btn small-btn" data-training-start="${drill.id}">${icon("play")} Iniciar treino</button>
              </div>
            </article>`;
        }).join("")}
      </div>
      <div class="dashboard-grid" style="margin-top:14px">
        <div class="panel">
          <div class="panel-head"><h3>Plano de evolução</h3><span class="eyebrow">RECOMENDADO</span></div>
          <div class="panel-body">
            <div class="objective-list">
              <div class="objective"><span class="check">${icon("training")}</span><div><strong>Complete 3 sessões hoje</strong><small>${Math.min(3, stats.sessions || 0)} de 3 concluídas</small></div><em>+300 XP</em></div>
              <div class="objective"><span class="check">${icon("star")}</span><div><strong>Alcance 80 pontos em um treino</strong><small>Seu recorde geral: ${Math.max(stats.finishing || 0, stats.penalties || 0, stats.reflex || 0)} pontos</small></div><em>+500 moedas</em></div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Dica do treinador</h3></div>
          <div class="panel-body">
            <div class="coach-quote">"No futebol moderno, a diferença entre o bom e o grande jogador está na repetição. Treine os fundamentos até que eles se tornem instinto."<span>— Professor Almeida</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const finishDrill = (id, score, maxScore, app) => {
  const stats = trainingStats();
  const previous = stats[id] || 0;
  const normalized = Math.round((score / maxScore) * 100);
  stats[id] = Math.max(previous, normalized);
  stats.sessions = (stats.sessions || 0) + 1;
  const coins = 25 + normalized;
  addCoins(coins, true);
  addXp(Math.round(120 + normalized * 2));
  persist();
  app.audio.success();
  return { normalized, record: normalized > previous, coins };
};

const drillResult = (app, id, score, maxScore) => {
  const result = finishDrill(id, score, maxScore, app);
  document.getElementById("trainingStage").innerHTML = `
    <div class="drill-result">
      <div class="result-ring" style="--p:${result.normalized}"><b>${result.normalized}</b><span>PONTOS</span></div>
      <h3>${result.record ? "Novo recorde!" : "Treino concluído"}</h3>
      <p>${result.record ? "Você superou seu melhor resultado neste exercício." : "Continue repetindo para bater seu recorde."}</p>
      <div class="result-rewards"><span>${icon("coin")} +${result.coins} moedas</span><span>${icon("star")} +${Math.round(120 + result.normalized * 2)} XP</span></div>
      <div class="result-actions">
        <button class="ghost-btn" data-training-retry="${id}">${icon("play")} Jogar novamente</button>
        <button class="primary-btn" data-close-modal>${icon("check")} Concluir</button>
      </div>
    </div>`;
  document.querySelector("[data-training-retry]")?.addEventListener("click", () => openDrill(app, id));
};

const startFinishing = (app) => {
  let shot = 0;
  let score = 0;
  let target = 50;
  let marker = 0;
  let direction = 1;
  let running = true;
  const stage = document.getElementById("trainingStage");
  const render = () => {
    if (!document.getElementById("trainingMarker")) { running = false; return; }
    if (!running) return;
    marker += direction * 1.6;
    if (marker >= 100 || marker <= 0) direction *= -1;
    const el = document.getElementById("trainingMarker");
    if (el) el.style.left = `calc(${marker}% - 2px)`;
    requestAnimationFrame(render);
  };
  const update = () => {
    stage.innerHTML = `
      <div class="drill-head"><span>COBRANÇA ${shot + 1}/5</span><b>${score} PTS</b></div>
      <div class="goal-strip">
        <div class="goal-target" style="left:${target - 10}%;width:20%"></div>
        <div class="goal-marker" id="trainingMarker"></div>
      </div>
      <div class="drill-hint">Clique em <b>Chutar</b> quando o marcador estiver dentro da área iluminada.</div>
      <div class="drill-actions"><button class="primary-btn" id="trainingShoot" style="min-width:210px">${icon("ball")} Chutar</button></div>`;
    document.getElementById("trainingShoot").addEventListener("click", () => {
      if (!running) return;
      const distance = Math.abs(marker - target);
      if (distance <= 10) {
        score += Math.round(100 - distance * 7);
        app.audio.kick(0.75);
        app.audio.goal();
      } else {
        app.audio.post();
        app.audio.save();
      }
      shot += 1;
      if (shot >= 5) {
        running = false;
        drillResult(app, "finishing", score, 500);
      } else {
        target = 28 + Math.random() * 44;
        update();
      }
    });
  };
  update();
  requestAnimationFrame(render);
};

const startPenalties = (app) => {
  let shot = 0;
  let score = 0;
  const stage = document.getElementById("trainingStage");
  const update = () => {
    stage.innerHTML = `
      <div class="drill-head"><span>COBRANÇA ${shot + 1}/5</span><b>${score} GOLS</b></div>
      <div class="penalty-goal">
        ${[1, 2, 3, 4, 5].map((zone) => `<button class="penalty-zone" data-penalty-zone="${zone}"><span>${zone}</span></button>`).join("")}
        <div class="keeper">GK</div>
      </div>
      <div class="drill-hint">Escolha um dos cinco cantos para bater.</div>`;
    stage.querySelectorAll("[data-penalty-zone]").forEach((button) => {
      button.addEventListener("click", () => {
        const zone = Number(button.dataset.penaltyZone);
        const keeper = 1 + Math.floor(Math.random() * 5);
        const goal = keeper !== zone || Math.random() > 0.6;
        if (goal) {
          score += 100;
          app.audio.goal();
          button.classList.add("score");
        } else {
          app.audio.save();
          button.classList.add("saved");
        }
        button.querySelector("span").textContent = goal ? "GOL" : "DEF";
        shot += 1;
        setTimeout(() => {
          if (shot >= 5) drillResult(app, "penalties", score, 500);
          else update();
        }, 600);
      });
    });
  };
  update();
};

const startReflex = (app) => {
  let attempts = 0;
  let best = 9999;
  const stage = document.getElementById("trainingStage");
  const update = () => {
    stage.innerHTML = `
      <div class="drill-head"><span>TENTATIVA ${attempts + 1}/3</span><b>${best === 9999 ? "-" : `${best} ms`}</b></div>
      <div class="reflex-area" id="reflexArea">
        <button class="reflex-button waiting" id="reflexButton">${attempts === 0 ? "Clique para começar" : "Preparar..."}</button>
        <div class="drill-hint">Aguarde o botão ficar verde e reaja imediatamente.</div>
      </div>`;
    const button = document.getElementById("reflexButton");
    button.addEventListener("click", () => {
      if (button.classList.contains("waiting") && attempts === 0) {
        button.textContent = "Aguarde...";
        button.classList.remove("waiting");
        button.classList.add("armed");
        const delay = 900 + Math.random() * 2200;
        let start = 0;
        const timer = setTimeout(() => {
          button.textContent = "CHUTE!";
          button.classList.remove("armed");
          button.classList.add("go");
          start = performance.now();
          button.addEventListener("click", () => {
            if (!button.classList.contains("go")) return;
            const reaction = Math.round(performance.now() - start);
            best = Math.min(best, reaction);
            attempts += 1;
            app.audio.kick(0.5);
            if (attempts >= 3) {
              const score = Math.max(0, 100 - Math.round(best / 5));
              drillResult(app, "reflex", score, 100);
            } else {
              update();
            }
          }, { once: true });
        }, delay);
        button.addEventListener("click", () => {
          if (button.classList.contains("armed")) {
            clearTimeout(timer);
            toast("Cedo demais. Aguarde o sinal verde.");
            update();
          }
        }, { once: true });
      }
    });
  };
  update();
};

const openDrill = (app, id) => {
  const drill = drills.find((item) => item.id === id);
  openModal(modalShell(drill.name, `TREINO · ${drill.skill.toUpperCase()}`, `
    <div class="drill-shell">
      <div class="drill-stage" id="trainingStage"></div>
    </div>`,
  `<button class="ghost-btn" data-close-modal>${icon("close")} Encerrar treino</button>`));
  if (id === "finishing") startFinishing(app);
  if (id === "penalties") startPenalties(app);
  if (id === "reflex") startReflex(app);
};

export const bindTraining = (app) => {
  document.querySelectorAll("[data-training-start]").forEach((button) => {
    button.addEventListener("click", () => {
      app.audio.whistle(false);
      openDrill(app, button.dataset.trainingStart);
    });
  });
};
