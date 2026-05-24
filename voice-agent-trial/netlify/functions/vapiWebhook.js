'use strict';

const { getAssistant, sendSms } = require('./utils/vapiClient');

const CORS = { 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const msg = payload.message;
  if (!msg || msg.type !== 'end-of-call-report') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  try {
    const assistantId = msg.call?.assistantId;
    const transcript  = msg.transcript || '';
    const summary     = msg.summary    || '';

    // All demo config lives in Vapi assistant metadata — no DB lookup needed
    const assistant = await getAssistant(assistantId);
    const meta = assistant.metadata || {};

    const lead = extractLead(transcript, summary);
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    // SMS → business owner
    const ownerPhone = meta.ownerPhone || process.env.VAPI_DEMO_OWNER_PHONE;
    if (ownerPhone) {
      await sendSms({
        phoneNumberId,
        to: ownerPhone,
        message: buildOwnerSms(lead, meta),
      }).catch(e => console.error('[webhook] owner SMS failed:', e.message));
    }

    // SMS → caller
    if (lead.callerPhone) {
      await sendSms({
        phoneNumberId,
        to: lead.callerPhone,
        message: buildCallerSms(lead, meta),
      }).catch(e => console.error('[webhook] caller SMS failed:', e.message));
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[vapiWebhook]', err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

function extractLead(transcript, summary) {
  const lead = { callerName: null, callerPhone: null, address: null, damageType: null, isStorm: false, isInsurance: false, bookedTime: null, rawSummary: summary };

  const phoneMatch = transcript.match(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) lead.callerPhone = phoneMatch[0].replace(/[^+\d]/g, '');

  const nameMatch = transcript.match(/(?:my name is|I'm|I am|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  if (nameMatch) lead.callerName = nameMatch[1];

  const addrMatch = transcript.match(/\d{1,5}\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd)/i);
  if (addrMatch) lead.address = addrMatch[0];

  const dmgMatch = transcript.match(/\b(roof|siding|gutter|window|chimney|fascia|soffit)\b/i);
  if (dmgMatch) lead.damageType = dmgMatch[1].toLowerCase();

  lead.isStorm     = /storm|hail|wind|weather|hurricane|tornado/i.test(transcript);
  lead.isInsurance = /insurance|claim|adjuster/i.test(transcript);

  const timeMatch = transcript.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s,]+(?:\w+\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i)
    || transcript.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
  if (timeMatch) lead.bookedTime = timeMatch[0];

  return lead;
}

function buildOwnerSms(lead, meta) {
  const name    = lead.callerName  || 'Unknown caller';
  const addr    = lead.address     || 'address not captured';
  const damage  = lead.damageType  || 'unspecified damage';
  const jobType = lead.isInsurance ? 'INSURANCE CLAIM' : lead.isStorm ? 'Storm / possible insurance' : 'Owner-pay';
  const time    = lead.bookedTime  || 'Follow-up needed';
  const phone   = lead.callerPhone ? `📞 ${lead.callerPhone}` : 'Phone not captured';

  return `🏠 NEW LEAD — ${meta.companyName || 'Demo'}

👤 ${name}
📍 ${addr}
${phone}
🔨 Damage: ${damage}
💼 Job type: ${jobType}
📅 Inspection: ${time}

Reply STOP to opt out.`;
}

function buildCallerSms(lead, meta) {
  const name    = lead.callerName || 'there';
  const company = meta.companyName || 'the team';
  const time    = lead.bookedTime || 'soon — our team will confirm your time shortly';

  let msg = `Hi ${name}! Your free roof inspection with ${company} is confirmed${lead.bookedTime ? ` for ${time}` : ''}. `;
  if (meta.calendlyUrl) msg += `Pick your exact time: ${meta.calendlyUrl} `;
  msg += `Reply STOP to opt out.`;
  return msg;
}
