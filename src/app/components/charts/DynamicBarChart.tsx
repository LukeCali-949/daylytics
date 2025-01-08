// components/charts/DynamicBarChart.tsx
"use client";

import { BarChart } from "../extra/tremor/BarChartStuff";

// Adjust the import path as necessary to point to your BarChart component

interface DynamicBarChartProps {
  keyName: string;
  chartData: { date: string; value: number }[];
}

const DynamicBarChart = ({ keyName, chartData }: DynamicBarChartProps) => {
  return (
    <div className="mb-6">
      <h4 className="mb-2 text-center font-semibold">
        {formatKeyName(keyName)}
      </h4>
      <BarChart
        className="h-80"
        data={chartData.map((item) => ({ ...item, [keyName]: item.value }))}
        index="date"
        categories={[keyName]}
        valueFormatter={(number: number) => `${number}`}
        onValueChange={(v) => console.log(v)}
        xAxisLabel="Day"
        yAxisLabel={formatKeyName(keyName)}
      />
    </div>
  );
};

// Helper function to format key names (e.g., "wake_up_time" to "Wake Up Time")
const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicBarChart;
