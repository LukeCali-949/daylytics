"use client";

import { Card } from "~/components/ui/card";
import { Sidebar } from "./chat-window";
import { ScrollArea } from "~/components/ui/scrollarea";
import { Navbar } from "./navbar";
import { chartComponents } from "../../charts/chartRegistry";
import { buildContinuousData } from "~/app/utils/utilFunctions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { initializeLocalStorage } from "~/app/utils/localStorageHelpers";

interface ChartConfig {
  keyName: string;
  chartType: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DayUpdate {
  date: string;
  key: string;
  value: number;
  goal?: number;
}

interface Day {
  date: string;
  daySchema: Record<string, any>;
}

export default function DashboardPage() {
  const [allDays, setAllDays] = useState<any[]>([]);
  const [chartTypeConfigs, setChartTypeConfigs] = useState<Record<string, { chartType: string }>>({});
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);

  // New deletion state – separate for each row/slot type:
  const [deletedTop, setDeletedTop] = useState(0);
  const [deletedMiddleWide, setDeletedMiddleWide] = useState(0);
  const [deletedMiddleSquares, setDeletedMiddleSquares] = useState(0);
  const [deletedBottom, setDeletedBottom] = useState(0);
  const [deletedBottomWide, setDeletedBottomWide] = useState(0);

  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();

  // Data fetching with proper cleanup
  useEffect(() => {
    const loadData = async () => {
      setIsFetching(true);
      try {
        if (isSignedIn) {
          // Authenticated - fetch from API
          const [daysRes, configRes, conversationRes] = await Promise.all([
            fetch(`/api/db/getAllDays?refresh=${Date.now()}`),
            fetch("/api/db/getChartTypeConfigs"),
            fetch("/api/db/getConversationHistory")  // Fetch conversation
          ]);

          const daysData = await daysRes.json();
          const configData = await configRes.json();
          const conversationData = await conversationRes.json();

          setAllDays(daysData.days);
          setChartTypeConfigs(
            configData.chartTypeConfigs.reduce((acc: Record<string, { chartType: string }>, config: ChartConfig) => ({
              ...acc,
              [config.keyName]: { chartType: config.chartType }
            }), {})
          );
          setConversation(conversationData.messages || []);
        } else {
          // Unauthenticated - load from localStorage
          const localDays = localStorage.getItem('demo_days');
          const days = localDays ? JSON.parse(localDays) : [];
          setAllDays(days);

          // Load chart configs from localStorage or use defaults
          const localConfigs = localStorage.getItem('demo_chart_configs');
          const demoConfigs = localConfigs ? JSON.parse(localConfigs) : {
            programming_hours: { chartType: "ProgressBar" },
            exercise_hours: { chartType: "Bar" },
            sleep_hours: { chartType: "Line" },
            reading_hours: { chartType: "ProgressCircle" }
          };
          setChartTypeConfigs(demoConfigs);

          // Load conversation from localStorage
          const localConversation = localStorage.getItem('demo_conversation');
          const conversationData = localConversation ? JSON.parse(localConversation) : [];
          setConversation(conversationData);
        }
      } catch (error) {
        toast.error("Error loading data");
      } finally {
        setIsFetching(false);
      }
    };

    loadData();
  }, [isSignedIn, refreshFlag]);

  useEffect(() => {
    if (!isSignedIn) {
      initializeLocalStorage();
    }
  }, [isSignedIn]);

