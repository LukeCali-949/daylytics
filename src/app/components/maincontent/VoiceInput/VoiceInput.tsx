"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { RealtimeTranscriber } from "assemblyai";

// Define types for transcript messages if not already defined
interface TranscriptMessage {
  text: string;
  words: Array<{ start: number; end: number; text: string }>;
}

export default function VoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const transcriberRef = useRef<RealtimeTranscriber | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const toggleRecording = async () => {
    if (!isRecording) {
      // Start Recording
      try {
        // Request microphone access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = mediaStream;

        // Fetch the temporary token from the server
        const response = await fetch("/api/assemblyai/token", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch AssemblyAI token.");
        }

        const data = await response.json();
        const token = data.token;

        // Initialize the real-time transcriber
        const transcriber = new RealtimeTranscriber({ token });
        transcriberRef.current = transcriber;

        // Set up event handlers
        transcriber.on("open", ({ sessionId, expiresAt }) => {
          console.log("Session ID:", sessionId, "Expires at:", expiresAt);
        });

        transcriber.on("close", (code: number, reason: string) => {
          console.log("Connection closed:", code, reason);
        });

        transcriber.on("transcript", (transcript: TranscriptMessage) => {
          setTranscribedText((prev) => prev + " " + transcript.text);
        });

        transcriber.on(
          "transcript.partial",
          (transcript: Partial<TranscriptMessage>) => {
            // Optionally handle partial transcripts
            console.log("Partial transcript:", transcript);
          },
        );

        transcriber.on("transcript.final", (transcript: TranscriptMessage) => {
          console.log("Final transcript:", transcript);
        });

        transcriber.on("error", (error: Error) => {
          console.error("Transcription error:", error);
          setIsRecording(false);
        });

        // Connect to AssemblyAI
        await transcriber.connect();

        // Initialize MediaRecorder to capture audio chunks
        const mediaRecorder = new MediaRecorder(mediaStream, {
          mimeType: "audio/webm",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && transcriberRef.current) {
            event.data.arrayBuffer().then((arrayBuffer) => {
              const uint8Array = new Uint8Array(arrayBuffer);
              transcriberRef.current?.sendAudio(uint8Array);
            });
          }
        };

        mediaRecorder.onstop = async () => {
          if (transcriberRef.current) {
            await transcriberRef.current.close();
          }
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          }
        };

        // Start recording
        mediaRecorder.start(250); // Send audio data in 250ms chunks

        setIsRecording(true);
        setTranscribedText("Listening to your day's description...");
      } catch (error: any) {
        console.error("Error starting recording:", error);
        setTranscribedText(
          "Error accessing microphone or starting transcription.",
        );
      }
    } else {
      // Stop Recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setTranscribedText("Thanks for sharing your day!");
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-6">
      <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-200">
        Describe Your Day
      </h2>
      <div className="relative">
        <Textarea
          value={transcribedText}
          onChange={(e) => setTranscribedText(e.target.value)}
          placeholder="Your transcribed text will appear here..."
          className="min-h-[200px] resize-none p-4 text-lg leading-relaxed"
          disabled={isRecording}
        />
        {isRecording && (
          <div className="absolute right-2 top-2 flex items-center space-x-2 text-blue-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}
      </div>
      <div className="flex justify-center">
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
      </div>
    </div>
  );
}
