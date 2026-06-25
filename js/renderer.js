// Storage War — Canvas 渲染函数

import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from './constants.js';
import { t } from './i18n.js';

const ACTIVE_COLOR = '#74b9ff';
const PASSIVE_COLOR = '#55efc4';

// ========== 玩家精灵图加载 ==========

let playerSprite = new Image();
playerSprite.src = './205.png';
let spriteLoaded = false;
playerSprite.onload = () => { spriteLoaded = true; };

// Doge boss 精灵图（加载后去白底）
let dogeSprite = null;
let dogeSpriteLoaded = false;
(function() {
  const img = new Image();
  img.src = './doge.jpg';
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i+1], b = px[i+2];
      // 白色/近白色像素变透明
      if (r > 220 && g > 220 && b > 220) {
        px[i+3] = 0;
      }
    }
    ctx.putImageData(data, 0, 0);
    dogeSprite = c;
    dogeSpriteLoaded = true;
  };
})();

export function setPlayerSprite(img) {
  playerSprite = img;
  spriteLoaded = true;
}

export function resetPlayerSprite() {
  playerSprite = new Image();
  playerSprite.src = './205.png';
  spriteLoaded = false;
  playerSprite.onload = () => { spriteLoaded = true; };
}

// ========== Dogecoin 弹幕精灵图 ==========

const dogeCoinProjSource = new Image();
dogeCoinProjSource.src = './dogecoin.svg';
let dogeCoinProjSprite = null;
let dogeCoinProjLoaded = false;
dogeCoinProjSource.onload = () => {
  const S = 28;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.drawImage(dogeCoinProjSource, 0, 0, S, S);
  dogeCoinProjSprite = canvas;
  dogeCoinProjLoaded = true;
};

// ========== XP Coin 精灵图加载（Filecoin 标志） ==========

const coinSpriteSource = new Image();
coinSpriteSource.src = './Filecoin.svg.png';
let coinSprite = null;
let coinSpriteLoaded = false;
coinSpriteSource.onload = () => {
  // 预缩放到中等尺寸：smooth 保留标志细节 → 渲染时 nearest 出像素风
  const S = 24;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.drawImage(coinSpriteSource, 0, 0, S, S);
  coinSprite = canvas;
  coinSpriteLoaded = true;
};

// ========== 背景 ==========

export function drawBackground(ctx, camX, camY) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  const step = 48;
  const mod = (n, m) => ((n % m) + m) % m;
  const startX = -mod(camX, step);
  const startY = -mod(camY, step);
  for (let x = startX; x < CANVAS_WIDTH; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = startY; y < CANVAS_HEIGHT; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

// ========== 玩家 — 圆形头像 ==========

export function drawPlayer(ctx, player) {
  const { x, y, radius } = player;

  const flicker = player.isInvincible && Math.floor(player.invincibleTimer * 30) % 2 === 0;

  const headSize = radius * 2.3;
  const headR = headSize / 2;

  // --- 头像 ---
  ctx.save();
  if (flicker) ctx.globalAlpha = 0.4;
  ctx.translate(x, y);

  if (spriteLoaded) {
    ctx.beginPath();
    ctx.arc(0, 0, headR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(playerSprite, -headR, -headR, headSize, headSize);
  } else {
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ========== 敌人 — 像素风精灵 ==========

/** 敌人像素精灵缓存 */
const enemySpriteCache = {};

// ---- 像素绘制工具 ----

/** 解析 hex 颜色并调整亮度 */
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v | 0)).toString(16).padStart(2, '0')).join('');
}
function brighten(hex, a) { const [r, g, b] = hexToRgb(hex); return rgbToHex(r + a, g + a, b + a); }
function darken(hex, a) { return brighten(hex, -a); }

/** 在像素画布上绘点 */
function pset(c, d, x, y, color) {
  if (x >= 0 && x < d && y >= 0 && y < d) { c.fillStyle = color; c.fillRect(x, y, 1, 1); }
}

/** 在 d×d 画布上绘制填充圆 */
function fillCircle(c, d, cx, cy, r, color) {
  for (let row = 0; row < d; row++) {
    const dy = row - cy;
    for (let col = 0; col < d; col++) {
      const dx = col - cx;
      if (dx * dx + dy * dy <= r * r) pset(c, d, col, row, color);
    }
  }
}

/** 判断点 (px,py) 是否在顶点数组 verts 定义的多边形内 */
function pointInPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y;
    const xj = verts[j].x, yj = verts[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 在多边形内逐像素填充 */
function fillPoly(c, d, verts, color) {
  for (let row = 0; row < d; row++)
    for (let col = 0; col < d; col++)
      if (pointInPolygon(col + 0.5, row + 0.5, verts)) pset(c, d, col, row, color);
}

/** 给已有形状描 1px 深色边（检测透明→非透明边界，单次 getImageData） */
function outlineShape(c, d, outlineColor) {
  const img = c.getImageData(0, 0, d, d);
  const px = img.data;
  const alpha = (x, y) => {
    if (x < 0 || x >= d || y < 0 || y >= d) return 0;
    return px[(y * d + x) * 4 + 3];
  };
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      if (alpha(x, y) > 0) continue;
      let touching = false;
      for (let dy = -1; dy <= 1 && !touching; dy++)
        for (let dx = -1; dx <= 1 && !touching; dx++)
          if ((dx || dy) && alpha(x + dx, y + dy) > 0) { touching = true; break; }
      if (touching) { c.fillStyle = outlineColor; c.fillRect(x, y, 1, 1); }
    }
  }
}

// =====================================================
//  敌人像素精灵生成
// =====================================================

