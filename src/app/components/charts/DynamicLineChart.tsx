// components/charts/DynamicLineChart.tsx
"use client";

import { Card, Title } from "@tremor/react";
import { LineChart } from "../extra/tremor/LineChartStuff";

interface DynamicLineChartProps {
  keyName: string;
  chartData: { date: string; value: number }[];
}

const DynamicLineChart = ({ keyName, chartData }: DynamicLineChartProps) => {
  return (
    <Card className="mb-6 w-[400px] rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl">
      <Title className="ml-5 text-xl font-semibold">
        {formatKeyName(keyName)}
      </Title>
      <LineChart
        className="h-80"
        data={chartData}
        index="date"
        categories={["value"]}
        valueFormatter={(number: number) => `${number}`}
        xAxisLabel="Day"
        yAxisLabel={formatKeyName(keyName)}
      />
    </Card>
  );
};

// Helper function to format key names (e.g., "wake_up_time" to "Wake Up Time")
const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicLineChart;
