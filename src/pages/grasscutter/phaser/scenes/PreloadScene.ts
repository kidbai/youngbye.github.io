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
    // 进入主场景
    this.scene.start('MainScene')
  }

  /** 生成带圆形裁剪的派生纹理（用于头像显示，保持原图比例，中心裁剪，高清支持） */
  private generateCircleTextures(): void {
    const keys = ['minion', 'minion2', 'monster', 'yuanxiao', 'yuanxiao-shoted', 'boss', 'boss-shot']
    
    // 目标纹理尺寸（足够大以保证高清显示，但不会太大导致性能问题）
    // 考虑到游戏中最大显示尺寸约 100px，使用 256px 可以保证在高 DPI 屏幕上也清晰
    const TARGET_SIZE = 256

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

      // 启用高质量图像平滑
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

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
        offsetX, offsetY, cropSize, cropSize,  // 源区域
        0, 0, TARGET_SIZE, TARGET_SIZE          // 目标区域
      )

      // 添加到纹理管理器
      this.textures.addCanvas(circleKey, canvas)
    })
  }
}
