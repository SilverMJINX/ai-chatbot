"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// Types
type BookItem = {
  id: string;
  title: string;
  authors: string;
  cover: string | null;
  rating: number | null;
  ratingCount: number;
  categories: string[];
  previewLink: string;
  description: string;
};

type Section = {
  id: string;
  tag: string;
  title: string;
  titleEm: string;
  query: string;
};

// Config
const GBOOKS_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || "";
const GBOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

const SECTIONS: Section[] = [
  {
    id: "mood",
    tag: "Curated",
    title: "When the mind needs",
    titleEm: "quiet",
    query: "subject:self-help mindfulness anxiety stress",
  },
  {
    id: "top",
    tag: "Top Rated",
    title: "Universally",
    titleEm: "loved",
    query: "subject:self-help intitle:bestseller personal development",
  },
  {
    id: "classics",
    tag: "Timeless",
    title: "The classics —",
    titleEm: "always here",
    query: "stoicism marcus aurelius dale carnegie napoleon hill self-help classic",
  },
  {
    id: "gems",
    tag: "Discover",
    title: "Hidden",
    titleEm: "gems",
    query: "subject:self-help personal-development underrated hidden gem",
  },
];

const GENRES = [
  { label: "🧘 Mindfulness",   genre: "subject:self-help mindfulness meditation" },
  { label: "💪 Productivity",  genre: "subject:self-help productivity habits" },
  { label: "🧠 Psychology",    genre: "subject:psychology self-help" },
  { label: "💭 Philosophy",    genre: "subject:philosophy stoicism" },
  { label: "❤️ Relationships", genre: "subject:self-help relationships" },
  { label: "💰 Finance",       genre: "subject:self-help personal finance" },
  { label: "🌿 Healing",       genre: "subject:self-help anxiety depression healing" },
  { label: "🚀 Growth",        genre: "subject:self-help success motivation" },
];

// API helpers
async function fetchBooks(query: string, maxResults = 16, orderBy = "relevance"): Promise<BookItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
      orderBy,
      printType: "books",
      langRestrict: "en",
      ...(GBOOKS_KEY ? { key: GBOOKS_KEY } : {}),
    });
    const res  = await fetch(`${GBOOKS_URL}?${params}`);
    const data = await res.json();
    return (data.items || [])
      .map(parseBook)
      .filter((b: BookItem) => b.cover && b.rating && b.rating >= 3.5);
  } catch {
    return [];
  }
}

function parseBook(item: any): BookItem {
  const v = item.volumeInfo || {};
  return {
    id:          item.id,
    title:       v.title || "Untitled",
    authors:     (v.authors || ["Unknown"]).join(", "),
    cover:       v.imageLinks?.thumbnail?.replace("http://", "https://") || null,
    rating:      v.averageRating || null,
    ratingCount: v.ratingsCount || 0,
    categories:  v.categories || [],
    previewLink: v.previewLink || "#",
    description: v.description || "",
  };
}

