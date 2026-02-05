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

  /** 生成带圆形 mask 的派生纹理（用于头像显示） */
  private generateCircleTextures(): void {
    const keys = ['minion', 'minion2', 'monster', 'yuanxiao', 'yuanxiao-shoted', 'boss', 'boss-shot']
    keys.forEach((key) => {
      const circleKey = `${key}-circle`
      if (this.textures.exists(circleKey)) return

      const srcTexture = this.textures.get(key)
      const srcFrame = srcTexture.get()
      const size = Math.min(srcFrame.width, srcFrame.height)
      const radius = size / 2

      // 创建 RenderTexture
      const rt = this.make.renderTexture({ width: size, height: size }, false)

      // 画圆形 mask + 贴图
      const graphics = this.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(0xffffff)
      graphics.fillCircle(radius, radius, radius)

      // 先在 rt 上绘制原图（居中）
      const offsetX = (size - srcFrame.width) / 2
      const offsetY = (size - srcFrame.height) / 2
      rt.draw(key, offsetX, offsetY)

      // 使用 mask 裁剪
      const mask = graphics.createGeometryMask()
      rt.setMask(mask)

      // 保存为新纹理
      rt.saveTexture(circleKey)

      // 清理
      graphics.destroy()
      rt.destroy()
    })
  }
}