/** 生成像素风敌人精灵（低分辨率 + 最近邻放大） */
function generateEnemySprite(typeKey, radius) {
  const displaySize = Math.ceil(radius * 2);
  // 提高内部分辨率以容纳更多细节
  const pSize = Math.max(10, Math.ceil(displaySize / 2.2));
  const canvas = document.createElement('canvas');
  canvas.width = pSize;
  canvas.height = pSize;
  const c = canvas.getContext('2d');
  const d = pSize;
  const h = Math.floor(d / 2);
  const BG = '#0a0a1a';

  switch (typeKey) {

    // ============================================================
    //  FLOPPY DISK — 3.5" 软盘，金属滑片+纸标签+蓝黑塑料壳
    // ============================================================
    case 'floppy': {
      const bodyClr = '#4a5a7a', bodyHi = brighten(bodyClr, 30), bodyLo = darken(bodyClr, 40);
      const metalClr = '#b8b8b8', metalHi = brighten(metalClr, 35), metalLo = darken(metalClr, 35);
      const labelClr = '#f0ead0', labelLo = darken(labelClr, 28);
      const outline = darken(bodyClr, 55);
      const margin = 1, innerEnd = d - margin;
      const metalH = Math.max(2, Math.floor(d * 0.26));
      const labelH = Math.max(3, Math.floor(d * 0.30));
      const bodyTop = margin + metalH + labelH;

      // --- 金属滑片 ---
      for (let row = margin; row < margin + metalH; row++) {
        for (let col = margin; col < innerEnd; col++) {
          const edge = (row === margin || row === margin + metalH - 1 || col === margin || col === innerEnd - 1);
          pset(c, d, col, row, edge ? metalLo : metalClr);
        }
      }
      // 滑片高光条
      for (let col = margin + 1; col < innerEnd - 1; col++)
        pset(c, d, col, margin + 1, metalHi);
      // 滑片中央滑动刻痕
      const grooveY = margin + Math.floor(metalH / 2);
      for (let col = Math.floor(d * 0.25); col < Math.floor(d * 0.75); col++)
        pset(c, d, col, grooveY, darken(metalClr, 20));
      // 写保护缺口（右上角）
      const wpNotchX = innerEnd - 3, wpNotchY = margin;
      pset(c, d, wpNotchX, wpNotchY, BG); pset(c, d, wpNotchX + 1, wpNotchY, BG);
      pset(c, d, wpNotchX, wpNotchY + 1, BG); pset(c, d, wpNotchX + 1, wpNotchY + 1, BG);

      // --- 纸标签 ---
      for (let row = margin + metalH; row < bodyTop; row++) {
        for (let col = margin; col < innerEnd; col++) {
          const edge = row === margin + metalH || row === bodyTop - 1 || col === margin || col === innerEnd - 1;
          pset(c, d, col, row, edge ? labelLo : labelClr);
        }
      }
      // 标签文字线
      for (let ln = 0; ln < Math.min(3, labelH - 1); ln++) {
        const ly = margin + metalH + 1 + ln;
        if (ly < bodyTop - 1) {
          const lw = Math.floor(d * (0.5 + ln * 0.12));
          for (let col = margin + 2; col < margin + 2 + lw && col < innerEnd - 2; col++)
            pset(c, d, col, ly, labelLo);
        }
      }

      // --- 塑料壳 ---
      for (let row = bodyTop; row < innerEnd; row++) {
        for (let col = margin; col < innerEnd; col++) {
          const edge = row === bodyTop || row === innerEnd - 1 || col === margin || col === innerEnd - 1;
          pset(c, d, col, row, edge ? outline : bodyClr);
        }
      }
      // HD 标识孔（右下角小方块）
      const hdX = innerEnd - 3, hdY = innerEnd - 4;
      pset(c, d, hdX, hdY, bodyLo); pset(c, d, hdX + 1, hdY, bodyLo);
      pset(c, d, hdX, hdY + 1, bodyLo); pset(c, d, hdX + 1, hdY + 1, darken(bodyLo, 30));
      // 机身左上高光
      for (let row = bodyTop + 1; row < bodyTop + 3; row++)
        for (let col = margin + 1; col < Math.floor(d * 0.35); col++)
          pset(c, d, col, row, bodyHi);
      // 机身底部阴影线
      for (let col = margin + 1; col < innerEnd - 1; col++)
        pset(c, d, col, innerEnd - 2, darken(bodyClr, 55));

      break;
    }

    // ============================================================
    //  SSD — 2.5" 固态硬盘，PCB+主控芯片+NAND颗粒+SATA接口
    // ============================================================
    case 'ssd': {
      const pcbClr = '#1a6b5a', pcbHi = brighten(pcbClr, 25), pcbLo = darken(pcbClr, 25);
      const chipClr = '#111', chipLo = '#222';
      const pinClr = '#c8a030', pinLo = darken(pinClr, 30);
      const outline = darken(pcbClr, 45);
      const margin = 1;
      const bodyT = Math.floor(d * 0.18), bodyB = Math.floor(d * 0.82);
      const bodyR = Math.floor(d * 0.78);

      // PCB 主体
      for (let row = bodyT; row < bodyB; row++) {
        for (let col = margin; col < bodyR; col++) {
          const edge = row === bodyT || row === bodyB - 1 || col === margin || col === bodyR - 1;
          pset(c, d, col, row, edge ? outline : pcbClr);
        }
        // 左侧高光
        for (let col = margin; col < Math.floor(d * 0.22); col++)
          pset(c, d, col, row, pcbHi);
        // 右侧阴影
        for (let col = Math.floor(d * 0.68); col < bodyR; col++)
          pset(c, d, col, row, pcbLo);
      }

      // SATA 金手指（右侧两排）
      for (let row = bodyT + 1; row < bodyB - 1; row++) {
        pset(c, d, bodyR, row, pinClr);
        pset(c, d, bodyR + 1, row, row % 3 === 0 ? pinLo : pinClr);
      }

      // 主控芯片（中央偏左，小方块）
      const ctrlCX = Math.floor(d * 0.32), ctrlCY = bodyT + Math.floor((bodyB - bodyT) * 0.4);
      const ctrlHW = Math.max(2, Math.floor(d * 0.14));
      for (let dy = -ctrlHW; dy <= ctrlHW; dy++)
        for (let dx = -ctrlHW; dx <= ctrlHW; dx++)
          pset(c, d, ctrlCX + dx, ctrlCY + dy, chipClr);
      // 芯片引脚（小点环绕）
      for (let i = -ctrlHW - 1; i <= ctrlHW + 1; i++) {
        pset(c, d, ctrlCX + i, ctrlCY - ctrlHW - 1, pinClr);
        pset(c, d, ctrlCX + i, ctrlCY + ctrlHW + 1, pinClr);
      }

      // NAND 颗粒（两个矩形，上下排列）
      for (const nandCY of [bodyT + Math.floor((bodyB - bodyT) * 0.25), bodyT + Math.floor((bodyB - bodyT) * 0.68)]) {
        const nandW = Math.max(2, Math.floor(d * 0.16));
        const nandH = Math.max(1, Math.floor(d * 0.08));
        const nandX = Math.floor(d * 0.5);
        for (let dy = -nandH; dy <= nandH; dy++)
          for (let dx = -nandW; dx <= nandW; dx++)
            pset(c, d, nandX + dx, nandCY + dy, chipLo);
      }

      // 走线（细横线）
      const traceY = bodyT + Math.floor((bodyB - bodyT) * 0.55);
      for (let col = Math.floor(d * 0.18); col < Math.floor(d * 0.55); col += 2)
        pset(c, d, col, traceY, brighten(pcbClr, 15));

      break;
    }

    // ============================================================
    //  HDD — 3.5" 机械硬盘，金属顶盖+螺丝+主轴+盘片纹理
    // ============================================================
    case 'hdd': {
      const coverClr = '#6b7b8a', coverHi = brighten(coverClr, 20), coverLo = darken(coverClr, 30);
      const platterClr = '#4a5a68';
      const hubClr = '#959595';
      const screwClr = darken(coverClr, 45);
      const outline = darken(coverClr, 50);

      // 圆形顶盖
      fillCircle(c, d, h, h, h - 1, coverClr);
      outlineShape(c, d, outline, BG);

      // 四角螺丝
      const screwOff = Math.floor(h * 0.52);
      for (const [sx, sy] of [[h - screwOff, h - screwOff], [h + screwOff, h - screwOff],
                              [h - screwOff, h + screwOff], [h + screwOff, h + screwOff]]) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (dx * dx + dy * dy <= 1.5)
              pset(c, d, sx + dx, sy + dy, screwClr);
      }

      // 顶盖高光弧
      for (let row = 1; row < Math.floor(d * 0.28); row++) {
        for (let col = 1; col < d - 1; col++) {
          const dx = col - h, dy = row - h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= h - 2 && dist >= h - 5 && col <= h + 2)
            pset(c, d, col, row, coverHi);
        }
      }

      // 同心圆凹陷（冲压纹理）
      for (let ring = 0; ring < 2; ring++) {
        const rr = Math.floor(h * (0.78 - ring * 0.22));
        for (let row = h - rr - 1; row <= h + rr + 1; row++) {
          for (let col = h - rr - 1; col <= h + rr + 1; col++) {
            const dx = col - h, dy = row - h;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(dist - rr) < 0.8)
              pset(c, d, col, row, coverLo);
          }
        }
      }

      // 盘片区（透过顶盖"窗口"可见）
      const platterR = Math.floor(h * 0.48);
      fillCircle(c, d, h, h, platterR, platterClr);
      // 盘片同心纹理
      for (let ring = 1; ring <= 2; ring++) {
        const rr = Math.floor(platterR * (1 - ring * 0.3));
        for (let row = h - rr - 1; row <= h + rr + 1; row++) {
          for (let col = h - rr - 1; col <= h + rr + 1; col++) {
            const dx = col - h, dy = row - h;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(dist - rr) < 0.7)
              pset(c, d, col, row, darken(platterClr, 15));
          }
        }
      }

      // 主轴电机
      const hubR = Math.max(2, Math.floor(h * 0.18));
      fillCircle(c, d, h, h, hubR, hubClr);
      fillCircle(c, d, h, h, Math.max(1, hubR - 1), darken(hubClr, 20));
      // 主轴中心小点
      pset(c, d, h, h, darken(hubClr, 40));

      // 读写臂（从右下伸向盘面的一条细线）
      const armStartX = h + Math.floor(h * 0.5), armStartY = h + Math.floor(h * 0.4);
      const armEndX = h + Math.floor(h * 0.15), armEndY = h - Math.floor(h * 0.1);
      // 简化为几个点
      const armLen = Math.floor(h * 0.6);
      for (let t = 0; t < armLen; t++) {
        const frac = t / armLen;
        const ax = armStartX + Math.floor((armEndX - armStartX) * frac);
        const ay = armStartY + Math.floor((armEndY - armStartY) * frac);
        pset(c, d, ax, ay, coverLo);
        if (t % 2 === 0) pset(c, d, ax - 1, ay, coverLo);
      }

      break;
    }

    // ============================================================
    //  USB Stick — USB-A 接口+塑料机身+LED 指示灯
    // ============================================================
    case 'usb': {
      const bodyW = Math.max(3, Math.floor(d * 0.44));
      const bodyX = Math.floor((d - bodyW) / 2);
      const capH = Math.max(2, Math.floor(d * 0.30));
      const bodyClr = '#e8a040', bodyHi = brighten(bodyClr, 35), bodyLo = darken(bodyClr, 35);
      const metalClr = '#c0c0c0', metalHi = brighten(metalClr, 40), metalLo = darken(metalClr, 40);
      const outline = darken(bodyClr, 55);

      // --- USB-A 金属接口 ---
      for (let row = 0; row < capH; row++) {
        for (let col = bodyX; col < bodyX + bodyW; col++) {
          const edge = row === 0 || col === bodyX || col === bodyX + bodyW - 1;
          pset(c, d, col, row, edge ? metalLo : metalClr);
        }
        if (row === 1)
          for (let col = bodyX + 1; col < bodyX + bodyW - 1; col++)
            pset(c, d, col, row, metalHi);
      }
      // 接口孔
      const holeW = Math.max(1, Math.floor(bodyW * 0.38));
      const holeH = Math.max(1, Math.floor(capH * 0.45));
      const holeX = bodyX + Math.floor((bodyW - holeW) / 2);
      for (let dy = 0; dy < holeH; dy++)
        for (let dx = 0; dx < holeW; dx++)
          pset(c, d, holeX + dx, 1 + dy, darken(metalClr, 60));
      // 接口内塑料片
      const tabY = 1 + holeH, tabH = Math.max(1, capH - 1 - holeH);
      for (let dy = 0; dy < tabH; dy++)
        for (let dx = 0; dx < holeW - 1; dx++)
          pset(c, d, holeX + 1 + dx, tabY + dy, '#ddd');

      // --- 塑料机身 ---
      for (let row = capH; row < d - 1; row++) {
        for (let col = bodyX; col < bodyX + bodyW; col++) {
          const edge = row === capH || col === bodyX || col === bodyX + bodyW - 1;
          pset(c, d, col, row, edge ? outline : bodyClr);
        }
        pset(c, d, bodyX + 1, row, bodyHi); // 左侧高光线
      }
      // 底部圆角
      pset(c, d, bodyX, d - 1, BG); pset(c, d, bodyX + bodyW - 1, d - 1, BG);
      // 底部阴影
      for (let col = bodyX + 1; col < bodyX + bodyW - 1; col++)
        pset(c, d, col, d - 2, bodyLo);

      // --- USB 标志（机身中央小方块印记） ---
      const logoCY = capH + Math.floor((d - capH) * 0.38);
      const logoCX = bodyX + Math.floor(bodyW / 2);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (Math.abs(dx) + Math.abs(dy) <= 2)
            pset(c, d, logoCX + dx, logoCY + dy, bodyLo);

      // --- LED 指示灯 ---
      const ledY = capH + Math.floor((d - capH) * 0.75);
      const ledX = bodyX + Math.floor(bodyW / 2);
      pset(c, d, ledX, ledY, '#00ff44');
      // LED 微光
      pset(c, d, ledX - 1, ledY, brighten('#00ff44', 60));

      break;
    }

    // ============================================================
    //  RAID Array — 桌面 NAS/磁盘阵列，多盘位+指示灯+散热格栅
    // ============================================================
    case 'raid': {
      const enclosureClr = '#d94a5a', enclosureHi = brighten(enclosureClr, 25), enclosureLo = darken(enclosureClr, 35);
      const bayClr = darken(enclosureClr, 50);
      const driveClr = '#8899aa';
      const ledGreen = '#00e040';
      const outline = darken(enclosureClr, 55);
      const cx = h, cy = Math.floor(d * 0.47);
      const outerR = Math.floor(d * 0.44);

      // 五边形外壳
      const sides = 5;
      const verts = [];
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
        verts.push({ x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR });
      }
      fillPoly(c, d, verts, enclosureClr);
      outlineShape(c, d, outline, BG);

      // 顶部高光
      for (let row = 1; row < Math.floor(d * 0.16); row++)
        for (let col = 1; col < d - 1; col++)
          if (pointInPolygon(col + 0.5, row + 0.5, verts))
            pset(c, d, col, row, enclosureHi);

      // 4 个硬盘槽（2×2 排列）
      const bayW = Math.floor(outerR * 0.32), bayH = Math.floor(outerR * 0.30);
      const gapX = Math.floor(outerR * 0.1), gapY = Math.floor(outerR * 0.08);
      for (let gr = -1; gr <= 1; gr += 2) {
        for (let gc = -1; gc <= 1; gc += 2) {
          const bx = cx + gc * (bayW + gapX) - bayW;
          const by = cy + gr * (bayH + gapY) - bayH;
          // 槽位背景
          for (let row = 0; row < bayH * 2; row++)
            for (let col = 0; col < bayW * 2; col++)
              if (pointInPolygon(bx + col + 0.5, by + row + 0.5, verts))
                pset(c, d, bx + col, by + row, bayClr);
          // 硬盘面板（稍小）
          const dx = bx + 1, dy = by + 1;
          const dw = bayW * 2 - 2, dh = bayH * 2 - 2;
          for (let row = 0; row < dh; row++)
            for (let col = 0; col < dw; col++)
              if (pointInPolygon(dx + col + 0.5, dy + row + 0.5, verts))
                pset(c, d, dx + col, dy + row, driveClr);
          // 硬盘面板螺丝（两角小点）
          pset(c, d, dx + 1, dy + 1, darken(driveClr, 40));
          pset(c, d, dx + dw - 2, dy + 1, darken(driveClr, 40));
          // 活动指示灯
          pset(c, d, bx + bayW, by + bayH + 1, ledGreen);
        }
      }

      // 电源/状态指示灯（顶部一排）
      const statusY = cy - Math.floor(outerR * 0.52);
      for (let i = -1; i <= 1; i++) {
        const sx = cx + i * Math.floor(outerR * 0.25);
        if (pointInPolygon(sx + 0.5, statusY + 0.5, verts))
          pset(c, d, sx, statusY, i === 0 ? '#00ff44' : '#44ff00');
      }

      // 散热格栅（底部几道横线）
      const ventY = cy + Math.floor(outerR * 0.48);
      for (let v = 0; v < 3; v++) {
        const vy = ventY + v * 2;
        for (let col = cx - Math.floor(outerR * 0.35); col <= cx + Math.floor(outerR * 0.35); col++)
          if (pointInPolygon(col + 0.5, vy + 0.5, verts))
            pset(c, d, col, vy, enclosureLo);
      }

      break;
    }

    // ============================================================
    //  CD/DVD — 光盘，数据轨道+中心孔+彩虹反光
    // ============================================================
    case 'cd': {
      const discClr = '#c8d0d8', discLo = darken(discClr, 18);
      const outline = darken(discClr, 50);
      const holeR = Math.max(2, Math.floor(h * 0.26));

      // 圆形碟片
      fillCircle(c, d, h, h, h - 1, discClr);
      outlineShape(c, d, outline, BG);

      // 数据轨道（多层同心圆纹理）
      for (let ring = 0; ring < 4; ring++) {
        const rr = Math.floor(h * (0.88 - ring * 0.16));
        for (let row = h - rr - 1; row <= h + rr + 1; row++) {
          for (let col = h - rr - 1; col <= h + rr + 1; col++) {
            const dx = col - h, dy = row - h;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(dist - rr) < 0.65)
              pset(c, d, col, row, discLo);
          }
        }
      }

      // 中心孔
      fillCircle(c, d, h, h, holeR, BG);
      // 孔边加粗
      for (let row = h - holeR - 1; row <= h + holeR + 1; row++) {
        for (let col = h - holeR - 1; col <= h + holeR + 1; col++) {
          const dx = col - h, dy = row - h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(dist - holeR) < 1.0)
            pset(c, d, col, row, outline);
        }
      }

      // 透明堆叠环（内圈微微凸起）
      const innerRingR = Math.floor(h * 0.52);
      for (let row = h - innerRingR - 1; row <= h + innerRingR + 1; row++) {
        for (let col = h - innerRingR - 1; col <= h + innerRingR + 1; col++) {
          const dx = col - h, dy = row - h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(dist - innerRingR) < 0.7)
            pset(c, d, col, row, brighten(discClr, 20));
        }
      }

      // 彩虹反光（左上方月牙形渐变）
      const shineR = Math.floor(h * 0.56);
      for (let row = h - Math.floor(shineR * 0.7); row <= h + Math.floor(shineR * 0.2); row++) {
        for (let col = h - Math.floor(shineR * 0.9); col <= h + Math.floor(shineR * 0.3); col++) {
          const dx = col - h, dy = row - h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= shineR && dist >= Math.floor(shineR * 0.6)) {
            const t = (dist - Math.floor(shineR * 0.6)) / (shineR - Math.floor(shineR * 0.6));
            const r = 240 + Math.floor((1 - t) * 15);
            const g = 200 + Math.floor(t * 40);
            const b = 220 + Math.floor(Math.sin(t * Math.PI) * 35);
            pset(c, d, col, row, rgbToHex(r, g, b));
          }
        }
      }

      // 外缘高光点
      pset(c, d, h - Math.floor(h * 0.7), h - Math.floor(h * 0.6), brighten(discClr, 40));

      break;
    }

    // ============================================================
    //  BOSS 1: Overclocked CPU — 银色芯片 + 金针脚 + 橙色热核心
    // ============================================================
    case 'cpu': {
      const chipClr = '#c0c0c0', chipHi = brighten(chipClr, 30), chipLo = darken(chipClr, 35);
      const heatClr = '#ff6b35', heatHi = '#ff9933', heatCore = '#ff4400';
      const pinClr = '#d4a830';
      const outline = darken(chipClr, 50);
      const m = 2;
      const bodyTop = m, bodyBottom = d - m - 3;
      const bodyLeft = m, bodyRight = d - m - 3;

      // 芯片主体
      for (let row = bodyTop; row <= bodyBottom; row++)
        for (let col = bodyLeft; col <= bodyRight; col++)
          pset(c, d, col, row, chipClr);
      // 左上高光
      for (let row = bodyTop + 1; row < bodyTop + 5; row++)
        for (let col = bodyLeft + 1; col < bodyLeft + Math.floor(d * 0.4); col++)
          pset(c, d, col, row, chipHi);

      // 过热核心（中央橙色发光）
      const coreCX = Math.floor(d / 2), coreCY = Math.floor(d * 0.42);
      const coreR = Math.floor(d * 0.2);
      fillCircle(c, d, coreCX, coreCY, coreR, heatClr);
      fillCircle(c, d, coreCX, coreCY, Math.floor(coreR * 0.6), heatHi);
      fillCircle(c, d, coreCX, coreCY, Math.floor(coreR * 0.25), heatCore);
      // 热辐射线
      for (let i = 0; i < 8; i++) {
        const ra = (i / 8) * Math.PI * 2;
        for (let t = 0; t < 3; t++) {
          const rx = coreCX + Math.cos(ra) * (coreR + 1 + t);
          const ry = coreCY + Math.sin(ra) * (coreR + 1 + t);
          pset(c, d, Math.round(rx), Math.round(ry), t === 0 ? heatCore : heatClr);
        }
      }

      // 底部金针脚
      for (let col = bodyLeft + 2; col < bodyRight - 1; col += 2)
        for (let row = bodyBottom + 1; row < d - 1; row++)
          pset(c, d, col, row, pinClr);
      // 左侧金针脚
      for (let row = bodyTop + 2; row < bodyBottom - 1; row += 2)
        for (let col = 0; col < bodyLeft; col++)
          pset(c, d, col, row, pinClr);

      // 散热片（顶部横纹）
      for (let r = 0; r < 3; r++) {
        const fy = bodyTop + 1 + r * 2;
        for (let col = bodyLeft + 3; col < bodyRight - 2; col++)
          pset(c, d, col, fy, chipLo);
      }

      outlineShape(c, d, outline, BG);
      break;
    }

    // ============================================================
    //  BOSS 2: Ransomware Rootkit — 绿色数码骷髅
    // ============================================================
    case 'rootkit': {
      const skullClr = '#1a3a1a', skullHi = '#2d5a2d';
      const eyeClr = '#00ff44', eyeGlow = '#88ffaa';
      const outline = '#003300';
      const cx = h, cy = Math.floor(d * 0.44);

      // 骷髅主体（上圆下方）
      const skullR = Math.floor(d * 0.38);
      for (let row = 0; row < d; row++) {
        for (let col = 0; col < d; col++) {
          const dx = col - cx, dy = row - cy;
          const inTop = (dx * dx) / (skullR * skullR) + (dy * dy) / ((skullR + 1) * (skullR + 1)) <= 1 && row < cy + skullR * 0.6;
          const inBot = Math.abs(dx) < skullR * 0.7 && row >= cy + skullR * 0.3 && row < cy + skullR * 1.3;
          if (inTop || inBot) pset(c, d, col, row, skullClr);
        }
      }

      // 双眼（绿色发光）
      const eyeOffX = Math.floor(skullR * 0.32), eyeY = cy - Math.floor(skullR * 0.05);
      for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
        fillCircle(c, d, ex, eyeY, Math.floor(skullR * 0.2), eyeClr);
        fillCircle(c, d, ex, eyeY, Math.floor(skullR * 0.1), eyeGlow);
      }

      // 数码牙齿（底部一排小矩形）
      const toothY = cy + Math.floor(skullR * 0.7);
      for (let t = -2; t <= 2; t++) {
        const tx = cx + t * Math.floor(skullR * 0.22);
        for (let dy = 0; dy < 3; dy++)
          for (let dx = -1; dx <= 1; dx++)
            pset(c, d, tx + dx, toothY + dy, eyeClr);
      }

      // 电路触须（从骷髅两侧伸出）
      for (let side = -1; side <= 1; side += 2) {
        for (let s = 0; s < 4; s++) {
          const sx = cx + side * (skullR + s);
          const sy = cy + (s - 1.5) * 2;
          if (sx >= 0 && sx < d && sy >= 0 && sy < d)
            pset(c, d, sx, sy, s % 2 === 0 ? eyeClr : skullHi);
        }
      }

      outlineShape(c, d, outline, BG);
      break;
    }

    // ============================================================
    //  BOSS 3: NVIDIA RTX 9090 — 长显卡 + 双风扇 + 绿色 LED
    // ============================================================
    case 'gpu': {
      const pcbClr = '#1a2a1a', shroudClr = '#3a3a3a', shroudHi = '#555';
      const fanClr = '#222', fanBlade = '#444';
      const ledClr = '#76b900', ledHi = '#99dd00';
      const pinClr = '#c8a030';
      const outline = '#111';
      const m = 1;

      // PCB 主体（横向长矩形）
      const pcbTop = Math.floor(d * 0.18), pcbBottom = Math.floor(d * 0.78);
      for (let row = pcbTop; row <= pcbBottom; row++)
        for (let col = m; col < d - m; col++)
          pset(c, d, col, row, pcbClr);

      // 散热器护罩（覆盖上半部）
      const shroudBottom = Math.floor(d * 0.55);
      for (let row = pcbTop; row <= shroudBottom; row++)
        for (let col = m + 1; col < d - m - 1; col++)
          pset(c, d, col, row, shroudClr);
      // 护罩高光
      for (let row = pcbTop + 1; row < pcbTop + 4; row++)
        for (let col = m + 3; col < Math.floor(d * 0.7); col++)
          pset(c, d, col, row, shroudHi);

      // 双风扇（两个圆形区域）
      const fan1CX = Math.floor(d * 0.28), fan2CX = Math.floor(d * 0.68);
      const fanCY = Math.floor((pcbTop + shroudBottom) / 2);
      const fanR = Math.floor(d * 0.14);
      for (const fcx of [fan1CX, fan2CX]) {
        fillCircle(c, d, fcx, fanCY, fanR, fanClr);
        fillCircle(c, d, fcx, fanCY, Math.floor(fanR * 0.35), '#333');
        // 风扇叶片（十字形）
        for (let i = 0; i < 4; i++) {
          const fa = (i / 4) * Math.PI * 2;
          for (let t = 2; t < fanR - 1; t++) {
            const bx = fcx + Math.cos(fa) * t;
            const by = fanCY + Math.sin(fa) * t;
            pset(c, d, Math.round(bx), Math.round(by), fanBlade);
          }
        }
      }

      // 绿色 LED 灯条（护罩中间）
      for (let col = Math.floor(d * 0.2); col < Math.floor(d * 0.8); col++)
        pset(c, d, col, pcbTop + 1, ledClr);
      // LED 亮点
      for (let col = Math.floor(d * 0.25); col < Math.floor(d * 0.75); col += 4)
        pset(c, d, col, pcbTop + 1, ledHi);

      // PCIe 金手指（右侧）
      for (let row = pcbTop + 2; row < pcbBottom - 1; row += 2)
        pset(c, d, d - 2, row, pinClr);

      // "RTX" 文字暗示（几个亮点）
      const textY = shroudBottom + 3;
      const letters = [[0.35, 0], [0.43, 0], [0.51, 0]];
      for (const [lx] of letters) {
        const lpx = Math.floor(d * lx);
        pset(c, d, lpx, textY, ledClr);
        pset(c, d, lpx, textY + 1, ledClr);
        pset(c, d, lpx, textY + 2, ledClr);
      }

      outlineShape(c, d, outline, BG);
      break;
    }

    // ============================================================
    //  BOSS 4: Kernel Panic — 蓝屏死机 + 白色等宽字体 hex dump
    // ============================================================
    case 'kernelPanic': {
      const bgClr = '#0044cc', bgHi = brighten(bgClr, 20), outline = darken(bgClr, 50);
      const textClr = '#ffffff', textDim = '#aaaacc';
      const m = 1;

      // 蓝色背景
      for (let row = m; row < d - m; row++)
        for (let col = m; col < d - m; col++)
          pset(c, d, col, row, bgClr);

      // 顶部高光条
      for (let col = m + 1; col < d - m - 1; col++)
        pset(c, d, col, m + 1, bgHi);

      // 左上方 ":( " 悲伤脸
      const sadFaceX = Math.floor(d * 0.2), sadFaceY = Math.floor(d * 0.22);
      const sadPixels = [
        [0,0],[1,1],[2,2], // 左眼左上斜线
        [-2,2],[-1,1],     // 右眼右上斜线
        [-1,3],[0,4],[1,3], // 嘴巴倒弧
      ];
      for (const [dx, dy] of sadPixels) {
        pset(c, d, sadFaceX + dx, sadFaceY + dy, textClr);
        pset(c, d, sadFaceX + dx + 3, sadFaceY + dy, textClr);
      }
      // 鼻子竖线
      for (let ny = 0; ny < 2; ny++)
        pset(c, d, sadFaceX + 1, sadFaceY + 1 + ny, textClr);

      // 标题文字行（模拟 "KERNEL PANIC" 用小点）
      const titleY = sadFaceY + 6;
      const titleText = 'KERNEL';
      for (let i = 0; i < titleText.length; i++) {
        const tx = Math.floor(d * 0.12) + i * 1.5;
        if (tx + 1 < d - m) { pset(c, d, tx, titleY, textClr); pset(c, d, tx, titleY + 1, textClr); }
      }

      // Hex dump 行（模拟内存地址 + 数据）
      const hexY = titleY + 3;
      for (let row = 0; row < Math.floor((d - hexY - 2) / 1.5); row++) {
        const ry = hexY + Math.floor(row * 1.5);
        if (ry >= d - m) break;
        // 地址前缀
        for (let a = 0; a < 3; a++) pset(c, d, m + 1 + a, ry, textDim);
        // 随机 hex 数据
        const dataStart = m + 5;
        for (let col = dataStart; col < d - m - 1; col++) {
          if ((col - dataStart) % 6 < 4 && Math.random() > 0.2) {
            pset(c, d, col, ry, col < dataStart + 12 ? textClr : textDim);
          }
        }
      }

      // 底部状态栏
      const statusY = d - 3;
      for (let col = m + 1; col < d - m - 1; col++) {
        pset(c, d, col, statusY, textDim);
        pset(c, d, col, statusY + 1, textClr);
      }

      // 边框
      outlineShape(c, d, outline, BG);

      // CRT 扫描线效果（水平条纹）
      for (let row = m + 2; row < d - m - 2; row += 3)
        for (let col = m + 1; col < d - m - 1; col += 3)
          pset(c, d, col, row, darken(bgClr, 10));

      break;
    }

    // ============================================================
    //  Child Process — 小蓝屏
    // ============================================================
    case 'childProcess': {
      const bgClr = '#0066ff', textClr = '#ffffff', outline = darken(bgClr, 50);
      const m = 1;
      for (let row = m; row < d - m; row++)
        for (let col = m; col < d - m; col++)
          pset(c, d, col, row, bgClr);

      // 小型 ":( "
      const cx = Math.floor(d / 2), cy = Math.floor(d * 0.4);
      pset(c, d, cx - 1, cy - 1, textClr);
      pset(c, d, cx, cy, textClr);
      pset(c, d, cx + 1, cy + 1, textClr);
      pset(c, d, cx - 2, cy + 1, textClr);
      pset(c, d, cx + 2, cy - 1, textClr);

      // 文字模拟
      for (let col = m + 1; col < d - m - 1; col += 2)
        pset(c, d, col, d - 3, textClr);

      outlineShape(c, d, outline, BG);
      break;
    }

    // ============================================================
    //  Corrupted File 小兵 — 绿色故障方块
    // ============================================================
    case 'corrupt': {
      const fileClr = '#00ff44', fileLo = '#00aa22';
      const m = 2;
      const bodyW = d - m * 2, bodyH = Math.floor(d * 0.7);
      const bodyX = m, bodyY = Math.floor((d - bodyH) / 2);

      // 文件主体
      for (let row = bodyY; row < bodyY + bodyH; row++)
        for (let col = bodyX; col < bodyX + bodyW; col++)
          pset(c, d, col, row, fileClr);

      // 折角（右上角缺一块）
      const foldS = Math.floor(bodyW * 0.35);
      for (let row = bodyY; row < bodyY + foldS; row++)
        for (let col = bodyX + bodyW - foldS + (row - bodyY); col < bodyX + bodyW; col++)
          pset(c, d, col, row, BG);

      // 故障纹理（随机暗像素）
      for (let i = 0; i < 8; i++) {
        const gx = bodyX + 1 + Math.floor(Math.random() * (bodyW - 3));
        const gy = bodyY + 1 + Math.floor(Math.random() * (bodyH - 3));
        pset(c, d, gx, gy, fileLo);
        if (Math.random() > 0.5) pset(c, d, gx + 1, gy, fileLo);
      }

      outlineShape(c, d, darken(fileClr, 60), BG);
      break;
    }
    case 'pumpAndDump': {
      const greenClr = '#22cc66', darkGreen = '#118844', lightGreen = '#44ee88';
      const cx = Math.floor(d / 2), cy = Math.floor(d / 2);
      const R = Math.floor(d / 2) - 2;
      // 绿色圆形代币
      for (let row = 0; row < d; row++) {
        for (let col = 0; col < d; col++) {
          const dx = col - cx, dy = row - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= R) {
            pset(c, d, col, row, dist > R * 0.85 ? darkGreen : greenClr);
          }
        }
      }
      // $ 符号（简化竖线 + S 曲线）
      const topY = Math.floor(cy - R * 0.4), botY = Math.floor(cy + R * 0.4);
      for (let row = topY; row <= botY; row++) {
        pset(c, d, cx, row, lightGreen);
      }
      // 顶部横线
      for (let col = cx - Math.floor(R * 0.3); col <= cx + Math.floor(R * 0.3); col++) {
        pset(c, d, col, topY, lightGreen);
      }
      // 中间横线（S 形转折）
      const midY = Math.floor(cy);
      for (let col = cx - Math.floor(R * 0.25); col <= cx + Math.floor(R * 0.25); col++) {
        pset(c, d, col, midY, lightGreen);
      }
      // 底部横线
      for (let col = cx - Math.floor(R * 0.3); col <= cx + Math.floor(R * 0.3); col++) {
        pset(c, d, col, botY, lightGreen);
      }
      outlineShape(c, d, darken(greenClr, 40), BG);
      break;
    }
    case 'dogeCoin': {
      const furClr = '#c8963a', darkFur = '#a07028', muzzleClr = '#f5edd0';
      const earClr = '#8b5e2a', noseClr = '#1a1a1a', eyeClr = '#1a1a1a';
      const cx = Math.floor(d / 2), cy = Math.floor(d / 2);
      const R = Math.floor(d / 2) - 1;
      // 脸部椭圆
      const faceCY = Math.floor(cy - R * 0.02);
      const faceRX = Math.floor(R * 0.72), faceRY = Math.floor(R * 0.75);
      for (let row = 0; row < d; row++) {
        for (let col = 0; col < d; col++) {
          const ex = (col - cx) / faceRX, ey = (row - faceCY) / faceRY;
          if (ex * ex + ey * ey <= 1.0) {
            pset(c, d, col, row, ex * ex + ey * ey > 0.65 ? darkFur : furClr);
          }
        }
      }
      // 白色嘴部（宽大，占下半脸）
      const mTop = Math.floor(faceCY + R * 0.08), mBot = Math.floor(faceCY + R * 0.62);
      for (let row = mTop; row <= mBot; row++) {
        const progress = (row - mTop) / (mBot - mTop);
        let mW = progress < 0.4 ? Math.floor(R * 0.12 + progress * R * 0.5) : Math.floor(R * 0.32 - (progress - 0.4) * R * 0.25);
        for (let col = cx - mW; col <= cx + mW; col++) {
          if (row >= 0 && row < d && col >= 0 && col < d) {
            const ex = (col - cx) / faceRX, ey = (row - faceCY) / faceRY;
            if (ex * ex + ey * ey < 0.95) pset(c, d, col, row, muzzleClr);
          }
        }
      }
      // 黑鼻子
      const noseY = Math.floor(mTop + R * 0.05);
      for (let row = noseY - 3; row <= noseY + 2; row++)
        for (let col = cx - 4; col <= cx + 4; col++)
          if (row >= 0 && row < d && col >= 0 && col < d) pset(c, d, col, row, noseClr);
      pset(c, d, cx - 2, noseY - 1, '#444');
      // 眼睛（Doge经典侧目：大体黑瞳 + 白点高光 + 上方眉毛线）
      const eyeY = Math.floor(faceCY - R * 0.2);
      for (const side of [-1, 1]) {
        const ex = cx + side * Math.floor(R * 0.24);
        // 黑眼珠
        for (let row = eyeY - 2; row <= eyeY + 2; row++)
          for (let col = ex - 2; col <= ex + 2; col++)
            if (row >= 0 && row < d && col >= 0 && col < d) pset(c, d, col, row, eyeClr);
        // 白点高光（偏内上）
        pset(c, d, ex + (side < 0 ? 1 : -1), eyeY - 1, '#ffffff');
        // 眉毛（上扬线）
        const browY = eyeY - 4;
        for (let col = ex - 3; col <= ex + 1; col++) {
          const bRow = browY - Math.abs(col - ex);
          if (bRow >= 0 && bRow < d && col >= 0 && col < d) pset(c, d, col, bRow, darkFur);
        }
      }
      // 耳朵（三角形外侧）
      for (const side of [-1, 1]) {
        const earBX = cx + side * Math.floor(R * 0.30);
        const earBY = Math.floor(faceCY - R * 0.60);
        const earH = Math.floor(R * 0.48), earW = Math.floor(R * 0.22);
        for (let row = earBY; row <= earBY + earH; row++) {
          const progress = (row - earBY) / earH;
          const w = Math.floor(earW * (1 - progress * 0.55));
          const slant = Math.floor(side * progress * earW * 0.5);
          for (let col = earBX - w + slant; col <= earBX + w + slant; col++) {
            if (row >= 0 && row < d && col >= 0 && col < d)
              pset(c, d, col, row, progress < 0.45 ? darkFur : earClr);
          }
        }
      }
      // 小嘴
      const mouthY = Math.floor(noseY + R * 0.22);
      for (let col = cx - Math.floor(R * 0.12); col <= cx + Math.floor(R * 0.12); col++) {
        const dy = Math.floor(Math.abs(col - cx) * 0.2);
        if (mouthY + dy >= 0 && mouthY + dy < d) pset(c, d, col, mouthY + dy, noseClr);
      }
      outlineShape(c, d, darken('#a07028', 55), BG);
      break;
    }
	  }

  enemySpriteCache[typeKey] = canvas;
}

