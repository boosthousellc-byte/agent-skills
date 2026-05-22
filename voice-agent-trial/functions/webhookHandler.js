'use strict';

const admin = require('firebase-admin');
const vapi  = require('./vapiClient');

// ── Vapi webhook entry point ──────────────────────────────────────────────────

async function handleVapiWebhook(req, res) {
  const event = req.body;

  if (!event || !event.message) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { type } = event.message;

  // Only process end-of-call summaries
  if (type !== 'end-of-call-report') {
    return res.status(200).json({ received: true });
  }

  try {
    await processCallReport(event.message);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[webhook] processCallReport error:', err);
    // Return 200 so Vapi doesn't retry endlessly
    res.status(200).json({ ok: false, error: err.message });
  }
}

// ── Process call end report ───────────────────────────────────────────────────

async function processCallReport(report) {
  const callId     = report.call?.id;
  const assistantId = report.call?.assistantId;
  const transcript  = report.transcript || '';
  const summary     = report.summary || '';
  const durationSec = report.durationSeconds || 0;

  console.log(`[webhook] Call ended: ${callId}, duration: ${durationSec}s`);

  // Look up demo by assistantId
  const db = admin.firestore();
  const snap = await db.collection('demos')
    .where('vapiAssistantId', '==', assistantId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn(`[webhook] No demo found for assistantId ${assistantId}`);
    return;
  }

  const demoDoc  = snap.docs[0];
  const demoData = demoDoc.data();

  const lead = extractLeadFromTranscript(transcript, summary);

  // Store lead in Firestore
  await db.collection('leads').add({
    demoId:       demoDoc.id,
    companyName:  demoData.companyName,
    callId,
    assistantId,
    durationSec,
    transcript,
    summary,
    lead,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  // SMS to business owner
  if (demoData.ownerPhone) {
    const ownerMsg = buildOwnerSms(lead, demoData);
    await vapi.sendSms({
      phoneNumberId,
      to: demoData.ownerPhone,
      message: ownerMsg,
    }).catch(e => console.error('[webhook] Owner SMS failed:', e.message));
  }

  // SMS to caller (if we captured their number)
  if (lead.callerPhone) {
    const callerMsg = buildCallerSms(lead, demoData);
    await vapi.sendSms({
      phoneNumberId,
      to: lead.callerPhone,
      message: callerMsg,
    }).catch(e => console.error('[webhook] Caller SMS failed:', e.message));
  }
}

// ── Lead extraction ───────────────────────────────────────────────────────────

function extractLeadFromTranscript(transcript, summary) {
  const lead = {
    callerName:   null,
    callerPhone:  null,
    address:      null,
    damageType:   null,
    isStorm:      null,
    isInsurance:  null,
    bookedTime:   null,
    rawSummary:   summary,
  };

  // Caller phone from call metadata comes via separate call object;
  // here we do a best-effort parse from the transcript text.
  const phoneMatch = transcript.match(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) lead.callerPhone = phoneMatch[0].replace(/[^+\d]/g, '');

  // Name: "my name is X" / "I'm X" / "this is X"
  const nameMatch = transcript.match(/(?:my name is|I'm|I am|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  if (nameMatch) lead.callerName = nameMatch[1];

  // Address: look for numeric street
  const addrMatch = transcript.match(/\d{1,5}\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd)/i);
  if (addrMatch) lead.address = addrMatch[0];

  // Damage type
  const dmgMatch = transcript.match(/\b(roof|siding|gutter|window|chimney|fascia|soffit)\b/i);
  if (dmgMatch) lead.damageType = dmgMatch[1].toLowerCase();

  // Storm / insurance flags
  lead.isStorm     = /storm|hail|wind|weather|hurricane|tornado/i.test(transcript);
  lead.isInsurance = /insurance|claim|adjuster/i.test(transcript);

  // Booked time
  const timeMatch = transcript.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s,]+(?:\w+\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i)
    || transcript.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
  if (timeMatch) lead.bookedTime = timeMatch[0];

  return lead;
}

// ── SMS templates ─────────────────────────────────────────────────────────────

function buildOwnerSms(lead, demo) {
  const name    = lead.callerName  || 'Unknown caller';
  const addr    = lead.address     || 'address not captured';
  const damage  = lead.damageType  || 'unspecified damage';
  const jobType = lead.isInsurance ? 'INSURANCE CLAIM' : lead.isStorm ? 'Storm / possible insurance' : 'Owner-pay';
  const time    = lead.bookedTime  || 'Time not confirmed — follow up needed';
  const phone   = lead.callerPhone ? `📞 ${formatPhone(lead.callerPhone)}` : 'Phone not captured';

  return `🏠 NEW LEAD via AI Agent — ${demo.companyName}

👤 ${name}
📍 ${addr}
${phone}
🔨 Damage: ${damage}
💼 Job type: ${jobType}
📅 Inspection: ${time}

Reply STOP to opt out.`;
}

function buildCallerSms(lead, demo) {
  const name    = lead.callerName || 'there';
  const time    = lead.bookedTime || 'soon — our team will confirm your time shortly';
  const company = demo.companyName;
  const phone   = demo.scrapedData?.phone ? formatPhone(demo.scrapedData.phone) : 'us';

  let msg = `Hi ${name}! Your free roof inspection with ${company} is confirmed${lead.bookedTime ? ` for ${time}` : ''}. `;

  if (demo.calendlyUrl) {
    msg += `Pick your exact time here: ${demo.calendlyUrl} `;
  }

  msg += `Questions? Call ${phone}. Reply STOP to opt out.`;
  return msg;
}

function formatPhone(raw) {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11) return `+${d[0]} (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return raw;
}

module.exports = { handleVapiWebhook };
