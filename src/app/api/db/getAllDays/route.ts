// app/api/db/getAllDays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  try {
    // Fetch all Day documents, sorted by date ascending
    const allDays = await db.day.findMany({
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ days: allDays }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching day schemas:", error);
    return NextResponse.json(
      {
        error: error.message || "An error occurred while fetching day schemas.",
      },
      { status: 500 },
    );
  }
}
