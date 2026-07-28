const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,deleteForMe,
} = require("../controllers/messageController");

const protect = require("../middleware/authMiddleware");

router.post("/send", protect, sendMessage);
router.get("/:userId", protect, getMessages);
router.put("/deleteforme/:id", protect, deleteForMe);

module.exports = router;