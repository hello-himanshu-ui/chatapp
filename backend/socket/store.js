// Shared in-memory state used by both the Socket.IO server and REST controllers.
// Kept in its own module (rather than inside server.js) so controllers can
// import it without creating a circular require with server.js.

const onlineUsers = {}; // userId -> socketId
const activeChats = {}; // userId -> the userId of the chat they currently have open (or null)

module.exports = { onlineUsers, activeChats };