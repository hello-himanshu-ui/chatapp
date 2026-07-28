require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

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

// Create HTTP Server
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store Online Users
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // User joins
  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log("Online Users:", onlineUsers);
  });

  // Private Message
  socket.on("send_message", (data) => {
    console.log("Message:", data);

    const receiverSocket = onlineUsers[data.receiver];

    // Receiver
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", data);
    }

    // Sender
    socket.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
      }
    }

    console.log("🔴 User Disconnected:", socket.id);
  });
});

// Home Route (optional)
app.get("/", (req, res) => {
  res.send("Chat Server Running...");
});

// Start Server
const PORT = process.env.PORT || 5000;

console.log("Before server.listen");

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});