import { FIELD, clamp, lerp, dist, norm, randomRange } from "./match-utils.js";
import { aiPass, shoot, slideTackle, commitFoul } from "./match-actions.js";

export const closestToBall = (engine, side) => {
  let closest = null;
  let best = Infinity;
  engine.players.forEach((player) => {
    if (player.side === side && !player.sentOff && !player.isGK) {
      const distance = dist(player, engine.ball);
      if (distance < best) {
        best = distance;
        closest = player;
      }
    }
  });
  return closest;
};

export const secondClosestToBall = (engine, side) => {
  const sorted = engine.players
    .filter((player) => player.side === side && !player.sentOff && !player.isGK)
    .sort((a, b) => dist(a, engine.ball) - dist(b, engine.ball));
  return sorted[1] || null;
};

const moveUserPlayer = (engine, player, dt) => {
  const mx = player.moveX || 0;
  const my = player.moveY || 0;
  const magnitude = Math.hypot(mx, my);
  if (magnitude > 0.08) {
    const direction = { x: mx / Math.max(1, magnitude), y: my / Math.max(1, magnitude) };
    const sprintFactor = player.sprinting && player.stamina > 16 ? 1.38 : 1;
    const pace = 74 + player.player.pace * 0.38;
    const speed = pace * sprintFactor * (engine.ball.owner === player ? 0.94 : 1);
    player.vx = lerp(player.vx, direction.x * speed, clamp(dt * 11, 0, 1));
    player.vy = lerp(player.vy, direction.y * speed, clamp(dt * 11, 0, 1));
    player.dir = direction.x >= 0 ? 1 : -1;
  } else {
    player.vx = lerp(player.vx, 0, clamp(dt * 9, 0, 1));
    player.vy = lerp(player.vy, 0, clamp(dt * 9, 0, 1));
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
};

const moveAIPlayer = (engine, player, dt, frozen) => {
  if (frozen) {
    player.vx = lerp(player.vx, 0, 0.08);
    player.vy = lerp(player.vy, 0, 0.08);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    return;
  }
  const ball = engine.ball;
  const side = player.side;
  const attackDir = side === 0 ? 1 : -1;
  const attackGoalX = side === 0 ? FIELD.right : FIELD.left;
  const ownGoalX = side === 0 ? FIELD.left : FIELD.right;
  const hasPossession = ball.owner && ball.owner.side === side;
  const opponentHas = ball.owner && ball.owner.side !== side;
  const neutral = !ball.owner;
  const isClosest = closestToBall(engine, side) === player;
  const isSecond = secondClosestToBall(engine, side) === player;
  let targetX = player.homeX;
  let targetY = player.homeY;
  const ballNormY = (ball.y - FIELD.centerY) / (FIELD.bottom - FIELD.top);
  const ballNormX = (ball.x - FIELD.centerX) / (FIELD.right - FIELD.left);
  if (player.isGK) {
    const line = side === 0 ? FIELD.left + 28 : FIELD.right - 28;
    targetX = line + attackDir * (Math.abs(ball.x - line) < 230 ? 34 : 0);
    targetY = clamp(FIELD.centerY + ballNormY * 120, FIELD.centerY - 76, FIELD.centerY + 76);
    if (neutral && engine.nearestOpponentDistance(player, side) < 40) targetY = ball.y;
  } else if (hasPossession) {
    targetX = player.homeX + attackDir * 75 + ballNormX * 70;
    targetY = player.homeY + ballNormY * 70;
    if (player.role === "ATA" || player.role === "PD" || player.role === "PE") {
      targetX = player.homeX + attackDir * 38 + ballNormX * 40;
      targetY = ball.y + (player.homeY - FIELD.centerY) * 0.34;
    }
    if (player.role === "MEI") {
      targetX = lerp(player.homeX, ball.x, 0.24) + attackDir * 12;
      targetY = lerp(player.homeY, ball.y, 0.32);
    }
    if (ball.owner === player) {
      targetX = attackGoalX - attackDir * (dist(player, { x: attackGoalX, y: FIELD.centerY }) < 240 ? 95 : 270);
      targetY = lerp(player.y, FIELD.centerY + (player.y - FIELD.centerY) * 0.4, 0.2);
    }
  } else if (opponentHas) {
    const press = isClosest || isSecond;
    targetX = lerp(player.homeX, ball.x, press ? 0.42 : 0.18);
    targetY = lerp(player.homeY, ball.y, press ? 0.3 : 0.16);
    if (isClosest) {
      targetX = ball.x - attackDir * 13;
      targetY = ball.y;
    }
    if (player.role === "ZAG" && !isClosest) {
      targetX = lerp(ownGoalX, ball.x, 0.16);
      targetY = lerp(player.homeY, ball.y, 0.22);
    }
    if (player.role === "VOL" && !isClosest) {
      targetX = lerp(ownGoalX, ball.x, 0.22);
    }
  } else {
    targetX = lerp(player.homeX, ball.x, isClosest ? 0.34 : 0.1);
    targetY = lerp(player.homeY, ball.y, isClosest ? 0.3 : 0.12);
  }
  if (engine.state === "setpiece" || engine.state === "goal") {
    targetX = side === 0 ? FIELD.left + (FIELD.right - FIELD.left) * player.slot[0] : FIELD.right - (FIELD.right - FIELD.left) * player.slot[0];
    targetY = FIELD.top + (FIELD.bottom - FIELD.top) * player.slot[1];
    if (player.isGK) targetX = side === 0 ? FIELD.left + 30 : FIELD.right - 30;
  }
  if (engine.careerPlayerId === player.id && !engine.isMultiplayer) {
    targetX = player.homeX;
    targetY = player.homeY;
  }
  if (ball.owner === player) {
    aiDribble(engine, player, dt);
    return;
  }
  const speedFactor = engine.difficulty.speed * (player.stamina < 25 ? 0.86 : 1);
  const pace = (73 + player.player.pace * 0.34) * speedFactor;
  const direction = norm(targetX - player.x, targetY - player.y);
  const distanceToTarget = Math.hypot(targetX - player.x, targetY - player.y);
  const pressBoost = side !== 0 && isClosest ? 1.08 : 1;
  const desiredSpeed = distanceToTarget > 18 ? pace * pressBoost * (engine.difficulty.reaction + 0.14) : 0;
  const desired = { x: direction.x * desiredSpeed, y: direction.y * desiredSpeed };
  player.vx = lerp(player.vx, desired.x, clamp(dt * (6.5 + engine.difficulty.reaction * 5), 0, 1));
  player.vy = lerp(player.vy, desired.y, clamp(dt * (6.5 + engine.difficulty.reaction * 5), 0, 1));
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (opponentHas && isClosest && dist(player, ball.owner) < 34 && player.tackleCooldown <= 0) {
    if (Math.random() < 0.008 + engine.difficulty.reaction * 0.012) slideTackle(engine, player);
  }
  if (engine.ball.owner === player && engine.state === "playing") aiDecide(engine, player, dt);
};

const aiDribble = (engine, player, dt) => {
  const side = player.side;
  const attackDir = side === 0 ? 1 : -1;
  const attackGoal = { x: side === 0 ? FIELD.right : FIELD.left, y: FIELD.centerY };
  const goalDistance = dist(player, attackGoal);
  const pressure = engine.nearestOpponentDistance(player, side);
  const direction = norm(attackDir * 220 + (attackGoal.x - player.x) * 0.4, FIELD.centerY - player.y + (player.y - FIELD.centerY) * 0.15);
  const speed = (74 + player.player.pace * 0.34) * engine.difficulty.speed * (player.stamina < 25 ? 0.84 : 1);
  if (player.aiTimer <= 0) {
    player.aiTimer = randomRange(0.16, 0.28);
    if (pressure < 54 || Math.random() < 0.01) {
      aiPass(engine, player, direction.x, direction.y, false);
      return;
    }
    if (goalDistance < 260 + player.player.shot * 0.7 && Math.abs(player.y - FIELD.centerY) < 210) {
      if (Math.random() < 0.022 + engine.difficulty.reaction * 0.02) {
        shoot(engine, player, direction.x, randomRange(-0.2, 0.2), randomRange(0.4, 0.9));
        return;
      }
    }
    if (pressure < 82 && Math.random() < 0.18) {
      player.vx += (Math.random() - 0.5) * 100;
      player.vy += (Math.random() - 0.5) * 160;
    }
  }
  player.aiTimer -= dt;
  player.vx = lerp(player.vx, direction.x * speed, clamp(dt * 6.5, 0, 1));
  player.vy = lerp(player.vy, direction.y * speed, clamp(dt * 6.5, 0, 1));
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, FIELD.left + 10, FIELD.right - 10);
  player.y = clamp(player.y, FIELD.top + 8, FIELD.bottom - 8);
};

