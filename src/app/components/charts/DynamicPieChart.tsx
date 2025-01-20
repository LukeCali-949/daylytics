// components/charts/DynamicPieChart.tsx
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
    <div className="mb-6 w-[400px] rounded-lg p-3 shadow-2xl">
      <h4 className="mb-2 text-center font-semibold">
        {formatKeyName(keyName)}
      </h4>
      <DonutChart
        data={pieData}
        category="name"
        value="amount"
        className="mx-auto mt-8"
        showLabel={true}
        colors={["blue", "violet", "cyan", "emerald"]}
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
