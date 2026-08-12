import { initGrid } from './grid.js';
import { initWidgetSettingsModal } from './widgetSettings.js';
import { initGlobalSettingsModal, openGlobalSettingsModal } from './globalSettings.js';
import { initWidgetPicker, openWidgetPicker } from './widgetPicker.js';

async function init() {
  try {
    initWidgetSettingsModal(openGlobalSettingsModal);
    initGlobalSettingsModal();
    initWidgetPicker(handleWidgetSettings);

    await initGrid(handleWidgetSettings);

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

function handleWidgetSettings(widget, type = 'widget') {
  if (type === 'global') {
    openGlobalSettingsModal();
  } else if (widget) {
    import('./widgetSettings.js').then(({ openWidgetSettings }) => openWidgetSettings(widget));
  }
}

document.addEventListener('DOMContentLoaded', init);

// Make openWidgetPicker globally accessible for toolbar
window.openWidgetPicker = openWidgetPicker;
window.openGlobalSettingsModal = openGlobalSettingsModal;