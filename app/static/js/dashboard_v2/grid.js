import { getWidgetRegistry, createWidget, generateWidgetId } from './widgetRegistry.js';
import { loadGridLayout, saveGridLayout, loadWidgetSettings } from '../db.js';
import { DEFAULT_LAYOUT } from './builtinLayouts.js';

const COLUMNS = 12;
const ROW_HEIGHT = 80;
const GAP = 10;
const MAX_COLS = 12;
const MAX_ROWS = 50;

let container = null;
let onWidgetSettings = null;
let saveTimer = null;
let suppressPersist = false;
const widgets = new Map(); // id -> { widget, el, w, h, minW, minH }

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export async function initGrid(settingsCallback) {
  container = document.getElementById('grid');
  if (!container) throw new Error('Grid container #grid not found');
  onWidgetSettings = settingsCallback;
  await loadPersistedLayout();
  return layoutApi;
}

export function getGrid() {
  return layoutApi;
}

export async function addWidget(type, id, settings) {
  const def = getWidgetRegistry()[type];
  if (!def) {
    console.warn('[layout] Unknown widget type:', type);
    return null;
  }

  const minW = def.minSize?.w ?? 2;
  const minH = def.minSize?.h ?? 2;
  const w = clamp(settings.w ?? def.defaultSize.w, minW, MAX_COLS);
  const h = clamp(settings.h ?? def.defaultSize.h, minH, MAX_ROWS);

  // Extract layout properties from settings - don't pass w/h to widget
  const { w: _w, h: _h, ...widgetSettings } = settings;

  const widget = await createWidget(type, id, layoutApi, widgetSettings, onWidgetSettings);
  const el = widget.buildElement();
  el.style.gridColumn = `span ${w}`;
  el.style.gridRow = `span ${h}`;

  container.appendChild(el);
  widget.element = el;
  attachResizeHandles(widget, el, minW, minH);

  widgets.set(id, { widget, el, w, h, minW, minH });
  widget.onRender();
  persistLayout();
  return widget;
}

export function removeWidget(id) {
  const entry = widgets.get(id);
  if (!entry) return;
  entry.widget.destroy();
  widgets.delete(id);
  persistLayout();
}

async function loadPersistedLayout() {
  const layout = await loadGridLayout();
  if (layout && layout.length) {
    suppressPersist = true;
    for (const item of layout) {
      const settings = await loadWidgetSettings(item.id);
      if (settings) {
        await addWidget(settings.type, item.id, { ...settings, w: item.w, h: item.h });
      }
    }
    suppressPersist = false;
    return;
  }

  // New user: apply the default flagship layout
  suppressPersist = true;
  for (const item of DEFAULT_LAYOUT.widgets) {
    const id = generateWidgetId();
    const settings = item.settings || {};
    await saveWidgetSettings(id, { id, ...settings, type: item.type });
    await addWidget(item.type, id, { ...settings, w: item.w, h: item.h });
  }
  suppressPersist = false;
}

function attachResizeHandles(widget, el, minW, minH) {
  const directions = ['e', 's', 'se'];
  for (const dir of directions) {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    handle.dataset.dir = dir;
    el.appendChild(handle);
    handle.addEventListener('mousedown', (e) => startResize(e, widget, el, dir, minW, minH));
  }
}

function startResize(e, widget, el, dir, minW, minH) {
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startY = e.clientY;
  const entry = widgets.get(widget.id);
  const startW = entry.w;
  const startH = entry.h;
  const colUnit = (container.clientWidth - GAP * (COLUMNS - 1)) / COLUMNS + GAP;
  const rowUnit = ROW_HEIGHT + GAP;
  const mainEl = container.closest('.v2-main');
  const scrollTop = mainEl ? mainEl.scrollTop : 0;

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    let w = startW;
    let h = startH;
    if (dir.includes('e')) w = Math.round((startW * colUnit + dx) / colUnit);
    if (dir.includes('s')) h = Math.round((startH * rowUnit + dy) / rowUnit);
    w = clamp(w, minW, MAX_COLS);
    h = clamp(h, minH, MAX_ROWS);
    entry.w = w;
    entry.h = h;
    el.style.gridColumn = `span ${w}`;
    el.style.gridRow = `span ${h}`;
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('resizing');
    if (mainEl) mainEl.scrollTop = scrollTop;
    persistLayout();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.body.classList.add('resizing');
}

function persistLayout() {
  if (suppressPersist) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const order = [...container.children]
      .filter(el => el.dataset.widgetId)
      .map(el => {
        const entry = widgets.get(el.dataset.widgetId);
        return { id: el.dataset.widgetId, w: entry.w, h: entry.h };
      });
    saveGridLayout(order);
  }, 200);
}

const layoutApi = {
  addWidget,
  removeWidget,
  getContainer: () => container,
};