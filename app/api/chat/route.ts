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

You have access to a library of books. When a book would genuinely help the user — to comfort, 
inspire, or give perspective — use the fetch_book tool to retrieve an excerpt and naturally 
weave it into your response. Don't fetch a book every message, only when it meaningfully adds value.

Important: If a user expresses thoughts of self-harm or suicide, immediately provide crisis 
resources (e.g., 03-76272929 Befrienders Kuala Lumpur) and encourage them to seek immediate help.`;

const fetchBookDeclaration: FunctionDeclaration = {
  name: "fetch_book",
  description: `Fetch a relevant book excerpt from the library when the user's emotional state 
    or topic maps to a book that could genuinely help them. Use themes, emotions, or a specific 
    title/author as the query.`,
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

// Safely extract text from a Gemini response — never throws
function safeText(response: any): string {
  try {
    const text = response.text();
    return text?.trim() || "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools,
    });

    // History = everything EXCEPT the last user message (which we send via sendMessage)
    // Also skip any leading assistant messages (the greeting) — Gemini requires
    // history to start with a user turn.
    const rawHistory = messages.slice(0, -1);

    // Find the first user message index so history always starts with "user"
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

    const lastMessage = messages[messages.length - 1];

    // Guard: last message must be from user
    if (lastMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }

    let result = await chat.sendMessage(lastMessage.content);
    let response = result.response;

    let foundBook: any = null;
    let loopCount = 0;
    const MAX_LOOPS = 3;

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
        // If the function response fails, break and use what we have
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

    // Return a graceful message instead of a 500 so the chat doesn't break
    return NextResponse.json(
      {
        content: "I'm having a moment — could you try again? I'm still here with you.",
        book: undefined,
      },
      { status: 200 } // return 200 so the frontend shows the message, not an error
    );
  }
}