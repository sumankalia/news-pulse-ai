import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class MCPClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 5;
    this.RECONNECT_DELAY = 5000; // 5 seconds
  }

  initTransport() {
    return new StdioClientTransport({
      command: "node",
      args: ["server.js"],
    });
  }

  initClient() {
    return new Client({
      name: "my-client",
      version: "1.0.0",
    });
  }

  async connect() {
    try {
      if (!this.client) {
        this.client = this.initClient();
      }
      if (!this.transport) {
        this.transport = this.initTransport();
      }

      if (!this.isConnected) {
        await this.client.connect(this.transport);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log("Successfully connected to MCP server");
      }
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
      return false;
    }

    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, this.RECONNECT_DELAY));
      await this.connect();
      return true;
    } catch (error) {
      console.error("Reconnection failed:", error);
      return false;
    }
  }

  async runToolCall(toolName, args) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const res = await this.client.callTool({
        name: toolName,
        arguments: args,
      });
      return res;
    } catch (err) {
      console.error("Tool call failed:", err);

      if (
        err.message.includes("not connected") ||
        err.message.includes("connection closed")
      ) {
        this.isConnected = false;
        const reconnected = await this.handleReconnect();
        if (reconnected) {
          return this.runToolCall(toolName, args);
        }
      }

      return null;
    }
  }

  startKeepAlive() {
    setInterval(async () => {
      if (!this.isConnected) {
        await this.handleReconnect();
      }
    }, this.RECONNECT_DELAY);
  }
}

export const mcpClient = new MCPClient();
