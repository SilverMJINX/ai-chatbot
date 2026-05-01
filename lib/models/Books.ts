export interface Book {
  gutenbergId: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  downloadCount: number;
  formats: Record<string, string>;
  tags: string[]; // e.g. ["anxiety", "mindfulness", "grief"] — for fast lookup
  addedAt: Date;
}