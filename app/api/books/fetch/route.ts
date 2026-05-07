import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const client = await clientPromise;
  const db = client.db();

  // Split query into individual words so "grief loss healing" matches more broadly
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const regexes = terms.map(t => new RegExp(t, "i"));

  // Try exact/phrase match first
  let book = await db.collection("books").findOne({
    $or: [
      { title:  { $regex: query, $options: "i" } },
      { author: { $regex: query, $options: "i" } },
      { tags:   { $regex: query, $options: "i" } },
      { themes: { $regex: query, $options: "i" } },
    ],
  });

  // Fall back to any-word match if nothing found
  if (!book && terms.length > 1) {
    book = await db.collection("books").findOne({
      $or: regexes.flatMap(r => [
        { title:  { $regex: r } },
        { author: { $regex: r } },
        { tags:   { $regex: r } },
        { themes: { $regex: r } },
      ]),
    });
  }

  if (!book) return NextResponse.json({ error: "No book found" }, { status: 404 });

  return NextResponse.json({
    id:     book._id.toString(),
    title:  book.title,
    author: book.author,
    excerpt: (book.text as string)?.slice(0, 3000) ?? "",
    reason: book.reason ?? null, // ← was missing, route.ts expects this
  });
}