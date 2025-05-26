import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { FastMCP } from "fastmcp";
import { z } from "zod";
import axios from "axios";
import { JSDOM } from "jsdom";

// Initialize MCP server
const server = new FastMCP({
  name: "True Lens",
  version: "1.0.0",
});

// Helper function for tool execution
function tool_fn(name, fn) {
  return async (data, ctx) => {
    console.error(`[${name}] executing ${JSON.stringify(data)}`);
    const ts = Date.now();
    try {
      return await fn(data, ctx);
    } catch (e) {
      if (e.response) {
        console.error(
          `[${name}] error ${e.response.status} ${e.response.statusText}: ${e.response.data}`
        );
        throw new Error(`HTTP ${e.response.status}: ${e.response.data}`);
      }
      console.error(`[${name}] error ${e.stack}`);
      throw e;
    } finally {
      const dur = Date.now() - ts;
      console.error(`[${name}] tool finished in ${dur}ms`);
    }
  };
}

// Discover Agent: Finds relevant content across the open web - fetch multiple webs from the homepage
async function discoverContentExtract(raw_html) {
  try {
    // Split the content into lines for processing
    const lines = raw_html.split('\n');
    const articles = [];
    let currentArticle = null;

    // Regular expressions for matching different patterns
    const articleLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const dateRegex = /^[A-Za-z]+\s+\d{1,2},\s+\d{4}/;
    const navigationRegex = /^(Home|News|Sport|Business|Innovation|Culture|Arts|Travel|Earth|Audio|Video|Live|Weather|BBC Shop|BritBox|Terms of Use|About the BBC|Privacy Policy|Cookies|Accessibility Help|Contact the BBC|Advertise with us|Do not share or sell my info|Contact technical support)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and navigation elements
      if (!line || navigationRegex.test(line)) continue;

      // Check for article links
      let match;
      while ((match = articleLinkRegex.exec(line)) !== null) {
        const [_, title, href] = match;
        
        // Skip navigation and utility links
        if (href.includes('epaper') || 
            href.includes('myaccount') || 
            href.includes('subscription') ||
            href.includes('search') ||
            href.includes('newsletter') ||
            href.includes('topic')) {
          continue;
        }

        // Only process news article links
        if (href.match(/\/news\/|\/article\/|\/story\//)) {
          try {
            const absoluteUrl = new URL(href, 'https://www.thehindu.com').toString();
            
            // Create new article object
            const article = {
              url: absoluteUrl,
              title: title.trim(),
              description: null,
              image: null,
              date: null
            };

            // Look for date in surrounding lines
            for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
              const dateMatch = lines[j].match(dateRegex);
              if (dateMatch) {
                article.date = dateMatch[0];
                break;
              }
            }

            articles.push(article);
          } catch (e) {
            console.warn("Invalid URL:", href);
          }
        }
      }
    }

    // Remove duplicates based on URL
    const uniqueArticles = Array.from(
      new Map(articles.map(item => [item.url, item])).values()
    );

    // Sort articles by date if available
    uniqueArticles.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(b.date) - new Date(a.date);
    });

    return uniqueArticles;
  } catch (error) {
    console.error("Error in discoverContentExtract:", error);
    throw error;
  }
}

