import { BaseWidget } from './base.js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3/simple/price';

const CHART_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa',
  '#22d3ee', '#fb7185', '#a3e635', '#facc15', '#818cf8',
];

export class CryptoWidget extends BaseWidget {
  static widgetType = 'crypto';
  static widgetName = 'Crypto Prices';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.refreshTimer = null;
    this.cache = null;
    this.cacheExpiry = 0;
    this.chartInstance = null;
  }

  static getDefaultSettings() {
    return {
      coins: ['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink'],
      currency: 'usd',
      displayMode: 'table',
      chartMetric: 'price',
      refreshInterval: 60,
    };
  }

  async onRender() {
    await this.fetchAndRender();
    this.startAutoRefresh();
  }

  async fetchAndRender() {
    this._destroyChart();
    this.showLoading();
    try {
      const prices = await this.fetchPrices();
      this.cache = prices;
      this.cacheExpiry = Date.now() + this.settings.refreshInterval * 1000;

      if (this.settings.displayMode === 'chart') {
        this.renderChart(prices);
      } else {
        this.renderPrices(prices);
      }
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

  renderChart(data) {
    if (!this.contentEl) return;

    if (!window.Chart) {
      this.showError('Chart library failed to load.');
      return;
    }

    const currency = this.settings.currency.toUpperCase();
    const symbolMap = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      solana: 'SOL',
      cardano: 'ADA',
      chainlink: 'LINK',
    };

    const valid = this.settings.coins
      .map(coin => {
        const coinData = data[coin];
        if (!coinData) return null;
        const price = coinData[currency.toLowerCase()];
        const change24h = coinData[`${currency.toLowerCase()}_24h_change`];
        if (typeof price !== 'number') return null;
        return {
          symbol: symbolMap[coin] || coin.toUpperCase(),
          price,
          change24h,
        };
      })
      .filter(Boolean);

    if (!valid.length) {
      this.contentEl.innerHTML = `
        <div class="widget-error">No valid price data for the selected coins.</div>
        <div class="crypto-last-updated">Updated: ${new Date().toLocaleTimeString()}</div>
      `;
      return;
    }

    const metric = this.settings.chartMetric === 'changePct' ? 'changePct' : 'price';
    const labels = valid.map(v => v.symbol);
    const values = valid.map(v => {
      if (metric === 'changePct') {
        return Number((v.change24h ?? 0).toFixed(2));
      }
      return Number(v.price.toFixed(2));
    });
    const colors = valid.map(v => {
      if (metric === 'changePct') {
        return (v.change24h ?? 0) >= 0 ? '#22c55e' : '#ef4444';
      }
      return CHART_COLORS[valid.indexOf(v) % CHART_COLORS.length];
    });

    this.contentEl.innerHTML = `
      <div class="stocks-chart-wrap">
        <canvas id="cryptoChart-${this.id}"></canvas>
      </div>
      <div class="crypto-last-updated">Updated: ${new Date().toLocaleTimeString()} | Currency: ${currency}</div>
    `;

    const canvas = this.contentEl.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text').trim() || '#e5e7eb';
    const mutedColor = rootStyles.getPropertyValue('--muted').trim() || '#9ca3af';
    const borderColor = rootStyles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.1)';

    const valueLabelPlugin = {
      id: 'barValueLabels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;
        meta.data.forEach((bar, index) => {
          const value = chart.data.datasets[0].data[index];
          if (value == null) return;
          ctx.fillStyle = textColor;
          ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          const suffix = metric === 'changePct' ? '%' : '';
          ctx.fillText(`${value.toFixed(2)}${suffix}`, bar.x, bar.y - 6);
        });
      },
    };

    this.chartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: metric === 'changePct' ? '24h Change %' : 'Price',
            data: values,
            backgroundColor: colors,
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const v = valid[item.dataIndex];
                if (metric === 'changePct') {
                  const sign = (v.change24h ?? 0) >= 0 ? '+' : '';
                  return [`${v.symbol}: ${sign}${values[item.dataIndex].toFixed(2)}%`];
                }
                const change = v.change24h ?? 0;
                const sign = change >= 0 ? '+' : '';
                return [
                  `Price: ${v.price.toFixed(2)}`,
                  `24h: ${sign}${change.toFixed(2)}%`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: mutedColor, font: { size: 10 } },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: mutedColor,
              font: { size: 10 },
              callback: (value) => (metric === 'changePct' ? `${value}%` : value),
            },
            grid: { color: borderColor },
          },
        },
      },
      plugins: [valueLabelPlugin],
    });
  }

  _destroyChart() {
    if (this.chartInstance) {
      try {
        this.chartInstance.destroy();
      } catch (_) { /* noop */ }
      this.chartInstance = null;
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
    const oldCurrency = this.settings.currency;
    await super.setSettings(newSettings);

    if (
      newSettings.coins !== undefined ||
      newSettings.currency !== undefined ||
      newSettings.displayMode !== undefined ||
      newSettings.chartMetric !== undefined ||
      newSettings.refreshInterval !== undefined
    ) {
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
    this._destroyChart();
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    super.destroy();
  }
}
