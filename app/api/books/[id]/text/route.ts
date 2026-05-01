export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }  // ← Promise now
) {
  const { id } = await params;  // ← await it

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
    return Response.json({ error: 'Text unavailable' }, { status: 404 });
  }

  const data = await res.json();
  return new Response(data.text ?? '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}