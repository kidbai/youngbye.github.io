import Phaser from 'phaser'
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../balance'

/** 像素瓦片尺寸（像素风 + 控制 Tilemap 规模） */
export const TILE_SIZE = 32

/** Tile 索引（与 tileset 的切片顺序一致） */
export enum TileId {
  Grass = 0,
  Water = 1,
  Sand = 2,
  Forest = 3,
  Hill = 4,
  Rock = 5,
}

export const TERRAIN_TILESET_KEY = 'terrain-tiles'

/** 具备物理碰撞、不可跨越的地形 tile */
export const COLLISION_TILE_IDS: number[] = [
  TileId.Water,
  TileId.Forest,
  TileId.Rock,
]

export interface OverworldMapResult {
  tileSize: number
  width: number
  height: number
  map: Phaser.Tilemaps.Tilemap
  layer: Phaser.Tilemaps.TilemapLayer
  collisionTileIds: number[]
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function ensureTerrainTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists(TERRAIN_TILESET_KEY)) return

  const tileCount = 6
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE * tileCount
  canvas.height = TILE_SIZE

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const drawNoise = (
    ox: number,
    base: string,
    speck: string,
    speck2: string,
    density: number,
    rng: () => number
  ) => {
    ctx.fillStyle = base
    ctx.fillRect(ox, 0, TILE_SIZE, TILE_SIZE)

    // 像素噪点（2x2）
    for (let i = 0; i < TILE_SIZE * TILE_SIZE * density; i++) {
      const x = ox + Math.floor(rng() * TILE_SIZE)
      const y = Math.floor(rng() * TILE_SIZE)
      ctx.fillStyle = rng() < 0.6 ? speck : speck2
      ctx.fillRect(x, y, 2, 2)
    }
  }

  const rng = mulberry32(20260206)

  // 0 - 草地
  drawNoise(0 * TILE_SIZE, '#2d7d2f', '#2f8a33', '#256b28', 0.06, rng)

  // 1 - 河流（水）
  drawNoise(1 * TILE_SIZE, '#2b6cb0', '#3182ce', '#245c94', 0.05, rng)
  // 水面高光线
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  for (let y = 6; y < TILE_SIZE; y += 10) {
    ctx.fillRect(1 * TILE_SIZE + 2, y, TILE_SIZE - 6, 2)
  }

  // 2 - 沙地（河岸）
  drawNoise(2 * TILE_SIZE, '#c9a86a', '#d6b77b', '#b89355', 0.05, rng)

  // 3 - 丛林（深绿 + 树影块）
  drawNoise(3 * TILE_SIZE, '#14532d', '#166534', '#0f3f22', 0.05, rng)
  // 树影（更深色块）
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  for (let i = 0; i < 8; i++) {
    const x = 3 * TILE_SIZE + Math.floor(rng() * (TILE_SIZE - 8))
    const y = Math.floor(rng() * (TILE_SIZE - 8))
    ctx.fillRect(x, y, 8, 8)
  }

  // 4 - 山坡（棕绿 + 斜向纹理）
  drawNoise(4 * TILE_SIZE, '#5a7a3b', '#6b8f45', '#4f6c35', 0.04, rng)
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(4 * TILE_SIZE + i * 6, 0, 2, TILE_SIZE)
  }

  // 5 - 岩壁（灰色，强阻挡）
  drawNoise(5 * TILE_SIZE, '#4b5563', '#6b7280', '#374151', 0.05, rng)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(5 * TILE_SIZE + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2)

  scene.textures.addCanvas(TERRAIN_TILESET_KEY, canvas)
}

/**
 * 生成一张固定 seed 的像素风地图，并返回带碰撞的 Tilemap layer。
 */
