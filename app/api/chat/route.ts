import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are Atlas, a warm and empathetic AI therapist. Your role is to:
- Listen actively and compassionately to the user's feelings and concerns
- Provide supportive, non-judgmental responses
- Ask thoughtful follow-up questions to help users explore their emotions
- Offer evidence-based coping strategies when appropriate (CBT, mindfulness, etc.)
- Gently encourage professional help when situations seem serious
- Keep responses concise, warm, and conversational — avoid long clinical paragraphs
- Never diagnose or prescribe; always remind users you're an AI, not a licensed therapist when appropriate
- Be culturally sensitive and inclusive

Important: If a user expresses thoughts of self-harm or suicide, immediately provide crisis resources (e.g., 03-76272929 Befrienders Kuala Lumpur) and encourage them to seek immediate help.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
  return NextResponse.json(
    { error: "Invalid request" },
    { status: 400 }
  );
}

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Convert messages to Gemini format
    // Skip the first assistant message (greeting) for history
    const history = messages
      .slice(1)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
  }));

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.85,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}