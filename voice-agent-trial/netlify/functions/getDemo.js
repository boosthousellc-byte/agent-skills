'use strict';

const { getAssistant } = require('./utils/vapiClient');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const demoId = event.queryStringParameters?.id;
  if (!demoId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id is required' }) };

  try {
    // demoId IS the Vapi assistantId — all data lives in Vapi metadata
    const assistant = await getAssistant(demoId);
    const meta = assistant.metadata || {};

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demoId,
        companyName: meta.companyName || assistant.name || 'Your Company',
        websiteUrl:  meta.websiteUrl  || '',
        phoneNumber: meta.phoneNumber || '',
        calendlyUrl: meta.calendlyUrl || '',
      }),
    };
  } catch (err) {
    console.error('[getDemo]', err);
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Demo not found' }) };
  }
};