  // Save handler for both auth states
  const handleSave = async (message: string) => {
    console.log("Saving data...");

    const newMessage: Message = { role: "user", content: message };
    const updatedConversation = [...conversation, newMessage];
    setConversation(updatedConversation);

    try {
      const date = new Date().toISOString().split("T")[0];

      if (isSignedIn) {
        // Authenticated save
        const response = await fetch("/api/db/processAndSaveDay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userDescription: message, date })
        });

        if (response.ok) {
          setRefreshFlag(prev => prev + 1);
          toast.success("Data updated successfully");
        }
      } else {
        // Unauthenticated (demo) save:
        const date = new Date().toISOString().split("T")[0];

        const response = await fetch("/api/signedoutprocessAndSaveDay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userDescription: message,
            date,
            conversation: JSON.parse(localStorage.getItem("demo_conversation") || "[]"),
            cumulativeSchema: JSON.parse(localStorage.getItem("demo_cumulativeSchema") || "{}")
          })
        });

        const result = await response.json();

        // Store results back into localStorage
        localStorage.setItem("demo_conversation", JSON.stringify(result.updatedConversation));
        localStorage.setItem("demo_cumulativeSchema", JSON.stringify(result.cumulativeSchemaUpdates));

        // Merge day updates into demo_days
        const localDays = JSON.parse(localStorage.getItem("demo_days") || "[]");
        result.updates.forEach((update: DayUpdate) => {
          // Build the update data to match the expected structure
          const updateData = update.goal !== undefined 
            ? { value: update.value, goal: update.goal }
            : { value: update.value };

          const existingDay = localDays.find((day: Day) => day.date === update.date);
          if (existingDay) {
            existingDay.daySchema = { ...existingDay.daySchema, [update.key]: updateData };
          } else {
            localDays.push({
              date: update.date,
              daySchema: { [update.key]: updateData }
            });
          }
        });
        localStorage.setItem("demo_days", JSON.stringify(localDays));

       // Store chart type configurations
        const demoChartConfigs = JSON.parse(localStorage.getItem("demo_chart_configs") || "{}");
        const updatedConfigs = result.chartChanges.reduce((acc: any, change: { key: string; chartType: string }) => {
          acc[change.key] = { chartType: change.chartType };
          return acc;
        }, {});
        Object.assign(demoChartConfigs, updatedConfigs);
        localStorage.setItem("demo_chart_configs", JSON.stringify(demoChartConfigs));


        toast.success("Demo data updated");
        // Update the refresh flag so that charts re-render like for signed-in users.
        setRefreshFlag(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Save failed");
    }
  };

  // Create a stable list of keys (the metrics) to visualize.
  const keysToVisualize = Array.from(new Set(
    allDays.flatMap((day: any) => Object.keys(day.daySchema))
  )).filter((key) => {
    const count = allDays.filter((day: any) => day.daySchema[key]).length;
    return count >= 0;
  });

  const getChartTypeForKey = (key: string) => chartTypeConfigs[key]?.chartType || "Line";
  const getChartData = (key: string) => buildContinuousData(allDays, key);

  // --- Top Row (4 slots) ---
  const topRowTarget = 4 - deletedTop;
  const topCharts = keysToVisualize.slice(0, 4);
  const topPlaceholdersCount = Math.max(0, topRowTarget - topCharts.length);

  // --- Middle Row ---
  // Left (wide) slot: key at index 4.
  const middleWideChart = keysToVisualize[4];
  // Right (square) slots: target is 2 minus deletedMiddleSquares.
  const middleSquareTarget = 2 - deletedMiddleSquares;
  // Instead of always slicing indices 5–7, we slice only as many as the target requires.
  const middleSquareCharts = keysToVisualize.slice(5, 5 + middleSquareTarget);
  const middleSquarePlaceholdersCount = Math.max(0, middleSquareTarget - middleSquareCharts.length);
  // For the wide slot, if no key exists and it hasn't been deleted, we show the placeholder.
  const showMiddleWidePlaceholder = !middleWideChart && deletedMiddleWide === 0;

  // --- Bottom Row ---
  // Square charts from indices 7 and 8
  const bottomCharts = keysToVisualize.slice(7, 9);
  const bottomRowTarget = 2 - deletedBottom;
  const bottomPlaceholdersCount = Math.max(0, bottomRowTarget - bottomCharts.length);
  // Wide chart for bottom row is from index 9
  const hasBottomWideChart = !!keysToVisualize[9];
  const showBottomWidePlaceholder = !hasBottomWideChart && deletedBottomWide === 0;

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1">
        <div className="flex-1 flex">
          <ScrollArea className="flex-1 p-8">
            <div className="mx-auto max-w-[1052px] space-y-8">
              {/* Top Row - 4 equal squares */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {topCharts.map((key, i) => (
                  <ChartCard
                    key={key}
                    index={i}
                    chartKey={key}
                    chartType={getChartTypeForKey(key)}
                    chartData={getChartData(key)}
                  />
                ))}
                {Array.from({ length: topPlaceholdersCount }).map((_, i) => (
                  <PlaceholderCard
                    key={`placeholder-top-${i}`}
                    index={i}
                    onDelete={() => setDeletedTop(prev => prev + 1)}
                  />
                ))}
              </div>

              {/* Middle Row - 1 wide rectangle (left) + 2 squares (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  {middleWideChart ? (
                    <WideChartCard
                      key={middleWideChart}
                      chartKey={middleWideChart}
                      chartType={getChartTypeForKey(middleWideChart)}
                      chartData={getChartData(middleWideChart)}
                    />
                  ) : (
                    showMiddleWidePlaceholder && (
                      <PlaceholderWideCard
                        label="Wide Chart 1"
                        onDelete={() => setDeletedMiddleWide(prev => prev + 1)}
                      />
                    )
                  )}
                </div>
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  {middleSquareCharts.map((key, i) => (
                    <ChartCard
                      key={key}
                      index={5 + i}
                      chartKey={key}
                      chartType={getChartTypeForKey(key)}
                      chartData={getChartData(key)}
                    />
                  ))}
                  {Array.from({ length: middleSquarePlaceholdersCount }).map((_, i) => (
                    <PlaceholderCard
                      key={`placeholder-middle-${i}`}
                      index={5 + i}
                      onDelete={() => setDeletedMiddleSquares(prev => prev + 1)}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom Row - 2 squares (each 1 column) + 1 wide rectangle (spanning 2 columns) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {bottomCharts.map((key, i) => (
                  <ChartCard
                    key={key}
                    index={7 + i}
                    chartKey={key}
                    chartType={getChartTypeForKey(key)}
                    chartData={getChartData(key)}
                  />
                ))}
                {Array.from({ length: bottomPlaceholdersCount }).map((_, i) => (
                  <PlaceholderCard
                    key={`placeholder-bottom-${i}`}
                    index={7 + i}
                    onDelete={() => setDeletedBottom(prev => prev + 1)}
                  />
                ))}
                <div className="md:col-span-2">
                  {keysToVisualize[9] ? (
                    <WideChartCard
                      key={keysToVisualize[9]}
                      chartKey={keysToVisualize[9]}
                      chartType={getChartTypeForKey(keysToVisualize[9])}
                      chartData={getChartData(keysToVisualize[9])}
                    />
                  ) : (
                    showBottomWidePlaceholder && (
                      <PlaceholderWideCard
                        label="Wide Chart 2"
                        onDelete={() => setDeletedBottomWide(prev => prev + 1)}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <Sidebar
            className="border-l dark:border-white/20"
            onSubmit={handleSave}
            initialConversation={conversation}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------- Chart Card Components ----------------

const ChartCard = ({ chartKey, chartType, chartData, index }: any) => {
  const ChartComponent = chartComponents[chartType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index }}
      className="relative w-full pt-[100%]"
    >
      <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
        {ChartComponent ? (
          <ChartComponent keyName={chartKey} chartData={chartData} />
        ) : (
          <div className="w-full h-full rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Invalid Chart Type</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

const WideChartCard = ({ chartKey, chartType, chartData }: any) => {
  const ChartComponent = chartComponents[chartType];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative w-full pt-[50%]"
    >
      <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
        {ChartComponent ? (
          <ChartComponent keyName={chartKey} chartData={chartData} />
        ) : (
          <div className="w-full h-full rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Invalid Chart Type</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

interface PlaceholderProps {
  index: number;
  onDelete?: () => void;
}

const PlaceholderCard = ({ index, onDelete }: PlaceholderProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative w-full pt-[100%] group"
  >
    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
      <div className="relative w-full h-full">
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-1 left-1 z-10 text-red-500 opacity-0 group-hover:opacity-100"
          >
            X
          </button>
        )}
        <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Chart {index + 1}</p>
        </div>
      </div>
    </Card>
  </motion.div>
);

interface PlaceholderWideProps {
  label: string;
  onDelete?: () => void;
}

const PlaceholderWideCard = ({ label, onDelete }: PlaceholderWideProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative w-full pt-[50%] group"
  >
    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
      <div className="relative w-full h-full">
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-1 left-1 z-10 text-red-500 opacity-0 group-hover:opacity-100"
          >
            X
          </button>
        )}
        <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  </motion.div>
);
