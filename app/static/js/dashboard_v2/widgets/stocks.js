import { BaseWidget } from './base.js';
import { loadV2Settings } from '../../db.js';

const FINNHUB_BASE = 'https://finnhub.io/api/v1/quote';

const CHART_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa',
  '#22d3ee', '#fb7185', '#a3e635', '#facc15', '#818cf8',
];

export class StocksWidget extends BaseWidget {
  static widgetType = 'stocks';
  static widgetName = 'Stock Prices';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.refreshTimer = null;
    this.cache = null;
    this.cacheExpiry = 0;
    this.chartInstance = null;
  }

  static getDefaultSettings() {
    return {
      symbols: ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'NVDA'],
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

      if (this.settings.displayMode === 'chart') {
        this.renderChart(quotes);
      } else {
        this.renderQuotes(quotes);
      }
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

  renderChart(quotes) {
    if (!this.contentEl) return;

    if (!window.Chart) {
      this.showError('Chart library failed to load.');
      return;
    }

    const valid = quotes.filter(q => !q.error && typeof q.c === 'number');
    if (!valid.length) {
      this.contentEl.innerHTML = `
        <div class="widget-error">No valid price data for the selected symbols.</div>
        <div class="stocks-last-updated">Updated: ${new Date().toLocaleTimeString()}</div>
      `;
      return;
    }

    const metric = this.settings.chartMetric === 'changePct' ? 'changePct' : 'price';
    const labels = valid.map(q => q.symbol);
    const values = valid.map(q => {
      if (metric === 'changePct') {
        const change = q.c - q.pc;
        return q.pc ? Number(((change / q.pc) * 100).toFixed(2)) : 0;
      }
      return Number(q.c.toFixed(2));
    });
    const colors = valid.map(q => {
      if (metric === 'changePct') {
        const change = q.c - q.pc;
        return change >= 0 ? '#22c55e' : '#ef4444';
      }
      return CHART_COLORS[valid.indexOf(q) % CHART_COLORS.length];
    });

    this.contentEl.innerHTML = `
      <div class="stocks-chart-wrap">
        <canvas id="stocksChart-${this.id}"></canvas>
      </div>
      <div class="stocks-last-updated">Updated: ${new Date().toLocaleTimeString()}</div>
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
            label: metric === 'changePct' ? 'Change %' : 'Price',
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
                const q = valid[item.dataIndex];
                const change = q.c - q.pc;
                const pct = q.pc ? ((change / q.pc) * 100).toFixed(2) : '0.00';
                const sign = change >= 0 ? '+' : '';
                if (metric === 'changePct') {
                  return [`${q.symbol}: ${sign}${pct}%`];
                }
                return [
                  `Price: ${q.c.toFixed(2)}`,
                  `Change: ${sign}${change.toFixed(2)} (${sign}${pct}%)`,
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

    if (
      newSettings.symbols !== undefined ||
      newSettings.displayMode !== undefined ||
      newSettings.chartMetric !== undefined
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
