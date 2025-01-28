import React, { cloneElement } from "react";
import { Card, Title } from "@tremor/react";
import { ActivityCalendar } from "react-activity-calendar";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

/**
 * Your original calendar boundary entries.
 * These ensure the calendar covers the entire year.
 */
const BOUNDARY_DAYS = [
  {
    date: "2025-01-01",
    count: 0,
    level: 0,
  },
  {
    date: "2025-12-31",
    count: 0,
    level: 0,
  },
];


/**
 * DynamicActivityTracker Component
 * Props:
 *  - `keyName`: The key name for the tracker
 *  - `chartData`: The input data array from `prepareChartData`
 */
interface ActivityTrackerProps {
  keyName: string;
  chartData: { date: string; value: number; goal?: number }[];
}

interface Activity {
  date: string;
  count: number;
  level: number;
}

export default function DynamicActivityTracker({ keyName, chartData }: ActivityTrackerProps) {
  const maxValue = Math.max(...chartData.map((day) => day.value), 0);

  // 2) Helper to convert a given day's value into a level from 0..4
  const getDynamicLevel = (value: number): number => {
    if (maxValue <= 0 || value <= 0) return 0; // No activity if no data or zero
    const ratio = value / maxValue; // fraction in range (0..1]
    // Multiply by 4 => range (0..4], then floor or clamp to 4
    const rawLevel = Math.floor(ratio * 4);
    // clamp in case ratio=1 => 4
    return Math.min(rawLevel, 4);
  };

  // 3) Transform the chartData for ActivityCalendar
  //    Prepend boundary day 0, append boundary day 1
  const transformedData = [
    BOUNDARY_DAYS[0],
    ...chartData.map((day) => {
      const { date, value } = day;
      let isoDate = date;
      
      if (date === "today") {
        isoDate = new Date().toISOString().split('T')[0]!;
      } else if (date === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        isoDate = yesterday.toISOString().split('T')[0]!;
      } else {
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = weekdays.indexOf(date.toLowerCase());
        if (dayIndex !== -1) {
          const today = new Date();
          const currentDayIndex = today.getDay();
          const daysToSubtract = (currentDayIndex + 7 - dayIndex) % 7;
          const targetDate = new Date();
          targetDate.setDate(today.getDate() - daysToSubtract);
          isoDate = targetDate.toISOString().split('T')[0]!;
        }
      }

      return {
        date: isoDate,
        count: value,
        level: getDynamicLevel(value),
      };
    }),
    BOUNDARY_DAYS[1],
  ];

  return (
    <Card className="relative mb-6 w-max rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl h-min ">
      <Title className="ml-5 text-xl font-semibold">{keyName}</Title>

      <ActivityCalendar
        data={transformedData.filter((d): d is Activity => d !== undefined)}
        colorScheme="dark" // Dark color scheme for the calendar
        // Optionally: maxLevel={4} (default is 4)
        renderBlock={(block, activity) =>
          cloneElement(block, {
            "data-tooltip-id": "react-tooltip",
            "data-tooltip-html": `${activity.count} ${keyName} ${activity.date}`,
          } as React.SVGAttributes<SVGRectElement>)
        }
      />

      <ReactTooltip id="react-tooltip" />
    </Card>
  );
}
