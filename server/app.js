// app.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client;
let transport;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

// Initialize transport
function initTransport() {
  return new StdioClientTransport({
    command: "node",
    args: ["server.js"], // Your agent entry point
  });
}

// Initialize client
function initClient() {
  return new Client({
    name: "my-client",
    version: "1.0.0",
  });
}

// Connect to MCP server
async function connect() {
  try {
    if (!client) {
      client = initClient();
    }
    if (!transport) {
      transport = initTransport();
    }

    if (!isConnected) {
      await client.connect(transport);
      isConnected = true;
      reconnectAttempts = 0;
      console.log("Successfully connected to MCP server");
    }
  } catch (error) {
    console.error("Failed to connect to MCP server:", error);
    isConnected = false;
    throw error;
  }
}

// Handle reconnection
async function handleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("Max reconnection attempts reached");
    return false;
  }

  reconnectAttempts++;
  console.log(
    `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
  );

  try {
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
    await connect();
    return true;
  } catch (error) {
    console.error("Reconnection failed:", error);
    return false;
  }
}

// Reusable wrapper
async function runToolCall(toolName, args) {
  try {
    // Ensure we're connected
    if (!isConnected) {
      await connect();
    }

    // Call the tool
    const res = await client.callTool({
      name: toolName,
      arguments: args,
    });
    return res;
  } catch (err) {
    console.error("Tool call failed:", err);

    // Handle connection errors
    if (
      err.message.includes("not connected") ||
      err.message.includes("connection closed")
    ) {
      isConnected = false;
      const reconnected = await handleReconnect();
      if (reconnected) {
        // Retry the tool call after successful reconnection
        return runToolCall(toolName, args);
      }
    }

    return null;
  }
}

// Keep connection alive
setInterval(async () => {
  if (!isConnected) {
    await handleReconnect();
  }
}, RECONNECT_DELAY);

export { runToolCall };
