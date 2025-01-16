// components/VoiceInput.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import DraggablePopOut from "../DraggablePopOut/DraggablePopOut";
import { chartComponents } from "../../charts/chartRegistry";
import { toast } from "sonner";
import { Toaster } from "~/components/ui/sonner";
import { motion } from "framer-motion";

export default function VoiceInput() {
  const [transcribedText, setTranscribedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allDays, setAllDays] = useState<any[]>([]); // Holds all previous day schemas
  const [chartTypeConfigs, setChartTypeConfigs] = useState<any>({}); // Holds chart type counts
  const [isFetchingDays, setIsFetchingDays] = useState(false); // Loading state for fetching days
  const [count, setCount] = useState(0); // Loading state for fetching days

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch the last 7 days' schemas and chart type configs when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingDays(true);
      try {
        // Fetch last 7 days
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

        // Fetch chart type configs
        const chartConfigResponse = await fetch("/api/db/getChartTypeConfigs", {
          method: "GET",
        });
        const chartConfigData = await chartConfigResponse.json();
        if (chartConfigResponse.ok) {
          // Convert array to key-value map for easy access
          const configMap: {
            [key: string]: {
              lineCount: number;
              barCount: number;
              pieCount?: number;
            };
          } = {};
          chartConfigData.chartTypeConfigs.forEach((config: any) => {
            configMap[config.keyName] = {
              lineCount: config.lineCount,
              barCount: config.barCount,
              pieCount: config.pieCount || 0, // Initialize pieCount if not present
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
  }, [count]);

  const submitCurrentDaySchema = async () => {
    if (!transcribedText) {
      console.error("No transcribed text available.");
      toast.error("No transcribed text available.");
      return;
    }

    const today = new Date();
    const dateInt = 4;

    try {
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

        // Check if chartConfig exists in the response to distinguish creation vs. update
        if (data.chartConfig) {
          // New day created
          toast.success("Day schema generated and saved successfully!");
          setAllDays((prevDays) => [...prevDays, data.day]);

          const newChartConfig = data.chartConfig;
          if (newChartConfig && typeof newChartConfig === "object") {
            const updatedConfig = { ...chartTypeConfigs };
            const configEntries = Object.entries(
              newChartConfig as Record<string, string>,
            );
            configEntries.forEach(([key, chartType]) => {
              if (
                chartType === "Line" ||
                chartType === "Bar" ||
                chartType === "Pie"
              ) {
                if (updatedConfig[key]) {
                  if (chartType === "Line") {
                    updatedConfig[key].lineCount += 1;
                  } else if (chartType === "Bar") {
                    updatedConfig[key].barCount += 1;
                  } else if (chartType === "Pie") {
                    updatedConfig[key].pieCount =
                      (updatedConfig[key].pieCount || 0) + 1;
                  }
                } else {
                  updatedConfig[key] = {
                    lineCount: chartType === "Line" ? 1 : 0,
                    barCount: chartType === "Bar" ? 1 : 0,
                    pieCount: chartType === "Pie" ? 1 : 0,
                  };
                }
              }
            });
            setChartTypeConfigs(updatedConfig);
          }
        } else {
          // Existing day updated
          toast.success("Day schema updated successfully!");
          setCount((count) => count++);
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
    }
  };

  // Process the last 7 days to determine which keys to visualize
  const getKeysToVisualize = () => {
    const keyCount: { [key: string]: number } = {};

    // Count the occurrence of each key in the last 7 days
    allDays.forEach((day) => {
      Object.keys(day.daySchema).forEach((key) => {
        keyCount[key] = (keyCount[key] || 0) + 1;
      });
    });

    // Select keys that appear in at least 4 out of 7 days
    const selectedKeys = Object.keys(keyCount).filter(
      (key) => keyCount[key]! >= 4,
    );

    return selectedKeys;
  };

  // Prepare chart data for each selected key
  const prepareChartData = (key: string) => {
    return allDays.map((day) => ({
      date: `Day ${day.date}`,
      value:
        typeof day.daySchema[key]?.value === "number"
          ? day.daySchema[key].value
          : 0,
    }));
  };

  // Get the keys that qualify for visualization
  const keysToVisualize = getKeysToVisualize();

  // Function to determine chart type based on ChartTypeConfig
  const getChartType = (key: string): "Line" | "Bar" | "Pie" | null => {
    const config = chartTypeConfigs[key];
    if (config) {
      // Enhanced heuristic: Prefer Pie if pieCount is higher, then Line, then Bar
      if (config.pieCount && config.pieCount > 0) {
        return "Pie";
      } else if (config.lineCount > config.barCount) {
        return "Line";
      } else if (config.barCount > config.lineCount) {
        return "Bar";
      } else {
        return "Line"; // Default to Line if counts are equal or undefined
      }
    }
    return null; // Undefined if no config found
  };

  return (
    <div className="container mx-auto flex min-h-screen px-4 py-4 text-foreground">
      {/* Draggable Pop-Out for User Input */}
      <DraggablePopOut
        transcribedText={transcribedText}
        setTranscribedText={setTranscribedText}
        isLoading={isLoading}
        submitCurrentDaySchema={submitCurrentDaySchema}
      />
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
              const chartType = getChartType(key) || "Line"; // default if undefined
              const ChartComponent =
                chartComponents[chartType] || chartComponents["Line"]; // Fallback to Line chart

              if (!ChartComponent) {
                console.error(
                  `No chart component found for chart type: ${chartType}`,
                );
                return null; // Skip rendering if no valid chart component exists
              }
              const chartData = prepareChartData(key);
              return (
                <motion.div
                  key={key}
                  className="h-[400px] w-[400px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: isVisible ? 1 : 0,
                    y: isVisible ? 0 : 20,
                  }}
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
