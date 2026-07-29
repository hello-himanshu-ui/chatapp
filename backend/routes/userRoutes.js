const express = require("express");
const router = express.Router();

const {
  getUsers,
  searchUsers,addContact,deleteContact,
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");

// Get all users
router.get("/", protect, getUsers);

// Search users by username
router.get("/search", protect, searchUsers);

// add contact
router.post("/add-contact", protect, addContact);

//delete contact
router.delete("/delete-contact/:contactId", protect, deleteContact);

router.get("/test", (req, res) => {
  res.send("User Route Working");
});

module.exports = router;