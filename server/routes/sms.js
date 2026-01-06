const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { sendSMS } = require('../utils/sms');

// Simple, tight rate-limit so you don't accidentally blast
const limiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

// Test endpoint: POST /api/sms/test { "to":"+1XXXXXXXXXX", "body":"hello penguins!" }
router.post('/test', async (req, res) => {
  try {
    const { to, body } = req.body || {};
    if (!to || !body) return res.status(400).json({ error: '`to` and `body` are required' });

    const result = await sendSMS({ to, body });
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[sms/test] error', err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json({ ok: false, error: err?.response?.data || err.message });
  }
});

module.exports = router;
