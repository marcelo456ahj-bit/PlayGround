import { FIELD, clamp, randomRange } from "./match-utils.js";
import { teamKitColor, teamKitSecondary } from "./match-utils.js";

const drawFloodlights = (engine, ctx) => {
  const t = performance.now() / 1000;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const lights = [
    { x: 80, y: -40, color: "rgba(120,180,255,0.08)" },
    { x: 1120, y: -20, color: "rgba(255,236,180,0.07)" },
    { x: 600, y: 740, color: "rgba(140,180,255,0.045)" }
  ];
  lights.forEach((light, index) => {
    const gradient = ctx.createRadialGradient(light.x, light.y, 10, light.x, light.y, 540);
    gradient.addColorStop(0, light.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(light.x + Math.sin(t * 0.35 + index) * 30, light.y, 540, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

const drawPlayer = (engine, ctx, player, replay) => {
  const primary = player.side === 0 ? teamKitColor(engine.homeTeam, engine.homeKit) : teamKitColor(engine.awayTeam, engine.awayKit);
  const secondary = player.side === 0 ? teamKitSecondary(engine.homeTeam, engine.homeKit) : teamKitSecondary(engine.awayTeam, engine.awayKit);
  const kit = player.isGK ? "#facc15" : primary;
  const trim = player.isGK ? "#111827" : secondary;
  const x = player.x;
  const y = player.y;
  const sprint = player.speed || 0;
  const stride = Math.sin(player.phase) * clamp(sprint / 70, 0, 1) * 5.5;
  const stride2 = Math.sin(player.phase + Math.PI) * clamp(sprint / 70, 0, 1) * 5.5;
  const bob = Math.sin(player.phase * 2) * clamp(sprint / 120, 0, 1) * 1.4;
  const sliding = player.slideTimer > 0;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#02050a";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 9.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y + bob);
  if (sliding) {
    ctx.rotate(player.slideAngle + Math.PI / 2);
    ctx.translate(0, -7);
    ctx.scale(1.08, 0.92);
  }
  const isControlled = player.controlled;
  const skin = player.skin || "#e0ac69";
  ctx.lineCap = "round";
  ctx.strokeStyle = trim;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-2, -12);
  ctx.lineTo(-4 + stride, -1);
  ctx.moveTo(2, -12);
  ctx.lineTo(4 + stride2, -1);
  ctx.stroke();
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4 + stride, -1);
  ctx.lineTo(-6 + stride, 1.2);
  ctx.moveTo(4 + stride2, -1);
  ctx.lineTo(6 + stride2, 1.2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -12);
  ctx.lineTo(2, -12);
  ctx.stroke();
  ctx.strokeStyle = kit;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, -12);
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -24);
  ctx.lineTo(0, -21);
  ctx.lineTo(4, -24);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 2.6;
  const armSwing = Math.sin(player.phase + Math.PI) * clamp(sprint / 120, 0, 1) * 3;
  ctx.beginPath();
  ctx.moveTo(-4, -24);
  ctx.lineTo(-8 - armSwing, -17 + Math.cos(player.phase) * 2);
  ctx.moveTo(4, -24);
  ctx.lineTo(8 + armSwing, -17 - Math.cos(player.phase) * 2);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -31.5, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.arc(0, -33.2, 5.15, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(-1.5, -31.5, 1, 1.3, 0, 0, Math.PI * 2);
  ctx.ellipse(1.5, -31.5, 1, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!player.isGK) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "700 5.4px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(player.number), 0, -15.5);
  }
  if (isControlled) {
    ctx.strokeStyle = player.side === 0 ? "rgba(250,204,21,0.85)" : "rgba(56,189,248,0.85)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 11, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    const pulse = Math.sin(performance.now() / 160) * 2;
    ctx.fillStyle = player.side === 0 ? "#facc15" : "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(0, -44 + pulse * 0.16);
    ctx.lineTo(-4, -48 + pulse * 0.16);
    ctx.lineTo(4, -48 + pulse * 0.16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (isControlled && !replay) {
    const label = player.shortName || player.name || "";
    ctx.save();
    ctx.font = "600 8.5px Arial";
    const textWidth = ctx.measureText(label).width;
    const nameX = x - textWidth / 2 - 4;
    const nameY = y - 55;
    ctx.fillStyle = "rgba(4,9,16,0.7)";
    ctx.beginPath();
    ctx.roundRect(nameX, nameY, textWidth + 8, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.fillText(label, x, nameY + 9.3);
    ctx.restore();
  }
};

const drawBall = (ctx, ball, skin) => {
  const ballX = ball.x;
  const ballY = ball.y - ball.z * 0.7;
  const radius = 6.1 * (1 + Math.min(0.35, ball.z / 400));
  const shadowScale = clamp(1 - ball.z / 280, 0.32, 1);
  ctx.save();
  ctx.globalAlpha = 0.32 * shadowScale;
  ctx.fillStyle = "#02050a";
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + 3, 6.4 * shadowScale, 3.2 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  const gradient = ctx.createRadialGradient(ballX - radius * 0.32, ballY - radius * 0.4, radius * 0.1, ballX, ballY, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.68, skin.primary);
  gradient.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(15,23,42,0.45)";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.translate(ballX, ballY);
  ctx.rotate(ball.rotation || 0);
  ctx.fillStyle = skin.secondary;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius * 0.68, Math.sin(angle) * radius * 0.68, radius * 0.19, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = skin.accent;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawWeather = (engine, ctx) => {
  if (!["rain", "snow"].includes(engine.weather.id)) return;
  ctx.save();
  if (engine.weather.id === "rain") {
    ctx.strokeStyle = "rgba(186,230,253,0.34)";
    ctx.lineWidth = 1;
    engine.weatherParticles.forEach((particle) => {
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x - 2, particle.y + 13);
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = "rgba(241,245,249,0.7)";
    engine.weatherParticles.forEach((particle) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
};

const drawVignette = (ctx, w, h) => {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.48)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, 80);
  top.addColorStop(0, "rgba(2,6,12,0.55)");
  top.addColorStop(1, "rgba(2,6,12,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, 80);
};

export const drawMatch = (engine) => {
  const ctx = engine.ctx;
  const dpr = engine.dpr || 1;
  const w = engine.canvas.width / dpr;
  const h = engine.canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const replay = engine.state === "replay" && engine.replayFrames.length > 0;
  const frame = replay ? engine.replayFrames[Math.min(engine.replayFrames.length - 1, Math.floor(engine.replayIndex))] : null;
  const shakeX = engine.shake > 0 ? randomRange(-engine.shake, engine.shake) : 0;
  const shakeY = engine.shake > 0 ? randomRange(-engine.shake, engine.shake) : 0;
  ctx.save();
  ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
  ctx.scale(engine.camera.zoom, engine.camera.zoom);
  ctx.translate(-engine.camera.x, -engine.camera.y);
  if (engine.stadiumCanvas) ctx.drawImage(engine.stadiumCanvas, engine.stadiumOrigin.x, engine.stadiumOrigin.y);
  drawFloodlights(engine, ctx);
  const ball = replay ? frame.ball : engine.ball;
  const players = replay ? frame.players : engine.players;
  const drawList = players.filter((player) => !player.sentOff).sort((a, b) => a.y - b.y);
  drawList.forEach((player) => drawPlayer(engine, ctx, player, replay));
  drawBall(ctx, ball, engine.ballSkin);
  drawWeather(engine, ctx);
  if (!replay) {
    const controlled = engine.players.find((player) => player.id === engine.controlledId);
    if (controlled) {
      ctx.save();
      ctx.strokeStyle = "rgba(250,204,21,0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(controlled.x, controlled.y, 28 + Math.sin(performance.now() / 270) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (engine.weather.id === "night" || engine.weather.id === "cloudy") {
    ctx.save();
    ctx.fillStyle = engine.weather.id === "night" ? "rgba(5,10,30,0.16)" : "rgba(120,140,160,0.05)";
    ctx.fillRect(-300, -220, 1800, 1120);
    ctx.restore();
  }
  ctx.restore();
  drawVignette(ctx, w, h);
  if (engine.goalFlash > 0.02) {
    ctx.fillStyle = `rgba(255,255,255,${engine.goalFlash * 0.55})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (engine.state === "replay") {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    ctx.fillRect(0, h - 44, w, 44);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("REPLAY", 18, h - 18);
    ctx.fillStyle = "#facc15";
    ctx.font = "800 13px Arial";
    ctx.fillText(engine.goalText ? `${engine.goalText.scorer}  ·  ${engine.goalText.minute}` : "", 78, h - 18);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 10px Arial";
    ctx.fillText("CÂMERA AUTOMÁTICA", w - 18, h - 18);
  }
};
