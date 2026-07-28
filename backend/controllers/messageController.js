const Message = require("../models/message");

// Send Message
const sendMessage = async (req, res) => {
  try {
    const { receiver, text } = req.body;

    const message = await Message.create({
      sender: req.user.id,
      receiver,
      text,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get Chat Messages
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: req.user.id, receiver: userId },
            { sender: userId, receiver: req.user.id },
          ],
        },
        {
          deletedFor: {
            $ne: req.user.id,
          },
        },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete For Me
const deleteForMe = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // Check if user has already deleted this message
    const alreadyDeleted = message.deletedFor.some(
      (id) => id.toString() === req.user.id
    );

    if (!alreadyDeleted) {
      message.deletedFor.push(req.user.id);
      await message.save();
    }

    res.status(200).json({
      message: "Message deleted for you",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  deleteForMe,
};