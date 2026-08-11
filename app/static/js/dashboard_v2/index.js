import { initGrid } from './grid.js';
import { initWidgetSettingsModal } from './widgetSettings.js';
import { initGlobalSettingsModal, openGlobalSettingsModal } from './globalSettings.js';
import { initWidgetPicker, openWidgetPicker } from './widgetPicker.js';
import { createWidget } from './widgetRegistry.js';

async function init() {
  try {
    initWidgetSettingsModal(openGlobalSettingsModal);
    initGlobalSettingsModal();
    initWidgetPicker(handleWidgetSettings);

    const grid = await initGrid(handleWidgetAdd, handleWidgetRemove);

    const addBtn = document.getElementById('addWidgetBtn');
    const settingsBtn = document.getElementById('globalSettingsBtn');
    console.log('Buttons found:', { addBtn: !!addBtn, settingsBtn: !!settingsBtn });
    
    if (addBtn) addBtn.addEventListener('click', openWidgetPicker);
    if (settingsBtn) settingsBtn.addEventListener('click', openGlobalSettingsModal);

    console.log('Dashboard v2 initialized successfully');
  } catch (err) {
    console.error('Dashboard v2 init failed:', err);
  }
}

async function handleWidgetSettings(widget, type = 'widget') {
  if (type === 'global') {
    openGlobalSettingsModal();
  } else if (widget) {
    const { openWidgetSettings } = await import('./widgetSettings.js');
    openWidgetSettings(widget);
  }
}

async function handleWidgetAdd(items) {
  console.log('[index] handleWidgetAdd called with items:', items);
  for (const item of items) {
    const widgetEl = item.el;
    const widgetId = widgetEl.dataset.widgetId;
    const widgetType = widgetEl.dataset.widgetType;

    console.log('[index] Processing widget:', { widgetId, widgetType });

    if (!widgetId || !widgetType) {
      console.warn('[index] Missing widgetId or widgetType, skipping');
      continue;
    }

    const { loadWidgetSettings } = await import('../db.js');
    const settings = await loadWidgetSettings(widgetId);
    console.log('[index] Loaded settings:', settings);

    if (settings) {
      const widget = await createWidget(widgetType, widgetId, grid, settings, handleWidgetSettings);
      console.log('[index] Created widget instance:', widget);
      widget.element = widgetEl;
      console.log('[index] Set widget.element, calling render...');
      await widget.render();
      console.log('[index] Widget rendered');
    } else {
      console.warn('[index] No settings found for widget:', widgetId);
    }
  }
}

function handleWidgetRemove(items) {
  console.log('[index] handleWidgetRemove called with items:', items);
  for (const item of items) {
    const widgetEl = item.el;
    const widgetId = widgetEl.dataset.widgetId;

    if (widgetId) {
      import('../db.js').then(({ deleteWidgetSettings }) => deleteWidgetSettings(widgetId));
    }
  }
}

document.addEventListener('DOMContentLoaded', init);

// Make openWidgetPicker globally accessible for toolbar
window.openWidgetPicker = openWidgetPicker;
window.openGlobalSettingsModal = openGlobalSettingsModal;