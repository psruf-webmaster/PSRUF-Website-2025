// server/server.js
const express = require('express');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io'); // Required for Socket.io
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const User = require('./models/User');
const Channel = require('./models/Channel');
const { builtinMembershipMatch, canUserAccessChannel, isBuiltinSlug } = require('./utils/channelAccess');

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://psruf-website-2026.onrender.com'],
    credentials: true,
  }
});
app.set('io', io);

async function getSocketUser(socket) {
  const authUserId = socket.handshake.auth?.userId;
  const headerUserId = socket.handshake.headers['x-user-id'];
  const authHeader = socket.handshake.headers.authorization || '';

  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerId = authHeader.slice(7).trim();
    if (mongoose.Types.ObjectId.isValid(bearerId)) {
      const user = await User.findById(bearerId);
      if (user) return user;
    }
  }

  const candidateId = authUserId || headerUserId;
  if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) return null;
  return User.findById(candidateId);
}

async function canSocketJoinChannel(user, slug) {
  if (!user) return false;

  const channel = await Channel.findOne({ slug });
  if (channel) {
    return canUserAccessChannel(channel, user);
  }

  if (isBuiltinSlug(slug)) {
    return builtinMembershipMatch(slug, user) === true;
  }

  return false;
}

io.use(async (socket, next) => {
  try {
    const user = await getSocketUser(socket);
    if (!user) {
      return next(new Error('Unauthorized socket connection'));
    }

    socket.data.user = user;
    socket.join(`user:${String(user._id)}`);
    return next();
  } catch (error) {
    return next(error);
  }
});

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

// --- MongoDB + Start server with Change Streams ---
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Handle Socket.io client connections
    io.on('connection', (socket) => {
      console.log('A client connected:', socket.id);

      socket.on('joinChannel', async (payload = {}, callback) => {
        try {
          const slug = String(payload?.slug || '').trim();
          if (!slug) {
            const errorPayload = { ok: false, message: 'Channel slug required' };
            socket.emit('joinChannel:error', errorPayload);
            if (typeof callback === 'function') callback(errorPayload);
            return;
          }

          const allowed = await canSocketJoinChannel(socket.data.user, slug);
          if (!allowed) {
            const errorPayload = { ok: false, message: 'Not allowed to join this channel', slug };
            socket.emit('joinChannel:error', errorPayload);
            if (typeof callback === 'function') callback(errorPayload);
            return;
          }

          const previousRoom = socket.data.channelRoom;
          if (previousRoom) {
            socket.leave(previousRoom);
          }

          const room = `feed:${slug}`;
          socket.join(room);
          socket.data.channelRoom = room;
          if (typeof callback === 'function') callback({ ok: true, slug });
        } catch (error) {
          const errorPayload = { ok: false, message: error.message || 'Unable to join channel' };
          socket.emit('joinChannel:error', errorPayload);
          if (typeof callback === 'function') callback(errorPayload);
        }
      });

      socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
      });
    });

    // Watch your specific collections for real-time changes
    // (Note: Ensure your MongoDB deployment is a Replica Set, which Atlas is by default)
    const collectionsToWatch = ['users', 'channels', 'roles']; // match your actual collection names in DB
    
    collectionsToWatch.forEach((colName) => {
      try {
        const collection = mongoose.connection.db.collection(colName);
        const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

        changeStream.on('change', (next) => {
          console.log(`🔄 Change detected in collection [${colName}]:`, next.operationType);
          io.emit('refresh_data', { collection: colName, action: next.operationType });

          if (colName === 'users') {
            const userId = String(next.documentKey?._id || '');
            if (userId) {
              io.to(`user:${userId}`).emit('user:updated', { userId });
            }
            io.emit('channels:updated', { reason: 'user-updated', userId });
            io.emit('channel:members-updated', { all: true, reason: 'user-updated', userId });
          }
        });
      } catch (err) {
        console.error(`⚠️ Could not set up change stream for ${colName}:`, err.message);
      }
    });

    const PORT = process.env.PORT || 5000;
    // Note: We use server.listen instead of app.listen to support Socket.io
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

startServer();