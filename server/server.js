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
// Configure CORS for your frontend origin(s)
app.use(cors({
  origin: ['http://localhost:3000'], // add prod domain here later
  credentials: true,
}));

// --- Routes ---
const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const feedsRouter = require('./routes/feeds');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feeds', feedsRouter);

// Basic health checks
app.get('/', (req, res) => res.send('API is running...'));
app.get('/api/hello', (req, res) => res.json({ message: 'Hello from the backend!' }));

// --- MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
