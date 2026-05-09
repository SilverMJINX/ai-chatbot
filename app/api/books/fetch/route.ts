import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const client = await clientPromise;
  const db = client.db("atlas-books");

  const terms = query.trim().split(/\s+/).filter(Boolean);
  const regexes = terms.map(t => new RegExp(t, "i"));

  // Try exact/phrase match first across all relevant fields
  let book = await db.collection("books").findOne({
    $or: [
      { title:            { $regex: query, $options: "i" } },
      { "authors.name":   { $regex: query, $options: "i" } },
      { tags:             { $regex: query, $options: "i" } },
      { subjects:         { $regex: query, $options: "i" } },
      { bookshelves:      { $regex: query, $options: "i" } },
    ],
  });

  // Fall back to any-word match if nothing found
  if (!book && terms.length > 1) {
    book = await db.collection("books").findOne({
      $or: regexes.flatMap(r => [
        { title:           { $regex: r } },
        { "authors.name":  { $regex: r } },
        { tags:            { $regex: r } },
        { subjects:        { $regex: r } },
        { bookshelves:     { $regex: r } },
      ]),
    });
  }

  if (!book) return NextResponse.json({ error: "No book found" }, { status: 404 });

  // Extract the plain text URL from formats
  const formats = book.formats || {};
  const textUrl =
    formats["text/plain; charset=utf-8"] ||
    formats["text/plain; charset=us-ascii"] ||
    formats["text/plain"] ||
    null;

  // Extract epub/html URLs for reading
  const epubUrl   = formats["application/epub+zip"] || null;
  const htmlUrl   = formats["text/html"] || null;
  const coverUrl  = formats["image/jpeg"] || null;

  // Fetch a short excerpt from Gutenberg plain text if available
  let excerpt = "";
  if (textUrl) {
    try {
      const res = await fetch(textUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const raw = await res.text();
        // Strip Gutenberg boilerplate and grab first 3000 chars
        const startMatch = raw.match(/\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*/i);
        const startIdx = startMatch?.index !== undefined
          ? raw.indexOf("\n", startMatch.index) + 1
          : 0;
        excerpt = raw.slice(startIdx, startIdx + 3000).trim();
      }
    } catch {
      // If fetch times out or fails, excerpt stays empty
    }
  }

  // Author string
  const author = Array.isArray(book.authors)
    ? book.authors.map((a: any) => a.name).join(", ")
    : book.author || "Unknown";

  return NextResponse.json({
    id:          book._id.toString(),
    gutenbergId: book.gutenbergId ?? null,
    title:       book.title,
    author,
    tags:        book.tags || [],
    subjects:    book.subjects || [],
    coverUrl,
    textUrl,
    epubUrl,
    htmlUrl,
    excerpt,
    downloadCount: book.downloadCount ?? 0,
    reason:      book.reason ?? null,
  });
}