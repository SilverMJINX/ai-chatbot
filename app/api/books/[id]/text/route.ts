export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const candidates = [
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
  ];

  for (const url of candidates) {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (res.ok) {
      const raw = await res.text();
      return new Response(stripBoilerplate(raw), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }
  return Response.json({ error: 'Text unavailable' }, { status: 404 });
}

function stripBoilerplate(text: string): string {
  const start = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG/i;
  const end   = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG/i;
  const si = text.search(start);
  const ei = text.search(end);
  if (si !== -1) {
    const after = text.indexOf('\n', si) + 1;
    return (ei !== -1 ? text.slice(after, ei) : text.slice(after)).trim();
  }
  return text.trim();
}