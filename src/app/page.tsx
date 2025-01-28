"use client";
import Link from "next/link";
import { AssemblyAI } from "assemblyai";
import VoiceInput from "./components/maincontent/VoiceInput/VoiceInput";
import { Button } from "~/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Vortex } from "~/components/ui/ace/vortex";
import DashboardPage from "./components/maincontent/Dashboard/page";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY as string,
});

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };
  return (
    <div className="flex flex-col h-screen">
      <header className="border-b flex-none">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">Daylytics</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, User</span>
            <Button variant="outline" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>
      
      <Vortex
        rangeY={800}
        rangeSpeed={1}
        particleCount={500}
        baseHue={120}
        className="flex-grow overflow-hidden"
      >
        <DashboardPage />
      </Vortex>
      {/* <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">Daylytics</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, User</span>
            <Button variant="outline" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? (
                <SunIcon className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <MoonIcon className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </div>
        </div>
      </header>
      <Vortex
        rangeY={800}
        rangeSpeed={1}
        particleCount={500}
        baseHue={120}
        className="h-full w-full overflow-hidden"
      >
        <VoiceInput />
      </Vortex> */}
    </div>
  );
}
