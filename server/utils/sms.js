// SMS helper: supports SignalWire (existing) and Textbelt (added)
const axios = require('axios');

const {
  SIGNALWIRE_PROJECT_ID,
  SIGNALWIRE_API_TOKEN,
  SIGNALWIRE_SPACE,
  SIGNALWIRE_FROM_NUMBER,
  SMS_PROVIDER,
  TEXTBELT_KEY,
} = process.env;

const apiBase = SIGNALWIRE_SPACE
  ? `https://${SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}`
  : null;

async function sendWithSignalWire({ phone, message }) {
  if (!SIGNALWIRE_PROJECT_ID || !SIGNALWIRE_API_TOKEN || !SIGNALWIRE_SPACE || !SIGNALWIRE_FROM_NUMBER) {
    throw new Error('SignalWire not configured');
  }

  const url = `${apiBase}/Messages.json`;
  const form = new URLSearchParams({ From: SIGNALWIRE_FROM_NUMBER, To: phone, Body: message });

  const { data } = await axios.post(url, form.toString(), {
    auth: { username: SIGNALWIRE_PROJECT_ID, password: SIGNALWIRE_API_TOKEN },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15_000,
  });

  return { provider: 'signalwire', sid: data.sid, status: data.status, to: data.to, from: data.from };
}

async function sendWithTextbelt({ phone, message }) {
  if (!TEXTBELT_KEY) throw new Error('Textbelt key missing');
  const url = 'https://textbelt.com/text';
  const payload = { phone, message, key: TEXTBELT_KEY };
  const { data } = await axios.post(url, payload, { timeout: 15_000 });
  if (!data.success) {
    const err = new Error(data.error || 'Textbelt send failed');
    err.response = data;
    throw err;
  }
  return {
    provider: 'textbelt',
    success: data.success,
    textId: data.textId,
    quotaRemaining: data.quotaRemaining,
    to: phone,
  };
}

async function sendSMS({ to, body, phone, message }) {
  const targetPhone = phone || to;
  const targetMsg = message || body;
  if (!targetPhone || !targetMsg) throw new Error('phone and message are required');

  const provider = SMS_PROVIDER || 'textbelt';
  if (provider === 'textbelt') {
    return sendWithTextbelt({ phone: targetPhone, message: targetMsg });
  }
  // default fallback to SignalWire if explicitly set
  return sendWithSignalWire({ phone: targetPhone, message: targetMsg });
}

module.exports = { sendSMS, sendWithTextbelt, sendWithSignalWire };
