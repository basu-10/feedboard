// Rotation timer, progress bar, next/prev/pause navigation
import { state } from './store.js';
import { renderArticle } from './news.js';

// DOM Elements
const progressBar = document.getElementById('progressBar');
const pauseBtn = document.getElementById('pauseBtn');

// Timers & Animators
let rotationTimer = null;
let progressTimer = null;
let progressStartTime = 0;

export function nextArticle() {
  if (!state.articles.length) return;
  state.currentIndex = (state.currentIndex + 1) % state.articles.length;
  renderArticle();
  restartSlideTimer();
}

export function prevArticle() {
  if (!state.articles.length) return;
  state.currentIndex = (state.currentIndex - 1 + state.articles.length) % state.articles.length;
  renderArticle();
  restartSlideTimer();
}

export function togglePause() {
  state.isPaused = !state.isPaused;
  // Update pause button with SVG icons
  if (state.isPaused) {
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
  if (state.isPaused) {
    clearInterval(rotationTimer);
    cancelAnimationFrame(progressTimer);
  } else {
    restartSlideTimer();
  }
}

export function restartSlideTimer() {
  clearInterval(rotationTimer);
  cancelAnimationFrame(progressTimer);
  progressBar.style.width = '0%';

  if (state.isPaused) return;

  progressStartTime = performance.now();
  updateProgress();

  rotationTimer = setInterval(() => {
    nextArticle();
  }, state.slideIntervalMs);
}

function updateProgress() {
  if (state.isPaused) return;

  const elapsed = performance.now() - progressStartTime;
  const progress = Math.min((elapsed / state.slideIntervalMs) * 100, 100);
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
  } else if (!state.isPaused) {
    restartSlideTimer();
  }
});
