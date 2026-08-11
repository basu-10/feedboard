import { BaseWidget } from './base.js';

export class ClockWidget extends BaseWidget {
  static widgetType = 'clock';
  static widgetName = 'Clock';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.timer = null;
  }

  static getDefaultSettings() {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      format: '24h',
      showSeconds: true,
      showDate: true,
    };
  }

async onRender() {
    console.log('[ClockWidget] onRender called');
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
    this.timers.push(this.timer);
  }
  
  updateClock() {
    if (!this.contentEl) {
      console.warn('[ClockWidget] No contentEl!');
      return;
    }

    const contentStyles = window.getComputedStyle(this.contentEl);
    console.log('[ClockWidget] contentEl styles:', {
      display: contentStyles.display,
      height: contentStyles.height,
      overflow: contentStyles.overflow,
      color: contentStyles.color,
      padding: contentStyles.padding,
    });
    console.log('[ClockWidget] contentEl children before:', this.contentEl.children.length);

    const { timezone, format, showSeconds, showDate } = this.settings;
    const now = new Date();

    const timeOpts = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: format === '12h',
    };

    const time = new Intl.DateTimeFormat([], timeOpts).format(now);

    let dateHtml = '';
    if (showDate) {
      const dateOpts = {
        timeZone: timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      };
      const dateLabel = new Intl.DateTimeFormat([], dateOpts).format(now);
      const tzLabel = timezone.split('/').pop().replace(/_/g, ' ');
      dateHtml = `<div class="clock-date">${dateLabel} · ${tzLabel}</div>`;
    }

    const html = `
      <div class="clock-time">${time}</div>
      ${dateHtml}
    `;
    console.log('[ClockWidget] Setting innerHTML:', html);
    this.contentEl.innerHTML = html;
    console.log('[ClockWidget] contentEl children after:', this.contentEl.children.length);
    
    const timeEl = this.contentEl.querySelector('.clock-time');
    if (timeEl) {
      const timeStyles = window.getComputedStyle(timeEl);
      console.log('[ClockWidget] clock-time styles:', {
        fontSize: timeStyles.fontSize,
        color: timeStyles.color,
        display: timeStyles.display,
        height: timeStyles.height,
      });
    }
  }

  async setSettings(newSettings) {
    await super.setSettings(newSettings);
    this.updateClock();
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.destroy();
  }
}