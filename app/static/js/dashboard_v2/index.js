import { initGrid } from './grid.js';
import { initWidgetSettingsModal } from './widgetSettings.js';
import { initGlobalSettingsModal, openGlobalSettingsModal } from './globalSettings.js';
import { initWidgetPicker, openWidgetPicker } from './widgetPicker.js';
import { initLayoutModal, openLayoutModal } from './layoutModal.js';

async function init() {
  try {
    initWidgetSettingsModal(openGlobalSettingsModal);
    initGlobalSettingsModal();
    initWidgetPicker(handleWidgetSettings);
    initLayoutModal();

    await initGrid(handleWidgetSettings);

    const addBtn = document.getElementById('addWidgetBtn');
    const settingsBtn = document.getElementById('globalSettingsBtn');
    const saveLayoutBtn = document.getElementById('saveLayoutBtn');
    const loadLayoutBtn = document.getElementById('loadLayoutBtn');

    console.log('Buttons found:', { addBtn: !!addBtn, settingsBtn: !!settingsBtn, saveLayoutBtn: !!saveLayoutBtn, loadLayoutBtn: !!loadLayoutBtn });

    if (addBtn) addBtn.addEventListener('click', openWidgetPicker);
    if (settingsBtn) settingsBtn.addEventListener('click', openGlobalSettingsModal);
    if (saveLayoutBtn) saveLayoutBtn.addEventListener('click', openLayoutModal);
    if (loadLayoutBtn) loadLayoutBtn.addEventListener('click', openLayoutModal);

    console.log('Dashboard v2 initialized successfully');
  } catch (err) {
    console.error('Dashboard v2 init failed:', err);
  }
}

function handleWidgetSettings(widget, type = 'widget') {
  if (type === 'global') {
    openGlobalSettingsModal();
  } else if (widget) {
    import('./widgetSettings.js').then(({ openWidgetSettings }) => openWidgetSettings(widget));
  }
}

document.addEventListener('DOMContentLoaded', init);

window.openWidgetPicker = openWidgetPicker;
window.openGlobalSettingsModal = openGlobalSettingsModal;
window.openLayoutModal = openLayoutModal;