const express = require("express");
const router = express.Router();

const { rewriteMessage } = require("../controllers/aiController");
const protect = require("../middleware/authMiddleware");

// Rewrite Message
router.post("/rewrite", protect, rewriteMessage);

module.exports = router;