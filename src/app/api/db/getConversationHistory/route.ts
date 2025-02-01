// app/api/db/getConversation/route.ts
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  try {
    // Retrieve the first conversation (or create one if none exists)
    let conversation = await db.conversation.findFirst();
    if (!conversation) {
      conversation = await db.conversation.create({ data: { messages: [] } });
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
