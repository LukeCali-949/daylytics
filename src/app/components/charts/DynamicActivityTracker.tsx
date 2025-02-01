import React, { cloneElement } from "react";
import { Title } from "@tremor/react";
import { ActivityCalendar } from "react-activity-calendar";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

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

  const getDynamicLevel = (value: number): number => {
    if (maxValue <= 0 || value <= 0) return 0;
    const ratio = value / maxValue;
    const rawLevel = Math.floor(ratio * 4);
    return Math.min(rawLevel, 4);
  };

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
    <div className="w-full h-full flex flex-col">
      <Title className="text-l font-semibold mb-2 px-2">
        {keyName}
      </Title>
      <div className="flex-1 relative ">
        <ActivityCalendar
          data={transformedData.filter((d): d is Activity => d !== undefined)}
          colorScheme="dark"
          theme={{
            dark: ['#161B22', '#0D4429', '#006D32', '#26A641', '#39D353']
          }}
          renderBlock={(block, activity) =>
            cloneElement(block, {
              "data-tooltip-id": "react-tooltip",
              "data-tooltip-html": `${activity.count} ${keyName} ${activity.date}`,
              style: { 
                borderRadius: 3,
                margin: 2
              }
            } as React.SVGAttributes<SVGRectElement>)
          }
        />
        <ReactTooltip 
          id="react-tooltip" 
          className="!bg-[#131313] !border !border-cyan-500"
          arrowColor="#131313"
        />
      </div>
    </div>
  );
}