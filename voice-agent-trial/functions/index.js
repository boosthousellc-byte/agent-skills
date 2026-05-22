'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const fetch     = require('node-fetch');
const { scrapeWebsite }     = require('./scraper');
const vapi                  = require('./vapiClient');
const { handleVapiWebhook } = require('./webhookHandler');

admin.initializeApp();
const db = admin.firestore();

// Bridge firebase functions:config:set values into process.env so the rest of
// the code can use process.env regardless of how config was supplied.
const cfg = functions.config();
if (cfg.vapi) {
  process.env.VAPI_API_KEY         = process.env.VAPI_API_KEY         || cfg.vapi.api_key;
  process.env.VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || cfg.vapi.phone_number_id;
  process.env.VAPI_DEMO_OWNER_PHONE = process.env.VAPI_DEMO_OWNER_PHONE || cfg.vapi.demo_owner_phone;
  process.env.VAPI_WEBHOOK_SECRET  = process.env.VAPI_WEBHOOK_SECRET  || cfg.vapi.webhook_secret;
}
if (cfg.calendly) {
  process.env.CALENDLY_DEFAULT_URL = process.env.CALENDLY_DEFAULT_URL || cfg.calendly.default_url;
}

// ── CORS helper ───────────────────────────────────────────────────────────────

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

// ── POST /api/createDemo ──────────────────────────────────────────────────────
// 1) Scrape website
// 2) Create Vapi assistant
// 3) Assign to shared demo phone number
// 4) Store in Firestore
// 5) Return { demoId, phoneNumber, companyName }

exports.createDemo = functions
  .runWith({ timeoutSeconds: 60, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { websiteUrl, ownerPhone, calendlyUrl } = req.body || {};

    if (!websiteUrl) return res.status(400).json({ error: 'websiteUrl is required' });

    // Validate URL
    let parsedUrl;
    try { parsedUrl = new URL(websiteUrl); } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Block private/internal URLs
    const host = parsedUrl.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
      return res.status(400).json({ error: 'Private URLs are not allowed' });
    }

    try {
      // Step 1: Scrape
      console.log(`[createDemo] Scraping: ${websiteUrl}`);
      const scraped = await scrapeWebsite(websiteUrl);

      // Step 2: Build webhook URL for this deployment
      const webhookUrl = `https://${req.hostname}/api/vapiWebhook`;

      // Step 3: Create Vapi assistant
      console.log(`[createDemo] Creating Vapi assistant for: ${scraped.companyName}`);
      const assistant = await vapi.createAssistant({
        companyName: scraped.companyName,
        serviceArea: scraped.serviceArea,
        services:    scraped.services,
        tagline:     scraped.tagline,
        webhookUrl,
        calendlyUrl: calendlyUrl || process.env.CALENDLY_DEFAULT_URL || null,
      });

      // Step 4: Assign assistant to shared demo phone number
      const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
      if (!phoneNumberId) throw new Error('VAPI_PHONE_NUMBER_ID not configured');

      const phoneData = await vapi.getPhoneNumber(phoneNumberId);
      await vapi.assignAssistantToNumber(phoneNumberId, assistant.id);

      // Format phone number for display
      const rawPhone = phoneData.number || '';
      const displayPhone = formatDisplayPhone(rawPhone);

      // Step 5: Store demo in Firestore
      const demoRef = await db.collection('demos').add({
        companyName:    scraped.companyName,
        websiteUrl:     websiteUrl,
        vapiAssistantId: assistant.id,
        phoneNumber:    displayPhone,
        rawPhone:       rawPhone,
        ownerPhone:     ownerPhone || process.env.VAPI_DEMO_OWNER_PHONE || null,
        calendlyUrl:    calendlyUrl || process.env.CALENDLY_DEFAULT_URL || null,
        scrapedData:    scraped,
        createdAt:      admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[createDemo] Done. demoId=${demoRef.id}`);

      return res.status(200).json({
        demoId:      demoRef.id,
        phoneNumber: displayPhone,
        companyName: scraped.companyName,
      });

    } catch (err) {
      console.error('[createDemo] Error:', err);
      return res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

// ── GET /api/getDemo?id={demoId} ──────────────────────────────────────────────

exports.getDemo = functions.https.onRequest(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const demoId = req.query.id;
  if (!demoId) return res.status(400).json({ error: 'id is required' });

  try {
    const doc = await db.collection('demos').doc(demoId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Demo not found' });

    const data = doc.data();
    return res.status(200).json({
      demoId:      doc.id,
      companyName: data.companyName,
      websiteUrl:  data.websiteUrl,
      phoneNumber: data.phoneNumber,
      calendlyUrl: data.calendlyUrl,
    });
  } catch (err) {
    console.error('[getDemo] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vapiWebhook ─────────────────────────────────────────────────────

exports.vapiWebhook = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest(handleVapiWebhook);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayPhone(raw) {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 11) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10) return `+1 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return raw;
}
