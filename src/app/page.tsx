import Link from "next/link";
import { AssemblyAI } from "assemblyai";
import VoiceInput from "./components/maincontent/VoiceInput/VoiceInput";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY as string,
});

export default function HomePage() {
  return (
    <div>
      <VoiceInput />
    </div>
  );
}
