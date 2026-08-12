import { loadAllWidgetSettings, loadGridLayout, openDB, saveWidgetSettings, loadWidgetSettings } from '../db.js';
import { getGrid } from './grid.js';
import { generateWidgetId } from './widgetRegistry.js';

const WIDGETS_STORE = 'widgets';
const GRID_LAYOUT_STORE = 'gridLayout';

export async function exportLayout() {
  const layout = await loadGridLayout();
  if (!layout || !layout.length) {
    alert('No widgets to export');
    return;
  }

  const widgetsData = await Promise.all(layout.map(async item => {
    const settings = await loadWidgetSettings(item.id);
    const cleanSettings = settings ? { ...settings } : {};
    delete cleanSettings.id;
    delete cleanSettings.type;
    return {
      type: settings?.type || 'unknown',
      w: item.w,
      h: item.h,
      settings: cleanSettings,
    };
  }));

  const payload = {
    version: 1,
    name: 'Dashboard Layout',
    exportedAt: new Date().toISOString(),
    widgets: widgetsData.filter(w => w.type !== 'unknown'),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-layout-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importLayout(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    alert('Invalid layout file: could not parse JSON');
    return;
  }

  if (!payload || !Array.isArray(payload.widgets) || payload.version !== 1) {
    alert('Invalid layout format');
    return;
  }

  const grid = getGrid();
  const container = grid.getContainer();
  
  const existingIds = [...container.children]
    .filter(el => el.dataset.widgetId)
    .map(el => el.dataset.widgetId);
  
  for (const id of existingIds) {
    grid.removeWidget(id);
  }
  
  await new Promise(r => setTimeout(r, 50));
  
  const db = await openDB();
  const widgetsTx = db.transaction(WIDGETS_STORE, 'readwrite');
  widgetsTx.objectStore(WIDGETS_STORE).clear();
  await new Promise((resolve, reject) => {
    widgetsTx.oncomplete = resolve;
    widgetsTx.onerror = reject;
  });
  
  const layoutTx = db.transaction(GRID_LAYOUT_STORE, 'readwrite');
  layoutTx.objectStore(GRID_LAYOUT_STORE).clear();
  await new Promise((resolve, reject) => {
    layoutTx.oncomplete = resolve;
    layoutTx.onerror = reject;
  });
  
  for (const item of payload.widgets) {
    const id = generateWidgetId();
    const settings = item.settings || {};
    await saveWidgetSettings(id, { id, ...settings, type: item.type });
    await grid.addWidget(item.type, id, { ...settings, w: item.w, h: item.h });
  }
}
