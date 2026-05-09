import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db("atlas-books");

  const progress = await db.collection("reading_progress").findOne({
    userId: token.sub,
    bookId,
  });

  return NextResponse.json({ position: progress?.position ?? 0 });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, position } = await req.json();
  if (!bookId || position === undefined) {
    return NextResponse.json({ error: "bookId and position required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("atlas-books");

  await db.collection("reading_progress").updateOne(
    { userId: token.sub, bookId },
    {
      $set: {
        userId:    token.sub,
        bookId,
        position,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}