import fs from "fs";
import path from "path";
import { MongoClient, Collection } from "mongodb";
import * as pdfParse from "pdf-parse";

// Config 

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const BOOKS_FOLDER = process.argv[2] || "./books";

// Types 

interface Book {
  title: string;
  authors: { name: string }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  downloadCount: number;
  formats: Record<string, string>;
  tags: string[];
  addedAt: Date;
  // PDF-specific fields
  source: "pdf";
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  fullText: string;
  metadata: Record<string, unknown>;
}

// Helpers 

function deriveTitle(info: Record<string, string>, fileName: string): string {
  if (info?.Title?.trim()) return info.Title.trim();
  return path
    .basename(fileName, ".pdf")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function parsePdf(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const info = (data.info ?? {}) as Record<string, string>;

  return {
    title: deriveTitle(info, filePath),
    fullText: data.text,
    pageCount: data.numpages,
    fileSizeBytes: buffer.byteLength,
    metadata: info,
    author: info?.Author?.trim() || null,
  };
}

// Main 

async function uploadBooks(folderPath: string) {
  const resolvedFolder = path.resolve(folderPath);
  if (!fs.existsSync(resolvedFolder)) {
    console.error(`Folder not found: ${resolvedFolder}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(resolvedFolder)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (files.length === 0) {
    console.warn("No PDF files found in:", resolvedFolder);
    process.exit(0);
  }

  console.log(`Found ${files.length} PDF(s) in ${resolvedFolder}\n`);

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log("Connected to MongoDB\n");

  const db = client.db("atlas-books");             // ← matches seedBooks.ts
  const col: Collection<Book> = db.collection("books");

  // Same indexes as seedBooks.ts + unique fileName for dedup
  await col.createIndex({ title: "text", subjects: "text", tags: "text" });
  await col.createIndex({ tags: 1 });
  await col.createIndex({ fileName: 1 }, { unique: true });

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(resolvedFolder, file);
    process.stdout.write(`Processing: ${file} ... `);

    try {
      const existing = await col.findOne({ fileName: file });
      if (existing) {
        console.log("already in DB, skipping.");
        skipped++;
        continue;
      }

      const parsed = await parsePdf(filePath);

      const doc: Book = {
        // Shared shape with seedBooks.ts
        title: parsed.title,
        authors: parsed.author ? [{ name: parsed.author }] : [],
        subjects: [],
        bookshelves: [],
        languages: ["en"],
        downloadCount: 0,
        formats: { "application/pdf": file },
        tags: [],
        addedAt: new Date(),
        // PDF-specific
        source: "pdf",
        fileName: file,
        fileSizeBytes: parsed.fileSizeBytes,
        pageCount: parsed.pageCount,
        fullText: parsed.fullText,
        metadata: parsed.metadata,
      };

      await col.insertOne(doc);
      console.log(`✓ Inserted "${parsed.title}" (${parsed.pageCount} pages)`);
      added++;
    } catch (err) {
      console.log("✗ Failed");
      console.error("  Error:", (err as Error).message);
      failed++;
    }
  }

  console.log("\n─────────────────────────────────");
  console.log(`Done!  Added: ${added}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
  console.log("─────────────────────────────────\n");

  await client.close();
}

uploadBooks(BOOKS_FOLDER).catch(console.error);