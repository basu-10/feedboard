import { BaseWidget } from './base.js';
import { loadV2Settings } from '../../db.js';

const FINNHUB_BASE = 'https://finnhub.io/api/v1/quote';
const FINNHUB_CANDLE = 'https://finnhub.io/api/v1/stock/candle';
const HISTORY_DAYS = 30;
const CANDLE_CACHE_MS = 5 * 60 * 1000;

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
    this.candleCache = null;
    this.chartInstance = null;
  }

  static getDefaultSettings() {
    return {
      symbols: ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'NVDA'],
      displayMode: 'table',
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
        const history = await this.fetchHistory(apiKey);
        this.renderChart(quotes, history);
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

  async fetchHistory(apiKey) {
    const symbolsKey = this.settings.symbols.join(',');
    const now = Date.now();

    if (this.candleCache && this.candleCache.symbolsKey === symbolsKey && now < this.candleCache.expiry) {
      return this.candleCache.data;
    }

    const to = Math.floor(now / 1000);
    const from = to - HISTORY_DAYS * 24 * 60 * 60;

    const results = await Promise.all(this.settings.symbols.map(async (symbol) => {
      try {
        const res = await fetch(`${FINNHUB_CANDLE}?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`);
        const data = await res.json();
        if (data && data.s === 'ok' && Array.isArray(data.c) && data.c.length) {
          return { symbol, t: data.t, c: data.c };
        }
        return { symbol, t: [], c: [], error: data?.s || 'no_data' };
      } catch (err) {
        return { symbol, t: [], c: [], error: err.message };
      }
    }));

    this.candleCache = { symbolsKey, data: results, expiry: now + CANDLE_CACHE_MS };
    return results;
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

  renderChart(quotes, history) {
    if (!this.contentEl) return;

    if (!window.Chart) {
      this.showError('Chart library failed to load.');
      return;
    }

    this.contentEl.innerHTML = `
      <div class="stocks-chart-wrap">
        <canvas id="stocksChart-${this.id}"></canvas>
      </div>
      <div class="stocks-last-updated">Updated: ${new Date().toLocaleTimeString()} · ${HISTORY_DAYS}d history</div>
    `;

    const canvas = this.contentEl.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    const timeSet = new Set();
    history.forEach(h => (h.t || []).forEach(t => timeSet.add(t)));
    const labels = [...timeSet].sort((a, b) => a - b);
    const labelText = labels.map(t =>
      new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    );

    const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

    const datasets = history
      .filter(h => h.t && h.t.length)
      .map((h, i) => {
        const valueByTime = new Map(h.t.map((t, idx) => [t, h.c[idx]]));
        const quote = quoteMap.get(h.symbol);
        const last = h.c[h.c.length - 1];
        const point = quote && typeof quote.c === 'number' ? quote.c : last;
        return {
          label: h.symbol,
          data: labels.map(t => valueByTime.get(t) ?? null),
          borderColor: CHART_COLORS[i % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.25,
          spanGaps: true,
          _latest: point,
        };
      });

    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text').trim() || '#e5e7eb';
    const mutedColor = rootStyles.getPropertyValue('--muted').trim() || '#9ca3af';
    const borderColor = rootStyles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.1)';

    this.chartInstance = new window.Chart(ctx, {
      type: 'line',
      data: { labels: labelText, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: mutedColor, boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const v = item.parsed.y;
                return `${item.dataset.label}: ${v != null ? v.toFixed(2) : '--'}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: mutedColor, maxTicksLimit: 6, font: { size: 10 } },
            grid: { color: borderColor },
          },
          y: {
            ticks: { color: mutedColor, font: { size: 10 } },
            grid: { color: borderColor },
          },
        },
      },
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

    if (newSettings.symbols !== undefined || newSettings.displayMode !== undefined) {
      this.cache = null;
      this.cacheExpiry = 0;
      this.candleCache = null;
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
