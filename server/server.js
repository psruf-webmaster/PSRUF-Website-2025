const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth'); // <-- ✅ Import the auth routes

const app = express();

const { transporter } = require('./utils/email');

transporter
  .verify()
  .then(() => console.log('✅ SMTP connection OK'))
  .catch(err => console.error('❌ SMTP error:', err.message));


// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Base route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ NEW TEST ROUTE
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
