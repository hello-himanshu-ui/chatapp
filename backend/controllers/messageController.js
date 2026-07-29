const Message = require("../models/message");
const User = require("../models/user");
const Conversation = require("../models/conversation");
const { onlineUsers, activeChats } = require("../socket/store");
const { emitToUser } = require("../socket/ioInstance");

// Send Message
const sendMessage = async (req, res) => {
  try {
    const { receiver, text } = req.body;
    const senderId = req.user.id;

    // Is the receiver currently online at all?
    const receiverOnline = !!onlineUsers[receiver];

    // Is the receiver currently looking at THIS chat (with sender)?
    const receiverViewingThisChat =
      activeChats[receiver] === senderId.toString();

    // Decide the initial delivery status for this message
    const initialStatus = receiverViewingThisChat
      ? "seen"
      : receiverOnline
      ? "delivered"
      : "sent";

    // Create message
    const message = await Message.create({
      sender: senderId,
      receiver,
      text,
      status: initialStatus,
    });

    // Get sender & receiver
    const senderUser = await User.findById(senderId);
    const receiverUser = await User.findById(receiver);

    // Auto add receiver in sender contacts
    if (
      senderUser &&
      !senderUser.contacts.some(
        (id) => id.toString() === receiver.toString()
      )
    ) {
      senderUser.contacts.push(receiver);
      await senderUser.save();
    }

    // Auto add sender in receiver contacts
    if (
      receiverUser &&
      !receiverUser.contacts.some(
        (id) => id.toString() === senderId.toString()
      )
    ) {
      receiverUser.contacts.push(senderId);
      await receiverUser.save();
    }

    // --- Conversation + unread count logic ---
    const conversation = await Conversation.findOrCreateBetween(
      senderId,
      receiver
    );

    conversation.lastMessage = text;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessageSender = senderId;

    // Only bump the receiver's unread count if they do NOT currently have
    // this exact chat open
    if (!receiverViewingThisChat) {
      const currentUnread =
        conversation.unreadCounts.get(receiver.toString()) || 0;
      conversation.unreadCounts.set(receiver.toString(), currentUnread + 1);
    } else {
      conversation.unreadCounts.set(receiver.toString(), 0);
    }
    // The sender never has unread messages in their own outgoing conversation
    conversation.unreadCounts.set(senderId.toString(), 0);

    await conversation.save();

    // Sender info for socket / response
    const sender = await User.findById(senderId).select("name username");

    const responseMessage = {
      ...message.toObject(),
      senderInfo: sender,
    };

    // Realtime message update
     emitToUser(receiver, "receive_message", responseMessage);
     emitToUser(senderId, "receive_message", responseMessage);

    // Notify the receiver's sidebar instantly (badge + reorder + preview)
    console.log("Receiver:", receiver);
    console.log("Receiver socket:", onlineUsers[receiver]);
    emitToUser(receiver, "conversation_update", {
      contactId: senderId,
      lastMessage: text,
      lastMessageAt: message.createdAt,
      lastMessageSender: senderId,
      unreadCount: conversation.unreadCounts.get(receiver.toString()) || 0,
    });

    // Notify the sender's own sidebar too (covers multiple tabs/devices)
    emitToUser(senderId, "conversation_update", {
      contactId: receiver,
      lastMessage: text,
      lastMessageAt: message.createdAt,
      lastMessageSender: senderId,
      unreadCount: 0,
    });

    // If the receiver already had this chat open, their client should show
    // the blue "seen" tick on this message immediately
    if (receiverViewingThisChat) {
      emitToUser(senderId, "messages_seen", { seenBy: receiver });
    }

    res.status(201).json(responseMessage);
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

// Mark all messages from :userId to the logged-in user as seen, and reset
// the logged-in user's unread count for that conversation. Called by the
// frontend whenever a chat is opened.
const markAsRead = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.id;

    const conversation = await Conversation.findOrCreateBetween(
      currentUserId,
      otherUserId
    );
    conversation.unreadCounts.set(currentUserId.toString(), 0);
    await conversation.save();

    // Flip any unseen incoming messages to "seen"
    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        status: { $ne: "seen" },
      },
      { $set: { status: "seen" } }
    );

    // Tell the other user in realtime that their messages were just seen,
    // so their tick marks turn blue instantly, no refresh needed
    emitToUser(otherUserId, "messages_seen", { seenBy: currentUserId });

    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editMessage = async (req, res) => {
  try {
    const { text } = req.body;

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // Sirf sender hi edit kar sakta hai
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can edit only your own messages",
      });
    }

    message.text = text;
    message.edited = true;

    await message.save();

    // Sender info
    const sender = await User.findById(message.sender).select("name username");

    const updatedMessage = {
      ...message.toObject(),
      senderInfo: sender,
    };

    // Realtime update
    emitToUser(message.sender, "message_edited", updatedMessage);
    emitToUser(message.receiver, "message_edited", updatedMessage);

    res.status(200).json(updatedMessage);
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
  markAsRead,
  editMessage,
};