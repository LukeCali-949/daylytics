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

    // For demonstration purposes, using a static date or a calculated date
    const today = new Date();
    const dateInt = 2;

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
      if (response.ok) {
        console.log("Day schema processed successfully:", data.day);

        // If chartConfig exists, this means a new day was created
        // with newly generated chart types.
        if (data.chartConfig) {
          toast.success("Day schema generated and saved successfully!");
          setAllDays((prevDays) => [...prevDays, data.day]);

          // Merge the newly assigned chart types into chartTypeConfigs
          if (typeof data.chartConfig === "object") {
            const newChartConfig = data.chartConfig as Record<string, string>;
            const updatedConfigs = { ...chartTypeConfigs };
            for (const [key, cType] of Object.entries(newChartConfig)) {
              // cType could be "Line", "Bar", or "Pie"
              // Only set if not already present (or you can overwrite if desired)
              if (!updatedConfigs[key]) {
                updatedConfigs[key] = {
                  chartType: cType as chartTypes,
                };
              }
            }
            setChartTypeConfigs(updatedConfigs);
          }
        } else {
          // If no chartConfig in the response, that means
          // an existing day was updated
          toast.success("Day schema updated successfully!");
          // Trigger re-fetch if needed
          setRefreshFlag((f) => f + 1);

          setAllDays((prevDays) =>
            prevDays.map((day) =>
              day.date === data.day.date ? data.day : day,
            ),
          );
        }

        setTranscribedText(""); // Clear the transcribed text
      } else {
        console.error("Error processing and saving day schema:", data.error);
        toast.error("Error processing and saving day schema: " + data.error);
      }
    } catch (error) {
      console.error("Error processing and saving day schema:", error);
      toast.error(
        "An error occurred while processing and saving the day schema.",
      );
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
