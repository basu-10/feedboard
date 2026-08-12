import { BaseWidget } from './base.js';

export class ClockWidget extends BaseWidget {
  static widgetType = 'clock';
  static widgetName = 'Clock';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.timer = null;
    this.timeEl = null;
    this.dateEl = null;
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
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.buildClockDOM();
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
    this.timers.push(this.timer);
  }

  buildClockDOM() {
    if (!this.contentEl) return;
    this.contentEl.innerHTML = `
      <div class="clock-time"></div>
      <div class="clock-date"></div>
    `;
    this.timeEl = this.contentEl.querySelector('.clock-time');
    this.dateEl = this.contentEl.querySelector('.clock-date');
  }

  updateClock() {
    if (!this.contentEl || !this.timeEl) {
      console.warn('[ClockWidget] No contentEl or timeEl!');
      return;
    }

    const { timezone, format, showSeconds, showDate } = this.settings;
    const now = new Date();

    const timeOpts = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: format === '12h',
    };

    this.timeEl.textContent = new Intl.DateTimeFormat([], timeOpts).format(now);

    if (showDate) {
      const dateOpts = {
        timeZone: timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      };
      const dateLabel = new Intl.DateTimeFormat([], dateOpts).format(now);
      const tzLabel = timezone.split('/').pop().replace(/_/g, ' ');
      this.dateEl.textContent = `${dateLabel} · ${tzLabel}`;
    } else if (this.dateEl) {
      this.dateEl.textContent = '';
    }
  }

  async setSettings(newSettings) {
    await super.setSettings(newSettings);
    this.buildClockDOM();
    this.updateClock();
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.timeEl = null;
    this.dateEl = null;
    super.destroy();
  }
}