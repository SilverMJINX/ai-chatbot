"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useElevenLabsTTS } from "../../hooks/useElevenLabsTTS";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  books?: BookRecommendation[];
};

type BookRecommendation = {
  id: number;
  title: string;
  authors: { name: string }[];
  reason: string;
};

const ELEVEN_LABS_API_KEY  = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
const ELEVEN_LABS_VOICE_ID = "299hhEjoz44O862N5H4G";

async function speakWithElevenLabs(text: string): Promise<HTMLAudioElement> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail?.message || "ElevenLabs TTS failed");
  }
  const blob = await response.blob();
  return new Audio(URL.createObjectURL(blob));
}

// ── User Menu ──────────────────────────────────────────────────────────────
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
        <div className="user-avatar-nav">{initial}</div>
        <span className="user-name-nav">{name}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="user-dropdown">
          <Link href="/chat" className="user-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat with Atlas
          </Link>
          <Link href="/books" className="user-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            My Library
          </Link>
          <div className="user-dropdown-divider" />
          <button
            className="user-dropdown-item user-dropdown-signout"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

// ── Waveform ───────────────────────────────────────────────────────────────
function WaveformIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 28 20" fill="currentColor">
      {[3, 8, 13, 18, 23].map((x, i) => (
        <rect key={x} x={x} y={i % 2 === 0 ? 4 : 0} width="3"
          height={i % 2 === 0 ? 12 : 20} rx="1.5"
          style={{ animation: "waveBar 0.9s ease-in-out infinite", animationDelay: `${i * 0.12}s`, transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

// ── Book Reader Modal ──────────────────────────────────────────────────────
function BookReader({ book, onClose }: { book: BookRecommendation; onClose: () => void }) {
  const [text, setText]     = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [section, setSection] = useState(0);
  const { speak, stop, status } = useElevenLabsTTS();

  const sections = text.split(/\n{3,}/).map(s => s.trim()).filter(s => s.length > 100);
  const current  = sections[section] ?? "";

  useEffect(() => {
    setLoading(true); setError("");
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(t => setText(t))
      .catch(() => setError("Full text unavailable for this book."))
      .finally(() => setLoading(false));
    return () => stop();
  }, [book.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-book-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div>
              <h2 className="modal-book-title">{book.title}</h2>
              <p className="modal-book-author">{book.authors.map(a => a.name).join(", ")}</p>
              {book.reason && <p className="modal-book-reason">💡 {book.reason}</p>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {!loading && !error && sections.length > 0 && (
          <div className="modal-controls">
            <button
              className={`tts-btn${status === "playing" ? " tts-playing" : ""}${status === "loading" ? " tts-loading" : ""}`}
              onClick={() => status === "playing" ? stop() : speak(current)}
              type="button"
            >
              {status === "loading" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>}
              {status === "playing" && <><WaveformIcon /><span>Stop</span></>}
              {status === "idle" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Listen</span></>}
            </button>
            <span className="tts-label">ElevenLabs TTS</span>
            <div className="modal-nav">
              <button className="nav-chip" disabled={section === 0} onClick={() => { stop(); setSection(s => s - 1); }} type="button">← Prev</button>
              <span className="tts-label">Part {section + 1} of {sections.length}</span>
              <button className="nav-chip" disabled={section >= sections.length - 1} onClick={() => { stop(); setSection(s => s + 1); }} type="button">Next →</button>
            </div>
          </div>
        )}

        <div className="modal-body">
          {loading && (
            <div className="modal-status">
              <div className="typing-dots"><span className="dot"/><span className="dot"/><span className="dot"/></div>
              <p style={{ marginTop: 12, color: "var(--text-mid)" }}>Loading book text…</p>
            </div>
          )}
          {error && <p className="modal-status" style={{ color: "#f87171" }}>{error}</p>}
          {!loading && !error && <pre className="reader-text">{current}</pre>}
        </div>
      </div>
    </div>
  );
}

// ── Book Cards ─────────────────────────────────────────────────────────────
function BookCards({ books, onOpen }: { books: BookRecommendation[]; onOpen: (b: BookRecommendation) => void }) {
  return (
    <div className="book-recs">
      <p className="book-recs-label">📚 Recommended reads</p>
      <div className="book-recs-grid">
        {books.map(book => (
          <button key={book.id} className="book-rec-card" onClick={() => onOpen(book)} type="button">
            <p className="book-rec-title">{book.title}</p>
            <p className="book-rec-author">{book.authors.map(a => a.name).join(", ")}</p>
            <p className="book-rec-reason">{book.reason}</p>
            <span className="book-rec-cta">Read + Listen →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Typing Indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg-row ai-row">
      <div className="ai-avatar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
        </svg>
      </div>
      <div className="bubble ai-bubble typing-dots">
        <span className="dot"/><span className="dot"/><span className="dot"/>
      </div>
    </div>
  );
}

// ── TTS Button ─────────────────────────────────────────────────────────────
function TTSButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = async () => {
    if (status === "playing") {
      audioRef.current?.pause();
      if (audioRef.current) { audioRef.current.currentTime = 0; URL.revokeObjectURL(audioRef.current.src); }
      audioRef.current = null; setStatus("idle"); return;
    }
    if (status === "loading") return;
    setStatus("loading");
    try {
      const audio = await speakWithElevenLabs(text);
      audioRef.current = audio;
      audio.onended = () => { setStatus("idle"); URL.revokeObjectURL(audio.src); audioRef.current = null; };
      audio.onerror = () => { setStatus("idle"); audioRef.current = null; };
      await audio.play(); setStatus("playing");
    } catch (e) { console.error("TTS error:", e); setStatus("idle"); }
  };

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); } };
  }, []);

  return (
    <button
      className={`tts-btn${status === "playing" ? " tts-playing" : ""}${status === "loading" ? " tts-loading" : ""}`}
      onClick={handleClick}
      title={status === "playing" ? "Stop audio" : status === "loading" ? "Loading…" : "Listen"}
      type="button"
    >
      {status === "loading" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>}
      {status === "playing" && <><WaveformIcon /><span>Stop</span></>}
      {status === "idle" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Listen</span></>}
    </button>
  );
}

// ── Chat Message ───────────────────────────────────────────────────────────
function ChatMessage({ message, onOpenBook, userInitial }: {
  message: Message;
  onOpenBook: (b: BookRecommendation) => void;
  userInitial: string;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`msg-row ${isUser ? "user-row" : "ai-row"}`}>
      {!isUser && (
        <div className="ai-avatar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
        </div>
      )}
      <div className="bubble-col">
        <div className={`bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
          <p>{message.content}</p>
          <time>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
        </div>
        {!isUser && (
          <div className="tts-row">
            <TTSButton text={message.content} />
            <span className="tts-label">ElevenLabs</span>
          </div>
        )}
        {!isUser && message.books && message.books.length > 0 && (
          <BookCards books={message.books} onOpen={onOpenBook} />
        )}
      </div>
      {isUser && <div className="user-avatar-chat">{userInitial}</div>}
    </div>
  );
}

// Main Chat Page 
export default function ChatPage() {
  const { data: session, status: authStatus } = useSession();
  const isLoggedIn = authStatus === "authenticated";
  const isAuthLoading = authStatus === "loading";

  const displayName = useMemo(() => {
    if (!session?.user) return "Reader";
    return session.user.name || session.user.email?.split("@")[0] || "Reader";
  }, [session]);

  const userInitial = displayName.charAt(0).toUpperCase();

  const initialMessage: Message = useMemo(() => ({
    id:        "init",
    role:      "assistant",
    content:   `Hi${isLoggedIn && displayName !== "Reader" ? `, ${displayName}` : ""}! I'm Atlas, your AI bibliotherapist. I'm here to listen and find the perfect book for how you're feeling. How are you today?`,
    timestamp: new Date(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []); // intentionally empty deps — we only want this once on mount

  const [messages, setMessages]   = useState<Message[]>([initialMessage]);
  const [input, setInput]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [openBook, setOpenBook]   = useState<BookRecommendation | null>(null);
  const recognitionRef  = useRef<any>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMessage: Message = {
      id:        Date.now().toString(),
      role:      "user",
      content:   text.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Only filter the greeting (role=assistant, id=init) so Gemini doesn't
      // get a leading assistant turn, which it rejects
      const payload = updatedMessages
        .filter(m => !(m.id === "init" && m.role === "assistant"))
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: payload }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `Server error ${response.status}`);
      }

      const data = await response.json();

      if (!data?.content) throw new Error("Empty response from AI");

      const aiMessage: Message = {
        id:        (Date.now() + 1).toString(),
        role:      "assistant",
        content:   data.content,
        timestamp: new Date(),
        books:     data.book
          ? [{
              id:      data.book.id,
              title:   data.book.title,
              authors: [{ name: data.book.author }],
              reason:  data.book.reason ?? "Recommended for you",
            }]
          : undefined,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (e: any) {
      console.error("Chat error:", e);
      const errorMessage: Message = {
        id:        (Date.now() + 2).toString(),
        role:      "assistant",
        content:   "I'm having a moment — could you try again? I'm still here with you.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(null); // clear the banner — the message is already in chat
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Voice input is not supported in this browser."); return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      setInput(Array.from(event.results).map((r: any) => r[0].transcript).join(""));
    };
    recognition.onend   = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setError("Voice recognition failed."); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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

        html, body { height: 100%; }
        body { font-family: var(--sans); background: var(--ink); color: var(--text); min-height: 100vh; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--ink-2); }
        ::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

        @keyframes fadeUp    { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse     { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes bounce    { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes waveBar   { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes ttsGlow   { 0%, 100% { box-shadow: 0 0 0 0 rgba(74,144,217,0.3); } 50% { box-shadow: 0 0 0 6px rgba(74,144,217,0); } }
        @keyframes dropdownIn{ from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes backdropIn{ from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn   { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes voicePulse{ 0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.35); } 50% { box-shadow: 0 0 0 6px rgba(201,168,76,0); } }

        .spin { animation: spin 0.7s linear infinite; }

        .page-wrap { display: grid; grid-template-rows: 64px 1fr; height: 100vh; }

        .nav { position: sticky; top: 0; z-index: 50; height: 64px; padding: 0 40px; display: flex; align-items: center; gap: 12px; background: rgba(13,13,15,0.9); border-bottom: 1px solid var(--border); backdrop-filter: blur(14px); }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .nav-logo { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px var(--blue-glow); }
        .nav-name { font-family: var(--serif); font-size: 1.45rem; font-weight: 600; color: var(--text); letter-spacing: 0.01em; }
        .nav-name em { color: var(--blue); font-style: normal; }
        .nav-divider { width: 1px; height: 22px; background: var(--border); }
        .nav-session { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blue); padding: 4px 10px; border: 1px solid rgba(74,144,217,0.25); border-radius: 4px; background: rgba(74,144,217,0.06); }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: pulse 2s infinite; }
        .nav-link { font-size: 0.8rem; font-weight: 500; color: var(--text-mid); text-decoration: none; padding: 6px 13px; border-radius: 20px; border: 1px solid transparent; transition: all 0.15s; }
        .nav-link:hover { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }
        .nav-spacer { flex: 1; }

        /* User menu */
        .user-menu-wrap { position: relative; }
        .user-menu-btn { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-mid); border-radius: 20px; padding: 5px 12px 5px 5px; cursor: pointer; transition: all 0.15s; color: var(--text); }
        .user-menu-btn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }
        .user-avatar-nav { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; color: white; flex-shrink: 0; }
        .user-name-nav { font-size: 0.78rem; font-weight: 500; color: var(--text); }
        .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; min-width: 175px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 10px; padding: 6px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); animation: dropdownIn 0.18s cubic-bezier(0.22,1,0.36,1) both; z-index: 200; }
        .user-dropdown-item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 500; color: var(--text-mid); text-decoration: none; background: none; border: none; cursor: pointer; transition: all 0.12s; text-align: left; font-family: var(--sans); }
        .user-dropdown-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .user-dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .user-dropdown-signout { color: #f87171 !important; }
        .user-dropdown-signout:hover { background: rgba(248,113,113,0.08) !important; color: #fca5a5 !important; }
        .nav-register { font-size: 0.78rem; font-weight: 500; color: var(--text-mid); text-decoration: none; padding: 6px 13px; border-radius: 20px; border: 1px solid var(--border-mid); transition: all 0.15s; }
        .nav-register:hover { color: var(--text); }
        .nav-login { font-size: 0.78rem; font-weight: 500; color: white; text-decoration: none; padding: 7px 16px; border-radius: 20px; background: linear-gradient(135deg, var(--blue), #6baee8); box-shadow: 0 4px 14px var(--blue-glow); transition: all 0.15s; }
        .nav-login:hover { transform: translateY(-1px); }

        /* Chat layout */
        .chat-wrap { display: flex; flex-direction: column; overflow: hidden; max-width: 820px; width: 100%; margin: 0 auto; padding: 0 28px; height: 100%; }
        .chat-subheader { padding: 16px 0 14px; display: flex; align-items: center; gap: 14px; flex-shrink: 0; border-bottom: 1px solid var(--border); }
        .atlas-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px var(--blue-glow); flex-shrink: 0; }
        .subheader-text h2 { font-family: var(--serif); font-size: 1.2rem; font-weight: 400; color: var(--text); }
        .subheader-text p { font-size: 0.72rem; color: var(--text-dim); margin-top: 2px; font-family: var(--mono); letter-spacing: 0.04em; }
        .subheader-chips { margin-left: auto; display: flex; gap: 8px; }
        .chip { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 3px; border: 1px solid; white-space: nowrap; }
        .chip-blue { color: var(--blue); border-color: rgba(74,144,217,0.3); background: rgba(74,144,217,0.06); }
        .chip-gold { color: var(--gold); border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.06); }

        /* Messages */
        .messages-area { flex: 1; overflow-y: auto; padding: 22px 0 10px; display: flex; flex-direction: column; scroll-behavior: smooth; }
        .msg-row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 16px; animation: fadeUp 0.28s cubic-bezier(0.22,1,0.36,1); }
        .user-row { flex-direction: row-reverse; }
        .ai-avatar { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px var(--blue-glow); flex-shrink: 0; }
        .user-avatar-chat { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--ink-4), var(--ink-3)); border: 1px solid var(--border-mid); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 600; color: var(--text-mid); flex-shrink: 0; }
        .bubble-col { display: flex; flex-direction: column; gap: 6px; max-width: 66%; }
        .bubble { padding: 12px 16px; border-radius: 18px; font-size: 0.88rem; line-height: 1.68; }
        .bubble p { color: inherit; }
        .bubble time { display: block; font-size: 0.62rem; margin-top: 6px; opacity: 0.4; font-family: var(--mono); }
        .ai-bubble { background: var(--ink-2); border: 1px solid var(--border); border-bottom-left-radius: 5px; color: var(--text); }
        .user-bubble { background: linear-gradient(135deg, var(--blue), #5fa3e8); border-bottom-right-radius: 5px; color: white; box-shadow: 0 4px 16px var(--blue-glow); }
        .user-bubble time { color: rgba(255,255,255,0.55); }

        /* TTS */
        .tts-row { display: flex; align-items: center; gap: 8px; padding-left: 2px; }
        .tts-btn { display: inline-flex; align-items: center; gap: 6px; font-family: var(--sans); font-size: 0.72rem; font-weight: 500; padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border-mid); background: var(--ink-3); color: var(--text-mid); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .tts-btn:hover { border-color: rgba(74,144,217,0.4); color: var(--text); background: rgba(74,144,217,0.1); }
        .tts-btn.tts-playing { border-color: rgba(74,217,144,0.4); color: #4adda0; background: rgba(74,217,144,0.08); animation: ttsGlow 2s ease-in-out infinite; }
        .tts-btn.tts-loading { opacity: 0.6; cursor: wait; }
        .tts-label { font-family: var(--mono); font-size: 0.58rem; color: var(--text-dim); letter-spacing: 0.08em; text-transform: uppercase; }

        /* Typing */
        .typing-dots { display: flex; align-items: center; gap: 5px; padding: 14px 16px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); display: inline-block; animation: bounce 1.3s infinite ease-in-out; }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        /* Book recs */
        .book-recs { margin-top: 8px; }
        .book-recs-label { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; }
        .book-recs-grid { display: flex; flex-direction: column; gap: 6px; }
        .book-rec-card { background: var(--ink-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; cursor: pointer; text-align: left; transition: all 0.15s; width: 100%; }
        .book-rec-card:hover { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.04); transform: translateX(3px); }
        .book-rec-title { font-family: var(--serif); font-size: 0.92rem; font-weight: 400; color: var(--text); margin-bottom: 2px; line-height: 1.3; }
        .book-rec-author { font-size: 0.68rem; color: var(--text-dim); margin-bottom: 5px; font-family: var(--mono); }
        .book-rec-reason { font-size: 0.72rem; color: var(--text-mid); margin-bottom: 7px; font-style: italic; }
        .book-rec-cta { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); padding: 3px 8px; border: 1px solid rgba(201,168,76,0.3); border-radius: 3px; background: rgba(201,168,76,0.06); }

        /* Input */
        .input-area { padding: 12px 0 20px; flex-shrink: 0; }
        .error-msg { font-size: 0.78rem; color: #f87171; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); border-radius: 8px; padding: 8px 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .input-wrapper { display: flex; align-items: flex-end; gap: 8px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 18px; padding: 10px 10px 10px 18px; transition: border-color 0.2s, box-shadow 0.2s; }
        .input-wrapper:focus-within { border-color: rgba(74,144,217,0.4); box-shadow: 0 0 0 3px rgba(74,144,217,0.08); }
        textarea { flex: 1; border: none; outline: none; background: transparent; resize: none; font-family: var(--sans); font-size: 0.88rem; color: var(--text); line-height: 1.5; min-height: 36px; max-height: 140px; padding: 5px 0; caret-color: var(--blue); }
        textarea::placeholder { color: var(--text-dim); }
        .input-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .icon-btn { width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .voice-btn { background: var(--ink-3); color: var(--text-mid); border: 1px solid var(--border-mid); }
        .voice-btn:hover { background: var(--ink-4); color: var(--text); }
        .voice-btn.active { background: rgba(201,168,76,0.1); color: var(--gold); border-color: rgba(201,168,76,0.3); animation: voicePulse 1.2s infinite; }
        .send-btn { background: linear-gradient(135deg, var(--blue), #6baee8); color: white; box-shadow: 0 4px 14px var(--blue-glow); }
        .send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(74,144,217,0.35); }
        .send-btn:disabled { background: var(--ink-4); color: var(--text-dim); box-shadow: none; cursor: not-allowed; transform: none; }
        .input-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 0 2px; }
        .input-hint { font-family: var(--mono); font-size: 0.6rem; color: var(--text-dim); letter-spacing: 0.06em; }
        .powered-by { font-family: var(--mono); font-size: 0.6rem; color: var(--text-dim); display: flex; align-items: center; gap: 4px; }
        .powered-by em { color: var(--gold); font-style: normal; }

        /* Modal */
        .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(8,8,10,0.82); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: backdropIn 0.2s ease both; }
        .modal { position: relative; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 16px; max-width: 720px; width: 100%; max-height: 88vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 32px 80px rgba(0,0,0,0.7); animation: modalIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .modal-header { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-shrink: 0; }
        .modal-header-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .modal-book-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .modal-book-title { font-family: var(--serif); font-size: 1rem; font-weight: 400; color: var(--text); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .modal-book-author { font-family: var(--mono); font-size: 0.66rem; color: var(--gold); margin-top: 2px; }
        .modal-book-reason { font-size: 0.7rem; color: var(--text-mid); margin-top: 3px; font-style: italic; }
        .modal-close { width: 30px; height: 30px; border-radius: 50%; background: var(--ink-3); border: 1px solid var(--border-mid); color: var(--text-mid); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .modal-close:hover { background: var(--ink-4); color: var(--text); }
        .modal-controls { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap; }
        .modal-nav { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .nav-chip { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.08em; padding: 5px 10px; border-radius: 3px; border: 1px solid var(--border-mid); background: var(--ink-3); color: var(--text-mid); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .nav-chip:hover:not(:disabled) { border-color: rgba(74,144,217,0.4); color: var(--text); }
        .nav-chip:disabled { opacity: 0.35; cursor: not-allowed; }
        .modal-body { flex: 1; overflow-y: auto; padding: 24px; }
        .modal-status { padding: 48px 0; text-align: center; font-size: 0.88rem; }
        .reader-text { white-space: pre-wrap; word-break: break-word; font-family: var(--serif); font-size: 1rem; line-height: 1.9; color: var(--text-mid); }

        @media (max-width: 860px) { .nav { padding: 0 20px; } .chat-wrap { padding: 0 16px; } .subheader-chips { display: none; } .bubble-col { max-width: 78%; } }
        @media (max-width: 540px)  { .nav-session { display: none; } .nav-link { display: none; } .bubble-col { max-width: 86%; } }
      `}</style>

      <div className="page-wrap">
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
          <div className="nav-divider" />
          <div className="nav-session"><span className="live-dot" />Session Active</div>
          <Link href="/books" className="nav-link">Search Books</Link>
          <div className="nav-spacer" />
          {isAuthLoading ? (
            <div style={{ width: 80, height: 34, borderRadius: 20, background: "rgba(255,255,255,0.04)" }} />
          ) : isLoggedIn ? (
            <UserMenu name={displayName} />
          ) : (
            <>
              <Link href="/register" className="nav-register">Register</Link>
              <Link href="/login" className="nav-login">Sign in →</Link>
            </>
          )}
        </nav>

        <main className="chat-wrap">
          <div className="chat-subheader">
            <div className="atlas-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <div className="subheader-text">
              <h2>Atlas · AI Bibliotherapist</h2>
              <p>Powered by Gemini · ElevenLabs · MongoDB</p>
            </div>
            <div className="subheader-chips">
              <span className="chip chip-blue">Private Session</span>
              <span className="chip chip-gold">Befrienders KL · 03-76272929</span>
            </div>
          </div>

          <div className="messages-area">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} onOpenBook={setOpenBook} userInitial={userInitial} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            {error && (
              <p className="error-msg">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </p>
            )}
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind…"
                rows={1}
                disabled={isLoading}
              />
              <div className="input-actions">
                <button
                  className={`icon-btn voice-btn ${isListening ? "active" : ""}`}
                  onClick={toggleVoice}
                  title={isListening ? "Stop listening" : "Voice input"}
                  type="button"
                >
                  {isListening
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  }
                </button>
                <button
                  className="icon-btn send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  type="button"
                  title="Send"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
            <div className="input-footer">
              <span className="input-hint">Enter to send · Shift+Enter for new line</span>
              <span className="powered-by">Powered by <em>Gemini</em> &amp; <em>ElevenLabs</em></span>
            </div>
          </div>
        </main>
      </div>

      {openBook && <BookReader book={openBook} onClose={() => setOpenBook(null)} />}
    </>
  );
}