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
   * - 以“灰阶 + 黑色描边”为主，运行时通过 `setTint` 叠色
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

    // 颜色（灰阶）：通过 tint 乘法叠色后，依然能保留“高光/阴影”的相对层次
    const C_OUTLINE = '#0b1220'
    const C_SHADOW = '#6b7280'
    const C_BODY = '#d1d5db'
    const C_HL = '#f9fafb'

    // 小子弹（朝右的“尖头胶囊”）
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

    // 爆炸类投射物（“方形炸弹 + 小引信”）
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

    // 丢大便投掷物（不规则 blob）
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

          // 高光/阴影，让 blob 有点“体积感”
          if (ch === '#') {
            if (x <= 7 && y <= 6) ctx.fillStyle = C_HL
            if (x >= 9 && y >= 8) ctx.fillStyle = C_SHADOW
          }

          ctx.fillRect(x, y, 1, 1)
        }
      }
    })
  }
}
