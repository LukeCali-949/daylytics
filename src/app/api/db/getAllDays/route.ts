// app/api/db/getAllDays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  try {
    const days = await db.day.findMany({
      orderBy: { date: "asc" },
    });

    const response = NextResponse.json({ days });
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch days" },
      { status: 500 }
    );
  }
}
