import { extract as extractArticle } from "@extractus/article-extractor";
import { htmlToText } from "html-to-text";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { runToolCall } from "../app.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { OutputFixingParser } from "langchain/output_parsers";
import { extractMetadataFromHTML } from "./html-parser.js";
import { emitLogToUser } from "../services/others/websocket.js";
import normalizeUrl from "normalize-url";

const analysisSchema = z.object({
  sentiment: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(["positive", "negative", "neutral"]),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  biasScore: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(["Biased", "neutral"]),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  politicalLean: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(["Left-leaning", "Right-leaning", "neutral", "Neutral"]),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  misinformationLikelihood: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(["High Misinformation", "Low Misinformation"]),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  propagandaLikelihood: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(["High Propaganda", "Low Propaganda"]),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  toxicityScore: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(["Toxic", "Non-toxic"]),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  emotionAnalysis: z.object({
    primaryEmotion: z.string(),
    emotionIntensity: z.number().min(0).max(10),
    secondaryEmotions: z.array(z.string()),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  contentAnalysis: z.object({
    subjectivityScore: z.number().min(0).max(10),
    factualityScore: z.number().min(0).max(10),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  toneComparison: z.object({
    headlineToneScore: z.number().min(0).max(10),
    bodyToneScore: z.number().min(0).max(10),
    clickbaitLikelihood: z.number().min(0).max(10),
    category: z.enum(["extreme", "moderate", "mild"]),
  }),
  briefExplanation: z.string(),
  misinformation: z.array(z.string()).optional().default([]),
});

const defaultAnalysis = {
  sentiment: { score: 5, label: "neutral", category: "moderate" },
  biasScore: { score: 5, label: "neutral", category: "moderate" },
  politicalLean: { score: 5, label: "neutral", category: "moderate" },
  misinformationLikelihood: {
    score: 5,
    label: "Low Misinformation",
    category: "moderate",
  },
  propagandaLikelihood: {
    score: 5,
    label: "Low Propaganda",
    category: "moderate",
  },
  toxicityScore: { score: 5, label: "Non-toxic", category: "moderate" },
  emotionAnalysis: {
    primaryEmotion: "Neutral",
    emotionIntensity: 5,
    secondaryEmotions: [],
    category: "moderate",
  },
  contentAnalysis: {
    subjectivityScore: 5,
    factualityScore: 5,
    category: "moderate",
  },
  toneComparison: {
    headlineToneScore: 5,
    bodyToneScore: 5,
    clickbaitLikelihood: 5,
    category: "moderate",
  },
  briefExplanation: "Unable to analyze article due to parsing error.",
  misinformation: [],
};

const cleanHTML = (rawHtml) => {
  const text = htmlToText(rawHtml, {
    wordwrap: false, // optional
    selectors: [
      { selector: "img", format: "skip" }, // skip images
      { selector: "a", options: { ignoreHref: true } }, // only show link text
    ],
  });

  return text;
};

const analyzeArticleContent = async (article) => {
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  const baseParser = StructuredOutputParser.fromZodSchema(analysisSchema);
  const parser = OutputFixingParser.fromLLM({ llm: model, parser: baseParser });

  const promptTemplate = PromptTemplate.fromTemplate(
    `Analyze the news article and return only a **valid JSON object** on a single line.

      Article Title: {title}
      Article Content: {content}

      {format_instructions}

      ### CRITICAL OUTPUT RULES:
      - No markdown/code blocks
      - No extra commentary
      - Only valid JSON (1 line, no trailing commas)

      Be objective, thorough, and concise.`
  );

  try {
    const formattedPrompt = await promptTemplate.format({
      title: article.title,
      content: article.content,
      format_instructions: baseParser.getFormatInstructions(),
    });

    const response = await model.invoke([
      { role: "user", content: formattedPrompt },
    ]);
    const cleaned = response.content.replace(/\s+/g, " ").trim();

    console.log("🟢 Raw:", response.content);
    console.log("🟢 Cleaned:", cleaned);

    return await baseParser.parse(cleaned);
  } catch (error) {
    console.error("❌ Parsing failed:", error.message || error);
    return defaultAnalysis;
  }
};

// Add this helper function for article extraction with fallback
const extractArticleWithFallback = async (url, userId) => {
  emitLogToUser(userId, {
    type: "info",
    message: `🔍 Starting article extraction for: ${url}`,
    timestamp: new Date().toISOString(),
  });

  let articleData = {};
  // try {
  //   // First try with extractArticle
  //   emitLogToUser(userId, {
  //     type: "info",
  //     message: "📄 Attempting primary extraction method 'extractus'...",
  //     timestamp: new Date().toISOString(),
  //   });

  //   const extractedContent = await extractArticle(url);

  //   if (extractedContent && extractedContent.title) {
  //     emitLogToUser(userId, {
  //       type: "info",
  //       message: `✅ Successfully extracted article with 'extractus': ${extractedContent.title}`,
  //       timestamp: new Date().toISOString(),
  //     });
  //     articleData = extractedContent;
  //   }
  // } catch (error) {
  //   emitLogToUser(userId, {
  //     type: "warning",
  //     message:
  //       "⚠️ Primary extraction 'extractus' failed, switching to fallback method...",
  //     timestamp: new Date().toISOString(),
  //   });

  // If extractArticle fails, try with runToolCall
  emitLogToUser(userId, {
    type: "info",
    message: "🌐 Attempting extraction via mcp...",
    timestamp: new Date().toISOString(),
  });

  const fallbackData = await runToolCall("scrape_as_article", { url });

  const metadata = extractMetadataFromHTML(fallbackData.content[0].text, url);

  if (fallbackData && fallbackData.content) {
    emitLogToUser(userId, {
      type: "info",
      message: "📝 Processing fallback data via mcp...",
      timestamp: new Date().toISOString(),
    });

    articleData = {
      title: metadata.title || url,
      content: metadata.content,
      url: metadata.url,
      published: metadata.publishedAt || new Date().toISOString(),
      author: metadata.author || "Unknown",
      source: new URL(metadata.url).hostname,
      image: metadata.mainImage || null,
    };

    emitLogToUser(userId, {
      type: "success",
      message: `✅ Successfully extracted article via fallback method 'mcp'`,
      timestamp: new Date().toISOString(),
    });
  } else {
    emitLogToUser(userId, {
      type: "error",
      message: "❌ Failed to extract article content",
      timestamp: new Date().toISOString(),
    });
  }
  // }

  return articleData;
};
// https://apnews.com/article/nepal-environment-conference-mountains-6a7dc20eb5c74d3f5110fdcc973cd0e4

const isLikelyArticleUrl = (url) => {
  // Step 1: Decode URL to handle things like %5C
  let decodedUrl = url;

  return (
    !decodedUrl.toLowerCase().includes("google") &&
    !decodedUrl.toLowerCase().includes("bing") &&
    (decodedUrl.includes("/news/") ||
      decodedUrl.match(/\d{4}\/\d{2}\/\d{2}/) || // e.g., /2024/05/23/
      decodedUrl.match(/\/\d{6,}/) || // e.g., /article/123456/
      decodedUrl.match(/\/[a-z-]+-\d+/)) // e.g., /bjp-wins-election-2024/
  );
};

const cleanUrl = (url) => {
  // Step 1: Decode URL to handle things like %5C
  let decodedUrl = decodeURIComponent(url);

  const normalizedUrl = normalizeUrl(decodedUrl, {
    stripWWW: false,
    removeTrailingSlash: true,
    removeQueryParameters: true,
    removeHash: true,
  });

  // Step 3: Remove any remaining trailing slash or backslash
  const urlObj = new URL(normalizedUrl);
  urlObj.pathname = urlObj.pathname.replace(/[/\\]+$/, "");

  const cleanedUrl = urlObj.toString();

  return cleanedUrl;
};

const isStaticOrImageUrl = (url) => {
  // Check for common static file extensions
  const staticExtensions = [
    ".css",
    ".js",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".webm",
    ".mp3",
    ".wav",
    ".pdf",
    ".zip",
    ".rar",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".webp",
  ];

  // Check for common static resource paths
  const staticPaths = [
    "/static/",
    "/assets/",
    "/images/",
    "/img/",
    "/media/",
    "/css/",
    "/js/",
    "/fonts/",
    "/uploads/",
    "/cdn/",
  ];

  // Check if URL ends with any static extension
  if (staticExtensions.some((ext) => url.toLowerCase().endsWith(ext))) {
    return true;
  }

  // Check if URL contains any static path
  if (staticPaths.some((path) => url.toLowerCase().includes(path))) {
    return true;
  }

  return false;
};

export {
  extractArticleWithFallback,
  analyzeArticleContent,
  cleanHTML,
  isLikelyArticleUrl,
  isStaticOrImageUrl,
  cleanUrl,
};
