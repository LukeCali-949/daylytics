import { JsonValue } from "@prisma/client/runtime/library";

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
    _User Description_: "I woke up at 7 AM, worked for 8 hours, spent $15 on lunch, and went jogging for 30 minutes. I want to achieve 40 hours of programming this week."
  
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
    - Ensure the JSON is properly formatted and valid.`
        : `**Instructions:**
    - Extract all relevant data points from the description.
    - Organize them into a clear and consistent JSON structure.
    - Use appropriate data types (e.g., integers for times and numerical values).
    - Ensure the JSON is properly formatted and valid.
    - The unit of measurement should always match the user's description (e.g., hours remain hours). Include units as needed.
    - For each property, output an object that matches the structure found in the "example" without including the "example" key.
    - If a goal is mentioned in the description, include a "goal" property for the relevant metric.
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
    You are an AI assistant that recommends chart types ("Line", "Bar", "Pie", or "ProgressBar") for numerical metrics based on their key names and context.
    Given the following keys: ${JSON.stringify(keys)}
    And considering the user's description: "${userDescription}"
    Output a JSON object mapping each key to its recommended chart type.

    **RULES**:
    1. If the user implies or states a target, objective, or any numeric threshold they want to achieve (even if they don't use the word "goal"), you should return "ProgressBar" for that key.
    2. Return "Pie" only if the user explicitly requests it in their description.
    3. Otherwise, default to "Line" or "Bar" based on context (e.g., time series might be "Line", discrete comparisons might be "Bar").

    **IMPORTANT**:
    - You should only return strings: "Line", "Bar", "Pie", or "ProgressBar".
    - The output must be a valid JSON object where each key maps to one of the above strings.
  `;
};
