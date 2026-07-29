const { onlineUsers } = require("./store");

let io = null;

const setIO = (ioServer) => {
  io = ioServer;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO instance not initialized yet");
  }
  return io;
};

// Emits an event directly to a single user's socket, if they're currently online.
// Safe to call even if the user is offline — it just no-ops.
const emitToUser = (userId, event, payload) => {
  const socketId = onlineUsers[userId?.toString()];
  if (socketId && io) {
    io.to(socketId).emit(event, payload);
  }
};

module.exports = { setIO, getIO, emitToUser };