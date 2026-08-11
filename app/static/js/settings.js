// Modal UI, tabs, custom feeds, import/export
import { state } from './store.js';
import { loadSettings, saveSettings } from './db.js';
import { fetchNews } from './news.js';
import { restartSlideTimer } from './slideshow.js';
import { startClock } from './clock.js';
import { applyLocationSettings } from './weather.js';

// Modal DOM Elements
const modalOverlay = document.getElementById('modalOverlay');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const customFeedList = document.getElementById('customFeedList');
const addFeedBtn = document.getElementById('addFeedBtn');
const slideIntervalInput = document.getElementById('slideIntervalInput');
const settingsTabs = document.getElementById('settingsTabs');

// Location & Time DOM Elements
const timezoneSelect = document.getElementById('timezoneSelect');
const locationInput = document.getElementById('locationInput');
const weatherUnitSelect = document.getElementById('weatherUnitSelect');

// Default settings used when nothing is stored yet
const DEFAULT_SETTINGS = {
  selectedTopics: ['WORLD'],
  customFeeds: [],
  slideIntervalSec: 8,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locationQuery: '',
  weatherUnit: 'celsius'
};

export function init() {
  setupTabs();
  wireModal();
}

function collectSettings() {
  const feeds = Array.from(customFeedList.querySelectorAll('.custom-feed-item'))
    .map(row => {
      const id = row.dataset.id;
      const url = row.querySelector('input').value.trim();
      return url ? { id, url } : null;
    })
    .filter(Boolean);

  return {
    selectedTopics: state.activeCategory ? [state.activeCategory] : [],
    customFeeds: feeds,
    slideIntervalSec: parseInt(slideIntervalInput.value, 10) || 8,
    timezone: timezoneSelect.value,
    locationQuery: locationInput.value.trim(),
    weatherUnit: weatherUnitSelect.value
  };
}

function applySettingsToUI(settings) {
  const topics = settings.selectedTopics || [];
  state.activeCategory = topics.length > 0 ? topics[0] : '';

  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === state.activeCategory);
  });

  state.customFeeds = settings.customFeeds || [];
  state.slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
  state.timezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  state.locationQuery = settings.locationQuery || '';
  state.weatherUnit = settings.weatherUnit || 'celsius';

  renderCustomFeedRows();
  slideIntervalInput.value = settings.slideIntervalSec || 8;

  if (!timezoneSelect.dataset.populated) {
    populateTimezones();
  }
  timezoneSelect.value = state.timezone;
  locationInput.value = state.locationQuery;
  weatherUnitSelect.value = state.weatherUnit;
}

function renderCustomFeedRows() {
  customFeedList.innerHTML = '';
  for (const feed of state.customFeeds) {
    customFeedList.appendChild(createCustomFeedRow(feed.id, feed.url));
  }
}

function createCustomFeedRow(id, url) {
  const row = document.createElement('div');
  row.className = 'custom-feed-item';
  row.dataset.id = id || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'https://example.com/rss.xml';
  input.value = url || '';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-feed-btn';
  removeBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  removeBtn.title = 'Remove feed';
  removeBtn.addEventListener('click', () => {
    row.remove();
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  return row;
}

// Build the timezone dropdown from the runtime's available zones
function populateTimezones() {
  const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [state.timezone];
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  for (const z of zones.sort()) {
    const opt = document.createElement('option');
    opt.value = z;
    opt.textContent = z.replace(/_/g, ' ');
    if (z === local) opt.textContent += ' (local)';
    timezoneSelect.appendChild(opt);
  }
  timezoneSelect.value = state.timezone;
  timezoneSelect.dataset.populated = 'true';
}

// ---- Tabs ----
function setupTabs() {
  settingsTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const target = btn.dataset.tab;

    settingsTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === target);
    });
  });
}

// ---- Modal Dialog Controls ----
function wireModal() {
  openSettingsBtn.addEventListener('click', () => {
    if (!timezoneSelect.dataset.populated) populateTimezones();
    applySettingsToUI({ selectedTopics: state.activeCategory ? [state.activeCategory] : [], customFeeds: state.customFeeds, slideIntervalSec: state.slideIntervalMs / 1000, timezone: state.timezone, locationQuery: state.locationQuery, weatherUnit: state.weatherUnit });
    modalOverlay.classList.add('active');
  });

  closeSettingsBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  addFeedBtn.addEventListener('click', () => {
    customFeedList.appendChild(createCustomFeedRow());
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const settings = collectSettings();
    if (!settings.selectedTopics.length && !settings.customFeeds.length) {
      alert('Please select a category or add a custom feed.');
      return;
    }

    state.activeCategory = settings.selectedTopics.length > 0 ? settings.selectedTopics[0] : '';
    state.customFeeds = settings.customFeeds;
    state.slideIntervalMs = settings.slideIntervalSec * 1000;
    state.timezone = settings.timezone;
    state.locationQuery = settings.locationQuery;
    state.weatherUnit = settings.weatherUnit;

    try {
      await saveSettings(settings);
    } catch (err) {
      console.error('Failed to persist settings', err);
    }

    modalOverlay.classList.remove('active');
    fetchNews();
    restartSlideTimer();
    applyLocationSettings();
    startClock();
  });

  // ---- Import / Export ----
  document.getElementById('exportSettingsBtn').addEventListener('click', async () => {
    let settings;
    try {
      settings = await loadSettings();
    } catch (err) {
      console.error(err);
    }
    settings = settings || { selectedTopics: state.activeCategory ? [state.activeCategory] : [], customFeeds: state.customFeeds, slideIntervalSec: state.slideIntervalMs / 1000 };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mydash-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const importFileInput = document.getElementById('importFileInput');
  const importStatus = document.getElementById('importStatus');

  document.getElementById('importSettingsBtn').addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const settings = JSON.parse(text);

      if (!settings || typeof settings !== 'object' ||
          !Array.isArray(settings.selectedTopics) || !Array.isArray(settings.customFeeds)) {
        throw new Error('Invalid settings file');
      }

      await saveSettings(settings);
      const topics = settings.selectedTopics || [];
      state.activeCategory = topics.length > 0 ? topics[0] : '';
      state.customFeeds = settings.customFeeds;
      state.slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
      state.timezone = settings.timezone || state.timezone;
      state.locationQuery = settings.locationQuery || '';
      state.weatherUnit = settings.weatherUnit || 'celsius';

      applySettingsToUI(settings);
      importStatus.textContent = 'Settings imported successfully.';
      applyLocationSettings();
      startClock();
      fetchNews();
      restartSlideTimer();
    } catch (err) {
      console.error(err);
      importStatus.textContent = 'Import failed: invalid settings file.';
    }
    importFileInput.value = '';
  });
}

export { DEFAULT_SETTINGS };
