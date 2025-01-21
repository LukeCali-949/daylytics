import { JsonValue } from "@prisma/client/runtime/library";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export const getGenerateDaySchemaPrompt = (
  userDescription: string,
  existingSchema?: JsonValue,
) => {
  return `
    You are an AI assistant that generates JSON schemas based on user descriptions of their day.

    Your tasks are:
    1. Extract relevant data points from the user's description.
    2. Organize these data points into a structured JSON schema.
    3. Ensure all time-related fields are represented as integers in military time (e.g., "7 AM" = 700, "10 PM" = 2200).
    4. Maintain consistency in data types and naming conventions.
    5. For most cases, use generalized property names for future adaptation. For example, for "$15 spent on lunch", use "money_spent" instead of "money_spent_on_lunch".
    6. If the user mentions a goal (e.g., "I want to achieve 40 hours of programming"), then for the relevant property include a "goal" field alongside "value". For example: 
       {
         "programming_hours": { "value": 5, "goal": 40 }
       }
    7. For events that represent a yes/no situation (e.g., "I went on a run" or "I ate breakfast"), assign a binary value:
       - Use 1 to indicate the event occurred.
       - Use 0 to indicate the event did not occur or was not mentioned.

    ${
      existingSchema &&
      Object.keys(existingSchema).length > 0 &&
      `**Existing Schema (JSON):**
    ${JSON.stringify(existingSchema, null, 2)}
    
    For each property in the existing schema, disregard any "example" wrappers.
    When generating a value for a property, output it using exactly the format found inside its "example" field.
    For instance, if a property is defined as { "example": { "value": 700 } },
    then generate { "value": <appropriate_value> } for that property, without including the "example" key.`
    }
    
    **User Description:**
    "${userDescription}"
  
    **Example:**
    _User Description_: "I woke up at 7 AM, worked for 8 hours, spent $15 on lunch, went jogging for 30 minutes, and I want to achieve 40 hours of programming this week."
  
    _Generated JSON Schema_:
    {
      "wake_up_time": { "value": 700 },
      "hours_worked": { "value": 8 },
      "money_spent": { "value": 15 },
      "exercise": { "value": 30 },
      "programming_hours": { "value": 5, "goal": 40 }
    }
  
    ${
      existingSchema && Object.keys(existingSchema).length > 0
        ? `**Instructions:**
    - Only include keys present in the current day's description.
    - Omit any keys from the existing schema that are not mentioned today.
    - Add new keys as needed without altering the existing ones.
    - For each property, generate an object in the same format as its "example" value, ignoring the "example" key itself.
    - If a goal is mentioned for a metric, include it as a "goal" field alongside "value".
    - For yes/no events, assign a value of 1 if the event occurred, or 0 if not mentioned.
    - Ensure the JSON is properly formatted and valid.`
        : `**Instructions:**
    - Extract all relevant data points from the description.
    - Organize them into a clear and consistent JSON structure.
    - Use appropriate data types (e.g., integers for times and numerical values).
    - Ensure the JSON is properly formatted and valid.
    - The unit of measurement should always match the user's description (e.g., hours remain hours). Include units as needed.
    - For each property, output an object that matches the structure found in the "example" without including the "example" key.
    - If a goal is mentioned in the description, include a "goal" property for the relevant metric.
    - For yes/no events, assign a value of 1 if the event occurred, or 0 otherwise.
    - Optionally include a "description" key for context if the user provides specific details beyond numbers.`
    }
  
    **IMPORTANT RULES**
    1. The "value" key is critical; always store the main unit under "value".
  `;
};

export const getChartConfigPrompt = (
  keys: string[],
  userDescription: string,
) => {
  return `
    You are an AI assistant that recommends chart types ("Line", "Bar", "Pie", "ProgressBar", "ProgressCircle", "Tracker") for numerical metrics based on their key names and context.
    Given the following keys: ${JSON.stringify(keys)}
    And considering the user's description: "${userDescription}"
    Output a JSON object mapping each key to its recommended chart type.

    **RULES**:
    1. If the data for a key is binary (only 0s and 1s across days), recommend "Tracker" for that key.
    2. If the user implies or states a target, objective, or any numeric threshold they want to achieve (even if they don't use the word "goal"), you should return "ProgressBar" for that key (Unless the user specifies they want a ProgressCircle instead).
    3. Return "Pie" only if the user explicitly requests it in their description.
    4. Otherwise, default to "Line" or "Bar" based on context (e.g., time series might be "Line", discrete comparisons might be "Bar").

    **IMPORTANT**:
    - You should only return strings: "Line", "Bar", "Pie", "ProgressBar", "ProgressCircle", "Tracker".
    - The output must be a valid JSON object where each key maps to one of the above strings.
  `;
};

export const getChartChangeExtractionPrompt = (userInput: string) => `
Extract all metric keys and their desired chart types from this request. 
Valid chart types: Line, Bar, Pie, ProgressBar, ProgressCircle, Tracker.

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

Input: "${userInput}"
`;

type IntentType =
  | "chart_change_request"
  | "data_entry"

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
- Data entry: contains numbers, metrics, or descriptions of activities/events
- Consider the conversation history to determine intent


Examples of chart change requests:
- "Change the programming hours chart to a bar chart"
- "Make the steps display as a progress circle"
- "Switch the caffeine consumption to a pie chart"

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
