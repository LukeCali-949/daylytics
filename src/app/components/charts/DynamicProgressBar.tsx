// components/charts/DynamicProgressBar.tsx
"use client";

import React from "react";
import { ProgressBar } from "../extra/tremor/ProgressBarStuff";

/**
 * Each chartData entry is typically { date: string, value: number, goal?: number }
 */
interface ProgressBarProps {
  keyName: string;
  chartData: Array<{ date: string; value: number; goal?: number }>;
}

/**
 * DynamicProgressBar sums up the "value" from all days and uses the most
 * recently mentioned "goal" (if available). If no day mentions a goal,
 * default to 100.
 */
const DynamicProgressBar: React.FC<ProgressBarProps> = ({
  keyName,
  chartData,
}) => {
  // 1. Accumulate total "value" across all days
  const totalValue = chartData.reduce((sum, dp) => sum + (dp.value || 0), 0);

  // 2. Find the most recently mentioned goal (if any)
  //    We'll search from the last day to the first
  let lastMentionedGoal = 100; // default fallback
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (typeof chartData[i]!.goal === "number") {
      lastMentionedGoal = chartData[i]!.goal!;
      break;
    }
  }

  // 3. Calculate ratio
  const ratio =
    lastMentionedGoal > 0 ? (totalValue / lastMentionedGoal) * 100 : 0;
  const ratioLabel = `${Math.round(ratio)}%`;

  // 4. Display
  return (
    <div className="mb-6 w-[400px] rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl">
      <h4 className="mb-2 text-center font-semibold">
        {keyName.replace(/_/g, " ")}
      </h4>
      <ProgressBar
        value={totalValue}
        max={lastMentionedGoal}
        showAnimation={true}
      />
      <p className="mt-2 text-center text-sm text-gray-300">
        {totalValue} / {lastMentionedGoal} &nbsp; ({ratioLabel})
      </p>
    </div>
  );
};

export default DynamicProgressBar;
