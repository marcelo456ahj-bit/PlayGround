export class AudioEngine {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.master = null
    this.ambient = null
    this.lastStep = 0
    this.noise = null
    this.reverb = null
  }

  init() {
    if (this.ctx) { this.resume(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx
    const master = ctx.createGain()
    master.gain.value = this.enabled ? 0.5 : 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 12
    comp.ratio.value = 6
    comp.attack.value = 0.004
    comp.release.value = 0.22
    master.connect(comp).connect(ctx.destination)
    this.master = master

    const len = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noise = buffer

    const irLen = ctx.sampleRate * 1.4
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      for (let i = 0; i < irLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.1)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = ir
    const revGain = ctx.createGain()
    revGain.gain.value = 0.18
    conv.connect(revGain).connect(master)
    this.reverb = conv

    this.startAmbient()
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }

  setEnabled(on) {
    this.enabled = on
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05)
  }

  startAmbient() {
    const ctx = this.ctx
    const now = ctx.currentTime
    const bus = ctx.createGain()
    bus.gain.value = 0.0
    bus.connect(this.master)
    bus.gain.linearRampToValueAtTime(0.15, now + 4)

    const drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 48
    const drone2 = ctx.createOscillator()
    drone2.type = 'triangle'
    drone2.frequency.value = 72.3
    const dg = ctx.createGain()
    dg.gain.value = 0.055
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 140
    drone.connect(dg)
    drone2.connect(dg)
    dg.connect(lp).connect(bus)

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.035
    lfo.connect(lfoGain).connect(dg.gain)

    const wind = ctx.createBufferSource()
    wind.buffer = this.noise
    wind.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 340
    bp.Q.value = 0.7
    const wg = ctx.createGain()
    wg.gain.value = 0.018
    wind.connect(bp).connect(wg).connect(bus)

    drone.start(now)
    drone2.start(now)
    lfo.start(now)
    wind.start(now)
    this.ambient = { bus, drone, drone2, lfo }

    const pulse = () => {
      if (!this.ctx || !this.enabled) return
      const t = this.ctx.currentTime
      const o = this.ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(60, t)
      o.frequency.exponentialRampToValueAtTime(42, t + 0.7)
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.connect(g).connect(bus)
      o.start(t)
      o.stop(t + 1)
    }
    this.ambientPulse = setInterval(pulse, 4200)
  }

  tone(type, f0, f1, dur, gain, { attack = 0.004, filter = 0, q = 1, reverb = 0, pan = 0 } = {}) {
    if (!this.ctx || !this.enabled) return
    const ctx = this.ctx, t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    let node = o
    if (filter) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = filter
      f.Q.value = q
      node.connect(f)
      node = f
    }
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (panner) {
      panner.pan.value = pan
      node.connect(panner)
      node = panner
    }
    node.connect(g).connect(this.master)
    if (reverb) {
      const send = ctx.createGain()
      send.gain.value = reverb
      g.connect(send).connect(this.reverb)
    }
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  noiseBurst(dur, gain, filterType = 'bandpass', freq = 1200, q = 0.8, reverb = 0, attack = 0.002) {
    if (!this.ctx || !this.enabled) return
    const ctx = this.ctx, t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.playbackRate.value = 0.9 + Math.random() * 0.25
    const f = ctx.createBiquadFilter()
    f.type = filterType
    f.frequency.setValueAtTime(freq, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.32), t + dur)
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master)
    if (reverb) {
      const send = ctx.createGain()
      send.gain.value = reverb
      g.connect(send).connect(this.reverb)
    }
    src.start(t, Math.random() * 0.5)
    src.stop(t + dur + 0.02)
  }

  shot() {
    this.noiseBurst(0.18, 0.34, 'bandpass', 2400, 0.7, 0.55)
    this.noiseBurst(0.32, 0.11, 'lowpass', 700, 0.8, 0.9)
    this.tone('sine', 132, 44, 0.22, 0.32, { filter: 280, reverb: 0.4 })
    this.tone('square', 860, 220, 0.045, 0.045, { filter: 2400 })
  }

  empty() {
    this.tone('square', 1200, 700, 0.03, 0.05, { filter: 3200 })
    this.noiseBurst(0.05, 0.05, 'highpass', 2400, 1)
  }

  reload() {
    const click = (delay, freq, gain) => setTimeout(() => {
      this.tone('square', freq, freq * 0.7, 0.035, gain, { filter: 2800 })
      this.noiseBurst(0.04, gain * 0.8, 'bandpass', 2600, 1.2)
    }, delay)
    click(0, 1400, 0.05)
    click(240, 980, 0.06)
    click(760, 620, 0.07)
    click(1120, 1750, 0.06)
    setTimeout(() => this.noiseBurst(0.08, 0.08, 'bandpass', 3400, 1.4), 1500)
  }

  hit() {
    this.tone('triangle', 1900, 1500, 0.07, 0.075, { filter: 6000 })
    this.tone('sine', 2600, 2100, 0.05, 0.04)
  }

  kill() {
    this.tone('triangle', 1200, 1800, 0.1, 0.08)
    setTimeout(() => this.tone('triangle', 1800, 2400, 0.12, 0.07), 70)
    this.noiseBurst(0.35, 0.12, 'lowpass', 820, 0.9, 0.6)
    this.tone('sine', 72, 34, 0.5, 0.28, { reverb: 0.6 })
  }

  explosion() {
    this.noiseBurst(1.1, 0.34, 'lowpass', 900, 0.8, 1.1)
    this.noiseBurst(0.5, 0.2, 'bandpass', 2200, 0.6, 0.8)
    this.tone('sine', 92, 26, 0.9, 0.4, { filter: 200, reverb: 0.8 })
  }

  hurt() {
    this.tone('sawtooth', 180, 62, 0.28, 0.2, { filter: 460, reverb: 0.3 })
    this.noiseBurst(0.25, 0.15, 'lowpass', 520, 0.7)
  }

  wave() {
    this.tone('sawtooth', 110, 220, 0.7, 0.1, { filter: 700, reverb: 0.5 })
    this.tone('sawtooth', 165, 330, 0.7, 0.07, { filter: 850, reverb: 0.5 })
    this.tone('sine', 55, 55, 1.2, 0.15, { filter: 180, reverb: 0.6 })
  }

  footstep() {
    const now = performance.now()
    if (now - this.lastStep < 280) return
    this.lastStep = now
    this.noiseBurst(0.08, 0.035, 'lowpass', 420, 1.1)
  }

  ui() {
    this.tone('sine', 720, 980, 0.08, 0.04, { filter: 3000 })
  }
}
