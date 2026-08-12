import { initGrid } from './grid.js';
import { initWidgetSettingsModal } from './widgetSettings.js';
import { initGlobalSettingsModal, openGlobalSettingsModal } from './globalSettings.js';
import { initWidgetPicker, openWidgetPicker } from './widgetPicker.js';
import { initLayoutModal, openLayoutModal } from './layoutModal.js';
import { applyLayout } from './layoutManager.js';
import { BUILTIN_LAYOUTS } from './builtinLayouts.js';

function bindToolbar() {
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

  document.querySelectorAll('[data-builtin-layout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-builtin-layout');
      const entry = BUILTIN_LAYOUTS.find(l => l.id === id);
      if (!entry) return;
      if (!confirm(`Apply the "${entry.label}" layout? This will replace your current dashboard.`)) return;
      layoutMenu?.classList.remove('open');
      layoutMenuBtn?.setAttribute('aria-expanded', 'false');
      await applyLayout(entry.layout);
    });
  });
}

async function init() {
  try {
    initWidgetSettingsModal(openGlobalSettingsModal);
    initGlobalSettingsModal();
    initWidgetPicker(handleWidgetSettings);
    initLayoutModal();

    // Bind toolbar first so a grid failure can't disable the controls.
    bindToolbar();

    await initGrid(handleWidgetSettings);

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