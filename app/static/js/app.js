// Application State
let articles = [];
let currentIndex = 0;
let isPaused = false;
let slideIntervalMs = 8000;
let activeCategory = 'WORLD';

// Persisted settings
let customFeeds = []; // [{ id, url }]

// Location & Time settings
let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
let locationQuery = ''; // free-text city name
let weatherUnit = 'celsius';
let weatherLocation = null; // resolved { lat, lon, name } from geocoding

// Timers & Animators
let rotationTimer = null;
let fetchTimer = null;
let progressTimer = null;
let progressStartTime = 0;
let clockTimer = null;
let weatherTimer = null;

// Default settings used when nothing is stored yet
const DEFAULT_SETTINGS = {
  selectedTopics: ['WORLD'],
  customFeeds: [],
  slideIntervalSec: 8,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locationQuery: '',
  weatherUnit: 'celsius'
};

const WEATHER_CODES = {
  0:  { icon: '☀️', desc: 'Clear sky' },
  1:  { icon: '🌤️', desc: 'Mainly clear' },
  2:  { icon: '⛅', desc: 'Partly cloudy' },
  3:  { icon: '☁️', desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Fog' },
  48: { icon: '🌫️', desc: 'Rime fog' },
  51: { icon: '🌦️', desc: 'Light drizzle' },
  53: { icon: '🌦️', desc: 'Drizzle' },
  55: { icon: '🌦️', desc: 'Dense drizzle' },
  61: { icon: '🌧️', desc: 'Light rain' },
  63: { icon: '🌧️', desc: 'Rain' },
  65: { icon: '🌧️', desc: 'Heavy rain' },
  71: { icon: '🌨️', desc: 'Light snow' },
  73: { icon: '🌨️', desc: 'Snow' },
  75: { icon: '❄️', desc: 'Heavy snow' },
  80: { icon: '🌦️', desc: 'Rain showers' },
  81: { icon: '🌧️', desc: 'Rain showers' },
  82: { icon: '⛈️', desc: 'Violent showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'Thunderstorm with hail' },
  99: { icon: '⛈️', desc: 'Thunderstorm with hail' }
};

// DOM Elements
const card = document.getElementById('articleCard');
const titleEl = document.getElementById('articleTitle');
const snippetEl = document.getElementById('articleSnippet');
const sourceEl = document.getElementById('articleSource');
const dateEl = document.getElementById('articleDate');
const imgEl = document.getElementById('articleImg');
const imgContainer = document.getElementById('imageContainer');
const linkEl = document.getElementById('articleLink');
const counterEl = document.getElementById('articleCounter');
const progressBar = document.getElementById('progressBar');
const pauseBtn = document.getElementById('pauseBtn');

// Modal DOM Elements
const modalOverlay = document.getElementById('modalOverlay');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const customFeedList = document.getElementById('customFeedList');
const addFeedBtn = document.getElementById('addFeedBtn');
const slideIntervalInput = document.getElementById('slideIntervalInput');
const settingsTabs = document.getElementById('settingsTabs');

// Status Bar DOM Elements
const statusBar = document.getElementById('statusBar');
const timeMain = document.getElementById('timeMain');
const timeSub = document.getElementById('timeSub');
const statusWeather = document.getElementById('statusWeather');
const weatherIcon = document.getElementById('weatherIcon');
const weatherTemp = document.getElementById('weatherTemp');
const weatherDesc = document.getElementById('weatherDesc');

// Location & Time DOM Elements
const timezoneSelect = document.getElementById('timezoneSelect');
const locationInput = document.getElementById('locationInput');
const locationHelp = document.getElementById('locationHelp');
const weatherUnitSelect = document.getElementById('weatherUnitSelect');

// Human-readable labels for each built-in feed category
const TOPIC_LABELS = {
  WORLD: 'World News',
  TECHNOLOGY: 'Technology',
  BUSINESS: 'Business',
  SCIENCE: 'Science',
  SPORTS: 'Sports'
};

// Build the list of active feeds (built-in + custom) for fetching
function getActiveFeeds() {
  const feeds = [];
  if (activeCategory && TOPIC_FEEDS[activeCategory]) {
    feeds.push({ topic: activeCategory, url: TOPIC_FEEDS[activeCategory] });
  }
  for (const feed of customFeeds) {
    if (feed.url) feeds.push({ topic: `CUSTOM:${feed.id}`, url: feed.url });
  }
  return feeds;
}

// Fisher-Yates shuffle for variety within a single category
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Fetch a single feed and return its items tagged with the source topic
async function fetchFeed(feed) {
  const cacheBust = `_=${Date.now()}`;
  const response = await fetch(
    `${RSS2JSON_ENDPOINT}${encodeURIComponent(feed.url)}&${cacheBust}`,
    { cache: 'no-store' }
  );
  const data = await response.json();
  if (data.status === 'ok' && data.items.length > 0) {
    return data.items.map(item => ({ ...item, sourceTopic: feed.topic }));
  }
  return [];
}

// Interleave items from each feed round-robin (1 from each, then repeat)
function buildRoundRobinQueue(feedsItems) {
  const buckets = feedsItems.map(items => shuffle([...items]));
  const queue = [];
  let added = true;

  while (added) {
    added = false;
    for (const bucket of buckets) {
      const item = bucket.shift();
      if (item) {
        queue.push(item);
        added = true;
      }
    }
  }
  return queue;
}

// Fetch News Data from all selected Endpoints
async function fetchNews() {
  const feeds = getActiveFeeds();
  if (!feeds.length) {
    titleEl.innerText = "No feeds selected. Select a category or add a custom feed.";
    return;
  }

  titleEl.innerText = "Loading feed content...";

  try {
    const results = await Promise.all(feeds.map(fetchFeed));
    const queue = buildRoundRobinQueue(results);

    if (queue.length > 0) {
      articles = queue;
      currentIndex = 0;
      renderArticle();
      restartSlideTimer();
    } else {
      titleEl.innerText = "No articles found for the selected feeds.";
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    titleEl.innerText = "Error fetching news data.";
  }
}
function renderArticle() {
  if (!articles.length) return;

  const item = articles[currentIndex];

  // Fade transition out
  card.classList.add('fade');

  setTimeout(() => {
    // Extract Image Link
    let imageUrl = item.thumbnail || item.enclosure?.link || extractImgFromHTML(item.description);

    if (imageUrl) {
      imgEl.src = imageUrl;
      imgContainer.style.display = 'block';
      card.classList.remove('no-image');
    } else {
      imgContainer.style.display = 'none';
      card.classList.add('no-image');
    }

    // Set Text Fields
    titleEl.innerText = item.title;
    snippetEl.innerText = cleanText(item.description || item.content);
    sourceEl.innerText = item.author || TOPIC_LABELS[item.sourceTopic] || item.sourceTopic;
    dateEl.innerText = new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    linkEl.href = item.link;
    counterEl.innerText = `${currentIndex + 1} / ${articles.length}`;

    // Fade transition in
    card.classList.remove('fade');
  }, 300);
}

// Helper: Extract First Image Tag from RSS Description HTML
function extractImgFromHTML(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
}

// Helper: Strip HTML tags and clean up string snippet
function cleanText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = doc.body.textContent || "";
  return text.length > 200 ? text.substring(0, 200) + '...' : text;
}

// Rotation Control Methods
function nextArticle() {
  if (!articles.length) return;
  currentIndex = (currentIndex + 1) % articles.length;
  renderArticle();
  restartSlideTimer();
}

function prevArticle() {
  if (!articles.length) return;
  currentIndex = (currentIndex - 1 + articles.length) % articles.length;
  renderArticle();
  restartSlideTimer();
}

function togglePause() {
  isPaused = !isPaused;
  // Update pause button with SVG icons
  if (isPaused) {
    pauseBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21"></polygon>
      </svg>
    `;
    pauseBtn.setAttribute('aria-label', 'Play');
    pauseBtn.setAttribute('title', 'Play');
  } else {
    pauseBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
    `;
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.setAttribute('title', 'Pause');
  }
  if (isPaused) {
    clearInterval(rotationTimer);
    cancelAnimationFrame(progressTimer);
  } else {
    restartSlideTimer();
  }
}

function restartSlideTimer() {
  clearInterval(rotationTimer);
  cancelAnimationFrame(progressTimer);
  progressBar.style.width = '0%';

  if (isPaused) return;

  progressStartTime = performance.now();
  updateProgress();

  rotationTimer = setInterval(() => {
    nextArticle();
  }, slideIntervalMs);
}

function updateProgress() {
  if (isPaused) return;

  const elapsed = performance.now() - progressStartTime;
  const progress = Math.min((elapsed / slideIntervalMs) * 100, 100);
  progressBar.style.width = `${progress}%`;

  if (progress < 100) {
    progressTimer = requestAnimationFrame(updateProgress);
  }
}

// Pause rotation when the page is not visible/hidden, resume when back
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(rotationTimer);
    cancelAnimationFrame(progressTimer);
  } else if (!isPaused) {
    restartSlideTimer();
  }
});

