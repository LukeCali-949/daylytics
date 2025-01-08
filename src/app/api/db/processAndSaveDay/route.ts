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

    // Prepare the prompt based on the existence of a previous schema
    // and instruct the AI to embed a chartType property for each data point.
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
        6. For each metric, wrap the numeric value in an object shaped like:
             {
                "value": <number>,
                "chartType": "Line" or "Bar"
             }
           Choose "Line" if the data represents a continuous metric over time; 
           choose "Bar" if the data is more discrete or better represented in a bar format.
        
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
          "wake_up_time": {
            "value": 800,
            "chartType": "Line"
          },
          "hours_worked": {
            "value": 6,
            "chartType": "Line"
          },
          "dinner": {
            "value": 1,
            "chartType": "Bar"
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
        4. For each metric, wrap the numeric value in an object shaped like:
             {
                "value": <number>,
                "chartType": "Line" or "Bar"
             }
           Choose "Line" if the data represents a continuous metric over time; 
           choose "Bar" if the data is more discrete or better represented in a bar format.
        
        Ensure all time-related fields are represented as integers in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
        Maintain consistency in data types and naming conventions.
        
        **User Description:**
        "${userDescription}"
        
        **Example:**
        _User Description_: "I woke up at 7 AM, worked for 8 hours, spent $15 on lunch, and went jogging for 30 minutes."
        
        _Generated JSON Schema_:
        {
          "wake_up_time": {
            "value": 700,
            "chartType": "Line"
          },
          "hours_worked": {
            "value": 8,
            "chartType": "Line"
          },
          "money_spent": {
            "value": 15,
            "chartType": "Bar"
          },
          "exercise": {
            "value": 30,
            "chartType": "Bar"
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

    // Extract response content
    const schema = completion.choices[0]?.message?.content;
    console.log(schema);
    if (!schema) {
      return NextResponse.json(
        { error: "Failed to generate schema." },
        { status: 500 },
      );
    }

    // Parse the JSON schema
    let finalSchema;
    try {
      finalSchema = JSON.parse(schema);
    } catch (parseError) {
      console.error("Error parsing JSON schema:", parseError);
      console.error("Received content:", schema);
      return NextResponse.json(
        { error: "Invalid JSON schema format received from AI." },
        { status: 500 },
      );
    }

    // Save the new Day document
    const newDay = await db.day.create({
      data: {
        date, // Use the date provided in the request body
        daySchema: finalSchema,
      },
    });

    // Return the saved Day document
    return NextResponse.json(
      { message: "Day schema generated and saved successfully.", day: newDay },
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
