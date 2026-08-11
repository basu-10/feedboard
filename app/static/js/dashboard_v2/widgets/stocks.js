import { BaseWidget } from './base.js';
import { loadV2Settings } from '../../db.js';

const FINNHUB_BASE = 'https://finnhub.io/api/v1/quote';

export class StocksWidget extends BaseWidget {
  static widgetType = 'stocks';
  static widgetName = 'Stock Prices';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.refreshTimer = null;
    this.cache = null;
    this.cacheExpiry = 0;
  }

  static getDefaultSettings() {
    return {
      symbols: ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'NVDA'],
      refreshInterval: 60,
    };
  }

  async onRender() {
    await this.fetchAndRender();
    this.startAutoRefresh();
  }

  async fetchAndRender() {
    const { loadV2Settings: loadSettings } = await import('../../db.js');
    const v2Settings = await loadSettings();
    const apiKey = v2Settings?.finnhubApiKey;

    if (!apiKey) {
      this.showSetupPrompt();
      return;
    }

    this.showLoading();
    try {
      const quotes = await this.fetchQuotes(apiKey);
      this.cache = quotes;
      this.cacheExpiry = Date.now() + this.settings.refreshInterval * 1000;
      this.renderQuotes(quotes);
    } catch (error) {
      console.error('Stocks fetch error:', error);
      this.showError('Failed to fetch stock prices. Check API key.');
    }
  }

  async fetchQuotes(apiKey) {
    const promises = this.settings.symbols.map(symbol =>
      fetch(`${FINNHUB_BASE}?symbol=${symbol}&token=${apiKey}`)
        .then(res => res.json())
        .then(data => ({ symbol, ...data }))
        .catch(err => ({ symbol, error: err.message }))
    );

    return Promise.all(promises);
  }

  renderQuotes(quotes) {
    if (!this.contentEl) return;

    const rows = quotes.map(quote => {
      if (quote.error) {
        return `<tr class="stock-row error"><td colspan="4">${quote.symbol}: Error</td></tr>`;
      }

      const change = quote.c - quote.pc;
      const changePercent = quote.pc ? ((change / quote.pc) * 100).toFixed(2) : '0.00';
      const isPositive = change >= 0;
      const changeClass = isPositive ? 'positive' : 'negative';
      const changeSign = isPositive ? '+' : '';

      return `
        <tr class="stock-row">
          <td class="stock-symbol">${quote.symbol}</td>
          <td class="stock-price">${quote.c?.toFixed(2) ?? '--'}</td>
          <td class="stock-change ${changeClass}">${changeSign}${change.toFixed(2)}</td>
          <td class="stock-change-pct ${changeClass}">${changeSign}${changePercent}%</td>
        </tr>
      `;
    }).join('');

    this.contentEl.innerHTML = `
      <table class="stocks-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change</th>
            <th>Change %</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="stocks-last-updated">Updated: ${new Date().toLocaleTimeString()}</div>
    `;
  }

  showSetupPrompt() {
    if (!this.contentEl) return;
    this.contentEl.innerHTML = `
      <div class="widget-setup-prompt">
        <p>Finnhub API key required for stock prices.</p>
        <button class="btn" id="openGlobalSettings">Open Settings</button>
      </div>
    `;
    const btn = this.contentEl.querySelector('#openGlobalSettings');
    if (btn) {
      const handler = () => this.openGlobalSettings();
      btn.addEventListener('click', handler);
      this.eventListeners.push({ element: btn, event: 'click', handler });
    }
  }

  openGlobalSettings() {
    if (this.openSettingsCallback) {
      this.openSettingsCallback(null, 'global');
    }
  }

  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      if (Date.now() >= this.cacheExpiry) {
        this.fetchAndRender();
      }
    }, 10000);
    this.timers.push(this.refreshTimer);
  }

  async setSettings(newSettings) {
    const oldInterval = this.settings.refreshInterval;
    await super.setSettings(newSettings);

    if (newSettings.symbols !== undefined || newSettings.refreshInterval !== undefined) {
      this.cache = null;
      this.cacheExpiry = 0;
      await this.fetchAndRender();
    }

    if (newSettings.refreshInterval !== undefined && newSettings.refreshInterval !== oldInterval) {
      clearInterval(this.refreshTimer);
      this.startAutoRefresh();
    }
  }

  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    super.destroy();
  }
}