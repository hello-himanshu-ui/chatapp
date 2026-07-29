const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Map of userId(string) -> unread count for that user in this conversation.
    // Mongoose serializes Map fields to plain objects automatically on toJSON().
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

// Finds the conversation between exactly these two users, creating it if it
// doesn't exist yet. Centralizing this avoids duplicate conversations.
conversationSchema.statics.findOrCreateBetween = async function (userA, userB) {
  let convo = await this.findOne({
    participants: { $all: [userA, userB], $size: 2 },
  });

  if (!convo) {
    convo = await this.create({
      participants: [userA, userB],
      unreadCounts: { [userA.toString()]: 0, [userB.toString()]: 0 },
    });
  }

  return convo;
};

module.exports = mongoose.model("Conversation", conversationSchema);