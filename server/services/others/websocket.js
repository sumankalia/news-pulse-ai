import { Server } from "socket.io";

// Store connected users
const connectedUsers = new Map();

let io;

const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  // WebSocket connection
  io.on("connection", (socket) => {
    console.log("🔌 New client connected");

    // Handle user identification (support both event names for backward compatibility)
    const handleUserIdentification = (userId) => {
      console.log(`👤 User identified: ${userId}`);
      connectedUsers.set(userId, socket);
      socket.join(userId); // Join user-specific room
      socket.emit("identified", { userId });
    };

    socket.on("identify", (data) => {
      handleUserIdentification(data.uniqueUserId);
    });

    socket.on("connect_user", (data) => {
      handleUserIdentification(data.uniqueUserId);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected");
      // Remove user from connected users
      for (const [userId, userSocket] of connectedUsers.entries()) {
        if (userSocket === socket) {
          connectedUsers.delete(userId);
          console.log(`👤 User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};

// Helper function to emit logs to specific user
const emitLogToUser = (userId, logData) => {
  console.log("🔌 Emitting log to user:", userId, logData);
  // Emit to the user's room instead of directly to the socket
  io.to(userId).emit("log", logData);
};

// Helper function to emit logs to specific user
const emitAnalysisToUser = (userId, logData) => {
  console.log("🔌 Emitting log to user:", userId, logData);
  // Emit to the user's room instead of directly to the socket
  io.to(userId).emit("analysis", logData);
};

// Export the emit function for use in other files
export { initializeWebSocket, emitLogToUser, emitAnalysisToUser };
