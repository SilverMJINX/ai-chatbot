import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI!;

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  // Validation
  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db    = client.db("atlas_books");
    const users = db.collection("users");

    // Check if email already exists
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 12);

    // Insert user
    await users.insertOne({
      name,
      email:     email.toLowerCase(),
      password:  hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
  } catch (e: any) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    await client.close();
  }
}