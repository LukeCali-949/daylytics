// components/VoiceInput.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import DraggablePopOut from "../DraggablePopOut/DraggablePopOut";
import { chartComponents } from "../../charts/chartRegistry";
import { toast } from "sonner";
import { Toaster } from "~/components/ui/sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";

import DynamicActivityTracker from "../../charts/DynamicActivityTracker";

export type chartTypes =
  | "Line"
  | "Bar"
  | "Pie"
  | "ProgressBar"
  | "ProgressCircle"
  | "Tracker";

export default function VoiceInput() {
  const [transcribedText, setTranscribedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allDays, setAllDays] = useState<any[]>([]);
  const [chartTypeConfigs, setChartTypeConfigs] = useState<
    Record<string, { chartType: chartTypes }>
  >({});
  const [isFetchingDays, setIsFetchingDays] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0); // Use to refetch data if needed
  const [isVisible, setIsVisible] = useState(false); // For chart animations

  useEffect(() => {
    // Slight delay before showing content for a smoother animation
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Fetches the last 7 days' schemas and the chart type configs from the database
   * This effect re-runs whenever refreshFlag changes (to re-fetch updated data).
   */
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingDays(true);
      try {
        // 1. Fetch last 7 days
        const daysResponse = await fetch("/api/db/getLast7Days", {
          method: "GET",
        });
        const daysData = await daysResponse.json();
        if (daysResponse.ok) {
          setAllDays(daysData.days);
        } else {
          console.error("Error fetching last 7 days:", daysData.error);
          toast.error("Error fetching last 7 days' schemas: " + daysData.error);
        }

        // 2. Fetch chart type configs
        const chartConfigResponse = await fetch("/api/db/getChartTypeConfigs", {
          method: "GET",
        });
        const chartConfigData = await chartConfigResponse.json();
        if (chartConfigResponse.ok) {
          // Convert the array of configs into a key -> { chartType } mapping
          const configMap: Record<string, { chartType: chartTypes }> = {};
          chartConfigData.chartTypeConfigs.forEach((config: any) => {
            // Example config record: { keyName: "money_spent", chartType: "Bar" }
            configMap[config.keyName] = {
              chartType: config.chartType,
            };
          });
          setChartTypeConfigs(configMap);
        } else {
          console.error(
            "Error fetching chart type configs:",
            chartConfigData.error,
          );
          toast.error(
            "Error fetching chart type configurations: " +
              chartConfigData.error,
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("An error occurred while fetching data.");
      } finally {
        setIsFetchingDays(false);
      }
    };

    fetchData();
  }, [refreshFlag]);

  /**
   * Submits the current day schema to the server
   */
  const submitCurrentDaySchema = async () => {
    if (!transcribedText) {
      console.error("No transcribed text available.");
      toast.error("No transcribed text available.");
      return;
    }
  
    try {
      setIsLoading(true);
      const response = await fetch("/api/db/processAndSaveDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userDescription: transcribedText,
          date: new Date().toISOString().split('T')[0]
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error("Error:", data.error);
        toast.error("Error: " + data.error);
        return;
      }
  
      // Handle chart configuration changes
      if (data.chartChanges?.length > 0) {
        setChartTypeConfigs(prev => ({
          ...prev,
          ...Object.fromEntries(
            data.chartChanges.map(({ key, chartType }: { key: string, chartType: chartTypes }) => 
              [key, { chartType }]
            )
          )
        }));
        toast.success(`Updated ${data.chartChanges.length} chart type(s)`);
      }
  
      // Handle data updates
      if (data.updatedDays?.length > 0) {
        setAllDays(prev => {
          const newDays = [...prev];
          
          data.updatedDays.forEach((updatedDay: any) => {
            const existingIndex = newDays.findIndex(d => d.date === updatedDay.date);
            
            if (existingIndex > -1) {
              // Merge updates with existing day
              newDays[existingIndex] = {
                ...newDays[existingIndex],
                daySchema: {
                  ...newDays[existingIndex].daySchema,
                  ...updatedDay.daySchema
                }
              };
            } else {
              // Add new day and sort chronologically
              newDays.push(updatedDay);
              newDays.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
            }
          });
  
          return newDays;
        });
  
        const actionMessage = data.updatedDays.length === 1 
          ? "Day updated successfully!" 
          : `${data.updatedDays.length} days updated!`;
        
        toast.success(actionMessage);
      }
  
      // Handle new chart configurations from automatic recommendations
      if (data.updatedKeys?.length > 0 && data.chartConfig) {
        setChartTypeConfigs(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data.chartConfig).map(([key, cType]) => [
              key, 
              { chartType: cType as chartTypes }
            ])
          )
        }));
      }
  
      setTranscribedText("");
  
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("An error occurred while processing your request");
    } finally {
      setIsLoading(false);
    }
  };
  
  
  

  /**
   * Utility function to identify which keys to visualize,
   * e.g., those that appear at least 4 times out of the last 7 days
   */
  const getKeysToVisualize = () => {
    const keyCount: { [key: string]: number } = {};

    // Count the occurrence of each key in the last 7 days
    allDays.forEach((day) => {
      Object.keys(day.daySchema).forEach((key) => {
        keyCount[key] = (keyCount[key] || 0) + 1;
      });
    });

    // Example logic: show if key appears in at least 4 out of 7 days
    return Object.keys(keyCount).filter((key) => keyCount[key]! >= 0);
  };

  /**
 * Returns an array of 7 data points for the last 7 days from "today" (including today).
 * Each data point has { date: string, value: number, goal?: number }.
 * The date label is:
 *   - "today" for i=0,
 *   - "yesterday" for i=1,
 *   - weekday name (e.g., "Saturday") for i >= 2
 */
