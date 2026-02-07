/**
 * GunSfx - 枪械射击音效（Web Audio API 程序化合成）
 *
 * 每种武器使用不同的波形 / 包络 / 滤波参数，实现差异化听感：
 *   pistol     - 短促高频白噪 + 快速衰减，清脆的"啪"
 *   smg        - 极短低频方波脉冲，急促的"哒"
 *   grenadeMg  - smg 同款射击音 + 榴弹发射时的低频"嘭"
 *   cannon     - 长衰减低频正弦 + 噪声混合，厚重的"轰"
 */

import type { GunId } from './PlayerGunSystem'

/** 全局音量（0-1），可用于未来做音量设置 */
const MASTER_VOLUME = 0.25

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // 自动恢复挂起状态（移动端常见）
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/** 创建白噪声 buffer（复用） */
let noiseBuffer: AudioBuffer | null = null

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer

  const length = ctx.sampleRate * 0.5 // 0.5 秒足够
  const buf = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  noiseBuffer = buf
  return noiseBuffer
}

// ============================================================
//  各武器音效实现
// ============================================================

function playPistol(): void {
  const ctx = getAudioCtx()
  const now = ctx.currentTime

  // 白噪声 → 高通滤波 → 增益包络
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx)

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(MASTER_VOLUME * 0.6, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

  noise.connect(hp).connect(gain).connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.08)
}

function playSmg(): void {
  const ctx = getAudioCtx()
  const now = ctx.currentTime

  // 极短方波脉冲
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(180, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.04)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(MASTER_VOLUME * 0.35, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.04)
}

function playGrenadeLaunch(): void {
  const ctx = getAudioCtx()
  const now = ctx.currentTime

  // 低频正弦"嘭" + 噪声尾巴
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, now)
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(MASTER_VOLUME * 0.7, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

  osc.connect(oscGain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.15)

  // 噪声层
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx)

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 800
  bp.Q.value = 1.5

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(MASTER_VOLUME * 0.3, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

  noise.connect(bp).connect(nGain).connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.12)
}

function playCannon(): void {
  const ctx = getAudioCtx()
  const now = ctx.currentTime

  // 深沉正弦
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(80, now)
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.3)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(MASTER_VOLUME * 0.9, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

  // 失真（让"轰"更有力）
  const dist = ctx.createWaveShaper()
  const curve = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1
    curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x))
  }
  dist.curve = curve

  osc.connect(dist).connect(oscGain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.3)

  // 噪声层（爆风感）
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx)

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(1200, now)
  lp.frequency.exponentialRampToValueAtTime(200, now + 0.25)

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(MASTER_VOLUME * 0.5, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

  noise.connect(lp).connect(nGain).connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.25)
}

// ============================================================
//  公共 API
// ============================================================

/** 播放指定武器的射击音效 */
export function playGunSfx(gunId: GunId): void {
  switch (gunId) {
    case 'pistol':
      playPistol()
      break
    case 'smg':
      playSmg()
      break
    case 'grenadeMg':
      playSmg() // 主射击也是机枪声
      break
    case 'cannon':
      playCannon()
      break
  }
}

/** 播放榴弹发射音效（仅 grenadeMg 使用） */
export function playGrenadeSfx(): void {
  playGrenadeLaunch()
}

/** 播放坦克宠物炮弹音效（复用 cannon 音效） */
export function playTankCannonSfx(): void {
  playCannon()
}
