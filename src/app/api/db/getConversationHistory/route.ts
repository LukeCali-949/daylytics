// app/api/db/getConversation/route.ts
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
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

    const userId = dbUser.id;

    // Find or create conversation for user
    let conversation = await db.conversation.findUnique({
      where: { userId }
    });

    if (!conversation) {
      conversation = await db.conversation.create({ 
        data: { 
          userId,
          messages: [] 
        } 
      });
    }

    // Return the conversation messages as JSON
    return NextResponse.json({ messages: conversation.messages });
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while fetching the conversation" },
      { status: 500 }
    );
  }
}
