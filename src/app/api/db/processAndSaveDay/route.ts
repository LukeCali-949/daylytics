// app/api/db/processAndSaveDay/route.ts
import { InputJsonValue } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "~/server/db";
import { format, parseISO, isValid, isFuture } from "date-fns";
import {
  getChartConfigPrompt,
  getGenerateDaySchemaPrompt,
  parseUserActions,
  UserActionResponse
} from "~/app/utils/utilFunctions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API Key." },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { userDescription, date } = body;

    if (!userDescription) {
      return NextResponse.json(
        { error: "User description is required." },
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

    // Check future dates
    const currentDate = new Date();
    console.log("currentDate", currentDate);
    const inputDate = parseISO(date);
    // console.log("inputDate", inputDate);
    // if (isFuture(inputDate)) {
    //   return NextResponse.json(
    //     { error: "Future dates are not allowed." },
    //     { status: 400 }
    //   );
    // }

    // Retrieve or create conversation
    let conversation = await db.conversation.findFirst() || 
      await db.conversation.create({ data: { messages: [] } });
    const conversationHistory = conversation.messages as Array<{ role: string; content: string }>;

    //console.log("conversationHistory", conversationHistory);

    // Parse user actions using combined parser
    const { chartChanges = [], updates = [] } = await parseUserActions(
      userDescription,
      conversationHistory
    );

    // Process chart configuration changes
    const validChartTypes = [
      "Line",
      "Bar",
      "Pie",
      "ProgressBar",
      "ProgressCircle",
      "Tracker",
      "ActivityCalendar"
    ];
    if (chartChanges.length > 0) {
      await Promise.all(
        chartChanges.map(async ({ key, chartType }) => {
          if (!validChartTypes.includes(chartType)) return;
          
          return db.chartTypeConfig.upsert({
            where: { keyName: key },
            update: { chartType },
            create: { keyName: key, chartType }
          });
        })
      );
    }

    // Process data updates
    const processedDays = [];
    const updatedKeys = new Set<string>();
    let cumulativeSchemaUpdates: Record<string, any> = {};

    if (updates.length > 0) {
      // Get cumulative schema once
      let cumulativeSchemaObj = await db.cumulativeSchema.findFirst() || 
        await db.cumulativeSchema.create({ data: { schema: {} } });
      cumulativeSchemaUpdates = cumulativeSchemaObj?.schema 
        ? { ...(cumulativeSchemaObj.schema as Record<string, any>) }
        : {};

      for (const update of updates) {
        // Validate and normalize date
        let targetDate = parseISO(update.date);
        if (!isValid(targetDate) || isFuture(targetDate)) {
          targetDate = inputDate; // Fallback to request date
        }
        const isoDate = format(targetDate, 'yyyy-MM-dd');

        // Prepare update data
        const updateData = {
          [update.key]: update.goal 
            ? { value: update.value, goal: update.goal }
            : { value: update.value }
        };

        // Update/create day document
        const existingDay = await db.day.findUnique({ where: { date: isoDate } });
        const updatedDay = existingDay
          ? await db.day.update({
              where: { date: isoDate },
              data: { daySchema: { ...(existingDay.daySchema as Record<string, any>), ...updateData } }
            })
          : await db.day.create({
              data: { date: isoDate, daySchema: updateData }
            });

        processedDays.push(updatedDay);
        updatedKeys.add(update.key);

        // Track cumulative schema updates
        if (!cumulativeSchemaUpdates[update.key]) {
          cumulativeSchemaUpdates[update.key] = { example: updateData[update.key] };
        }
      }

      

      // Update cumulative schema
      await db.cumulativeSchema.upsert({
        where: { id: cumulativeSchemaObj.id },
        update: { schema: cumulativeSchemaUpdates },
        create: { schema: cumulativeSchemaUpdates }
      });
    }

    // Generate chart config for new keys
    if (updatedKeys.size > 0) {
      const newKeys = Array.from(updatedKeys);
      const chartConfigPrompt = getChartConfigPrompt(newKeys, userDescription);
      
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
          await Promise.all(
            Object.entries(chartConfig).map(([key, type]) => {
              if (validChartTypes.includes(type as string)) {
                return db.chartTypeConfig.upsert({
                  where: { keyName: key },
                  update: { chartType: type as string },
                  create: { keyName: key, chartType: type as string }
                });
              }
            })
          );
        }
      } catch (error) {
        console.error("Chart config generation failed:", error);
      }
    }

    // Update conversation history
    const updatedMessages = [
      ...conversationHistory,
      { role: "user", content: userDescription },
      { role: "assistant", content: JSON.stringify({ chartChanges, updates }) }
    ];
    
    await db.conversation.update({
      where: { id: conversation.id },
      data: { messages: updatedMessages as InputJsonValue }
    });

    return NextResponse.json({
      message: "Processed actions successfully",
      chartChanges: chartChanges.map(c => ({ key: c.key, chartType: c.chartType })),
      updatedDays: processedDays,
      updatedKeys: Array.from(updatedKeys)
    });

  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}