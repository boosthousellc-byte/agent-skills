'use strict';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1'
  : '/api';

let demoData = null;

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const params = new URLSearchParams(window.location.search);
  const demoId = params.get('id');

  if (!demoId) {
    window.location.href = '/';
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/getDemo?id=${encodeURIComponent(demoId)}`);
    if (!resp.ok) throw new Error('Demo not found');
    demoData = await resp.json();
  } catch {
    // Demo data unavailable — show generic state but keep page functional
    demoData = {
      companyName: 'Your Company',
      websiteUrl: '',
      phoneNumber: '+1 (800) 000-0000',
      demoId,
    };
  }

  applyDemoData();
  loadSite();
  scheduleWidgetOpen();
}

function applyDemoData() {
  const phone = demoData.phoneNumber || '+1 (800) 000-0000';
  const company = demoData.companyName || 'Your Company';

  document.getElementById('cta-phone').textContent = phone;
  document.getElementById('cta-trained').textContent = `Trained on ${company}`;
  document.getElementById('demo-company-name').textContent = company;
  document.getElementById('widget-company').textContent = company;

  const telHref = `tel:${phone.replace(/[^+\d]/g, '')}`;
  document.getElementById('btn-call-link').href = telHref;
  document.getElementById('footer-call-link').href = telHref;
  document.getElementById('footer-call-link').textContent = phone;

  document.title = `${company} — AI Phone Agent Demo`;
}

// ── Site iframe / fallback ───────────────────────────────────────────────────

function loadSite() {
  const url = demoData.websiteUrl;
  if (!url) { showFallback(); return; }

  const iframe = document.getElementById('site-iframe');
  iframe.src = url;

  // Detect X-Frame-Options / CSP block — fires if iframe fails to load
  let loaded = false;
  iframe.onload = () => { loaded = true; };

  setTimeout(() => {
    if (!loaded) showFallback();
    else {
      try {
        // Cross-origin access will throw if blocked
        void iframe.contentWindow.location.href;
      } catch {
        // iframe loaded but is cross-origin — that's fine, leave it
      }
    }
  }, 4000);

  iframe.onerror = showFallback;
}

function showFallback() {
  document.getElementById('site-iframe').style.display = 'none';
  const fb = document.getElementById('site-fallback');
  fb.classList.add('active');

  document.getElementById('fallback-company').textContent = demoData.companyName || 'Your Company';
  document.getElementById('fallback-url').textContent = demoData.websiteUrl || '';

  // Try screenshot service (screenshotone.com free tier or similar)
  if (demoData.websiteUrl) {
    const screenshotUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(demoData.websiteUrl)}&width=1280&height=720&output=image&file_type=png&wait_for_event=load`;
    document.getElementById('fallback-screenshot').src = screenshotUrl;
  } else {
    document.getElementById('fallback-screenshot').style.display = 'none';
  }
}

// ── Chatbot overlay ──────────────────────────────────────────────────────────

const SCRIPT = [
  { role: 'agent', text: (c) => `Hi there! 👋 I'm Aria, the AI receptionist for ${c}. How can I help you today?`, delay: 0 },
  { role: 'user',  text: () => 'Hey, I think I have some storm damage on my roof.', delay: 2200 },
  { role: 'agent', text: () => `I'm so sorry to hear that! Let's get you taken care of. Can I get your name and the address of the property?`, delay: 1800 },
  { role: 'user',  text: () => 'Sure — it's Mike Johnson, 4821 Elm Street.', delay: 2500 },
  { role: 'agent', text: () => 'Thanks Mike! What kind of damage did you notice — roof, siding, gutters?', delay: 1600 },
  { role: 'user',  text: () => 'Mostly the roof. Lost some shingles and there might be a leak.', delay: 2400 },
  { role: 'agent', text: () => `Got it. Was this from a recent storm or weather event?`, delay: 1500 },
  { role: 'user',  text: () => 'Yes, we had a bad hailstorm last Tuesday.', delay: 2200 },
  { role: 'agent', text: () => 'Good news — that may be covered by your homeowner\'s insurance! Have you contacted your insurance company yet?', delay: 1800 },
  { role: 'user',  text: () => 'Not yet. Should I?', delay: 2000 },
  { role: 'agent', text: () => `We can walk you through that at your inspection. Let me book a free roof inspection for you — I'll text you a link to pick your preferred time. 📅`, delay: 2000 },
  { role: 'agent', text: () => `Is 555-867-5309 a good number to text?`, delay: 1200 },
];

let chatOpen = false;
let scriptPlayed = false;

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-container').classList.toggle('open', chatOpen);
  document.getElementById('chat-toggle').classList.toggle('open', chatOpen);

  if (chatOpen && !scriptPlayed) {
    scriptPlayed = true;
    playScript();
  }
}

function scheduleWidgetOpen() {
  // Auto-open after 3s so the prospect sees it
  setTimeout(toggleChat, 3000);
}

async function playScript() {
  const company = demoData?.companyName || 'Your Company';
  const container = document.getElementById('chat-messages');

  for (const step of SCRIPT) {
    await delay(step.delay);
    if (step.role === 'agent') {
      await showTyping(container);
    }
    appendMessage(container, step.role, typeof step.text === 'function' ? step.text(company) : step.text);
  }

  // After script, enable the input for freeform messages
  document.getElementById('chat-input').disabled = false;
  document.getElementById('chat-input').placeholder = 'Ask a question…';
}

function appendMessage(container, role, text) {
  // Remove typing indicator if present
  const indicator = container.querySelector('.typing-indicator');
  if (indicator) indicator.remove();

  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function showTyping(container) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    setTimeout(resolve, 1200);
  });
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  const container = document.getElementById('chat-messages');
  appendMessage(container, 'user', text);

  // Static reply nudging toward the phone call
  setTimeout(async () => {
    await showTyping(container);
    const phone = demoData?.phoneNumber || 'the number above';
    appendMessage(container, 'agent',
      `Great question! For the full experience, give us a call at ${phone} — the real agent can answer that and book your free inspection on the spot. 📞`
    );
  }, 800);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Start
document.addEventListener('DOMContentLoaded', init);