// Access Agent: Navigate complex or protected websites
async function accessContent(url, options = {}) {
  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL provided");
    }

    const payload = {
      url,
      zone: process.env.WEB_UNLOCKER_ZONE || "mcp_unlocker",
      format: "raw",
      data_format: "html",
      actions: [
        {
          action: "wait_for",
          selector: "body",
          timeout: 10000,
        },
        {
          action: "extract",
          extract_rules: {
            content: {
              selector: "body",
              type: "text",
            },
          },
        },
      ],
    };

    const response = await axios({
      url: "https://api.brightdata.com/request",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "true-lens/1.0",
        Authorization: `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
      },
      data: payload,
    });

    return {
      content: response.data,
      metadata: {
        url,
        timestamp: new Date().toISOString(),
        platform: new URL(url).hostname,
      },
    };
  } catch (error) {
    console.error("❌ Access error:", error);
    throw error;
  }
}

// Extract Agent: Pull structured, real-time data
async function extractData(url) {
  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL provided");
    }

    const payload = {
      url,
      zone: process.env.WEB_UNLOCKER_ZONE || "mcp_unlocker",
      format: "raw",
      data_format: "html",
    };

    console.log(
      "Sending request to Bright Data with payload:",
      JSON.stringify(payload, null, 2)
    );

    const response = await axios({
      url: "https://api.brightdata.com/request",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "true-lens/1.0",
        Authorization: `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
      },
      data: payload,
    });

    if (!response.data) {
      throw new Error("No data received from Bright Data");
    }

    // Parse the HTML content
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract content using the successful selectors from web-unlocker.js
    const content = extractContent(document);

    // Extract tags using the successful selectors from web-unlocker.js
    const tags = extractTags(document);

    // Extract main image using the successful selectors from web-unlocker.js
    const mainImage = extractMainImage(document, url);

    // Extract title (using common article title selectors)
    const titleSelectors = [
      "h1",
      "article h1",
      ".article-title",
      ".post-title",
      ".entry-title",
      ".headline",
      ".story-headline",
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        title = element.textContent.trim();
        break;
      }
    }

    // Extract author (using common author selectors)
    const authorSelectors = [
      'meta[name="author"]',
      ".author",
      ".byline",
      ".post-author",
      ".article-author",
      ".reporter",
    ];

    let author = null;
    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        author = element.textContent.trim();
        break;
      }
    }

    // Extract date (using common date selectors)
    const dateSelectors = [
      'meta[property="article:published_time"]',
      "time",
      ".date",
      ".post-date",
      ".article-date",
      ".published-date",
    ];

    let date = null;
    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        date = element.textContent.trim();
        break;
      }
    }

    const extractedData = {
      title,
      author,
      date_published: date,
      content,
      image: mainImage?.url || null,
      tags,
    };

    console.log("Extracted data:", extractedData);
    return extractedData;
  } catch (error) {
    console.error("❌ Extraction error:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    throw error;
  }
}

// Helper functions from web-unlocker.js
function extractContent(document) {
  const scripts = document.getElementsByTagName("script");
  const styles = document.getElementsByTagName("style");
  while (scripts.length > 0) scripts[0].remove();
  while (styles.length > 0) styles[0].remove();

  let text = document.body.textContent || document.body.innerText;
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\t/g, "")
    .replace(/\r/g, "");
}

function extractTags(document) {
  const tagSelectors = [
    ".tags a",
    ".post-tags a",
    ".article-tags a",
    ".entry-tags a",
    'meta[name="keywords"]',
    ".td-post-source-tags a",
  ];

  const tags = new Set();
  for (const selector of tagSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      if (element.content) {
        element.content
          .split(",")
          .map((tag) => tag.trim())
          .forEach((tag) => tags.add(tag));
      } else {
        const tag = element.textContent.trim();
        if (tag) tags.add(tag);
      }
    });
  }
  return Array.from(tags);
}

function extractMainImage(document, baseUrl) {
  const imageSelectors = [
    "article img",
    ".article img",
    ".post img",
    ".news-item img",
    ".story img",
    ".featured-image img",
    ".main-image img",
    ".hero-image img",
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    ".td-post-featured-image img",
    ".entry-content img",
  ];

  for (const selector of imageSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      try {
        let imageUrl =
          element.tagName === "META"
            ? element.getAttribute("content")
            : element.getAttribute("src");

        if (imageUrl) {
          return {
            url: new URL(imageUrl, baseUrl).href,
            alt: element.getAttribute("alt") || "",
          };
        }
      } catch (error) {
        console.warn("Invalid image URL:", error.message);
      }
    }
  }
  return null;
}

