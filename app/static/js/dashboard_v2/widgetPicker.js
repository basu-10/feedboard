import { getWidgetRegistry, generateWidgetId } from './widgetRegistry.js';
import { saveWidgetSettings } from '../db.js';
import { addWidget as addWidgetToLayout } from './grid.js';

let onWidgetCreate = null;

export function initWidgetPicker(onCreateCallback) {
  onWidgetCreate = onCreateCallback;

  const modal = document.getElementById('widgetPickerModal');
  const closeBtn = modal.querySelector('.close-settings-btn');
  const pickerGrid = modal.querySelector('.widget-picker-grid');

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  renderWidgetCards(pickerGrid);
}

function renderWidgetCards(container) {
  const registry = getWidgetRegistry();

  container.innerHTML = '';

  for (const [type, def] of Object.entries(registry)) {
    const card = document.createElement('div');
    card.className = 'widget-picker-card';
    card.dataset.type = type;
    card.innerHTML = `
      <div class="widget-picker-icon">${getWidgetIcon(type)}</div>
      <h3>${def.name}</h3>
      <p>${getWidgetDescription(type)}</p>
    `;
    card.addEventListener('click', () => addWidget(type));
    container.appendChild(card);
  }
}

function getWidgetIcon(type) {
  const icons = {
    clock: '🕐',
    news: '📰',
    stocks: '📈',
    crypto: '₿',
  };
  return icons[type] || '📦';
}

function getWidgetDescription(type) {
  const desc = {
    clock: 'Local time with timezone support',
    news: 'RSS feed headlines with rotation',
    stocks: 'Real-time stock prices via Finnhub',
    crypto: 'Cryptocurrency prices via CoinGecko',
  };
  return desc[type] || '';
}

async function addWidget(type) {
  closeModal();

  const id = generateWidgetId();

  const registry = getWidgetRegistry();
  const def = registry[type];

  const defaultSettings = { ...def.settingsSchema };
  for (const key of Object.keys(defaultSettings)) {
    if (defaultSettings[key].default !== undefined) {
      defaultSettings[key] = defaultSettings[key].default;
    }
  }

  await saveWidgetSettings(id, { ...defaultSettings, type });
  addWidgetToLayout(type, id, { ...defaultSettings, type });
}

function closeModal() {
  const modal = document.getElementById('widgetPickerModal');
  modal.classList.remove('active');
}

export function openWidgetPicker() {
  const modal = document.getElementById('widgetPickerModal');
  modal.classList.add('active');
}