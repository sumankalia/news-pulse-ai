import { io } from "socket.io-client";

// Create socket instance
const socket = io(process.env.BACKEND_URI, {
  autoConnect: false, // Don't connect automatically
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"], // Try WebSocket first, then fallback to polling
});

// Connection status
let isConnected = false;
let currentUserId = null;
let logCallback = null;
let analysisCallback = null;

// Connect to socket server
export const connectSocket = (uniqueUserId) => {
  console.log("Attempting to connect socket with userId:", uniqueUserId);
  if (!isConnected) {
    socket.connect();
    isConnected = true;
  }
  currentUserId = uniqueUserId;
  socket.emit("connect_user", { uniqueUserId });
  console.log("Connected with user ID:", uniqueUserId);

  // If we have a log callback, resubscribe to logs
  if (logCallback) {
    subscribeToUserLogs(logCallback);
  }
};

// Disconnect from socket server
export const disconnectSocket = () => {
  console.log("Disconnecting socket");
  if (isConnected) {
    socket.disconnect();
    isConnected = false;
    currentUserId = null;
    logCallback = null;
    analysisCallback = null;
  }
};

// Subscribe to user-specific logs
export const subscribeToUserLogs = (callback) => {
  if (!currentUserId) {
    console.error("No user ID available for log subscription");
    return;
  }
  console.log("Subscribing to log events");
  // Remove any existing listeners before adding a new one
  socket.off("log");
  // Store the callback for reconnection
  logCallback = callback;
  socket.on("log", (data) => {
    console.log("Received log event:", data);
    callback(data);
  });
  console.log("Subscribed to user logs for ID:", currentUserId);
};

export const subscribeToArticleAnalysis = (userId, callback) => {
  if (!userId) {
    console.error("No user ID available for analysis subscription");
    return;
  }
  console.log("Subscribing to analysis events");
  // Remove any existing listeners before adding a new one
  socket.off("analysis");
  // Store the callback for reconnection
  analysisCallback = callback;
  socket.on("analysis", (data) => {
    console.log("Received analysis event:", data);
    callback(data);
  });
  console.log("Subscribed to user analysis for ID:", userId);
};

// Unsubscribe from user-specific logs
export const unsubscribeFromUserLogs = () => {
  if (!currentUserId) return;
  console.log("Unsubscribing from log events");
  socket.off("log");
  logCallback = null;
  console.log("Unsubscribed from user logs for ID:", currentUserId);
};

export const unsubscribeFromArticleAnalysis = () => {
  if (!currentUserId) return;
  console.log("Unsubscribing from analysis events");
  socket.off("analysis");
  analysisCallback = null;
  console.log("Unsubscribed from user analysis for ID:", currentUserId);
};

// Subscribe to specific message types
export const subscribeToMessages = (messageType, callback) => {
  socket.on(messageType, (data) => {
    callback(data);
  });
};

// Unsubscribe from specific message types
export const unsubscribeFromMessages = (messageType) => {
  socket.off(messageType);
};

// Request specific messages from server
export const requestMessages = (messageType, params = {}) => {
  socket.emit("request_messages", {
    type: messageType,
    params,
    userId: currentUserId,
  });
};

// Send a message to server
export const sendMessage = (messageType, data) => {
  socket.emit(messageType, {
    ...data,
    userId: currentUserId,
  });
};

// Connection event handlers
socket.on("connect", () => {
  console.log("Socket connected successfully");
  isConnected = true;
  if (currentUserId) {
    socket.emit("connect_user", { uniqueUserId: currentUserId });
  }
});

socket.on("disconnect", () => {
  console.log("Socket disconnected");
  isConnected = false;
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
  isConnected = false;
});

// Debug event handler
socket.onAny((eventName, ...args) => {
  console.log("Socket event received:", eventName, args);
});
