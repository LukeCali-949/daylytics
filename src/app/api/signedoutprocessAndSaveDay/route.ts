// app/api/db/signedOutProcessAndSaveDay/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { format, parseISO, isValid, isFuture } from "date-fns";
import {
  getChartConfigPrompt,
  parseUserActions,
  parseUserActions2
} from "~/app/utils/utilFunctions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { userDescription, date, conversation, cumulativeSchema } = await req.json();

    console.log("cumulativeSchema", cumulativeSchema);

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API Key." },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Parse and validate input date
    const inputDate = parseISO(date);
    if (!isValid(inputDate) || isFuture(inputDate)) {
      return NextResponse.json(
        { error: "Invalid or future date is not allowed." },
        { status: 400 }
      );
    }

    // 🟡 Step 1: Parse User Actions
    const { chartChanges = [], updates = [] } = await parseUserActions2(
      userDescription,
      conversation, // Use provided conversation
      cumulativeSchema
    );

    console.log("chartChanges", chartChanges);
    console.log("updates", updates);

    // 🟡 Step 2: Simulate Cumulative Schema Updates
    let cumulativeSchemaUpdates = { ...cumulativeSchema };
    const updatedKeys = new Set<string>();

    updates.forEach((update) => {
      updatedKeys.add(update.key);
      if (!cumulativeSchemaUpdates[update.key]) {
        cumulativeSchemaUpdates[update.key] = {
          example: update.goal
            ? { value: update.value, goal: update.goal }
            : { value: update.value }
        };
      }
    });

    // 🟡 Step 3: Generate Chart Config Recommendations
    const validChartTypes = [
      "Line",
      "Bar",
      "Pie",
      "ProgressBar",
      "ProgressCircle",
      "Tracker",
      "ActivityCalendar"
    ];

    let recommendedChartConfigs: Record<string, string> = {};

    if (updatedKeys.size > 0) {
      const chartConfigPrompt = getChartConfigPrompt(Array.from(updatedKeys), userDescription);
      try {
        const chartConfigResponse = await openai.chat.completions.create({
          model: "chatgpt-4o-latest",
          messages: [
            { role: "system", content: "Recommend chart types for new metrics" },
            { role: "user", content: chartConfigPrompt }
          ],
          response_format: { type: "json_object" }
        });

        if (chartConfigResponse.choices[0]?.message?.content) {
          const chartConfig = JSON.parse(chartConfigResponse.choices[0].message.content);
          Object.entries(chartConfig).forEach(([key, type]) => {
            if (validChartTypes.includes(type as string)) {
              recommendedChartConfigs[key] = type as string;
            }
          });
        }
      } catch (error) {
        console.error("Chart config generation failed:", error);
      }
    }

    // 🟡 Step 4: Update Conversation History (Client will save this)
    const updatedConversation = [
      ...conversation,
      { role: "user", content: userDescription },
      { role: "assistant", content: JSON.stringify({ chartChanges, updates }) }
    ];

    // 🟢 Return results for client-side storage
    return NextResponse.json({
      message: "Simulated updates processed successfully",
      chartChanges,
      updates,
      recommendedChartConfigs,
      cumulativeSchemaUpdates,
      updatedConversation
    });
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
