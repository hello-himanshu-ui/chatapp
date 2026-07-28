import { useEffect, useState } from "react";
import API from "../services/api";
import socket from "../socket";

function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Load users & current user
  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  // Load old messages
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
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

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "300px",
          borderRight: "1px solid gray",
          padding: "20px",
        }}
      >
        <h2>Users</h2>

        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => setSelectedUser(user)}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              marginBottom: "10px",
              cursor: "pointer",
              background:
                selectedUser?._id === user._id ? "#eee" : "white",
            }}
          >
            <h4>{user.name}</h4>
            <p>{user.email}</p>
          </div>
        ))}
      </div>

      {/* Chat */}
      <div
        style={{
          flex: 1,
          padding: "20px",
        }}
      >
        {selectedUser ? (
          <>
            <h2>{selectedUser.name}</h2>

            <div
              style={{
                height: "400px",
                border: "1px solid gray",
                overflowY: "auto",
                padding: "10px",
                marginTop: "20px",
              }}
            >
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div
                    key={msg._id || index}
                    style={{
                      textAlign:
                        msg.sender === currentUser?._id
                          ? "right"
                          : "left",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background:
                          msg.sender === currentUser?._id
                            ? "#4caf50"
                            : "#444",
                        color: "#fff",
                      }}
                    >
                      {msg.text}
                    </span>
                  </div>
                ))
              ) : (
                <p>No messages yet</p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <input
                type="text"
                placeholder="Type message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                }}
              />

              <button onClick={sendMessage}>
                Send
              </button>
            </div>
          </>
        ) : (
          <h2>Select a user to start chatting</h2>
        )}
      </div>
    </div>
  );
}

export default Chat;