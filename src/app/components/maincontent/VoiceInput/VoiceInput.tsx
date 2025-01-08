// components/VoiceInput.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import DynamicLineChart from "../../charts/DynamicLineChart";
import DynamicBarChart from "../../charts/DynamicBarChart";

export default function VoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allDays, setAllDays] = useState<any[]>([]); // Holds all previous day schemas
  const [chartTypeConfigs, setChartTypeConfigs] = useState<any>({}); // Holds chart type counts
  const [isFetchingDays, setIsFetchingDays] = useState(false); // Loading state for fetching days

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
          alert("Error fetching last 7 days' schemas: " + daysData.error);
        }

        // Fetch chart type configs
        const chartConfigResponse = await fetch("/api/db/getChartTypeConfigs", {
          method: "GET",
        });
        const chartConfigData = await chartConfigResponse.json();
        if (chartConfigResponse.ok) {
          // Convert array to key-value map for easy access
          const configMap: {
            [key: string]: { lineCount: number; barCount: number };
          } = {};
          chartConfigData.chartTypeConfigs.forEach((config: any) => {
            configMap[config.keyName] = {
              lineCount: config.lineCount,
              barCount: config.barCount,
            };
          });
          setChartTypeConfigs(configMap);
        } else {
          console.error(
            "Error fetching chart type configs:",
            chartConfigData.error,
          );
          alert(
            "Error fetching chart type configurations: " +
              chartConfigData.error,
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("An error occurred while fetching data.");
      } finally {
        setIsFetchingDays(false);
      }
    };

    fetchData();
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const submitCurrentDaySchema = async () => {
    console.log("yo ah ran thru");
    if (!transcribedText) {
      console.error("No transcribed text available.");
      alert("No transcribed text available.");
      return;
    }

    const today = new Date();
    const dateInt = 2;
    //   today.getFullYear() * 10000 +
    //   (today.getMonth() + 1) * 100 +
    //   today.getDate(); // Format: YYYYMMDD

    try {
      const response = await fetch("/api/db/processAndSaveDay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userDescription: transcribedText,
          date: dateInt, // Dynamically set the date
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Day schema generated and saved successfully:", data.day);

        // Refresh the list of all days
        setAllDays((prevDays) => [...prevDays, data.day]);

        // Update chartTypeConfigs based on the new day's chartConfig
        const newChartConfig = data.chartConfig;

        if (newChartConfig) {
          const updatedConfig = { ...chartTypeConfigs };
          const configEntries = Object.entries(
            newChartConfig as Record<string, string>,
          );
          configEntries.forEach(([key, chartType]) => {
            if (chartType === "Line" || chartType === "Bar") {
              if (updatedConfig[key]) {
                if (chartType === "Line") {
                  updatedConfig[key].lineCount += 1;
                } else if (chartType === "Bar") {
                  updatedConfig[key].barCount += 1;
                }
              } else {
                updatedConfig[key] = {
                  lineCount: chartType === "Line" ? 1 : 0,
                  barCount: chartType === "Bar" ? 1 : 0,
                };
              }
            }
          });

          setChartTypeConfigs(updatedConfig);
        }

        //setTranscribedText(""); // Clear the transcribed text
      } else {
        console.error("Error processing and saving day schema:", data.error);
        alert("Error processing and saving day schema: " + data.error);
      }
    } catch (error) {
      console.error("Error processing and saving day schemaaa:", error);
      alert("An error occurred while processing and saving the day schema.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      analyser.fftSize = 2048;

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        await sendAudioForTranscription(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscribedText("Recording... Describe your day!");
      drawAudioWaves();
    } catch (error) {
      console.error("Error starting recording:", error);
      alert(
        "Failed to start recording. Please check your microphone settings.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    cancelAnimationFrame(animationFrameRef.current!);
    setIsRecording(false);
    setTranscribedText("Processing your recording...");
  };

  const drawAudioWaves = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const canvasCtx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "#f3f4f6";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "#3b82f6";
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i]! / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const sendAudioForTranscription = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("mediaFile", audioBlob, "recording.webm");

      const response = await fetch("/api/assemblyai/transcription", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setTranscribedText(
          data.transcriptText || "No transcription available.",
        );
      } else {
        setTranscribedText(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending audio for transcription:", error);
      setTranscribedText("Failed to process transcription. Please try again.");
    } finally {
      setIsLoading(false);
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
  const getChartType = (key: string): "Line" | "Bar" | null => {
    const config = chartTypeConfigs[key];
    if (config) {
      if (config.lineCount > config.barCount) {
        return "Line";
      } else if (config.barCount > config.lineCount) {
        return "Bar";
      } else {
        // If counts are equal, default to Line
        return "Line";
      }
    }
    return null; // Undefined if no config found
  };

  return (
    <div className="mx-auto w-full space-y-4 p-6">
      <div className="mx-auto max-w-md">
        <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-200">
          Describe Your Day
        </h2>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="h-32 w-full rounded-md border bg-gray-100"
          ></canvas>
          <Textarea
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            placeholder="Your transcribed text will appear here..."
            className="mt-4 min-h-[200px] resize-none p-4 text-lg leading-relaxed"
            disabled={isRecording || isLoading}
          />
          {isLoading && (
            <div className="absolute right-2 top-2 flex items-center space-x-2 text-green-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center space-x-4">
        <Button
          onClick={toggleRecording}
          className={`rounded-full px-6 py-3 transition-all duration-300 ease-in-out ${
            isRecording
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isRecording ? (
            <MicOff className="mr-2 h-6 w-6" />
          ) : (
            <Mic className="mr-2 h-6 w-6" />
          )}
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>
        <Button
          onClick={submitCurrentDaySchema}
          className="rounded-full bg-green-500 px-6 py-3 text-white hover:bg-green-600"
        >
          Generate Day JSON
        </Button>
      </div>

      {/* <div className="mt-8">
        <h3 className="text-center text-lg font-semibold">
          Previous Days' Schemas
        </h3>
        {isFetchingDays ? (
          <div className="mt-4 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">
              Fetching previous schemas...
            </span>
          </div>
        ) : allDays.length > 0 ? (
          <div className="mt-4 grid w-max grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allDays.map((day) => (
              <div
                key={day.id}
                className="rounded-md border bg-white p-4 shadow"
              >
                <h4 className="mb-2 font-semibold">Day {day.date}</h4>
                <pre className="overflow-auto text-sm">
                  {JSON.stringify(day.daySchema, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-center text-gray-500">
            No previous day schemas found.
          </p>
        )}
      </div> */}
      {/* Render Charts for qualifying keys */}
      {keysToVisualize.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-8 text-center text-lg font-semibold">
            Last 7 Days' Trends
          </h3>
          <div className="ml-[200px] flex gap-5">
            {keysToVisualize.map((key) => {
              const chartType = getChartType(key);
              const chartData = prepareChartData(key);
              if (chartType === "Line") {
                return (
                  <DynamicLineChart
                    key={key}
                    keyName={key}
                    chartData={chartData}
                  />
                );
              } else if (chartType === "Bar") {
                return (
                  <DynamicBarChart
                    key={key}
                    keyName={key}
                    chartData={chartData}
                  />
                );
              } else {
                // Default to LineChart if chartType is undefined
                return (
                  <DynamicLineChart
                    key={key}
                    keyName={key}
                    chartData={chartData}
                  />
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
}