const prepareChartData = (key: string) => {
  // We'll build an array from 6 days ago up to "today"
  // so the final array is in chronological order from oldest to newest.
  const results: Array<{ date: string; value: number; goal?: number }> = [];

  for (let i = 6; i >= 0; i--) {
    // Create a date for "today - i days"
    const d = new Date();
    d.setDate(d.getDate() - i);

    // Format an ISO string "YYYY-MM-DD" for comparing to day.date in allDays
    const isoStr = d.toISOString().split("T")[0];

    // Label logic: i=0 => "today", i=1 => "yesterday", else => weekday
    let label: string;
    if (i === 0) {
      label = "today";
    } else if (i === 1) {
      label = "yesterday";
    } else {
      label = format(d, "eeee"); // e.g., "Saturday"
    }

    // See if we have data in allDays for isoStr
    const foundDay = allDays.find((day) => day.date === isoStr);

    let val = 0;
    let g: number | undefined = undefined;
    if (foundDay?.daySchema?.[key]) {
      val = foundDay.daySchema[key].value ?? 0;
      g = foundDay.daySchema[key].goal;
    }

    results.push({
      date: label, // or isoStr if you prefer the chart's x-axis to show "today" / "Saturday" / etc.
      value: val,
      goal: g,
    });
  }

  return results;
};

  /**
   * Retrieve the single chart type for a given key.
   * If none found, default to "Line".
   */
  const getChartTypeForKey = (key: string): chartTypes => {
    const config = chartTypeConfigs[key];
    return config?.chartType || "Line";
  };

  // Final list of keys we want to visualize
  const keysToVisualize = getKeysToVisualize();

  return (
    <div className="container relative mx-auto flex min-h-screen px-4 py-4 text-foreground">
      {/* Draggable Pop-Out for User Input */}
      <DraggablePopOut
        transcribedText={transcribedText}
        setTranscribedText={setTranscribedText}
        isLoading={isLoading}
        submitCurrentDaySchema={submitCurrentDaySchema}
      />

      {/* Toast Notifications */}
      <Toaster richColors />

      {/* Main Content */}
      <div className="mt-12">
        <h3 className="mb-8 text-3xl font-bold text-gray-800 dark:text-gray-200">
          Your Productivity Dashboard
        </h3>
        {isFetchingDays ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">
              Fetching previous schemas...
            </span>
          </div>
        ) : keysToVisualize.length > 0 ? (
          <div className="grid grid-cols-1 gap-[80px] sm:grid-cols-2 lg:grid-cols-3">
            {keysToVisualize.map((key, index) => {
              const chartType = getChartTypeForKey(key);
              const ChartComponent = chartComponents[chartType];
              if (!ChartComponent) {
                console.error(
                  `No chart component found for chart type: ${chartType}`,
                );
                return null;
              }

              const chartData = prepareChartData(key);
              return (
                <motion.div
                  key={key}
                  className="h-[400px] w-[400px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <ChartComponent keyName={key} chartData={chartData} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            No data available for visualization.
          </p>
        )}
      </div>
    </div>
  );
}