const aiDecide = (engine, player, dt) => {
  if (player.aiTimer > 0) {
    player.aiTimer -= dt;
    return;
  }
  const attackGoal = { x: player.side === 0 ? FIELD.right : FIELD.left, y: FIELD.centerY };
  const goalDist = dist(player, attackGoal);
  const pressure = engine.nearestOpponentDistance(player, player.side);
  player.aiTimer = randomRange(0.22, 0.46) / engine.difficulty.reaction;
  if (pressure < 44 && Math.random() < 0.58) {
    aiPass(engine, player, player.dir, 0, false);
    return;
  }
  if (goalDist < 215 + player.player.shot * 0.9 && Math.abs(player.y - FIELD.centerY) < 190 && Math.random() < 0.06 + engine.difficulty.reaction * 0.045) {
    shoot(engine, player, player.dir, (FIELD.centerY - player.y) / 220, randomRange(0.35, 0.8));
    return;
  }
  if (Math.random() < 0.018) aiPass(engine, player, player.dir, 0, false);
};

const resolvePlayerCollisions = (engine) => {
  const players = engine.players.filter((player) => !player.sentOff);
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.01 && distance < 18) {
        const push = (18 - distance) / 2;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const aSpeed = Math.hypot(a.vx, a.vy);
        const bSpeed = Math.hypot(b.vx, b.vy);
        if (a.side !== b.side && Math.max(aSpeed, bSpeed) > 95 && !engine.ball.owner && Math.random() < 0.005) {
          const offender = aSpeed > bSpeed ? a : b;
          const victim = offender === a ? b : a;
          commitFoul(engine, offender, victim, false);
        }
      }
    }
  }
};