/** 获取敌人像素精灵 */
function getEnemySprite(typeKey, radius) {
  if (!enemySpriteCache[typeKey]) {
    generateEnemySprite(typeKey, radius);
  }
  return enemySpriteCache[typeKey];
}

export function drawEnemies(ctx, enemies) {
  for (const enemy of enemies) {
    drawEnemy(ctx, enemy);
  }
}

function drawEnemy(ctx, enemy) {
  const { x, y, radius, typeKey, hp, maxHp, wobble } = enemy;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(wobble) * 0.1);

  const sprite = getEnemySprite(typeKey, radius);
  const displaySize = radius * 2;
  ctx.imageSmoothingEnabled = false;

  // Doge Coin 使用真实图片（无裁剪）
  if (typeKey === 'dogeCoin' && dogeSpriteLoaded) {
    const imgSize = radius * 2.4;
    ctx.drawImage(dogeSprite, -imgSize/2, -imgSize/2, imgSize, imgSize);
  } else if (enemy.virusTimer > 0 || enemy._corrupted) {
    ctx.globalAlpha = 1;
    ctx.drawImage(sprite, -displaySize / 2, -displaySize / 2, displaySize, displaySize);
    ctx.globalCompositeOperation = 'source-atop';
    if (enemy._corrupted) {
      // 马赛克绿色覆盖
      const cellSize = Math.max(2, Math.ceil(displaySize / 6));
      ctx.fillStyle = 'rgba(0, 255, 68, 0.45)';
      for (let my = -displaySize / 2; my < displaySize / 2; my += cellSize) {
        for (let mx = -displaySize / 2; mx < displaySize / 2; mx += cellSize) {
          if (Math.random() > 0.3) {
            ctx.fillRect(mx, my, cellSize * 0.8, cellSize * 0.8);
          }
        }
      }
    } else {
      const greenAlpha = 0.25 + 0.15 * Math.sin(enemy.wobble * 3);
      ctx.fillStyle = `rgba(0, 255, 68, ${greenAlpha})`;
      ctx.fillRect(-displaySize / 2, -displaySize / 2, displaySize, displaySize);
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.drawImage(sprite, -displaySize / 2, -displaySize / 2, displaySize, displaySize);
  }

  // SSD 冲锋闪烁效果
  if (enemy._isCharging) {
    const blink = 0.3 + 0.3 * Math.sin(Date.now() / 60);
    ctx.fillStyle = `rgba(255, 255, 255, ${blink})`;
    ctx.fillRect(-displaySize / 2, -displaySize / 2, displaySize, displaySize);
    // 冲锋光晕
    ctx.strokeStyle = `rgba(255, 255, 255, ${blink * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, displaySize / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ping Pulse 麻痹波纹
  if (enemy._paralyzeRings && enemy._paralyzeRings.length > 0) {
    for (const ring of enemy._paralyzeRings) {
      const alpha = ring.life / ring.maxLife;
      const r = ring.radius + (1 - alpha) * ring.maxRadius;
      ctx.strokeStyle = `rgba(162, 155, 254, ${alpha * 0.6})`;
      ctx.lineWidth = 2 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(116, 185, 255, ${alpha * 0.3})`;
      ctx.lineWidth = 5 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Firewall 减速红色波纹
  if (enemy._firewallRipples && enemy._firewallRipples.length > 0) {
    for (const ring of enemy._firewallRipples) {
      const alpha = ring.life / ring.maxLife;
      const r = ring.radius + (1 - alpha) * ring.maxRadius;
      ctx.strokeStyle = `rgba(255, 71, 87, ${alpha * 0.5})`;
      ctx.lineWidth = 2 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Absolute Zero 时间停止白色波纹
  if (enemy._timeStopRipples && enemy._timeStopRipples.length > 0) {
    for (const ring of enemy._timeStopRipples) {
      const alpha = ring.life / ring.maxLife;
      const r = ring.radius + (1 - alpha) * ring.maxRadius;
      ctx.strokeStyle = `rgba(220, 220, 255, ${alpha * 0.7})`;
      ctx.lineWidth = 2.5 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
      ctx.lineWidth = 5 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Pump & Dump — 像素 P/D 字母（随币体摇动）
  if (enemy.typeKey === 'pumpAndDump') {
    const letter = enemy._phase === 'crash' ? 'D' : 'P';
    const pix = Math.max(2, Math.floor(displaySize / 18));
    const ox = -pix * 2;
    const oy = -pix * 3;
    ctx.fillStyle = '#ffffff';
    if (letter === 'P') {
      const pMap = ['11110','10001','10001','11110','10000','10000','10000'];
      for (let r = 0; r < pMap.length; r++)
        for (let c = 0; c < 5; c++)
          if (pMap[r][c] === '1') ctx.fillRect(ox + c * pix, oy + r * pix, pix, pix);
    } else {
      const dMap = ['11100','10010','10001','10001','10001','10010','11100'];
      for (let r = 0; r < dMap.length; r++)
        for (let c = 0; c < 5; c++)
          if (dMap[r][c] === '1') ctx.fillRect(ox + c * pix, oy + r * pix, pix, pix);
    }

    // Crash→Pump 倒数预警（最后 3 秒显示数字）
    if (enemy._pumpWarning && enemy._phase === 'crash') {
      const remaining = 6 - enemy._phaseTimer;
      const count = Math.ceil(remaining);
      if (count >= 1 && count <= 3) {
        const shake = (remaining - Math.floor(remaining)) < 0.15 ? 3 : 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(count.toString(), (Math.random()-0.5)*shake, -radius - 10);
      }
    }
  }

  ctx.restore();

  // Boss 不展示头顶血条
  if (!enemy.isBoss && hp < maxHp) {
    const barW = radius * 2;
    const barH = 3;
    const barY = y - radius - 6;

    ctx.fillStyle = '#333';
    ctx.fillRect(x - barW / 2, barY, barW, barH);
    // 病毒伤害用绿色血条，GPU Boss 用英伟达绿
    if (enemy.virusTimer > 0) {
      ctx.fillStyle = '#00ff44';
    } else if (enemy.typeKey === 'gpu') {
      ctx.fillStyle = '#76b900';
    } else {
      ctx.fillStyle = '#ff4757';
    }
    ctx.fillRect(x - barW / 2, barY, barW * (hp / maxHp), barH);
  }
}

// ========== 弹幕（增强版：发光拖尾） ==========

export function drawProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    // --- Bit Blaster: Space Invaders 白色像素弹 ---
    if (p._isBitBlaster) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // 子弹飞行方向角度
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);

      const pw = 8, ph = 10;
      ctx.fillStyle = '#ffffff';
      // 像素化矩形主体
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      // 顶部高亮像素
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-pw / 2 + 2, -ph / 2, pw - 4, 3);
      // 底部阴影
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(-pw / 2 + 2, ph / 2 - 3, pw - 4, 3);
      // 两侧暗像素
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(-pw / 2, -ph / 2 + 3, 2, ph - 6);
      ctx.fillRect(pw / 2 - 2, -ph / 2 + 3, 2, ph - 6);
      // 发光外圈
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph + 4);

      ctx.restore();
      continue;
    }

    // --- 敌人弹幕：红色像素粒子（USB 远程攻击） ---
    if (p._enemyProjectile) {
      // Kernel Panic 内存碎片：白色小方块 + 抖动
      if (p._isMemoryFrag) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Date.now() / 300 + p._wobblePhase);

        const s = p.radius * 1.2;
        const pw = s, ph = s;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
        // 核心亮点
        ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
        ctx.fillRect(-pw / 2 + s * 0.2, -ph / 2 + s * 0.2, pw - s * 0.4, ph - s * 0.4);
        // 蓝色微光
        ctx.fillStyle = 'rgba(0, 68, 204, 0.3)';
        ctx.fillRect(-pw / 2 - s * 0.4, -ph / 2 - s * 0.4, pw + s * 0.8, ph + s * 0.8);

        ctx.restore();
        continue;
      }

      // Pump & Dump 崩盘冲击波
      if (p._isDumpRing) {
        const alpha = p.lifetime / (p.maxLife || 0.7);
        const r = p.radius;
        const maxR = p._maxRadius || 300;
        const progress = r / maxR; // 0→1 扩张进度

        if (p._isDumpInner) {
          // 内层亮环：高饱和、粗线条
          ctx.strokeStyle = `rgba(255, 150, 0, ${alpha * 0.9})`;
          ctx.lineWidth = 10 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          // 内层白热外晕
          ctx.strokeStyle = `rgba(255, 220, 100, ${alpha * 0.4})`;
          ctx.lineWidth = 24 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // 外层环：多层
          // 主环
          ctx.strokeStyle = `rgba(255, 40, 40, ${alpha * 0.8})`;
          ctx.lineWidth = 8 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          // 外晕
          ctx.strokeStyle = `rgba(255, 80, 30, ${alpha * 0.35})`;
          ctx.lineWidth = 20 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          // 最外淡晕
          ctx.strokeStyle = `rgba(255, 100, 50, ${alpha * 0.15})`;
          ctx.lineWidth = 40 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 中心闪光（扩张早期最亮）
        if (progress < 0.4) {
          const flashAlpha = (1 - progress / 0.4) * alpha * 0.6;
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.7);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
          gradient.addColorStop(0.3, `rgba(255, 200, 80, ${flashAlpha * 0.7})`);
          gradient.addColorStop(0.7, `rgba(255, 60, 20, ${flashAlpha * 0.3})`);
          gradient.addColorStop(1, 'rgba(255, 20, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        continue;
      }

      // Doge Coin 狗币弹幕（SVG 币样式）
      if (p._isDogeCoin) {
        const r = p.radius;
        const d = r * 2;
        // 发光外圈
        ctx.fillStyle = 'rgba(194, 166, 51, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.7, 0, Math.PI * 2);
        ctx.fill();
        if (dogeCoinProjLoaded) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(dogeCoinProjSprite, p.x - d/2, p.y - d/2, d, d);
          ctx.restore();
          ctx.strokeStyle = '#b08020';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#c2a633';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // 高光点
        ctx.fillStyle = 'rgba(255, 240, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x - r*0.2, p.y - r*0.2, r*0.35, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // Pump & Dump 红色 XP 弹片
      if (p._isRedXp) {
        const r = p.radius;
        ctx.fillStyle = 'rgba(255, 50, 50, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(p.x - r * 0.2, p.y - r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);

      const pw = 6, ph = 8;
      // 外发光
      ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
      ctx.fillRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph + 4);
      // 主体
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      // 高亮核心
      ctx.fillStyle = '#ff8888';
      ctx.fillRect(-pw / 2 + 2, -ph / 2, pw - 4, 3);
      // 暗色尾部
      ctx.fillStyle = '#aa0000';
      ctx.fillRect(-pw / 2 + 2, ph / 2 - 3, pw - 4, 3);

      ctx.restore();
      continue;
    }

    // --- Cooling Fan Blades 特殊渲染 ---
    if (p._isFanBlade) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // 旋转
      const spinAngle = Date.now() / 100 * (p.vx > 0 ? 1 : -1);
      ctx.rotate(spinAngle);

      // 扇叶（四叶十字）
      const bladeLen = p.radius * 2.5;
      const bladeW = p.radius * 0.6;
      ctx.fillStyle = 'rgba(0, 255, 136, 0.85)';
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -bladeW);
        ctx.lineTo(bladeLen, -bladeW * 0.3);
        ctx.lineTo(bladeLen, bladeW * 0.3);
        ctx.lineTo(0, bladeW);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // 中心圆
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // 光晕
      ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      continue;
    }

    const mainColor = p.coreColor || COLORS.projectile;
    const glowColor = p.coreColor || COLORS.projectileGlow;

    // 拖尾
    if (!p.prevPositions) p.prevPositions = [];
    p.prevPositions.push({ x: p.x, y: p.y, life: 0.12 });
    for (const t of p.prevPositions) t.life -= 0.016;
    p.prevPositions = p.prevPositions.filter(t => t.life > 0);
    if (p.prevPositions.length > 5) p.prevPositions = p.prevPositions.slice(-5);

    for (let i = 0; i < p.prevPositions.length - 1; i++) {
      const t = p.prevPositions[i];
      const alpha = (t.life / 0.12) * 0.4;
      ctx.fillStyle = mainColor.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      if (mainColor.startsWith('#')) {
        ctx.fillStyle = `rgba(116, 185, 255, ${alpha})`;
      }
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 外层光晕
    const gradient = ctx.createRadialGradient(p.x, p.y, p.radius * 0.3, p.x, p.y, p.radius * 2.5);
    gradient.addColorStop(0, 'rgba(160, 216, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(116, 185, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(116, 185, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 主体
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // 高光点
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(p.x - p.radius * 0.2, p.y - p.radius * 0.2, p.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ========== XP Coin — Filecoin 标志 ==========

export function drawXpCoins(ctx, coins) {
  for (const coin of coins) {
    const pulseScale = 1 + Math.sin(coin.pulse) * 0.1;
    const r = coin.radius * pulseScale;
    const { x, y } = coin;
    const d = r * 2;

    // 发光外圈
    ctx.fillStyle = 'rgba(0, 144, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
    ctx.fill();

    if (coinSpriteLoaded) {
      // 圆形裁剪
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(coinSprite, x - d / 2, y - d / 2, d, d);
      ctx.restore();

      // 细边框
      ctx.strokeStyle = COLORS.xpCoinBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 图片未加载完成时的占位
      ctx.fillStyle = COLORS.xpCoin;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = COLORS.xpCoinBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const innerR = r * 0.45;
      ctx.moveTo(x, y - innerR);
      ctx.lineTo(x - innerR * 0.7, y + innerR * 0.5);
      ctx.lineTo(x + innerR * 0.7, y + innerR * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ========== 粒子 ==========

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ========== 技能特效渲染 ==========

/** Disk Defrag 冲击波 */
export function drawShockwaves(ctx, shockwaves) {
  for (const sw of shockwaves) {
    const progress = sw.radius / sw.maxRadius;
    const alpha = 0.7 * (1 - progress);

    // 主环
    ctx.strokeStyle = `rgba(116, 185, 255, ${alpha})`;
    ctx.lineWidth = 4 * (1 - progress * 0.5);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 外环光晕
    ctx.strokeStyle = `rgba(160, 216, 255, ${alpha * 0.4})`;
    ctx.lineWidth = 10 * (1 - progress);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 内环
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius - 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Firewall 环绕火球 */
export function drawOrbiters(ctx, orbiters) {
  for (const orb of orbiters) {
    if (orb.x == null) continue;
    const { x, y, radius } = orb;

    // 大火球光晕
    const gradient = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 2.5);
    gradient.addColorStop(0, 'rgba(255, 99, 72, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 71, 87, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 71, 87, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 主体
    ctx.fillStyle = '#ff6348';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = '#ffa502';
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bit Storm 坠落弹幕 */
export function drawRainProjectiles(ctx, rainProjectiles) {
  for (const rp of rainProjectiles) {
    // 拖尾
    for (let i = 0; i < rp.trail.length; i++) {
      const t = rp.trail[i];
      const alpha = Math.max(0, t.life / 0.15) * 0.5;
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, rp.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 主体（方形碎片）
    ctx.save();
    ctx.translate(rp.x, rp.y);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(-rp.radius, -rp.radius * 0.3, rp.radius * 2, rp.radius * 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-rp.radius * 0.6, -rp.radius * 0.15, rp.radius * 1.2, rp.radius * 0.3);
    ctx.restore();

    // 光晕
    ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.radius * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Encryption 护盾 */
export function drawShield(ctx, player) {
  if (player.shieldHp <= 0) return;
  const ratio = player.shieldHp / player.shieldMaxHp;
  const alpha = 0.3 + ratio * 0.4;
  const radius = player.radius + 14;

  // 六边形护盾
  const sides = 6;
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const sx = player.x + Math.cos(a) * radius;
    const sy = player.y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.stroke();

  // 护盾光晕
  const gradient = ctx.createRadialGradient(player.x, player.y, radius * 0.6, player.x, player.y, radius * 1.4);
  gradient.addColorStop(0, `rgba(255, 215, 0, 0)`);
  gradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha * 0.3})`);
  gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius * 1.4, 0, Math.PI * 2);
  ctx.fill();
}

// ========== 玩家特效渲染（所有主动武器视觉效果） ==========

export function drawPlayerEffects(ctx, player) {
  if (!player) return;

  // --- 激光束（404 Particle Beam） ---
  if (player._beams) {
    for (const b of player._beams) {
      const alpha = Math.min(1, b.life / 0.3);
      ctx.strokeStyle = `rgba(255, 99, 72, ${alpha})`;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      // 光束光晕
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.lineWidth = b.width * 0.4;
      ctx.stroke();
    }
  }

  // --- 闪电链（USB Chain Lightning） ---
  if (player._lightningChains) {
    for (const chain of player._lightningChains) {
      const alpha = Math.min(1, chain.life / 0.4);
      const pts = chain.points;

      // 外层粗光晕
      ctx.strokeStyle = `rgba(255, 180, 50, ${alpha * 0.3})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      drawLightningPath(ctx, pts, 10);
      ctx.stroke();

      // 中层金光
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.6})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      drawLightningPath(ctx, pts, 6);
      ctx.stroke();

      // 内层白热核心
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawLightningPath(ctx, pts, 3);
      ctx.stroke();

      // 分支电弧（从主链中段随机分叉）
      if (pts.length >= 3) {
        const midIdx = Math.floor(pts.length / 2);
        const midPt = pts[midIdx];
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.4})`;
        ctx.lineWidth = 2;
        for (let b = 0; b < 3; b++) {
          ctx.beginPath();
          const bx = midPt.x + (Math.random() - 0.5) * 60;
          const by = midPt.y + (Math.random() - 0.5) * 60;
          ctx.moveTo(midPt.x, midPt.y);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    }
  }

  // --- 闪电链 AOE 扩散环（Thunderbolt Protocol） ---
  if (player._chainAoeRings) {
    for (const ring of player._chainAoeRings) {
      const alpha = ring.life / ring.maxLife;
      const r = ring.radius + (1 - alpha) * ring.maxRadius;
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.7})`;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- 脉冲球（Ping Pulse Charge） ---
  if (player._pulseBalls) {
    for (const ball of player._pulseBalls) {
      if (!ball.x) continue;
      const r = ball.radius || 7;
      // 光晕
      const gradient = ctx.createRadialGradient(ball.x, ball.y, r * 0.3, ball.x, ball.y, r * 2);
      gradient.addColorStop(0, 'rgba(162, 155, 254, 0.8)');
      gradient.addColorStop(0.6, 'rgba(116, 185, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(116, 185, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
      // 主体
      ctx.fillStyle = '#a29bfe';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x - r * 0.2, ball.y - r * 0.2, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Firewall 光环 ---
  const fwEntry = player.activeWeapons?.get('firewall');
  if (fwEntry && fwEntry.level > 0) {
    const fwRadius = fwEntry.evolved ? 240 : [100, 120, 140, 160, 160][Math.min(fwEntry.level - 1, 4)];
    const alpha = 0.18 + 0.05 * Math.sin(Date.now() / 300);
    const gradient = ctx.createRadialGradient(player.x, player.y, fwRadius * 0.4, player.x, player.y, fwRadius);
    gradient.addColorStop(0, 'rgba(255, 71, 87, 0)');
    gradient.addColorStop(0.6, `rgba(255, 71, 87, ${alpha * 0.4})`);
    gradient.addColorStop(0.9, `rgba(255, 99, 72, ${alpha * 0.6})`);
    gradient.addColorStop(1, 'rgba(255, 99, 72, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, fwRadius, 0, Math.PI * 2);
    ctx.fill();
    // 光环边界线
    ctx.strokeStyle = `rgba(255, 165, 2, ${alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, fwRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- 火痕（Next-Gen Firewall） ---
  if (player.fireTrails) {
    for (const ft of player.fireTrails) {
      const alpha = Math.min(0.4, ft.life / ft.maxLife * 0.4);
      ctx.fillStyle = `rgba(255, 99, 72, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ft.x, ft.y, ft.radius * (ft.life / ft.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 黑洞（Zip Black Hole） ---
  if (player.blackHoles) {
    for (const bh of player.blackHoles) {
      const progress = 1 - bh.life / bh.maxLife;
      // 暗黑漩涡
      const gradient = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.1, bh.x, bh.y, bh.radius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      gradient.addColorStop(0.5, 'rgba(30, 0, 50, 0.6)');
      gradient.addColorStop(0.8, 'rgba(80, 0, 100, 0.3)');
      gradient.addColorStop(1, 'rgba(80, 0, 100, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
      ctx.fill();
      // 旋转粒子环
      ctx.strokeStyle = `rgba(180, 100, 255, ${0.4 + progress * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.radius * 0.6 + progress * bh.radius * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- 黑洞爆炸 ---
  if (player._bhExplosions) {
    for (const ex of player._bhExplosions) {
      const gradient = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.radius);
      gradient.addColorStop(0, 'rgba(255, 200, 255, 0.6)');
      gradient.addColorStop(0.5, 'rgba(150, 0, 200, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // 每帧只渲染一次爆炸
    player._bhExplosions = [];
  }

  // --- NVMe 加速尾迹 ---
  if (player.speedTrail) {
    for (const t of player.speedTrail) {
      const alpha = t.life / t.maxLife * 0.3;
      ctx.fillStyle = `rgba(85, 239, 196, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 8 * (t.life / t.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Sector Sweep 刀刃横扫 ---
  if (player._sectorSlashes) {
    for (const slash of player._sectorSlashes) {
      const alpha = slash.life / slash.maxLife;
      const sweepProgress = 1 - alpha; // 0 → 1 扫过去

      ctx.save();
      ctx.translate(slash.x, slash.y);
      ctx.rotate(slash.baseAngle);

      // 刀光：从起始角度扫到结束角度
      const startAngle = -slash.arcRad / 2 + sweepProgress * slash.arcRad;
      const endAngle = -slash.arcRad / 2 + Math.min(sweepProgress + 0.3, 1) * slash.arcRad;

      // 外层光弧
      ctx.strokeStyle = `rgba(162, 155, 254, ${alpha * 0.7})`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, slash.range, startAngle, endAngle);
      ctx.stroke();

      // 内层亮线
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, slash.range, startAngle, endAngle);
      ctx.stroke();

      // 刀光拖尾粒子
      const midAngle = (startAngle + endAngle) / 2;
      for (let i = 0; i < 3; i++) {
        const pa = midAngle + (Math.random() - 0.5) * 0.3;
        const pr = slash.range * (0.3 + Math.random() * 0.7);
        ctx.fillStyle = `rgba(162, 155, 254, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(Math.cos(pa) * pr, Math.sin(pa) * pr, 3 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- Ping 波纹（Ping Pulse Charge，从每个球发出） ---
  if (player._pingRings) {
    for (const ring of player._pingRings) {
      const alpha = ring.life / ring.maxLife;
      const r = ring.radius + (1 - alpha) * ring.maxRadius;
      ctx.strokeStyle = `rgba(116, 185, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(162, 155, 254, ${alpha * 0.3})`;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- Absolute Zero 时间停止触发波纹 ---
  if (player._timeStopWaves) {
    for (const wave of player._timeStopWaves) {
      const alpha = wave.life / wave.maxLife;
      const r = wave.radius + (1 - alpha) * wave.maxRadius;
      ctx.strokeStyle = `rgba(40, 20, 60, ${alpha * 0.6})`;
      ctx.lineWidth = 4 * alpha;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(180, 200, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 2 * alpha;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r - 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ========== Boss 特效渲染 ==========

export function drawBossEffects(ctx, enemies) {
  for (const enemy of enemies) {
    if (!enemy.isBoss) continue;

    // Kernel Panic 六边形文字护盾
    if (enemy.typeKey === 'kernelPanic') {
      const hexSides = 6;
      const hexR = enemy.radius + 18;
      const hexPts = [];
      for (let i = 0; i < hexSides; i++) {
        const a = (i / hexSides) * Math.PI * 2 - Math.PI / 2;
        hexPts.push({ x: enemy.x + Math.cos(a) * hexR, y: enemy.y + Math.sin(a) * hexR });
      }
      // 绘制文字墙 — 每条边上有滚动的 hex 字符
      for (let i = 0; i < hexSides; i++) {
        const p1 = hexPts[i];
        const p2 = hexPts[(i + 1) % hexSides];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const edgeLen = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / edgeLen, uy = dy / edgeLen;
        // 字符滚动偏移
        const scroll = (Date.now() / 200 + i * 0.7) % 1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hexChars = '0123456789ABCDEF';
        for (let c = 0; c < Math.floor(edgeLen / 8); c++) {
          const t = (c / Math.floor(edgeLen / 8) + scroll) % 1;
          const cx = p1.x + ux * edgeLen * t;
          const cy = p1.y + uy * edgeLen * t;
          const ch = hexChars[Math.floor((t * 16 + Date.now() / 500) % 16)];
          ctx.fillText(ch, cx, cy);
        }
      }
      // 半透明六边形边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hexPts[0].x, hexPts[0].y);
      for (let i = 1; i < hexSides; i++) ctx.lineTo(hexPts[i].x, hexPts[i].y);
      ctx.closePath();
      ctx.stroke();

      continue; // 跳过通用 Boss 渲染（Kernel Panic 已自行处理）
    }

    // CPU / DogeCoin 热浪
    if (enemy._heatWaves && enemy._heatWaves.length > 0) {
      for (const w of enemy._heatWaves) {
        const alpha = w.life / w.maxLife;
        const progress = 1 - alpha;
        const maxR = w.maxRadius || 140;
        const r = 10 + progress * maxR;
        const isGolden = w._color === '#c2a633';
        const c1 = isGolden ? '194, 166, 51' : '255, 107, 53';
        const c2 = isGolden ? '230, 200, 80' : '255, 153, 51';
        ctx.strokeStyle = 'rgba(' + c1 + ', ' + (alpha * 0.7) + ')';
        ctx.lineWidth = 4 * alpha;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(' + c2 + ', ' + (alpha * 0.4) + ')';
        ctx.lineWidth = 10 * alpha;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r + 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // GPU 旋转激光
    if (enemy._beams && enemy._beams.length > 0) {
      for (const b of enemy._beams) {
        ctx.strokeStyle = 'rgba(118, 185, 0, 0.8)';
        ctx.lineWidth = b.width || 8;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(153, 221, 0, 0.4)';
        ctx.lineWidth = (b.width || 8) * 2;
        ctx.stroke();
      }
    }

    // GPU 过载火痕
    if (enemy._fireTrails && enemy._fireTrails.length > 0) {
      for (const ft of enemy._fireTrails) {
        const alpha = ft.life / ft.maxLife * 0.5;
        ctx.fillStyle = `rgba(255, 107, 53, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ft.x, ft.y, ft.radius * (ft.life / ft.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pump & Dump — 膨胀/低谷视觉效果
    if (enemy.typeKey === 'pumpAndDump') {
      if (enemy._phase === 'pump') {
        // 膨胀光环
        const progress = enemy.radius / 110;
        const alpha = 0.15 + progress * 0.25;
        ctx.strokeStyle = `rgba(34, 204, 102, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (enemy._phase === 'peak') {
        // 红色预警波纹
        const rippleCount = 3;
        for (let i = 0; i < rippleCount; i++) {
          const ripplePhase = (Date.now() / 150 + i * 0.33) % 1;
          const rippleR = enemy.radius + 10 + ripplePhase * 60;
          const rippleAlpha = (1 - ripplePhase) * 0.5;
          ctx.strokeStyle = `rgba(255, 30, 30, ${rippleAlpha})`;
          ctx.lineWidth = 3 * (1 - ripplePhase);
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, rippleR, 0, Math.PI * 2);
          ctx.stroke();
        }
        // 本体闪烁
        const flash = 0.4 + 0.6 * Math.sin(Date.now() / 50);
        ctx.fillStyle = `rgba(255, 50, 50, ${flash * 0.25})`;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Doge Coin — 漫画气泡（圆角矩形 + 随机偏移）
    if (enemy.typeKey === 'dogeCoin' && enemy._memeText) {
      if (!enemy._bubbleOffset) {
        enemy._bubbleOffset = { dx: (Math.random() - 0.5) * 60, dy: -20 - Math.random() * 30 };
      }
      const tx = enemy.x + enemy._bubbleOffset.dx;
      const ty = enemy.y - enemy.radius + enemy._bubbleOffset.dy;
      ctx.font = 'bold 14px "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(enemy._memeText).width + 24;
      const th = 26;
      const rx = 8;
      // 圆角矩形
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx - tw/2 + rx, ty - th/2);
      ctx.lineTo(tx + tw/2 - rx, ty - th/2);
      ctx.arcTo(tx + tw/2, ty - th/2, tx + tw/2, ty - th/2 + rx, rx);
      ctx.lineTo(tx + tw/2, ty + th/2 - rx);
      ctx.arcTo(tx + tw/2, ty + th/2, tx + tw/2 - rx, ty + th/2, rx);
      ctx.lineTo(tx - tw/2 + rx, ty + th/2);
      ctx.arcTo(tx - tw/2, ty + th/2, tx - tw/2, ty + th/2 - rx, rx);
      ctx.lineTo(tx - tw/2, ty - th/2 + rx);
      ctx.arcTo(tx - tw/2, ty - th/2, tx - tw/2 + rx, ty - th/2, rx);
      ctx.fill();
      ctx.stroke();
      // 尾巴指向boss
      const tailX = enemy.x, tailY = enemy.y - enemy.radius - 4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(tailX - 7, ty + th/2 - 1);
      ctx.lineTo(tailX, tailY);
      ctx.lineTo(tailX + 7, ty + th/2 - 1);
      ctx.fill();
      ctx.stroke();
      // 文字
      ctx.fillStyle = '#333333';
      ctx.fillText(enemy._memeText, tx, ty);
    }
  }
}

// ========== HUD ==========

export function drawHUD(ctx, gameTime, kills, player, enemies, bossWarnings, systemCrashDebuff, ultimateState) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const pad = 16;
  const enemyCount = enemies ? enemies.length : 0;

  // --- 左上：计时 & 击杀数 ---
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`${t('hud.time')}  ${formatTime(gameTime)}`, pad, pad);

  ctx.fillStyle = '#b0b0c0';
  ctx.font = '14px monospace';
  ctx.fillText(`${t('hud.kills')}  ${kills}`, pad, pad + 24);

  ctx.fillText(`${t('hud.enemies')}  ${enemyCount}`, pad, pad + 44);

  // --- 右上：空白（等级已移至右下） ---
  ctx.textAlign = 'right';

  // --- 底部：HP 条 ---
  ctx.textAlign = 'left';
  const barX = pad + 30;
  const barWidth = 250;
  const barHeight = 12;
  const barY = CANVAS_HEIGHT - pad - 40;

  // HP 标签（在条左侧）
  ctx.fillStyle = COLORS.hpBar;
  ctx.font = 'bold 11px monospace';
  ctx.fillText(t('hud.hp'), pad, barY + 1);

  ctx.fillStyle = COLORS.hudBar;
  ctx.fillRect(barX, barY, barWidth, barHeight);
  const hpRatio = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = COLORS.hpBar;
  ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // HP 数值（条内居中）
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '10px monospace';
  ctx.fillText(`${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`, barX + barWidth / 2 - 20, barY + 1);

  // --- 底部：XP 条 ---
  const xpBarY = barY + barHeight + 6;

  // XP 标签（在条左侧）
  ctx.fillStyle = COLORS.xpBar;
  ctx.font = 'bold 11px monospace';
  ctx.fillText(t('hud.xp'), pad, xpBarY + 1);

  ctx.fillStyle = COLORS.hudBar;
  ctx.fillRect(barX, xpBarY, barWidth, barHeight);
  const xpRatio = player.xpProgress;
  ctx.fillStyle = COLORS.xpBar;
  ctx.fillRect(barX, xpBarY, barWidth * xpRatio, barHeight);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, xpBarY, barWidth, barHeight);

  // XP 数值（条内居中）
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '10px monospace';
  ctx.fillText(`${player.xp} / ${player.xpToNext}`, barX + barWidth / 2 - 20, xpBarY + 1);

  // --- 右下：技能 emoji + 等级（与左侧 HUD 中位线对齐） ---
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // 左侧 HUD 中位线：HP 条顶 到 XP 条底 的中点
  const leftHudCenterY = (barY + xpBarY + barHeight) / 2;

  // --- NFT 大招冷却图标（右下，等级上方）---
  if (ultimateState && ultimateState.showUltimate) {
    const iconSize = 48;
    const iconX = CANVAS_WIDTH - pad - iconSize;
    const iconY = leftHudCenterY - iconSize - 35; // 与等级文字留白

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 背景方框
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(iconX, iconY, iconSize, iconSize);
    ctx.strokeStyle = ultimateState.cooldown > 0 ? '#636e72' : '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(iconX, iconY, iconSize, iconSize);

    // emoji 图标
    ctx.font = '24px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('🧹', iconX + iconSize / 2, iconY + iconSize / 2);

    // 冷却扇形遮罩 + 倒计时数字
    if (ultimateState.cooldown > 0) {
      const progress = ultimateState.cooldown / ultimateState.maxCooldown;
      const cx = iconX + iconSize / 2;
      const cy = iconY + iconSize / 2;
      const r = iconSize * 0.75;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fill();

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(Math.ceil(ultimateState.cooldown), cx, cy);
    }

    ctx.restore();
  }

  // 收集已习得技能（按习得顺序，先习得的靠右靠近等级）
  const skillEntries = [];
  if (player.activeWeapons) {
    for (const [, entry] of player.activeWeapons) {
      if (entry.emoji) skillEntries.push({ ...entry, type: 'active' });
    }
  }
  if (player.passiveSkills) {
    for (const [, entry] of player.passiveSkills) {
      if (entry.emoji) skillEntries.push({ ...entry, type: 'passive' });
    }
  }

  const boxSize = 24;
  const gap = 4;
  const levelText = `${t('hud.lv')} ${player.level}`;
  ctx.font = 'bold 22px monospace';
  const levelWidth = ctx.measureText(levelText).width;

  // 从右向左：先画等级，再画 emoji 框
  let curX = CANVAS_WIDTH - pad;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(levelText, curX, leftHudCenterY + 2);
  curX -= levelWidth + 20;

  // 倒序：先习得的靠右（靠近等级），后习得的靠左
  for (let i = skillEntries.length - 1; i >= 0; i--) {
    const entry = skillEntries[i];
    const borderColor = entry.type === 'active' ? ACTIVE_COLOR : PASSIVE_COLOR;
    const boxX = curX - boxSize;
    const boxY = leftHudCenterY - boxSize / 2;

    // 背景
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    // 边框
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // emoji 居中
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(entry.emoji, boxX + boxSize / 2, boxY + boxSize / 2 - 1);

    // 右下角等级数字
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(entry.level, boxX + boxSize - 2, boxY + boxSize - 4);

    curX = boxX - gap;
  }
  ctx.textBaseline = 'top';

  // --- Boss HP 条（顶部居中） ---
  if (enemies && enemies.length > 0) {
    const bosses = enemies.filter(e => e.isBoss);
    if (bosses.length > 0) {
      const bossBarY = pad + 42;
      const bossBarW = 300;
      const bossBarH = 10;
      const bossBarX = (CANVAS_WIDTH - bossBarW) / 2;

      // 按血量排序，受伤严重的排前面
      const sorted = bosses.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));

      for (let i = 0; i < Math.min(sorted.length, 3); i++) {
        const boss = sorted[i];
        const bby = bossBarY + i * (bossBarH + 16);

        // 标签
        ctx.textAlign = 'center';
        ctx.fillStyle = boss.color || '#ff6b35';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(t(`enemy.${boss.typeKey}`, null, boss.typeKey),
                     CANVAS_WIDTH / 2, bby - 2);

        // 血条背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(bossBarX, bby + 12, bossBarW, bossBarH);

        // 血条填充
        const ratio = Math.max(0, boss.hp / boss.maxHp);
        const barColor = ratio > 0.5 ? boss.color :
                         ratio > 0.25 ? '#ff9933' : '#ff3333';
        ctx.fillStyle = barColor;
        ctx.fillRect(bossBarX, bby + 12, bossBarW * ratio, bossBarH);

        // 边框
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(bossBarX, bby + 12, bossBarW, bossBarH);

        // 百分比
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.floor(ratio * 100)}%`, CANVAS_WIDTH / 2, bby + 13);
      }
    }
  }

  // --- Boss 出场预警（画面上方，不遮挡玩家） ---
  if (bossWarnings && bossWarnings.length > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const w of bossWarnings) {
      const progress = 1 - w.timeRemaining / w.maxTime;
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 150);
      const alpha = pulse * (1 - progress);

      const warnY = pad + 50;

      // 红色闪烁背景条
      ctx.fillStyle = `rgba(255, 30, 30, ${alpha * 0.12})`;
      ctx.fillRect(CANVAS_WIDTH / 2 - 250, warnY - 20, 500, 40);

      // 边框线
      ctx.strokeStyle = `rgba(255, 50, 50, ${alpha * 0.5})`;
      ctx.lineWidth = 2 * pulse;
      ctx.strokeRect(CANVAS_WIDTH / 2 - 248, warnY - 18, 496, 36);

      // 标题 + Boss 名称同行
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(t('boss.warning', { name: w.name }), CANVAS_WIDTH / 2, warnY);
    }
  }

  // --- System Crash 状态指示 ---
  if (systemCrashDebuff && systemCrashDebuff.timer > 0) {
    const alpha = Math.min(1, systemCrashDebuff.timer / 0.5);
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 100);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fy = CANVAS_HEIGHT / 2 + 100;
    let label = '';
    let color = '#ff4444';
    if (systemCrashDebuff.type === 'cooldown') {
      label = 'WEAPON OVERHEAT';
      color = '#ff6348';
    } else if (systemCrashDebuff.type === 'reverse') {
      label = 'INPUT REVERSED';
      color = '#ffaa00';
    }
    if (label) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3 * pulse})`;
      ctx.font = 'bold 38px monospace';
      ctx.fillText(label, CANVAS_WIDTH / 2 + 2, fy + 2);
      ctx.fillStyle = color.replace(')', `, ${alpha * pulse})`).replace('rgb', 'rgba');
      if (color.startsWith('#')) {
        ctx.fillStyle = `rgba(255, 68, 68, ${alpha * pulse})`;
      }
      ctx.font = 'bold 28px monospace';
      ctx.fillText(label, CANVAS_WIDTH / 2, fy);
      // 倒计时条
      const barW = 200, barH = 4;
      const barX = CANVAS_WIDTH / 2 - barW / 2;
      const barY = fy + 24;
      const ratio = systemCrashDebuff.timer / (systemCrashDebuff.type === 'cooldown' ? 3 : 2.5);
      ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      if (color.startsWith('#')) ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }
  }
}

/** 格式化秒数为 mm:ss */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 绘制锯齿闪电路径 */
function drawLightningPath(ctx, points, jitter) {
  let first = true;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const jx = (Math.random() - 0.5) * jitter * 2;
    const jy = (Math.random() - 0.5) * jitter * 2;
    if (first) { ctx.moveTo(p.x + jx, p.y + jy); first = false; }
    else { ctx.lineTo(p.x + jx, p.y + jy); }
    // 中间点插入额外锯齿折线
    if (i < points.length - 1) {
      const np = points[i + 1];
      const mx = (p.x + np.x) / 2 + (Math.random() - 0.5) * jitter * 3;
      const my = (p.y + np.y) / 2 + (Math.random() - 0.5) * jitter * 3;
      ctx.lineTo(mx, my);
    }
  }
}

// ========== 大招蓄力效果 ==========

export function drawChargeEffect(ctx, x, y, elapsed) {
  const maxRings = 3;
  const ringPeriod = 0.6;

  ctx.save();

  // 扩散光环
  for (let i = 0; i < maxRings; i++) {
    const phase = (elapsed / ringPeriod + i / maxRings) % 1;
    const r = 40 + phase * 120;
    const alpha = 0.6 * (1 - phase);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 玩家光晕
  const glowAlpha = 0.3 + Math.sin(elapsed * 6) * 0.15;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
  gradient.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
  gradient.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();

  // 旋转粒子
  for (let i = 0; i < 8; i++) {
    const angle = (elapsed * 3 + i * Math.PI * 2 / 8) % (Math.PI * 2);
    const dist = 55 + Math.sin(elapsed * 5 + i) * 15;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const pa = 0.4 + Math.sin(elapsed * 4 + i) * 0.3;
    ctx.fillStyle = `rgba(255,215,0,${pa})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
