import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";

const DB  = "atlas-books";
const COL = "saved_books";

// GET — fetch all saved books for the logged-in user
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(DB);

  const saved = await db
    .collection(COL)
    .find({ userId: token.sub })
    .sort({ savedAt: -1 })
    .toArray();

  return NextResponse.json(saved);
}

// POST — save a book
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bookUid, title, author, source, htmlUrl, tags } = body;

  if (!bookUid || !title || !source)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(DB);

  // Check if already saved — return early rather than throwing a duplicate key error
  const existing = await db.collection(COL).findOne({ userId: token.sub, bookUid });
  if (existing) return NextResponse.json({ alreadySaved: true });

  const doc = {
    userId:  token.sub,
    bookUid,
    title,
    author:  author  ?? "",
    source,
    htmlUrl: htmlUrl ?? null,
    tags:    tags    ?? [],
    savedAt: new Date(),
  };

  await db.collection(COL).insertOne(doc);
  return NextResponse.json(doc, { status: 201 });
}

// DELETE — unsave a book
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookUid } = await req.json();
  if (!bookUid)
    return NextResponse.json({ error: "Missing bookUid" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(DB);

  await db.collection(COL).deleteOne({ userId: token.sub, bookUid });
  return NextResponse.json({ success: true });
}