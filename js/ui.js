// Storage War — UI 管理 (升级弹窗 v2)

import { RARITY_COLORS } from './skills.js';
import { t } from './i18n.js';

export class UpgradeUI {
  constructor() {
    this.overlay = document.getElementById('upgrade-overlay');
    this.choicesContainer = document.getElementById('upgrade-choices');
  }

  show(skills, player) {
    return new Promise((resolve) => {
      // 更新升级标题为当前语言
      const title = document.getElementById('upgrade-title');
      if (title) title.textContent = t('upgrade.title');

      this.overlay.classList.add('active');
      this.choicesContainer.innerHTML = '';

      const keyHandler = (e) => {
        const num = parseInt(e.key);
        if (num >= 1 && num <= skills.length) {
          window.removeEventListener('keydown', keyHandler);
          this.hide();
          resolve(skills[num - 1]);
        }
      };
      window.addEventListener('keydown', keyHandler);

      for (const skill of skills) {
        const card = document.createElement('div');
        const isActive = skill.type === 'active';
        const borderColor = isActive ? RARITY_COLORS.active : RARITY_COLORS.passive;
        const badgeText = isActive ? t('upgrade.active') : t('upgrade.passive');
        const badgeBg = isActive ? '#2980b9' : '#27ae60';

        const currentLv = (player?.skillLevels?.[skill.id]) || 0;
        const lvBadge = currentLv === 0
          ? `<span class="new-badge">${t('upgrade.new')}</span>`
          : `<span class="lv-badge">Lv${currentLv} → ${currentLv + 1}</span>`;

        card.className = 'upgrade-card';
        card.style.borderColor = borderColor;

        card.innerHTML = `
          <div class="card-badge" style="background:${badgeBg}">${badgeText}</div>
          ${lvBadge}
          <div class="name" style="color:${borderColor}">${skill.emoji ? skill.emoji + ' ' : ''}${t('skill.' + skill.id + '.name', null, skill.name)}</div>
          <div class="desc">${t('skill.' + skill.id + '.desc', null, skill.description)}</div>
          ${skill.evolveName ? `<div class="evolve"><strong>${t('upgrade.evolveLabel', { name: t('skill.' + skill.id + '.evolveName', null, skill.evolveName) })}</strong><br><small>${t('skill.' + skill.id + '.evolveDesc', null, skill.evolveDesc || '')}</small></div>` : ''}
          ${skill.lv5Bonus ? `<div class="evolve"><strong>${t('upgrade.bonusLabel')}</strong><br><small>${t('skill.' + skill.id + '.lv5Bonus', null, skill.lv5Bonus)}</small></div>` : ''}
          <div class="level">${t('upgrade.maxLv', { n: skill.maxLevel })}</div>
        `;

        card.addEventListener('click', () => {
          window.removeEventListener('keydown', keyHandler);
          this.hide();
          resolve(skill);
        });

        const idx = this.choicesContainer.children.length + 1;
        const keyHint = document.createElement('div');
        keyHint.style.cssText = 'font-size:11px;color:#666;margin-top:6px';
        keyHint.textContent = t('upgrade.press', { idx });
        card.appendChild(keyHint);

        this.choicesContainer.appendChild(card);
      }
    });
  }

  hide() {
    this.overlay.classList.remove('active');
  }
}
