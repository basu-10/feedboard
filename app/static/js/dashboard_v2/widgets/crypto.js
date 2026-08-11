import { BaseWidget } from './base.js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3/simple/price';

export class CryptoWidget extends BaseWidget {
  static widgetType = 'crypto';
  static widgetName = 'Crypto Prices';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.refreshTimer = null;
    this.cache = null;
    this.cacheExpiry = 0;
  }

  static getDefaultSettings() {
    return {
      coins: ['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink'],
      currency: 'usd',
      refreshInterval: 60,
    };
  }

  async onRender() {
    await this.fetchAndRender();
    this.startAutoRefresh();
  }

  async fetchAndRender() {
    this.showLoading();
    try {
      const prices = await this.fetchPrices();
      this.cache = prices;
      this.cacheExpiry = Date.now() + this.settings.refreshInterval * 1000;
      this.renderPrices(prices);
    } catch (error) {
      console.error('Crypto fetch error:', error);
      this.showError('Failed to fetch crypto prices.');
    }
  }

  async fetchPrices() {
    const { coins, currency } = this.settings;
    const ids = coins.join(',');
    const url = `${COINGECKO_BASE}?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        throw new Error(`Rate limited. Retry after ${waitTime / 1000}s`);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  renderPrices(data) {
    if (!this.contentEl) return;

    const currency = this.settings.currency.toUpperCase();
    const symbolMap = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      solana: 'SOL',
      cardano: 'ADA',
      chainlink: 'LINK',
    };

    const cards = this.settings.coins.map(coin => {
      const coinData = data[coin];
      if (!coinData) {
        return `<div class="crypto-card error"><span>${symbolMap[coin] || coin.toUpperCase()}</span><span>Error</span></div>`;
      }

      const price = coinData[currency.toLowerCase()];
      const change24h = coinData[`${currency.toLowerCase()}_24h_change`];
      const isPositive = change24h >= 0;
      const changeClass = isPositive ? 'positive' : 'negative';
      const changeSign = isPositive ? '+' : '';

      return `
        <div class="crypto-card">
          <div class="crypto-symbol">${symbolMap[coin] || coin.toUpperCase()}</div>
          <div class="crypto-price">${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '--'}</div>
          <div class="crypto-change ${changeClass}">${changeSign}${change24h?.toFixed(2) ?? '0.00'}%</div>
        </div>
      `;
    }).join('');

    this.contentEl.innerHTML = `
      <div class="crypto-grid">${cards}</div>
      <div class="crypto-last-updated">Updated: ${new Date().toLocaleTimeString()} | Currency: ${currency}</div>
    `;
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
    const oldCurrency = this.settings.currency;
    await super.setSettings(newSettings);

    if (newSettings.coins !== undefined || newSettings.currency !== undefined || newSettings.refreshInterval !== undefined) {
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