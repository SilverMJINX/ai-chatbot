import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // Check DB for fullText first (manually added books)
  try {
    const client = await clientPromise;
    const db = client.db("atlas-books");
    const book = await db.collection("books").findOne({ _id: new ObjectId(id) });

    if (book?.fullText) {
      return new Response(book.fullText, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  } catch {
    // Not a valid ObjectId, fall through to Gutenberg
  }

  // Fall back to Gutenberg URLs
  const candidates = [
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
  ];

  for (const url of candidates) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const raw = await res.text();
      return new Response(stripBoilerplate(raw), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  return Response.json({ error: "Text unavailable" }, { status: 404 });
}

function stripBoilerplate(text: string): string {
  const start = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG/i;
  const end   = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG/i;
  const si = text.search(start);
  const ei = text.search(end);
  if (si !== -1) {
    const after = text.indexOf('\n', si) + 1;
    return (ei !== -1 ? text.slice(after, ei) : text.slice(after)).trim();
  }
  return text.trim();
}