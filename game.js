(() => {
  "use strict";

  const COLS = 28;
  const ROWS = 31;
  const TILE = 24;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const MAZE_SCALE = 2;

  const BASE_MAP = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.#####.##.#####.######",
    "######.#####.##.#####.######",
    "######.##          ##.######",
    "######.## ###==### ##.######",
    "######.## #      # ##.######",
    "..........#      #..........",
    "######.## #      # ##.######",
    "######.## ######## ##.######",
    "######.##          ##.######",
    "######.## ######## ##.######",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#.####.#####.##.#####.####.#",
    "#o..##.......  .......##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################"
  ];

  const DIRS = {
    up: { x: 0, y: -1 },
    left: { x: -1, y: 0 },
    down: { x: 0, y: 1 },
    right: { x: 1, y: 0 }
  };
  const DIR_LIST = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const gameShell = document.getElementById("gameShell");
  const stage = document.querySelector(".stage");
  const overlay = document.getElementById("overlay");
  const primaryBtn = document.getElementById("primaryBtn");
  const overlayMeta = document.getElementById("overlayMeta");
  const logoText = overlay.querySelector(".logo-text");
  const tagline = overlay.querySelector(".tagline");
  const kicker = overlay.querySelector(".kicker");
  const tips = overlay.querySelector(".tips");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const livesEl = document.getElementById("lives");
  const levelLabel = document.getElementById("levelLabel");
  const soundBtn = document.getElementById("soundBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const tiltBtn = document.getElementById("tiltBtn");
  const swipeHintBtn = document.getElementById("swipeHintBtn");
  const toastEl = document.getElementById("toast");
  const levelBanner = document.getElementById("levelBanner");
  const levelBannerNum = document.getElementById("levelBannerNum");
  const pauseIcon = pauseBtn.innerHTML;
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z"/></svg>';

  const isTouch = matchMedia("(pointer: coarse)").matches;
  const controlHint = isTouch
    ? "SWIPE THE MAZE OR USE THE D-PAD"
    : "ARROW KEYS / WASD TO STEER";

  let state = "title";
  let score = 0;
  let hasShownOverlay = false;
  let highScore = readHighScore();
  let level = 1;
  let lives = 3;
  let time = 0;
  let readyTimer = 0;
  let stateTimer = 0;
  let deathTimer = 0;
  let frightenedTimer = 0;
  let ghostCombo = 0;
  let shake = 0;
  let flash = 0;
  let flashColor = "88, 221, 255";
  let dots = [];
  let dotsLeft = 0;
  let pelletsEaten = 0;
  let pac = null;
  let ghosts = [];
  let particles = [];
  let popups = [];
  let rings = [];
  let mazeTexture = null;
  let toastTimer = 0;
  let lastWaka = -1;
  let wakaFlip = false;
  let audio = null;
  let soundOn = true;
  let tiltEnabled = false;
  let tiltBaseline = null;
  let tiltLast = null;
  let tiltTimer = null;
  let swipeStart = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pad(value, length = 6) {
    return String(Math.max(0, Math.floor(value))).padStart(length, "0");
  }

  function readHighScore() {
    try {
      const stored = Number(localStorage.getItem("pacman-neon-high") || 0);
      return Number.isFinite(stored) ? stored : 0;
    } catch (error) {
      return 0;
    }
  }

  function writeHighScore() {
    try {
      localStorage.setItem("pacman-neon-high", String(highScore));
    } catch (error) {
      void error;
    }
  }

  function tileAt(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return "#";
    return BASE_MAP[r][c];
  }

  function isWalkable(c, r, ghost = false) {
    if (r === 14 && (c < 0 || c >= COLS)) return true;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const tile = BASE_MAP[r][c];
    if (tile === "#") return false;
    if (tile === "=") return ghost;
    return true;
  }

  function isWall(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    return BASE_MAP[r][c] === "#";
  }

  function tileCenter(c, r) {
    return { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
  }

  function wrapActor(actor) {
    if (actor.x <= -1) actor.x = COLS - 1;
    if (actor.x >= COLS) actor.x = 0;
  }

  function setupDots() {
    dots = [];
    dotsLeft = 0;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const tile = BASE_MAP[r][c];
        if (tile === "." || tile === "o") {
          dots.push({ c, r, power: tile === "o" });
          dotsLeft += 1;
        }
      }
    }
    pelletsEaten = 0;
  }

  function resetActors() {
    pac = {
      x: 13,
      y: 23,
      dir: { ...DIRS.left },
      desired: { ...DIRS.left },
      speed: 7.2,
      moving: true,
      ghost: false,
      angle: Math.PI
    };

    ghosts = [
      makeGhost("blinky", "Blinky", "#ff546e", 13, 11, 0, 0.08),
      makeGhost("pinky", "Pinky", "#ff77c8", 13, 13, 1.8, 2.1),
      makeGhost("inky", "Inky", "#58ddff", 12, 14, 5.2, 3.7),
      makeGhost("clyde", "Clyde", "#ffa640", 15, 14, 8.2, 5.3)
    ];

    frightenedTimer = 0;
    ghostCombo = 0;
    deathTimer = 0;
    shake = 0;
    flash = 0;
    particles = [];
    popups = [];
    rings = [];
  }

  function makeGhost(id, name, color, x, y, releaseDelay, phase) {
    const delay = Math.max(0, releaseDelay - (level - 1) * 0.35);
    return {
      id,
      name,
      color,
      x,
      y,
      homeX: x,
      homeY: y,
      dir: { ...DIRS.left },
      state: releaseDelay <= 0 ? "normal" : "house",
      releaseDelay: delay,
      houseTime: 0,
      speed: 5.1 + level * 0.16,
      phase,
      ghost: true,
      angle: Math.PI
    };
  }

  function resetLevel() {
    setupDots();
    resetActors();
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = pad(score);
    highScoreEl.textContent = pad(highScore);
    levelLabel.textContent = `LVL ${String(level).padStart(2, "0")}`;

    const total = Math.max(3, lives);
    if (livesEl.children.length !== total) {
      livesEl.innerHTML = "";
      for (let i = 0; i < total; i += 1) {
        const life = document.createElement("span");
        life.className = "life";
        livesEl.appendChild(life);
      }
    }
    [...livesEl.children].forEach((life, index) => {
      life.classList.toggle("is-lost", index >= lives);
    });
    livesEl.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"}`);
    highScore = Math.max(highScore, score);
    highScoreEl.textContent = pad(highScore);
  }

  function setDirection(name) {
    if (!DIRS[name] || !pac) return;
    pac.desired = { ...DIRS[name] };
    if (state === "title" || state === "gameover") return;
    if (state === "paused") return;
  }

  function stepActor(actor, dt, onCenter, ghost = false) {
    let remaining = actor.speed * dt;
    let guard = 0;
    actor.moving = false;

    while (remaining > 0.000001 && guard < 16) {
      guard += 1;
      const centerX = Math.round(actor.x);
      const centerY = Math.round(actor.y);
      const atCenter =
        Math.abs(actor.x - centerX) < 0.00001 &&
        Math.abs(actor.y - centerY) < 0.00001;

      if (atCenter) {
        actor.x = centerX;
        actor.y = centerY;
        onCenter(actor);
        if (!actor.dir || !isWalkable(centerX + actor.dir.x, centerY + actor.dir.y, ghost)) {
          break;
        }
      }

      let distance;
      if (actor.dir.x !== 0) {
        const next = actor.dir.x > 0 ? Math.floor(actor.x + 0.000001) + 1 : Math.ceil(actor.x - 0.000001) - 1;
        distance = Math.abs(next - actor.x);
      } else {
        const next = actor.dir.y > 0 ? Math.floor(actor.y + 0.000001) + 1 : Math.ceil(actor.y - 0.000001) - 1;
        distance = Math.abs(next - actor.y);
      }

      if (distance < 0.000001) distance = 1;
      const movement = Math.min(remaining, distance);
      actor.x += actor.dir.x * movement;
      actor.y += actor.dir.y * movement;
      remaining -= movement;
      actor.moving = true;

      if (movement >= distance - 0.000001) {
        actor.x = Math.round(actor.x);
        actor.y = Math.round(actor.y);
        wrapActor(actor);
      }
    }

    if (actor.dir) actor.angle = Math.atan2(actor.dir.y, actor.dir.x);
  }

  function steerPac() {
    if (!pac) return;
    const nextC = Math.round(pac.x) + pac.desired.x;
    const nextR = Math.round(pac.y) + pac.desired.y;
    if (isWalkable(nextC, nextR, false)) {
      pac.dir = { ...pac.desired };
    }
  }

  function reversed(dir) {
    return { x: -dir.x, y: -dir.y };
  }

  function chooseGhostDirection(ghost) {
    const c = Math.round(ghost.x);
    const r = Math.round(ghost.y);
    const options = DIR_LIST.filter((dir) => isWalkable(c + dir.x, r + dir.y, true));
    let forward = options.filter(
      (dir) => !(ghost.dir && dir.x === -ghost.dir.x && dir.y === -ghost.dir.y)
    );
    if (forward.length === 0) forward = options;
    if (forward.length === 0) return;

    if (ghost.state === "eaten") {
      ghost.dir = bestDirection(c, r, 13, 13, forward);
      return;
    }

    if (ghost.state === "leaving") {
      ghost.dir = bestDirection(c, r, 13, 11, forward);
      return;
    }

    if (frightenedTimer > 0) {
      ghost.dir = forward[Math.floor(Math.random() * forward.length)];
      return;
    }

    const target = ghostTarget(ghost);
    ghost.dir = bestDirection(c, r, target.c, target.r, forward);
  }

  function ghostTarget(ghost) {
    if (!pac) return { c: 13, r: 23 };
    const pc = clamp(Math.round(pac.x), 0, COLS - 1);
    const pr = clamp(Math.round(pac.y), 0, ROWS - 1);

    if (ghost.id === "blinky") return { c: pc, r: pr };
    if (ghost.id === "pinky") {
      return safeTarget(pc + pac.dir.x * 3, pr + pac.dir.y * 3, pc, pr);
    }
    if (ghost.id === "inky") {
      const aheadC = pc + pac.dir.x * 2;
      const aheadR = pr + pac.dir.y * 2;
      const blinky = ghosts.find((entry) => entry.id === "blinky");
      const bc = blinky ? Math.round(blinky.x) : pc;
      const br = blinky ? Math.round(blinky.y) : pr;
      return safeTarget(aheadC * 2 - bc, aheadR * 2 - br, pc, pr);
    }
    const distance = Math.abs(pc - Math.round(ghost.x)) + Math.abs(pr - Math.round(ghost.y));
    if (distance > 7) return { c: pc, r: pr };
    return { c: 1, r: 29 };
  }

  function safeTarget(c, r, fallbackC, fallbackR) {
    const wrappedC = ((c % COLS) + COLS) % COLS;
    const wrappedR = clamp(r, 0, ROWS - 1);
    if (isWalkable(wrappedC, wrappedR, true)) return { c: wrappedC, r: wrappedR };
    return { c: fallbackC, r: fallbackR };
  }

  function bestDirection(c, r, targetC, targetR, options) {
    if (!isWalkable(targetC, targetR, true)) {
      return options[Math.floor(Math.random() * options.length)];
    }
    const distances = bfsDistances(targetC, targetR);
    let best = options[0];
    let bestDistance = Infinity;
    for (const dir of options) {
      let nc = c + dir.x;
      const nr = r + dir.y;
      if (nr === 14) {
        if (nc < 0) nc = COLS - 1;
        if (nc >= COLS) nc = 0;
      }
      const distance = distances[nr * COLS + nc];
      if (distance >= 0 && distance < bestDistance) {
        bestDistance = distance;
        best = dir;
      }
    }
    return best;
  }

  function bfsDistances(targetC, targetR) {
    const distances = new Int16Array(COLS * ROWS);
    distances.fill(-1);
    const queue = new Int32Array(COLS * ROWS);
    let head = 0;
    let tail = 0;
    const start = targetR * COLS + targetC;
    distances[start] = 0;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const c = index % COLS;
      const r = Math.floor(index / COLS);
      const distance = distances[index] + 1;

      for (const dir of DIR_LIST) {
        let nc = c + dir.x;
        let nr = r + dir.y;
        if (nr === 14) {
          if (nc < 0) nc = COLS - 1;
          if (nc >= COLS) nc = 0;
        }
        if (!isWalkable(nc, nr, true)) continue;
        const next = nr * COLS + nc;
        if (distances[next] !== -1) continue;
        distances[next] = distance;
        queue[tail++] = next;
      }
    }
    return distances;
  }

  function updatePac(dt) {
    pac.speed = 7.2 + Math.min(level - 1, 5) * 0.1;
    stepActor(pac, dt, steerPac, false);
    wrapActor(pac);

    const c = Math.round(pac.x);
    const r = Math.round(pac.y);
    const dot = dots.find((entry) => !entry.eaten && entry.c === c && entry.r === r);
    if (dot) {
      dot.eaten = true;
      dotsLeft -= 1;
      pelletsEaten += 1;
      addScore(dot.power ? 50 : 10);

      if (dot.power) {
        frightenedTimer = Math.max(frightenedTimer, 7.5);
        ghostCombo = 0;
        flash = 0.32;
        flashColor = "88, 221, 255";
        ghosts.forEach((ghost) => {
          if (ghost.state === "normal") {
            ghost.dir = reversed(ghost.dir);
          }
        });
        ringAt(pac.x, pac.y, "#58ddff", 0.2);
        Sound.power();
      } else {
        if (time - lastWaka > 0.045) {
          lastWaka = time;
          wakaFlip = !wakaFlip;
          Sound.waka(wakaFlip);
        }
        particleBurst(pac.x, pac.y, "#ffe9b3", 3, 0.55, 5);
      }

      if (dotsLeft === 0) {
        completeLevel();
      }
    }
  }

  function updateGhosts(dt) {
    for (const ghost of ghosts) {
      if (ghost.state === "house") {
        ghost.houseTime += dt;
        if (ghost.houseTime >= ghost.releaseDelay) {
          ghost.state = "leaving";
          ghost.dir = { ...DIRS.up };
        }
        continue;
      }

      if (ghost.state === "eaten") {
        ghost.speed = 9.4;
      } else if (ghost.state === "leaving") {
        ghost.speed = 4.4;
      } else if (frightenedTimer > 0) {
        ghost.speed = 2.7;
      } else {
        ghost.speed = 5.1 + level * 0.16;
      }

      stepActor(ghost, dt, chooseGhostDirection, true);
      wrapActor(ghost);

      if (
        ghost.state === "leaving" &&
        Math.round(ghost.x) === 13 &&
        Math.round(ghost.y) === 11
      ) {
        ghost.state = "normal";
      }

      if (ghost.state === "eaten" && Math.abs(ghost.x - 13) < 0.2 && Math.abs(ghost.y - 13) < 0.2) {
        ghost.state = "house";
        ghost.houseTime = -1.2;
        ghost.releaseDelay = 1.4;
        ghost.x = 13;
        ghost.y = 13;
        ghost.dir = { ...DIRS.up };
      }
    }
  }

  function checkCollisions() {
    if (state !== "playing" || readyTimer > 0) return;

    for (const ghost of ghosts) {
      if (ghost.state === "house" || ghost.state === "leaving" || ghost.state === "eaten") continue;
      const dx = pac.x - ghost.x;
      const dy = pac.y - ghost.y;
      if (dx * dx + dy * dy > 0.62 * 0.62) continue;

      if (frightenedTimer > 0) {
        eatGhost(ghost);
      } else {
        startDeath();
        return;
      }
    }
  }

  function eatGhost(ghost) {
    ghost.state = "eaten";
    ghost.dir = reversed(ghost.dir);
    const value = 200 * Math.pow(2, ghostCombo);
    ghostCombo = Math.min(ghostCombo + 1, 3);
    addScore(value);
    popupAt(ghost.x, ghost.y, String(value), "#8ee9ff");
    particleBurst(ghost.x, ghost.y, ghost.color, 14, 1, 14);
    ringAt(ghost.x, ghost.y, ghost.color, 0.08);
    flash = 0.14;
    flashColor = "255, 228, 95";
    shake = Math.max(shake, 3);
    Sound.eatGhost(ghostCombo);
  }

  function addScore(value) {
    score += value;
    if (score > highScore) {
      highScore = score;
    }
    updateHud();
  }

  function startDeath() {
    state = "dying";
    deathTimer = 0;
    lives -= 1;
    frightenedTimer = 0;
    ghostCombo = 0;
    shake = 8;
    flash = 0.18;
    flashColor = "255, 84, 110";
    updateHud();
    Sound.death();
  }

  function completeLevel() {
    state = "levelclear";
    stateTimer = 0;
    showLevelBanner(level + 1);
    flash = 0.25;
    flashColor = "255, 228, 95";
    Sound.levelClear();
  }

  function finishLevel() {
    level += 1;
    resetLevel();
    readyTimer = 2;
    state = "playing";
    updateHud();
  }

  function respawnAfterDeath() {
    if (lives <= 0) {
      endGame();
      return;
    }
    resetActors();
    readyTimer = 1.8;
    state = "playing";
    updateHud();
  }

  function endGame() {
    state = "gameover";
    writeHighScore();
    Sound.gameOver();
    showOverlay("gameover");
  }

  function startGame() {
    ensureAudio();
    score = 0;
    level = 1;
    lives = 3;
    resetLevel();
    readyTimer = 0.45;
    state = "playing";
    hideOverlay();
    updateHud();
    showLevelBanner(1);
    Sound.start();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      showOverlay("paused");
      pauseBtn.innerHTML = playIcon;
      pauseBtn.setAttribute("aria-label", "Resume game");
    } else if (state === "paused") {
      state = "playing";
      hideOverlay();
      pauseBtn.innerHTML = pauseIcon;
      pauseBtn.setAttribute("aria-label", "Pause game");
    }
  }

  function showOverlay(mode) {
    overlay.classList.add("is-visible");
    overlay.classList.remove("is-compact");
    const inner = overlay.querySelector(".overlay-inner");
    if (hasShownOverlay) {
      inner.classList.remove("is-changing");
      void inner.offsetWidth;
      inner.classList.add("is-changing");
    }
    hasShownOverlay = true;

    if (mode === "paused") {
      overlay.classList.add("is-compact");
      kicker.innerHTML = "<span></span> ARCADE CLASSIC <span></span>";
      logoText.textContent = "PAUSED";
      tagline.textContent = "THE GHOSTS WILL WAIT.";
      overlayMeta.textContent = "RESUME WHEN YOU ARE READY";
      setPrimaryLabel("RESUME");
      tips.style.display = "none";
    } else if (mode === "gameover") {
      overlay.classList.add("is-compact");
      kicker.innerHTML = "<span></span> RUN COMPLETE <span></span>";
      logoText.textContent = "GAME OVER";
      tagline.textContent = `SCORE ${pad(score)}`;
      overlayMeta.textContent = `HIGH SCORE ${pad(highScore)} · LEVEL ${String(level).padStart(2, "0")}`;
      setPrimaryLabel("PLAY AGAIN");
      tips.style.display = "none";
    } else {
      kicker.innerHTML = "<span></span> ARCADE CLASSIC <span></span>";
      logoText.textContent = "PAC-MAN";
      tagline.textContent = "CHASE. CHOMP. CHAIN.";
      overlayMeta.textContent = controlHint;
      setPrimaryLabel("PLAY");
      tips.style.display = "";
    }
  }

  function hideOverlay() {
    overlay.classList.remove("is-visible");
    tips.style.display = "";
    pauseBtn.innerHTML = pauseIcon;
    pauseBtn.setAttribute("aria-label", "Pause game");
  }

  function setPrimaryLabel(label) {
    primaryBtn.querySelector(".btn-label").textContent = label;
    primaryBtn.setAttribute(
      "aria-label",
      label.charAt(0) + label.slice(1).toLowerCase()
    );
  }

  function showLevelBanner(number) {
    levelBannerNum.textContent = String(number).padStart(2, "0");
    levelBanner.classList.remove("is-visible");
    void levelBanner.offsetWidth;
    levelBanner.classList.add("is-visible");
  }

  function showToast(message, duration = 2600) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, duration);
  }

  function particleBurst(x, y, color, count, power = 1, speed = 8) {
    const center = tileCenter(x, y);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 0.7 + 0.3) * speed * power;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * velocity * TILE * 0.22,
        vy: Math.sin(angle) * velocity * TILE * 0.22,
        life: 0.3 + Math.random() * 0.35,
        maxLife: 0.65,
        size: 1.5 + Math.random() * 2.6,
        color
      });
    }
  }

  function popupAt(x, y, text, color) {
    const center = tileCenter(x, y);
    popups.push({ x: center.x, y: center.y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function ringAt(x, y, color, strength = 0.15) {
    const center = tileCenter(x, y);
    rings.push({ x: center.x, y: center.y, radius: 4, life: 0.55, maxLife: 0.55, color, strength });
  }

  function updateEffects(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
    }
    particles = particles.filter((particle) => particle.life > 0);

    for (const popup of popups) {
      popup.life -= dt;
      popup.y -= 22 * dt;
    }
    popups = popups.filter((popup) => popup.life > 0);

    for (const ring of rings) {
      ring.life -= dt;
      ring.radius += 95 * dt;
    }
    rings = rings.filter((ring) => ring.life > 0);

    if (frightenedTimer > 0) {
      frightenedTimer = Math.max(0, frightenedTimer - dt);
      if (frightenedTimer === 0) ghostCombo = 0;
    }

    shake = Math.max(0, shake - dt * 18);
    flash = Math.max(0, flash - dt * 1.8);
  }

  function update(dt) {
    time += dt;

    if (state === "playing") {
      if (readyTimer > 0) {
        readyTimer = Math.max(0, readyTimer - dt);
        updateEffects(dt);
        return;
      }
      updatePac(dt);
      updateGhosts(dt);
      checkCollisions();
      updateEffects(dt);
    } else if (state === "dying") {
      deathTimer += dt;
      updateEffects(dt);
      if (deathTimer > 1.55) {
        respawnAfterDeath();
      }
    } else if (state === "levelclear") {
      stateTimer += dt;
      updateEffects(dt);
      if (stateTimer > 2.15) {
        finishLevel();
      }
    } else {
      updateEffects(dt);
    }
  }

  function buildMazeTexture() {
    const texture = document.createElement("canvas");
    texture.width = W * MAZE_SCALE;
    texture.height = H * MAZE_SCALE;
    const m = texture.getContext("2d");
    m.scale(MAZE_SCALE, MAZE_SCALE);

    const background = m.createLinearGradient(0, 0, W, H);
    background.addColorStop(0, "#050a1c");
    background.addColorStop(0.5, "#030612");
    background.addColorStop(1, "#06091a");
    m.fillStyle = background;
    m.fillRect(0, 0, W, H);

    const halo = m.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, W * 0.75);
    halo.addColorStop(0, "rgba(38, 66, 175, 0.13)");
    halo.addColorStop(0.58, "rgba(11, 20, 57, 0.04)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    m.fillStyle = halo;
    m.fillRect(0, 0, W, H);

    m.save();
    m.globalAlpha = 0.22;
    m.strokeStyle = "rgba(72, 114, 216, 0.14)";
    m.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r += 1) {
      m.beginPath();
      m.moveTo(0, r * TILE);
      m.lineTo(W, r * TILE);
      m.stroke();
    }
    for (let c = 1; c < COLS; c += 1) {
      m.beginPath();
      m.moveTo(c * TILE, 0);
      m.lineTo(c * TILE, H);
      m.stroke();
    }
    m.restore();

    const wallGradient = m.createLinearGradient(0, 0, 0, H);
    wallGradient.addColorStop(0, "#0b183c");
    wallGradient.addColorStop(0.52, "#07112c");
    wallGradient.addColorStop(1, "#091334");
    m.fillStyle = wallGradient;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (isWall(c, r)) {
          m.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
    }

    const edgePath = new Path2D();
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (!isWall(c, r)) continue;
        const x = c * TILE;
        const y = r * TILE;
        if (!isWall(c, r - 1)) {
          edgePath.moveTo(x, y);
          edgePath.lineTo(x + TILE, y);
        }
        if (!isWall(c + 1, r)) {
          edgePath.moveTo(x + TILE, y);
          edgePath.lineTo(x + TILE, y + TILE);
        }
        if (!isWall(c, r + 1)) {
          edgePath.moveTo(x, y + TILE);
          edgePath.lineTo(x + TILE, y + TILE);
        }
        if (!isWall(c - 1, r)) {
          edgePath.moveTo(x, y);
          edgePath.lineTo(x, y + TILE);
        }
      }
    }

    m.save();
    m.lineCap = "round";
    m.lineJoin = "round";
    m.shadowColor = "rgba(55, 125, 255, 0.9)";
    m.shadowBlur = 10;
    m.strokeStyle = "rgba(48, 107, 255, 0.38)";
    m.lineWidth = 4.3;
    m.stroke(edgePath);
    m.shadowBlur = 3;
    m.strokeStyle = "rgba(102, 157, 255, 0.83)";
    m.lineWidth = 1.25;
    m.stroke(edgePath);
    m.restore();

    const doorX = 13 * TILE;
    const doorY = 12 * TILE + TILE / 2;
    m.save();
    m.lineCap = "round";
    m.shadowColor = "rgba(255, 105, 194, 0.85)";
    m.shadowBlur = 9;
    m.strokeStyle = "rgba(255, 126, 204, 0.9)";
    m.lineWidth = 4;
    m.beginPath();
    m.moveTo(doorX, doorY);
    m.lineTo(doorX + TILE * 2, doorY);
    m.stroke();
    m.restore();

    m.save();
    m.globalAlpha = 0.42;
    m.fillStyle = "rgba(115, 158, 255, 0.12)";
    for (let r = 1; r < ROWS - 1; r += 1) {
      for (let c = 1; c < COLS - 1; c += 1) {
        if (isWall(c, r)) continue;
        const x = c * TILE;
        const y = r * TILE;
        m.fillRect(x + 1, y + 1, 1.1, 1.1);
        m.fillRect(x + TILE - 2.1, y + TILE - 2.1, 1.1, 1.1);
      }
    }
    m.restore();

    const vignette = m.createRadialGradient(W * 0.5, H * 0.46, W * 0.28, W * 0.5, H * 0.46, W * 0.82);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.36)");
    m.fillStyle = vignette;
    m.fillRect(0, 0, W, H);

    mazeTexture = texture;
  }

  function drawDots() {
    const pulse = 0.82 + Math.sin(time * 4.4) * 0.18;
    ctx.save();
    ctx.fillStyle = "rgba(255, 222, 132, 0.16)";
    for (const dot of dots) {
      if (dot.eaten || dot.power) continue;
      const p = tileCenter(dot.c, dot.r);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffe9af";
    for (const dot of dots) {
      if (dot.eaten || dot.power) continue;
      const p = tileCenter(dot.c, dot.r);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(255, 225, 130, 0.9)";
    for (const dot of dots) {
      if (dot.eaten || !dot.power) continue;
      const p = tileCenter(dot.c, dot.r);
      const radius = TILE * (0.17 + pulse * 0.025);
      const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius * 2.7);
      gradient.addColorStop(0, "#fff6c9");
      gradient.addColorStop(0.38, "#ffe06a");
      gradient.addColorStop(1, "rgba(255, 184, 34, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#fff4bb";
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawPac() {
    if (!pac) return;
    if (state === "gameover") return;
    const p = tileCenter(pac.x, pac.y);
    const r = TILE * 0.46;
    let mouth = 0.09 + (pac.moving ? 0.26 : 0.06) * (0.5 + 0.5 * Math.sin(time * 17));
    let alpha = 1;

    if (state === "dying") {
      const progress = clamp(deathTimer / 1.15, 0, 1);
      mouth = 0.06 + progress * Math.PI * 0.97;
      alpha = 1 - clamp((deathTimer - 0.9) / 0.55, 0, 1);
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(pac.angle || 0);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(255, 220, 54, 0.75)";
    ctx.shadowBlur = 18;
    const gradient = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, "#fff9bd");
    gradient.addColorStop(0.5, "#ffe75f");
    gradient.addColorStop(1, "#f6bb12");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 248, 170, 0.48)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawGhost(ghost) {
    const p = tileCenter(ghost.x, ghost.y);
    const r = TILE * 0.41;
    const bob = ghost.state === "house" ? Math.sin(time * 4 + ghost.phase) * 1.4 : Math.sin(time * 7 + ghost.phase) * 0.55;
    const frightened = frightenedTimer > 0 && ghost.state !== "eaten" && ghost.state !== "leaving";
    const flashing = frightened && frightenedTimer < 2 && Math.floor(time * 8) % 2 === 0;
    const color = frightened ? (flashing ? "#f4f7ff" : "#2d5bff") : ghost.color;

    ctx.save();
    ctx.translate(p.x, p.y + bob);

    if (ghost.state === "eaten") {
      ctx.shadowColor = "rgba(150, 220, 255, 0.6)";
      ctx.shadowBlur = 9;
      drawGhostEyes(r, ghost.dir, false);
      ctx.restore();
      return;
    }

    ctx.shadowColor = frightened ? "rgba(63, 121, 255, 0.7)" : hexToRgba(ghost.color, 0.72);
    ctx.shadowBlur = frightened ? 15 : 11;

    const gradient = ctx.createLinearGradient(0, -r, 0, r * 1.1);
    gradient.addColorStop(0, lighten(color, 0.24));
    gradient.addColorStop(0.58, color);
    gradient.addColorStop(1, darken(color, 0.22));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.03);
    ctx.arc(0, -r * 0.03, r, Math.PI, 0);
    ctx.lineTo(r, r * 0.74);
    ctx.quadraticCurveTo(r * 0.66, r * 1.04, r * 0.34, r * 0.77);
    ctx.quadraticCurveTo(0, r * 0.53, -r * 0.34, r * 0.77);
    ctx.quadraticCurveTo(-r * 0.66, r * 1.04, -r, r * 0.74);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    if (frightened) {
      ctx.fillStyle = flashing ? "#2d5bff" : "#f6f8ff";
      const eyeR = r * 0.12;
      ctx.beginPath();
      ctx.arc(-r * 0.34, -r * 0.18, eyeR, 0, Math.PI * 2);
      ctx.arc(r * 0.34, -r * 0.18, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = flashing ? "#2d5bff" : "#f6f8ff";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-r * 0.58, r * 0.36);
      for (let i = 0; i < 4; i += 1) {
        const x = -r * 0.58 + i * r * 0.39;
        ctx.lineTo(x + r * 0.2, r * (i % 2 === 0 ? 0.2 : 0.46));
        ctx.lineTo(x + r * 0.39, r * 0.36);
      }
      ctx.stroke();
    } else {
      drawGhostEyes(r, ghost.dir, false);
    }
    ctx.restore();
  }

  function drawGhostEyes(r, dir, eaten) {
    const lookX = dir ? dir.x * r * 0.1 : 0;
    const lookY = dir ? dir.y * r * 0.1 : 0;
    for (const side of [-1, 1]) {
      ctx.fillStyle = eaten ? "rgba(205, 240, 255, 0.92)" : "#f8fbff";
      ctx.beginPath();
      ctx.ellipse(side * r * 0.35 + lookX, -r * 0.18 + lookY, r * 0.29, r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eaten ? "#5cc9ff" : "#1a2550";
      ctx.beginPath();
      ctx.arc(side * r * 0.35 + lookX * 1.8, -r * 0.16 + lookY * 1.8, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEffects() {
    ctx.save();
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (const ring of rings) {
      const progress = 1 - ring.life / ring.maxLife;
      ctx.globalAlpha = (1 - progress) * 0.75;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2 - progress;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "900 13px 'Courier New', monospace";
    for (const popup of popups) {
      const alpha = clamp(popup.life / popup.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = popup.color;
      ctx.shadowColor = popup.color;
      ctx.shadowBlur = 9;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.restore();
  }

  function drawReady() {
    if (state === "playing" && readyTimer > 0) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 18px 'Courier New', monospace";
      ctx.fillStyle = "#ffe45f";
      ctx.shadowColor = "rgba(255, 213, 67, 0.8)";
      ctx.shadowBlur = 16;
      ctx.fillText("READY!", W / 2, 17.12 * TILE);
      ctx.shadowBlur = 0;
      ctx.font = "800 8px 'Courier New', monospace";
      ctx.fillStyle = "rgba(136, 160, 214, 0.8)";
      ctx.fillText(isTouch ? "SWIPE OR USE THE D-PAD" : "ARROW KEYS / WASD", W / 2, 18.02 * TILE);
      ctx.restore();
    }
  }

  function drawLevelComplete() {
    if (state !== "levelclear") return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 17px 'Courier New', monospace";
    ctx.fillStyle = "#8ee9ff";
    ctx.shadowColor = "rgba(88, 221, 255, 0.8)";
    ctx.shadowBlur = 16;
    ctx.fillText("MAZE CLEAR", W / 2, 17.12 * TILE);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    if (mazeTexture) {
      ctx.drawImage(mazeTexture, 0, 0, W, H);
    }

    drawDots();
    drawEffects();

    for (const ghost of ghosts) {
      drawGhost(ghost);
    }
    drawPac();
    drawReady();
    drawLevelComplete();

    if (flash > 0) {
      ctx.fillStyle = `rgba(${flashColor}, ${flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function loop(now) {
    if (!loop.last) loop.last = now;
    const dt = Math.min(0.035, (now - loop.last) / 1000);
    loop.last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function fitShell() {
    const rect = stage.getBoundingClientRect();
    const availableW = Math.max(180, rect.width - 4);
    const availableH = Math.max(200, rect.height - 4);
    const scale = Math.min(availableW / COLS, availableH / ROWS);
    const width = Math.floor(COLS * scale);
    const height = Math.floor(ROWS * scale);
    gameShell.style.width = `${width}px`;
    gameShell.style.height = `${height}px`;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.imageSmoothingEnabled = true;
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function lighten(hex, amount) {
    const value = hex.replace("#", "");
    const r = Math.round(parseInt(value.slice(0, 2), 16) + (255 - parseInt(value.slice(0, 2), 16)) * amount);
    const g = Math.round(parseInt(value.slice(2, 4), 16) + (255 - parseInt(value.slice(2, 4), 16)) * amount);
    const b = Math.round(parseInt(value.slice(4, 6), 16) + (255 - parseInt(value.slice(4, 6), 16)) * amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function darken(hex, amount) {
    const value = hex.replace("#", "");
    const r = Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount));
    const g = Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount));
    const b = Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  const Sound = {
    context: null,
    master: null,

    ensure() {
      if (!soundOn) return null;
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.72;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") {
        this.context.resume();
      }
      return this.context;
    },

    tone(frequency, duration, type = "square", volume = 0.04, endFrequency = null, delay = 0) {
      if (!soundOn) return;
      const context = this.ensure();
      if (!context) return;
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    },

    waka(flip) {
      this.tone(flip ? 415 : 325, 0.055, "triangle", 0.025, flip ? 505 : 390);
    },

    power() {
      this.tone(180, 0.35, "sawtooth", 0.035, 640);
      this.tone(360, 0.25, "triangle", 0.025, 820, 0.04);
    },

    eatGhost(chain) {
      const base = 380 + chain * 100;
      this.tone(base, 0.1, "square", 0.04, base * 1.5);
      this.tone(base * 1.5, 0.12, "triangle", 0.03, base * 2.1, 0.07);
    },

    death() {
      this.tone(620, 0.4, "sawtooth", 0.04, 150);
      this.tone(250, 0.5, "triangle", 0.03, 70, 0.3);
    },

    start() {
      const notes = [330, 392, 494, 659, 784];
      notes.forEach((note, index) => {
        this.tone(note, 0.13, "square", 0.027, note * 1.04, index * 0.11);
      });
    },

    levelClear() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((note, index) => {
        this.tone(note, 0.18, "triangle", 0.032, note * 1.03, index * 0.1);
      });
    },

    gameOver() {
      const notes = [392, 330, 262, 196];
      notes.forEach((note, index) => {
        this.tone(note, 0.28, "sawtooth", 0.03, note * 0.82, index * 0.19);
      });
    }
  };

  function ensureAudio() {
    Sound.ensure();
  }

  function toggleSound() {
    soundOn = !soundOn;
    soundBtn.classList.toggle("is-muted", !soundOn);
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) {
      ensureAudio();
      Sound.tone(660, 0.09, "triangle", 0.03, 880);
      showToast("Sound on");
    } else {
      showToast("Sound off");
    }
  }

  async function toggleTilt() {
    if (!window.DeviceOrientationEvent) {
      showToast("Tilt is not available on this device. Use the D-pad.", 3200);
      return;
    }

    if (tiltEnabled) {
      disableTilt();
      showToast("Tilt off");
      return;
    }

    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          showToast("Motion access was not granted. D-pad and swipe still work.", 3600);
          return;
        }
      }
      enableTilt();
    } catch (error) {
      showToast("Motion permission is unavailable. Use the D-pad or swipe.", 3600);
      void error;
    }
  }

  function enableTilt() {
    tiltEnabled = true;
    tiltBaseline = null;
    tiltLast = null;
    window.addEventListener("deviceorientation", handleTilt, true);
    tiltBtn.classList.add("is-active");
    tiltBtn.setAttribute("aria-pressed", "true");
    showToast("Tilt on — hold your phone comfortably", 3000);
    clearTimeout(tiltTimer);
    tiltTimer = setTimeout(() => {
      if (tiltEnabled && !tiltBaseline) {
        showToast("No motion data detected. Use the D-pad or swipe.", 3400);
      }
    }, 3200);
  }

  function disableTilt() {
    tiltEnabled = false;
    window.removeEventListener("deviceorientation", handleTilt, true);
    tiltBtn.classList.remove("is-active");
    tiltBtn.setAttribute("aria-pressed", "false");
    clearTimeout(tiltTimer);
  }

  function handleTilt(event) {
    if (!tiltEnabled || event.beta == null || event.gamma == null) return;
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    let pitch = event.beta;
    let roll = event.gamma;

    if (angle === 90) {
      pitch = event.gamma;
      roll = -event.beta;
    } else if (angle === -90 || angle === 270) {
      pitch = -event.gamma;
      roll = event.beta;
    } else if (Math.abs(angle) === 180) {
      pitch = -event.beta;
      roll = -event.gamma;
    }

    if (!tiltBaseline) {
      tiltBaseline = { pitch, roll };
      return;
    }

    const dp = pitch - tiltBaseline.pitch;
    const dr = roll - tiltBaseline.roll;
    const threshold = 13;
    let direction = null;

    if (Math.abs(dp) > Math.abs(dr)) {
      if (dp < -threshold) direction = "up";
      else if (dp > threshold) direction = "down";
    } else {
      if (dr > threshold) direction = "right";
      else if (dr < -threshold) direction = "left";
    }

    if (direction && direction !== tiltLast) {
      tiltLast = direction;
      setDirection(direction);
    }
  }

  function pointerDirection(event) {
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? "right" : "left");
    } else {
      setDirection(dy > 0 ? "down" : "up");
    }
    swipeStart = { x: event.clientX, y: event.clientY };
  }

  function bindControls() {
    document.querySelectorAll(".dpad-btn").forEach((button) => {
      const direction = button.dataset.dir;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.classList.add("is-pressed");
        button.setPointerCapture(event.pointerId);
        setDirection(direction);
        ensureAudio();
      });
      const release = () => button.classList.remove("is-pressed");
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    });

    canvas.addEventListener("pointerdown", (event) => {
      if (state === "title" || state === "gameover" || state === "paused") return;
      swipeStart = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!swipeStart) return;
      pointerDirection(event);
    });

    const endSwipe = () => {
      swipeStart = null;
    };
    canvas.addEventListener("pointerup", endSwipe);
    canvas.addEventListener("pointercancel", endSwipe);

    primaryBtn.addEventListener("click", () => {
      ensureAudio();
      if (state === "paused") {
        togglePause();
      } else if (state === "title" || state === "gameover") {
        startGame();
      }
    });

    pauseBtn.addEventListener("click", () => {
      if (state === "playing" || state === "paused") togglePause();
    });

    soundBtn.addEventListener("click", toggleSound);
    tiltBtn.addEventListener("click", toggleTilt);

    swipeHintBtn.addEventListener("click", () => {
      if (!isTouch) {
        showToast("ARROW KEYS / WASD TO STEER · P PAUSE · M MUTE", 3800);
      } else if (state === "title") {
        showToast("PLAY, THEN SWIPE THE MAZE OR USE THE D-PAD", 3600);
      } else {
        showToast("SWIPE THE MAZE · D-PAD TO STEER · TILT FOR MOTION", 3800);
      }
    });

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const keyMap = {
        arrowup: "up",
        w: "up",
        arrowleft: "left",
        a: "left",
        arrowdown: "down",
        s: "down",
        arrowright: "right",
        d: "right"
      };
      if (keyMap[key]) {
        event.preventDefault();
        setDirection(keyMap[key]);
        return;
      }
      if (key === " " || key === "enter") {
        if (state === "title" || state === "gameover") {
          event.preventDefault();
          ensureAudio();
          startGame();
        } else if (key === " ") {
          event.preventDefault();
          togglePause();
        }
      }
      if (key === "p" || key === "escape") {
        event.preventDefault();
        togglePause();
      }
      if (key === "m") {
        event.preventDefault();
        toggleSound();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "playing") {
        togglePause();
      }
    });

    stage.addEventListener("contextmenu", (event) => event.preventDefault());

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => fitShell());
      observer.observe(stage);
    }
    window.addEventListener("resize", fitShell);
    window.addEventListener("pagehide", writeHighScore);
    window.addEventListener("orientationchange", () => {
      setTimeout(fitShell, 80);
      tiltBaseline = null;
    });

    if (!isTouch) {
      swipeHintBtn.setAttribute("aria-label", "Show keyboard controls");
    }
  }

  function init() {
    buildMazeTexture();
    resetLevel();
    bindControls();
    fitShell();
    showOverlay("title");
    highScoreEl.textContent = pad(highScore);
    requestAnimationFrame(loop);
  }

  init();
})();
