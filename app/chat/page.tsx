"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useElevenLabsTTS } from "../../hooks/useElevenLabsTTS";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

type CuratedBook = {
  id: string;
  gutenbergId: number | null;
  title: string;
  author: string;
  tags: string[];
  subjects: string[];
  coverUrl: string | null;
  textUrl: string | null;
  epubUrl: string | null;
  htmlUrl: string | null;
  excerpt: string;
  downloadCount: number;
  reason: string | null;
};

interface Book {
  uid: string;
  gutenbergId: number | null;
  title: string;
  author: string;
  tags: string[];
  htmlUrl: string | null;
  downloadCount: number;
  source: "curated" | "gutenberg";
}

function stripBoilerplate(text: string): string {
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const startMatch = text.match(/\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*/i);
  if (startMatch?.index !== undefined) {
    text = text.slice(text.indexOf("\n", startMatch.index) + 1);
  }
  const endMatch =
    text.match(/\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i) ||
    text.match(/End of (?:the )?Project Gutenberg/i);
  if (endMatch?.index !== undefined) text = text.slice(0, endMatch.index);
  return text.trim();
}

function splitChapters(rawText: string): string[] {
  const text = stripBoilerplate(rawText);
  const chunks = text
    .split(/(?=^\s*(?:CHAPTER|PART|BOOK|SECTION)\s+(?:[IVXLCDM]+|\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\b)/im)
    .map(c => c.trim())
    .filter(c => c.length > 80);
  return chunks.length > 1 ? chunks : [text];
}

function splitParagraphs(section: string): string[] {
  const paragraphs: string[] = [];
  let current = "";
  for (const raw of section.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      if (current.trim().length > 0) { paragraphs.push(current.trim()); current = ""; }
    } else {
      current = current ? current + " " + line : line;
    }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.filter(p => {
    if (p.length < 45) return false;
    if (p === p.toUpperCase() && /[A-Z]{4,}/.test(p)) return false;
    if (/^\d+\s/.test(p) && p.length < 60) return false;
    return true;
  });
}

function fromCurated(b: CuratedBook): Book {
  return {
    uid: b.id,
    gutenbergId: b.gutenbergId,
    title: b.title,
    author: b.author,
    tags: b.tags ?? [],
    htmlUrl: b.htmlUrl,
    downloadCount: b.downloadCount,
    source: "curated",
  };
}

function fromGutenberg(b: GutenbergBook): Book {
  const firstAuthor = b.authors?.[0]?.name ?? "Unknown author";
  const htmlUrl =
    b.formats["text/html"] ||
    b.formats["text/html; charset=utf-8"] ||
    null;
  return {
    uid: `gutenberg-${b.id}`,
    gutenbergId: b.id,
    title: b.title,
    author: firstAuthor,
    tags: (b.subjects ?? []).slice(0, 3),
    htmlUrl,
    downloadCount: b.download_count ?? 0,
    source: "gutenberg",
  };
}

function textApiPath(book: Book): string {
  if (book.source === "curated") return `/api/books/${book.uid}/text`;
  return `/api/books/${book.gutenbergId}/text`;
}

function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const initial = name?.charAt(0).toUpperCase() || "U";
  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-menu-btn" onClick={() => setOpen(o => !o)}>
        <div className="user-avatar">{initial}</div>
        <span className="user-name">{name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="user-dropdown">
          <Link href="/chat" className="dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat with Atlas
          </Link>
          <Link href="/profile" className="dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My Profile
          </Link>
          <div className="dropdown-divider"/>
          <button className="dropdown-item signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function BookReader({
  book,
  onClose,
  savedUids,
  toggleSave,
}: {
  book: Book;
  onClose: () => void;
  savedUids: Set<string>;
  toggleSave: (book: Book, e: React.MouseEvent) => Promise<void>;
}) {
  const [rawText, setRawText]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [chapter, setChapter]   = useState(0);
  const [position, setPosition] = useState(0);
  const [saved, setSaved]       = useState(false);
  const [playing, setPlaying]   = useState(false);

  const { speak, stop, status: ttsStatus } = useElevenLabsTTS();

  const paraRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posRef    = useRef(0);
  const playingRef = useRef(false);
  const linesRef  = useRef<string[]>([]);

  useEffect(() => {
    setLoading(true); setError("");
    fetch(textApiPath(book))
      .then(r => r.ok ? r.text() : Promise.reject("unavailable"))
      .then(t => setRawText(t))
      .catch(() => setError("Could not load book text."))
      .finally(() => setLoading(false));
    return () => stop();
  }, [book.uid]);

  useEffect(() => {
    fetch(`/api/progress?bookId=${book.uid}`)
      .then(r => r.json())
      .then(d => { if (d.position) setPosition(d.position); })
      .catch(() => {});
  }, [book.uid]);

  const chapters = splitChapters(rawText);
  const lines    = splitParagraphs(chapters[chapter] ?? "");
  const total    = lines.length;
  const progress = total > 0 ? ((position + 1) / total) * 100 : 0;

  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { posRef.current = position; }, [position]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    if (!loading && lines.length > 0) {
      setTimeout(() => {
        paraRefs.current[position]?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lines.length]);

  useEffect(() => {
    paraRefs.current[position]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [position]);

  useEffect(() => { stop(); setPlaying(false); setPosition(0); }, [chapter]);

  const saveProgress = useCallback((idx: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(() => {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.uid, position: idx }),
      }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); });
    }, 1500);
  }, [book.uid]);

  useEffect(() => {
    if (loading || lines.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-idx"));
            if (!isNaN(idx)) { setPosition(idx); saveProgress(idx); }
          }
        });
      },
      { threshold: 0.6 }
    );
    paraRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [loading, lines, saveProgress]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.uid, position: posRef.current }),
      }).catch(() => {});
    };
  }, [book.uid]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const speakParagraph = useCallback((idx: number) => {
    const currentLines = linesRef.current;
    if (!currentLines[idx]) return;
    speak(currentLines[idx], () => {
      if (!playingRef.current) return;
      const next = idx + 1;
      if (next >= linesRef.current.length) { setPlaying(false); playingRef.current = false; return; }
      setTimeout(() => {
        if (!playingRef.current) return;
        setPosition(next);
        saveProgress(next);
        speakParagraph(next);
      }, 350);
    });
  }, [speak, saveProgress]);

  const togglePlay = () => {
    if (playing) { stop(); setPlaying(false); playingRef.current = false; }
    else { setPlaying(true); playingRef.current = true; speakParagraph(position); }
  };

  const skipLines = (n: number) => {
    const next = Math.max(0, Math.min(total - 1, position + n));
    stop(); setPosition(next);
    if (playing) speakParagraph(next);
  };

  const jumpToLine = (i: number) => {
    stop(); setPosition(i);
    if (playing) speakParagraph(i);
  };

  const isFavourited = savedUids.has(book.uid);

  return (
    <div className="reader-overlay">
      <div className="reader-header">
        <div className="reader-header-left">
          <div className="reader-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(13,13,15,0.85)" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div>
            <h2 className="reader-title">{book.title}</h2>
            <p className="reader-author">{book.author}</p>
          </div>
        </div>
        <div className="reader-header-right">
          {saved && <span className="reader-saved">✓ Saved</span>}

          {/* favourite button — saves without leaving the reader */}
          <button
            className={`save-btn reader-fav-btn${isFavourited ? " saved" : ""}`}
            onClick={e => toggleSave(book, e)}
            title={isFavourited ? "Remove from favourites" : "Add to favourites"}
          >
            {isFavourited ? "★" : "☆"}
          </button>

          {book.source === "gutenberg" && (
            <span className="reader-source-badge gutenberg-badge">Gutenberg</span>
          )}
          {book.source === "curated" && (
            <span className="reader-source-badge curated-badge">Curated</span>
          )}
          {book.htmlUrl && (
            <a href={book.htmlUrl} target="_blank" rel="noopener noreferrer" className="reader-ext-link">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View original
            </a>
          )}
          <button className="reader-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {!loading && !error && lines.length > 0 && (
        <div className="reader-progress-wrap">
          <div className="reader-progress-bar">
            <div className="reader-progress-fill" style={{ width: `${progress}%` }}/>
          </div>
          <div className="reader-progress-info">
            <span className="reader-progress-pct">{Math.round(progress)}%</span>
            <span className="reader-progress-count">{position + 1} / {total}</span>
          </div>
        </div>
      )}

      {!loading && !error && lines.length > 0 && (
        <div className="reader-controls">
          <div className="reader-btn-row">
            <button className="ctrl-chip" onClick={() => skipLines(-5)}>⏮ 5</button>
            <button className="ctrl-chip" onClick={() => skipLines(-1)}>‹ 1</button>
            <button
              className={`play-btn${playing ? " playing" : ""}${ttsStatus === "loading" ? " loading" : ""}`}
              onClick={togglePlay}
            >
              {ttsStatus === "loading" ? "Loading…" : playing ? "⏸ Pause" : "▶ Listen"}
            </button>
            <button className="ctrl-chip" onClick={() => skipLines(1)}>1 ›</button>
            <button className="ctrl-chip" onClick={() => skipLines(5)}>5 ⏭</button>
          </div>
          {chapters.length > 1 && (
            <div className="reader-btn-row">
              <button className="ctrl-chip" disabled={chapter === 0} onClick={() => setChapter(c => c - 1)}>← Prev chapter</button>
              <span className="ctrl-label">Chapter {chapter + 1} of {chapters.length}</span>
              <button className="ctrl-chip" disabled={chapter >= chapters.length - 1} onClick={() => setChapter(c => c + 1)}>Next chapter →</button>
            </div>
          )}
        </div>
      )}

      <div className="reader-body">
        {loading && (
          <div className="reader-status">
            <div className="reader-dots"><span/><span/><span/></div>
            <p style={{ marginTop: 14, color: "var(--text-dim)" }}>Loading book text…</p>
          </div>
        )}
        {error && (
          <div className="reader-status">
            <p style={{ color: "#f87171", marginBottom: 20 }}>{error}</p>
            {book.htmlUrl && (
              <a href={book.htmlUrl} target="_blank" rel="noopener noreferrer" className="reader-gutenberg-btn">
                Read on Project Gutenberg →
              </a>
            )}
          </div>
        )}
        {!loading && !error && lines.length === 0 && (
          <p style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            No readable paragraphs found in this section.
          </p>
        )}
        {!loading && !error && lines.map((para, i) => (
          <div
            key={i}
            data-idx={i}
            ref={el => { paraRefs.current[i] = el; }}
            className={`reader-para${i === position ? " active" : ""}`}
            onClick={() => jumpToLine(i)}
          >
            {para}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="book-card skeleton-card">
      {[36, 14, 11, 11].map((h, i) => (
        <div key={i} style={{
          height: h,
          width: i === 0 ? 38 : `${[80, 55, 90][i - 1]}%`,
          borderRadius: i === 0 ? 9 : 4,
          marginBottom: i === 0 ? 16 : 8,
          background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)",
          backgroundSize: "400px 100%",
          animation: "shimmer 1.4s infinite linear",
        }}/>
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "loneliness", "friendship", "grief", "anxiety", "resilience",
  "purpose", "healing", "love", "loss", "courage", "identity",
];

type SearchMode = "curated" | "gutenberg" | "saved";

export default function BooksPage() {
  const { data: session, status } = useSession();
  const isAuthLoading = status === "loading";
  const userName = session?.user?.name || session?.user?.email || "User";

  const [mode, setMode]           = useState<SearchMode>("curated");
  const [query, setQuery]         = useState("");
  const [books, setBooks]         = useState<Book[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState<Book | null>(null);
  const [savedUids, setSavedUids] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    fetch("/api/books/save")
      .then(r => r.ok ? r.json() : [])
      .then((data: { bookUid: string }[]) => {
        setSavedUids(new Set(data.map(b => b.bookUid)));
      })
      .catch(() => {});
  }, []);

  const loadSaved = async () => {
    setLoading(true); setSearched(false); setError(""); setBooks([]);
    try {
      const data: {
        bookUid: string; title: string; author: string;
        source: "curated" | "gutenberg"; htmlUrl: string | null; tags: string[];
      }[] = await fetch("/api/books/save").then(r => r.json());
      setBooks(data.map(b => ({
        uid:           b.bookUid,
        gutenbergId:   b.source === "gutenberg"
                         ? Number(b.bookUid.replace("gutenberg-", ""))
                         : null,
        title:         b.title,
        author:        b.author,
        source:        b.source,
        htmlUrl:       b.htmlUrl,
        tags:          b.tags ?? [],
        downloadCount: 0,
      })));
    } catch {
      setError("Could not load saved books.");
    }
    setLoading(false);
  };

  const toggleSave = async (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = savedUids.has(book.uid);
    setSavedUids(prev => {
      const next = new Set(prev);
      isSaved ? next.delete(book.uid) : next.add(book.uid);
      return next;
    });
    if (isSaved && mode === "saved") {
      setBooks(prev => prev.filter(b => b.uid !== book.uid));
    }
    try {
      if (isSaved) {
        await fetch("/api/books/save", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookUid: book.uid }),
        });
      } else {
        await fetch("/api/books/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookUid: book.uid,
            title:   book.title,
            author:  book.author,
            source:  book.source,
            htmlUrl: book.htmlUrl,
            tags:    book.tags,
          }),
        });
      }
    } catch {
      // revert optimistic update on failure
      setSavedUids(prev => {
        const next = new Set(prev);
        isSaved ? next.add(book.uid) : next.delete(book.uid);
        return next;
      });
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true); setError(""); setBooks([]);
    try {
      if (mode === "curated") {
        const res = await fetch(`/api/books/fetch?q=${encodeURIComponent(query.trim())}`);
        if (res.status === 404) { setBooks([]); }
        else if (!res.ok) { setError("Something went wrong. Please try again."); }
        else {
          const data: CuratedBook = await res.json();
          setBooks([fromCurated(data)]);
        }
      } else {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) { setError("Something went wrong. Please try again."); }
        else {
          const data = await res.json();
          setBooks((data.results ?? []).map(fromGutenberg));
        }
      }
    } catch {
      setError("Could not reach the library. Please try again.");
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
        :root {
          --ink:#0d0d0f;--ink-2:#16161a;--ink-3:#1f1f24;--ink-4:#2a2a32;
          --blue:#4a90d9;--blue-glow:rgba(74,144,217,0.18);
          --gold:#c9a84c;--gold-light:#e8c97a;--gold-glow:rgba(201,168,76,0.18);
          --green:#4ad978;
          --text:#e8e6e1;--text-mid:#9b9890;--text-dim:#5a5854;
          --border:rgba(255,255,255,0.06);--border-mid:rgba(255,255,255,0.10);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'DM Sans',sans-serif;
          --mono:'DM Mono',monospace;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;}
        body{font-family:var(--sans);background:var(--ink);color:var(--text);min-height:100vh;overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:var(--ink-2);}
        ::-webkit-scrollbar-thumb{background:var(--ink-4);border-radius:2px;}

        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-7px);opacity:1}}
        @keyframes ttsGlow{0%,100%{box-shadow:0 0 0 0 rgba(74,217,120,.3)}50%{box-shadow:0 0 0 6px rgba(74,217,120,0)}}
        .spin{animation:spin 0.7s linear infinite;}

        .nav{position:fixed;top:0;left:0;right:0;z-index:100;height:68px;padding:0 48px;display:flex;align-items:center;gap:8px;background:linear-gradient(to bottom,rgba(13,13,15,.96) 0%,transparent 100%);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);}
        .nav-brand{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:8px;}
        .nav-logo{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--blue),#6baee8);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px var(--blue-glow);flex-shrink:0;}
        .nav-name{font-family:var(--serif);font-size:1.5rem;font-weight:600;color:var(--text);letter-spacing:.01em;}
        .nav-name em{color:var(--blue);font-style:normal;}
        .nav-divider{width:1px;height:20px;background:var(--border-mid);margin:0 6px;}
        .nav-badge{font-family:var(--mono);font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);padding:4px 10px;border:1px solid rgba(201,168,76,.25);border-radius:4px;background:rgba(201,168,76,.06);display:flex;align-items:center;gap:6px;}
        .nav-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:pulse 2s infinite;}
        .nav-link{font-size:.8rem;font-weight:500;color:var(--text-mid);text-decoration:none;padding:7px 14px;border-radius:20px;border:1px solid transparent;transition:all .15s;}
        .nav-link:hover{color:var(--text);border-color:var(--border-mid);background:rgba(255,255,255,.04);}
        .nav-link-active{color:var(--text) !important;border-color:var(--border-mid) !important;background:rgba(255,255,255,.04) !important;}
        .nav-spacer{flex:1;}

        .user-menu-wrap{position:relative;}
        .user-menu-btn{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid var(--border-mid);border-radius:20px;padding:5px 12px 5px 5px;cursor:pointer;transition:all .15s;color:var(--text);}
        .user-menu-btn:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.18);}
        .user-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--blue),#6baee8);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:white;flex-shrink:0;box-shadow:0 2px 8px var(--blue-glow);}
        .user-name{font-size:.8rem;font-weight:500;color:var(--text);}
        .user-dropdown{position:absolute;top:calc(100% + 8px);right:0;min-width:180px;background:var(--ink-2);border:1px solid var(--border-mid);border-radius:10px;padding:6px;box-shadow:0 16px 40px rgba(0,0,0,.5);animation:dropIn .18s cubic-bezier(.22,1,.36,1) both;z-index:200;}
        .dropdown-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 12px;border-radius:6px;font-size:.8rem;font-weight:500;color:var(--text-mid);text-decoration:none;background:none;border:none;cursor:pointer;transition:all .12s;text-align:left;font-family:var(--sans);}
        .dropdown-item:hover{background:rgba(255,255,255,.05);color:var(--text);}
        .dropdown-divider{height:1px;background:var(--border);margin:4px 0;}
        .signout{color:#f87171 !important;}
        .signout:hover{background:rgba(248,113,113,.08) !important;color:#fca5a5 !important;}

        .page-wrap{padding-top:68px;min-height:100vh;}
        .page-header{padding:52px 64px 40px;border-bottom:1px solid var(--border);background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(201,168,76,.06) 0%,transparent 70%);}
        .page-header-inner{max-width:900px;margin:0 auto;}
        .page-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;padding:4px 10px;border:1px solid rgba(201,168,76,.25);border-radius:4px;background:rgba(201,168,76,.06);}
        .page-title{font-family:var(--serif);font-size:clamp(2rem,3.5vw,3rem);font-weight:300;color:var(--text);letter-spacing:-.01em;line-height:1.1;margin-bottom:10px;}
        .page-title em{font-style:italic;color:var(--gold-light);}
        .page-sub{font-size:.88rem;color:var(--text-mid);font-weight:300;line-height:1.65;max-width:520px;}

        .mode-toggle{display:inline-flex;background:var(--ink-3);border:1px solid var(--border-mid);border-radius:8px;padding:3px;gap:2px;margin-top:22px;}
        .mode-btn{font-family:var(--mono);font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;padding:7px 16px;border-radius:5px;border:none;cursor:pointer;transition:all .18s;color:var(--text-dim);background:transparent;}
        .mode-btn.active{color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);box-shadow:0 2px 8px rgba(201,168,76,.1);}
        .mode-btn:not(.active):hover{color:var(--text-mid);background:rgba(255,255,255,.03);}

        .search-section{max-width:900px;margin:0 auto;padding:36px 64px 0;}
        .search-wrap{display:flex;align-items:center;gap:10px;background:var(--ink-2);border:1px solid var(--border-mid);border-radius:8px;padding:12px 12px 12px 22px;transition:border-color .2s,box-shadow .2s;}
        .search-wrap:focus-within{border-color:rgba(201,168,76,.4);box-shadow:0 0 0 3px rgba(201,168,76,.06);}
        .search-input{flex:1;border:none;outline:none;background:transparent;font-family:var(--sans);font-size:.95rem;color:var(--text);caret-color:var(--gold);}
        .search-input::placeholder{color:var(--text-dim);}
        .search-btn{width:40px;height:40px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--gold),#e8c97a);color:var(--ink);box-shadow:0 4px 14px rgba(201,168,76,.25);transition:all .15s;flex-shrink:0;}
        .search-btn:hover{transform:scale(1.05);}
        .search-btn:disabled{opacity:.35;cursor:not-allowed;transform:none;}
        .suggestions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}
        .suggestion-pill{font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;padding:5px 12px;border-radius:20px;border:1px solid var(--border-mid);background:rgba(255,255,255,.02);color:var(--text-dim);cursor:pointer;transition:all .15s;}
        .suggestion-pill:hover{color:var(--gold);border-color:rgba(201,168,76,.3);background:rgba(201,168,76,.04);}

        .books-main{max-width:900px;margin:0 auto;padding:36px 64px 80px;}
        .books-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
        .book-card{background:var(--ink-2);border:1px solid var(--border);border-radius:10px;padding:20px;cursor:pointer;transition:all .18s;animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both;}
        .book-card:hover{border-color:rgba(201,168,76,.3);transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.3),0 0 0 1px rgba(201,168,76,.12);}
        .skeleton-card{cursor:default !important;pointer-events:none;}
        .book-card-icon{width:38px;height:38px;border-radius:9px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
        .book-card-icon.gutenberg{background:rgba(74,144,217,.08);border-color:rgba(74,144,217,.2);}
        .book-card-title{font-family:var(--serif);font-size:1.05rem;font-weight:400;color:var(--text);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:6px;}
        .book-card-author{font-size:.7rem;color:var(--gold);font-family:var(--mono);letter-spacing:.04em;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}
        .book-card-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;}
        .book-card-tag{font-family:var(--mono);font-size:.56rem;letter-spacing:.08em;padding:2px 7px;border-radius:3px;border:1px solid rgba(201,168,76,.2);color:var(--text-dim);background:rgba(201,168,76,.04);}
        .book-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border);}
        .book-read-btn{font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);padding:4px 10px;border:1px solid rgba(201,168,76,.25);border-radius:3px;background:rgba(201,168,76,.06);transition:all .15s;}
        .book-card:hover .book-read-btn{background:rgba(201,168,76,.12);border-color:rgba(201,168,76,.4);}
        .book-dl{font-size:.62rem;color:var(--text-dim);font-family:var(--mono);}

        .empty-state{text-align:center;padding:72px 0;animation:fadeUp .4s ease both;}
        .empty-icon{font-size:2.8rem;margin-bottom:18px;opacity:.35;}
        .empty-title{font-family:var(--serif);font-size:1.4rem;font-weight:300;color:var(--text-mid);margin-bottom:8px;}
        .empty-sub{font-size:.78rem;color:var(--text-dim);font-family:var(--mono);letter-spacing:.04em;}
        .error-banner{display:flex;align-items:center;gap:10px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:8px;padding:12px 16px;font-size:.82rem;color:#f87171;margin-bottom:24px;animation:fadeUp .3s ease both;}

        .reader-overlay{position:fixed;inset:0;z-index:200;background:var(--ink);display:flex;flex-direction:column;animation:fadeIn .2s ease both;}
        .reader-header{height:64px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;background:rgba(13,13,15,.95);border-bottom:1px solid var(--border);backdrop-filter:blur(14px);flex-shrink:0;gap:16px;}
        .reader-header-left{display:flex;align-items:center;gap:14px;min-width:0;}
        .reader-avatar{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold),#e8c97a);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .reader-title{font-family:var(--serif);font-size:1rem;font-weight:400;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px;}
        .reader-author{font-size:.68rem;color:var(--text-dim);font-family:var(--mono);margin-top:2px;}
        .reader-header-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .reader-saved{font-family:var(--mono);font-size:.62rem;color:var(--green);letter-spacing:.08em;animation:fadeIn .3s ease both;}
        .reader-source-badge{font-family:var(--mono);font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:3px;}
        .gutenberg-badge{color:var(--blue);background:rgba(74,144,217,.08);border:1px solid rgba(74,144,217,.25);}
        .curated-badge{color:var(--gold);background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);}
        .reader-ext-link{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;color:var(--text-dim);text-decoration:none;padding:5px 10px;border-radius:4px;border:1px solid var(--border-mid);transition:all .15s;}
        .reader-ext-link:hover{color:var(--text);border-color:rgba(255,255,255,.2);}
        .reader-close{width:32px;height:32px;border-radius:8px;border:1px solid var(--border-mid);background:var(--ink-3);color:var(--text-mid);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;flex-shrink:0;}
        .reader-close:hover{background:var(--ink-4);color:var(--text);}

        .reader-progress-wrap{padding:10px 40px 0;flex-shrink:0;}
        .reader-progress-bar{height:3px;background:var(--ink-3);border-radius:2px;overflow:hidden;}
        .reader-progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),#e8c97a);transition:width .4s ease;}
        .reader-progress-info{display:flex;align-items:center;justify-content:space-between;margin-top:5px;}
        .reader-progress-pct{font-family:var(--mono);font-size:.62rem;color:var(--gold);letter-spacing:.06em;}
        .reader-progress-count{font-family:var(--mono);font-size:.62rem;color:var(--text-dim);letter-spacing:.04em;}

        .reader-controls{padding:10px 40px 12px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px;flex-shrink:0;background:rgba(13,13,15,.6);}
        .reader-btn-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
        .ctrl-chip{font-family:var(--mono);font-size:.62rem;padding:5px 11px;border-radius:4px;border:1px solid var(--border-mid);background:var(--ink-3);color:var(--text-mid);cursor:pointer;transition:all .12s;white-space:nowrap;}
        .ctrl-chip:hover{background:var(--ink-4);color:var(--text);border-color:rgba(201,168,76,.3);}
        .ctrl-chip:disabled{opacity:.3;cursor:not-allowed;}
        .ctrl-chip.active{color:var(--gold);background:rgba(201,168,76,.1);border-color:rgba(201,168,76,.35);}
        .ctrl-label{font-family:var(--mono);font-size:.6rem;color:var(--text-dim);white-space:nowrap;}
        .play-btn{font-family:var(--sans);font-size:.78rem;font-weight:500;padding:7px 18px;border-radius:6px;border:1px solid rgba(201,168,76,.4);background:linear-gradient(135deg,var(--gold),#e8c97a);color:var(--ink);cursor:pointer;transition:all .15s;box-shadow:0 4px 14px var(--gold-glow);min-width:88px;}
        .play-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px var(--gold-glow);}
        .play-btn.playing{background:rgba(74,217,120,.15);border-color:rgba(74,217,120,.4);color:var(--green);animation:ttsGlow 2s ease-in-out infinite;}
        .play-btn.loading{opacity:.6;cursor:wait;}

        .reader-body{flex:1;overflow-y:auto;padding:48px 0;}
        .reader-body::-webkit-scrollbar{width:3px;}
        .reader-body::-webkit-scrollbar-thumb{background:var(--ink-4);border-radius:2px;}
        .reader-para{max-width:660px;margin:0 auto 1.8em;padding:8px 40px;font-family:var(--serif);font-size:1.15rem;line-height:1.95;color:var(--text-mid);transition:color .2s,background .2s;border-radius:4px;cursor:pointer;border-left:2px solid transparent;}
        .reader-para:hover{background:rgba(255,255,255,.02);color:var(--text);}
        .reader-para.active{color:var(--text);background:rgba(201,168,76,.04);border-left-color:var(--gold);}
        .reader-status{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;}
        .reader-dots{display:flex;gap:6px;}
        .reader-dots span{width:8px;height:8px;border-radius:50%;background:var(--gold);animation:bounce 1.3s infinite ease-in-out;}
        .reader-dots span:nth-child(2){animation-delay:.15s;}
        .reader-dots span:nth-child(3){animation-delay:.3s;}

        .save-btn{background:none;border:none;cursor:pointer;font-size:1rem;color:var(--text-dim);padding:2px 4px;border-radius:3px;transition:color .15s,transform .15s;line-height:1;flex-shrink:0;}
        .save-btn:hover{color:var(--gold);transform:scale(1.25);}
        .save-btn.saved{color:var(--gold);}

        // larger, more prominent star when inside the reader header
        .reader-fav-btn{font-size:1.25rem;padding:4px 6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid var(--border-mid) !important;background:var(--ink-3) !important;transition:all .15s !important;}
        .reader-fav-btn:hover{border-color:rgba(201,168,76,.4) !important;background:rgba(201,168,76,.08) !important;transform:scale(1.15) !important;}
        .reader-fav-btn.saved{color:var(--gold);border-color:rgba(201,168,76,.35) !important;background:rgba(201,168,76,.1) !important;}

        .saved-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:rgba(201,168,76,.2);color:var(--gold);font-size:.58rem;font-family:var(--mono);margin-left:5px;}
        .reader-gutenberg-btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--sans);font-size:.85rem;font-weight:500;padding:10px 22px;border-radius:6px;background:linear-gradient(135deg,var(--gold),#e8c97a);color:var(--ink);text-decoration:none;box-shadow:0 4px 14px var(--gold-glow);transition:all .15s;}
        .reader-gutenberg-btn:hover{transform:translateY(-1px);}

        @media(max-width:900px){
          .nav{padding:0 24px;}
          .page-header{padding:36px 24px 28px;}
          .search-section{padding:28px 24px 0;}
          .books-main{padding:28px 24px 60px;}
          .reader-header{padding:0 20px;}
          .reader-progress-wrap{padding:10px 20px 0;}
          .reader-controls{padding:10px 20px 12px;}
          .reader-para{padding:8px 24px;font-size:1.05rem;}
          .reader-title{max-width:240px;}
        }
        @media(max-width:600px){
          .books-grid{grid-template-columns:1fr;}
          .reader-title{max-width:160px;}
        }
      `}</style>

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
        <div className="nav-divider"/>
        <div className="nav-badge"><span className="nav-badge-dot"/>Atlas Library</div>
        <Link href="/chat" className="nav-link">Chat</Link>
        <span className="nav-link nav-link-active">Books</span>
        <div className="nav-spacer"/>
        {isAuthLoading
          ? <div style={{ width:80,height:34,borderRadius:20,background:"rgba(255,255,255,0.04)" }}/>
          : <UserMenu name={userName}/>
        }
      </nav>

      <div className="page-wrap">
        <div className="page-header">
          <div className="page-header-inner">
            <div className="page-eyebrow">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Atlas · Books
            </div>
            <h1 className="page-title">Read &amp; <em>listen</em></h1>
            <p className="page-sub">
              Search Atlas-curated books by theme or emotion, or explore 70,000+ public domain classics via Project Gutenberg.
              Read in full, listen via ElevenLabs narration — your progress is saved automatically.
            </p>
            <div className="mode-toggle">
              <button
                className={`mode-btn${mode === "curated" ? " active" : ""}`}
                onClick={() => { setMode("curated"); setBooks([]); setSearched(false); setError(""); }}
              >
                ✦ Curated by Atlas
              </button>
              <button
                className={`mode-btn${mode === "gutenberg" ? " active" : ""}`}
                onClick={() => { setMode("gutenberg"); setBooks([]); setSearched(false); setError(""); }}
              >
                📚 Project Gutenberg
              </button>
              <button
                className={`mode-btn${mode === "saved" ? " active" : ""}`}
                onClick={() => { setMode("saved"); loadSaved(); }}
              >
                ★ Saved
                {savedUids.size > 0 && (
                  <span className="saved-count">{savedUids.size}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {mode !== "saved" && (
          <div className="search-section">
            <div className="search-wrap">
              <input
                ref={inputRef}
                className="search-input"
                placeholder={
                  mode === "curated"
                    ? "Search by title, author, theme… e.g. loneliness, Viktor Frankl"
                    : "Search by title or author… e.g. Shakespeare, Frankenstein"
                }
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
              />
              <button className="search-btn" onClick={search} disabled={!query.trim() || loading}>
                {loading
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                }
              </button>
            </div>
            {mode === "curated" && (
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion-pill" onClick={() => setQuery(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <main className="books-main">
          {error && (
            <div className="error-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {!searched && !loading && mode !== "saved" && (
            <div className="empty-state">
              <div className="empty-icon">{mode === "curated" ? "✦" : "📚"}</div>
              <p className="empty-title">
                {mode === "curated" ? "What are you looking for?" : "Search for a classic"}
              </p>
              <p className="empty-sub">
                {mode === "curated"
                  ? "search by title · author · theme · emotion"
                  : "title · author · subject · 70,000+ books"}
              </p>
            </div>
          )}

          {mode === "saved" && !loading && books.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">☆</div>
              <p className="empty-title">No saved books yet</p>
              <p className="empty-sub">star a book while browsing to save it here</p>
            </div>
          )}

          {loading && (
            <div className="books-grid">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i}/>)}
            </div>
          )}

          {searched && !loading && books.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <p className="empty-title">No books found</p>
              <p className="empty-sub">try a different title, author, or theme</p>
            </div>
          )}

          {books.length > 0 && (
            <div className="books-grid">
              {books.map((book, i) => (
                <div
                  key={book.uid}
                  className="book-card"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => setSelected(book)}
                >
                  <div className={`book-card-icon${book.source === "gutenberg" ? " gutenberg" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={book.source === "gutenberg" ? "#4a90d9" : "#c9a84c"} strokeWidth="1.5">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <p className="book-card-title">{book.title}</p>
                  <p className="book-card-author">{book.author}</p>
                  {book.tags.length > 0 && (
                    <div className="book-card-tags">
                      {book.tags.slice(0, 3).map(t => <span key={t} className="book-card-tag">{t}</span>)}
                    </div>
                  )}
                  <div className="book-card-footer">
                    <span className="book-read-btn">Read + Listen →</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {book.downloadCount > 0 && (
                        <span className="book-dl">{book.downloadCount.toLocaleString()}</span>
                      )}
                      <button
                        className={`save-btn${savedUids.has(book.uid) ? " saved" : ""}`}
                        onClick={e => toggleSave(book, e)}
                        title={savedUids.has(book.uid) ? "Remove from saved" : "Save book"}
                      >
                        {savedUids.has(book.uid) ? "★" : "☆"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selected && (
        <BookReader
          book={selected}
          onClose={() => setSelected(null)}
          savedUids={savedUids}
          toggleSave={toggleSave}
        />
      )}
    </>
  );
}