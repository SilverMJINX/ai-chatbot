export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const topic = searchParams.get('topic') ?? '';
  const page = searchParams.get('page') ?? '1';

  const params = new URLSearchParams({
    search: q, topic, page,
    languages: 'en',
    copyright: 'false',
  });

  const res = await fetch(`https://gutendex.com/books?${params}`, {
    next: { revalidate: 3600 }, // cache 1 hour
  });
  const data = await res.json();
  return Response.json(data);
}