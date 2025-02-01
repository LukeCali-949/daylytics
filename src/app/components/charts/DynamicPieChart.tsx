"use client";

import React from "react";
import { DonutChart } from "../extra/tremor/PieChartStuff";
// Adjust the import path according to your project structure

interface DataItem {
  date: string;
  value: number;
}

interface DynamicPieChartProps {
  keyName: string;
  chartData: { date: string; value: number }[];
}

const DynamicPieChart = ({ keyName, chartData }: DynamicPieChartProps) => {
  // Convert chartData to the format expected by the DonutChart
  const pieData = chartData.map(({ date, value }) => ({
    name: date,
    amount: value,
  }));

  return (
    <div className="mb-6  rounded-lg pb-3 shadow-2xl flex flex-col items-center mx-auto">
      <h4 className="mb-2 text-center font-semibold">
        {formatKeyName(keyName)}
      </h4>
      <DonutChart
        data={pieData}
        category="name"
        value="amount"
        className="mt-8 w-[22.5vw] h-[22.5vw]   // Mobile-first approach
              sm:w-[19.8vw] sm:h-[19.8vw]  // Small screens
              md:w-[14.85vw] md:h-[14.85vw]  // Medium screens
              lg:w-[9.9vw] lg:h-[9.9vw]  // Large screens
              xl:w-[7.425vw] xl:h-[7.425vw]  // Extra large
              min-w-[10px] min-h-[15px] // Minimum size
              max-w-[250px] max-h-[250px] // Maximum size
              transition-all duration-300" // Removed mx-auto since flex is handling the centering
        showLabel={true}
        colors={["blue", "emerald", "violet", "amber", "gray", "cyan", "pink", "lime", "fuchsia"]}
        tooltipCallback={() => null} // Simplified for dynamic rendering
        valueFormatter={(number: number) =>
          `${Intl.NumberFormat("us").format(number).toString()}`
        }
      />
    </div>
  );
};

// Helper function to format key names
const formatKeyName = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default DynamicPieChart;