function starStr(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

// Sub-components
function SkeletonCard() {
  return (
    <div style={{ flexShrink: 0, width: 160 }}>
      <div style={{ borderRadius: 6, aspectRatio: "2/3", marginBottom: 10, background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }} />
      <div style={{ height: 11, borderRadius: 4, marginBottom: 6, width: "80%", background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }} />
      <div style={{ height: 11, borderRadius: 4, width: "55%", background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }} />
    </div>
  );
}

function BookCard({ book }: { book: BookItem }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      className="book-card"
      onClick={() => book.previewLink !== "#" && window.open(book.previewLink, "_blank")}
    >
      <div className="book-cover-wrap">
        {book.cover && !imgErr ? (
          <img src={book.cover} alt={book.title} loading="lazy" onError={() => setImgErr(true)} />
        ) : (
          <div className="book-no-cover">
            <span style={{ fontSize: "2rem", opacity: 0.4 }}>📖</span>
            <span className="book-no-cover-title">{book.title}</span>
          </div>
        )}
        <div className="book-cover-overlay">
          <div className="book-play-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      </div>
      <div className="book-meta">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.authors}</div>
        {book.rating && (
          <div className="book-rating">
            <span className="stars">{starStr(book.rating)}</span>
            {book.rating.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({ book }: { book: BookItem }) {
  const [imgErr, setImgErr] = useState(false);
  const cat = book.categories[0] || "Book";
  return (
    <div className="featured-card" onClick={() => book.previewLink !== "#" && window.open(book.previewLink, "_blank")}>
      <div className="featured-card-cover">
        {book.cover && !imgErr
          ? <img src={book.cover} alt={book.title} loading="lazy" onError={() => setImgErr(true)} />
          : <div className="featured-card-no-cover">📖</div>
        }
      </div>
      <div className="featured-card-body">
        <div className="featured-card-tag">{cat}</div>
        <div className="featured-card-title">{book.title}</div>
        <div className="featured-card-author">{book.authors}</div>
        {book.rating && (
          <div className="featured-card-rating">
            <span className="stars">{starStr(book.rating)}</span>
            {book.rating.toFixed(1)}
            <span style={{ color: "var(--text-dim)" }}>({book.ratingCount.toLocaleString()})</span>
          </div>
        )}
        <Link href="/chat" className="featured-card-read" onClick={e => e.stopPropagation()}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Read with Atlas
        </Link>
      </div>
    </div>
  );
}

function Carousel({ books, loading, id }: { books: BookItem[]; loading: boolean; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 520, behavior: "smooth" });

  return (
    <div className="carousel-wrap">
      <button className="carousel-arrow left" onClick={() => scroll(-1)} aria-label="Scroll left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div className="carousel" ref={ref} id={id}>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : books.map(b => <BookCard key={b.id} book={b} />)
        }
      </div>
      <button className="carousel-arrow right" onClick={() => scroll(1)} aria-label="Scroll right">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
}

// Main page
export default function LandingPage() {
  const [shelves, setShelves]         = useState<Record<string, BookItem[]>>({});
  const [loadingIds, setLoadingIds]   = useState<Set<string>>(new Set(SECTIONS.map(s => s.id).concat(["featured", "mood"])));
  const [featured, setFeatured]       = useState<BookItem[]>([]);
  const [heroBook, setHeroBook]       = useState<BookItem | null>(null);
  const [activeGenre, setActiveGenre] = useState(GENRES[0].genre);
  const [moodBooks, setMoodBooks]     = useState<BookItem[]>([]);
  const [moodLoading, setMoodLoading] = useState(true);

  const setLoaded = (id: string) =>
    setLoadingIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  // Load all shelves on mount
  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(
        SECTIONS.map(s => fetchBooks(s.query, 16))
      );
      const map: Record<string, BookItem[]> = {};
      SECTIONS.forEach((s, i) => {
        map[s.id] = results[i];
        setLoaded(s.id);
      });
      setShelves(map);

      // Featured wide cards
      const feat = await fetchBooks("self-help transformative life changing must read", 6);
      setFeatured(feat.filter(b => b.cover && b.rating));
      setLoaded("featured");

      // Hero book — pick a highly rated one with a cover
      const pool = [...results[0], ...results[1]].filter(b => b.cover && b.rating && b.rating >= 4);
      if (pool.length) setHeroBook(pool[Math.floor(Math.random() * Math.min(6, pool.length))]);
    };
    load();
  }, []);

  // Mood shelf reloads on genre change
  const loadMood = useCallback(async (genre: string) => {
    setMoodLoading(true);
    const books = await fetchBooks(genre, 16, "relevance");
    setMoodBooks(books.filter(b => b.cover && b.rating));
    setMoodLoading(false);
  }, []);

  useEffect(() => {
    loadMood(activeGenre);
  }, [activeGenre, loadMood]);

  useEffect(() => {
    if (!loadingIds.has("mood") || !moodLoading) setLoaded("mood");
  }, [moodLoading]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');

        :root {
          --ink:        #0d0d0f;
          --ink-2:      #16161a;
          --ink-3:      #1f1f24;
          --ink-4:      #2a2a32;
          --blue:       #4a90d9;
          --blue-glow:  rgba(74,144,217,0.18);
          --blue-dim:   rgba(74,144,217,0.08);
          --gold:       #c9a84c;
          --gold-light: #e8c97a;
          --text:       #e8e6e1;
          --text-mid:   #9b9890;
          --text-dim:   #5a5854;
          --border:     rgba(255,255,255,0.06);
          --border-mid: rgba(255,255,255,0.10);
          --serif:      'Cormorant Garamond', Georgia, serif;
          --sans:       'DM Sans', sans-serif;
          --mono:       'DM Mono', monospace;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        body {
          font-family: var(--sans);
          background: var(--ink);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--ink-2); }
        ::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Nav */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 68px; padding: 0 48px;
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(to bottom, rgba(13,13,15,0.96) 0%, transparent 100%);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }

        .nav-brand {
          display: flex; align-items: center; gap: 10px; text-decoration: none;
        }

        .nav-logo {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px var(--blue-glow);
          flex-shrink: 0;
        }

        .nav-name {
          font-family: var(--serif); font-size: 1.5rem; font-weight: 600;
          color: var(--text); letter-spacing: 0.01em;
        }

        .nav-name em { color: var(--blue); font-style: normal; }

        .nav-links { display: flex; align-items: center; gap: 8px; }

        .nav-link {
          font-size: 0.8rem; font-weight: 500; color: var(--text-mid);
          text-decoration: none; padding: 7px 14px; border-radius: 20px;
          border: 1px solid transparent; transition: all 0.15s; letter-spacing: 0.02em;
        }

        .nav-link:hover { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }

        .nav-cta {
          font-size: 0.8rem; font-weight: 500; color: white;
          text-decoration: none; padding: 8px 18px; border-radius: 20px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          box-shadow: 0 4px 14px var(--blue-glow); transition: all 0.15s;
        }

        .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,144,217,0.3); }

        /* Hero */
        .hero {
          height: 92vh; position: relative;
          display: flex; align-items: flex-end;
          padding: 0 80px 80px; overflow: hidden;
        }

        .hero-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 65% 30%, rgba(74,144,217,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 90% 80%, rgba(201,168,76,0.06) 0%, transparent 50%),
            linear-gradient(160deg, #0d0d0f 0%, #13131a 50%, #0a0a10 100%);
        }

        .hero-overlay {
          position: absolute; inset: 0;
          background:
            linear-gradient(to right, rgba(13,13,15,1) 0%, rgba(13,13,15,0.9) 35%, rgba(13,13,15,0.25) 70%, rgba(13,13,15,0.02) 100%),
            linear-gradient(to top, rgba(13,13,15,1) 0%, rgba(13,13,15,0.55) 22%, transparent 55%);
        }

        .hero-content {
          position: relative; z-index: 2;
          max-width: 600px;
          animation: fadeUp 1.1s cubic-bezier(0.22,1,0.36,1) both;
        }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--mono); font-size: 0.68rem;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--blue); margin-bottom: 20px;
          padding: 6px 12px; border: 1px solid rgba(74,144,217,0.25);
          border-radius: 4px; background: rgba(74,144,217,0.06);
        }

        .hero-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--blue); animation: pulse 2.5s ease infinite;
        }

        .hero-title {
          font-family: var(--serif);
          font-size: clamp(2.8rem, 5.5vw, 5rem);
          font-weight: 300; line-height: 1.05;
          color: var(--text); letter-spacing: -0.01em; margin-bottom: 18px;
        }

        .hero-title em { font-style: italic; color: var(--gold-light); }

        .hero-desc {
          font-size: 0.98rem; font-weight: 300;
          color: var(--text-mid); line-height: 1.75;
          max-width: 460px; margin-bottom: 32px;
        }

        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--sans); font-size: 0.88rem; font-weight: 500;
          padding: 13px 28px; border-radius: 6px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          color: white; border: none; cursor: pointer; text-decoration: none;
          box-shadow: 0 8px 24px var(--blue-glow); transition: all 0.18s;
          letter-spacing: 0.02em;
        }

        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(74,144,217,0.35); }

        .btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--sans); font-size: 0.88rem; font-weight: 500;
          padding: 12px 24px; border-radius: 6px;
          background: rgba(255,255,255,0.05); color: var(--text);
          border: 1px solid var(--border-mid); cursor: pointer; text-decoration: none;
          transition: all 0.18s; letter-spacing: 0.02em;
        }

        .btn-secondary:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); }

        .hero-stats {
          display: flex; gap: 32px; margin-top: 44px;
          padding-top: 24px; border-top: 1px solid var(--border);
        }

        .hero-stat-num {
          font-family: var(--serif); font-size: 1.7rem; font-weight: 400;
          color: var(--text); letter-spacing: -0.02em; line-height: 1;
        }

        .hero-stat-label {
          font-size: 0.68rem; color: var(--text-dim); margin-top: 3px;
          text-transform: uppercase; letter-spacing: 0.09em;
        }

        /* Hero featured book */
        .hero-featured {
          position: absolute; right: 80px; bottom: 80px; z-index: 2;
          display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
          animation: fadeUp 1.3s 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }

        .hero-featured-label {
          font-family: var(--mono); font-size: 0.62rem;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--gold); display: flex; align-items: center; gap: 6px;
        }

        .hero-book-card {
          width: 158px; border-radius: 8px; overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07);
          cursor: pointer; transition: transform 0.28s;
        }

        .hero-book-card:hover { transform: scale(1.05) translateY(-5px); }

        .hero-book-card img {
          width: 100%; display: block; aspect-ratio: 2/3; object-fit: cover;
        }

        .hero-book-placeholder {
          width: 100%; aspect-ratio: 2/3;
          background: linear-gradient(135deg, var(--ink-3), var(--ink-4));
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; opacity: 0.5;
        }

        /* Sections */
        .sections { padding: 0 48px 80px; }

        .section { margin-bottom: 52px; }

        .section-head {
          display: flex; align-items: baseline; gap: 14px;
          margin-bottom: 18px; padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .section-tag {
          font-family: var(--mono); font-size: 0.6rem;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--blue); padding: 3px 8px;
          border: 1px solid rgba(74,144,217,0.25); border-radius: 3px;
          background: rgba(74,144,217,0.06); flex-shrink: 0;
        }

        .section-title {
          font-family: var(--serif); font-size: 1.65rem; font-weight: 400;
          color: var(--text); letter-spacing: -0.01em; line-height: 1.15;
        }

        .section-title em { font-style: italic; color: var(--gold-light); }

        /* Genre pills */
        .genre-row {
          display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px;
        }

        .genre-pill {
          font-family: var(--sans); font-size: 0.78rem; font-weight: 400;
          padding: 8px 16px; border-radius: 20px;
          border: 1px solid var(--border-mid);
          background: rgba(255,255,255,0.03);
          color: var(--text-mid); cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }

        .genre-pill:hover { color: var(--text); background: rgba(74,144,217,0.08); border-color: rgba(74,144,217,0.3); }
        .genre-pill.active { color: var(--blue); background: rgba(74,144,217,0.1); border-color: rgba(74,144,217,0.35); }

        /* Carousel */
        .carousel-wrap { position: relative; }

        .carousel {
          display: flex; gap: 14px; overflow-x: auto;
          scroll-snap-type: x mandatory; scrollbar-width: none;
          padding-bottom: 6px; -webkit-overflow-scrolling: touch;
        }

        .carousel::-webkit-scrollbar { display: none; }

        .carousel-arrow {
          position: absolute; top: 38%; transform: translateY(-50%);
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(13,13,15,0.88); border: 1px solid var(--border-mid);
          color: var(--text); display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 5; backdrop-filter: blur(8px);
          transition: all 0.15s; opacity: 0;
        }

        .carousel-wrap:hover .carousel-arrow { opacity: 1; }
        .carousel-arrow:hover { background: rgba(74,144,217,0.18); border-color: var(--blue); }
        .carousel-arrow.left  { left: -20px; }
        .carousel-arrow.right { right: -20px; }

        /* Book card */
        .book-card {
          flex-shrink: 0; width: 160px;
          scroll-snap-align: start; cursor: pointer;
          transition: transform 0.25s;
          animation: fadeUp 0.4s ease both;
        }

        .book-card:hover { transform: translateY(-7px); }
        .book-card:hover .book-cover-wrap { box-shadow: 0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,144,217,0.22); }

        .book-cover-wrap {
          border-radius: 6px; overflow: hidden; aspect-ratio: 2/3;
          background: var(--ink-3); box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          transition: box-shadow 0.25s; position: relative; margin-bottom: 10px;
        }

        .book-cover-wrap img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.35s;
        }

        .book-card:hover .book-cover-wrap img { transform: scale(1.04); }

        .book-no-cover {
          width: 100%; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 12px;
          background: linear-gradient(135deg, var(--ink-3), var(--ink-4));
        }

        .book-no-cover-title {
          font-family: var(--serif); font-size: 0.7rem;
          color: var(--text-mid); text-align: center; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }

        .book-cover-overlay {
          position: absolute; inset: 0;
          background: rgba(13,13,15,0.68);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }

        .book-card:hover .book-cover-overlay { opacity: 1; }

        .book-play-circle {
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(74,144,217,0.92);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(74,144,217,0.4);
          transform: scale(0.8); transition: transform 0.2s;
        }

        .book-card:hover .book-play-circle { transform: scale(1); }

        .book-meta { padding: 0 2px; }

        .book-title {
          font-family: var(--serif); font-size: 0.88rem; font-weight: 400;
          color: var(--text); line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; margin-bottom: 4px;
        }

        .book-author {
          font-size: 0.68rem; color: var(--text-dim);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;
        }

        .book-rating { display: flex; align-items: center; gap: 4px; font-size: 0.66rem; color: var(--text-mid); }

        .stars { color: var(--gold); font-size: 0.64rem; letter-spacing: 1px; }

        /* Featured wide cards */
        .featured-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;
        }

        .featured-card {
          border-radius: 10px; overflow: hidden;
          background: var(--ink-2); border: 1px solid var(--border);
          display: flex; cursor: pointer; transition: all 0.2s;
          animation: fadeUp 0.4s ease both;
        }

        .featured-card:hover { border-color: var(--border-mid); box-shadow: 0 8px 32px rgba(0,0,0,0.3); transform: translateY(-2px); }

        .featured-card-cover { width: 90px; flex-shrink: 0; background: var(--ink-3); }
        .featured-card-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .featured-card-no-cover { width: 100%; height: 100%; min-height: 130px; display: flex; align-items: center; justify-content: center; font-size: 2rem; opacity: 0.35; background: linear-gradient(135deg, var(--ink-3), var(--ink-4)); }

        .featured-card-body { padding: 14px 16px; display: flex; flex-direction: column; justify-content: center; gap: 4px; min-width: 0; }
        .featured-card-tag { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blue); }
        .featured-card-title { font-family: var(--serif); font-size: 1rem; font-weight: 400; color: var(--text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .featured-card-author { font-size: 0.7rem; color: var(--text-dim); }
        .featured-card-rating { display: flex; align-items: center; gap: 5px; font-size: 0.66rem; color: var(--text-mid); }

        .featured-card-read {
          margin-top: 8px;
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.7rem; font-weight: 500; color: var(--blue);
          padding: 5px 11px; border-radius: 4px;
          border: 1px solid rgba(74,144,217,0.25);
          background: rgba(74,144,217,0.06); width: fit-content;
          transition: all 0.15s; text-decoration: none;
        }

        .featured-card:hover .featured-card-read { background: rgba(74,144,217,0.14); border-color: rgba(74,144,217,0.4); }

        /* CTA banner */
        .cta-banner {
          margin: 0 48px 80px; border-radius: 16px; padding: 60px 64px;
          background: linear-gradient(135deg, var(--ink-2), var(--ink-3));
          border: 1px solid var(--border-mid);
          display: flex; align-items: center; justify-content: space-between; gap: 40px;
          position: relative; overflow: hidden;
        }

        .cta-banner::before {
          content: ''; position: absolute; top: -60%; right: -10%;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(74,144,217,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .cta-title { font-family: var(--serif); font-size: 2.1rem; font-weight: 300; color: var(--text); line-height: 1.25; letter-spacing: -0.01em; }
        .cta-title em { font-style: italic; color: var(--gold-light); }
        .cta-sub { font-size: 0.88rem; color: var(--text-mid); max-width: 360px; line-height: 1.65; margin-top: 10px; }

        /* Footer */
        .footer {
          padding: 28px 48px; border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }

        .footer-brand { font-family: var(--serif); font-size: 1.2rem; color: var(--text-dim); }
        .footer-brand em { color: var(--blue); font-style: normal; }
        .footer-note { font-size: 0.68rem; color: var(--text-dim); font-family: var(--mono); letter-spacing: 0.05em; }

        /* Responsive */
        @media (max-width: 900px) {
          .nav { padding: 0 24px; }
          .hero { padding: 0 24px 60px; }
          .hero-featured { display: none; }
          .sections { padding: 0 24px 60px; }
          .cta-banner { margin: 0 24px 60px; padding: 40px 28px; flex-direction: column; }
          .footer { padding: 24px; }
        }

        @media (max-width: 600px) {
          .hero-title { font-size: 2.5rem; }
          .hero-stats { gap: 20px; }
          .nav-links { display: none; }
          .book-card { width: 140px; }
          .featured-grid { grid-template-columns: 1fr; }
          .genre-row { gap: 6px; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <Link href="/" className="nav-brand">
          <div className="nav-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
            </svg>
          </div>
          <span className="nav-name">At<em>las</em></span>
        </Link>
        <div className="nav-links">
          <Link href="/chat" className="nav-link">Chat with Atlas</Link>
          <Link href="/books" className="nav-link">My Library</Link>
          <Link href="/chat" className="nav-cta">Start Reading →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-dot" />
            Your AI Reading Sanctuary
          </div>
          <h1 className="hero-title">
            Books that <em>heal,</em><br />stories that stay
          </h1>
          <p className="hero-desc">
            Atlas listens to how you feel, then finds the perfect book — and reads it to you, aloud, in a voice that feels like home.
          </p>
          <div className="hero-actions">
            <Link href="/chat" className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Talk to Atlas
            </Link>
            <Link href="/books" className="btn-secondary">Browse Library</Link>
          </div>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-num">70k+</div>
              <div className="hero-stat-label">Books available</div>
            </div>
            <div>
              <div className="hero-stat-num">ElevenLabs</div>
              <div className="hero-stat-label">AI narration</div>
            </div>
            <div>
              <div className="hero-stat-num">Gemini</div>
              <div className="hero-stat-label">Therapist AI</div>
            </div>
          </div>
        </div>

        {/* Hero featured book */}
        {heroBook && (
          <div className="hero-featured">
            <div className="hero-featured-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Editor&apos;s pick
            </div>
            <div
              className="hero-book-card"
              onClick={() => heroBook.previewLink !== "#" && window.open(heroBook.previewLink, "_blank")}
            >
              {heroBook.cover
                ? <img src={heroBook.cover} alt={heroBook.title} />
                : <div className="hero-book-placeholder">📖</div>
              }
            </div>
          </div>
        )}
      </section>

      {/* Main sections */}
      <main className="sections">

        {/* Genre pills + mood shelf */}
        <section className="section">
          <div className="section-head">
            <span className="section-tag">Curated</span>
            <h2 className="section-title">When the mind needs <em>quiet</em></h2>
          </div>
          <div className="genre-row">
            {GENRES.map(g => (
              <button
                key={g.genre}
                className={`genre-pill${activeGenre === g.genre ? " active" : ""}`}
                onClick={() => setActiveGenre(g.genre)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <Carousel books={moodBooks} loading={moodLoading} id="moodShelf" />
        </section>

        {/* Remaining shelves */}
        {SECTIONS.filter(s => s.id !== "mood").map(s => (
          <section key={s.id} className="section">
            <div className="section-head">
              <span className="section-tag">{s.tag}</span>
              <h2 className="section-title">{s.title} <em>{s.titleEm}</em></h2>
            </div>
            <Carousel
              books={shelves[s.id] || []}
              loading={loadingIds.has(s.id)}
              id={s.id}
            />
          </section>
        ))}

        {/* Featured wide cards */}
        <section className="section">
          <div className="section-head">
            <span className="section-tag">Atlas Picks</span>
            <h2 className="section-title">Reads that <em>change</em> you</h2>
          </div>
          {loadingIds.has("featured") ? (
            <div className="featured-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 10, height: 130, background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }} />
              ))}
            </div>
          ) : (
            <div className="featured-grid">
              {featured.map(b => <FeaturedCard key={b.id} book={b} />)}
            </div>
          )}
        </section>

      </main>

      {/* CTA banner */}
      <div className="cta-banner">
        <div>
          <h2 className="cta-title">Tell Atlas how you feel.<br /><em>It&apos;ll find your book.</em></h2>
          <p className="cta-sub">Share what&apos;s on your mind and Atlas — your AI therapist — will recommend books tailored to your emotional state, then read them aloud.</p>
        </div>
        <Link href="/chat" className="btn-primary" style={{ flexShrink: 0, fontSize: "0.92rem", padding: "15px 32px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Start your session
        </Link>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-brand">At<em>las</em></div>
        <div className="footer-note">Powered by Google Books · ElevenLabs · Gemini · Project Gutenberg</div>
      </footer>
    </>
  );
}