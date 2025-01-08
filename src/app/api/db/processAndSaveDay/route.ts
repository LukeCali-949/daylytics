// app/api/db/processAndSaveDay/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "~/server/db"; // Adjust the import path if necessary

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // Ensure the API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API Key." },
        { status: 400 },
      );
    }

    // Parse the request body
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

    // Fetch the most recent Day document
    const lastDay = await db.day.findFirst({
      orderBy: { date: "desc" },
    });

    const existingSchema = lastDay ? lastDay.daySchema : null;

    // Prepare the prompt for generating daySchema
    let prompt = "";
    if (existingSchema && Object.keys(existingSchema).length > 0) {
      prompt = `
        You are an AI assistant that generates JSON schemas based on user descriptions of their day.

        Your tasks are:
        1. Extract relevant data points from the user's description.
        2. Organize these data points into a structured JSON schema.
        3. Ensure all time-related fields are represented as integers in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
        4. Maintain consistency in data types and naming conventions.
        5. For most cases its better to keep property names generalized for future adaptation. For example if a user says in their
        description, "$15 spent on lunch" the better property name would be "money_spent" and NOT something like "money_spent_on_lunch"


        **Existing Schema (JSON):**
        ${JSON.stringify(existingSchema, null, 2)}

        **User Description:**
        "${userDescription}"

        **Example:**
        _User Description_: "I woke up at 8 AM, worked for 6 hours, and went out for dinner."

        _Generated JSON Schema_:
        {
          "wake_up_time": { "value": 800 },
          "hours_worked": { "value": 6 },
          "dinner": { "value": 1 }
        }

        **Instructions:**
        - Only include keys that are present in the current day's description.
        - Omit any keys from the existing schema that are not mentioned today.
        - Add new keys as needed without altering the existing ones.
        - Ensure the JSON is properly formatted and valid.
      `;
    } else {
      prompt = `
        You are an AI assistant that generates JSON schemas based on user descriptions of their day.

        Your tasks are:
        1. Extract relevant data points from the user's description.
        2. Organize these data points into a structured JSON schema.
        3. Ensure all time-related fields are represented as integers in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
        4. Maintain consistency in data types and naming conventions.
        5. For most cases its better to keep property names generalized for future adaptation. For example if a user says in their
        description, "$15 spent on lunch" the better property name would be "money_spent" and NOT something like "money_spent_on_lunch"

        **User Description:**
        "${userDescription}"

        **Example:**
        _User Description_: "I woke up at 7 AM, worked for 8 hours, spent $15 on lunch, and went jogging for 30 minutes."

        _Generated JSON Schema_:
        {
          "wake_up_time": { "value": 700 },
          "hours_worked": { "value": 8 },
          "money_spent": { "value": 15 },
          "exercise": { "value": 30 }
        }

        **Instructions:**
        - Extract all relevant data points mentioned in the description.
        - Organize them into a clear and consistent JSON structure.
        - Use appropriate data types (e.g., integers for times and numerical values).
        - Ensure the JSON is properly formatted and valid.
      `;
    }

    // Call OpenAI API for generating daySchema
    const daySchemaCompletion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant that generates JSON schemas based on user descriptions of their day.",
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

    let daySchema;
    try {
      daySchema = JSON.parse(daySchemaResponse);
    } catch (parseError) {
      console.error("Error parsing day schema:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON format for day schema." },
        { status: 500 },
      );
    }

    // Prepare prompt for generating chartConfig using the keys from daySchema
    const keys = Object.keys(daySchema);
    const chartConfigPrompt = `
      You are an AI assistant that recommends chart types ("Line" or "Bar") for numerical metrics based their key names.
        - Use "Line" for continuous metrics over time (e.g., "wake_up_time", "hours_worked").
        - Use "Bar" for discrete metrics or totals (e.g., "money_spent").
      Given the following keys: ${JSON.stringify(keys)}
      However, also the complete description of the user's day might also give some context into what chart type they want so 
      examine it to see if there are any indicators of such: ${userDescription}
      Output a JSON object mapping each key to its recommended chart type.
    `;

    // Call OpenAI API for generating chartConfig
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
      chartConfig = {}; // Fallback to empty config if parsing fails
    }

    // Save the new Day document without chartConfig embedded
    const newDay = await db.day.create({
      data: {
        date,
        daySchema,
      },
    });

    // Update ChartTypeConfig counts based on chartConfig
    const chartTypeUpdates = Object.entries(chartConfig).map(
      async ([key, chartType]) => {
        if (chartType === "Line" || chartType === "Bar") {
          const existingConfig = await db.chartTypeConfig.findUnique({
            where: { keyName: key },
          });

          if (existingConfig) {
            if (chartType === "Line") {
              return db.chartTypeConfig.update({
                where: { keyName: key },
                data: { lineCount: existingConfig.lineCount + 1 },
              });
            } else if (chartType === "Bar") {
              return db.chartTypeConfig.update({
                where: { keyName: key },
                data: { barCount: existingConfig.barCount + 1 },
              });
            }
          } else {
            if (chartType === "Line") {
              return db.chartTypeConfig.create({
                data: {
                  keyName: key,
                  lineCount: 1,
                  barCount: 0,
                },
              });
            } else if (chartType === "Bar") {
              return db.chartTypeConfig.create({
                data: {
                  keyName: key,
                  lineCount: 0,
                  barCount: 1,
                },
              });
            }
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
  } catch (error: any) {
    console.error("Error processing and saving schema:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred." },
      { status: 500 },
    );
  }
}
