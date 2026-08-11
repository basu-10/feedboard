// Application State
let articles = [];
let currentIndex = 0;
let isPaused = false;
let slideIntervalMs = 8000;

// Persisted settings
let selectedTopics = ['WORLD'];
let customFeeds = []; // [{ id, url }]

// Timers & Animators
let rotationTimer = null;
let fetchTimer = null;
let progressTimer = null;
let progressStartTime = 0;

// Default settings used when nothing is stored yet
const DEFAULT_SETTINGS = {
  selectedTopics: ['WORLD'],
  customFeeds: [],
  slideIntervalSec: 8
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
const topicList = document.getElementById('topicList');
const customFeedList = document.getElementById('customFeedList');
const addFeedBtn = document.getElementById('addFeedBtn');
const slideIntervalInput = document.getElementById('slideIntervalInput');
const settingsTabs = document.getElementById('settingsTabs');

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
  for (const topic of selectedTopics) {
    if (TOPIC_FEEDS[topic]) feeds.push({ topic, url: TOPIC_FEEDS[topic] });
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
  const response = await fetch(`${RSS2JSON_ENDPOINT}${encodeURIComponent(feed.url)}`);
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
    titleEl.innerText = "No feeds selected. Open Settings to add some.";
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

// Render Current Article Data
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
  pauseBtn.innerText = isPaused ? '▶ Play' : '⏸ Pause';
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

// ---- Settings Persistence ----
function collectSettings() {
  const checkedTopics = Array.from(topicList.querySelectorAll('input[name="topic"]:checked'))
    .map(c => c.value);
  const feeds = Array.from(customFeedList.querySelectorAll('.custom-feed-item'))
    .map(row => {
      const id = row.dataset.id;
      const url = row.querySelector('input').value.trim();
      return url ? { id, url } : null;
    })
    .filter(Boolean);

  return {
    selectedTopics: checkedTopics,
    customFeeds: feeds,
    slideIntervalSec: parseInt(slideIntervalInput.value, 10) || 8
  };
}

function applySettingsToUI(settings) {
  selectedTopics = settings.selectedTopics || [];
  customFeeds = settings.customFeeds || [];
  slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;

  topicList.querySelectorAll('input[name="topic"]').forEach(box => {
    box.checked = selectedTopics.includes(box.value);
  });
  renderCustomFeedRows();
  slideIntervalInput.value = settings.slideIntervalSec || 8;
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
  removeBtn.textContent = '−';
  removeBtn.title = 'Remove feed';
  removeBtn.addEventListener('click', () => {
    row.remove();
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  return row;
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
  applySettingsToUI({ selectedTopics, customFeeds, slideIntervalSec: slideIntervalMs / 1000 });
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
    alert('Please select at least one topic or add a custom feed.');
    return;
  }

  selectedTopics = settings.selectedTopics;
  customFeeds = settings.customFeeds;
  slideIntervalMs = settings.slideIntervalSec * 1000;

  try {
    await saveSettings(settings);
  } catch (err) {
    console.error('Failed to persist settings', err);
  }

  modalOverlay.classList.remove('active');
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
  settings = settings || { selectedTopics, customFeeds, slideIntervalSec: slideIntervalMs / 1000 };

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
    selectedTopics = settings.selectedTopics;
    customFeeds = settings.customFeeds;
    slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;

    applySettingsToUI(settings);
    importStatus.textContent = 'Settings imported successfully.';
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
  let saved = null;
  try {
    saved = await loadSettings();
  } catch (err) {
    console.error('Could not load settings', err);
  }

  const settings = saved || DEFAULT_SETTINGS;
  selectedTopics = settings.selectedTopics || DEFAULT_SETTINGS.selectedTopics;
  customFeeds = settings.customFeeds || [];
  slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;

  fetchNews();
  fetchTimer = setInterval(fetchNews, FETCH_INTERVAL_MS);
}

init();
