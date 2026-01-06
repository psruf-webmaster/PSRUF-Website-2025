// Minimal SignalWire SMS helper (REST, no SDK needed)
const axios = require('axios');

const {
  SIGNALWIRE_PROJECT_ID,
  SIGNALWIRE_API_TOKEN,
  SIGNALWIRE_SPACE,
  SIGNALWIRE_FROM_NUMBER,
} = process.env;

if (!SIGNALWIRE_PROJECT_ID || !SIGNALWIRE_API_TOKEN || !SIGNALWIRE_SPACE || !SIGNALWIRE_FROM_NUMBER) {
  console.warn('[sms] Missing SignalWire env vars — SMS disabled until configured.');
}

const apiBase = `https://${SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}`;

async function sendSMS({ to, body }) {
  if (!SIGNALWIRE_PROJECT_ID) throw new Error('SignalWire not configured');

  const url = `${apiBase}/Messages.json`;
  const form = new URLSearchParams({ From: SIGNALWIRE_FROM_NUMBER, To: to, Body: body });

  const { data } = await axios.post(url, form.toString(), {
    auth: { username: SIGNALWIRE_PROJECT_ID, password: SIGNALWIRE_API_TOKEN },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15_000,
  });

  return { sid: data.sid, status: data.status, to: data.to, from: data.from };
}

module.exports = { sendSMS };