export function createOverworldMap(scene: Phaser.Scene, seed: number = 20260206): OverworldMapResult {
  ensureTerrainTileset(scene)

  const width = Math.ceil(WORLD_WIDTH / TILE_SIZE)
  const height = Math.ceil(WORLD_HEIGHT / TILE_SIZE)

  const data: number[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => TileId.Grass))

  const rng = mulberry32(seed)

  // ===== 河流：一条横向蜿蜒的水带 =====
  const riverHalfWidth = 2
  for (let x = 0; x < width; x++) {
    const t = x / width
    const yCenter = Math.floor(
      height * 0.52 +
      Math.sin(t * Math.PI * 2) * (height * 0.06) +
      Math.sin(t * Math.PI * 5) * (height * 0.03)
    )

    for (let dy = -riverHalfWidth; dy <= riverHalfWidth; dy++) {
      const y = yCenter + dy
      if (y < 0 || y >= height) continue
      data[y][x] = TileId.Water
    }

    // 河岸沙地
    const shoreY1 = yCenter - riverHalfWidth - 1
    const shoreY2 = yCenter + riverHalfWidth + 1
    if (shoreY1 >= 0) data[shoreY1][x] = TileId.Sand
    if (shoreY2 < height) data[shoreY2][x] = TileId.Sand
  }

  // ===== 丛林：若干个圆形/椭圆形 patch（可碰撞） =====
  const junglePatches = 10
  for (let i = 0; i < junglePatches; i++) {
    const cx = Math.floor(rng() * width)
    const cy = Math.floor(rng() * height)
    const r = 5 + Math.floor(rng() * 10)

    for (let y = cy - r; y <= cy + r; y++) {
      if (y < 0 || y >= height) continue
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || x >= width) continue
        const dx = x - cx
        const dy = y - cy
        const dist2 = dx * dx + dy * dy
        if (dist2 > r * r) continue

        // 不覆盖河流主水体
        if (data[y][x] === TileId.Water) continue

        // 稀疏边缘做过渡
        const edge = dist2 / (r * r)
        if (edge > 0.78 && rng() < 0.55) continue

        data[y][x] = TileId.Forest
      }
    }
  }

  // ===== 山坡/岩壁：左上角与右下角各一片地形 =====
  const hillRegions: Array<{ x0: number; y0: number; x1: number; y1: number }> = [
    { x0: 0, y0: 0, x1: Math.floor(width * 0.35), y1: Math.floor(height * 0.35) },
    { x0: Math.floor(width * 0.62), y0: Math.floor(height * 0.62), x1: width - 1, y1: height - 1 },
  ]

  hillRegions.forEach(({ x0, y0, x1, y1 }) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (data[y][x] === TileId.Water) continue
        if (data[y][x] === TileId.Sand) continue

        const n = rng()
        if (n < 0.08) data[y][x] = TileId.Rock
        else if (n < 0.62) data[y][x] = TileId.Hill
        // 其余保持草地
      }
    }
  })

  // ===== 额外岩壁：随机生成几条“断崖” =====
  const cliffs = 6
  for (let i = 0; i < cliffs; i++) {
    const horizontal = rng() < 0.5
    const len = 18 + Math.floor(rng() * 35)
    const xStart = Math.floor(rng() * (width - 1))
    const yStart = Math.floor(rng() * (height - 1))

    for (let j = 0; j < len; j++) {
      const x = clampInt(xStart + (horizontal ? j : Math.floor(Math.sin(j * 0.5) * 2)), 0, width - 1)
      const y = clampInt(yStart + (horizontal ? Math.floor(Math.sin(j * 0.45) * 2) : j), 0, height - 1)

      if (data[y][x] === TileId.Water) continue
      data[y][x] = TileId.Rock

      // 两侧点缀山坡
      if (x + 1 < width && data[y][x + 1] === TileId.Grass && rng() < 0.5) data[y][x + 1] = TileId.Hill
      if (x - 1 >= 0 && data[y][x - 1] === TileId.Grass && rng() < 0.5) data[y][x - 1] = TileId.Hill
    }
  }

  // 创建 tilemap
  const map = scene.make.tilemap({
    data,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  })

  const tileset = map.addTilesetImage(TERRAIN_TILESET_KEY)
  if (!tileset) {
    throw new Error(`[OverworldMap] Failed to add tileset: ${TERRAIN_TILESET_KEY}`)
  }

  const layer = map.createLayer(0, tileset, 0, 0)
  if (!layer) {
    throw new Error('[OverworldMap] Failed to create tilemap layer')
  }
  layer.setCollision(COLLISION_TILE_IDS)

  return {
    tileSize: TILE_SIZE,
    width,
    height,
    map,
    layer,
    collisionTileIds: [...COLLISION_TILE_IDS],
  }
}

/**
 * 给刷怪/AI用的阻挡判定：命中碰撞 tile 即视为不可走。
 */
export function isBlockedAtWorldXY(layer: Phaser.Tilemaps.TilemapLayer, worldX: number, worldY: number): boolean {
  const tile = layer.getTileAtWorldXY(worldX, worldY, true)
  return !!tile && tile.collides
}
