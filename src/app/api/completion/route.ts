import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * @see https://sdk.vercel.ai/docs/api-reference/use-completion
 */
export async function POST(req: Request) {
  const { prompt, exercise } = await req.json();
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: [
      {
        role: "user",
        content: `Analyze if the provided implementation of ${exercise} in typescript is correct - ${prompt}. Only respond using code comments and code directly without using markdown.`,
      },
    ],
    temperature: 0,
  });

  const stream = OpenAIStream(response);

  return new StreamingTextResponse(stream);
}
