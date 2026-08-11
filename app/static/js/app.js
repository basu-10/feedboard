// Bootstrap — imports all modules and wires everything together
import { FETCH_INTERVAL_MS } from './config.js';
import { state } from './store.js';
import { loadSettings } from './db.js';
import { fetchNews } from './news.js';
import { restartSlideTimer, nextArticle, prevArticle, togglePause } from './slideshow.js';
import { startClock } from './clock.js';
import { applyLocationSettings } from './weather.js';
import { init as initSettings, DEFAULT_SETTINGS } from './settings.js';

const modalOverlay = document.getElementById('modalOverlay');
const pauseBtn = document.getElementById('pauseBtn');

// Periodic background fetch timer (kept here so it isn't tied to a feature module)
let fetchTimer = null;

async function init() {
  initSettings();

  let saved = null;
  try {
    saved = await loadSettings();
  } catch (err) {
    console.error('Could not load settings', err);
  }

  const settings = saved || DEFAULT_SETTINGS;
  const topics = settings.selectedTopics || DEFAULT_SETTINGS.selectedTopics;
  state.activeCategory = topics.length > 0 ? topics[0] : '';
  state.customFeeds = settings.customFeeds || [];
  state.slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
  state.timezone = settings.timezone || DEFAULT_SETTINGS.timezone;
  state.locationQuery = settings.locationQuery || '';
  state.weatherUnit = settings.weatherUnit || 'celsius';

  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === state.activeCategory);
  });

  startClock();
  fetchNews();
  restartSlideTimer();
  applyLocationSettings();

  fetchTimer = setInterval(async () => {
    await fetchNews();
    restartSlideTimer();
  }, FETCH_INTERVAL_MS);
}

// Category pill selection
document.querySelectorAll('.category-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    state.activeCategory = pill.dataset.category;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.toggle('active', p === pill));
    fetchNews();
    restartSlideTimer();
  });
});

// Navigation controls
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

init();
