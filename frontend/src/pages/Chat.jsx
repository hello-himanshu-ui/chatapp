import { useEffect, useState, useRef } from "react";
import API from "../services/api";
import socket from "../socket";
import EmojiPicker from "emoji-picker-react";
import {
  Search,
  Send,
  MessageCircle,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Trash2,
  Sparkles,
} from "lucide-react";

function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Load users & current user
  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  // Load old messages
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      setOpenMenuId(null); // close any leftover delete menu from the previous chat
    }
  }, [selectedUser]);

  // Listen for realtime messages
  useEffect(() => {
    socket.on("receive_message", (message) => {
      if (!selectedUser || !currentUser) return;

      const isCurrentChat =
        (message.sender === currentUser._id &&
          message.receiver === selectedUser._id) ||
        (message.sender === selectedUser._id &&
          message.receiver === currentUser._id);

      if (isCurrentChat) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [selectedUser, currentUser]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close the delete menu if the user clicks anywhere outside it
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Close emoji picker when clicking anywhere outside it
  useEffect(() => {
    const handleClickOutsideEmoji = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideEmoji);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideEmoji);
  }, []);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch logged in user
  const fetchCurrentUser = async () => {
    try {
      const res = await API.get("/auth/me");
      setCurrentUser(res.data);

      socket.emit("join", res.data._id);
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const res = await API.get(`/messages/${selectedUser._id}`);
      setMessages(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!text.trim() || !selectedUser) return;

    try {
      const res = await API.post("/messages/send", {
        receiver: selectedUser._id,
        text,
      });

      socket.emit("send_message", res.data);

      setText("");
    } catch (error) {
      console.log(error);
    }
  };

  // Delete a message only for the logged-in user
  const deleteForMe = async (messageId) => {
    // Guard: no id, or a delete request for this message is already in flight
    if (!messageId || deletingId === messageId) return;

    setDeletingId(messageId);

    try {
      await API.put(`/messages/deleteforme/${messageId}`);

      // Remove instantly from local state, no reload needed
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.log(error);
    } finally {
      setOpenMenuId(null); // always close the popup, success or failure
      setDeletingId(null); // always release the lock
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
      setShowEmojiPicker(false); // close picker after sending via Enter
    }
  };

  // Appends the selected emoji to the current message text
  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  // Rewrite the current input text using AI, then replace it in the input
  const handleAiRewrite = async () => {
    if (!text.trim() || isRewriting) return; // do nothing if input is empty or already rewriting

    setIsRewriting(true);

    try {
      // Uses the existing API instance — same JWT auth behavior as your other protected calls
      const res = await API.post("/ai/rewrite", { text });

      setText(res.data.reply); // replace input text with the rewritten version
    } catch (error) {
      console.log(error);
      alert(
        error.response?.data?.message || "AI Rewrite failed. Please try again."
      );
    } finally {
      setIsRewriting(false); // restore the button regardless of success/failure
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[320px] min-w-[320px] flex flex-col bg-[#0f1420]/95 backdrop-blur-xl border-r border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <MessageCircle size={20} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-wide bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              ChatterBox
            </span>
            <span className="text-[11px] text-slate-500">Messenger</span>
          </div>
        </div>

        {/* Current logged in user */}
        {currentUser && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-sm font-semibold text-white">
                  {getInitials(currentUser.name)}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f1420]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium truncate text-sm">
                {currentUser.name}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {currentUser.email}
              </span>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-white/5">
          <label className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 transition-all duration-200 focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-violet-500/50">
            <Search size={16} className="text-slate-500 shrink-0" />
            <input
              type="text"
              className="grow bg-transparent outline-none text-sm placeholder:text-slate-500"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = selectedUser?._id === user._id;
              return (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ease-out hover:bg-white/[0.06] hover:translate-x-0.5 ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 ring-1 ring-violet-500/30"
                      : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                      <span className="text-sm font-semibold text-white">
                        {getInitials(user.name)}
                      </span>
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f1420]" />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium truncate text-sm">
                        {user.name}
                      </h4>
                      {user.lastMessageTime && (
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatTime(user.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate">
                        {user.lastMessage || user.email}
                      </p>
                      {!!user.unreadCount && (
                        <span className="badge badge-sm bg-violet-500 text-white border-none shrink-0">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-slate-500 mt-6">
              No users found
            </p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col relative">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0f1420]/95 backdrop-blur-xl border-b border-white/5 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-md">
                    <span className="text-sm font-semibold text-white">
                      {getInitials(selectedUser.name)}
                    </span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f1420]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {selectedUser.name}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Online
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200">
                  <Phone size={17} />
                </button>
                <button className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200">
                  <Video size={18} />
                </button>
                <button className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200">
                  <Search size={16} />
                </button>
                <button className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-6 py-5 space-y-3"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20px 20px, rgba(255,255,255,0.035) 1.5px, transparent 0)",
                backgroundSize: "40px 40px",
                backgroundColor: "#0b0f19",
              }}
            >
              {messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isMine = msg.sender === currentUser?._id;
                  const msgId = msg._id || index;

                  return (
                    <div
                      key={msgId}
                      className={`group relative flex items-start gap-1 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Menu button on the left of the bubble for my own messages */}
                      {isMine && (
                        <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === msgId ? null : msgId
                              );
                            }}
                            className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:text-violet-300 hover:bg-white/5"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {openMenuId === msgId && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-full top-0 mr-1 z-20 w-36 rounded-lg bg-[#1a2233] shadow-lg ring-1 ring-white/10 overflow-hidden"
                            >
                              <button
                                onClick={() => deleteForMe(msg._id)}
                                disabled={deletingId === msg._id}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={13} />
                                {deletingId === msg._id
                                  ? "Deleting..."
                                  : "Delete for Me"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl shadow-md transition-transform duration-150 hover:scale-[1.01] ${
                          isMine
                            ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-md"
                            : "bg-[#1a2233] text-slate-100 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">
                          {msg.text}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span
                            className={`text-[10px] ${
                              isMine ? "text-white/70" : "text-slate-500"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            <CheckCheck size={13} className="text-white/70" />
                          )}
                        </div>
                      </div>

                      {/* Menu button on the right of the bubble for received messages */}
                      {!isMine && (
                        <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === msgId ? null : msgId
                              );
                            }}
                            className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:text-violet-300 hover:bg-white/5"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {openMenuId === msgId && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-full top-0 ml-1 z-20 w-36 rounded-lg bg-[#1a2233] shadow-lg ring-1 ring-white/10 overflow-hidden"
                            >
                              <button
                                onClick={() => deleteForMe(msg._id)}
                                disabled={deletingId === msg._id}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={13} />
                                {deletingId === msg._id
                                  ? "Deleting..."
                                  : "Delete for Me"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-slate-500 text-sm">No messages yet</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0f1420]/95 backdrop-blur-xl border-t border-white/5">
              {/* AI Rewrite button */}
              <button
                onClick={handleAiRewrite}
                disabled={isRewriting || !text.trim()}
                title="Rewrite with AI"
                className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRewriting ? (
                  <span className="loading loading-spinner loading-xs text-violet-400" />
                ) : (
                  <Sparkles size={18} />
                )}
              </button>

              {/* Smile button + emoji picker wrapper */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200"
                >
                  <Smile size={20} />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                  </div>
                )}
              </div>

              <button className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors duration-200">
                <Paperclip size={19} />
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-full bg-white/5 px-5 py-2.5 text-sm outline-none placeholder:text-slate-500 transition-all duration-200 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/50"
              />

              <button
                onClick={() => {
                  sendMessage();
                  setShowEmojiPicker(false);
                }}
                className="btn btn-circle bg-gradient-to-br from-violet-600 to-fuchsia-600 border-none text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95 transition-all duration-150"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0b0f19]">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center ring-1 ring-white/5 shadow-inner">
              <MessageCircle
                size={52}
                strokeWidth={1.2}
                className="text-violet-400/70"
              />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-300">
                Select a conversation to start chatting.
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Your messages will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
