"use client";

import React from "react";
import { Tracker } from "../extra/tremor/TrackerStuff";

interface TrackerDataPoint {
  date: string; // e.g., "Day 1"
  value: number; // 1 => yes, 0 => no
}

interface DynamicTrackerChartProps {
  keyName: string;
  chartData: TrackerDataPoint[];
}

/**
 * DynamicTrackerChart uses the imported <Tracker /> component
 * to visualize yes/no data over multiple days.
 *
 * Each day is mapped to a color:
 *  - bg-emerald-600 if value = 1 (yes)
 *  - bg-red-600     if value = 0 (no)
 *
 * The tooltip is set to the date for clarity.
 */
const DynamicTrackerChart: React.FC<DynamicTrackerChartProps> = ({
  keyName,
  chartData,
}) => {
  //console.log(chartData);

  // Build an array for <Tracker />'s 'data' prop
  // Each item is { color, tooltip }
  let trackerData = chartData.map((dp) => ({
    color: dp.value === 1 ? "bg-emerald-600" : "bg-red-600",
    tooltip: dp.date, // or anything else you'd like to show on hover
  }));

  return (
    <div className="mb-6 w-[400px] rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl">
      <h4 className="mb-2 text-center font-semibold">
        {keyName.replace(/_/g, " ")}
      </h4>
      <Tracker data={trackerData} hoverEffect={true} />
    </div>
  );
};

export default DynamicTrackerChart;
