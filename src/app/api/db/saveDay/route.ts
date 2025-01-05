// app/api/db/saveDay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, daySchema } = body;

    if (date === undefined || !daySchema) {
      return NextResponse.json(
        { error: "Date and daySchema are required." },
        { status: 400 },
      );
    }

    // Create a new Day document in the database
    const newDay = await db.day.create({
      data: {
        date,
        daySchema,
      },
    });

    return NextResponse.json(
      { message: "Day schema saved successfully.", day: newDay },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error saving day schema:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while saving the schema." },
      { status: 500 },
    );
  }
}
