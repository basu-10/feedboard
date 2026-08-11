import { saveWidgetSettings, deleteWidgetSettings } from '../../db.js';

export class BaseWidget {
  constructor(id, grid, settings = {}, openSettingsCallback) {
    this.id = id;
    this.grid = grid;
    this.settings = settings;
    this.openSettingsCallback = openSettingsCallback;
    this.element = null;
    this.contentEl = null;
    this.headerEl = null;
    this.timers = [];
    this.eventListeners = [];
  }

  static getDefaultSettings() {
    return {};
  }

  getSettings() {
    return { ...this.settings };
  }

  async setSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await saveWidgetSettings(this.id, { ...this.settings, type: this.constructor.widgetType });
    if (this.element) {
      await this.render();
    }
  }

  async render() {
    if (!this.element) return;

    this.element.innerHTML = this.getHTML();
    this.bindElements();
    this.bindEvents();
    await this.onRender();
  }

  getHTML() {
    return `
      <div class="widget-header">
        <span class="widget-title">${this.constructor.widgetName || 'Widget'}</span>
        <div class="widget-actions">
          <button class="widget-settings-btn" aria-label="Settings" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="widget-content"></div>
    `;
  }

  bindElements() {
    this.headerEl = this.element.querySelector('.widget-header');
    this.contentEl = this.element.querySelector('.widget-content');
  }

  bindEvents() {
    const settingsBtn = this.element.querySelector('.widget-settings-btn');
    if (settingsBtn) {
      const handler = () => this.openSettings();
      settingsBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: settingsBtn, event: 'click', handler });
    }
  }

  openSettings() {
    if (this.openSettingsCallback) {
      this.openSettingsCallback(this);
    }
  }

  async onRender() {}

  startTimer(callback, interval) {
    const timer = setInterval(callback, interval);
    this.timers.push(timer);
    return timer;
  }

  stopTimer(timer) {
    clearInterval(timer);
    this.timers = this.timers.filter(t => t !== timer);
  }

  stopAllTimers() {
    this.timers.forEach(t => clearInterval(t));
    this.timers = [];
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  removeAllEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  destroy() {
    this.stopAllTimers();
    this.removeAllEventListeners();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  showError(message) {
    if (this.contentEl) {
      this.contentEl.innerHTML = `<div class="widget-error">${message}</div>`;
    }
  }

  showLoading(message = 'Loading...') {
    if (this.contentEl) {
      this.contentEl.innerHTML = `<div class="widget-loading">${message}</div>`;
    }
  }
}