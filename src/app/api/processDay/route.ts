// app/api/processDay/route.ts
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
    const { userDescription } = body;

    if (!userDescription) {
      return NextResponse.json(
        { error: "User description is required." },
        { status: 400 },
      );
    }

    // Fetch the most recent Day document
    const lastDay = await db.day.findFirst({
      orderBy: { date: "desc" },
    });

    const existingSchema = lastDay ? lastDay.daySchema : null;

    // Prepare the prompt based on the existence of a previous schema
    let prompt = "";

    if (existingSchema && Object.keys(existingSchema).length > 0) {
      // Prompt for subsequent days
      prompt = `
        You are an AI assistant that generates JSON schemas based on user descriptions of their day.
        
        Your tasks are:
        1. Extract relevant data points from the user's description.
        2. Align these data points with the existing schema keys provided.
        3. Update the existing keys with new values if mentioned in the description.
        4. Add new keys for any new metrics identified in the description.
        5. Do not include keys that are not mentioned in the current description.
        
        Ensure all time-related fields are represented as integers in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
        Maintain consistency in data types and naming conventions.
        
        **Existing Schema (JSON):**
        ${JSON.stringify(existingSchema, null, 2)}
        
        **User Description:**
        "${userDescription}"
        
        **Example:**
        _User Description_: "I woke up at 8 AM, worked for 6 hours, and went out for dinner."
        
        _Generated JSON Schema_:
        {
          "wake_up_time": 800,
          "hours_worked": 6,
          "dinner": {
            "type": "outing"
          }
        }
        
        **Instructions:**
        - Only include keys that are present in the current day's description.
        - Omit any keys from the existing schema that are not mentioned today.
        - Add new keys as needed without altering the existing ones.
        - Ensure the JSON is properly formatted and valid.
      `;
    } else {
      // Prompt for the first day
      prompt = `
        You are an AI assistant that generates JSON schemas based on user descriptions of their day.
        
        Your tasks are:
        1. Extract relevant data points from the user's description.
        2. Organize these data points into a structured JSON schema.
        3. Ensure the schema is flexible and easy to extend with new data points in the future.
        
        Ensure all time-related fields are represented as integers in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
        Maintain consistency in data types and naming conventions.
        
        **User Description:**
        "${userDescription}"
        
        **Example:**
        _User Description_: "I woke up at 7 AM, worked for 8 hours, spent $15 on lunch, and went jogging for 30 minutes."
        
        _Generated JSON Schema_:
        {
          "wake_up_time": 700,
          "hours_worked": 8,
          "money_spent": 15,
          "exercise": {
            "type": "jogging",
            "duration_minutes": 30
          }
        }
        
        **Instructions:**
        - Extract all relevant data points mentioned in the description.
        - Organize them into a clear and consistent JSON structure.
        - Use appropriate data types (e.g., integers for times and numerical values).
        - Ensure the JSON is properly formatted and valid.
      `;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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

    // Extract response content
    const schema = completion.choices[0]?.message?.content;
    if (!schema) {
      return NextResponse.json(
        { error: "Failed to generate schema." },
        { status: 500 },
      );
    }

    let finalSchema = JSON.parse(schema);

    // Return the JSON schema
    return NextResponse.json({ schema: finalSchema }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing schema:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred." },
      { status: 500 },
    );
  }
}
