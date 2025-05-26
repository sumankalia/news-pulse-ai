import { mcpClient } from "../access/mcpClient.js";
import { emitLogToUser, emitAnalysisToUser } from "../others/websocket.js";
import {
  cleanHTML,
  isLikelyArticleUrl,
  isStaticOrImageUrl,
  cleanUrl,
} from "../../utils/helpers.js";
import markdownLinkExtractor from "markdown-link-extractor";

class ContentProcessor {
  async processArticle(url, userId) {
    try {
      emitLogToUser(userId, {
        type: "info",
        message: `📄 Extracting content from: ${url}`,
        timestamp: new Date().toISOString(),
      });

      const data = await mcpClient.runToolCall("scrape_as_article", { url });
      if (!data || !data.content || !data.content[0]) {
        throw new Error("No content found in response");
      }

      const extractedContent = {
        url,
        content: data.content[0].text,
        title: data.content[0].title || "Untitled",
      };

      if (extractedContent && extractedContent.title) {
        emitLogToUser(userId, {
          type: "info",
          message: `🤖 Analyzing article: ${extractedContent.title}`,
          timestamp: new Date().toISOString(),
        });

        const analysis = await this.analyzeContent(extractedContent);

        if (analysis) {
          const processedContent = {
            ...extractedContent,
            content: cleanHTML(extractedContent.content),
            analysis,
          };

          emitAnalysisToUser(userId, processedContent);
          return processedContent;
        }
      }

      return null;
    } catch (error) {
      emitLogToUser(userId, {
        type: "error",
        message: `❌ Error processing article ${url}: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async processHomepage(url, userId) {
    try {
      emitLogToUser(userId, {
        type: "info",
        message: `🌐 Scraping homepage content... ${url}`,
        timestamp: new Date().toISOString(),
      });

      const data = await mcpClient.runToolCall("scrape_a_homepage", { url });
      if (!data || !data.content || !data.content[0]) {
        throw new Error("No content found in response");
      }

      const markdownText = data.content[0].text;
      const filteredUrls = markdownLinkExtractor(markdownText);
      const baseUrl = new URL(url).origin;

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
        .filter((url) => isLikelyArticleUrl(url) && !isStaticOrImageUrl(url));

      emitLogToUser(userId, {
        type: "info",
        message: `📰 Filtered to ${articleUrls.length} valid article URLs`,
        timestamp: new Date().toISOString(),
      });

      const processedResults = [];
      for (const articleUrl of articleUrls) {
        try {
          const processedContent = await this.processArticle(
            articleUrl,
            userId
          );
          if (processedContent) {
            processedResults.push(processedContent);
          }
        } catch (error) {
          console.error(`Error processing URL ${articleUrl}:`, error);
          continue;
        }
      }

      return processedResults;
    } catch (error) {
      emitLogToUser(userId, {
        type: "error",
        message: `❌ Error processing homepage ${url}: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async processSearchResults(query, userId, searchEngine = "google") {
    try {
      emitLogToUser(userId, {
        type: "info",
        message: `🔍 Searching for relevant content...`,
        timestamp: new Date().toISOString(),
      });

      const data = await mcpClient.runToolCall(`search_via_${searchEngine}`, {
        query,
      });
      if (!data || !data.content || !data.content[0]) {
        throw new Error("No content found in response");
      }

      const markdownText = data.content[0].text;
      const filteredUrls = markdownLinkExtractor(markdownText);
      const articleUrls = filteredUrls
        .map((url) => cleanUrl(url))
        .filter((url) => isLikelyArticleUrl(url) && !isStaticOrImageUrl(url));

      const processedResults = [];
      for (const articleUrl of articleUrls) {
        try {
          const processedContent = await this.processArticle(
            articleUrl,
            userId
          );
          if (processedContent) {
            processedResults.push(processedContent);
          }
        } catch (error) {
          console.error(`Error processing URL ${articleUrl}:`, error);
          continue;
        }
      }

      return processedResults;
    } catch (error) {
      emitLogToUser(userId, {
        type: "error",
        message: `❌ Error processing search results: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async analyzeContent(content) {
    // This method should be implemented based on your specific analysis requirements
    // For now, returning a placeholder analysis
    return {
      summary: "Content analysis placeholder",
      sentiment: "neutral",
      topics: ["general"],
    };
  }
}

export const contentProcessor = new ContentProcessor();
