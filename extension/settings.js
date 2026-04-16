// Load existing settings
chrome.storage.sync.get({ apiUrl: 'http://localhost:3001', token: '' }, (items) => {
  document.getElementById('api-url').value = items.apiUrl;
  document.getElementById('token').value = items.token;
});

// Save
document.getElementById('save-btn').addEventListener('click', () => {
  const apiUrl = document.getElementById('api-url').value.trim().replace(/\/$/, '') || 'http://localhost:3001';
  const token = document.getElementById('token').value.trim();

  chrome.storage.sync.set({ apiUrl, token }, () => {
    const status = document.getElementById('status');
    status.textContent = '✓ Settings saved!';
    setTimeout(() => { status.textContent = ''; }, 2500);
  });
});
