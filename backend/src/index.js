require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const qrcode     = require('qrcode');

const db               = require('./config/db');
const authRoutes       = require('./routes/auth');
const menuRoutes       = require('./routes/menu');
const { router: ordersRouter, setIo } = require('./routes/orders');
const analyticsRoutes  = require('./routes/analytics');

const app = express();

// ─── Socket.io (local dev only — Vercel is serverless, no persistent server) ──
const isServerless = process.env.VERCEL || process.env.NOW_REGION;
if (!isServerless) {
  const http           = require('http');
  const { Server }     = require('socket.io');
  const { initSockets } = require('./sockets');

  const server = http.createServer(app);
  const io     = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] },
  });

  initSockets(io);
  setIo(io); // give orders route access to emit events

  // ─── Start (local only) ─────────────────────────────────────────────────────
  const PORT = process.env.PORT || 4000;
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
      console.log(`\n🚀  Server running at http://localhost:${PORT}`);
      console.log(`📱  QR Code:        http://localhost:${PORT}/api/qr`);
      console.log(`🔑  Admin login:    http://localhost:${PORT}/admin/login.html\n`);
    });
  }

  module.exports.server = server;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images (fallback for local files)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/menu',      menuRoutes);
app.use('/api/orders',    ordersRouter);
app.use('/api/analytics', analyticsRoutes);

// ─── QR Code generation endpoint ─────────────────────────────────────────────
app.get('/api/qr', async (req, res) => {
  try {
    const host = req.protocol + '://' + req.get('host');
    const url  = `${host}/`;
    // Use SVG – no native canvas bindings required (Vercel compatible)
    const svg = await qrcode.toString(url, { type: 'svg', width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed.' });
  }
});

// ─── Catch-all: SPA fallback ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error Caught:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image file is too large. Maximum size is 10MB.' });
  }
  res.status(500).json({ error: err.message || 'Internal Server Error.' });
});

module.exports = app;

