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
    const layoutMenu = document.getElementById('layoutMenu');
    const layoutMenuBtn = document.getElementById('layoutMenuBtn');

    console.log('Buttons found:', { addBtn: !!addBtn, settingsBtn: !!settingsBtn, saveLayoutBtn: !!saveLayoutBtn, loadLayoutBtn: !!loadLayoutBtn });

    if (addBtn) addBtn.addEventListener('click', openWidgetPicker);
    if (settingsBtn) settingsBtn.addEventListener('click', openGlobalSettingsModal);

    if (layoutMenu && layoutMenuBtn) {
      layoutMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = layoutMenu.classList.toggle('open');
        layoutMenuBtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (e) => {
        if (!layoutMenu.contains(e.target)) {
          layoutMenu.classList.remove('open');
          layoutMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          layoutMenu.classList.remove('open');
          layoutMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (saveLayoutBtn) saveLayoutBtn.addEventListener('click', () => {
      layoutMenu?.classList.remove('open');
      layoutMenuBtn?.setAttribute('aria-expanded', 'false');
      openLayoutModal();
    });
    if (loadLayoutBtn) loadLayoutBtn.addEventListener('click', () => {
      layoutMenu?.classList.remove('open');
      layoutMenuBtn?.setAttribute('aria-expanded', 'false');
      openLayoutModal();
    });

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