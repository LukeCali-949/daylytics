// app/api/db/getAllDays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get the user from our database using Clerk ID
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Database user not found" }, { status: 404 });
    }

    // Get days for specific user
    const days = await db.day.findMany({
      where: { userId: dbUser.id },
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
