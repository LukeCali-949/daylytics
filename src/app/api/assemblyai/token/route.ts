// app/api/assemblyai/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing AssemblyAI API Key." },
        { status: 400 },
      );
    }

    // You can add additional validation for the request here if needed

    const tokenResponse = await client.realtime.createTemporaryToken({
      expires_in: 60,
    });

    return NextResponse.json({ token: tokenResponse }, { status: 200 });
  } catch (error: any) {
    console.error("Error generating AssemblyAI token:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong!" },
      { status: 500 },
    );
  }
}
