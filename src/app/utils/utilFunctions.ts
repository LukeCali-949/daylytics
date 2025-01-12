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
      - Only include keys present in the current day's description.
      - Omit keys from the existing schema not mentioned today.
      - Add new keys as needed without altering the existing ones.
      - For each property, generate an object in the same format as its "example" value, ignoring the "example" key itself.
      - Ensure the JSON is properly formatted and valid.`
          : `**Instructions:**
      - Extract all relevant data points from the description.
      - Organize them into a clear and consistent JSON structure.
      - Use appropriate data types (e.g., integers for times and numerical values).
      - Ensure the JSON is properly formatted and valid.
      - The unit of measurement should always match the user's description (e.g., hours remain hours). No need to include this as a key though.
      - For each property, output an object that matches the structure found in the "example" without including the "example" key.`
      }
  
      **IMPORTANT RULES**
      1. The "value" key is critical; always store the main unit under "value".
      2. Always include an description key that describes the key
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

    **RULES**
    You should only return "Pie" if the user explicity asks for it in the user description

    **IMPORTANT** YOU SHOULD ONLY RETURN STRINGS: "Line", "Bar" or "Pie"
  `;
};
