import { FORMATIONS } from "./data.js";

export const FIELD = { left: 60, right: 1140, top: 52, bottom: 628, centerX: 600, centerY: 340, goalWidth: 154, goalHeight: 79, goalDepth: 42 };
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const randomRange = (min, max) => min + Math.random() * (max - min);
export const norm = (x, y) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

const ROLE_GROUP = {
  GOL: "GOL",
  ZAG: "DEF",
  LD: "DEF",
  LE: "DEF",
  VOL: "MID",
  MC: "MID",
  MEI: "MID",
  PD: "ATT",
  PE: "ATT",
  ATA: "ATT"
};

const SKIN = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#a56b46"];

export const buildLineup = (team, formation, priorityPlayerId) => {
  const slots = FORMATIONS[formation] ? FORMATIONS[formation].slots : FORMATIONS["4-3-3"].slots;
  const available = [...team.squad];
  const starters = [];
  slots.forEach((slot) => {
    const role = slot[2];
    const group = ROLE_GROUP[role];
    const exact = available.filter((player) => player.position === role).sort((a, b) => b.overall - a.overall);
    const groupPlayers = available.filter((player) => ROLE_GROUP[player.position] === group).sort((a, b) => b.overall - a.overall);
    const any = [...available].sort((a, b) => b.overall - a.overall);
    const pick = exact[0] || groupPlayers[0] || any[0];
    if (pick) {
      const index = available.findIndex((player) => player.id === pick.id);
      available.splice(index, 1);
      starters.push({ ...pick, slotRole: role, slot: [slot[0], slot[1]] });
    }
  });
  if (priorityPlayerId && !starters.some((player) => player.id === priorityPlayerId)) {
    const priority = available.find((player) => player.id === priorityPlayerId);
    if (priority) {
      const group = ROLE_GROUP[priority.position] || "MID";
      let weakestIndex = -1;
      starters.forEach((player, index) => {
        if (ROLE_GROUP[player.position] !== group) return;
        if (weakestIndex < 0 || player.overall < starters[weakestIndex].overall) weakestIndex = index;
      });
      if (weakestIndex >= 0) {
        const replaced = starters[weakestIndex];
        starters[weakestIndex] = { ...priority, slotRole: replaced.slotRole, slot: replaced.slot };
        available.splice(available.findIndex((player) => player.id === priority.id), 1);
        available.push(replaced);
      }
    }
  }
  return { starters, bench: available };
};

export const initialStats = () => ({
  shots: 0,
  onTarget: 0,
  possession: 0,
  passes: 0,
  passesOk: 0,
  fouls: 0,
  corners: 0,
  saves: 0,
  cards: 0,
  yellow: 0,
  red: 0,
  xg: 0
});

export const randomSkin = () => SKIN[Math.floor(Math.random() * SKIN.length)];

export const createMatchPlayer = (player, slot, side, team, index) => {
  const homeX = side === 0
    ? FIELD.left + (FIELD.right - FIELD.left) * slot[0]
    : FIELD.right - (FIELD.right - FIELD.left) * slot[0];
  const homeY = FIELD.top + (FIELD.bottom - FIELD.top) * slot[1];
  return {
    id: player.id,
    side,
    team,
    player,
    role: slot[2],
    slot: [slot[0], slot[1]],
    homeX,
    homeY,
    x: homeX,
    y: homeY,
    vx: 0,
    vy: 0,
    dir: side === 0 ? 1 : -1,
    speed: 0,
    phase: Math.random() * Math.PI * 2,
    stamina: 100,
    cooldown: 0,
    tackleCooldown: 0,
    aiTimer: Math.random() * 0.3,
    slideTimer: 0,
    slideAngle: 0,
    card: 0,
    sentOff: false,
    controlGrace: 0,
    skillTimer: 0,
    skin: randomSkin(),
    controlled: false,
    isGK: slot[2] === "GOL",
    number: player.number,
    name: player.name,
    shortName: player.shortName,
    rating: player.overall,
    matchIndex: index,
    goals: 0,
    assists: 0
  };
};

export const teamKitColor = (team, variant) => {
  if (variant === "secondary") return team.secondary;
  if (variant === "accent") return team.accent;
  return team.primary;
};

export const teamKitSecondary = (team, variant) => {
  if (variant === "secondary") return team.primary;
  if (variant === "accent") return team.primary;
  return team.secondary;
};
