// Time formatting and display
import { state } from './store.js';

// DOM Elements
const timeMain = document.getElementById('timeMain');
const timeSub = document.getElementById('timeSub');

let clockTimer = null;

export function formatClock() {
  const now = new Date();
  const opts = {
    timeZone: state.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const time = new Intl.DateTimeFormat([], opts).format(now);
  const tzLabel = state.timezone.split('/').pop().replace(/_/g, ' ');
  const dateLabel = new Intl.DateTimeFormat([], {
    timeZone: state.timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(now);

  timeMain.textContent = time;
  timeSub.textContent = `${dateLabel} · ${tzLabel}`;
}

export function startClock() {
  clearInterval(clockTimer);
  formatClock();
  clockTimer = setInterval(formatClock, 1000);
}
