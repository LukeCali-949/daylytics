// app/api/db/getChartTypeConfigs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db"; // Adjust the import path if necessary

export async function GET(req: NextRequest) {
  try {
    const chartTypeConfigs = await db.chartTypeConfig.findMany();

    return NextResponse.json({ chartTypeConfigs }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching chart type configs:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An error occurred while fetching chart type configurations.",
      },
      { status: 500 },
    );
  }
}
