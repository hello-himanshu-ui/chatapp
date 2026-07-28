import { useState } from "react";
import Chat from "./components/chat";

function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  const joinChat = () => {
    if (username.trim() === "") return;
    setJoined(true);
  };

  return (
    <>
      {!joined ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <h1>Chat App</h1>

          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <button onClick={joinChat}>Join Chat</button>
        </div>
      ) : (
        <Chat username={username} />
      )}
    </>
  );
}

export default App;