export const updatePlayers = (engine, dt, frozen) => {
  const ball = engine.ball;
  engine.players.forEach((player, index) => {
    if (player.sentOff) return;
    player.matchIndex = index % 11;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.tackleCooldown = Math.max(0, player.tackleCooldown - dt);
    player.skillTimer = Math.max(0, player.skillTimer - dt);
    player.controlGrace = Math.max(0, player.controlGrace - dt);
    if (player.slideTimer > 0) {
      player.slideTimer -= dt;
      player.phase += dt * 20;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.vx *= 0.9;
      player.vy *= 0.9;
      player.speed = Math.hypot(player.vx, player.vy);
      player.x = clamp(player.x, FIELD.left + 10, FIELD.right - 10);
      player.y = clamp(player.y, FIELD.top + 8, FIELD.bottom - 8);
      return;
    }
    const isUser = (player.id === engine.controlledId && player.side === 0) || (engine.isMultiplayer && player.id === engine.p2ControlledId && player.side === 1);
    const isCareer = engine.careerPlayerId === player.id;
    if (engine.state === "playing" && (isUser || (isCareer && !engine.isMultiplayer))) {
      moveUserPlayer(engine, player, dt);
    } else {
      moveAIPlayer(engine, player, dt, frozen);
    }
    player.speed = Math.hypot(player.vx, player.vy);
    if (player.speed > 2) {
      player.phase += dt * (3.5 + player.speed * 0.075);
      player.dir = player.vx >= 0 ? 1 : -1;
    } else {
      player.phase += dt * 1.2;
    }
    player.x = clamp(player.x, FIELD.left + 10, FIELD.right - 10);
    player.y = clamp(player.y, FIELD.top + 8, FIELD.bottom - 8);
    if (!frozen && engine.state === "playing" && !player.isGK) {
      const staminaDrain = player.sprinting ? 3.2 : 1.1;
      player.stamina = clamp(player.stamina - dt * staminaDrain * (player.speed / 90), 12, 100);
    } else {
      player.stamina = clamp(player.stamina + dt * 0.7, 12, 100);
    }
  });
  resolvePlayerCollisions(engine);
  if (engine.state === "playing" && !frozen) {
    if (ball.owner && !ball.owner.sentOff && ball.owner.slideTimer <= 0) {
      const owner = ball.owner;
      const offset = 13 + (owner.sprinting ? 5 : 0);
      const facing = norm(owner.vx || owner.dir, owner.vy * 0.7);
      ball.x = owner.x + facing.x * offset;
      ball.y = owner.y + facing.y * offset;
      ball.z = 0;
      ball.vx = owner.vx;
      ball.vy = owner.vy;
      ball.rotation += (15 + owner.speed * 0.2) * dt;
    } else if (ball.owner && ball.owner.slideTimer > 0) {
      ball.owner = null;
    }
  }
};

