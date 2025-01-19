// components/charts/DynamicProgressCircle.tsx
"use client";

import React from "react";
import { ProgressCircle } from "../extra/tremor/ProgressCircleStuff";

interface ProgressCircleProps {
  keyName: string;
  chartData: Array<{ date: string; value: number; goal?: number }>;
}

const DynamicProgressCircle: React.FC<ProgressCircleProps> = ({
  keyName,
  chartData,
}) => {
  // 1. Accumulate total "value" across all days
  const totalValue = chartData.reduce((sum, dp) => sum + (dp.value || 0), 0);

  // 2. Find the most recently mentioned goal (if any)
  let lastMentionedGoal = 100; // default fallback
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (typeof chartData[i]!.goal === "number") {
      lastMentionedGoal = chartData[i]!.goal!;
      break;
    }
  }

  // 3. Calculate the progress ratio as a percentage
  const ratio =
    lastMentionedGoal > 0 ? (totalValue / lastMentionedGoal) * 100 : 0;
  const roundedRatio = Math.round(ratio);

  return (
    <div className="mb-6 flex w-[400px] flex-col items-center rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl">
      <h4 className="mb-2 text-center font-semibold">
        {keyName.replace(/_/g, " ")}
      </h4>
      <ProgressCircle value={roundedRatio} className="mx-auto" />
      <p className="mt-2 text-center text-sm text-gray-300">
        {totalValue} / {lastMentionedGoal} ({roundedRatio}%)
      </p>
    </div>
  );
};

export default DynamicProgressCircle;
