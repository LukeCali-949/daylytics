// app/api/db/getLast7Days/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  try {
    // Fetch the last 7 Day documents, ordered by date descending
    const last7Days = await db.day.findMany({
      orderBy: { date: "desc" },
      take: 7,
    });

    // Reverse to ascending order (oldest first)
    const sortedDays = last7Days.reverse();

    return NextResponse.json({ days: sortedDays }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching last 7 days:", error);
    return NextResponse.json(
      {
        error:
          error.message || "An error occurred while fetching the last 7 days.",
      },
      { status: 500 },
    );
  }
}
