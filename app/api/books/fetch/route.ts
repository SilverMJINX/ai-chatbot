import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const client = await clientPromise;
  const db = client.db();

  const book = await db.collection("books").findOne({
    $or: [
      { title: { $regex: query, $options: "i" } },
      { author: { $regex: query, $options: "i" } },
      { tags: { $regex: query, $options: "i" } },
      { themes: { $regex: query, $options: "i" } },
    ],
  });

  if (!book) return NextResponse.json({ error: "No book found" }, { status: 404 });

  return NextResponse.json({
    id: book._id.toString(),
    title: book.title,
    author: book.author,
    excerpt: (book.text as string)?.slice(0, 3000) ?? "",
  });
}