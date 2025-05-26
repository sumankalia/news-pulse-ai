import React, { useState, useEffect, useRef } from "react";
import {
  connectSocket,
  subscribeToUserLogs,
  unsubscribeFromUserLogs,
} from "../../services/socketInstance";

function SearchOption({ onAnalysisComplete, uniqueUserId, chatService }) {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState("news");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastScrollTop = useRef(0);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (!isUserScrolling && logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  };

  // Handle scroll events
  const handleScroll = (e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // If user scrolls up or is not at bottom, mark as user scrolling
    if (
      scrollTop < lastScrollTop.current ||
      scrollHeight - scrollTop - clientHeight > 10
    ) {
      setIsUserScrolling(true);
    }

    // If user scrolls to bottom, allow auto-scrolling again
    if (scrollHeight - scrollTop - clientHeight < 10) {
      setIsUserScrolling(false);
    }

    lastScrollTop.current = scrollTop;
  };

  useEffect(() => {
    if (uniqueUserId) {
      console.log("Connecting socket with userId:", uniqueUserId);
      // Connect socket and subscribe to logs
      connectSocket(uniqueUserId);
      // Unsubscribe from any existing logs before subscribing
      unsubscribeFromUserLogs();
      subscribeToUserLogs((logData) => {
        console.log("Received log data:", logData);
        setLogs((prevLogs) => [...prevLogs, logData]);
      });
    } else {
      console.warn("No uniqueUserId provided to SearchOption component");
    }

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up socket connection");
      unsubscribeFromUserLogs();
    };
  }, [uniqueUserId]);

  // Scroll to bottom when new logs are added
  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleAnalysis = async () => {
    if (!query) return;

    setIsLoading(true);
    setLogs([]); // Clear previous logs
    setShowSuccess(false); // Reset success message
    console.log("Starting analysis for query:", query, "Type:", queryType);

    try {
      const response = await chatService(query, uniqueUserId);

      console.log("Analysis response:", response);

      if (onAnalysisComplete) {
        onAnalysisComplete(response.data);
      }

      // Show success message
      setShowSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Analysis failed:",
        error?.response?.data?.message || "Failed to analyze query"
      );
      // setLogs((prevLogs) => [
      //   ...prevLogs,
      //   {
      //     type: "error",
      //     message: `Analysis failed: ${error?.response?.data?.message}`,
      //     timestamp: new Date().toISOString(),
      //   },
      // ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-12 bg-white dark:bg-gray-800 shadow-lg rounded-xl">
      <div className="p-6">
        <header className="flex justify-center items-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            News Analysis
          </h2>
        </header>

        {/* Query Input */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Enter a headline, topic, or article URL to reveal hidden bias,
            sentiment, and more.
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder={
                queryType === "news"
                  ? "What's happening in India?"
                  : "BBC headlines"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading && query) {
                  handleAnalysis();
                }
              }}
            />
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 dark:text-green-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-green-700 dark:text-green-400 font-medium">
                Analysis completed successfully! View the results below.
              </span>
            </div>
          </div>
        )}

        {/* Analysis Button */}
        <button
          onClick={handleAnalysis}
          disabled={isLoading || !query}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 transition-colors ${
            isLoading || !query
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>Search News</span>
            </>
          )}
        </button>

        {/* Logs Display */}
        {logs.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Analysis Logs
            </div>
            <div
              ref={logsContainerRef}
              onScroll={handleScroll}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-60 overflow-y-auto"
            >
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`text-sm mb-2 last:mb-0 ${
                    log.type === "error"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchOption;
