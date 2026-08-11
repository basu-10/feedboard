// Bootstrap — imports all modules and wires everything together
import { FETCH_INTERVAL_MS } from './config.js';
import { state } from './store.js';
import { loadSettings } from './db.js';
import { fetchNews } from './news.js';
import { restartSlideTimer, nextArticle, prevArticle, togglePause } from './slideshow.js';
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
  state.allMode = settings.allMode || false;
  state.activeCategory = state.allMode ? 'ALL' : (topics.length > 0 ? topics[0] : '');
  state.customFeeds = settings.customFeeds || [];
  state.slideIntervalMs = (settings.slideIntervalSec || 8) * 1000;
  state.timezone = settings.timezone || DEFAULT_SETTINGS.timezone;
  state.locationQuery = settings.locationQuery || '';
  state.weatherUnit = settings.weatherUnit || 'celsius';

  document.querySelectorAll('.category-pill').forEach(pill => {
    const isAll = pill.dataset.category === 'ALL';
    pill.classList.toggle('active', isAll ? state.allMode : (!state.allMode && pill.dataset.category === state.activeCategory));
  });

  fetchNews();
  restartSlideTimer();
  applyLocationSettings();

  fetchTimer = setInterval(async () => {
    await fetchNews({ isRefresh: true });
    restartSlideTimer();
  }, FETCH_INTERVAL_MS);
}

// Category pill selection
document.querySelectorAll('.category-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    if (pill.dataset.category === 'ALL') {
      state.allMode = !state.allMode;
      state.activeCategory = state.allMode ? 'ALL' : 'WORLD';
    } else {
      state.allMode = false;
      state.activeCategory = pill.dataset.category;
    }
    document.querySelectorAll('.category-pill').forEach(p => {
      const isActive = p.dataset.category === state.activeCategory && !state.allMode
        ? true
        : p.dataset.category === 'ALL' && state.allMode;
      p.classList.toggle('active', isActive);
    });
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
