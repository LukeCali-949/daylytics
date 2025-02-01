// components/charts/DynamicLineChart.tsx
"use client";

import { Title } from "@tremor/react";
import { LineChart } from "../extra/tremor/LineChartStuff";

interface DynamicLineChartProps {
  keyName: string;
  chartData: { date: string; value: number }[];
}

const DynamicLineChart = ({ keyName, chartData }: DynamicLineChartProps) => {
  return (
    <div className="w-full h-full flex flex-col">
      <Title className="text-l font-semibold mb-2 px-2">
        {formatKeyName(keyName)}
      </Title>
      <div className="flex-1 relative">
        <LineChart
          className="h-full w-full"
          data={chartData}
          index="date"
          categories={["value"]}
          colors={["cyan"]} // Match bar chart color scheme
          yAxisWidth={45}   // Match bar chart axis width
          showLegend={false}
          valueFormatter={(number: number) => `${number}`}
          // Add any additional bar chart-specific props you need
        />
      </div>
    </div>
  );
};

// Helper function to format key names (same as before)
const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicLineChart;