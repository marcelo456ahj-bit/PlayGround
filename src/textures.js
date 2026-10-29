import * as THREE from 'three'

function seeded(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function canvas2d(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, x: c.getContext('2d') }
}

function finish(c, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = 8
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export function normalFromCanvas(c, strength = 2.2) {
  const w = c.width, h = c.height
  const src = c.getContext('2d').getImageData(0, 0, w, h).data
  const { c: out, x } = canvas2d(w, h)
  const img = x.createImageData(w, h)
  const at = (px, py) => {
    const xx = (px + w) % w, yy = (py + h) % h
    return src[(yy * w + xx) * 4] / 255
  }
  for (let y = 0; y < h; y++) {
    for (let px = 0; px < w; px++) {
      const dx = (at(px + 1, y) - at(px - 1, y)) * strength
      const dy = (at(px, y + 1) - at(px, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * w + px) * 4
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  return finish(out)
}

export function makeConcrete(seed = 7) {
  const r = seeded(seed)
  const { c, x } = canvas2d(512, 512)
  x.fillStyle = '#23272b'
  x.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 2600; i++) {
    const v = 20 + Math.floor(r() * 50)
    x.fillStyle = `rgba(${v},${v + 3},${v + 5},${0.18 + r() * 0.35})`
    const s = 0.6 + r() * 4
    x.fillRect(r() * 512, r() * 512, s, s)
  }
  for (let i = 0; i < 90; i++) {
    const g = x.createRadialGradient(r() * 512, r() * 512, 0, r() * 512, r() * 512, 30 + r() * 100)
    g.addColorStop(0, `rgba(8,10,12,${0.08 + r() * 0.2})`)
    g.addColorStop(1, 'rgba(8,10,12,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 512, 512)
  }

  x.strokeStyle = 'rgba(9,11,13,0.65)'
  for (let i = 0; i < 8; i++) {
    x.lineWidth = 0.7 + r() * 1.4
    x.beginPath()
    let px = r() * 512, py = r() * 512
    x.moveTo(px, py)
    const steps = 3 + Math.floor(r() * 6)
    for (let s = 0; s < steps; s++) {
      px += (r() - 0.5) * 90
      py += (r() - 0.5) * 90
      x.lineTo(px, py)
    }
    x.stroke()
  }

  x.strokeStyle = 'rgba(6,8,10,0.85)'
  x.lineWidth = 3
  x.strokeRect(0, 0, 512, 512)
  x.strokeStyle = 'rgba(120,135,145,0.14)'
  x.lineWidth = 1
  x.strokeRect(3, 3, 506, 506)
  for (let i = 1; i < 4; i++) {
    x.fillStyle = 'rgba(8,10,12,0.5)'
    x.fillRect(0, i * 128, 512, 2)
    x.fillStyle = 'rgba(160,175,185,0.05)'
    x.fillRect(0, i * 128 + 2, 512, 1)
  }

  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.2})`
    x.beginPath()
    x.ellipse(r() * 512, r() * 512, 4 + r() * 22, 2 + r() * 9, r() * 3.14, 0, 6.3)
    x.fill()
  }
  return c
}

export function makeConcreteMaps(seed = 7) {
  const c = makeConcrete(seed)
  const color = finish(c, 9, 9)
  const rough = finish(c, 9, 9, false)
  rough.colorSpace = THREE.NoColorSpace
  const normal = normalFromCanvas(c, 1.8)
  normal.colorSpace = THREE.NoColorSpace
  normal.repeat.set(9, 9)
  return { color, rough, normal }
}

export function makeMetal(seed = 21) {
  const r = seeded(seed)
  const { c, x } = canvas2d(512, 512)
  x.fillStyle = '#252b31'
  x.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 2000; i++) {
    const v = 25 + Math.floor(r() * 55)
    x.strokeStyle = `rgba(${v},${v + 4},${v + 8},${0.08 + r() * 0.2})`
    x.lineWidth = 0.6
    const y = r() * 512
    x.beginPath()
    x.moveTo(r() * 512, y)
    x.lineTo(r() * 512, y + (r() - 0.5) * 2)
    x.stroke()
  }
  const panels = [0, 128, 320, 512]
  for (let py = 0; py < panels.length - 1; py++) {
    for (let px = 0; px < panels.length - 1; px++) {
      const x0 = panels[px], y0 = panels[py], w = panels[px + 1] - x0, h = panels[py + 1] - y0
      x.strokeStyle = 'rgba(7,9,11,0.9)'
      x.lineWidth = 3
      x.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2)
      x.strokeStyle = 'rgba(150,165,175,0.12)'
      x.lineWidth = 1
      x.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8)
      for (let i = 0; i < 6; i++) {
        const cx = x0 + 12 + r() * (w - 24), cy = y0 + 12 + r() * (h - 24)
        const g = x.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 4)
        g.addColorStop(0, 'rgba(190,200,205,0.7)')
        g.addColorStop(0.45, 'rgba(80,88,94,0.8)')
        g.addColorStop(1, 'rgba(5,7,9,0.8)')
        x.fillStyle = g
        x.beginPath()
        x.arc(cx, cy, 3.2, 0, 6.3)
        x.fill()
      }
    }
  }
  for (let i = 0; i < 14; i++) {
    x.fillStyle = `rgba(130,72,32,${0.05 + r() * 0.1})`
    x.fillRect(r() * 512, r() * 512, 2 + r() * 4, 20 + r() * 90)
  }
  return c
}

export function makeMetalMaps(seed = 21) {
  const c = makeMetal(seed)
  const normal = normalFromCanvas(c, 1.1)
  normal.colorSpace = THREE.NoColorSpace
  return { color: finish(c, 1, 1), rough: finish(c, 1, 1, false), normal }
}

export function makeHazard(repeat = 4) {
  const { c, x } = canvas2d(256, 256)
  x.fillStyle = '#15181a'
  x.fillRect(0, 0, 256, 256)
  x.save()
  x.translate(128, 128)
  x.rotate(-Math.PI / 4)
  for (let i = -8; i < 9; i++) {
    x.fillStyle = i % 2 ? '#c8882c' : '#1a1c1e'
    x.fillRect(-200, i * 28, 400, 28)
  }
  x.restore()
  return finish(c, repeat, repeat)
}

export function makeSkyline(seed = 5, width = 2048, height = 640, warm = false) {
  const r = seeded(seed)
  const { c, x } = canvas2d(width, height)
  const grad = x.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, warm ? 'rgba(40,22,26,0)' : 'rgba(8,12,22,0)')
  grad.addColorStop(1, warm ? 'rgba(96,38,30,0.3)' : 'rgba(14,28,44,0.28)')
  x.fillStyle = grad
  x.fillRect(0, 0, width, height)
  let cursor = 0
  while (cursor < width) {
    const w = 24 + r() * 100
    const h = 90 + Math.pow(r(), 1.7) * (height - 120)
    const top = height - h
    x.fillStyle = warm ? `rgb(${24 + r() * 14},${14 + r() * 9},${20 + r() * 9})` : `rgb(${7 + r() * 8},${12 + r() * 10},${22 + r() * 14})`
    x.fillRect(cursor, top, w - 3, h)
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.fillRect(cursor + w - 7, top, 4, h)
    const cols = Math.max(2, Math.floor(w / 11))
    const rows = Math.max(3, Math.floor(h / 14))
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (r() > 0.46) continue
        const on = r()
        x.fillStyle = on > 0.82
          ? (warm ? 'rgba(255,190,110,0.85)' : 'rgba(160,235,255,0.8)')
          : (warm ? 'rgba(220,120,70,0.32)' : 'rgba(80,180,220,0.3)')
        x.fillRect(cursor + 4 + cx * (w - 8) / cols, top + 8 + cy * (h - 14) / rows, Math.max(1, (w - 8) / cols - 4), 2.2)
      }
    }
    if (r() > 0.75) {
      x.fillStyle = warm ? 'rgba(255,80,70,0.9)' : 'rgba(255,60,80,0.9)'
      x.fillRect(cursor + w / 2, top - 4, 2, 4)
    }
    cursor += w + 2 + r() * 16
  }
  x.fillStyle = warm ? 'rgba(120,50,40,0.16)' : 'rgba(40,100,130,0.16)'
  x.fillRect(0, height - 90, width, 90)
  return finish(c)
}

export function makeSign(text, color = '#7ff3ff', sub = '') {
  const w = 512, h = 192
  const { c, x } = canvas2d(w, h)
  x.clearRect(0, 0, w, h)
  x.strokeStyle = color
  x.globalAlpha = 0.35
  x.lineWidth = 3
  x.strokeRect(6, 6, w - 12, h - 12)
  x.globalAlpha = 0.12
  x.fillStyle = color
  x.fillRect(6, 6, w - 12, h - 12)
  x.globalAlpha = 1
  x.font = '700 76px "Arial Narrow", sans-serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.shadowColor = color
  x.shadowBlur = 26
  x.fillStyle = color
  x.fillText(text, w / 2, sub ? h / 2 - 12 : h / 2)
  if (sub) {
    x.font = '500 20px monospace'
    x.shadowBlur = 10
    x.globalAlpha = 0.8
    x.fillText(sub, w / 2, h / 2 + 46)
  }
  return finish(c)
}

export function makeGlow(size = 128, hardness = 0) {
  const { c, x } = canvas2d(size, size)
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(Math.max(0.05, hardness), 'rgba(255,255,255,0.85)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.28)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  return finish(c)
}

export function makeSoftGlow(size = 96) {
  return makeGlow(size, 0.02)
}

export function makeSmoke(size = 128) {
  const r = seeded(99)
  const { c, x } = canvas2d(size, size)
  x.clearRect(0, 0, size, size)
  for (let i = 0; i < 22; i++) {
    const g = x.createRadialGradient(
      size / 2 + (r() - 0.5) * size * 0.45,
      size / 2 + (r() - 0.5) * size * 0.45, 0,
      size / 2, size / 2, size * (0.18 + r() * 0.3)
    )
    g.addColorStop(0, `rgba(255,255,255,${0.06 + r() * 0.08})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.fillRect(0, 0, size, size)
  }
  return finish(c)
}

export function makeSpark(size = 64) {
  const { c, x } = canvas2d(size, size)
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,240,190,0.9)')
  g.addColorStop(0.5, 'rgba(255,150,60,0.3)')
  g.addColorStop(1, 'rgba(255,90,20,0)')
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  return finish(c)
}

