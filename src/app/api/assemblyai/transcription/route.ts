import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to handle the form-data and get the file
async function getFileFromRequest(req: NextRequest): Promise<File | null> {
  const data = await req.formData();
  const file = data.get("mediaFile") as File | null;
  return file;
}

export async function POST(req: NextRequest) {
  try {
    // Extract the file from the request
    const file = await getFileFromRequest(req);
    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const params = {
      audio: file,
      speaker_labels: true,
    };

    // Pass the file directly to AssemblyAI for transcription
    const transcript = await client.transcripts.transcribe(params);

    if (transcript.status === "error") {
      return NextResponse.json(
        { error: `Transcription failed: ${transcript.error}` },
        { status: 500 },
      );
    }

    console.log(transcript);

    const transcriptText = transcript.text;

    return NextResponse.json({ transcriptText });
  } catch (error) {
    console.error("Error processing transcription:", error);
    return NextResponse.json(
      { error: "Failed to process transcription." },
      { status: 500 },
    );
  }
}
