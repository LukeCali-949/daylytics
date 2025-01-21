// components/VoiceInput.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import DraggablePopOut from "../DraggablePopOut/DraggablePopOut";
import { chartComponents } from "../../charts/chartRegistry";
import { toast } from "sonner";
import { Toaster } from "~/components/ui/sonner";
import { motion } from "framer-motion";

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
  
    const today = new Date();
    const dateInt = 3; // Example date
  
    try {
      setIsLoading(true);
      const response = await fetch("/api/db/processAndSaveDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userDescription: transcribedText,
          date: dateInt,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error("Error:", data.error);
        toast.error("Error: " + data.error);
        return;
      }
  
      // CASE A: Chart changes (unchanged from before)
      if (data.message && data.changes && Array.isArray(data.changes) && !data.day) {
        // multiple chart changes
        toast.success(data.message);
        setChartTypeConfigs((prevConfigs) => {
          const newConfigs = { ...prevConfigs };
          for (const change of data.changes) {
            const { key, chartType } = change;
            if (key && chartType) {
              newConfigs[key] = { chartType };
            }
          }
          return newConfigs;
        });
        setTranscribedText("");
        return;
      }
  
      // CASE B: Normal day schema flow or partial updates
      if (data.day) {
        // The route returns `updatedKeys` to show which keys changed, if any.
        const updatedKeys: string[] = data.updatedKeys || [];
  
        console.log("Day schema processed successfully:", data.day);
  
        // If there's chartConfig, it means a brand new day or newly generated chart types
        if (data.chartConfig) {
          toast.success("Day schema generated and saved successfully!");
          setAllDays((prevDays) => [...prevDays, data.day]);
  
          if (typeof data.chartConfig === "object") {
            const newChartConfig = data.chartConfig as Record<string, string>;
            const updatedConfigs = { ...chartTypeConfigs };
            for (const [key, cType] of Object.entries(newChartConfig)) {
              if (!updatedConfigs[key]) {
                updatedConfigs[key] = {
                  chartType: cType as chartTypes,
                };
              }
            }
            setChartTypeConfigs(updatedConfigs);
          }
        } else {
          // Partial update or existing day updated
          toast.success("Day schema updated successfully!");
  
          // No full data refresh. Instead, merge `day` into allDays
          setAllDays((prevDays) =>
            prevDays.map((oldDay) => {
              if (oldDay.date === data.day.date) {
                // Merge new day data if needed
                // But usually, data.day is the entire updated day doc,
                // so we can replace the entire object
                return data.day;
              }
              return oldDay;
            })
          );
  
          // If you want to do anything special with updatedKeys, do so here:
          if (updatedKeys.length > 0) {
            console.log("Keys that were updated:", updatedKeys);
            // Possibly show a custom toast or highlight changed charts
          }
        }
  
        setTranscribedText("");
        return;
      }
  
      // If we reach here, no recognizable data
      console.warn("Response returned with neither 'day' nor 'message'. Data:", data);
      toast("Request completed but no day or message provided.");
    } catch (error) {
      console.error("Error processing and saving day schema:", error);
      toast.error("An error occurred while processing and saving the day schema.");
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
   * Prepare data for the chosen chart. Usually each day is one data point.
   */
  const prepareChartData = (key: string) => {
    return allDays.map((day) => ({
      date: `Day ${day.date}`,
      value:
        typeof day.daySchema[key]?.value === "number"
          ? day.daySchema[key].value
          : 0,
      goal:
        typeof day.daySchema[key]?.goal === "number"
          ? day.daySchema[key]?.goal
          : undefined,
    }));
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
