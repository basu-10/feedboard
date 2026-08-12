import { BaseWidget } from './base.js';
import { GEOCODE_URL, FORECAST_URL, WEATHER_CODES } from '../../config.js';

const DEFAULT_REFRESH_INTERVAL = (() => {
  const env = window.V2_REFRESH_INTERVAL_SECONDS;
  return Number.isFinite(env) && env > 0 ? env : 600;
})();

export async function geocodeLocation(query) {
  if (!query || !query.trim()) return { ok: false, error: 'Enter a location.' };
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query.trim())}&count=1&language=en&format=json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Geocode HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.results && data.results.length) {
      const r = data.results[0];
      const name = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      return { ok: true, name, lat: r.latitude, lon: r.longitude };
    }
    return { ok: false, error: 'Location not found.' };
  } catch (err) {
    console.error('Geocoding failed', err);
    return { ok: false, error: 'Geocoding request failed.' };
  }
}

export class WeatherWidget extends BaseWidget {
  static widgetType = 'weather';
  static widgetName = 'Weather';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.refreshTimer = null;
    this.cache = null;
    this.cacheExpiry = 0;
    this.geoCache = null;
  }

  static getDefaultSettings() {
    return {
      location: '',
      unit: 'celsius',
      showForecast: true,
      refreshInterval: DEFAULT_REFRESH_INTERVAL,
    };
  }

  get unitSuffix() {
    return this.settings.unit === 'fahrenheit' ? '°F' : '°C';
  }

  async onRender() {
    await this.fetchAndRender();
    this.startAutoRefresh();
  }

  async fetchAndRender() {
    if (!this.hasValidLocation()) {
      this.showError('Set a location in widget settings.');
      return;
    }

    this.showLoading();
    try {
      const geo = await this.getGeo();
      if (!geo || !geo.ok) {
        this.showError(geo?.error || 'Location not found.');
        return;
      }

      const url = `${FORECAST_URL}?latitude=${geo.lat}&longitude=${geo.lon}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&temperature_unit=${this.settings.unit}&timezone=auto`;

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.current) {
        this.showError('No weather data returned.');
        return;
      }

      this.cache = data;
      this.cacheExpiry = Date.now() + this.settings.refreshInterval * 1000;
      this.render(data, geo);
    } catch (error) {
      console.error('Weather fetch error:', error);
      this.showError('Failed to fetch weather.');
    }
  }

  async getGeo() {
    if (this.geoCache && this.geoCache.query === this.settings.location) {
      return this.geoCache.result;
    }
    const result = await geocodeLocation(this.settings.location);
    this.geoCache = { query: this.settings.location, result };
    return result;
  }

  hasValidLocation() {
    return !!(this.settings.location && this.settings.location.trim());
  }

  render(data, geo) {
    if (!this.contentEl) return;
    if (!data || !data.current) {
      this.showError('No weather data available.');
      return;
    }

    const cur = data.current;
    const code = WEATHER_CODES[cur.weather_code] || { icon: '🌡️', desc: 'Unknown' };
    const temp = Math.round(cur.temperature_2m);
    const wind = Math.round(cur.wind_speed_10m);
    const humidity = cur.relative_humidity_2m;

    let forecastHtml = '';
    if (this.settings.showForecast && data.daily) {
      const days = data.daily.time.slice(0, 5);
      const cards = days.map((_, i) => {
        const dCode = WEATHER_CODES[data.daily.weather_code[i]] || { icon: '🌡️' };
        const max = Math.round(data.daily.temperature_2m_max[i]);
        const min = Math.round(data.daily.temperature_2m_min[i]);
        const label = i === 0 ? 'Today' : new Date(data.daily.time[i]).toLocaleDateString([], { weekday: 'short' });
        return `
          <div class="weather-forecast-day">
            <div class="weather-forecast-label">${label}</div>
            <div class="weather-forecast-icon">${dCode.icon}</div>
            <div class="weather-forecast-temps">${max}${this.unitSuffix} / ${min}${this.unitSuffix}</div>
          </div>
        `;
      }).join('');
      forecastHtml = `<div class="weather-forecast">${cards}</div>`;
    }

    this.contentEl.innerHTML = `
      <div class="weather-current">
        <div class="weather-icon">${code.icon}</div>
        <div class="weather-main">
          <div class="weather-temp">${temp}${this.unitSuffix}</div>
          <div class="weather-desc">${code.desc}</div>
          <div class="weather-meta">${geo.name}</div>
        </div>
      </div>
      <div class="weather-stats">
        <span>💨 ${wind} km/h</span>
        <span>💧 ${humidity}%</span>
      </div>
      ${forecastHtml}
      <div class="weather-last-updated">Updated: ${new Date().toLocaleTimeString()}</div>
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
    await super.setSettings(newSettings);

    if (
      newSettings.location !== undefined ||
      newSettings.unit !== undefined ||
      newSettings.showForecast !== undefined
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
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    super.destroy();
  }
}
