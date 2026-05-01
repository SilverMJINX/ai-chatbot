import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q     = searchParams.get('q') ?? '';
  const topic = searchParams.get('topic') ?? '';
  const page  = searchParams.get('page') ?? '1';

  const params = new URLSearchParams({ q, topic, page_size: '12' });

  console.log("Searching for:", q);
  console.log("URL:", `https://project-gutenberg-books-api.p.rapidapi.com/api/books?${params}`);
  console.log("Key exists:", !!process.env.GUTENBERG_API_KEY);

  const res = await fetch(
    `https://project-gutenberg-books-api.p.rapidapi.com/api/books?${params}`,
    {
      headers: {
        "X-RapidAPI-Key":  process.env.GUTENBERG_API_KEY!,
        "X-RapidAPI-Host": "project-gutenberg-books-api.p.rapidapi.com",
      },
      next: { revalidate: 3600 },
    }
  );

  console.log("RapidAPI status:", res.status);
  const data = await res.json();
  console.log("RapidAPI response:", JSON.stringify(data).slice(0, 300));

  return Response.json(data);
}