// Storage War — 工具函数

/** 两点距离 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 平方距离（避免 sqrt，用于比较） */
export function distanceSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/** 归一化向量 */
export function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/** 两点之间的角度 (弧度) */
export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** [min, max) 随机浮点 */
export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/** 随机整数 [min, max] */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 从数组中随机取一个元素 */
export function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 线性插值 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 限制值在范围内 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 加权随机选择（arr 元素需有 weight 属性） */
export function weightedRandom(arr) {
  const totalWeight = arr.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of arr) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return arr[arr.length - 1];
}

/** 检查两个圆是否碰撞 */
export function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}
