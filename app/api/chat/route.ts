import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  Tool,
  FunctionDeclaration,
  SchemaType,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are Atlas, a warm and empathetic AI bibliotherapist. Your role is to:
- Listen actively and compassionately to the user's feelings and concerns
- Provide supportive, non-judgmental responses
- Ask thoughtful follow-up questions to help users explore their emotions
- Offer evidence-based coping strategies when appropriate (CBT, mindfulness, etc.)
- Gently encourage professional help when situations seem serious
- Keep responses concise, warm, and conversational — avoid long clinical paragraphs
- Never diagnose or prescribe; always remind users you're an AI, not a licensed therapist when appropriate
- Be culturally sensitive and inclusive

BOOK RECOMMENDATIONS — STRICT RULES:
You have access to a book library via the fetch_book tool. You MUST follow these rules exactly:

1. ONLY call fetch_book when the user EXPLICITLY asks for a book, e.g.:
   - "recommend a book", "suggest a book", "what should I read", "any book for this",
     "can you recommend something to read", "what book", "find me a book"
2. NEVER call fetch_book based on emotional context alone — just because someone is sad,
   anxious, or grieving does NOT mean you should fetch a book.
3. NEVER call fetch_book more than once per conversation turn.
4. If the user has not asked for a book, respond with ONLY conversational text. No tool calls.
5. When in doubt, do NOT call the tool. Default to conversation.

Important: If a user expresses thoughts of self-harm or suicide, immediately provide crisis 
resources (e.g., 03-76272929 Befrienders Kuala Lumpur) and encourage them to seek immediate help.`;

const fetchBookDeclaration: FunctionDeclaration = {
  name: "fetch_book",
  description: `ONLY call this when the user has explicitly asked for a book recommendation 
    using words like "recommend a book", "suggest a book", "what should I read", 
    "find me a book", "any book for this", etc. 
    DO NOT call this based on emotional context alone.`,
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          "Book title, author name, or emotional theme to search for. E.g. 'grief loss healing', 'Viktor Frankl meaning', 'anxiety mindfulness'",
      },
    },
    required: ["query"],
  },
};

const tools: Tool[] = [{ functionDeclarations: [fetchBookDeclaration] }];

async function fetchBookFromDB(query: string): Promise<{ text: string; book: any | null }> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/books/fetch?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { text: "No matching book found in the library for that query.", book: null };
    const book = await res.json();
    return {
      text: `📖 "${book.title}" by ${book.author}:\n\n${book.excerpt}`,
      book,
    };
  } catch (err) {
    console.error("Book fetch error:", err);
    return { text: "Sorry, I couldn't retrieve a book right now.", book: null };
  }
}

function safeText(response: any): string {
  try {
    const text = response.text();
    return text?.trim() || "";
  } catch {
    return "";
  }
}

// Check if user message explicitly requests a book
function userWantsBook(message: string): boolean {
  const lower = message.toLowerCase();
  const triggers = [
    "recommend a book", "suggest a book", "what should i read", "any book",
    "find me a book", "what book", "good book", "book recommendation",
    "book for", "read something", "reading recommendation", "suggest something to read",
    "recommend something to read", "book about", "books about", "any reading",
  ];
  return triggers.some(t => lower.includes(t));
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }

    // If user hasn't asked for a book, don't give Gemini the tool at all
    const includeTools = userWantsBook(lastMessage.content);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      ...(includeTools ? { tools } : {}),
    });

    const rawHistory = messages.slice(0, -1);
    const firstUserIdx = rawHistory.findIndex(
      (m: { role: string }) => m.role === "user"
    );

    const history =
      firstUserIdx === -1
        ? []
        : rawHistory
            .slice(firstUserIdx)
            .map((msg: { role: string; content: string }) => ({
              role: msg.role === "assistant" ? "model" : "user",
              parts: [{ text: msg.content }],
            }));

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.85,
      },
    });

    let result = await chat.sendMessage(lastMessage.content);
    let response = result.response;

    let foundBook: any = null;
    let loopCount = 0;
    const MAX_LOOPS = 1; // Only allow one book fetch per turn

    while (loopCount < MAX_LOOPS) {
      const fnCalls = response.functionCalls();
      if (!fnCalls || fnCalls.length === 0) break;

      loopCount++;
      const fnCall = fnCalls[0];
      if (fnCall.name !== "fetch_book") break;

      const query = (fnCall.args as { query?: string })?.query || "";
      const { text: bookContent, book } = await fetchBookFromDB(query);

      if (book) foundBook = book;

      try {
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: "fetch_book",
              response: { content: bookContent },
            },
          },
        ]);
        response = result.response;
      } catch (fnErr) {
        console.error("Function response error:", fnErr);
        break;
      }
    }

    const text =
      safeText(response) ||
      "I'm here with you. Could you tell me a bit more about what's on your mind?";

    return NextResponse.json({
      content: text,
      book: foundBook
        ? {
            id:     foundBook.id,
            title:  foundBook.title,
            author: foundBook.author,
            reason: foundBook.reason ?? "Recommended by Atlas",
          }
        : undefined,
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        content: "I'm having a moment — could you try again? I'm still here with you.",
        book: undefined,
      },
      { status: 200 }
    );
  }
}