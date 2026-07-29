const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  deleteForMe,
  markAsRead,
  editMessage,
} = require("../controllers/messageController");

const protect = require("../middleware/authMiddleware");

router.post("/send", protect, sendMessage);
router.get("/:userId", protect, getMessages);
router.put("/deleteforme/:id", protect, deleteForMe);
router.put("/mark-read/:userId", protect, markAsRead);
router.put("/edit/:messageId", protect, editMessage);

module.exports = router;