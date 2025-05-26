import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { emitLogToUser } from "../others/websocket.js";

class ArticleAnalyzer {
  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0,
      modelName: "gpt-3.5-turbo",
    });

    this.parser = StructuredOutputParser.fromZodSchema(
      z.object({
        summary: z.string(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
        topics: z.array(z.string()),
        keyPoints: z.array(z.string()),
        entities: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            relevance: z.number().min(0).max(1),
          })
        ),
        credibility: z.object({
          score: z.number().min(0).max(1),
          factors: z.array(z.string()),
        }),
      })
    );

    this.promptTemplate = PromptTemplate.fromTemplate(
      `Analyze the following article content and provide a structured analysis.
      
      Article Title: {title}
      Article Content: {content}
      
      {format_instructions}
      
      Provide a comprehensive analysis including:
      1. A concise summary of the main points
      2. The overall sentiment of the article
      3. Key topics discussed
      4. Main points or arguments
      5. Important entities mentioned (people, organizations, locations)
      6. Credibility assessment based on content quality and presentation
      
      Focus on factual analysis and avoid personal opinions.`
    );
  }

  async analyzeArticle(content, userId) {
    try {
      emitLogToUser(userId, {
        type: "info",
        message: "🤖 Starting article analysis...",
        timestamp: new Date().toISOString(),
      });

      const formattedPrompt = await this.promptTemplate.format({
        title: content.title,
        content: content.content,
        format_instructions: this.parser.getFormatInstructions(),
      });

      const response = await this.model.invoke([
        {
          role: "user",
          content: formattedPrompt,
        },
      ]);

      const analysis = await this.parser.parse(response.content);

      emitLogToUser(userId, {
        type: "info",
        message: "✅ Article analysis completed",
        timestamp: new Date().toISOString(),
      });

      return analysis;
    } catch (error) {
      emitLogToUser(userId, {
        type: "error",
        message: `❌ Error in article analysis: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

export const articleAnalyzer = new ArticleAnalyzer();