// Event Listeners
document.getElementById('nextBtn').addEventListener('click', nextArticle);
document.getElementById('prevBtn').addEventListener('click', prevArticle);
pauseBtn.addEventListener('click', togglePause);

// Keyboard Shortcuts Navigation
document.addEventListener('keydown', (e) => {
  if (modalOverlay.classList.contains('active')) return;
  if (e.key === 'ArrowRight') nextArticle();
  if (e.key === 'ArrowLeft') prevArticle();
  if (e.key === ' ') { e.preventDefault(); togglePause(); }
});

// ---- Clock & Weather ----
function formatClock() {
  const now = new Date();
  const opts = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const time = new Intl.DateTimeFormat([], opts).format(now);
  const tzLabel = timezone.split('/').pop().replace(/_/g, ' ');
  const dateLabel = new Intl.DateTimeFormat([], {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(now);

  timeMain.textContent = time;
  timeSub.textContent = `${dateLabel} · ${tzLabel}`;
}

function startClock() {
  clearInterval(clockTimer);
  formatClock();
  clockTimer = setInterval(formatClock, 1000);
}

async function geocodeLocation(query) {
  if (!query || !query.trim()) return null;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=en&format=json`;
  const res = await fetch(url, { cache: 'no-store' });
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
}

async function fetchWeather() {
  if (!weatherLocation) {
    statusWeather.style.display = 'none';
    return;
  }
  try {
    const { lat, lon } = weatherLocation;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${weatherUnit}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    const cur = data.current;
    if (!cur) return;

    const code = WEATHER_CODES[cur.weather_code] || { icon: '🌡️', desc: 'Unknown' };
    const unit = weatherUnit === 'fahrenheit' ? '°F' : '°C';

    weatherIcon.textContent = code.icon;
    weatherTemp.textContent = `${Math.round(cur.temperature_2m)}${unit}`;
    weatherDesc.textContent = code.desc;
    statusWeather.style.display = 'flex';
  } catch (err) {
    console.error('Weather fetch failed', err);
  }
}

function startWeather() {
  clearInterval(weatherTimer);
  if (!weatherLocation) {
    statusWeather.style.display = 'none';
    return;
  }
  fetchWeather();
  weatherTimer = setInterval(fetchWeather, 10 * 60 * 1000);
}

async function applyLocationSettings() {
  startClock();

  if (locationQuery && locationQuery.trim()) {
    try {
      weatherLocation = await geocodeLocation(locationQuery);
    } catch (err) {
      console.error('Geocoding failed', err);
      weatherLocation = null;
    }
  } else {
    weatherLocation = null;
  }
  startWeather();
}

// ---- Settings Persistence ----
function collectSettings() {
  const feeds = Array.from(customFeedList.querySelectorAll('.custom-feed-item'))
    .map(row => {
      const id = row.dataset.id;
      const url = row.querySelector('input').value.trim();
      return url ? { id, url } : null;
    })
    .filter(Boolean);

  return {
    selectedTopics: activeCategory ? [activeCategory] : [],
    customFeeds: feeds,
    slideIntervalSec: parseInt(slideIntervalInput.value, 10) || 8,
    timezone: timezoneSelect.value,
    locationQuery: locationInput.value.trim(),
    weatherUnit: weatherUnitSelect.value
  };
}

function applySettingsToUI(settings) {
  const topics = settings.selectedTopics || [];
  activeCategory = topics.length > 0 ? topics[0] : '';

  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === activeCategory);
  });

  customFeeds = settings.customFeeds || [];
  slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
  timezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  locationQuery = settings.locationQuery || '';
  weatherUnit = settings.weatherUnit || 'celsius';

  renderCustomFeedRows();
  slideIntervalInput.value = settings.slideIntervalSec || 8;

  if (!timezoneSelect.dataset.populated) {
    populateTimezones();
  }
  timezoneSelect.value = timezone;
  locationInput.value = locationQuery;
  weatherUnitSelect.value = weatherUnit;
}

function renderCustomFeedRows() {
  customFeedList.innerHTML = '';
  for (const feed of customFeeds) {
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
  // Use SVG icon for remove button (X icon)
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
  const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [timezone];
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  for (const z of zones.sort()) {
    const opt = document.createElement('option');
    opt.value = z;
    opt.textContent = z.replace(/_/g, ' ');
    if (z === local) opt.textContent += ' (local)';
    timezoneSelect.appendChild(opt);
  }
  timezoneSelect.value = timezone;
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
openSettingsBtn.addEventListener('click', () => {
  if (!timezoneSelect.dataset.populated) populateTimezones();
  applySettingsToUI({ selectedTopics: activeCategory ? [activeCategory] : [], customFeeds, slideIntervalSec: slideIntervalMs / 1000, timezone, locationQuery, weatherUnit });
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

  activeCategory = settings.selectedTopics.length > 0 ? settings.selectedTopics[0] : '';
  customFeeds = settings.customFeeds;
  slideIntervalMs = settings.slideIntervalSec * 1000;
  timezone = settings.timezone;
  locationQuery = settings.locationQuery;
  weatherUnit = settings.weatherUnit;

  try {
    await saveSettings(settings);
  } catch (err) {
    console.error('Failed to persist settings', err);
  }

  modalOverlay.classList.remove('active');
  applyLocationSettings();
  fetchNews();
});

// ---- Import / Export ----
document.getElementById('exportSettingsBtn').addEventListener('click', async () => {
  let settings;
  try {
    settings = await loadSettings();
  } catch (err) {
    console.error(err);
  }
  settings = settings || { selectedTopics: activeCategory ? [activeCategory] : [], customFeeds, slideIntervalSec: slideIntervalMs / 1000 };

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
    activeCategory = topics.length > 0 ? topics[0] : '';
    customFeeds = settings.customFeeds;
    slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
    timezone = settings.timezone || timezone;
    locationQuery = settings.locationQuery || '';
    weatherUnit = settings.weatherUnit || 'celsius';

    applySettingsToUI(settings);
    importStatus.textContent = 'Settings imported successfully.';
    applyLocationSettings();
    fetchNews();
  } catch (err) {
    console.error(err);
    importStatus.textContent = 'Import failed: invalid settings file.';
  }
  importFileInput.value = '';
});

// ---- Boot ----
async function init() {
  setupTabs();
  populateTimezones();
  let saved = null;
  try {
    saved = await loadSettings();
  } catch (err) {
    console.error('Could not load settings', err);
  }

  const settings = saved || DEFAULT_SETTINGS;
  const topics = settings.selectedTopics || DEFAULT_SETTINGS.selectedTopics;
  activeCategory = topics.length > 0 ? topics[0] : '';
  customFeeds = settings.customFeeds || [];
  slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
  timezone = settings.timezone || DEFAULT_SETTINGS.timezone;
  locationQuery = settings.locationQuery || '';
  weatherUnit = settings.weatherUnit || 'celsius';

  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === activeCategory);
  });

  applyLocationSettings();
  fetchNews();
  fetchTimer = setInterval(fetchNews, FETCH_INTERVAL_MS);
}

// Category pill selection
document.querySelectorAll('.category-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    activeCategory = pill.dataset.category;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.toggle('active', p === pill));
    fetchNews();
  });
});

init();