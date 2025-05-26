import { queryAnalyzer } from "../services/discover/queryAnalyzer.js";
import { contentProcessor } from "../services/interact/contentProcessor.js";
import { emitLogToUser } from "../services/others/websocket.js";

const analyzeQuery = async (req, res) => {
  const { query, userId } = req.body;
  try {
    if (!query) {
      emitLogToUser(userId, {
        type: "error",
        message: "❌ Query is required",
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    if (!userId) {
      emitLogToUser(userId, {
        type: "error",
        message: "❌ User ID is required",
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Analyze the query to determine the best method
    const analysis = await queryAnalyzer.analyzeQuery(query, userId);
    let processedResults = [];

    // Process the content based on the selected method
    switch (analysis.method) {
      case "scrape_as_article":
        const articleResult = await contentProcessor.processArticle(
          query,
          userId
        );
        if (articleResult) {
          processedResults.push(articleResult);
        }
        break;

      case "scrape_a_homepage":
        processedResults = await contentProcessor.processHomepage(
          analysis.homepageUrl,
          userId
        );
        break;

      case "search_via_google":
        processedResults = await contentProcessor.processSearchResults(
          query,
          userId,
          "google"
        );
        break;

      case "search_via_bing":
        processedResults = await contentProcessor.processSearchResults(
          query,
          userId,
          "bing"
        );
        break;
    }

    emitLogToUser(userId, {
      type: "info",
      message: `✅ Analysis completed. Found ${processedResults.length} results`,
      timestamp: new Date().toISOString(),
    });

    // Return the processed results with analysis
    res.status(200).json({
      success: true,
      data: {
        method: analysis.method,
        reasoning: analysis.reasoning,
        confidence: analysis.confidence,
        queryType: analysis.queryType,
        results: processedResults,
      },
    });
  } catch (error) {
    console.log("Error in analyzeQuery:", error);
    emitLogToUser(userId, {
      type: "error",
      message: `❌ Error in analysis: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      success: false,
      message: "Error analyzing query",
      error: error.message,
    });
  }
};

export { analyzeQuery };
