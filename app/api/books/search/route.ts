import { NextRequest } from "next/server";
// Test API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q     = searchParams.get('q') ?? '';
  const topic = searchParams.get('topic') ?? '';
  const page  = searchParams.get('page') ?? '1';

  const params = new URLSearchParams({ q, topic, page_size: '12' });

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

  const data = await res.json();
  return Response.json(data);
}