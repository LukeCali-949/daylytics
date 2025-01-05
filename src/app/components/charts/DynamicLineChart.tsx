// components/charts/DynamicLineChart.tsx
"use client";

import { LineChart } from "../extra/tremor/LineChartStuff";

interface DynamicLineChartProps {
  keyName: string;
  chartData: { date: string; value: number }[];
}

const DynamicLineChart = ({ keyName, chartData }: DynamicLineChartProps) => {
  return (
    <div className="mb-6 w-[400px] rounded-lg p-3 shadow-2xl">
      <h4 className="mb-2 text-center font-semibold">
        {formatKeyName(keyName)}
      </h4>
      <LineChart
        className="h-80"
        data={chartData}
        index="date"
        categories={["value"]}
        valueFormatter={(number: number) => `${number}`}
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

export default DynamicLineChart;
