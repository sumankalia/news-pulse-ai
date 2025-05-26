import React, { useRef, useEffect, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import { chartColors } from "./ChartjsConfig";
import {
  Chart,
  DoughnutController,
  ArcElement,
  TimeScale,
  Tooltip,
  Legend,
} from "chart.js";
import "chartjs-adapter-moment";

Chart.register(DoughnutController, ArcElement, TimeScale, Tooltip, Legend);

function DoughnutChart({ data, width, height }) {
  const [chart, setChart] = useState(null);
  const canvas = useRef(null);
  const legend = useRef(null);
  const { currentTheme } = useThemeProvider();
  const darkMode = currentTheme === "dark";
  const {
    tooltipTitleColor,
    tooltipBodyColor,
    tooltipBgColor,
    tooltipBorderColor,
  } = chartColors;

  // Create or update chart
  useEffect(() => {
    const ctx = canvas.current;

    // Destroy existing chart if it exists
    if (chart) {
      chart.destroy();
      setChart(null);
    }

    // Create new chart
    const newChart = new Chart(ctx, {
      type: "doughnut",
      data: data,
      options: {
        cutout: "80%",
        layout: {
          padding: 24,
        },
        plugins: {
          legend: {
            display: false,
            labels: {
              generateLabels: function (chart) {
                const datasets = chart.data.datasets;
                return datasets[0].data.map((data, i) => ({
                  text: chart.data.labels[i],
                  fillStyle: datasets[0].backgroundColor[i],
                  hidden: !chart.getDataVisibility(i),
                  index: i,
                }));
              },
            },
          },
          tooltip: {
            titleColor: darkMode
              ? tooltipTitleColor.dark
              : tooltipTitleColor.light,
            bodyColor: darkMode
              ? tooltipBodyColor.dark
              : tooltipBodyColor.light,
            backgroundColor: darkMode
              ? tooltipBgColor.dark
              : tooltipBgColor.light,
            borderColor: darkMode
              ? tooltipBorderColor.dark
              : tooltipBorderColor.light,
          },
        },
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        animation: {
          duration: 500,
        },
        maintainAspectRatio: false,
        resizeDelay: 200,
      },
      plugins: [
        {
          id: "htmlLegend",
          afterUpdate(c, args, options) {
            const ul = legend.current;
            if (!ul) return;
            // Remove old legend items
            while (ul.firstChild) {
              ul.firstChild.remove();
            }
            // Get labels from the chart data
            const items = c.data.labels.map((label, i) => ({
              text: label,
              fillStyle: c.data.datasets[0].backgroundColor[i],
              hidden: !c.getDataVisibility(i),
              index: i,
            }));

            items.forEach((item) => {
              const li = document.createElement("li");
              li.style.margin = "4px";
              // Button element
              const button = document.createElement("button");
              button.classList.add(
                "btn-xs",
                "bg-white",
                "dark:bg-gray-700",
                "text-gray-500",
                "dark:text-gray-400",
                "shadow-xs",
                "shadow-black/[0.08]",
                "rounded-full"
              );
              button.style.opacity = item.hidden ? ".3" : "";
              button.onclick = () => {
                c.toggleDataVisibility(item.index);
                c.update();
              };
              // Color box
              const box = document.createElement("span");
              box.style.display = "block";
              box.style.width = "8px";
              box.style.height = "8px";
              box.style.backgroundColor = item.fillStyle;
              box.style.borderRadius = "4px";
              box.style.marginRight = "4px";
              box.style.pointerEvents = "none";
              // Label
              const label = document.createElement("span");
              label.style.display = "flex";
              label.style.alignItems = "center";
              const labelText = document.createTextNode(item.text);
              label.appendChild(labelText);
              li.appendChild(button);
              button.appendChild(box);
              button.appendChild(label);
              ul.appendChild(li);
            });
          },
        },
      ],
    });
    setChart(newChart);

    // Cleanup function
    return () => {
      if (newChart) {
        newChart.destroy();
        setChart(null);
      }
    };
  }, [data, darkMode]); // Dependencies include data and darkMode

  return (
    <div className="grow flex flex-col justify-center">
      <div>
        <canvas ref={canvas} width={width} height={height}></canvas>
      </div>
      <div className="px-5 pt-2 pb-6">
        <ul ref={legend} className="flex flex-wrap justify-center -m-1"></ul>
      </div>
    </div>
  );
}

export default DoughnutChart;
