// app/dashboard/page.tsx
"use client";

import { Card } from "~/components/ui/card";
import { Sidebar } from "./chat-window";
import { ScrollArea } from "~/components/ui/scrollarea";
import { Navbar } from "./navbar";
import { chartComponents } from "../../charts/chartRegistry";
import { buildContinuousData } from "~/app/utils/utilFunctions";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [allDays, setAllDays] = useState<any[]>([]);
  const [chartTypeConfigs, setChartTypeConfigs] = useState<Record<string, { chartType: string }>>({});
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const [daysResponse, chartConfigResponse] = await Promise.all([
          fetch(`/api/db/getAllDays?refresh=${Date.now()}`),
          fetch("/api/db/getChartTypeConfigs")
        ]);

        if (isMounted) {
          if (daysResponse.ok) {
            const daysData = await daysResponse.json();
            setAllDays(daysData.days);
          }
          if (chartConfigResponse.ok) {
            const chartConfigData = await chartConfigResponse.json();
            setChartTypeConfigs(
              chartConfigData.chartTypeConfigs.reduce((acc: any, config: any) => ({
                ...acc,
                [config.keyName]: { chartType: config.chartType }
              }), {})
            );
          }
        }
      } catch (error) {
        toast.error("Error fetching data");
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [refreshFlag]);

  const keysToVisualize = Array.from(new Set(
    allDays.flatMap(day => Object.keys(day.daySchema))
  )).filter(key => {
    const count = allDays.filter(day => day.daySchema[key]).length;
    return count >= 0;
  });

  const getChartTypeForKey = (key: string) => chartTypeConfigs[key]?.chartType || "Line";
  const getChartData = (key: string) => buildContinuousData(allDays, key);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1">
        <div className="flex-1 flex">
          <ScrollArea className="flex-1 p-8">
            <div className="mx-auto max-w-[1052px] space-y-8">
              {/* Top Row - 4 equal squares */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {keysToVisualize.slice(0, 4).map((key, i) => (
                  <ChartCard 
                    key={key}
                    index={i}
                    chartKey={key}
                    chartType={getChartTypeForKey(key)}
                    chartData={getChartData(key)}
                  />
                ))}
                {Array.from({
                  length: Math.max(0, 4 - keysToVisualize.length)
                }).map((_, i) => (
                  <PlaceholderCard key={`placeholder-${i}`} index={i} />
                ))}
              </div>

              {/* Middle Row - 1 wide rectangle + 2 squares */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  {keysToVisualize[4] ? (
                    <WideChartCard
                      key={keysToVisualize[4]}
                      chartKey={keysToVisualize[4]}
                      chartType={getChartTypeForKey(keysToVisualize[4])}
                      chartData={getChartData(keysToVisualize[4])}
                    />
                  ) : (
                    <PlaceholderWideCard label="Wide Chart 1" />
                  )}
                </div>
                
                {keysToVisualize.slice(5, 7).map((key, i) => (
                  <ChartCard
                    key={key}
                    index={5 + i}
                    chartKey={key}
                    chartType={getChartTypeForKey(key)}
                    chartData={getChartData(key)}
                  />
                ))}
                {Array.from({
                  length: Math.max(0, 2 - (keysToVisualize.length - 5))
                }).map((_, i) => (
                  <PlaceholderCard key={`placeholder-5-${i}`} index={5 + i} />
                ))}
              </div>

              {/* Bottom Row - 1 square + 2 wide rectangles */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {keysToVisualize.slice(7, 8).map((key, i) => (
                  <ChartCard
                    key={key}
                    index={7 + i}
                    chartKey={key}
                    chartType={getChartTypeForKey(key)}
                    chartData={getChartData(key)}
                  />
                ))}
                {Array.from({
                  length: Math.max(0, 1 - (keysToVisualize.length - 7))
                }).map((_, i) => (
                  <PlaceholderCard key={`placeholder-7-${i}`} index={7 + i} />
                ))}

                <div className="lg:col-span-2">
                  {keysToVisualize[8] ? (
                    <WideChartCard
                      key={keysToVisualize[8]}
                      chartKey={keysToVisualize[8]}
                      chartType={getChartTypeForKey(keysToVisualize[8])}
                      chartData={getChartData(keysToVisualize[8])}
                    />
                  ) : (
                    <PlaceholderWideCard label="Wide Chart 2" />
                  )}
                </div>

                <div className="lg:col-span-2">
                  {keysToVisualize[9] ? (
                    <WideChartCard
                      key={keysToVisualize[9]}
                      chartKey={keysToVisualize[9]}
                      chartType={getChartTypeForKey(keysToVisualize[9])}
                      chartData={getChartData(keysToVisualize[9])}
                    />
                  ) : (
                    <PlaceholderWideCard label="Wide Chart 3" />
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <Sidebar 
            className="border-l dark:border-white/20"
            onSubmit={async (message) => {
              try {
                const response = await fetch("/api/db/processAndSaveDay", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userDescription: message,
                    date: new Date().toISOString().split('T')[0]
                  }),
                });
                
                if (response.ok) {
                  setRefreshFlag(prev => prev + 1);
                  toast.success("Data updated successfully");
                }
              } catch (error) {
                toast.error("Update failed");
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Chart Card Components (remain the same)
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

const PlaceholderCard = ({ index }: { index: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative w-full pt-[100%]"
  >
    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
      <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chart {index + 1}</p>
      </div>
    </Card>
  </motion.div>
);

const PlaceholderWideCard = ({ label }: { label: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative w-full pt-[50%]"
  >
    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
      <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  </motion.div>
);