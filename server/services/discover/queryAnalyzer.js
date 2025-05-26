import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { emitLogToUser } from "../others/websocket.js";

class QueryAnalyzer {
  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0,
      modelName: "gpt-3.5-turbo",
    });

    this.parser = StructuredOutputParser.fromZodSchema(
      z.object({
        method: z.enum([
          "scrape_as_article",
          "scrape_a_homepage",
          "search_via_google",
          "search_via_bing",
        ]),
        reasoning: z.string(),
        confidence: z.number().min(0).max(1),
        queryType: z.enum(["news", "weather", "price", "general"]).optional(),
        homepageUrl: z.string().optional(),
      })
    );

    this.promptTemplate = PromptTemplate.fromTemplate(`
        You are an intelligent decision engine designed to route user queries to the most appropriate web data acquisition method.
        `);
  }

  async analyzeQuery(query, userId) {
    try {
      emitLogToUser(userId, {
        type: "info",
        message: `🔍 Starting analysis for query: "${query}"`,
        timestamp: new Date().toISOString(),
      });

      const formattedPrompt = await this.promptTemplate.format({
        query,
        format_instructions: this.parser.getFormatInstructions(),
      });

      emitLogToUser(userId, {
        type: "info",
        message: "🤖 Determining best method to gather information...",
        timestamp: new Date().toISOString(),
      });

      const response = await this.model.invoke([
        {
          role: "user",
          content: formattedPrompt,
        },
      ]);

      const result = await this.parser.parse(response.content);

      emitLogToUser(userId, {
        type: "info",
        message: `✅ Selected method: ${result.method} (Confidence: ${(
          result.confidence * 100
        ).toFixed(1)}%)`,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      emitLogToUser(userId, {
        type: "error",
        message: `❌ Error in query analysis: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

export const queryAnalyzer = new QueryAnalyzer();
