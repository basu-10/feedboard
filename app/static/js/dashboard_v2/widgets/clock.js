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
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
    this.timers.push(this.timer);
  }

  updateClock() {
    if (!this.contentEl) return;

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

    this.contentEl.innerHTML = `
      <div class="clock-time">${time}</div>
      ${dateHtml}
    `;
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