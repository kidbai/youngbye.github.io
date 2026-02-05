/**
 * BootScene - 基础配置、registry 初始化、跳转 PreloadScene
 */

import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    // 可以在这里做一些全局初始化，比如检测设备、设置全局变量等
    this.scene.start('PreloadScene')
  }
}