const checkBallCollisions = (engine) => {
  const ball = engine.ball;
  if (ball.z > 50) return;
  const posts = [
    { x: FIELD.left, y: FIELD.centerY - FIELD.goalWidth / 2 },
    { x: FIELD.left, y: FIELD.centerY + FIELD.goalWidth / 2 },
    { x: FIELD.right, y: FIELD.centerY - FIELD.goalWidth / 2 },
    { x: FIELD.right, y: FIELD.centerY + FIELD.goalWidth / 2 }
  ];
  posts.forEach((post) => {
    const distance = Math.hypot(ball.x - post.x, ball.y - post.y);
    if (distance < 8) {
      const nx = (ball.x - post.x) / (distance || 1);
      const ny = (ball.y - post.y) / (distance || 1);
      ball.x = post.x + nx * 9;
      ball.y = post.y + ny * 9;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.vx *= 0.7;
      ball.vy *= 0.7;
      engine.audio.post();
      engine.say("post");
      engine.shake = Math.max(engine.shake, 5);
    }
  });
};

const checkBallOut = (engine) => {
  const ball = engine.ball;
  if (ball.owner) return;
  const goalTop = FIELD.centerY - FIELD.goalWidth / 2;
  const goalBottom = FIELD.centerY + FIELD.goalWidth / 2;
  if (ball.x <= FIELD.left + 2) {
    if (ball.y > goalTop && ball.y < goalBottom && ball.z < FIELD.goalHeight) {
      engine.scoreGoal(engine.getScorerForGoal(1), 1, false);
      return;
    }
    if (ball.y > goalTop && ball.y < goalBottom) {
      engine.setRestart("goalKick", 0, FIELD.left + 35, FIELD.centerY, 1.2);
      return;
    }
    const lastSide = engine.lastTouch ? engine.lastTouch.side : 0;
    if (lastSide === 1) engine.setRestart("goalKick", 0, FIELD.left + 35, FIELD.centerY, 1.2);
    else engine.setRestart("corner", 1, FIELD.left + 6, ball.y < FIELD.centerY ? FIELD.top + 6 : FIELD.bottom - 6, 1.4);
    return;
  }
  if (ball.x >= FIELD.right - 2) {
    if (ball.y > goalTop && ball.y < goalBottom && ball.z < FIELD.goalHeight) {
      engine.scoreGoal(engine.getScorerForGoal(0), 0, false);
      return;
    }
    if (ball.y > goalTop && ball.y < goalBottom) {
      engine.setRestart("goalKick", 1, FIELD.right - 35, FIELD.centerY, 1.2);
      return;
    }
    const lastSide = engine.lastTouch ? engine.lastTouch.side : 1;
    if (lastSide === 0) engine.setRestart("goalKick", 1, FIELD.right - 35, FIELD.centerY, 1.2);
    else engine.setRestart("corner", 0, FIELD.right - 6, ball.y < FIELD.centerY ? FIELD.top + 6 : FIELD.bottom - 6, 1.4);
    return;
  }
  if (ball.y <= FIELD.top + 2) {
    const side = engine.lastTouch ? (engine.lastTouch.side === 0 ? 1 : 0) : 0;
    engine.setRestart("throw", side, ball.x, FIELD.top + 8, 1);
  } else if (ball.y >= FIELD.bottom - 2) {
    const side = engine.lastTouch ? (engine.lastTouch.side === 0 ? 1 : 0) : 0;
    engine.setRestart("throw", side, ball.x, FIELD.bottom - 8, 1);
  }
};

