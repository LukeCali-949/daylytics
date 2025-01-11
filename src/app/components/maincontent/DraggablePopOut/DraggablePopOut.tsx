// components/DraggablePopOut.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { Mic, MicOff, Loader2, Plus, Minus } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";

interface DraggablePopOutProps {
  transcribedText: string;
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  submitCurrentDaySchema: () => void;
}

const DraggablePopOut: React.FC<DraggablePopOutProps> = ({
  transcribedText,
  setTranscribedText,
  isLoading,
  submitCurrentDaySchema,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
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
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
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

      canvasCtx.fillStyle = "#f3f4f6"; // Tailwind gray-100
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "#3b82f6"; // Tailwind blue-500
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
    }
  };

  return (
    <Rnd
      size={{
        width: isMinimized ? 400 : 400,
        height: isMinimized ? 50 : 400,
      }}
      default={{
        x: 100,
        y: 100,
        width: 400, // Add width
        height: 300, // Add height
      }}
      minWidth={300}
      minHeight={50}
      bounds="window"
      dragHandleClassName="drag-handle"
      enableResizing={!isMinimized}
      //disableDragging={isMinimized}
      className="z-50 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="drag-handle flex cursor-move items-center justify-between bg-gray-200 p-2 dark:bg-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Describe Your Day
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded p-1 hover:bg-gray-300 dark:hover:bg-gray-600"
              aria-label={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? (
                <Plus className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              ) : (
                <Minus className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="flex h-full flex-col p-4">
            {/* Audio Visualizer */}
            <canvas
              ref={canvasRef}
              width={400}
              height={100}
              className="h-24 w-full rounded-md border bg-gray-100"
            ></canvas>

            <Textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              placeholder="Your transcribed text will appear here..."
              className="mt-4 min-h-[100px] resize-none p-2 text-sm leading-relaxed"
              disabled={isRecording || isLoading}
            />
            {isLoading && (
              <div className="mt-2 flex items-center space-x-2 text-green-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}
            <div className="mt-4 flex justify-between">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  toggleRecording();
                }}
                className={`flex items-center space-x-2 rounded-full px-4 py-2 transition-all duration-300 ease-in-out ${
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span>
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </span>
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  submitCurrentDaySchema();
                }}
                className="flex items-center space-x-2 rounded-full bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              >
                <span>Submit</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Rnd>
  );
};

export default DraggablePopOut;
