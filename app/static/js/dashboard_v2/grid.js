let grid = null;
let saveLayoutTimer = null;

export async function initGrid(onWidgetAdd, onWidgetRemove) {
  console.log('[grid] initGrid called');
  if (!window.GridStack) {
    console.error('[grid] GridStack not loaded!');
    throw new Error('GridStack not loaded');
  }

  const gridEl = document.getElementById('grid');
  console.log('[grid] grid element:', gridEl);
  if (!gridEl) {
    console.error('[grid] Grid element not found!');
    throw new Error('Grid element not found');
  }

  grid = GridStack.init({
    column: 12,
    cellHeight: 'auto',
    margin: 10,
    dragHandle: '.widget-header',
    resizeHandles: 'e, se, s, sw, w',
    animate: true,
    acceptWidgets: true,
    removable: true,
    removeTimeout: 100,
  }, gridEl);
  console.log('[grid] GridStack initialized:', grid);

  grid.on('change', debouncedSaveLayout);
  grid.on('added', (event, items) => {
    console.log('[grid] "added" event fired, items:', items);
    if (onWidgetAdd) onWidgetAdd(items);
  });
  grid.on('removed', (event, items) => {
    console.log('[grid] "removed" event fired, items:', items);
    if (onWidgetRemove) onWidgetRemove(items);
  });

  await loadPersistedLayout();
  console.log('[grid] Layout loaded, returning grid');
  return grid;
}

export function getGrid() {
  return grid;
}

async function loadPersistedLayout() {
  const { loadGridLayout, loadWidgetSettings } = await import('../db.js');

  const layout = await loadGridLayout();
  if (!layout || !layout.length) return;

  const widgetsData = await loadAllWidgetSettings();
  const widgetsById = new Map(widgetsData.map(w => [w.id, w]));

  for (const item of layout) {
    const widgetData = widgetsById.get(item.id);
    if (widgetData) {
      addWidgetToGrid(item, widgetData);
    }
  }
}

function addWidgetToGrid(layoutItem, widgetData) {
  if (!grid) return;

  const el = document.createElement('div');
  el.className = 'grid-stack-item-content widget-card';
  el.dataset.widgetId = layoutItem.id;
  el.dataset.widgetType = widgetData.type;

  grid.addWidget(el, {
    x: layoutItem.x,
    y: layoutItem.y,
    w: layoutItem.w,
    h: layoutItem.h,
    minW: layoutItem.minW,
    minH: layoutItem.minH,
    id: layoutItem.id,
  });
}

function debouncedSaveLayout() {
  clearTimeout(saveLayoutTimer);
  saveLayoutTimer = setTimeout(saveLayout, 300);
}

async function saveLayout() {
  if (!grid) return;

  const { saveGridLayout } = await import('../db.js');
  const layout = grid.save();
  await saveGridLayout(layout);
}

export function addWidget(widgetEl, options) {
  if (!grid) return null;
  return grid.addWidget(widgetEl, options);
}

export function removeWidget(widgetEl) {
  if (!grid) return;
  grid.removeWidget(widgetEl);
}

export function getWidgetElements() {
  if (!grid) return [];
  return grid.engine.nodes.map(node => node.el);
}

async function loadAllWidgetSettings() {
  const { loadAllWidgetSettings: loadAll } = await import('../db.js');
  return loadAll();
}