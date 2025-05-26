import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { initializeWebSocket } from "./services/others/websocket.js";
import "./app.js";

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Basic security headers
app.use(helmet());

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(limiter);

app.use(express.json());

// Configure CORS to only allow requests from CLIENT_URL
const allowedOrigin = process.env.CLIENT_URL?.replace(/\/$/, ""); // Remove trailing slash if present
console.log("Allowed CORS origin:", allowedOrigin);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const originWithoutSlash = origin.replace(/\/$/, "");
      if (originWithoutSlash === allowedOrigin) {
        callback(null, true);
      } else {
        console.log("Blocked request from origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

//Routes
import articleRoutes from "./routes/articleRoutes.js";

app.use("/api/articles", articleRoutes);

// Start the Express server first, then run the MCP client
const startServer = async () => {
  try {
    server.listen(4002, () => {
      console.log("🚀 Server running on port 4002...");
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

startServer();
