/**
 * GrassCutter Phaser - Game 实例创建与销毁
 */

import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { MainScene } from './scenes/MainScene'
import { WORLD_WIDTH, WORLD_HEIGHT } from '../balance'

let gameInstance: Phaser.Game | null = null

export interface CreateGameOptions {
  parent: HTMLElement
}

export function createGame(opts: CreateGameOptions): Phaser.Game {
  if (gameInstance) {
    console.warn('[GrassCutter] Game instance already exists, destroying previous.')
    gameInstance.destroy(true)
    gameInstance = null
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: opts.parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a472a', // 深草地绿
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PreloadScene, MainScene],
    // 世界边界在 MainScene 中配置
  }

  gameInstance = new Phaser.Game(config)

  // 存储世界尺寸到 registry，供各 Scene 使用
  gameInstance.registry.set('worldWidth', WORLD_WIDTH)
  gameInstance.registry.set('worldHeight', WORLD_HEIGHT)

  return gameInstance
}

export function destroyGame(): void {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
}

export function getGame(): Phaser.Game | null {
  return gameInstance
}
