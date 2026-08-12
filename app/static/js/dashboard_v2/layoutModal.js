import { exportLayout, importLayout } from './layoutManager.js';

export function initLayoutModal() {
  const modal = document.getElementById('layoutModal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.close-layout-btn');
  const downloadBtn = modal.querySelector('#downloadLayoutBtn');
  const fileInput = modal.querySelector('#loadLayoutInput');
  const uploadBtn = modal.querySelector('#uploadLayoutBtn');

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  downloadBtn.addEventListener('click', async () => {
    await exportLayout();
    modal.classList.remove('active');
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a layout file to upload');
      return;
    }
    await importLayout(file);
    fileInput.value = '';
    modal.classList.remove('active');
  });
}

export function openLayoutModal() {
  const modal = document.getElementById('layoutModal');
  if (modal) modal.classList.add('active');
}
