// lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateOpenAIResponse(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  responseFormat: { type: "json_object" | "text" } = { type: "json_object" },
) {
  try {
    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages,
      response_format: responseFormat,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate OpenAI response.");
  }
}
