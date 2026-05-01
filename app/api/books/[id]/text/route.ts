import { NextRequest } from "next/server";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const res = await fetch(
    `https://project-gutenberg-books-api.p.rapidapi.com/api/books/${id}/text?cleaning_mode=simple`,
    {
      headers: {
        "X-RapidAPI-Key":  process.env.GUTENBERG_API_KEY!,
        "X-RapidAPI-Host": "project-gutenberg-books-api.p.rapidapi.com",
      },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) {
    return Response.json({ error: "Text unavailable" }, { status: 404 });
  }

  const data = await res.json();
  return new Response(data.text ?? "", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}