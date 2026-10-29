import { FIELD, clamp, dist, angleTo, norm, randomRange } from "./match-utils.js";

export const shoot = (engine, player, mx, my, charge) => {
  const goal = { x: player.side === 0 ? FIELD.right : FIELD.left, y: FIELD.centerY };
  let targetY = goal.y;
  let targetX = goal.x;
  if (Math.abs(mx) + Math.abs(my) > 0.14) {
    const aim = norm(mx, my);
    targetY = clamp(goal.y + aim.y * 110, FIELD.centerY - FIELD.goalWidth * 0.43, FIELD.centerY + FIELD.goalWidth * 0.43);
    targetX = goal.x + aim.x * 18;
  } else {
    targetY = clamp(goal.y + randomRange(-58, 58), FIELD.centerY - FIELD.goalWidth * 0.42, FIELD.centerY + FIELD.goalWidth * 0.42);
  }
  const distance = Math.max(50, dist(player, { x: targetX, y: targetY }));
  const accuracy = 0.82 + player.player.shot / 500 - (player.stamina < 40 ? 0.12 : 0);
  if (Math.random() > accuracy) targetY += randomRange(-90, 90);
  const power = 690 + charge * 430 + player.player.shot * 1.9;
  const angle = angleTo(player, { x: targetX, y: targetY });
  engine.ball.owner = null;
  engine.ball.x = player.x + Math.cos(angle) * 13;
  engine.ball.y = player.y + Math.sin(angle) * 13;
  engine.ball.z = 2 + charge * 4;
  engine.ball.vx = Math.cos(angle) * power;
  engine.ball.vy = Math.sin(angle) * power;
  engine.ball.vz = 32 + charge * 96 + (distance < 250 ? 24 : 0);
  engine.ball.rotation = Math.random() * 5;
  engine.lastTouch = player;
  engine.ball.lastOwner = player;
  engine.stats[player.side === 0 ? "home" : "away"].shots += 1;
  engine.stats[player.side === 0 ? "home" : "away"].xg += clamp(0.75 - distance / 700, 0.04, 0.72);
  const perf = engine.performance.get(player.id);
  if (perf) perf.shots += 1;
  engine.audio.kick(charge);
  engine.say("shot");
  engine.shake = Math.max(engine.shake, 3 + charge * 4);
};

export const aiPass = (engine, player, mx, my, manual) => {
  const teammates = engine.players.filter((mate) => mate.side === player.side && mate.id !== player.id && !mate.sentOff);
  let best = null;
  let bestScore = -Infinity;
  const hasDirection = Math.abs(mx) + Math.abs(my) > 0.14;
  const aim = hasDirection ? norm(mx, my) : { x: player.side === 0 ? 1 : -1, y: 0 };
  teammates.forEach((mate) => {
    const direction = norm(mate.x - player.x, mate.y - player.y);
    const alignment = direction.x * aim.x + direction.y * aim.y;
    const space = Math.min(1, engine.nearestOpponentDistance(mate, player.side) / 95);
    const forward = player.side === 0 ? (mate.x - player.x) / 500 : (player.x - mate.x) / 500;
    const score = alignment * 2.8 + space * 0.6 + forward * 0.35 - Math.abs(dist(player, mate) - 220) / 800;
    if (score > bestScore) {
      bestScore = score;
      best = mate;
    }
  });
  if (!best) return;
  const target = { x: best.x + best.vx * 0.25, y: best.y + best.vy * 0.25 };
  const distance = dist(player, target);
  const angle = angleTo(player, target);
  const power = clamp(distance * 2.08, 290, 690);
  engine.ball.owner = null;
  engine.ball.x = player.x + Math.cos(angle) * 12;
  engine.ball.y = player.y + Math.sin(angle) * 12;
  engine.ball.z = 0;
  engine.ball.vx = Math.cos(angle) * power;
  engine.ball.vy = Math.sin(angle) * power;
  engine.ball.vz = 0;
  engine.lastTouch = player;
  engine.ball.lastOwner = player;
  engine.passTarget = best;
  engine.passTeam = player.side;
  engine.stats[player.side === 0 ? "home" : "away"].passes += 1;
  const perf = engine.performance.get(player.id);
  if (perf) perf.passes += 1;
  player.cooldown = 0.2;
  engine.audio.pass();
  if (manual) engine.say("pass");
  if (player.side === 0 && manual) engine.controlledId = best.id;
  if (player.side === 1 && manual && engine.isMultiplayer) engine.p2ControlledId = best.id;
};

