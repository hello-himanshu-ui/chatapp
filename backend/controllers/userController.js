const User = require("../models/user");
const Conversation = require("../models/conversation");
const { onlineUsers } = require("../socket/store");

// Get only contacts of logged-in user, enriched with conversation summary
// (last message, last message time, unread count) and live online status.
const getUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).populate(
      "contacts",
      "-password"
    );

    const currentUserId = req.user.id;

    const contactsWithMeta = await Promise.all(
      currentUser.contacts.map(async (contact) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [currentUserId, contact._id], $size: 2 },
        });

        const unreadCount = conversation
          ? conversation.unreadCounts.get(currentUserId.toString()) || 0
          : 0;

        return {
          ...contact.toObject(),
          lastMessage: conversation?.lastMessage || "",
          lastMessageTime: conversation?.lastMessageAt || null,
          unreadCount,
          isOnline: !!onlineUsers[contact._id.toString()],
        };
      })
    );

    // Most recently active conversations first; contacts with no messages
    // yet fall to the bottom
    contactsWithMeta.sort((a, b) => {
      const timeA = a.lastMessageTime
        ? new Date(a.lastMessageTime).getTime()
        : 0;
      const timeB = b.lastMessageTime
        ? new Date(b.lastMessageTime).getTime()
        : 0;
      return timeB - timeA;
    });

    res.status(200).json(contactsWithMeta);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Search users by username
const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        message: "Username is required",
      });
    }

    const users = await User.find({
      username: {
        $regex: username,
        $options: "i",
      },
      _id: {
        $ne: req.user.id,
      },
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Add contact
const addContact = async (req, res) => {
  try {
    const { contactId } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (contactId === req.user.id) {
      return res.status(400).json({
        message: "You cannot add yourself",
      });
    }

    if (user.contacts.includes(contactId)) {
      return res.status(400).json({
        message: "Contact already added",
      });
    }

    user.contacts.push(contactId);
    await user.save();

    res.status(200).json({
      message: "Contact added successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete contact
const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await User.findById(req.user.id);

    user.contacts = user.contacts.filter(
      (id) => id.toString() !== contactId
    );

    await user.save();

    res.status(200).json({
      message: "Contact removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getUsers,
  searchUsers,
  addContact,
  deleteContact,
};