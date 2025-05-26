import React, { useEffect, useState, useRef } from "react";
import Header from "../partials/Header";
import Banner from "../partials/Banner";
import { connectToChatService } from "../services/articles";
import { v4 as uuidv4 } from "uuid";
import SearchOption from "../partials/dashboard/SearchOption";
import {
  connectSocket,
  subscribeToArticleAnalysis,
  unsubscribeFromArticleAnalysis,
} from "../services/socketInstance";
import SentimetnAnalysisChart from "../partials/dashboard/SentimetnAnalysisChart";
import ArticlesTable from "../partials/dashboard/ArticlesTable";

function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [uniqueUserId] = useState(() => uuidv4());
  const articlesTableRef = useRef(null);
  const isSearchingRef = useRef(false);

  // Function to calculate sentiment analysis statistics
  const calculateSentimentStats = (articles) => {
    if (!articles || articles.length === 0) return null;

    const stats = {
      totalArticles: articles.length,
      sentimentAnalysis: {
        positive: 0,
        negative: 0,
      },
    };

    articles.forEach((article) => {
      if (article.analysis?.sentiment?.label) {
        switch (article.analysis.sentiment.label.toLowerCase()) {
          case "positive":
            stats.sentimentAnalysis.positive++;
            break;
          case "negative":
            stats.sentimentAnalysis.negative++;
            break;
          // neutral is calculated as the remainder
        }
      }
    });

    return stats;
  };

  useEffect(() => {
    // Connect to socket
    connectSocket(uniqueUserId);

    // Handle article analysis events
    const handleAnalysis = (data) => {
      console.log("Received article analysis:", data);
      setArticles((prevArticles) => {
        const newArticles = [...prevArticles, data];
        // Calculate and update sentiment stats whenever articles change
        setAnalysisStats(calculateSentimentStats(newArticles));
        return newArticles;
      });
    };

    // Subscribe to analysis events
    subscribeToArticleAnalysis(uniqueUserId, handleAnalysis);

    // Cleanup on unmount
    return () => {
      unsubscribeFromArticleAnalysis(uniqueUserId);
    };
  }, [uniqueUserId]);

  const chatService = async (query, userId) => {
    // Clear articles when starting a new search
    setArticles([]);
    setAnalysisStats(null); // Reset analysis stats
    isSearchingRef.current = true;

    try {
      const response = await connectToChatService({
        query: query,
        userId: userId,
      });
      console.log("Initial response:", response);

      // Only set articles from response if we haven't received any via websocket
      if (articles.length === 0) {
        const newArticles = response.data.results;
        setArticles(newArticles);
        // Calculate and set initial sentiment stats
        setAnalysisStats(calculateSentimentStats(newArticles));
      }
    } catch (error) {
      console.error("Error in chat service:", error);
    } finally {
      isSearchingRef.current = false;
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/*  Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Cards */}
            <div className="grid grid-cols-12 gap-6">
              <SearchOption
                onAnalysisComplete={() => {}}
                chatService={chatService}
                uniqueUserId={uniqueUserId}
              />

              {articles?.length > 0 && (
                <ArticlesTable ref={articlesTableRef} articles={articles} />
              )}

              {analysisStats && (
                <SentimetnAnalysisChart analysisStats={analysisStats} />
              )}
            </div>
          </div>
        </main>

        <Banner />
      </div>
    </div>
  );
}

export default Dashboard;
