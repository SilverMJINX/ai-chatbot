import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI!;

export async function GET(req: NextRequest) {
  // Get the current session
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db   = client.db("atlas_books");
    const user = await db.collection("users").findOne(
      { email: session.user.email.toLowerCase() },
      { projection: { password: 0 } } // never return the password
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id:        user._id.toString(),
      name:      user.name,
      email:     user.email,
      createdAt: user.createdAt,
    });
  } finally {
    await client.close();
  }
}

// PATCH /api/profile — update name
export async function PATCH(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("atlas_books");
    await db.collection("users").updateOne(
      { email: session.user.email.toLowerCase() },
      { $set: { name: name.trim(), updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Profile updated" });
  } finally {
    await client.close();
  }
}