import React from "react";
import DoughnutChart from "../../charts/DoughnutChart";

function SentimetnAnalysisChart({ analysisStats }) {
  if (!analysisStats) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            OverallSentiment Analysis
          </h2>
        </header>
        <div className="flex items-center justify-center h-[260px]">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate sentiment distribution
  const totalArticles = analysisStats.totalArticles || 0;
  const positiveCount = analysisStats.sentimentAnalysis?.positive || 0;
  const negativeCount = analysisStats.sentimentAnalysis?.negative || 0;
  const neutralCount = totalArticles - positiveCount - negativeCount;

  const chartData = {
    labels: ["Positive", "Negative", "Neutral"],
    datasets: [
      {
        label: "Sentiment Analysis",
        data: [positiveCount, negativeCount, neutralCount],
        backgroundColor: [
          "#10B981", // emerald-500 for positive
          "#F43F5E", // rose-500 for negative
          "#6B7280", // gray-500 for neutral
        ],
        hoverBackgroundColor: [
          "#059669", // emerald-600
          "#E11D48", // rose-600
          "#4B5563", // gray-600
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Sentiment Analysis
        </h2>
      </header>
      <div className="p-4">
        <DoughnutChart data={chartData} width={389} height={260} />
        <div className="flex justify-center space-x-4 mt-4">
          <div className="text-center">
            <div className="text-sm font-medium text-emerald-600">Positive</div>
            <div className="text-lg font-semibold">{positiveCount}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-rose-600">Negative</div>
            <div className="text-lg font-semibold">{negativeCount}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600">Neutral</div>
            <div className="text-lg font-semibold">{neutralCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentimetnAnalysisChart;