export function makePadDecal() {
  const { c, x } = canvas2d(1024, 1024)
  x.clearRect(0, 0, 1024, 1024)
  x.strokeStyle = 'rgba(255,180,92,0.55)'
  x.lineWidth = 10
  x.beginPath(); x.arc(512, 512, 300, 0, 6.3); x.stroke()
  x.lineWidth = 3
  x.beginPath(); x.arc(512, 512, 336, 0, 6.3); x.stroke()
  x.setLineDash([26, 18])
  x.lineWidth = 6
  x.beginPath(); x.arc(512, 512, 408, 0, 6.3); x.stroke()
  x.setLineDash([])
  x.font = '700 120px "Arial Narrow", sans-serif'
  x.fillStyle = 'rgba(255,180,92,0.55)'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText('09', 512, 492)
  x.font = '500 28px monospace'
  x.fillStyle = 'rgba(255,180,92,0.4)'
  x.fillText('DECK ALPHA // CLEARANCE RED', 512, 622)
  x.fillStyle = 'rgba(255,180,92,0.5)'
  for (let i = 0; i < 4; i++) {
    x.save(); x.translate(512, 512); x.rotate(i * Math.PI / 2)
    x.fillRect(-18, -352, 36, 74)
    x.restore()
  }
  return finish(c)
}