export const updateBall = (engine, dt, playing) => {
  const ball = engine.ball;
  if (ball.owner) {
    if (engine.state !== "playing") {
      ball.x = ball.owner.x + ball.owner.dir * 12;
      ball.y = ball.owner.y;
    }
    return;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.z > 0 || ball.vz > 0) {
    ball.z += ball.vz * dt;
    ball.vz -= 520 * dt;
    if (ball.z <= 0) {
      ball.z = 0;
      if (Math.abs(ball.vz) > 40) {
        ball.vz = -ball.vz * 0.38;
        engine.audio.pass();
      } else ball.vz = 0;
    }
  }
  const friction = (engine.weather.friction || 1) * (ball.z > 0 ? 0.997 : 0.9905);
  ball.vx *= Math.pow(friction, dt * 60);
  ball.vy *= Math.pow(friction, dt * 60);
  if (Math.abs(ball.vx) < 2) ball.vx = 0;
  if (Math.abs(ball.vy) < 2) ball.vy = 0;
  ball.rotation += Math.hypot(ball.vx, ball.vy) * dt * 0.04 + (ball.z > 0 ? dt * 5 : 0);
  if (!playing) {
    ball.x = clamp(ball.x, FIELD.left + 5, FIELD.right - 5);
    ball.y = clamp(ball.y, FIELD.top + 5, FIELD.bottom - 5);
    return;
  }
  checkBallCollisions(engine);
  if (ball.z < 18) {
    const candidates = engine.players.filter((player) => !player.sentOff && player.controlGrace <= 0 && !player.isGK);
    let closest = null;
    let best = 999;
    candidates.forEach((player) => {
      const distance = dist(player, ball);
      if (distance < best) {
        best = distance;
        closest = player;
      }
    });
    if (closest && best < 20 && !ball.owner) {
      const skill = closest.player.dribble / 100;
      if (Math.random() < 0.52 + skill * 0.3) {
        ball.owner = closest;
        ball.lastOwner = closest;
        engine.lastTouch = closest;
        if (engine.passTarget && engine.passTarget.id === closest.id && engine.passTeam === closest.side) {
          engine.stats[closest.side === 0 ? "home" : "away"].passesOk += 1;
          engine.passTarget = null;
        }
        if (closest.side === 0) engine.controlledId = closest.id;
      }
    }
    const gk = engine.players.find((player) => player.isGK && !player.sentOff && player.side === (ball.x < FIELD.centerX ? 0 : 1));
    if (gk && dist(gk, ball) < 23 && ball.z < 12 && Math.random() < 0.65) {
      ball.owner = gk;
      ball.lastOwner = gk;
      engine.lastTouch = gk;
      engine.audio.save();
      engine.say("save");
    }
  }
  checkBallOut(engine);
};

export { moveAIPlayer, resolvePlayerCollisions };
