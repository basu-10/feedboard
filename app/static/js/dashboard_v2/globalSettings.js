import { loadV2Settings, saveV2Settings } from '../db.js';

export function initGlobalSettingsModal() {
  const modal = document.getElementById('globalSettingsModal');
  const closeBtn = modal.querySelector('.close-settings-btn');
  const saveBtn = modal.querySelector('.save-settings-btn');
  const apiKeyInput = modal.querySelector('#finnhubApiKey');

  closeBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', saveSettings);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  loadSettings();
}

export function openGlobalSettingsModal() {
  const modal = document.getElementById('globalSettingsModal');
  modal.classList.add('active');
}

async function loadSettings() {
  const settings = await loadV2Settings();
  const apiKeyInput = document.getElementById('finnhubApiKey');
  if (settings?.finnhubApiKey) {
    apiKeyInput.value = settings.finnhubApiKey;
  }
}

async function saveSettings() {
  const apiKeyInput = document.getElementById('finnhubApiKey');
  const apiKey = apiKeyInput.value.trim();

  await saveV2Settings({ finnhubApiKey: apiKey });
  closeModal();
}

function closeModal() {
  const modal = document.getElementById('globalSettingsModal');
  modal.classList.remove('active');
}