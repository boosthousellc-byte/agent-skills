'use strict';

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const PHONE_RE = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
const ROOFING_KEYWORDS = [
  'roof', 'roofing', 'shingle', 'siding', 'gutter', 'storm', 'hail',
  'insurance', 'restoration', 'inspection', 'fascia', 'soffit', 'flashing',
];

async function scrapeWebsite(url) {
  let html;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VoiceAgentBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    throw new Error(`Could not fetch website: ${err.message}`);
  }

  const $ = cheerio.load(html);

  // Remove script/style noise
  $('script, style, noscript, svg').remove();

  const companyName = extractCompanyName($, url);
  const phoneNumber = extractPhone($, html);
  const serviceArea = extractServiceArea($);
  const services    = extractServices($);
  const tagline     = extractTagline($);

  return { companyName, phoneNumber, serviceArea, services, tagline, url };
}

function extractCompanyName($, url) {
  // schema.org LocalBusiness
  const schema = $('script[type="application/ld+json"]').toArray().map(el => {
    try { return JSON.parse($(el).html()); } catch { return null; }
  }).filter(Boolean);

  for (const s of schema) {
    const entries = Array.isArray(s) ? s : [s];
    for (const entry of entries) {
      if (entry['@type'] && /LocalBusiness|RoofingContractor|HomeAndConstructionBusiness/.test(entry['@type'])) {
        if (entry.name) return entry.name.trim();
      }
    }
  }

  // OG title / meta
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) return cleanTitle(ogTitle);

  // <title>
  const title = $('title').first().text();
  if (title) return cleanTitle(title);

  // h1
  const h1 = $('h1').first().text().trim();
  if (h1 && h1.length < 80) return h1;

  // Fallback: hostname
  try { return new URL(url).hostname.replace(/^www\./, '').split('.')[0]; } catch { return 'Your Company'; }
}

function cleanTitle(t) {
  return t.replace(/\s*[|\-–—:]\s*.*/u, '').trim().substring(0, 80) || t.trim();
}

function extractPhone($, html) {
  // tel: href first (most reliable)
  let phone = null;
  $('a[href^="tel:"]').each((_, el) => {
    if (!phone) phone = $(el).attr('href').replace('tel:', '').trim();
  });
  if (phone) return formatPhone(phone);

  // Schema.org telephone
  const schema = $('script[type="application/ld+json"]').toArray().map(el => {
    try { return JSON.parse($(el).html()); } catch { return null; }
  }).filter(Boolean);
  for (const s of schema) {
    const entries = Array.isArray(s) ? s : [s];
    for (const e of entries) {
      if (e.telephone) return formatPhone(e.telephone);
    }
  }

  // Regex scan of visible text
  const text = $('body').text();
  const matches = text.match(PHONE_RE);
  if (matches && matches.length) return formatPhone(matches[0]);

  return null;
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return raw;
}

function extractServiceArea($) {
  // schema.org areaServed
  const schema = $('script[type="application/ld+json"]').toArray().map(el => {
    try { return JSON.parse($(el).html()); } catch { return null; }
  }).filter(Boolean);

  for (const s of schema) {
    const entries = Array.isArray(s) ? s : [s];
    for (const e of entries) {
      if (e.areaServed) {
        const area = Array.isArray(e.areaServed) ? e.areaServed[0] : e.areaServed;
        const name = typeof area === 'string' ? area : area.name;
        if (name) return name;
      }
      if (e.address?.addressLocality) {
        const city  = e.address.addressLocality;
        const state = e.address.addressRegion || '';
        return state ? `${city}, ${state}` : city;
      }
    }
  }

  // Look for "serving [city]" or "City, ST" patterns in page text
  const text = $('header, footer, .service-area, [class*="area"], [class*="location"]')
    .first().text();

  const cityState = text.match(/\b([A-Z][a-z]{2,},\s*[A-Z]{2})\b/);
  if (cityState) return cityState[1];

  // Footer city/state
  const footerText = $('footer').text();
  const footerMatch = footerText.match(/\b([A-Z][a-z]{2,},\s*[A-Z]{2})\b/);
  if (footerMatch) return footerMatch[1];

  return 'your local area';
}

function extractServices($) {
  const found = new Set();
  const text = $('body').text().toLowerCase();

  ROOFING_KEYWORDS.forEach(kw => {
    if (text.includes(kw)) found.add(kw);
  });

  // Pull heading text for service names
  $('h2, h3, li').each((_, el) => {
    const t = cheerio.load(el).text().trim();
    if (t.length > 3 && t.length < 60 && ROOFING_KEYWORDS.some(k => t.toLowerCase().includes(k))) {
      found.add(t);
    }
  });

  return [...found].slice(0, 8);
}

function extractTagline($) {
  const og = $('meta[property="og:description"]').attr('content');
  if (og && og.length < 160) return og.trim();

  const meta = $('meta[name="description"]').attr('content');
  if (meta && meta.length < 160) return meta.trim();

  const hero = $('h1 + p, .hero p, .hero-text, .tagline').first().text().trim();
  if (hero && hero.length < 160) return hero;

  return null;
}

module.exports = { scrapeWebsite };
