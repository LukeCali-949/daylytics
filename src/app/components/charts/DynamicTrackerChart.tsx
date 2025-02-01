"use client";

import React from "react";
import { Tracker } from "../extra/tremor/TrackerStuff";
import { Title } from "@tremor/react";

interface TrackerDataPoint {
  date: string;
  value: number;
}

interface DynamicTrackerChartProps {
  keyName: string;
  chartData: TrackerDataPoint[];
}

const DynamicTrackerChart: React.FC<DynamicTrackerChartProps> = ({
  keyName,
  chartData,
}) => {
  // Calculate yes days and total days
  const yesDays = chartData.filter(dp => dp.value !== 0).length;
  const totalDays = chartData.length;

  const trackerData = chartData.map((dp) => ({
    color: dp.value !== 0 ? "bg-emerald-600" : "bg-red-600/80",
    tooltip: `${dp.date}: ${dp.value !== 0 ? "Yes" : "No"}`,
  }));

  return (
    <div className="w-full h-full flex flex-col">
      <Title className="text-l font-semibold mb-2 px-2">
        {formatKeyName(keyName)}
      </Title>
      
      <div className="flex-1 relative p-2 mt-10">
        <div className="flex flex-col items-center gap-4">
          {/* Centered Tracker */}
          <div className="w-full max-w-3xl">
            <Tracker 
              data={trackerData} 
              hoverEffect={true}
              className="h-8 mx-auto"
            />
          </div>

          {/* Yes/Total Days Display */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-300">
              <span className="text-emerald-400">{yesDays} days</span> completed
              <span className="mx-2">•</span>
              <span className="text-gray-400">
                {totalDays} total days
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ({Math.round((yesDays / totalDays) * 100)}% completion rate)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicTrackerChart;