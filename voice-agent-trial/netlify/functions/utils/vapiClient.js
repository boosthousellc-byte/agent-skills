'use strict';

const fetch = require('node-fetch');
const VAPI_API_URL = 'https://api.vapi.ai';

function headers() {
  return {
    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function createAssistant({ companyName, serviceArea, services, tagline, webhookUrl, calendlyUrl, ownerPhone, websiteUrl, displayPhone }) {
  const serviceList = services.length
    ? services.slice(0, 6).join(', ')
    : 'roofing, siding, gutters, storm damage restoration';

  const calendlyLine = calendlyUrl
    ? `When the caller is ready to book, say: "I'll text you a link right now to pick your preferred time." Then end your message with the booking link: ${calendlyUrl}`
    : `When the caller is ready to book, say: "I'll have our team reach out within 2 hours to confirm your inspection time."`;

  const systemPrompt = `You are Aria, the AI phone receptionist for ${companyName}, a roofing and storm damage restoration company serving ${serviceArea}.

Your services include: ${serviceList}.
${tagline ? `Company tagline: "${tagline}"` : ''}

Your job: answer every inbound call, qualify the lead, and schedule a free roof inspection.

QUALIFICATION FLOW (ask one question at a time, in order):
1. Greet warmly: "Thank you for calling ${companyName}, this is Aria — how can I help you today?"
2. Collect: caller's full name, property address, best callback phone number
3. Ask: "What kind of damage are you dealing with — roof, siding, gutters, or something else?"
4. Ask: "Was this damage caused by a storm or weather event?"
5. If storm: "Have you had a chance to contact your homeowner's insurance yet?"
6. Determine job type: insurance claim vs. owner-pay
   - If insurance: "Great — we work directly with all major insurance companies and can help guide you through the claims process."
   - If owner-pay: "No problem at all — we offer competitive pricing and flexible financing options."
7. Schedule the inspection: ${calendlyLine}
8. Confirm: "You're all set! Is there anything else I can help you with today?"

RULES:
- Keep each response to 1-2 sentences maximum
- Ask only one question per turn
- Never discuss pricing or specific costs on the call
- Always be warm, empathetic, and professional
- If you cannot answer something, say: "That's a great question — our team will cover that at your free inspection."`;

  const body = {
    name: `Demo Agent — ${companyName}`,
    firstMessage: `Thank you for calling ${companyName}, this is Aria — how can I help you today?`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.6,
    },
    voice: {
      provider: '11labs',
      voiceId: 'rachel',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en-US',
    },
    serverUrl: webhookUrl,
    endCallPhrases: ['goodbye', 'bye bye', 'have a good day', 'talk to you later'],
    recordingEnabled: true,
    // Store all demo data here — no database needed
    metadata: {
      type: 'demo',
      companyName,
      websiteUrl,
      serviceArea,
      ownerPhone:  ownerPhone  || null,
      calendlyUrl: calendlyUrl || null,
      phoneNumber: displayPhone,
    },
  };

  const res = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi createAssistant failed (${res.status}): ${err}`);
  }
  return res.json();
}

async function getAssistant(assistantId) {
  const res = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Vapi getAssistant failed (${res.status})`);
  return res.json();
}

async function getPhoneNumber(phoneNumberId) {
  const res = await fetch(`${VAPI_API_URL}/phone-number/${phoneNumberId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Vapi getPhoneNumber failed (${res.status})`);
  return res.json();
}

async function assignAssistantToNumber(phoneNumberId, assistantId) {
  const res = await fetch(`${VAPI_API_URL}/phone-number/${phoneNumberId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ assistantId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi assignAssistantToNumber failed (${res.status}): ${err}`);
  }
  return res.json();
}

async function sendSms({ phoneNumberId, to, message }) {
  const res = await fetch(`${VAPI_API_URL}/message`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phoneNumberId, type: 'outboundMessage', to, message }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi sendSms failed (${res.status}): ${err}`);
  }
  return res.json();
}

module.exports = { createAssistant, getAssistant, getPhoneNumber, assignAssistantToNumber, sendSms };
