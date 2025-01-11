// app/api/db/processAndSaveDay/route.ts

import { InputJsonValue } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getChartConfigPrompt,
  getGenerateDaySchemaPrompt,
} from "~/app/utils/utilFunctions"; // Assuming this function is updated to use cumulative schema if needed
import { db } from "~/server/db"; // Adjust the import path if necessary

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API Key." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { userDescription, date } = body;

    if (!userDescription) {
      return NextResponse.json(
        { error: "User description is required." },
        { status: 400 },
      );
    }

    if (date === undefined) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    // Retrieve or initialize the cumulative schema
    let cumulativeSchemaObj = await db.cumulativeSchema.findFirst();
    let cumulativeSchema = cumulativeSchemaObj?.schema;
    if (!cumulativeSchema) {
      cumulativeSchema = null;
    }

    // Check if a Day document exists for the given date
    const existingDay = await db.day.findUnique({ where: { date } });

    // Generate daySchema prompt using cumulative schema
    const prompt = getGenerateDaySchemaPrompt(
      userDescription,
      cumulativeSchema,
    );

    console.log(prompt);

    // Call OpenAI API to generate daySchema
    const daySchemaCompletion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates JSON schemas.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const daySchemaResponse = daySchemaCompletion.choices[0]?.message?.content;
    if (!daySchemaResponse) {
      return NextResponse.json(
        { error: "Failed to generate day schema." },
        { status: 500 },
      );
    }

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

    // If updating an existing day
    if (existingDay && cumulativeSchemaObj) {
      // Merge new partial schema with existing schema
      const updatedDaySchema = {
        ...(existingDay.daySchema as Record<string, unknown>),
        ...generatedSchema,
      };
      const updatedDay = await db.day.update({
        where: { date },
        data: { daySchema: updatedDaySchema },
      });

      // Update cumulative schema with any new keys from the partial update
      const cumulativeUpdates = {
        ...(cumulativeSchemaObj.schema as Record<string, unknown>),
      };
      Object.entries(generatedSchema).forEach(([key, value]) => {
        if (!cumulativeUpdates[key]) {
          cumulativeUpdates[key] = {
            type:
              typeof value === "object" && value !== null
                ? "object"
                : typeof value,
            example: value,
          };
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
      // Extract keys from generated daySchema for chart configuration
      const keys = Object.keys(generatedSchema);

      const chartConfigPrompt = getChartConfigPrompt(keys, userDescription);

      const chartConfigCompletion = await openai.chat.completions.create({
        model: "chatgpt-4o-latest",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant that recommends chart types for numerical metrics.",
          },
          { role: "user", content: chartConfigPrompt },
        ],
        response_format: { type: "json_object" },
      });

      // under this
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
        data: {
          date,
          daySchema: generatedSchema,
        },
      });
      // Update cumulative schema with new keys
      let cumulativeUpdates: any;

      if (cumulativeSchemaObj) {
        // Update existing cumulative schema
        cumulativeUpdates = {
          ...(cumulativeSchemaObj.schema as Record<string, unknown>),
        };

        Object.entries(generatedSchema).forEach(([key, value]) => {
          if (!cumulativeUpdates[key]) {
            cumulativeUpdates[key] = {
              type:
                typeof value === "object" && value !== null
                  ? "object"
                  : typeof value,
              example: value,
            };
          }
        });

        await db.cumulativeSchema.update({
          where: { id: cumulativeSchemaObj.id },
          data: { schema: cumulativeUpdates as InputJsonValue },
        });
      } else {
        // Create a new cumulative schema
        cumulativeUpdates = {};

        Object.entries(generatedSchema).forEach(([key, value]) => {
          cumulativeUpdates[key] = {
            type:
              typeof value === "object" && value !== null
                ? "object"
                : typeof value,
            example: value,
          };
        });

        await db.cumulativeSchema.create({
          data: { schema: cumulativeUpdates as InputJsonValue },
        });
      }

      // Update ChartTypeConfig based on chartConfig
      const chartTypeUpdates = Object.entries(chartConfig).map(
        async ([key, chartType]) => {
          if (
            chartType === "Line" ||
            chartType === "Bar" ||
            chartType === "Pie"
          ) {
            const existingConfig = await db.chartTypeConfig.findUnique({
              where: { keyName: key },
            });
            const field = chartType.toLowerCase() + "Count";
            if (existingConfig) {
              const updatedData = {
                [field]: (existingConfig as any)[field] + 1,
              };
              return db.chartTypeConfig.update({
                where: { keyName: key },
                data: updatedData,
              });
            } else {
              return db.chartTypeConfig.create({
                data: {
                  keyName: key,
                  lineCount: chartType === "Line" ? 1 : 0,
                  barCount: chartType === "Bar" ? 1 : 0,
                  pieCount: chartType === "Pie" ? 1 : 0,
                  // For future types, ensure your model and logic accommodate them.
                },
              });
            }
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
