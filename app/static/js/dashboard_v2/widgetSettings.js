import { deleteWidgetSettings } from '../db.js';
import { removeWidget } from './grid.js';

let currentWidget = null;
let onGlobalSettingsClick = null;

export function initWidgetSettingsModal(globalSettingsCallback) {
  onGlobalSettingsClick = globalSettingsCallback;

  const modal = document.getElementById('widgetSettingsModal');
  const closeBtn = modal.querySelector('.close-settings-btn');
  const saveBtn = modal.querySelector('.save-settings-btn');
  const deleteBtn = modal.querySelector('.delete-widget-btn');

  closeBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', saveSettings);
  deleteBtn.addEventListener('click', deleteWidget);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

export function openWidgetSettings(widget) {
  currentWidget = widget;
  const modal = document.getElementById('widgetSettingsModal');
  const form = modal.querySelector('.settings-form');
  const title = modal.querySelector('.modal-title');

  title.textContent = `${widget.constructor.widgetName} Settings`;

  const defaults = typeof widget.constructor.getDefaultSettings === 'function'
    ? widget.constructor.getDefaultSettings()
    : {};
  const effectiveSettings = { ...defaults, ...widget.settings };

  const schema = getWidgetSettingsSchema(widget.constructor.widgetType);
  form.innerHTML = renderFormFields(schema, effectiveSettings);

  populateTimezoneOptions(widget.settings?.timezone);

  modal.classList.add('active');
}

function getWidgetSettingsSchema(type) {
  const schemas = {
    clock: {
      timezone: { type: 'select', label: 'Timezone', options: [] },
      format: { type: 'radio', label: 'Format', options: ['12h', '24h'] },
      showSeconds: { type: 'checkbox', label: 'Show seconds' },
      showDate: { type: 'checkbox', label: 'Show date' },
    },
    news: {
      mode: { type: 'radio', label: 'Display Mode', options: ['single', 'all'] },
      category: { type: 'select', label: 'Category', options: ['WORLD', 'TECHNOLOGY', 'SCIENCE', 'SPORTS', 'BUSINESS'] },
      customFeeds: { type: 'array', label: 'Custom Feeds', itemFields: { id: 'text', url: 'url' } },
      rotationSpeed: { type: 'number', label: 'Rotation Speed (seconds)', min: 3, max: 60 },
      autoRotate: { type: 'checkbox', label: 'Auto Rotate' },
    },
    stocks: {
      symbols: { type: 'array', label: 'Stock Symbols', itemType: 'text' },
      displayMode: { type: 'radio', label: 'Display Mode', options: ['table', 'chart'] },
      chartMetric: { type: 'radio', label: 'Chart Value', options: ['price', 'changePct'] },
      refreshInterval: { type: 'number', label: 'Refresh Interval (seconds)', min: 30, max: 300 },
    },
    crypto: {
      coins: { type: 'array', label: 'Coins', itemType: 'text' },
      currency: { type: 'select', label: 'Currency', options: ['usd', 'eur', 'gbp'] },
      displayMode: { type: 'radio', label: 'Display Mode', options: ['table', 'chart'] },
      chartMetric: { type: 'radio', label: 'Chart Value', options: ['price', 'changePct'] },
      refreshInterval: { type: 'number', label: 'Refresh Interval (seconds)', min: 60, max: 300 },
    },
  };
  return schemas[type] || {};
}

function renderFormFields(schema, settings) {
  let html = '';
  for (const [key, field] of Object.entries(schema)) {
    const value = settings[key] !== undefined ? settings[key] : field.default;
    html += renderField(key, field, value);
  }
  return html;
}

function renderField(key, field, value) {
  const id = `setting-${key}`;
  let html = `<div class="form-group">`;

  html += `<label for="${id}">${field.label}</label>`;

  switch (field.type) {
    case 'text':
      html += `<input type="text" id="${id}" name="${key}" value="${escapeHtml(value || '')}">`;
      break;
    case 'number':
      html += `<input type="number" id="${id}" name="${key}" value="${value}"${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}>`;
      break;
    case 'select':
      html += `<select id="${id}" name="${key}">`;
      for (const opt of field.options) {
        html += `<option value="${opt}"${opt === value ? ' selected' : ''}>${opt}</option>`;
      }
      html += `</select>`;
      break;
    case 'radio':
      for (const opt of field.options) {
        const optId = `${id}-${opt}`;
        html += `
          <label class="radio-label">
            <input type="radio" name="${key}" value="${opt}"${opt === value ? ' checked' : ''} id="${optId}">
            <span>${opt}</span>
          </label>
        `;
      }
      break;
    case 'checkbox':
      html += `
        <label class="checkbox-label">
          <input type="checkbox" id="${id}" name="${key}"${value ? ' checked' : ''}>
          <span>${field.label}</span>
        </label>
      `;
      break;
    case 'array':
      html += renderArrayField(key, field, value);
      break;
  }

  html += `</div>`;
  return html;
}

function renderArrayField(key, field, value) {
  const items = Array.isArray(value) ? value : [];
  let html = `<div class="array-field" data-field="${key}">`;

  if (field.itemType === 'text') {
    for (const item of items) {
      html += `
        <div class="array-item">
          <input type="text" name="${key}[]" value="${escapeHtml(item)}" placeholder="${field.placeholder || ''}">
          <button type="button" class="remove-array-item" aria-label="Remove">×</button>
        </div>
      `;
    }
    html += `<button type="button" class="add-array-item btn" data-field="${key}">+ Add ${field.label}</button>`;
  } else if (field.itemFields) {
    for (const item of items) {
      html += `<div class="array-item object-item">`;
      for (const [itemKey, itemType] of Object.entries(field.itemFields)) {
        const itemValue = item[itemKey] || '';
        html += `
          <div class="form-group inline">
            <label>${itemKey}</label>
            <input type="${itemType}" name="${key}[${itemKey}]" value="${escapeHtml(itemValue)}" placeholder="${itemKey}">
          </div>
        `;
      }
      html += `<button type="button" class="remove-array-item" aria-label="Remove">×</button></div>`;
    }
    html += `<button type="button" class="add-array-item btn" data-field="${key}">+ Add ${field.label}</button>`;
  }

  html += `</div>`;
  return html;
}

function populateTimezoneOptions(selectedValue) {
  const select = document.getElementById('setting-timezone');
  if (!select || select.dataset.populated) return;

  const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [Intl.DateTimeFormat().resolvedOptions().timeZone];
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  for (const z of zones.sort()) {
    const opt = document.createElement('option');
    opt.value = z;
    opt.textContent = z.replace(/_/g, ' ') + (z === local ? ' (local)' : '');
    select.appendChild(opt);
  }
  select.dataset.populated = 'true';

  // Set the selected value after populating options
  if (selectedValue) {
    select.value = selectedValue;
  }
}

function closeModal() {
  const modal = document.getElementById('widgetSettingsModal');
  modal.classList.remove('active');
  currentWidget = null;
}

async function saveSettings() {
  if (!currentWidget) return;

  const form = document.querySelector('#widgetSettingsModal .settings-form');
  const formData = new FormData(form);
  const settings = {};

  // Get checkbox fields from schema to handle unchecked checkboxes
  const schema = getWidgetSettingsSchema(currentWidget.constructor.widgetType);
  const checkboxKeys = Object.keys(schema).filter(key => schema[key].type === 'checkbox');

  for (const [key, value] of formData.entries()) {
    if (key.endsWith('[]')) {
      const arrKey = key.slice(0, -2);
      if (!settings[arrKey]) settings[arrKey] = [];
      settings[arrKey].push(value);
    } else if (key.includes('[') && key.includes(']')) {
      const match = key.match(/(.+)\[(.+)\]/);
      if (match) {
        const [, arrKey, itemKey] = match;
        if (!settings[arrKey]) settings[arrKey] = [];
        const idx = settings[arrKey].length - 1;
        if (idx < 0 || !settings[arrKey][idx]) settings[arrKey].push({});
        settings[arrKey][idx][itemKey] = value;
      }
    } else {
      settings[key] = value;
    }
  }

  // Handle checkboxes: checked = "on", unchecked = missing from formData
  for (const key of checkboxKeys) {
    if (!(key in settings)) {
      settings[key] = false;
    } else if (settings[key] === 'on') {
      settings[key] = true;
    }
  }

  for (const key of Object.keys(settings)) {
    if (settings[key] === 'true') settings[key] = true;
    else if (settings[key] === 'false') settings[key] = false;
    else if (!isNaN(settings[key]) && settings[key] !== '') settings[key] = Number(settings[key]);
  }

  await currentWidget.setSettings(settings);
  closeModal();
}

async function deleteWidget() {
  if (!currentWidget) return;

  if (!confirm('Delete this widget? This cannot be undone.')) return;

  const id = currentWidget.id;
  await deleteWidgetSettings(id);
  removeWidget(id);
  currentWidget = null;
  closeModal();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle dynamic array field buttons
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-array-item')) {
    const field = e.target.dataset.field;
    const container = e.target.closest('.array-field');
    const schema = getWidgetSettingsSchema(currentWidget?.constructor.widgetType);
    const fieldSchema = schema[field];

    if (fieldSchema.itemType === 'text') {
      const div = document.createElement('div');
      div.className = 'array-item';
      div.innerHTML = `<input type="text" name="${field}[]" placeholder="${fieldSchema.placeholder || ''}"><button type="button" class="remove-array-item">×</button>`;
      container.insertBefore(div, e.target);
    }
  }

  if (e.target.classList.contains('remove-array-item')) {
    e.target.closest('.array-item').remove();
  }
});