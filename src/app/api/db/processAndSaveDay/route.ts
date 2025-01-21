// app/api/db/processAndSaveDay/route.ts
import { InputJsonValue } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "~/server/db";

import {
  classifyIntent,
  getChartChangeExtractionPrompt,
  getChartConfigPrompt,
  getGenerateDaySchemaPrompt,
} from "~/app/utils/utilFunctions";

interface ChartChangeRequest {
  key: string;
  chartType: "Line" | "Bar" | "Pie" | "ProgressBar" | "ProgressCircle" | "Tracker";
  confidence: number;
}

interface ChartChangesResponse {
  changes: ChartChangeRequest[];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OpenAI API Key." }, { status: 400 });
    }

    const body = await req.json();
    const { userDescription, date, userId } = body;

    if (!userDescription) {
      return NextResponse.json({ error: "User description is required." }, { status: 400 });
    }
    if (date === undefined) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    // Retrieve or initialize conversation (simplified for this example)
    let conversation = await db.conversation.findFirst();
    if (!conversation) {
      conversation = await db.conversation.create({
        data: { messages: [] },
      });
    }

    const updatedMessagesForIntentClassification = [
      ...(conversation.messages as Array<{ role: string; content: string }>),
    ];

    // Classify intent
    const intent = await classifyIntent(userDescription, updatedMessagesForIntentClassification);

    // Handle chart change requests
    if (intent === "chart_change_request") {
      const chartChangePrompt = getChartChangeExtractionPrompt(userDescription);
      const updatedMessages = [
        ...(conversation.messages as Array<{ role: string; content: string }>),
        { role: "user", content: userDescription },
        { role: "system", content: chartChangePrompt },
      ];

      const chartChangeCompletion = await openai.chat.completions.create({
        model: "chatgpt-4o-latest",
        messages: updatedMessages as any,
        response_format: { type: "json_object" },
      });

      const chartChangeResponse = chartChangeCompletion.choices[0]?.message?.content;
      if (!chartChangeResponse) {
        return NextResponse.json({ error: "Failed to generate chart change schema." }, { status: 500 });
      }

      const aiReply = { role: "assistant", content: chartChangeResponse };
      updatedMessages.push(aiReply);

      await db.conversation.update({
        where: { id: conversation.id },
        data: { messages: updatedMessages as InputJsonValue },
      });

      let generatedChartChangeSchema: ChartChangesResponse;
      try {
        generatedChartChangeSchema = JSON.parse(chartChangeResponse);
      } catch (parseError) {
        console.error("Error parsing chart changes:", parseError);
        return NextResponse.json({ error: "Invalid JSON format for chart changes." }, { status: 500 });
      }

      const { changes } = generatedChartChangeSchema;
      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return NextResponse.json({ error: "Failed to extract chart changes from user input." }, { status: 400 });
      }

      const validChartTypes = ["Line", "Bar", "Pie", "ProgressBar", "ProgressCircle", "Tracker"];
      for (const change of changes) {
        const { key, chartType } = change;
        if (!key || !chartType || !validChartTypes.includes(chartType)) {
          return NextResponse.json(
            { error: "Invalid chart change request. Missing key or invalid chart type." },
            { status: 400 },
          );
        }
      }

      const updatePromises = changes.map(async ({ key, chartType }) => {
        const existingConfig = await db.chartTypeConfig.findUnique({ where: { keyName: key } });
        if (existingConfig) {
          return db.chartTypeConfig.update({ where: { keyName: key }, data: { chartType } });
        } else {
          return db.chartTypeConfig.create({ data: { keyName: key, chartType } });
        }
      });
      await Promise.all(updatePromises);

      return NextResponse.json(
        {
          message: `Successfully updated ${changes.length} chart type${changes.length === 1 ? "" : "s"}`,
          changes: changes.map(({ key, chartType }) => ({ key, chartType })),
        },
        { status: 200 },
      );
    }

    // Normal data entry flow
    const updatedMessages = [
      ...(conversation.messages as Array<{ role: string; content: string }>),
      { role: "user", content: userDescription },
    ];

    let cumulativeSchemaObj = await db.cumulativeSchema.findFirst();
    let cumulativeSchema = cumulativeSchemaObj?.schema ?? null;

    const existingDay = await db.day.findUnique({ where: { date } });

    const userPrompt = getGenerateDaySchemaPrompt(userDescription, cumulativeSchema);

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

    const daySchemaCompletion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: daySchemaMessages as any,
      response_format: { type: "json_object" },
    });

    const daySchemaResponse = daySchemaCompletion.choices[0]?.message?.content;
    if (!daySchemaResponse) {
      return NextResponse.json({ error: "Failed to generate day schema." }, { status: 500 });
    }

    const aiReply = { role: "assistant", content: daySchemaResponse };
    updatedMessages.push(aiReply);

    await db.conversation.update({
      where: { id: conversation.id },
      data: { messages: updatedMessages as InputJsonValue },
    });

    let generatedSchema;
    try {
      generatedSchema = JSON.parse(daySchemaResponse);
    } catch (parseError) {
      console.error("Error parsing day schema:", parseError);
      return NextResponse.json({ error: "Invalid JSON format for day schema." }, { status: 500 });
    }

    if (existingDay && cumulativeSchemaObj) {
      const updatedDaySchema = {
        ...(existingDay.daySchema as Record<string, unknown>),
        ...generatedSchema,
      };
      const updatedDay = await db.day.update({
        where: { date },
        data: { daySchema: updatedDaySchema },
      });

      const cumulativeUpdates = { ...(cumulativeSchemaObj.schema as Record<string, unknown>) };
      Object.entries(generatedSchema).forEach(([key, value]) => {
        if (!cumulativeUpdates[key]) {
          cumulativeUpdates[key] = { example: value };
        }
      });

      await db.cumulativeSchema.update({
        where: { id: cumulativeSchemaObj.id },
        data: { schema: cumulativeUpdates as InputJsonValue },
      });

      // Return updatedKeys for selective frontend updates
      return NextResponse.json({
        message: "Day schema updated and saved successfully.",
        day: updatedDay,
        updatedKeys: Object.keys(generatedSchema),
      }, { status: 200 });
    } else {
      const keys = Object.keys(generatedSchema);
      const chartConfigPrompt = getChartConfigPrompt(keys, userDescription);

      const chartConfigCompletion = await openai.chat.completions.create({
        model: "chatgpt-4o-latest",
        messages: [
          { role: "system", content: "You are an AI assistant that recommends chart types." },
          { role: "user", content: chartConfigPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const chartConfigResponse = chartConfigCompletion.choices[0]?.message?.content;
      if (!chartConfigResponse) {
        return NextResponse.json({ error: "Failed to generate chart configuration." }, { status: 500 });
      }

      let chartConfig;
      try {
        chartConfig = JSON.parse(chartConfigResponse);
      } catch (parseError) {
        console.error("Error parsing chartConfig:", parseError);
        chartConfig = {};
      }

      const newDay = await db.day.create({
        data: { date, daySchema: generatedSchema },
      });

      let cumulativeUpdates: any;
      if (cumulativeSchemaObj) {
        cumulativeUpdates = { ...(cumulativeSchemaObj.schema as Record<string, unknown>) };
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

      const validChartTypes = ["Line", "Bar", "Pie", "ProgressBar", "ProgressCircle", "Tracker"];
      const chartTypeUpdates = Object.entries(chartConfig).map(async ([key, type]) => {
        if (validChartTypes.includes(type as string)) {
          const existingConfig = await db.chartTypeConfig.findUnique({ where: { keyName: key } });
          if (!existingConfig) {
            return db.chartTypeConfig.create({ data: { keyName: key, chartType: type as string } });
          }
        }
      });

      await Promise.all(chartTypeUpdates);

      return NextResponse.json(
        {
          message: "Day schema generated and saved successfully.",
          day: newDay,
          chartConfig,
          updatedKeys: Object.keys(generatedSchema),
        },
        { status: 201 },
      );
    }
  } catch (error: any) {
    console.error("Error processing and saving schema:", error);
    return NextResponse.json({ error: error.message || "An error occurred." }, { status: 500 });
  }
}
