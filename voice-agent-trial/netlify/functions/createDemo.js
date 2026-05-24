'use strict';

const { scrapeWebsite }        = require('./utils/scraper');
const { createAssistant, getPhoneNumber, assignAssistantToNumber } = require('./utils/vapiClient');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { websiteUrl, ownerPhone, calendlyUrl } = body;
  if (!websiteUrl) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'websiteUrl is required' }) };

  let parsed;
  try { parsed = new URL(websiteUrl); } catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid URL' }) }; }

  const host = parsed.hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Private URLs not allowed' }) };
  }

  try {
    // 1. Scrape
    const scraped = await scrapeWebsite(websiteUrl);

    // 2. Get phone number details for display
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    const phoneData     = await getPhoneNumber(phoneNumberId);
    const displayPhone  = formatDisplayPhone(phoneData.number || '');

    // 3. Webhook URL for this Netlify deployment
    const host      = event.headers['host'] || event.headers['Host'] || '';
    const protocol  = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/vapiWebhook`;

    // 4. Create Vapi assistant — all demo data lives in Vapi metadata, no DB needed
    const assistant = await createAssistant({
      companyName:  scraped.companyName,
      serviceArea:  scraped.serviceArea,
      services:     scraped.services,
      tagline:      scraped.tagline,
      webhookUrl,
      calendlyUrl:  calendlyUrl || process.env.CALENDLY_DEFAULT_URL || null,
      ownerPhone:   ownerPhone  || process.env.VAPI_DEMO_OWNER_PHONE || null,
      websiteUrl,
      displayPhone,
    });

    // 5. Assign assistant to the shared demo number
    await assignAssistantToNumber(phoneNumberId, assistant.id);

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demoId:      assistant.id,
        phoneNumber: displayPhone,
        companyName: scraped.companyName,
      }),
    };

  } catch (err) {
    console.error('[createDemo]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

function formatDisplayPhone(raw) {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 11) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10) return `+1 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return raw;
}
