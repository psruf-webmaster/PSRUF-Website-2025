// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
// --- SMTP sanity check (optional) ---
const { transporter } = require('./utils/email');
transporter.verify()
  .then(() => console.log('✅ SMTP connection OK'))
  .catch(err => console.error('❌ SMTP error:', err.message));
// --- Middleware ---
app.use(express.json());
app.use('/api/sms', require('./routes/sms'));
// Configure CORS for your frontend origin(s)
app.use(cors({
  origin: ['http://localhost:3000', 'https://psruf-website-2026.onrender.com/'], // add prod domain here later
  credentials: true,
}));
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is not ready yet. Please try again in a moment.' });
  }
  next();
});
// --- Routes ---
const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const feedsRouter = require('./routes/feeds');
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');
const ledgerRouter = require('./routes/ledger');
const requirementsRouter = require('./routes/requirements');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feeds', feedsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/requirements', requirementsRouter);
// Basic health checks
app.get('/', (req, res) => res.send('API is running...'));
app.get('/api/hello', (req, res) => res.json({ message: 'Hello from the backend!' }));
// --- MongoDB + Start server ---
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}
startServer();