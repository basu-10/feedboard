// Minimal IndexedDB wrapper for persisting user settings
const DB_NAME = 'feedboard';
const DB_VERSION = 2;
const STORE_NAME = 'settings';
const SETTINGS_KEY = 'app';
const WIDGETS_STORE = 'widgets';
const GRID_LAYOUT_STORE = 'gridLayout';
const V2_SETTINGS_STORE = 'v2Settings';
const GRID_LAYOUT_KEY = 'layout';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(WIDGETS_STORE)) {
        db.createObjectStore(WIDGETS_STORE);
      }
      if (!db.objectStoreNames.contains(GRID_LAYOUT_STORE)) {
        db.createObjectStore(GRID_LAYOUT_STORE);
      }
      if (!db.objectStoreNames.contains(V2_SETTINGS_STORE)) {
        db.createObjectStore(V2_SETTINGS_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return _dbPromise;
}

async function idbGet(key, storeName = STORE_NAME) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value, storeName = STORE_NAME) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key, storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// V1 Settings
export async function loadSettings() {
  return idbGet(SETTINGS_KEY);
}

export async function saveSettings(settings) {
  await idbSet(SETTINGS_KEY, settings);
}

// V2 Widget Settings
export async function loadWidgetSettings(id) {
  return idbGet(id, WIDGETS_STORE);
}

export async function saveWidgetSettings(id, settings) {
  await idbSet(id, settings, WIDGETS_STORE);
}

export async function loadAllWidgetSettings() {
  return idbGetAll(WIDGETS_STORE);
}

export async function deleteWidgetSettings(id) {
  await idbDelete(id, WIDGETS_STORE);
}

// V2 Grid Layout
export async function loadGridLayout() {
  return idbGet(GRID_LAYOUT_KEY, GRID_LAYOUT_STORE);
}

export async function saveGridLayout(layout) {
  await idbSet(GRID_LAYOUT_KEY, layout, GRID_LAYOUT_STORE);
}

// V2 Global Settings
export async function loadV2Settings() {
  return idbGet('global', V2_SETTINGS_STORE);
}

export async function saveV2Settings(settings) {
  await idbSet('global', settings, V2_SETTINGS_STORE);
}