export function makeStarfield() {
  const r = seeded(1234)
  const { c, x } = canvas2d(1024, 512)
  x.fillStyle = '#000'
  x.fillRect(0, 0, 1024, 512)
  for (let i = 0; i < 1300; i++) {
    const a = 0.2 + r() * 0.8
    x.fillStyle = `rgba(${180 + r() * 60},${210 + r() * 45},255,${a})`
    const s = r() > 0.97 ? 2 : 0.8
    x.fillRect(r() * 1024, r() * 512, s, s)
  }
  return finish(c)
}

export function makeHoloGrid() {
  const { c, x } = canvas2d(512, 512)
  x.clearRect(0, 0, 512, 512)
  x.strokeStyle = 'rgba(127,243,255,0.55)'
  x.lineWidth = 2
  for (let i = 0; i <= 512; i += 32) {
    x.globalAlpha = i % 128 === 0 ? 0.65 : 0.22
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke()
    x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke()
  }
  x.globalAlpha = 0.8
  x.strokeStyle = 'rgba(255,180,92,0.5)'
  x.lineWidth = 5
  x.beginPath(); x.arc(256, 256, 176, 0, 6.3); x.stroke()
  x.beginPath(); x.arc(256, 256, 208, 0, 6.3); x.stroke()
  return finish(c)
}