export const slideTackle = (engine, player) => {
  player.slideTimer = 0.42;
  player.tackleCooldown = 0.9;
  player.slideAngle = Math.atan2(player.vy, player.vx) || (player.side === 0 ? 0 : Math.PI);
  const direction = { x: Math.cos(player.slideAngle), y: Math.sin(player.slideAngle) };
  player.vx += direction.x * 180;
  player.vy += direction.y * 180;
  engine.audio.tackle();
  const opponent = engine.players
    .filter((other) => other.side !== player.side && !other.sentOff)
    .sort((a, b) => dist(a, player) - dist(b, player))[0];
  if (!opponent || dist(opponent, player) > 42) return;
  const ballOwner = engine.ball.owner;
  const winChance = clamp(0.44 + player.player.defense / 260 - opponent.player.dribble / 500, 0.22, 0.82);
  const fromBehind = Math.cos(angleTo(opponent, player) - opponent.dir * 0.2) > 0.72;
  if (Math.random() < winChance && dist(engine.ball, player) < 60) {
    if (ballOwner) ballOwner.controlGrace = 0.5;
    engine.ball.owner = null;
    engine.ball.vx += direction.x * 150 + randomRange(-40, 40);
    engine.ball.vy += direction.y * 150 + randomRange(-40, 40);
    engine.lastTouch = player;
    const perf = engine.performance.get(player.id);
    if (perf) perf.tackles += 1;
    engine.say("tackle");
    if (fromBehind && Math.random() < 0.2) commitFoul(engine, player, opponent, true);
  } else if (fromBehind && Math.random() < 0.68) {
    commitFoul(engine, player, opponent, false);
  } else if (Math.random() < 0.18) {
    commitFoul(engine, player, opponent, false);
  }
};

export const commitFoul = (engine, offender, victim, fromBehind) => {
  if (engine.state !== "playing") return;
  const attackSide = victim.side;
  const attackingGoalX = attackSide === 0 ? FIELD.right : FIELD.left;
  const inBox = Math.abs(victim.x - attackingGoalX) < 150 && Math.abs(victim.y - FIELD.centerY) < 175;
  const stats = engine.stats[offender.side === 0 ? "home" : "away"];
  stats.fouls += 1;
  engine.audio.whistle(false);
  engine.say("foul");
  engine.events.push({ type: "foul", time: engine.time, side: offender.side });
  const yellow = inBox || fromBehind || Math.random() < 0.34;
  const red = fromBehind && Math.random() < 0.07;
  if (yellow) {
    offender.card = Math.max(offender.card, 1);
    stats.yellow += 1;
    stats.cards += 1;
    engine.audio.card();
    engine.say("yellow");
    engine.onEvent("card", { player: offender.name, side: offender.side, type: "yellow" });
  }
  if (red || offender.card >= 2) {
    offender.card = 2;
    offender.sentOff = true;
    stats.red += 1;
    stats.cards += 1;
    engine.audio.card();
    engine.say("red");
    engine.onEvent("card", { player: offender.name, side: offender.side, type: "red" });
    offender.slideTimer = 0;
    offender.x = -1000;
    offender.y = -1000;
  }
  if (engine.ball.owner) engine.ball.owner.controlGrace = 0.6;
  engine.ball.owner = null;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  if (inBox) {
    setPenalty(engine, attackSide, victim);
  } else {
    engine.setRestart("foul", victim.side, victim.x, victim.y, 1.15);
  }
};

export const setPenalty = (engine, side, taker) => {
  engine.state = "penalty";
  engine.penalty = {
    side,
    taker,
    keeper: engine.players.find((player) => player.side !== side && player.isGK),
    timer: 0,
    phase: "ready",
    targetY: FIELD.centerY,
    targetX: side === 0 ? FIELD.right - 112 : FIELD.left + 112,
    aim: 0,
    auto: side === 1,
    shot: null,
    result: null,
    dive: 0,
    save: false
  };
  engine.ball.owner = null;
  engine.ball.x = side === 0 ? FIELD.right - 112 : FIELD.left + 112;
  engine.ball.y = FIELD.centerY;
  engine.ball.z = 0;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  taker.x = engine.ball.x + (side === 0 ? -24 : 24);
  taker.y = engine.ball.y;
  if (engine.penalty.keeper) {
    engine.penalty.keeper.x = side === 0 ? FIELD.right - 26 : FIELD.left + 26;
    engine.penalty.keeper.y = FIELD.centerY;
  }
  engine.message = { title: "PÊNALTI", subtitle: `${engine.teamName(side)} tem a chance de marcar`, tone: "warn" };
  engine.messageTimer = 2.3;
  engine.audio.whistle(false);
  engine.say("foul");
  engine.emitHud(true);
};

