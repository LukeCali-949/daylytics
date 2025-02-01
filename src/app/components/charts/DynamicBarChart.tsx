// components/charts/DynamicBarChart.tsx
"use client";

import { BarChart } from "../extra/tremor/BarChartStuff";
import { Title } from "@tremor/react";

interface DynamicBarChartProps {
  keyName: string;
  chartData: { date: string; value: number }[];
}

const DynamicBarChart = ({ keyName, chartData }: DynamicBarChartProps) => {
  return (
    <div className="w-full h-full flex flex-col">
      <Title className="text-l font-semibold mb-2 px-2">
        {formatKeyName(keyName)}
      </Title>
      <div className="flex-1 relative">
        <BarChart
          className="h-full w-full"
          data={chartData}
          index="date"
          categories={["value"]}
          colors={["cyan"]}
          yAxisWidth={45}
          valueFormatter={(number: number) => `${number}`}
        />
      </div>
    </div>
  );
};

// Helper function to format key names 
const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicBarChart;