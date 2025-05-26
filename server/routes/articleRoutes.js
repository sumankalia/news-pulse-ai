import express from "express";
import { analyzeQuery } from "../controllers/articleController.js";

const router = express.Router();

router.get("/ping", (req, res) => {
  res.send("pong");
});

router.post("/analysis/query", analyzeQuery);

export default router;
