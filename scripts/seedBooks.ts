import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TOPICS = [
  "anxiety mindfulness",
  "hope happiness",
  "grief loss",
  "stoicism anger",
  "friendship",
  "self improvement",
  "philosophy meaning",
  "healing recovery",
  "love relationships",
  "sleep rest",
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

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not found in .env.local"); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db("atlas-books");
  const col = db.collection("books");

  await col.deleteMany({});
  console.log("Cleared existing books");

  const seen = new Set<number>();

  for (const topic of TOPICS) {
    console.log(`Fetching: ${topic}`);
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
      console.log(`✓ Inserted ${books.length} books for "${topic}"`);
    } catch (err) {
      console.error(`✗ Failed for "${topic}":`, err);
    }
  }

  await col.createIndex({ title: "text", subjects: "text", tags: "text" });
  await col.createIndex({ tags: 1 });
  console.log("✓ Indexes created");
  console.log("✓ Seeding complete!");

  await client.close();
}

seed().catch(console.error);