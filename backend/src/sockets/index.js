/**
 * Socket.io server logic
 * Attached to the Express HTTP server in src/index.js
 */
function initSockets(io) {
  io.on('connection', (socket) => {
    console.log(`🔌  Socket connected: ${socket.id}`);

    // Admin joins a private room after auth (optional, kept simple here)
    socket.on('joinAdmin', () => {
      socket.join('admin');
      console.log(`   ↳ joined admin room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌  Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSockets };
