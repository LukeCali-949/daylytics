import { JsonValue } from "@prisma/client/runtime/library";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Generates a prompt for OpenAI to extract updates with associated dates from user input.
 * @param userDescription - The raw user input describing their day.
 * @param conversationHistory - Array of past conversation messages for context.
 * @param todayDate - Today's date in "YYYY-MM-DD" format.
 * @returns A string prompt tailored for OpenAI's API.
 */
export const getGenerateDaySchemaPrompt = (
  userDescription: string,
  todayDate: string,
  existingSchema?: JsonValue,
) => {
  return `
You are an AI assistant that processes user descriptions of their daily activities and updates productivity data accordingly.

Your tasks are:
1. Identify all relevant updates mentioned by the user, including any date references.
2. Resolve each date reference to a standardized "YYYY-MM-DD" format based on the provided today's date (${todayDate}).
   - Recognize various date expressions such as "yesterday," "the previous day," "January 7th," etc.
   - If a date resolves to a future date, default it to today's date (${todayDate}).
3. Associate each update with its corresponding date.
4. Organize the updates into a structured JSON object where each update includes:
   - 'date': The resolved date in "YYYY-MM-DD" format.
   - 'key': The data point being updated (e.g., "hours_worked," "money_spent").
   - 'value': The new value for the data point.
   - 'goal' (optional): If a goal is mentioned for the data point.
5. Ensure the JSON is valid, properly formatted, and adheres to the following structure:

{
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "key": "key_name",
      "value": new_value,
      "goal": optional_goal
    },
    ...
  ]
}

Additional Instructions:
- Use integers for time-related fields in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
- For yes/no events (e.g., "went jogging"), use a binary value: 1 for occurred, 0 for not occurred or not mentioned.
- Maintain consistency in data types and naming conventions.
- If the user mentions a goal for a metric, include it as a "goal" field alongside "value".
- Disregard any "example" wrappers from the existing schema if provided.

${
  existingSchema && Object.keys(existingSchema).length > 0
    ? `
**Existing Schema (JSON):**
${JSON.stringify(existingSchema, null, 2)}

For each property in the existing schema, disregard any "example" wrappers.
When generating a value for a property, output it using exactly the format found inside its "example" field.
For instance, if a property is defined as { "example": { "value": 700 } },
then generate { "value": <appropriate_value> } for that property, without including the "example" key.
`
    : ""
}

**User Description:**
"${userDescription}"

**Example:**
_User Input_: "I woke up at 7 AM, worked for 8 hours yesterday, spent $15 on lunch on January 7th, went jogging for 30 minutes, and I want to achieve 40 hours of programming this week."

_Generated JSON Schema_:
{
  "updates": [
    {
      "date": "2025-01-22",
      "key": "wake_up_time",
      "value": 700
    },
    {
      "date": "2025-01-22",
      "key": "hours_worked",
      "value": 8
    },
    {
      "date": "2025-01-07",
      "key": "money_spent",
      "value": 15
    },
    {
      "date": "2025-01-22",
      "key": "exercise",
      "value": 30
    },
    {
      "date": "2025-01-22",
      "key": "programming_hours",
      "value": 0,
      "goal": 40
    }
  ]
}

${
  existingSchema && Object.keys(existingSchema).length > 0
    ? `
**Instructions:**
- Only include keys present in the current day's description.
- Omit any keys from the existing schema that are not mentioned today.
- Add new keys as needed without altering the existing ones.
- For each property, generate an object in the same format as its "example" value, ignoring the "example" key itself.
- If a goal is mentioned for a metric, include it as a "goal" field alongside "value".
- For yes/no events, assign a value of 1 if the event occurred, or 0 if not mentioned.
- Ensure the JSON is properly formatted and valid.
`
    : `
**Instructions:**
- Extract all relevant data points from the description.
- Identify and resolve all date references to "YYYY-MM-DD" format based on today's date (${todayDate}).
- Associate each data point with its corresponding date.
- Organize them into a clear and consistent JSON structure as shown in the example.
- Use appropriate data types (e.g., integers for times and numerical values).
- Ensure the JSON is properly formatted and valid.
- The unit of measurement should always match the user's description (e.g., hours remain hours). Include units as needed.
- For each property, output an object that matches the structure found in the "example" without including the "example" key.
- If a goal is mentioned in the description, include it as a "goal" property for the relevant metric.
- For yes/no events, assign a value of 1 if the event occurred, or 0 otherwise.
- Optionally include a "description" key for context if the user provides specific details beyond numbers.
`
}
`;
};

export const getChartConfigPrompt = (
  keys: string[],
  userDescription: string,
) => {
  return `
    You are an AI assistant that recommends chart types ("Line", "Bar", "Pie", "ProgressBar", "ProgressCircle", "Tracker", "ActivityCalendar") for numerical metrics based on their key names and context.
    Given the following keys: ${JSON.stringify(keys)}
    And considering the user's description: "${userDescription}"
    Output a JSON object mapping each key to its recommended chart type.

    **RULES**:
    1. If the data for a key is binary (only 0s and 1s across days), recommend "Tracker" for that key.
    2. If the user implies or states a target, objective, or any numeric threshold they want to achieve (even if they don't use the word "goal"), you should return "ProgressBar" for that key (Unless the user specifies they want a ProgressCircle instead).
    3. Return "Pie" only if the user explicitly requests it in their description.
    4. Otherwise, default to "Line" or "Bar" based on context (e.g., time series might be "Line", discrete comparisons might be "Bar").

    **IMPORTANT**:
    - You should only return strings: "Line", "Bar", "Pie", "ProgressBar", "ProgressCircle", "Tracker", "ActivityCalendar".
    - The output must be a valid JSON object where each key maps to one of the above strings.
  `;
};

export const getChartChangeExtractionPrompt = (userInput: string) => `
Extract all metric keys and their desired chart types from this request. 
Valid chart types: Line, Bar, Pie, ProgressBar, ProgressCircle, Tracker, ActivityCalendar.

Respond with JSON array of changes: {
  "changes": [
    {
      "key": "snake_case_metric_name",
      "chartType": "ValidChartType",
      "confidence": 0-1
    },
    // ... more changes
  ]
}

Example input: "Change programming_hours to a bar chart and make steps display as a progress circle"
Example response: {
  "changes": [
    {
      "key": "programming_hours",
      "chartType": "Bar",
      "confidence": 0.9
    },
    {
      "key": "steps",
      "chartType": "ProgressCircle", 
      "confidence": 0.9
    }
  ]
}

User input: "${userInput}"
`;

type IntentType = "chart_change_request" | "data_entry";

interface IntentClassification {
  intent: IntentType;
  confidence: number;
}

export async function classifyIntent(
  userInput: string,
  conversation: {}[],
): Promise<IntentType> {
  const prompt = `
Analyze this user input to determine their intent. Respond with JSON format:
{
  "intent": "chart_change_request" | "data_entry" 
  "confidence": 0.0-1.0
}

Consider these patterns:
- Chart change requests: mentions "change", "switch", "make", "show as", "display as" with chart types
- Data entry: contains numbers, metrics, descriptions of activities/events, or updates to existing data
- Consider the conversation history to determine intent

Examples of chart change requests:
- "Change the programming hours chart to a bar chart"
- "Make the steps display as a progress circle" 
- "Switch the caffeine consumption to a pie chart"

Examples of data entry:
- "I slept 8 hours last night"
- "Update yesterday's workout time to 45 minutes"
- "Change my steps for Monday to 8000"
- "I drank 3 cups of coffee today"

User input: "${userInput}"
  `;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const userPrompt = { role: "user", content: prompt };
    conversation.push(userPrompt);
    const response = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: conversation as any,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0]?.message?.content || "{}",
    ) as IntentClassification;

    // Validate and fallback to data_entry if uncertain
    if (
      result.confidence >= 0.2 &&
      [
        "chart_change_request",
        "data_entry",
        "future_feature_1",
        "future_feature_2",
      ].includes(result.intent)
    ) {
      return result.intent;
    }

    return "data_entry";
  } catch (error) {
    console.error("Intent classification failed:", error);
    return "data_entry";
  }
}

/**
 * Generates a prompt for OpenAI to extract a date from user input.
 *
 * @param userDescription - The latest input from the user.
 * @param conversationHistory - The array of previous conversation messages.
 * @param todayDate - Today's date in 'YYYY-MM-DD' format.
 * @returns A string prompt tailored for the OpenAI API.
 */
const generateDateExtractionPrompt = (
  userDescription: string,
  todayDate: string,
): string => {
  return `
    You are a date extraction assistant. Based on the conversation history and the user's latest input, extract the date the user is referring to in the format 'YYYY-MM-DD'.

    **User Input:**
    "${userDescription}"

    **Instructions:**
    1. Identify the date the user is referring to in their input.
    2. If the user refers to relative dates like "yesterday" or "the previous day," resolve them based on today's date: ${todayDate}.
    3. If the extracted date is in the future relative to today's date (${todayDate}), return today's date instead.
    4. If no valid date is found, assume today's date: ${todayDate}.
    5. Respond with only the date in 'YYYY-MM-DD' format. Do not include any additional text.
    
    **Example Responses:**
    - "2025-01-22"
    - "2024-12-31"
  `;
};

// ~/app/utils/utilFunctions.ts
export interface UserActionResponse {
  chartChanges?: Array<{ key: string; chartType: string }>;
  updates?: Array<{
    date: string;
    key: string;
    value: number;
    goal?: number;
  }>;
}

export async function parseUserActions(
  userInput: string,
  conversation: Array<{ role: string; content: string }>
): Promise<UserActionResponse> {
  const prompt = `
Analyze this user input and extract both chart configuration changes and data updates.
Return a JSON object with two arrays: "chartChanges" and "updates".

CHART CHANGES:
- Format: { "key": "metric_name", "chartType": "ValidChartType" }
- Valid chart types: Line, Bar, Pie, ProgressBar, ProgressCircle, Tracker, ActivityCalendar
- Only return valid chart types
- Only include chart changes that are explicitly mentioned in the user's input

DATA UPDATES:
- Format: { "date": "YYYY-MM-DD", "key": "metric_name", "value": number, "goal?": number }
- Resolve relative dates (e.g., "yesterday") to actual dates
- Use today's date (${new Date().toISOString().split('T')[0]}) if future date is detected

USER INPUT: "${userInput}"

EXAMPLE RESPONSE FOR:
"Change programming_hours to Bar chart and log 5 hours for yesterday"
{
  "chartChanges": [{ "key": "programming_hours", "chartType": "Bar" }],
  "updates": [{ "date": "${new Date(new Date().setDate(new Date().getDate()-1)).toISOString().split('T')[0]}", "key": "programming_hours", "value": 5 }]
}
`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const response = await openai.chat.completions.create({
    model: "chatgpt-4o-latest",
    messages: [
      ...conversation,
      { role: "user" as const, content: prompt }
    ] as ChatCompletionMessageParam[],
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) throw new Error("No response from OpenAI");

  try {
    return JSON.parse(rawContent) as UserActionResponse;
  } catch (error) {
    console.error("Error parsing actions:", error, "Raw content:", rawContent);
    throw new Error("Invalid response format");
  }
}

export async function parseUserActions2(
  userInput: string,
  conversation: Array<{ role: string; content: string }>,
  cumulativeSchema: JsonValue
): Promise<UserActionResponse> {
  const todayDate = new Date().toISOString().split('T')[0];
  const prompt = `
Analyze user input and generate two types of actions: chart configuration changes and data updates.
Use the cumulative schema to maintain consistency with existing data structures and measurement units.

CUMULATIVE SCHEMA CONTEXT:
${
  cumulativeSchema 
    ? JSON.stringify(cumulativeSchema, null, 2)
    : "No existing schema found. Create new metrics as needed."
}

TASKS:
1. CHART CONFIGURATION:
- Format: { "key": "metric_name", "chartType": "ValidChartType" }
- Valid types: Line, Bar, Pie, ProgressBar, ProgressCircle, Tracker, ActivityCalendar
- Only include EXPLICIT chart change requests
- Maintain existing chart types if not mentioned

2. DATA UPDATES:
- Format: { "date": "YYYY-MM-DD", "key": "metric_name", "value": number, "goal?": number }
- Resolve relative dates using today (${todayDate})
- Use existing metric formats from cumulative schema
- For new metrics, infer type from context:
  - Time: integer (minutes/hours)
  - Yes/No: 1/0
  - Count: integer
  - Money: number

RULES:
- PRESERVE existing schema structure for known metrics
- For schema metrics, use EXACTLY the format from their "example" field
- Convert relative time references to 24h integers (e.g., "7 AM" → 700)
- Future dates → default to ${todayDate}
- Explicit goals → include "goal" field
- Implicit goals → omit unless clearly stated

USER INPUT: "${userInput}"

EXAMPLE RESPONSE FOR:
"change coding hours to ProgressBar and logged 5h yesterday against weekly goal of 30h"
{
  "chartChanges": [{ "key": "coding_hours", "chartType": "ProgressBar" }],
  "updates": [
    {
      "date": "${getYesterdayDate()}",
      "key": "coding_hours",
      "value": 5,
      "goal": 30
    }
  ]
}
`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const response = await openai.chat.completions.create({
  model: "chatgpt-4o-latest",
  messages: [
    {
      role: "system",
      content: "You are a JSON-focused assistant. Always respond with valid JSON."
    },
    ...conversation,
    {
      role: "user",
      content: `${prompt}\n\nRespond with a JSON object only.`
    }
  ] as ChatCompletionMessageParam[],
  response_format: { type: "json_object" },
});

const rawContent = response.choices[0]?.message?.content;
if (!rawContent) throw new Error("No response from OpenAI");

try {
  return JSON.parse(rawContent) as UserActionResponse;
} catch (error) {
  console.error("Error parsing actions:", error, "Raw content:", rawContent);
  throw new Error("Invalid response format");
}
}

// Helper function
function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0]!;
}


import { parseISO, isValid, addDays, format } from "date-fns";

/**
 * Build a consecutive daily timeline from the earliest day in allDays -> today.
 * For each date, if we have daySchema data for a particular key, use it; otherwise 0.
 *
 * Example return shape:
 * [
 *   { date: "2025-01-01", value: 2 },
 *   { date: "2025-01-02", value: 0 },
 *   ...
 *   { date: "YYYY-MM-DD", value: <some number> },
 * ]
 */
// utilFunctions.ts - Update buildContinuousData
export function buildContinuousData(
  allDays: any[],
  key: string
): Array<{ date: string; value: number }> {
  console.log("allDays", allDays);
  if (!allDays || allDays.length === 0) return [];

  // Clone and sort days ascending
  const sortedDays = [...allDays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get true earliest date from sorted array
  const earliest = parseISO(sortedDays[0].date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Create date map with proper fallbacks
  const dayValueMap = new Map<string, number>();
  sortedDays.forEach(day => {
    const dateStr = format(parseISO(day.date), "yyyy-MM-dd");
    dayValueMap.set(dateStr, day.daySchema?.[key]?.value ?? 0);
  });

  // Generate complete timeline
  const results: Array<{ date: string; value: number }> = [];
  let currentDate = new Date(earliest);

  while (currentDate <= now) {
    const isoDate = format(currentDate, "yyyy-MM-dd");
    results.push({
      date: isoDate,
      value: dayValueMap.get(isoDate) ?? 0
    });
    currentDate = addDays(currentDate, 1);
  }
  console.log("results", results);
  return results;
}
