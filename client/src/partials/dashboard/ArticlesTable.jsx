import React, { useState } from "react";

function ArticlesTable({ articles = [], ref }) {
  const [expandedArticles, setExpandedArticles] = useState({});

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  const toggleArticle = (articleId) => {
    setExpandedArticles((prev) => ({
      ...prev,
      [articleId]: !prev[articleId],
    }));
  };

  return (
    <div
      ref={ref}
      className="col-span-full xl:col-span-12 bg-white dark:bg-gray-800 shadow-xs rounded-xl"
    >
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Article Analysis
        </h2>
      </header>
      <div className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {articles?.map((article, index) => (
            <div
              key={article.url}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700/60"
            >
              {/* Article Header with Image and Title */}
              <div className="p-4">
                <div className="relative w-full h-40 rounded-lg overflow-hidden mb-3">
                  <img
                    src={article.image}
                    alt={article.title}
                    onError={(e) => {
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.src = "../images/thumbnail.jpg";
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {article.source}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Visit Source
                  </a>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Published:{" "}
                    {article.published
                      ? new Date(article.published).toLocaleDateString()
                      : "N/A"}
                  </div>
                  <button
                    onClick={() => toggleArticle(article.url)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {expandedArticles[article.url] ? "Show Less" : "Show More"}
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Sentiment
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        article.analysis.sentiment.label === "negative"
                          ? "text-red-600"
                          : article.analysis.sentiment.label === "positive"
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {capitalizeFirstLetter(article.analysis.sentiment.label)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Bias
                    </div>
                    <div className="text-sm font-semibold text-blue-600">
                      {capitalizeFirstLetter(article.analysis.biasScore.label)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Political Lean
                    </div>
                    <div className="text-sm font-semibold text-purple-600">
                      {capitalizeFirstLetter(
                        article.analysis.politicalLean.label
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Misinformation
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      {capitalizeFirstLetter(
                        article.analysis.misinformationLikelihood.label
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Content */}
              {expandedArticles[article.url] && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Detailed Analysis Section */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      Content Analysis
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Emotion Analysis
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-100">
                          Primary:{" "}
                          {capitalizeFirstLetter(
                            article.analysis.emotionAnalysis.primaryEmotion
                          )}{" "}
                          ({article.analysis.emotionAnalysis.emotionIntensity}
                          /10)
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Secondary:{" "}
                          {article.analysis.emotionAnalysis.secondaryEmotions
                            .map((emotion) => capitalizeFirstLetter(emotion))
                            .join(", ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Content Metrics
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-100">
                          Subjectivity:{" "}
                          {article.analysis.contentAnalysis.subjectivityScore}
                          /10
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Factuality:{" "}
                          {article.analysis.contentAnalysis.factualityScore}/10
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      Analysis Summary
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                      {article?.analysis?.briefExplanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ArticlesTable;
