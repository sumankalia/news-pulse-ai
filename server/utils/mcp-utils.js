import markdownLinkExtractor from "markdown-link-extractor";
import {
  extractArticleWithFallback,
  analyzeArticleContent,
  cleanHTML,
  isLikelyArticleUrl,
  isStaticOrImageUrl,
  cleanUrl,
} from "./helpers.js";
import { emitAnalysisToUser, emitLogToUser } from "../service/websocket.js";
import { runToolCall } from "../app.js";

const scrapeAArticle = async ({ query, userId }) => {
  let processedResults = [];
  const url = query;
  const extractedContent = await extractArticleWithFallback(url, userId);

  if (extractedContent && extractedContent.title) {
    const analysis = await analyzeArticleContent(extractedContent);

    if (analysis) {
      emitAnalysisToUser(userId, {
        ...extractedContent,
        content: cleanHTML(extractedContent.content),
        analysis,
      });
      processedResults.push({
        ...extractedContent,
        content: cleanHTML(extractedContent.content),
        analysis,
      });
    }
  }

  return processedResults;
};

const scrapeAHomepage = async ({ markdownText, query, userId }) => {
  const processedResults = [];
  const filteredUrls = markdownLinkExtractor(markdownText);
  const baseUrl = new URL(query).origin;

  emitLogToUser(userId, {
    type: "info",
    message: `🔗 Found ${filteredUrls.length} potential article links`,
    timestamp: new Date().toISOString(),
  });

  const articleUrls = filteredUrls
    .map((url) => {
      const cleanUrl = url.replace(/[)\]]/g, "");
      return cleanUrl.startsWith("http") ? cleanUrl : baseUrl + cleanUrl;
    })
    .filter((url) => {
      return isLikelyArticleUrl(url) && !isStaticOrImageUrl(url);
    });

  console.log("articleUrls", articleUrls);

  emitLogToUser(userId, {
    type: "info",
    message: `📰 Filtered to ${articleUrls.length} valid article URLs`,
    timestamp: new Date().toISOString(),
  });

  // Process each URL
  const urls = articleUrls || [];
  for (const url of urls) {
    try {
      emitLogToUser(userId, {
        type: "info",
        message: `📄 Extracting content from: ${url}`,
        timestamp: new Date().toISOString(),
      });

      const extractedContent = await extractArticleWithFallback(url, userId);

      if (extractedContent && extractedContent.title) {
        emitLogToUser(userId, {
          type: "info",
          message: `🤖 Analyzing article: ${extractedContent.title}`,
          timestamp: new Date().toISOString(),
        });

        const analysis = await analyzeArticleContent(extractedContent);

        if (analysis) {
          processedResults.push({
            ...extractedContent,
            content: cleanHTML(extractedContent.content),
            analysis,
          });
          emitLogToUser(userId, {
            type: "info",
            message: `✅ Successfully analyzed article: ${extractedContent.title}`,
            timestamp: new Date().toISOString(),
          });

          //We can push the analysis by websocket to the user
          emitAnalysisToUser(userId, {
            ...extractedContent,
            content: cleanHTML(extractedContent.content),
            analysis,
          });
        }
      }
    } catch (error) {
      emitLogToUser(userId, {
        type: "error",
        message: `❌ Error processing URL ${url}: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      continue;
    }
  }

  return processedResults;
};

const searchFromGoogle = async ({ query, userId, markdownText }) => {
  const processedResults = [];
  const filteredUrls = markdownLinkExtractor(markdownText);

  console.log("filteredUrls", filteredUrls);
  const articleUrls = filteredUrls
    .filter((url) => {
      return isLikelyArticleUrl(url);
    })
    .map((url) => cleanUrl(url))
    .filter((url) => {
      return isLikelyArticleUrl(url) && !isStaticOrImageUrl(url);
    });

  console.log("articleUrls", articleUrls);
  // For search engine results, we need to process each URL
  const urls = articleUrls || [];
  for (const url of urls) {
    try {
      const extractedContent = await extractArticleWithFallback(url, userId);

      if (extractedContent && extractedContent.title) {
        // Add analysis to each article
        const analysis = await analyzeArticleContent(extractedContent);

        if (analysis) {
          emitAnalysisToUser(userId, {
            ...extractedContent,
            content: cleanHTML(extractedContent.content),
            analysis,
          });
          processedResults.push({
            ...extractedContent,
            content: cleanHTML(extractedContent.content),
            analysis,
          });
        }
      }
    } catch (error) {
      console.log(`Error processing URL ${url}:`, error);
      continue;
    }
  }

  return processedResults;
};

const searchViaBing = async ({ query, userId }) => {
  const url = "https://www.bing.com/news";
  const searchSelector = "input#sb_form_q";
  const searchText = query;
  const processedResults = [];

  try {
    emitLogToUser(userId, {
      type: "info",
      message: `🌐 Opening webpage: ${url}`,
      timestamp: new Date().toISOString(),
    });

    // Navigate to the webpage using scraping_browser_navigate
    const navigationResult = await runToolCall("scraping_browser_navigate", {
      url,
    });
    console.log("navigationResult", navigationResult);

    // Wait for the search field to be available using scraping_browser_wait_for
    emitLogToUser(userId, {
      type: "info",
      message: "⏳ Waiting for search field...",
      timestamp: new Date().toISOString(),
    });

    const waitForResult = await runToolCall("scraping_browser_wait_for", {
      selector: searchSelector,
      timeout: 10000,
    });
    console.log("waitForResult", waitForResult);
    emitLogToUser(userId, {
      type: "info",
      message: "⌨️ Entering search text...",
      timestamp: new Date().toISOString(),
    });

    // Clear the search field first using scraping_browser_type
    const clearResult = await runToolCall("scraping_browser_type", {
      selector: searchSelector,
      text: "",
      submit: false,
    });
    console.log("clearResult", clearResult);

    // Type the search text using scraping_browser_type
    const typeResult = await runToolCall("scraping_browser_type", {
      selector: searchSelector,
      text: searchText,
      submit: false,
    });
    console.log("typeResult", typeResult);

    const pressResult = await runToolCall("scraping_browser_press", {
      key: "Enter",
    });
    console.log("pressResult", pressResult);

    emitLogToUser(userId, {
      type: "info",
      message: "⏳ Waiting for search results to load...",
      timestamp: new Date().toISOString(),
    });

    emitLogToUser(userId, {
      type: "info",
      message: "⏳ Pressing Enter...",
      timestamp: new Date().toISOString(),
    });

    // Wait for the search results to load
    // First wait for network to be idle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Wait for search results container
    try {
      const waitResult = await runToolCall("scraping_browser_wait_for", {
        selector: 'a.linkBtn[aria-label="Best match"]',
        timeout: 50000,
      });
      console.log("waitResult", waitResult);

      // Additional wait for search results to be fully loaded
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Wait for article links to be present
      await runToolCall("scraping_browser_wait_for", {
        selector: "article a[href*='/articles/']",
        timeout: 5000,
      });
    } catch (e) {
      console.log("waitResult error", e);
      console.log("No search results found, continuing...");
    }

    emitLogToUser(userId, {
      type: "info",
      message: "📋 Fetching URLs from the search results...",
      timestamp: new Date().toISOString(),
    });

    // Get all links from the page using scraping_browser_links
    const linksResult = await runToolCall("scraping_browser_links", {});

    if (!linksResult || !linksResult.content || !linksResult.content[0]) {
      throw new Error("No links found in the response");
    }
    console.log("linksResult", linksResult);
    console.log("linksResult.content", linksResult.content);

    console.log("linksResult.content[0]", linksResult.content[0]);

    const filteredUrls = markdownLinkExtractor(linksResult.content[0].text);
    console.log("filteredUrls", filteredUrls);

    emitLogToUser(userId, {
      type: "info",
      message: `✅ Found ${filteredUrls.length} URLs to process`,
      timestamp: new Date().toISOString(),
    });

    // Deduplicate URLs before processing
    const uniqueUrls = [...new Set(filteredUrls)];
    console.log("uniqueUrls", uniqueUrls);

    const cleanedUrls = uniqueUrls
      .map((url) => cleanUrl(url))
      .filter((url) => {
        return isLikelyArticleUrl(url) && !isStaticOrImageUrl(url);
      });
    console.log("cleanedUrls", cleanedUrls);

    // Deduplicate cleaned URLs as well
    const finalUrls = [...new Set(cleanedUrls)];
    console.log("finalUrls", finalUrls);

    emitLogToUser(userId, {
      type: "info",
      message: `✅ Found ${finalUrls.length} valid article URLs to process`,
      timestamp: new Date().toISOString(),
    });

    for (const url of finalUrls) {
      try {
        emitLogToUser(userId, {
          type: "info",
          message: `📄 Starting to extract content from: ${url}`,
          timestamp: new Date().toISOString(),
        });

        const scrapedContent = await scrapeAArticle({
          query: url,
          userId,
        });

        const extractedContent = scrapedContent[0];

        if (extractedContent && extractedContent.title) {
          processedResults.push(extractedContent);

          emitLogToUser(userId, {
            type: "info",
            message: `✅ Successfully processed article: ${extractedContent.title}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        emitLogToUser(userId, {
          type: "error",
          message: `❌ Error processing URL ${url}: ${error.message}`,
          timestamp: new Date().toISOString(),
        });
        console.log(`Error processing URL ${url}:`, error);
        continue;
      }
    }

    emitLogToUser(userId, {
      type: "info",
      message: `🏁 Completed processing ${processedResults.length} articles successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.log("Error in searchAndFetchUrls:", error);
    emitLogToUser(userId, {
      type: "error",
      message: `❌ Error in search and fetch: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  return processedResults;
};

export { scrapeAArticle, scrapeAHomepage, searchFromGoogle, searchViaBing };
