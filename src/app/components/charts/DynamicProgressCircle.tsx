// components/charts/DynamicProgressCircle.tsx
"use client";

import React from "react";
import { ProgressCircle } from "../extra/tremor/ProgressCircleStuff";
import { Title } from "@tremor/react";

interface ProgressCircleProps {
  keyName: string;
  chartData: Array<{ date: string; value: number; goal?: number }>;
}

const DynamicProgressCircle: React.FC<ProgressCircleProps> = ({
  keyName,
  chartData,
}) => {
  // Calculate total value
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
  const roundedRatio = Math.round(ratio);

  return (
    <div className="w-full h-full flex flex-col">
      <Title className="text-l font-semibold mb-4 px-2">
        {formatKeyName(keyName)}
      </Title>
      
      <div className="flex-1 relative flex flex-col items-center justify-center p-2">
        <div className="w-full flex justify-center">
          <ProgressCircle
            value={roundedRatio}
            color="cyan"
            className="
              w-[22.5vw] h-[22.5vw]   // Mobile-first approach
              sm:w-[18vw] sm:h-[18vw]  // Small screens
              md:w-[13.5vw] md:h-[13.5vw]  // Medium screens
              lg:w-[9vw] lg:h-[9vw]  // Large screens
              xl:w-[6.75vw] xl:h-[6.75vw]  // Extra large
              min-w-[10px] min-h-[15px] // Minimum size
              max-w-[250px] max-h-[250px] // Maximum size
              transition-all duration-300
            "
          />
        </div>
        
        <p className="mt-4 text-center text-sm md:text-base text-gray-300">
          {totalValue.toLocaleString()} / {lastMentionedGoal.toLocaleString()}
          <span className="mx-1">({roundedRatio}%)</span>
        </p>
      </div>
    </div>
  );
};

const formatKeyName = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default DynamicProgressCircle;