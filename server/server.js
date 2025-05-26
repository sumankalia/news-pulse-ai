#!/usr/bin/env node
"use strict"; /*jslint node:true es9:true*/

import dotenv from "dotenv";
dotenv.config();

import { FastMCP } from "fastmcp";
import { z } from "zod";
import { browser_tools } from "./mcp-server/browser-tools.js";

let debug_stats = { tool_calls: {} };

let server = new FastMCP({
  name: "News Analyzer",
  version: "1.0.0",
});

// Helper function to create tool execution functions with error handling
function tool_fn(name, fn) {
  return async (data, ctx) => {
    debug_stats.tool_calls[name] = debug_stats.tool_calls[name] || 0;
    debug_stats.tool_calls[name]++;
    let ts = Date.now();
    console.error(`[%s] executing %s`, name, JSON.stringify(data));
    try {
      return await fn(data, ctx);
    } catch (e) {
      if (e.response) {
        console.error(
          `[%s] error %s %s: %s`,
          name,
          e.response.status,
          e.response.statusText,
          e.response.data
        );
        let message = e.response.data;
        if (message?.length)
          throw new Error(`HTTP ${e.response.status}: ${message}`);
      } else console.error(`[%s] error %s`, name, e.stack);
      throw e;
    } finally {
      let dur = Date.now() - ts;
      console.error(`[%s] tool finished in %sms`, name, dur);
    }
  };
}

// Add your custom tools here
server.addTool({
  name: "search_via_google",
  description: "Search for news articles using Google News",
  parameters: z.object({
    query: z.string(),
    engine: z.enum(["google", "bing", "yandex"]).optional().default("google"),
  }),
  execute: tool_fn("search_via_google", async ({ query, engine }) => {
    // Implement your search logic here
    throw new Error("Search functionality not implemented");
  }),
});

server.addTool({
  name: "scrape_a_homepage",
  description: "Scrape a news website homepage for articles",
  parameters: z.object({ url: z.string().url() }),
  execute: tool_fn("scrape_a_homepage", async ({ url }) => {
    // Implement your scraping logic here
    throw new Error("Scraping functionality not implemented");
  }),
});

server.addTool({
  name: "scrape_as_article",
  description: "Scrape a single news article",
  parameters: z.object({ url: z.string().url() }),
  execute: tool_fn("scrape_as_article", async ({ url }) => {
    // Implement your article scraping logic here
    throw new Error("Article scraping functionality not implemented");
  }),
});

// Add browser tools
for (let tool of browser_tools) server.addTool(tool);

console.error("Starting server...");

server.start({
  transportType: "stdio",
});
