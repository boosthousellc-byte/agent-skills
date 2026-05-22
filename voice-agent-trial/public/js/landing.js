'use strict';

// Points to deployed Firebase Cloud Function URL.
// Replaced at deploy time via firebase.json rewrites or env config.
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1'
  : '/api';

const steps = ['step-1', 'step-2', 'step-3', 'step-4'];

function setStep(index) {
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'done');
    if (i < index) el.classList.add('done');
    else if (i === index) el.classList.add('active');
  });
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('active');
  document.getElementById('loader').classList.remove('active');
  document.getElementById('submit-btn').disabled = false;
}

async function startDemo() {
  const urlInput = document.getElementById('website-url');
  const ownerPhone = document.getElementById('owner-phone').value.trim();
  const calendlyUrl = document.getElementById('calendly-url').value.trim();

  const rawUrl = urlInput.value.trim();
  if (!rawUrl) { urlInput.focus(); return; }

  let websiteUrl = rawUrl;
  if (!/^https?:\/\//i.test(websiteUrl)) websiteUrl = 'https://' + websiteUrl;

  try { new URL(websiteUrl); } catch {
    showError('Please enter a valid website URL, e.g. https://yourroof.com');
    return;
  }

  document.getElementById('error-msg').classList.remove('active');
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('loader').classList.add('active');

  setStep(0);
  await delay(800);
  setStep(1);
  await delay(700);
  setStep(2);

  try {
    const resp = await fetch(`${API_BASE}/createDemo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteUrl, ownerPhone, calendlyUrl }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    setStep(3);
    await delay(600);

    const params = new URLSearchParams({ id: data.demoId });
    window.location.href = `demo.html?${params}`;
  } catch (err) {
    showError(`Something went wrong: ${err.message}. Please try again.`);
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Allow Enter key on URL input
document.getElementById('website-url')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') startDemo();
});
