/**
 * PreloadScene - 资源加载
 */

import Phaser from 'phaser'

// 导入资源（Vite 会返回 URL）
import minionImg from '../../../../assets/minion.png'
import minion2Img from '../../../../assets/minion2.png'
import monsterImg from '../../../../assets/monster.png'
import yuanxiaoImg from '../../../../assets/yuanxiao.png'
import yuanxiaoShotedImg from '../../../../assets/yuanxiao-shoted.png'
import bossImg from '../../../../assets/boss.png'
import bossShotImg from '../../../../assets/boss-shot.png'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    // 显示加载进度（可选，简单文字）
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const progressText = this.add
      .text(width / 2, height / 2, '加载中...', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      progressText.setText(`加载中... ${Math.round(value * 100)}%`)
    })

    this.load.on('complete', () => {
      progressText.destroy()
    })

    // 加载游戏资源
    this.load.image('minion', minionImg)
    this.load.image('minion2', minion2Img)
    this.load.image('monster', monsterImg)
    this.load.image('yuanxiao', yuanxiaoImg)
    this.load.image('yuanxiao-shoted', yuanxiaoShotedImg)
    this.load.image('boss', bossImg)
    this.load.image('boss-shot', bossShotImg)
  }

  create(): void {
    // 生成圆形裁剪纹理（玩家/敌人头像需要圆形显示）
    this.generateCircleTextures()

    // 生成像素风子弹/投射物纹理（canvas 程序生成，无需新增图片资源）
    this.generateBulletTextures()

    // 生成像素风武器纹理（玩家持枪展示）
    this.generateWeaponTextures()

    // 生成坦克宠物纹理
    this.generateTankTextures()

    // 进入主场景
    this.scene.start('MainScene')
  }

  /** 生成带圆形裁剪的派生纹理（用于头像显示，保持原图比例，中心裁剪，高清支持） */
  private generateCircleTextures(): void {
    const keys = ['minion', 'minion2', 'monster', 'yuanxiao', 'yuanxiao-shoted', 'boss', 'boss-shot']

    // 目标纹理尺寸
    // 像素风：刻意降低分辨率并关闭平滑缩放，让头像也呈现像素采样效果
    const TARGET_SIZE = 128

    keys.forEach((key) => {
      const circleKey = `${key}-circle`
      if (this.textures.exists(circleKey)) return

      const srcTexture = this.textures.get(key)
      const srcFrame = srcTexture.get()
      const srcW = srcFrame.width
      const srcH = srcFrame.height

      // 取最小边作为源裁剪尺寸（保持比例，中心裁剪）
      const cropSize = Math.min(srcW, srcH)

      // 创建目标尺寸的 canvas
      const canvas = document.createElement('canvas')
      canvas.width = TARGET_SIZE
      canvas.height = TARGET_SIZE
      const ctx = canvas.getContext('2d')!

      // 像素风：关闭图像平滑（nearest）
      ctx.imageSmoothingEnabled = false

      // 绘制圆形裁剪路径
      const radius = TARGET_SIZE / 2
      ctx.beginPath()
      ctx.arc(radius, radius, radius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      // 计算源图中心裁剪的偏移
      const offsetX = (srcW - cropSize) / 2
      const offsetY = (srcH - cropSize) / 2

      // 获取原始图片并绘制（从源图中心裁剪 cropSize x cropSize，缩放到 TARGET_SIZE x TARGET_SIZE）
      const srcImage = srcTexture.getSourceImage() as HTMLImageElement
      ctx.drawImage(
        srcImage,
        offsetX, offsetY, cropSize, cropSize, // 源区域
        0, 0, TARGET_SIZE, TARGET_SIZE // 目标区域
      )

      // 添加到纹理管理器
      this.textures.addCanvas(circleKey, canvas)
    })
  }

  /**
   * 生成像素风子弹/投射物纹理：
   * - 以"灰阶 + 黑色描边"为主，运行时通过 `setTint` 叠色
   * - 保持像素采样（nearest），并尽量使用偶数尺寸方便缩放
   */
  private generateBulletTextures(): void {
    const make = (key: string, size: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false

      // 背景透明
      ctx.clearRect(0, 0, size, size)

      draw(ctx)

      this.textures.addCanvas(key, canvas)
    }

    // 颜色（灰阶）：通过 tint 乘法叠色后，依然能保留"高光/阴影"的相对层次
    const C_OUTLINE = '#0b1220'
    const C_SHADOW = '#6b7280'
    const C_BODY = '#d1d5db'
    const C_HL = '#f9fafb'

    // 小子弹（朝右的"尖头胶囊"）
    make('px-bullet', 12, (ctx) => {
      const p = [
        '............',
        '....oo......',
        '...o##o.....',
        '..o####o....',
        '.o######o...',
        'o#######o..o',
        '.o######o...',
        '..o####o....',
        '...o##o.....',
        '....oo......',
        '............',
        '............',
      ]

      for (let y = 0; y < p.length; y++) {
        for (let x = 0; x < p[y].length; x++) {
          const ch = p[y][x]
          if (ch === '.') continue

          if (ch === 'o') ctx.fillStyle = C_OUTLINE
          if (ch === '#') ctx.fillStyle = C_BODY

          // 轻微高光（上方一条）
          if (ch === '#') {
            if ((y === 3 && x >= 4 && x <= 6) || (y === 4 && x === 4)) {
              ctx.fillStyle = C_HL
            } else if (y >= 6 && x <= 5) {
              ctx.fillStyle = C_SHADOW
            }
          }

          ctx.fillRect(x, y, 1, 1)
        }
      }
    })

    // 大子弹（更圆润的球形弹体）
    make('px-bullet-big', 16, (ctx) => {
      const p = [
        '................',
        '......oooo......',
        '....oo####oo....',
        '...o########o...',
        '..o##########o..',
        '.o############o.',
        '.o############o.',
        'o##############o',
        'o##############o',
        '.o############o.',
        '.o############o.',
        '..o##########o..',
        '...o########o...',
        '....oo####oo....',
        '......oooo......',
        '................',
      ]

      for (let y = 0; y < p.length; y++) {
        for (let x = 0; x < p[y].length; x++) {
          const ch = p[y][x]
          if (ch === '.') continue

          if (ch === 'o') ctx.fillStyle = C_OUTLINE
          if (ch === '#') ctx.fillStyle = C_BODY

          // 左上高光、右下阴影
          if (ch === '#') {
            if ((x <= 7 && y <= 6) && (x + y <= 9)) {
              ctx.fillStyle = C_HL
            } else if (x >= 9 && y >= 8) {
              ctx.fillStyle = C_SHADOW
            }
          }

          ctx.fillRect(x, y, 1, 1)
        }
      }
    })

    // 爆炸类投射物（"方形炸弹 + 小引信"）
    make('px-projectile', 16, (ctx) => {
      // 炸弹主体
      ctx.fillStyle = C_OUTLINE
      ctx.fillRect(4, 5, 8, 8)
      ctx.fillStyle = C_BODY
      ctx.fillRect(5, 6, 6, 6)

      // 高光
      ctx.fillStyle = C_HL
      ctx.fillRect(6, 7, 2, 1)
      ctx.fillRect(6, 8, 1, 1)

      // 阴影
      ctx.fillStyle = C_SHADOW
      ctx.fillRect(9, 10, 2, 1)
      ctx.fillRect(10, 9, 1, 1)

      // 引信（朝右上）
      ctx.fillStyle = C_OUTLINE
      ctx.fillRect(11, 4, 2, 2)
      ctx.fillRect(12, 3, 2, 1)

      ctx.fillStyle = C_HL
      ctx.fillRect(12, 4, 1, 1)
    })

    // 箭矢投射物（朝右的细长箭，16x6）
    make('px-arrow', 16, (ctx) => {
      const SHAFT = '#d4a574'  // 箭杆
      const HEAD = '#9ca3af'   // 箭头金属
      const FEATHER = '#ef4444' // 箭羽红

      // 箭杆（水平中线）
      ctx.fillStyle = SHAFT
      ctx.fillRect(2, 7, 10, 2)

      // 箭头（三角形，朝右）
      ctx.fillStyle = C_OUTLINE
      ctx.fillRect(12, 6, 1, 4)
      ctx.fillStyle = HEAD
      ctx.fillRect(13, 6, 1, 4)
      ctx.fillRect(14, 7, 1, 2)
      ctx.fillRect(15, 7, 1, 2)

      // 箭羽（左端上下各一片）
      ctx.fillStyle = FEATHER
      ctx.fillRect(1, 5, 3, 2)
      ctx.fillRect(1, 9, 3, 2)

      // 箭尾缺口
      ctx.fillStyle = C_OUTLINE
      ctx.fillRect(0, 7, 2, 2)
    })

    // 丢大便投掷物（不规则 blob；灰阶底图，运行时可 tint）
    make('px-poop', 16, (ctx) => {
      const p = [
        '................',
        '................',
        '......oooo......',
        '....oo####oo....',
        '...o########o...',
        '..o##########o..',
        '..o##########o..',
        '...o########o...',
        '....o######o....',
        '.....o####o.....',
        '......oooo......',
        '................',
        '................',
        '................',
        '................',
        '................',
      ]

      for (let y = 0; y < p.length; y++) {
        for (let x = 0; x < p[y].length; x++) {
          const ch = p[y][x]
          if (ch === '.') continue

          if (ch === 'o') ctx.fillStyle = C_OUTLINE
          if (ch === '#') ctx.fillStyle = C_BODY

          // 高光/阴影，让 blob 有点"体积感"
          if (ch === '#') {
            if (x <= 7 && y <= 6) ctx.fillStyle = C_HL
            if (x >= 9 && y >= 8) ctx.fillStyle = C_SHADOW
          }

          ctx.fillRect(x, y, 1, 1)
        }
      }
    })

    // 丢大便投掷物（emoji 风格 💩：三层螺旋 + 表情，24x24 更大更清晰）
    make('px-poop-emoji', 24, (ctx) => {
      const O = '#1a1a2e'   // outline
      const P = '#8b5a2b'   // poop base
      const PH = '#a9713e'  // highlight
      const PS = '#6b3f1f'  // shadow

      // 三层螺旋结构（从上到下：尖顶 → 中层 → 底层）
      // 顶尖
      ctx.fillStyle = O
      ctx.fillRect(10, 1, 4, 2)
      ctx.fillRect(9, 3, 6, 1)
      ctx.fillStyle = PH
      ctx.fillRect(10, 2, 4, 1)
      ctx.fillRect(10, 3, 4, 1)

      // 上层（偏左的螺旋卷）
      ctx.fillStyle = O
      ctx.fillRect(7, 4, 10, 1)
      ctx.fillRect(6, 5, 12, 1)
      ctx.fillRect(6, 6, 12, 1)
      ctx.fillRect(7, 7, 10, 1)
      ctx.fillStyle = PH; ctx.fillRect(7, 5, 10, 1)
      ctx.fillStyle = P; ctx.fillRect(7, 6, 10, 1)

      // 中层（更宽）
      ctx.fillStyle = O
      ctx.fillRect(4, 8, 16, 1)
      ctx.fillRect(3, 9, 18, 1)
      ctx.fillRect(3, 10, 18, 1)
      ctx.fillRect(3, 11, 18, 1)
      ctx.fillRect(4, 12, 16, 1)
      ctx.fillStyle = PH; ctx.fillRect(4, 9, 15, 1)
      ctx.fillStyle = P; ctx.fillRect(4, 10, 15, 1)
      ctx.fillStyle = P; ctx.fillRect(4, 11, 15, 1)
      ctx.fillStyle = PS; ctx.fillRect(5, 12, 14, 0)

      // 底层（最宽）
      ctx.fillStyle = O
      ctx.fillRect(2, 13, 20, 1)
      ctx.fillRect(1, 14, 22, 1)
      ctx.fillRect(1, 15, 22, 1)
      ctx.fillRect(1, 16, 22, 1)
      ctx.fillRect(1, 17, 22, 1)
      ctx.fillRect(2, 18, 20, 1)
      ctx.fillRect(3, 19, 18, 1)
      ctx.fillRect(5, 20, 14, 1)
      ctx.fillStyle = PH; ctx.fillRect(2, 14, 19, 1)
      ctx.fillStyle = P; ctx.fillRect(2, 15, 19, 1)
      ctx.fillStyle = P; ctx.fillRect(2, 16, 19, 1)
      ctx.fillStyle = PS; ctx.fillRect(2, 17, 19, 1)
      ctx.fillStyle = PS; ctx.fillRect(3, 18, 17, 1)

      // 眼白
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(8, 14, 3, 3)
      ctx.fillRect(14, 14, 3, 3)

      // 瞳孔
      ctx.fillStyle = O
      ctx.fillRect(9, 15, 2, 2)
      ctx.fillRect(15, 15, 2, 2)

      // 眼睛高光
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(9, 15, 1, 1)
      ctx.fillRect(15, 15, 1, 1)

      // 嘴巴（弧形微笑）
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(10, 18, 5, 1)
      ctx.fillRect(9, 17, 1, 1)
      ctx.fillRect(15, 17, 1, 1)
    })
  }

  /**
   * 生成像素风武器纹理（朝右，运行时通过旋转对齐射击方向）
   * 所有武器纹理"枪口朝右"，原点设在左侧中心（挂载点）
   */
  private generateWeaponTextures(): void {
    const make = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)
      draw(ctx)
      this.textures.addCanvas(key, canvas)
    }

    // === 小手枪 pistol（24x16，紧凑短小） ===
    make('px-gun-pistol', 24, 16, (ctx) => {
      const O = '#1a1a2e' // outline
      const M = '#6b7280' // metal
      const H = '#9ca3af' // highlight
      const D = '#374151' // dark
      const G = '#8b5a2b' // grip (wood)

      // 枪管（上半，靠右）
      ctx.fillStyle = O; ctx.fillRect(8, 3, 14, 6)
      ctx.fillStyle = M; ctx.fillRect(9, 4, 12, 4)
      ctx.fillStyle = H; ctx.fillRect(9, 4, 12, 1)
      ctx.fillStyle = D; ctx.fillRect(9, 7, 12, 1)

      // 枪口
      ctx.fillStyle = O; ctx.fillRect(22, 4, 2, 4)
      ctx.fillStyle = H; ctx.fillRect(22, 5, 2, 2)

      // 握把（下半，偏左）
      ctx.fillStyle = O; ctx.fillRect(8, 9, 6, 7)
      ctx.fillStyle = G; ctx.fillRect(9, 10, 4, 5)
      ctx.fillStyle = '#a0522d'; ctx.fillRect(9, 10, 4, 1) // grip highlight

      // 扳机护圈
      ctx.fillStyle = O; ctx.fillRect(13, 9, 4, 3)
      ctx.fillStyle = M; ctx.fillRect(14, 10, 2, 1)
    })

    // === 冲锋枪 smg（32x16，加长枪管 + 弹匣） ===
    make('px-gun-smg', 32, 16, (ctx) => {
      const O = '#1a1a2e'
      const M = '#6b7280'
      const H = '#9ca3af'
      const D = '#374151'
      const G = '#4b5563' // dark grip

      // 枪托（左侧）
      ctx.fillStyle = O; ctx.fillRect(0, 4, 6, 5)
      ctx.fillStyle = D; ctx.fillRect(1, 5, 4, 3)

      // 机匣（中段）
      ctx.fillStyle = O; ctx.fillRect(5, 3, 16, 6)
      ctx.fillStyle = M; ctx.fillRect(6, 4, 14, 4)
      ctx.fillStyle = H; ctx.fillRect(6, 4, 14, 1)
      ctx.fillStyle = D; ctx.fillRect(6, 7, 14, 1)

      // 枪管（右侧细长）
      ctx.fillStyle = O; ctx.fillRect(21, 4, 11, 4)
      ctx.fillStyle = M; ctx.fillRect(22, 5, 9, 2)
      ctx.fillStyle = H; ctx.fillRect(22, 5, 9, 1)

      // 枪口
      ctx.fillStyle = O; ctx.fillRect(30, 4, 2, 4)
      ctx.fillStyle = '#ef4444'; ctx.fillRect(31, 5, 1, 2) // muzzle flash hint

      // 弹匣（下方）
      ctx.fillStyle = O; ctx.fillRect(12, 9, 5, 7)
      ctx.fillStyle = G; ctx.fillRect(13, 10, 3, 5)
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(13, 14, 3, 1) // bullet bottom

      // 握把
      ctx.fillStyle = O; ctx.fillRect(8, 9, 4, 5)
      ctx.fillStyle = D; ctx.fillRect(9, 10, 2, 3)
    })

    // === 榴弹机枪 grenadeMg（36x18，双管 + 榴弹筒） ===
    make('px-gun-grenadeMg', 36, 18, (ctx) => {
      const O = '#1a1a2e'
      const M = '#6b7280'
      const H = '#9ca3af'
      const D = '#374151'
      const G = '#4b5563'
      const BRASS = '#d97706' // grenade accent

      // 枪托
      ctx.fillStyle = O; ctx.fillRect(0, 4, 6, 6)
      ctx.fillStyle = D; ctx.fillRect(1, 5, 4, 4)

      // 机匣
      ctx.fillStyle = O; ctx.fillRect(5, 3, 18, 7)
      ctx.fillStyle = M; ctx.fillRect(6, 4, 16, 5)
      ctx.fillStyle = H; ctx.fillRect(6, 4, 16, 1)
      ctx.fillStyle = D; ctx.fillRect(6, 8, 16, 1)

      // 主枪管
      ctx.fillStyle = O; ctx.fillRect(23, 4, 12, 4)
      ctx.fillStyle = M; ctx.fillRect(24, 5, 10, 2)
      ctx.fillStyle = H; ctx.fillRect(24, 5, 10, 1)

      // 枪口火焰提示
      ctx.fillStyle = '#ef4444'; ctx.fillRect(34, 5, 2, 2)

      // 榴弹筒（下方副管，较粗）
      ctx.fillStyle = O; ctx.fillRect(14, 10, 16, 5)
      ctx.fillStyle = BRASS; ctx.fillRect(15, 11, 14, 3)
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(15, 11, 14, 1)

      // 榴弹筒口
      ctx.fillStyle = O; ctx.fillRect(30, 10, 3, 5)
      ctx.fillStyle = BRASS; ctx.fillRect(31, 11, 1, 3)

      // 握把
      ctx.fillStyle = O; ctx.fillRect(8, 10, 5, 6)
      ctx.fillStyle = G; ctx.fillRect(9, 11, 3, 4)

      // 弹匣（小）
      ctx.fillStyle = O; ctx.fillRect(17, 1, 4, 3)
      ctx.fillStyle = M; ctx.fillRect(18, 1, 2, 2)
    })

    // === 大炮 cannon（40x20，巨型炮管 + 厚实底座） ===
    make('px-gun-cannon', 40, 20, (ctx) => {
      const O = '#1a1a2e'
      const M = '#6b7280'
      const H = '#9ca3af'
      const D = '#374151'
      const STEEL = '#4b5563'
      const GOLD = '#d97706'

      // 底座（后方，宽大）
      ctx.fillStyle = O; ctx.fillRect(0, 5, 10, 10)
      ctx.fillStyle = STEEL; ctx.fillRect(1, 6, 8, 8)
      ctx.fillStyle = D; ctx.fillRect(1, 12, 8, 2)

      // 机匣（中段厚实）
      ctx.fillStyle = O; ctx.fillRect(9, 3, 14, 14)
      ctx.fillStyle = M; ctx.fillRect(10, 4, 12, 12)
      ctx.fillStyle = H; ctx.fillRect(10, 4, 12, 2)
      ctx.fillStyle = D; ctx.fillRect(10, 14, 12, 2)

      // 装饰环
      ctx.fillStyle = GOLD; ctx.fillRect(10, 6, 1, 8)
      ctx.fillStyle = GOLD; ctx.fillRect(21, 6, 1, 8)

      // 炮管（粗壮锥形）
      ctx.fillStyle = O; ctx.fillRect(23, 4, 15, 12)
      ctx.fillStyle = M; ctx.fillRect(24, 5, 13, 10)
      ctx.fillStyle = H; ctx.fillRect(24, 5, 13, 2)
      ctx.fillStyle = D; ctx.fillRect(24, 13, 13, 2)

      // 炮口（更粗）
      ctx.fillStyle = O; ctx.fillRect(37, 2, 3, 16)
      ctx.fillStyle = STEEL; ctx.fillRect(38, 3, 1, 14)
      ctx.fillStyle = H; ctx.fillRect(38, 3, 1, 3)

      // 炮口内膛（深色）
      ctx.fillStyle = '#0f172a'; ctx.fillRect(39, 6, 1, 8)

      // 瞄准具
      ctx.fillStyle = O; ctx.fillRect(15, 1, 2, 3)
      ctx.fillStyle = '#ef4444'; ctx.fillRect(15, 1, 2, 1)

      // 握把
      ctx.fillStyle = O; ctx.fillRect(12, 17, 6, 3)
      ctx.fillStyle = STEEL; ctx.fillRect(13, 17, 4, 2)
    })

    // === 敌人小枪 px-gun-enemy（22x12，短小红色调） ===
    make('px-gun-enemy', 22, 12, (ctx) => {
      const O = '#1a1a2e'
      const M = '#9f1239' // 暗红
      const H = '#e11d48' // 亮红
      const D = '#4c0519'
      const G = '#44403c' // 握把

      // 枪管
      ctx.fillStyle = O; ctx.fillRect(6, 2, 14, 5)
      ctx.fillStyle = M; ctx.fillRect(7, 3, 12, 3)
      ctx.fillStyle = H; ctx.fillRect(7, 3, 12, 1)
      ctx.fillStyle = D; ctx.fillRect(7, 5, 12, 1)

      // 枪口
      ctx.fillStyle = O; ctx.fillRect(20, 3, 2, 3)
      ctx.fillStyle = H; ctx.fillRect(20, 4, 2, 1)

      // 握把
      ctx.fillStyle = O; ctx.fillRect(6, 7, 5, 5)
      ctx.fillStyle = G; ctx.fillRect(7, 8, 3, 3)
    })

    // === 弓 px-bow（24x22，像素风短弓，朝右） ===
    make('px-bow', 24, 22, (ctx) => {
      const O = '#1a1a2e'
      const WOOD = '#8b5a2b'   // 弓身
      const WH = '#a0522d'     // 弓身高光
      const WD = '#5c3317'     // 弓身暗面
      const STRING = '#d1d5db' // 弦

      // 弓身（C 形弧，从上到下）
      // 上梢
      ctx.fillStyle = O; ctx.fillRect(4, 0, 3, 2)
      ctx.fillStyle = WH; ctx.fillRect(5, 0, 1, 2)
      // 上臂
      ctx.fillStyle = O; ctx.fillRect(2, 2, 3, 4)
      ctx.fillStyle = WOOD; ctx.fillRect(3, 2, 1, 4)
      ctx.fillStyle = WH; ctx.fillRect(3, 2, 1, 1)
      // 上弯
      ctx.fillStyle = O; ctx.fillRect(1, 6, 3, 3)
      ctx.fillStyle = WOOD; ctx.fillRect(2, 6, 1, 3)
      // 握把（中段，加厚）
      ctx.fillStyle = O; ctx.fillRect(0, 9, 4, 4)
      ctx.fillStyle = WOOD; ctx.fillRect(1, 9, 2, 4)
      ctx.fillStyle = WD; ctx.fillRect(1, 12, 2, 1)
      // 下弯
      ctx.fillStyle = O; ctx.fillRect(1, 13, 3, 3)
      ctx.fillStyle = WOOD; ctx.fillRect(2, 13, 1, 3)
      // 下臂
      ctx.fillStyle = O; ctx.fillRect(2, 16, 3, 4)
      ctx.fillStyle = WOOD; ctx.fillRect(3, 16, 1, 4)
      ctx.fillStyle = WH; ctx.fillRect(3, 19, 1, 1)
      // 下梢
      ctx.fillStyle = O; ctx.fillRect(4, 20, 3, 2)
      ctx.fillStyle = WH; ctx.fillRect(5, 20, 1, 2)

      // 弓弦（从上梢到下梢，垂直线偏右）
      ctx.fillStyle = STRING
      for (let y = 1; y <= 20; y++) {
        ctx.fillRect(6, y, 1, 1)
      }

      // 箭（横躺在弓上，朝右）
      // 箭杆
      ctx.fillStyle = '#d4a574'
      ctx.fillRect(6, 10, 14, 2)
      // 箭头
      ctx.fillStyle = O; ctx.fillRect(20, 9, 2, 4)
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(21, 10, 2, 2)
      ctx.fillRect(23, 10, 1, 2)
      // 箭羽
      ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 8, 2, 2)
      ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 12, 2, 2)
    })

    // === 卷纸 px-toilet-roll（20x16，白色卷筒 + 纸张尾巴） ===
    make('px-toilet-roll', 20, 16, (ctx) => {
      const O = '#1a1a2e'
      const W = '#f9fafb' // 白纸
      const WS = '#d1d5db' // 纸阴影
      const CORE = '#d4a574' // 纸芯棕色

      // 卷筒主体（椭圆形）
      ctx.fillStyle = O; ctx.fillRect(3, 2, 10, 12)
      ctx.fillStyle = W; ctx.fillRect(4, 3, 8, 10)
      ctx.fillStyle = WS; ctx.fillRect(4, 10, 8, 3)

      // 纸芯（中心圆环）
      ctx.fillStyle = CORE; ctx.fillRect(6, 5, 4, 4)
      ctx.fillStyle = O; ctx.fillRect(7, 6, 2, 2)

      // 飘出的纸尾巴（朝右）
      ctx.fillStyle = W; ctx.fillRect(13, 4, 5, 3)
      ctx.fillStyle = WS; ctx.fillRect(13, 6, 5, 1)
      ctx.fillStyle = W; ctx.fillRect(16, 7, 3, 2)
      ctx.fillStyle = WS; ctx.fillRect(16, 8, 3, 1)

      // 纸尾末端卷曲
      ctx.fillStyle = O; ctx.fillRect(18, 7, 1, 3)
      ctx.fillStyle = W; ctx.fillRect(17, 9, 2, 2)

      // 卷筒描边加粗（上下弧）
      ctx.fillStyle = O
      ctx.fillRect(4, 2, 8, 1)
      ctx.fillRect(4, 13, 8, 1)
    })
  }

  /** 生成坦克宠物像素纹理 */
  private generateTankTextures(): void {
    const make = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)
      draw(ctx)
      this.textures.addCanvas(key, canvas)
    }

    // === 坦克车身 px-tank-body（36x24） ===
    make('px-tank-body', 36, 24, (ctx) => {
      const O = '#1a1a2e'
      const ARMOR = '#2d6a4f'
      const AH = '#40916c'
      const AD = '#1b4332'
      const TRACK = '#374151'
      const TH = '#4b5563'

      // 履带（上下两条）
      ctx.fillStyle = O; ctx.fillRect(2, 0, 32, 5)
      ctx.fillStyle = TRACK; ctx.fillRect(3, 1, 30, 3)
      ctx.fillStyle = TH; ctx.fillRect(3, 1, 30, 1)

      ctx.fillStyle = O; ctx.fillRect(2, 19, 32, 5)
      ctx.fillStyle = TRACK; ctx.fillRect(3, 20, 30, 3)
      ctx.fillStyle = TH; ctx.fillRect(3, 20, 30, 1)

      // 车身（中间装甲块）
      ctx.fillStyle = O; ctx.fillRect(4, 5, 28, 14)
      ctx.fillStyle = ARMOR; ctx.fillRect(5, 6, 26, 12)
      ctx.fillStyle = AH; ctx.fillRect(5, 6, 26, 3)
      ctx.fillStyle = AD; ctx.fillRect(5, 15, 26, 3)

      // 装甲装饰线
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(6, 11, 24, 1)

      // 履带轮子（简化圆点）
      ctx.fillStyle = TH
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(5 + i * 6, 2, 2, 1)
        ctx.fillRect(5 + i * 6, 21, 2, 1)
      }
    })

    // === 坦克炮管 px-tank-turret（28x10） ===
    make('px-tank-turret', 28, 10, (ctx) => {
      const O = '#1a1a2e'
      const M = '#6b7280'
      const H = '#9ca3af'
      const D = '#374151'

      // 炮塔底座（左侧圆形）
      ctx.fillStyle = O; ctx.fillRect(0, 1, 10, 8)
      ctx.fillStyle = M; ctx.fillRect(1, 2, 8, 6)
      ctx.fillStyle = H; ctx.fillRect(1, 2, 8, 2)
      ctx.fillStyle = D; ctx.fillRect(1, 6, 8, 2)

      // 炮管（粗管朝右）
      ctx.fillStyle = O; ctx.fillRect(9, 2, 17, 6)
      ctx.fillStyle = M; ctx.fillRect(10, 3, 15, 4)
      ctx.fillStyle = H; ctx.fillRect(10, 3, 15, 1)
      ctx.fillStyle = D; ctx.fillRect(10, 6, 15, 1)

      // 炮口
      ctx.fillStyle = O; ctx.fillRect(25, 1, 3, 8)
      ctx.fillStyle = '#4b5563'; ctx.fillRect(26, 2, 1, 6)
      ctx.fillStyle = '#0f172a'; ctx.fillRect(27, 3, 1, 4)
    })
  }
}
