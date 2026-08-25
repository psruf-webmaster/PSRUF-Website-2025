// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const app = express();
// --- SMTP sanity check (optional) ---
const { transporter } = require('./utils/email');
transporter.verify()
  .then(() => console.log('✅ SMTP connection OK'))
  .catch(err => console.error('❌ SMTP error:', err.message));
// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/sms', require('./routes/sms'));
// Configure CORS for your frontend origin(s)
app.use(cors({
  origin: ['http://localhost:3000', 'https://psruf-website-2026.onrender.com'], // add prod domain here later
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
const channelsRouter = require('./routes/channels');
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');
const ledgerRouter = require('./routes/ledger');
const requirementsRouter = require('./routes/requirements');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feeds', feedsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/requirements', requirementsRouter);

// Serve the React build when backend and frontend are deployed together.
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
const clientIndexPath = path.join(clientBuildPath, 'index.html');
const hasClientBuild = fs.existsSync(clientIndexPath);

if (hasClientBuild) {
  app.use(express.static(clientBuildPath));
} else {
  console.warn('⚠️ Client build not found; SPA routes will return 404 until the client is built.');
}
// Basic health checks
app.get('/api/hello', (req, res) => res.json({ message: 'Hello from the backend!' }));

// SPA fallback so direct URL visits/refreshes resolve to index.html.
if (hasClientBuild) {
  app.get('/', (req, res) => {
    res.sendFile(clientIndexPath);
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(clientIndexPath);
  });
} else {
  app.get('/', (req, res) => res.send('API is running...'));
}
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