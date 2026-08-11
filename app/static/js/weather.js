// Geocoding, weather fetch, weather display
import { GEOCODE_URL, FORECAST_URL, WEATHER_CODES } from './config.js';
import { state } from './store.js';
import { startClock } from './clock.js';

// DOM Elements
const statusWeather = document.getElementById('statusWeather');
const weatherIcon = document.getElementById('weatherIcon');
const weatherTemp = document.getElementById('weatherTemp');
const weatherDesc = document.getElementById('weatherDesc');

let weatherTimer = null;

export async function geocodeLocation(query) {
  if (!query || !query.trim()) return null;
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query.trim())}&count=1&language=en&format=json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Geocode HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.results && data.results.length) {
      const r = data.results[0];
      return {
        lat: r.latitude,
        lon: r.longitude,
        name: [r.name, r.admin1, r.country].filter(Boolean).join(', ')
      };
    }
    return null;
  } catch (err) {
    console.error('Geocoding failed', err);
    return null;
  }
}

export async function fetchWeather() {
  if (!state.weatherLocation) {
    statusWeather.style.display = 'none';
    return;
  }
  try {
    const { lat, lon } = state.weatherLocation;
    const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${state.weatherUnit}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    const cur = data.current;
    if (!cur) return;

    const code = WEATHER_CODES[cur.weather_code] || { icon: '🌡️', desc: 'Unknown' };
    const unit = state.weatherUnit === 'fahrenheit' ? '°F' : '°C';

    weatherIcon.textContent = code.icon;
    weatherTemp.textContent = `${Math.round(cur.temperature_2m)}${unit}`;
    weatherDesc.textContent = code.desc;
    statusWeather.style.display = 'flex';
  } catch (err) {
    console.error('Weather fetch failed', err);
  }
}

export function startWeather() {
  clearInterval(weatherTimer);
  if (!state.weatherLocation) {
    statusWeather.style.display = 'none';
    return;
  }
  fetchWeather();
  weatherTimer = setInterval(fetchWeather, 10 * 60 * 1000);
}

export async function applyLocationSettings() {
  startClock();

  if (state.locationQuery && state.locationQuery.trim()) {
    try {
      state.weatherLocation = await geocodeLocation(state.locationQuery);
    } catch (err) {
      console.error('Geocoding failed', err);
      state.weatherLocation = null;
    }
  } else {
    state.weatherLocation = null;
  }
  startWeather();
}
