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
    5. For most cases its better to keep property names generalized for future adaptation. For example if a user says in their
    description, "$15 spent on lunch" the better property name would be "money_spent" and NOT something like "money_spent_on_lunch"

    ${
      existingSchema &&
      Object.keys(existingSchema).length > 0 &&
      `**Existing Schema (JSON):**
    ${JSON.stringify(existingSchema, null, 2)}`
    }
    

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

    

    ${
      existingSchema && Object.keys(existingSchema).length > 0
        ? `**Instructions:**
    - Only include keys that are present in the current day's description.
    - Omit any keys from the existing schema that are not mentioned today.
    - Add new keys as needed without altering the existing ones.
    - Ensure the JSON is properly formatted and valid.`
        : `- Extract all relevant data points mentioned in the description.
    - Organize them into a clear and consistent JSON structure.
    - Use appropriate data types (e.g., integers for times and numerical values).
    - Ensure the JSON is properly formatted and valid.`
    }
    
  `;
};

export const getChartConfigPrompt = (
  keys: string[],
  userDescription: string,
) => {
  return `
    You are an AI assistant that recommends chart types ("Line" or "Bar" or "Pie") for numerical metrics based on their key names and context.
    Given the following keys: ${JSON.stringify(keys)}
    And considering the user's description: "${userDescription}"
    Output a JSON object mapping each key to its recommended chart type.

    **IMPORTANT** YOU SHOULD ONLY RETURN STRINGS: "Line", "Bar" or "Pie"
  `;
};
