import { FIELD } from "./match-utils.js";

const createRandom = (seed) => {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export const buildStadium = (engine) => {
  const W = 1800;
  const H = 1120;
  const ox = 300;
  const oy = 220;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const stadium = engine.stadium;
  const random = createRandom(7919);
  ctx.fillStyle = "#05080c";
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, stadium.sky || "#08101e");
  sky.addColorStop(0.46, "#0a0d14");
  sky.addColorStop(1, "#05080a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(ox, oy);
  const standTop = -210;
  const standBottom = 810;
  const standLeft = -250;
  const standRight = 1450;
  const drawStand = (x, y, width, height, color, rows, cols) => {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.55, "#080c12");
    gradient.addColorStop(1, "#05080c");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    const palette = [stadium.primary, stadium.secondary, "#cbd5e1", "#64748b", "#f8fafc", "#94a3b8", "#d97706"];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const dotX = x + 10 + (col / cols) * (width - 20) + random() * 4;
        const dotY = y + 10 + (row / rows) * (height - 20) + random() * 3;
        ctx.globalAlpha = 0.36 + random() * 0.58;
        ctx.fillStyle = palette[Math.floor(random() * palette.length)];
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2 + random() * 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (let row = 0; row < rows; row += 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.beginPath();
      ctx.moveTo(x, y + 10 + (row / rows) * (height - 20));
      ctx.lineTo(x + width, y + 10 + (row / rows) * (height - 20));
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  };
  drawStand(standLeft, standTop, standRight - standLeft, 238, stadium.primary, 10, 110);
  drawStand(standLeft, 742, standRight - standLeft, 250, stadium.primary, 11, 110);
  drawStand(standLeft, -30, 238, 710, stadium.secondary, 14, 34);
  drawStand(1212, -30, 238, 710, stadium.secondary, 14, 34);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(standLeft, standTop, standRight - standLeft, 1010);
  ctx.fillStyle = "#060a0e";
  ctx.fillRect(-290, 30, 292, 640);
  ctx.fillRect(1208, 30, 292, 640);
  const drawAd = (ad, top) => {
    const gradient = ctx.createLinearGradient(ad.x, ad.y, ad.x + ad.w, ad.y);
    gradient.addColorStop(0, top ? "#101820" : "#0b1620");
    gradient.addColorStop(0.5, "#162832");
    gradient.addColorStop(1, top ? "#101820" : "#0b1620");
    ctx.fillStyle = gradient;
    ctx.fillRect(ad.x, ad.y, ad.w, ad.h);
    ctx.font = "700 13px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    const labels = ["PES 2027", "STICKMAN 2D", "OMG", "AURA SPORTS", "NEXA", "VOLT", "PES 2027", "STICKMAN 2D", "OMG", "AURA SPORTS"];
    let cursor = 30;
    labels.forEach((label) => {
      ctx.fillText(label, cursor, ad.y + 17);
      cursor += 126;
    });
  };
  drawAd({ x: -6, y: 19, w: 1212, h: 25 }, true);
  drawAd({ x: -6, y: 662, w: 1212, h: 25 }, false);
  ctx.fillStyle = "#07120c";
  ctx.fillRect(-12, 46, 1224, 590);
  const pitchGradient = ctx.createLinearGradient(0, FIELD.top, 0, FIELD.bottom);
  pitchGradient.addColorStop(0, "#1f7d45");
  pitchGradient.addColorStop(0.5, "#1b6f3c");
  pitchGradient.addColorStop(1, "#145b31");
  ctx.fillStyle = pitchGradient;
  ctx.fillRect(26, 44, 1148, 592);
  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.045)";
    ctx.fillRect(40 + i * 94, FIELD.top, 94, FIELD.bottom - FIELD.top);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(40, FIELD.top, 1120, FIELD.bottom - FIELD.top);
  ctx.clip();
  for (let i = 0; i < 5200; i += 1) {
    const x = 40 + random() * 1120;
    const y = FIELD.top + random() * (FIELD.bottom - FIELD.top);
    ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.024)" : "rgba(0,0,0,0.026)";
    ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }
  for (let i = 0; i < 8; i += 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.018)";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(30, 80 + i * 80);
    ctx.lineTo(1170, 80 + i * 80);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(245,250,255,0.72)";
  ctx.lineWidth = 2.2;
  ctx.strokeRect(FIELD.left, FIELD.top, FIELD.right - FIELD.left, FIELD.bottom - FIELD.top);
  ctx.beginPath();
  ctx.moveTo(FIELD.centerX, FIELD.top);
  ctx.lineTo(FIELD.centerX, FIELD.bottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(FIELD.centerX, FIELD.centerY, 82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(245,250,255,0.8)";
  ctx.beginPath();
  ctx.arc(FIELD.centerX, FIELD.centerY, 3.4, 0, Math.PI * 2);
  ctx.fill();
  const drawBox = (x, side) => {
    const boxW = 155;
    const boxH = 320;
    const boxX = side === 0 ? x : x - boxW;
    ctx.strokeRect(boxX, FIELD.centerY - boxH / 2, boxW, boxH);
    ctx.strokeRect(side === 0 ? x : x - 58, FIELD.centerY - 126, 58, 252);
    ctx.beginPath();
    ctx.arc(side === 0 ? x + boxW : x - boxW, FIELD.centerY, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(side === 0 ? x + 112 : x - 112, FIELD.centerY, 52, side === 0 ? -Math.PI / 2 : Math.PI / 2, side === 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  };
  drawBox(FIELD.left, 0);
  drawBox(FIELD.right, 1);
  for (let corner = 0; corner < 4; corner += 1) {
    const x = corner % 2 === 0 ? FIELD.left : FIELD.right;
    const y = corner < 2 ? FIELD.top : FIELD.bottom;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(245,250,255,0.33)";
  ctx.lineWidth = 1;
  ctx.strokeRect(FIELD.left + 7, FIELD.top + 7, FIELD.right - FIELD.left - 14, FIELD.bottom - FIELD.top - 14);
  const drawGoal = (x, side) => {
    const top = FIELD.centerY - FIELD.goalWidth / 2;
    const height = FIELD.goalWidth;
    const depth = side === 0 ? -FIELD.goalDepth : FIELD.goalDepth;
    ctx.save();
    ctx.strokeStyle = "rgba(245,250,255,0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depth, top);
    ctx.lineTo(x + depth, top + height);
    ctx.lineTo(x, top + height);
    ctx.stroke();
    ctx.strokeStyle = "rgba(245,250,255,0.17)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + (depth / 12) * i, top);
      ctx.lineTo(x + (depth / 12) * i, top + height);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x, top + (height / 8) * i);
      ctx.lineTo(x + depth, top + (height / 8) * i);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawGoal(FIELD.left, 0);
  drawGoal(FIELD.right, 1);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "700 12px Arial";
  ctx.textAlign = "left";
  ctx.fillText("PES 27  /  STICKMAN LEAGUE", 44, 34);
  ctx.textAlign = "right";
  ctx.fillText(`${stadium.name.toUpperCase()}  ·  ${stadium.city.toUpperCase()}`, 1156, 676);
  ctx.textAlign = "center";
  ctx.font = "800 18px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillText("PES", FIELD.centerX, FIELD.centerY + 5);
  ctx.restore();
  return { canvas, origin: { x: -ox, y: -oy } };
};
