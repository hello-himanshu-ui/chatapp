require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiRoutes = require("./routes/aiRoutes");

const { onlineUsers, activeChats } = require("./socket/store");
const { setIO } = require("./socket/ioInstance");

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);

// Create HTTP Server
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Give REST controllers (messageController, etc.) access to this io instance
setIO(io);

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // User joins
  socket.on("join", (userId) => {
    console.log("JOIN EVENT:", userId);

    onlineUsers[userId] = socket.id;
    socket.userId = userId; // remember for disconnect cleanup

    console.log("Online Users:", onlineUsers);

    // Let everyone else know this user just came online
    socket.broadcast.emit("user_online", userId);
  });

  // Frontend tells us which chat window (if any) this user currently has open.
  // sendMessage() on the backend uses this to decide whether to bump the
  // unread counter, and whether to mark a brand-new message as already "seen".
  socket.on("active_chat", ({ userId, chatWith }) => {
    if (!userId) return;
    activeChats[userId] = chatWith || null;
  });

  // Typing indicator relay
  socket.on("typing", ({ to, from }) => {
    const receiverSocket = onlineUsers[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { from });
    }
  });

  socket.on("stop_typing", ({ to, from }) => {
    const receiverSocket = onlineUsers[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("stop_typing", { from });
    }
  });

  // Private Message
  socket.on("send_message", (data) => {
    console.log("Message:", data);
    console.log("Receiver:", data.receiver);
    console.log("Receiver Socket:", onlineUsers[data.receiver]);
    console.log("Online Users:", onlineUsers);

    const receiverSocket = onlineUsers[data.receiver];

    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", data);
      console.log("✅ Message sent to receiver");
    } else {
      console.log("❌ Receiver not online");
    }

    // Sender ko bhi message bhejo
    socket.emit("receive_message", data);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const userId = socket.userId;

    for (const id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
      }
    }

    if (userId) {
      delete activeChats[userId];
      socket.broadcast.emit("user_offline", userId);
    }

    console.log("🔴 User Disconnected:", socket.id);
    console.log("Online Users:", onlineUsers);
  });
});

// Home Route
app.get("/", (req, res) => {
  res.send("Chat Server Running...");
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});