export const takePenalty = (engine, side, charge) => {
  const penalty = engine.penalty;
  if (!penalty || penalty.phase !== "ready") return;
  penalty.phase = "shot";
  penalty.timer = 0;
  const mx = side === 1 ? engine.input.p2x : engine.input.x;
  penalty.targetY = clamp(FIELD.centerY + mx * 72, FIELD.centerY - 55, FIELD.centerY + 55);
  if (Math.random() > 0.9) penalty.targetY += randomRange(-34, 34);
  penalty.targetX = side === 0 ? FIELD.right + 2 : FIELD.left - 2;
  penalty.shot = { y: penalty.targetY, power: 0.7 + Math.min(0.3, charge || 0.5) };
  penalty.dive = Math.random() > 0.5 ? 1 : -1;
  const keeperSkill = penalty.keeper ? penalty.keeper.rating / 100 : 0.75;
  const saveChance = clamp(0.27 - (penalty.taker.player.shot - 70) / 350 + keeperSkill * 0.18, 0.1, 0.44);
  penalty.save = Math.random() < saveChance;
  if (penalty.save) penalty.targetY = FIELD.centerY + penalty.dive * 45;
  engine.audio.kick(0.9);
  engine.audio.say("shot");
  engine.emitHud(true);
};

export const updatePenalty = (engine, dt) => {
  const penalty = engine.penalty;
  if (!penalty) return;
  penalty.timer += dt;
  if (penalty.phase === "ready") {
    const side = penalty.side;
    const mx = side === 1 ? engine.input.p2x : engine.input.x;
    if (Math.abs(mx) > 0.15) penalty.aim = mx;
    if (!penalty.auto && side === 0 && engine.input.shootCharging) return;
    if (penalty.auto && penalty.timer > 1.7) {
      takePenalty(engine, true, 0.7);
      return;
    }
    if (penalty.timer > 4.6) takePenalty(engine, side === 1, 0.6);
    return;
  }
  if (penalty.phase === "shot") {
    const t = clamp(penalty.timer / 0.48, 0, 1);
    const startX = penalty.side === 0 ? FIELD.right - 112 : FIELD.left + 112;
    engine.ball.x = startX + (penalty.targetX - startX) * t;
    engine.ball.y = FIELD.centerY + (penalty.targetY - FIELD.centerY) * t;
    engine.ball.z = Math.sin(t * Math.PI) * 24 + t * 35;
    engine.ball.rotation += dt * 18;
    if (penalty.keeper) {
      penalty.keeper.y = FIELD.centerY + penalty.dive * 50 * clamp(t * 1.4, 0, 1);
      penalty.keeper.x = penalty.side === 0 ? FIELD.right - 28 - t * 12 : FIELD.left + 28 + t * 12;
    }
    if (t >= 1) {
      penalty.phase = "result";
      penalty.timer = 0;
      if (penalty.save) {
        penalty.result = "save";
        engine.audio.save();
        engine.say("save");
        engine.stats[penalty.side === 0 ? "away" : "home"].saves += 1;
        engine.stats[penalty.side === 0 ? "home" : "away"].onTarget += 1;
        engine.message = { title: "DEFENDEU!", subtitle: `O goleiro salva o pênalti de ${penalty.taker.shortName}`, tone: "good" };
      } else {
        penalty.result = "goal";
        engine.scoreGoal(penalty.taker, penalty.side, true);
      }
      engine.messageTimer = 2.3;
    }
    return;
  }
  if (penalty.phase === "result" && penalty.timer > 1.65) {
    if (penalty.result === "save") {
      if (engine.half > 1 && engine.time >= 5400) engine.endMatch();
      else engine.kickoff(penalty.side === 0 ? 1 : 0);
    }
    engine.penalty = null;
  }
};
