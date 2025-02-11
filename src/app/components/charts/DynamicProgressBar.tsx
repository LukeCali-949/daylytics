// components/charts/DynamicProgressBar.tsx
"use client";

import React from "react";
import { ProgressBar } from "../extra/tremor/ProgressBarStuff";
import { Title } from "@tremor/react";

interface ProgressBarProps {
  keyName: string;
  chartData: Array<{ date: string; value: number; goal?: number }>;
}

const DynamicProgressBar: React.FC<ProgressBarProps> = ({
  keyName,
  chartData,
}) => {
  // Calculate total value
  console.log(chartData);
  const totalValue = chartData.reduce((sum, dp) => sum + (dp.value || 0), 0);

  // Find most recent goal
  let lastMentionedGoal = 100;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (typeof chartData[i]?.goal === "number") {
      lastMentionedGoal = chartData[i]!.goal!;
      break;
    }
  }

  // Calculate progress
  const ratio = Math.min((totalValue / lastMentionedGoal) * 100, 100);
  const ratioLabel = `${Math.round(ratio)}%`;

  return (
    <div className="w-full h-full flex flex-col">
      <Title className="text-l font-semibold mb-2 px-2">
        {formatKeyName(keyName)}
      </Title>
      
      <div className="flex-1 relative flex flex-col justify-center p-2">
        <ProgressBar
          value={totalValue}
          max={lastMentionedGoal}
          showAnimation={true}
          color="cyan"
          className="w-full"
        />
        
        <p className="mt-2 text-center text-sm text-gray-300">
          {totalValue.toLocaleString()} / {lastMentionedGoal.toLocaleString()} 
          <span className="mx-1">({ratioLabel})</span>
        </p>
      </div>
    </div>
  );
};

// Reuse the same formatting helper
const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicProgressBar;