// Storage War — 键盘输入管理

const keys = {};
let enabled = true;

function onKeyDown(e) {
  if (!enabled) return;
  keys[e.key] = true;

  // 阻止游戏按键的默认行为（WASD 滚动、方向键滚动等）
  const gameKeys = [
    'w', 'a', 's', 'd',
    'W', 'A', 'S', 'D',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Escape', ' ',
  ];
  if (gameKeys.includes(e.key)) {
    e.preventDefault();
  }
}

function onKeyUp(e) {
  keys[e.key] = false;
}

/** 初始化输入监听 */
export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

/** 销毁输入监听 */
export function destroyInput() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
}

/** 获取移动输入向量 (WASD / 方向键) — 已归一化 */
export function getMovementVector() {
  let dx = 0;
  let dy = 0;

  if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
  if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
  if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
  if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

  // 归一化对角线移动
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  return { x: dx, y: dy };
}

const justPressedKeys = {};

/** 检查按键是否被按下 */
export function isKeyPressed(key) {
  return !!keys[key];
}

/** 检查按键是否在当前帧刚被按下（仅触发一次，直到松开再按） */
export function isKeyJustPressed(key) {
  if (keys[key] && !justPressedKeys[key]) {
    justPressedKeys[key] = true;
    return true;
  }
  if (!keys[key]) {
    justPressedKeys[key] = false;
  }
  return false;
}

/** 暂停/恢复输入处理 */
export function setInputEnabled(val) {
  enabled = val;
}
