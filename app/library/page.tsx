"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type Book = {
  id: string;
  title: string;
  author: string;
  excerpt: string;
  reason: string | null;
  tags?: string[];
  themes?: string[];
};

// UserMenu 
function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat with Atlas
          </Link>
          <Link href="/books" className="dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Search Books
          </Link>
          <Link href="/profile" className="dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            My Profile
          </Link>
          <div className="dropdown-divider"/>
          <button className="dropdown-item signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// Book Detail Modal 
function BookModal({ book, onClose }: { book: Book; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="modal-inner">
          {/* Cover placeholder */}
          <div className="modal-cover-col">
            <div className="modal-cover">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(74,144,217,0.5)" strokeWidth="1.5">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            {book.reason && (
              <div className="modal-reason">
                <span className="modal-reason-label">Why Atlas picked this</span>
                <p>{book.reason}</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="modal-info">
            <div className="modal-tag">Atlas Library</div>
            <h2 className="modal-title">{book.title}</h2>
            <p className="modal-author">by {book.author}</p>

            {book.excerpt && (
              <>
                <div className="modal-excerpt-label">Excerpt</div>
                <p className="modal-excerpt">{book.excerpt}</p>
              </>
            )}

            <div className="modal-actions">
              <Link href="/chat" className="modal-btn-primary" onClick={onClose}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Read with Atlas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton
function SkeletonCard() {
  return (
    <div className="book-card" style={{ cursor: "default" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 14, background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }}/>
      <div style={{ height: 14, borderRadius: 4, marginBottom: 8, width: "80%", background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }}/>
      <div style={{ height: 11, borderRadius: 4, marginBottom: 16, width: "55%", background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }}/>
      <div style={{ height: 11, borderRadius: 4, width: "90%", background: "linear-gradient(90deg,#1f1f24 25%,#2a2a32 50%,#1f1f24 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite linear" }}/>
    </div>
  );
}

// Main Page
export default function LibraryPage() {
  const { data: session, status } = useSession();
  const isAuthLoading = status === "loading";
  const userName = session?.user?.name || session?.user?.email || "User";

  const [query, setQuery]         = useState("");
  const [books, setBooks]         = useState<Book[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [selected, setSelected]   = useState<Book | null>(null);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");
    setBooks([]);

    try {
      const res = await fetch(`/api/books/fetch?q=${encodeURIComponent(query.trim())}`);
      if (res.status === 404) {
        setBooks([]);
      } else if (!res.ok) {
        setError("Something went wrong. Please try again.");
      } else {
        const book = await res.json();
        setBooks([book]);
      }
    } catch {
      setError("Could not reach the library. Please try again.");
    }

    setLoading(false);
  };

  // Suggested search terms based on common themes
  const SUGGESTIONS = [
    "grief", "anxiety", "resilience", "purpose", "healing",
    "love", "loss", "courage", "mindfulness", "identity",
  ];

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
        html, body { height: 100%; }
        body { font-family: var(--sans); background: var(--ink); color: var(--text); min-height: 100vh; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--ink-2); }
        ::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

        @keyframes shimmer    { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes fadeUp     { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes dropIn     { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn    { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes pulse      { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .spin { animation: spin 0.7s linear infinite; }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 68px; padding: 0 48px;
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(to bottom, rgba(13,13,15,0.96) 0%, transparent 100%);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; margin-right: 8px; }
        .nav-logo { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px var(--blue-glow); flex-shrink: 0; }
        .nav-name { font-family: var(--serif); font-size: 1.5rem; font-weight: 600; color: var(--text); letter-spacing: 0.01em; }
        .nav-name em { color: var(--blue); font-style: normal; }
        .nav-divider { width: 1px; height: 20px; background: var(--border-mid); margin: 0 6px; }
        .nav-badge { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); padding: 4px 10px; border: 1px solid rgba(201,168,76,0.25); border-radius: 4px; background: rgba(201,168,76,0.06); display: flex; align-items: center; gap: 6px; }
        .nav-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); animation: pulse 2s infinite; }
        .nav-link { font-size: 0.8rem; font-weight: 500; color: var(--text-mid); text-decoration: none; padding: 7px 14px; border-radius: 20px; border: 1px solid transparent; transition: all 0.15s; }
        .nav-link:hover { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }
        .nav-link-active { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }
        .nav-spacer { flex: 1; }

        /* User menu */
        .user-menu-wrap { position: relative; }
        .user-menu-btn { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-mid); border-radius: 20px; padding: 5px 12px 5px 5px; cursor: pointer; transition: all 0.15s; color: var(--text); }
        .user-menu-btn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }
        .user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: white; flex-shrink: 0; box-shadow: 0 2px 8px var(--blue-glow); }
        .user-name { font-size: 0.8rem; font-weight: 500; color: var(--text); }
        .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 10px; padding: 6px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); animation: dropIn 0.18s cubic-bezier(0.22,1,0.36,1) both; z-index: 200; }
        .dropdown-item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; color: var(--text-mid); text-decoration: none; background: none; border: none; cursor: pointer; transition: all 0.12s; text-align: left; font-family: var(--sans); }
        .dropdown-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .signout { color: #f87171 !important; }
        .signout:hover { background: rgba(248,113,113,0.08) !important; color: #fca5a5 !important; }

        /* ── PAGE ── */
        .page-wrap { padding-top: 68px; min-height: 100vh; }

        /* ── Page header ── */
        .page-header { padding: 52px 64px 40px; border-bottom: 1px solid var(--border); background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%); }
        .page-header-inner { max-width: 860px; margin: 0 auto; }
        .page-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; padding: 4px 10px; border: 1px solid rgba(201,168,76,0.25); border-radius: 4px; background: rgba(201,168,76,0.06); }
        .page-title { font-family: var(--serif); font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 300; color: var(--text); letter-spacing: -0.01em; line-height: 1.1; margin-bottom: 10px; }
        .page-title em { font-style: italic; color: var(--gold-light); }
        .page-sub { font-size: 0.88rem; color: var(--text-mid); font-weight: 300; line-height: 1.65; max-width: 480px; }

        /* ── Search ── */
        .search-section { max-width: 860px; margin: 0 auto; padding: 36px 64px 0; }
        .search-wrap { display: flex; align-items: center; gap: 10px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 8px; padding: 12px 12px 12px 22px; transition: border-color 0.2s, box-shadow 0.2s; }
        .search-wrap:focus-within { border-color: rgba(201,168,76,0.4); box-shadow: 0 0 0 3px rgba(201,168,76,0.06); }
        .search-input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--sans); font-size: 0.95rem; color: var(--text); caret-color: var(--gold); }
        .search-input::placeholder { color: var(--text-dim); }
        .search-btn { width: 40px; height: 40px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--gold), #e8c97a); color: var(--ink); box-shadow: 0 4px 14px rgba(201,168,76,0.25); transition: all 0.15s; flex-shrink: 0; font-weight: 700; }
        .search-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(201,168,76,0.35); }
        .search-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        /* Suggestions */
        .suggestions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
        .suggestion-pill { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.08em; padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border-mid); background: rgba(255,255,255,0.02); color: var(--text-dim); cursor: pointer; transition: all 0.15s; }
        .suggestion-pill:hover { color: var(--gold); border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.04); }

        /* ── Main ── */
        .books-main { max-width: 860px; margin: 0 auto; padding: 36px 64px 80px; }

        /* ── Grid ── */
        .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
        .book-card { background: var(--ink-2); border: 1px solid var(--border); border-radius: 10px; padding: 20px; cursor: pointer; transition: all 0.18s; animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .book-card:hover { border-color: rgba(201,168,76,0.3); transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,168,76,0.12); }
        .book-card-icon { width: 38px; height: 38px; border-radius: 9px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .book-card-title { font-family: var(--serif); font-size: 1.05rem; font-weight: 400; color: var(--text); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
        .book-card-author { font-size: 0.7rem; color: var(--gold); font-family: var(--mono); letter-spacing: 0.04em; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px; }
        .book-card-reason { font-size: 0.75rem; color: var(--text-mid); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 16px; font-style: italic; }
        .book-card-footer { display: flex; align-items: center; justify-content: space-between; }
        .book-tag { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); padding: 3px 8px; border: 1px solid rgba(201,168,76,0.25); border-radius: 3px; background: rgba(201,168,76,0.06); }
        .book-chat-hint { font-size: 0.65rem; color: var(--text-dim); font-family: var(--mono); }

        /* ── Empty / error states ── */
        .empty-state { text-align: center; padding: 72px 0; animation: fadeUp 0.4s ease both; }
        .empty-icon { font-family: var(--serif); font-size: 3rem; margin-bottom: 18px; opacity: 0.35; }
        .empty-title { font-family: var(--serif); font-size: 1.4rem; font-weight: 300; color: var(--text-mid); margin-bottom: 8px; }
        .empty-sub { font-size: 0.78rem; color: var(--text-dim); font-family: var(--mono); letter-spacing: 0.04em; }
        .error-banner { display: flex; align-items: center; gap: 10px; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #f87171; margin-bottom: 24px; animation: fadeUp 0.3s ease both; }

        /* ── Modal ── */
        .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(8,8,10,0.84); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: backdropIn 0.2s ease both; }
        .modal { position: relative; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 16px; max-width: 680px; width: 100%; max-height: 88vh; overflow-y: auto; box-shadow: 0 32px 80px rgba(0,0,0,0.7); animation: modalIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .modal-close { position: absolute; top: 16px; right: 16px; z-index: 10; width: 32px; height: 32px; border-radius: 50%; background: var(--ink-3); border: 1px solid var(--border-mid); color: var(--text-mid); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .modal-close:hover { background: var(--ink-4); color: var(--text); }
        .modal-inner { display: flex; gap: 28px; padding: 32px; }
        .modal-cover-col { flex-shrink: 0; width: 140px; display: flex; flex-direction: column; gap: 16px; }
        .modal-cover { width: 140px; aspect-ratio: 2/3; border-radius: 8px; background: linear-gradient(135deg, var(--ink-3), var(--ink-4)); border: 1px solid var(--border-mid); display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
        .modal-reason { font-size: 0.72rem; color: var(--text-mid); line-height: 1.6; }
        .modal-reason-label { display: block; font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }
        .modal-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
        .modal-tag { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); padding: 3px 8px; border: 1px solid rgba(201,168,76,0.25); border-radius: 3px; background: rgba(201,168,76,0.06); width: fit-content; }
        .modal-title { font-family: var(--serif); font-size: 1.75rem; font-weight: 300; color: var(--text); line-height: 1.2; letter-spacing: -0.01em; }
        .modal-author { font-size: 0.78rem; color: var(--gold); font-family: var(--mono); letter-spacing: 0.04em; }
        .modal-excerpt-label { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); margin-top: 6px; padding-top: 14px; border-top: 1px solid var(--border); }
        .modal-excerpt { font-family: var(--serif); font-size: 0.92rem; color: var(--text-mid); line-height: 1.8; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden; }
        .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border); }
        .modal-btn-primary { display: inline-flex; align-items: center; gap: 7px; font-family: var(--sans); font-size: 0.82rem; font-weight: 500; padding: 10px 20px; border-radius: 6px; background: linear-gradient(135deg, var(--blue), #6baee8); color: white; border: none; cursor: pointer; text-decoration: none; box-shadow: 0 4px 16px var(--blue-glow); transition: all 0.15s; }
        .modal-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,144,217,0.35); }

        @media (max-width: 900px) {
          .nav { padding: 0 24px; }
          .page-header { padding: 36px 24px 28px; }
          .search-section { padding: 28px 24px 0; }
          .books-main { padding: 28px 24px 60px; }
        }
        @media (max-width: 600px) {
          .books-grid { grid-template-columns: 1fr; }
          .modal-inner { flex-direction: column; padding: 24px; }
          .modal-cover-col { width: 100%; flex-direction: row; align-items: flex-start; gap: 16px; }
          .modal-cover { width: 90px; flex-shrink: 0; }
        }
      `}</style>

      {/* ── NAV ── */}
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
        <div className="nav-badge">
          <span className="nav-badge-dot"/>
          Atlas Library
        </div>

        <Link href="/chat" className="nav-link">Chat with Atlas</Link>
        <Link href="/books" className="nav-link">Search Books</Link>
        <span className="nav-link nav-link-active">Library</span>

        <div className="nav-spacer"/>

        {isAuthLoading ? (
          <div style={{ width: 80, height: 34, borderRadius: 20, background: "rgba(255,255,255,0.04)" }}/>
        ) : (
          <UserMenu name={userName}/>
        )}
      </nav>

      <div className="page-wrap">
        {/* ── Page header ── */}
        <div className="page-header">
          <div className="page-header-inner">
            <div className="page-eyebrow">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Curated by Atlas
            </div>
            <h1 className="page-title">
              Books that <em>heal</em>
            </h1>
            <p className="page-sub">
              Search Atlas's curated library by title, author, theme, or emotion. Every book here was chosen to comfort, inspire, or shift perspective.
            </p>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="search-section">
          <div className="search-wrap">
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Search by title, author, theme… e.g. grief, resilience, Viktor Frankl"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
            />
            <button className="search-btn" onClick={search} disabled={!query.trim() || loading} title="Search">
              {loading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </button>
          </div>
          <div className="suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-pill" onClick={() => { setQuery(s); }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main ── */}
        <main className="books-main">
          {error && (
            <div className="error-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {!searched && !loading && (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <p className="empty-title">What are you looking for?</p>
              <p className="empty-sub">search by title · author · theme · emotion</p>
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
              <p className="empty-title">No book found</p>
              <p className="empty-sub">try a different theme or author name</p>
            </div>
          )}

          {books.length > 0 && (
            <div className="books-grid">
              {books.map((book, i) => (
                <div
                  key={book.id}
                  className="book-card"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => setSelected(book)}
                >
                  <div className="book-card-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <p className="book-card-title">{book.title}</p>
                  <p className="book-card-author">{book.author}</p>
                  {book.reason && <p className="book-card-reason">{book.reason}</p>}
                  <div className="book-card-footer">
                    <span className="book-tag">Atlas Pick</span>
                    <span className="book-chat-hint">click to read</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selected && <BookModal book={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}