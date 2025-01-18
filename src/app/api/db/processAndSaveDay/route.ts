// app/api/db/processAndSaveDay/route.ts

import { InputJsonValue } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getChartConfigPrompt,
  getGenerateDaySchemaPrompt,
} from "~/app/utils/utilFunctions";
import { db } from "~/server/db"; // Adjust if needed

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API Key." },
        { status: 400 },
      );
    }

    // Parse request
    const body = await req.json();
    const { userDescription, date, userId } = body;

    if (!userDescription) {
      return NextResponse.json(
        { error: "User description is required." },
        { status: 400 },
      );
    }
    if (date === undefined) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    // 1. Retrieve or initialize the conversation for this user
    //    (If you don't have a userId system, you can do a single conversation for all).
    let conversation = await db.conversation.findFirst({
      where: { userId }, // or remove this if userId isn't used
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          messages: [],
        },
      });
    }

    // 2. Append the new user message to the conversation messages array
    //    We'll store them in a standard chat format: { role: 'user'|'assistant'|'system', content: '...' }
    const updatedMessages = [
      ...(conversation.messages as Array<{ role: string; content: string }>),
      { role: "user", content: userDescription },
    ];

    // Now retrieve or initialize the cumulative schema
    let cumulativeSchemaObj = await db.cumulativeSchema.findFirst();
    let cumulativeSchema = cumulativeSchemaObj?.schema ?? null;

    // Check if a Day document exists for the given date
    const existingDay = await db.day.findUnique({ where: { date } });

    // 3. Generate the daySchema prompt using the cumulative schema
    //    (However, we're now going to pass conversation messages to OpenAI
    //     which includes both the system message AND user messages array).
    const userPrompt = getGenerateDaySchemaPrompt(
      userDescription,
      cumulativeSchema,
    );

    // We'll add a final user message: the actual prompt from your function.
    // The "conversation" array includes all previous context, so we'll do something like:
    const daySchemaMessages = [
      {
        role: "system",
        content:
          "You are an AI assistant that generates JSON schemas based on prior conversation history.",
      },
      // Insert all previous conversation messages if relevant
      ...updatedMessages,
      // Then the final prompt user message for day schema
      {
        role: "user",
        content: userPrompt,
      },
    ];

    // 4. Call OpenAI API with the entire conversation context
    const daySchemaCompletion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: daySchemaMessages as any, // pass the conversation context + final user prompt
      response_format: { type: "json_object" },
    });

    const daySchemaResponse = daySchemaCompletion.choices[0]?.message?.content;
    if (!daySchemaResponse) {
      return NextResponse.json(
        { error: "Failed to generate day schema." },
        { status: 500 },
      );
    }

    // 5. Add the new AI response to the conversation as an "assistant" message
    const aiReply = { role: "assistant", content: daySchemaResponse };
    updatedMessages.push(aiReply);

    // 6. Save the updated conversation to the database
    await db.conversation.update({
      where: { id: conversation.id },
      data: { messages: updatedMessages as InputJsonValue },
    });

    // 7. Parse the AI’s JSON schema response
    let generatedSchema;
    try {
      generatedSchema = JSON.parse(daySchemaResponse);
    } catch (parseError) {
      console.error("Error parsing day schema:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON format for day schema." },
        { status: 500 },
      );
    }

    // The rest of the logic remains the same
    // If updating an existing day
    if (existingDay && cumulativeSchemaObj) {
      const updatedDaySchema = {
        ...(existingDay.daySchema as Record<string, unknown>),
        ...generatedSchema,
      };
      const updatedDay = await db.day.update({
        where: { date },
        data: { daySchema: updatedDaySchema },
      });

      const cumulativeUpdates = {
        ...(cumulativeSchemaObj.schema as Record<string, unknown>),
      };
      Object.entries(generatedSchema).forEach(([key, value]) => {
        if (!cumulativeUpdates[key]) {
          cumulativeUpdates[key] = { example: value };
        }
      });

      await db.cumulativeSchema.update({
        where: { id: cumulativeSchemaObj.id },
        data: { schema: cumulativeUpdates as InputJsonValue },
      });

      return NextResponse.json(
        {
          message: "Day schema updated and saved successfully.",
          day: updatedDay,
        },
        { status: 200 },
      );
    } else {
      // Creating a new day
      const keys = Object.keys(generatedSchema);
      const chartConfigPrompt = getChartConfigPrompt(keys, userDescription);

      // We'll again pass conversation messages, but let's keep it simpler:
      const chartConfigMessages = [
        {
          role: "system",
          content:
            "You are an AI assistant that recommends chart types for numerical metrics.",
        },
        // ...updatedMessages,
        { role: "user", content: chartConfigPrompt },
      ];

      const chartConfigCompletion = await openai.chat.completions.create({
        model: "chatgpt-4o-latest",
        messages: chartConfigMessages as any,
        response_format: { type: "json_object" },
      });

      const chartConfigResponse =
        chartConfigCompletion.choices[0]?.message?.content;
      if (!chartConfigResponse) {
        return NextResponse.json(
          { error: "Failed to generate chart configuration." },
          { status: 500 },
        );
      }

      let chartConfig;
      try {
        chartConfig = JSON.parse(chartConfigResponse);
      } catch (parseError) {
        console.error("Error parsing chartConfig:", parseError);
        chartConfig = {};
      }

      // Create a new Day document
      const newDay = await db.day.create({
        data: { date, daySchema: generatedSchema },
      });

      let cumulativeUpdates: any;
      if (cumulativeSchemaObj) {
        cumulativeUpdates = {
          ...(cumulativeSchemaObj.schema as Record<string, unknown>),
        };
        Object.entries(generatedSchema).forEach(([key, value]) => {
          if (!cumulativeUpdates[key]) {
            cumulativeUpdates[key] = { example: value };
          }
        });

        await db.cumulativeSchema.update({
          where: { id: cumulativeSchemaObj.id },
          data: { schema: cumulativeUpdates as InputJsonValue },
        });
      } else {
        cumulativeUpdates = {};
        Object.entries(generatedSchema).forEach(([key, value]) => {
          cumulativeUpdates[key] = { example: value };
        });

        await db.cumulativeSchema.create({
          data: { schema: cumulativeUpdates as InputJsonValue },
        });
      }

      // Update ChartTypeConfig
      const chartTypeUpdates = Object.entries(chartConfig).map(
        async ([key, type]) => {
          if (
            type === "Line" ||
            type === "Bar" ||
            type === "Pie" ||
            type === "ProgressBar"
          ) {
            const existingConfig = await db.chartTypeConfig.findUnique({
              where: { keyName: key },
            });
            if (!existingConfig) {
              return db.chartTypeConfig.create({
                data: {
                  keyName: key,
                  chartType: type,
                },
              });
            }
            // else do nothing
          }
        },
      );

      await Promise.all(chartTypeUpdates);

      return NextResponse.json(
        {
          message: "Day schema generated and saved successfully.",
          day: newDay,
          chartConfig,
        },
        { status: 201 },
      );
    }
  } catch (error: any) {
    console.error("Error processing and saving schema:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred." },
      { status: 500 },
    );
  }
}