// Interact Agent: Engage with dynamic, JavaScript-rendered pages
async function interactWithPage(url, interactions = []) {
  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL provided");
    }

    const payload = {
      url,
      zone: process.env.WEB_UNLOCKER_ZONE || "mcp_unlocker",
      format: "raw",
      method: "GET",
      session: `session_${Date.now()}`,
      direct: true,
      country: "us",
      dns: "remote",
    };

    console.log(
      "Sending request to Bright Data with payload:",
      JSON.stringify(payload, null, 2)
    );

    const response = await axios({
      url: "https://api.brightdata.com/request",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "true-lens/1.0",
        Authorization: `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
      },
      data: payload,
      responseType: "text",
    });

    // Parse the response if it's JSON
    let content;
    try {
      content = JSON.parse(response.data);
    } catch (e) {
      content = response.data;
    }

    return {
      content,
      metadata: {
        url,
        timestamp: new Date().toISOString(),
        platform: new URL(url).hostname,
      },
    };
  } catch (error) {
    console.error("❌ Interaction error:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    throw error;
  }
}

// Example usage of the agents
async function fetchFullArticlesFromHomepage(homepageUrl, maxArticles = 5) {
  // Use Discover agent to find articles
  const discovered = await discoverContentExtract(homepageUrl);

  const articlesToExtract = discovered
    .filter((a) => a.url)
    .slice(0, maxArticles);

  const fullArticles = [];

  for (const item of articlesToExtract) {
    // Use Extract agent to get article data
    const extractRules = {
      title: {
        selector: "h1, article h1, .article-title",
        type: "text",
      },
      author: {
        selector: 'meta[name="author"], .author, .byline',
        type: "text",
      },
      date: {
        selector: 'meta[property="article:published_time"], time, .date',
        type: "text",
      },
      content: {
        selector: "article, .article-body, .story-body",
        type: "text",
      },
      tags: {
        selector: 'meta[name="keywords"]',
        type: "attribute",
        attribute: "content",
      },
    };

    const fullData = await extractData(item.url, extractRules);
    if (fullData) {
      fullArticles.push({
        ...fullData,
        url: item.url,
      });
    }
  }

  return fullArticles;
}

// Add tools to MCP server
server.addTool({
  name: "discover_content",
  description: "Find relevant content across the open web",
  parameters: z.object({
    url: z.string().url(),
    options: z.object({}).optional(),
  }),
  execute: tool_fn("discover_content", discoverContentExtract),
});

server.addTool({
  name: "access_content",
  description: "Navigate complex or protected websites",
  parameters: z.object({
    url: z.string().url(),
    options: z.object({}).optional(),
  }),
  execute: tool_fn("access_content", accessContent),
});

server.addTool({
  name: "extract_data",
  description: "Pull structured, real-time data",
  parameters: z.object({
    url: z.string().url(),
    extractRules: z.object({}),
  }),
  execute: tool_fn("extract_data", extractData),
});

server.addTool({
  name: "interact_with_page",
  description: "Engage with dynamic, JavaScript-rendered pages",
  parameters: z.object({
    url: z.string().url(),
    interactions: z.array(z.object({})).optional(),
  }),
  execute: tool_fn("interact_with_page", interactWithPage),
});

// Start the MCP server
server.start({ transportType: "stdio" });

const fetchArticleDataFromMCP = async (url) => {
  const article = await fetchFullArticlesFromHomepage(url);
  return article;
};

const fetchHomepageFromMCP = async (url) => {
  const homepage = await discoverContentExtract(url);
  return homepage;
};

export {
  discoverContentExtract,
  accessContent,
  extractData,
  interactWithPage,
  fetchFullArticlesFromHomepage,
  fetchArticleDataFromMCP,
  fetchHomepageFromMCP,
};
