import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';

  const res = await fetch(
    `https://gutendex.com/books?search=${encodeURIComponent(q)}`,
    { cache: "no-store" }
  );

  const data = await res.json();
  return Response.json({ results: data.results ?? [] });
}