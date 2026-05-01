import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const page = searchParams.get('page') ?? '1';

  const params = new URLSearchParams({ q, page_size: '12' });

  console.log("Searching for:", q);
  console.log("Key exists:", !!process.env.GUTENBERG_API_KEY);

  const res = await fetch(
    `https://project-gutenberg-books-api.p.rapidapi.com/api/books?${params}`,
    {
      headers: {
        "X-RapidAPI-Key":  process.env.GUTENBERG_API_KEY!,
        "X-RapidAPI-Host": "project-gutenberg-books-api.p.rapidapi.com",
      },
      cache: "no-store",
    }
  );

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Raw response:", JSON.stringify(data).slice(0, 500));

  // Normalize — handle whatever shape RapidAPI returns
  const books = data.results ?? data.books ?? data.data ?? data ?? [];

  return Response.json({ results: Array.isArray(books) ? books : [] });
}