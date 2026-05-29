// Storage War — 游戏系统 (敌人生成器, 碰撞检测)

import { ENEMY_TYPES, SPAWNER, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { randomBetween, weightedRandom, circleCollision } from './utils.js';
import { Enemy } from './entities.js';

/** 敌人生成器 */
export class EnemySpawner {
  constructor() {
    this.timer = 0;
  }

  /** 获取当前已解锁的敌人类型列表 */
  getUnlockedTypes(gameTime) {
    return Object.entries(ENEMY_TYPES)
      .filter(([_, def]) => gameTime >= def.unlockTime)
      .map(([key, def]) => ({ key, ...def }));
  }

  /** 获取当前生成间隔 */
  getSpawnInterval(gameTime) {
    return Math.max(
      SPAWNER.minInterval,
      SPAWNER.initialInterval - gameTime * SPAWNER.intervalDecay
    );
  }

  /** 每帧更新 */
  update(dt, gameTime, enemies, maxEnemies, camX, camY) {
    this.timer += dt;
    const interval = this.getSpawnInterval(gameTime);
    const types = this.getUnlockedTypes(gameTime);

    if (types.length === 0) return;

    // 一次可能生成多个（当间隔很小时）
    while (this.timer >= interval && enemies.length < maxEnemies) {
      this.timer -= interval;
      const typeDef = weightedRandom(types);
      const pos = this.randomEdgePosition(camX, camY);
      enemies.push(new Enemy(typeDef, pos.x, pos.y, gameTime));
    }
  }

  /** 在摄像机视口边缘随机生成位置 */
  randomEdgePosition(camX, camY) {
    const margin = SPAWNER.spawnMargin;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: return { x: camX + randomBetween(0, CANVAS_WIDTH), y: camY - margin };
      case 1: return { x: camX + randomBetween(0, CANVAS_WIDTH), y: camY + CANVAS_HEIGHT + margin };
      case 2: return { x: camX - margin, y: camY + randomBetween(0, CANVAS_HEIGHT) };
      case 3: return { x: camX + CANVAS_WIDTH + margin, y: camY + randomBetween(0, CANVAS_HEIGHT) };
      default: return { x: camX + CANVAS_WIDTH / 2, y: camY - margin };
    }
  }
}

/** 检测玩家与敌人的碰撞，返回是否死亡 */
export function checkPlayerEnemyCollision(player, enemies) {
  for (const enemy of enemies) {
    if (circleCollision(player, enemy)) {
      const died = player.takeDamage(enemy.damage);
      if (died) return true;
    }
  }
  return false;
}
