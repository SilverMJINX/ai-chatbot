import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

const TOPICS = [
  "anxiety mindfulness", "hope happiness", "grief loss",
  "stoicism anger", "friendship", "self improvement",
  "philosophy meaning", "healing recovery", "love relationships", "sleep rest",
];

const TAG_MAP: Record<string, string[]> = {
  "anxiety mindfulness": ["anxiety", "mindfulness", "stress"],
  "hope happiness":      ["happiness", "hope", "depression"],
  "grief loss":          ["grief", "loss", "bereavement"],
  "stoicism anger":      ["anger", "stoicism", "frustration"],
  "friendship":          ["loneliness", "friendship", "connection"],
  "self improvement":    ["confidence", "self-esteem", "growth"],
  "philosophy meaning":  ["purpose", "meaning", "philosophy"],
  "healing recovery":    ["trauma", "healing", "recovery"],
  "love relationships":  ["relationships", "love", "heartbreak"],
  "sleep rest":          ["sleep", "exhaustion", "rest"],
};

export async function GET(req: NextRequest) {
  // Simple secret check so random people can't trigger it
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.SEED_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db("atlas-books");
  const col = db.collection("books");

  await col.deleteMany({});

  const seen = new Set<number>();
  const results: string[] = [];

  for (const topic of TOPICS) {
    try {
      const res = await fetch(
        `https://gutendex.com/books?search=${encodeURIComponent(topic)}&languages=en`
      );
      const data = await res.json();
      const books = (data.results ?? []).slice(0, 10);

      for (const b of books) {
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        await col.insertOne({
          gutenbergId: b.id,
          title: b.title,
          authors: b.authors,
          subjects: b.subjects ?? [],
          bookshelves: b.bookshelves ?? [],
          languages: b.languages ?? [],
          downloadCount: b.download_count ?? 0,
          formats: b.formats ?? {},
          tags: TAG_MAP[topic] ?? [],
          addedAt: new Date(),
        });
      }
      results.push(`✓ ${books.length} books for "${topic}"`);
    } catch (err) {
      results.push(`✗ Failed for "${topic}"`);
    }
  }

  await col.createIndex({ title: "text", subjects: "text", tags: "text" });
  await col.createIndex({ tags: 1 });

  return Response.json({ success: true, results });
}