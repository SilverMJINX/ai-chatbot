"use client";

import { useState, useRef, useEffect } from "react";
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

const USERNAME = "Admin";
const ELEVEN_LABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
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
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
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

// Book Reader Modal 
function WaveformIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 28 20" fill="currentColor">
      {[3, 8, 13, 18, 23].map((x, i) => (
        <rect key={x} x={x} y={i % 2 === 0 ? 4 : 0} width="3"
          height={i % 2 === 0 ? 12 : 20} rx="1.5"
          style={{ animation: "waveBar 0.9s ease-in-out infinite",
            animationDelay: `${i * 0.12}s`, transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

function BookReader({ book, onClose }: { book: BookRecommendation; onClose: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState(0);
  const { speak, stop, status } = useElevenLabsTTS();

  const sections = text.split(/\n{3,}/).map(s => s.trim()).filter(s => s.length > 100);
  const current = sections[section] ?? "";

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(t => setText(t))
      .catch(() => setError("Full text unavailable for this book."))
      .finally(() => setLoading(false));
    return () => stop();
  }, [book.id]);

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-panel" onClick={e => e.stopPropagation()}>
        <div className="reader-header">
          <div className="reader-header-left">
            <div className="ai-avatar-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div>
              <h2 className="reader-title">{book.title}</h2>
              <p className="reader-author">{book.authors.map(a => a.name).join(", ")}</p>
              {book.reason && (
                <p className="reader-reason">💡 {book.reason}</p>
              )}
            </div>
          </div>
          <button className="reader-close-btn" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {!loading && !error && sections.length > 0 && (
          <div className="reader-controls">
            <button
              className={`tts-btn ${status === "playing" ? "tts-playing" : ""} ${status === "loading" ? "tts-loading" : ""}`}
              onClick={() => status === "playing" ? stop() : speak(current)}
              type="button"
            >
              {status === "loading" && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                </svg>
              )}
              {status === "playing" && <><WaveformIcon /><span>Stop</span></>}
              {status === "idle" && (
                <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Listen</span></>
              )}
            </button>
            <span className="tts-label">ElevenLabs TTS</span>
            <div className="reader-nav">
              <button className="chip chip-blue reader-nav-btn"
                disabled={section === 0}
                onClick={() => { stop(); setSection(s => s - 1); }} type="button">← Prev</button>
              <span className="reader-section-label">Part {section + 1} of {sections.length}</span>
              <button className="chip chip-blue reader-nav-btn"
                disabled={section >= sections.length - 1}
                onClick={() => { stop(); setSection(s => s + 1); }} type="button">Next →</button>
            </div>
          </div>
        )}

        <div className="reader-body">
          {loading && (
            <div className="reader-status">
              <div className="typing-bubble" style={{ justifyContent: "center" }}>
                <span className="dot"/><span className="dot"/><span className="dot"/>
              </div>
              <p style={{ marginTop: 12 }}>Loading book text…</p>
            </div>
          )}
          {error && <p className="reader-status reader-error">{error}</p>}
          {!loading && !error && <pre className="reader-text">{current}</pre>}
        </div>
      </div>
    </div>
  );
}

// Book Recommendation Cards 
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

// Typing Indicator 
function TypingIndicator() {
  return (
    <div className="msg-row ai-row">
      <div className="ai-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
        </svg>
      </div>
      <div className="bubble ai-bubble typing-bubble">
        <span className="dot"/><span className="dot"/><span className="dot"/>
      </div>
    </div>
  );
}

// TTS Button 
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
      className={`tts-btn ${status === "playing" ? "tts-playing" : ""} ${status === "loading" ? "tts-loading" : ""}`}
      onClick={handleClick}
      title={status === "playing" ? "Stop audio" : status === "loading" ? "Loading audio…" : "Listen to this message"}
      type="button"
    >
      {status === "loading" && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin">
          <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
        </svg>
      )}
      {status === "playing" && <><WaveformIcon /><span>Stop</span></>}
      {status === "idle" && (
        <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Listen</span></>
      )}
    </button>
  );
}

// Chat Message
function ChatMessage({ message, onOpenBook }: { message: Message; onOpenBook: (b: BookRecommendation) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`msg-row ${isUser ? "user-row" : "ai-row"}`}>
      {!isUser && (
        <div className="ai-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
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
            <span className="tts-label">ElevenLabs TTS</span>
          </div>
        )}
        {!isUser && message.books && message.books.length > 0 && (
          <BookCards books={message.books} onOpen={onOpenBook} />
        )}
      </div>
      {isUser && <div className="user-avatar">{USERNAME.charAt(0).toUpperCase()}</div>}
    </div>
  );
}

// Main Chat Page
const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  content: `Hi, ${USERNAME}! I'm your AI therapist. I'm here to listen and support you. How are you feeling today?`,
  timestamp: new Date(),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBook, setOpenBook] = useState<BookRecommendation | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  // Fetch books from Gutendex based on a keyword
  const fetchBooks = async (keyword: string): Promise<BookRecommendation[]> => {
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      return (data.results ?? []).slice(0, 3).map((b: any) => ({
        id: b.id,
        title: b.title,
        authors: b.authors,
        reason: "",
      }));
    } catch { return []; }
  };

  // Detect emotional keywords and map to book search terms
  const getBookKeyword = (text: string): string | null => {
    const t = text.toLowerCase();
    if (t.match(/anxious|anxiety|worry|worried|nervous|stress/)) return "anxiety mindfulness";
    if (t.match(/depress|sad|hopeless|empty|numb|down/)) return "hope happiness";
    if (t.match(/grief|loss|bereav|mourn|miss someone/)) return "grief loss";
    if (t.match(/anger|angry|furious|rage|frustrat/)) return "stoicism anger";
    if (t.match(/lonely|alone|isolat|no friends/)) return "friendship connection";
    if (t.match(/sleep|insomnia|tired|exhaust/)) return "sleep rest";
    if (t.match(/self.esteem|confidence|worthless|ugly/)) return "self improvement confidence";
    if (t.match(/relationship|breakup|divorce|heartbreak/)) return "love relationships";
    if (t.match(/trauma|abuse|ptsd|hurt/)) return "healing recovery";
    if (t.match(/purpose|meaning|lost|direction/)) return "philosophy meaning life";
    return null;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Run AI response and book fetch in parallel
      const bookKeyword = getBookKeyword(text);
      const [response, books] = await Promise.all([
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }),
        bookKeyword ? fetchBooks(bookKeyword) : Promise.resolve([]),
      ]);

      if (!response.ok) throw new Error("Failed to get response");
      let data;
      try { data = await response.json(); } catch { throw new Error("Invalid response format"); }
      if (!data?.content) throw new Error("Invalid response format");

      // Add reason to books based on keyword
      const reasonMap: Record<string, string> = {
        "anxiety mindfulness": "May help calm anxious thoughts",
        "hope happiness":      "A gentle read to lift your spirits",
        "grief loss":          "Companions through difficult loss",
        "stoicism anger":      "Ancient wisdom on managing anger",
        "friendship connection": "Stories about human connection",
        "sleep rest":          "Peaceful reads for a quiet mind",
        "self improvement confidence": "Builds inner strength",
        "love relationships":  "Insight into love and connection",
        "healing recovery":    "Stories of resilience and healing",
        "philosophy meaning life": "Explores life's deeper questions",
      };
      const reason = bookKeyword ? (reasonMap[bookKeyword] ?? "Recommended for you") : "";
      const booksWithReasons = books.map(b => ({ ...b, reason }));

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        books: booksWithReasons.length > 0 ? booksWithReasons : undefined,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      setError("Something went wrong. Please try again.");
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
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      setInput(Array.from(event.results).map((r: any) => r[0].transcript).join(""));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setError("Voice recognition failed."); };
    recognitionRef.current = recognition;
    recognition.start(); setIsListening(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --blue:        #4a90d9;
          --blue-dark:   #2563a8;
          --blue-deeper: #1a4a80;
          --blue-light:  #dbeafe;
          --blue-soft:   #eff6ff;
          --blue-mid:    #bfdbfe;
          --blue-glow:   rgba(74,144,217,0.25);
          --coral:       #f87171;
          --coral-light: #fff5f5;
          --amber:       #fbbf24;
          --bg:          #f0f6ff;
          --white:       #ffffff;
          --text:        #1e3a5f;
          --text-mid:    #4a6080;
          --text-soft:   #8aaac8;
          --border:      #d0e4f7;
          --shadow-sm:   0 1px 4px rgba(37,99,168,0.07);
          --shadow-md:   0 4px 20px rgba(37,99,168,0.1);
        }

        html, body { height: 100%; }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg); color: var(--text); min-height: 100vh;
          background-image:
            radial-gradient(ellipse 55% 40% at 90% 5%,  rgba(74,144,217,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 45% 45% at 5%  95%, rgba(74,144,217,0.08) 0%, transparent 60%);
        }

        .page-wrap { display: grid; grid-template-rows: 64px 1fr; height: 100vh; }

        .topnav {
          background: var(--white); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; padding: 0 32px; gap: 16px;
          box-shadow: var(--shadow-sm); z-index: 20;
        }

        .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }

        .brand-icon {
          width: 36px; height: 36px; border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px var(--blue-glow);
        }

        .brand-name {
          font-family: 'Fraunces', Georgia, serif; font-size: 1.3rem;
          font-weight: 600; color: var(--text); letter-spacing: -0.02em;
        }
        .brand-name span { color: var(--blue); }

        .nav-divider { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }

        .nav-badge {
          display: flex; align-items: center; gap: 6px;
          background: var(--blue-soft); color: var(--blue-dark);
          font-size: 0.72rem; font-weight: 600; padding: 5px 12px;
          border-radius: 20px; border: 1px solid var(--blue-mid);
        }

        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--blue); animation: livePulse 2s infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,144,217,0.4); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 5px rgba(74,144,217,0); }
        }

        .nav-spacer { flex: 1; }

        .nav-books-link {
          font-size: 0.82rem; font-weight: 600; color: var(--blue-dark);
          text-decoration: none; padding: 6px 14px; border-radius: 20px;
          background: var(--blue-soft); border: 1.5px solid var(--blue-mid);
          transition: all 0.15s; white-space: nowrap;
        }
        .nav-books-link:hover { background: var(--blue-light); border-color: var(--blue); }

        .nav-user {
          display: flex; align-items: center; gap: 10px; padding: 6px 12px;
          border-radius: 12px; cursor: pointer; transition: background 0.15s;
        }
        .nav-user:hover { background: var(--bg); }

        .nav-user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: white;
          box-shadow: 0 2px 8px var(--blue-glow);
        }

        .nav-user-name { font-size: 0.85rem; font-weight: 600; color: var(--text); }

        .main {
          display: flex; flex-direction: column; overflow: hidden;
          max-width: 860px; width: 100%; margin: 0 auto; padding: 0 24px;
        }

        .chat-subheader {
          padding: 18px 0 14px; display: flex; align-items: center;
          gap: 14px; flex-shrink: 0; border-bottom: 1px solid var(--border);
        }

        .ai-avatar-lg {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px var(--blue-glow); flex-shrink: 0;
        }

        .chat-subheader-text h2 { font-size: 0.98rem; font-weight: 700; color: var(--text); }
        .chat-subheader-text p  { font-size: 0.74rem; color: var(--text-soft); margin-top: 2px; }

        .subheader-chips { margin-left: auto; display: flex; gap: 8px; }

        .chip {
          font-size: 0.71rem; font-weight: 600; padding: 5px 11px;
          border-radius: 20px; border: 1.5px solid; white-space: nowrap;
        }
        .chip-blue  { color: var(--blue-dark); background: var(--blue-soft); border-color: var(--blue-mid); }
        .chip-coral { color: #b91c1c; background: var(--coral-light); border-color: #fca5a5; }

        .messages-area {
          flex: 1; overflow-y: auto; padding: 24px 0 12px;
          display: flex; flex-direction: column; scroll-behavior: smooth;
        }
        .messages-area::-webkit-scrollbar { width: 5px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: var(--blue-mid); border-radius: 3px; }

        .msg-row {
          display: flex; align-items: flex-end; gap: 10px; margin-bottom: 16px;
          animation: fadeUp 0.28s cubic-bezier(0.22,1,0.36,1);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .user-row { flex-direction: row-reverse; }

        .ai-avatar {
          width: 34px; height: 34px; border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px var(--blue-glow); flex-shrink: 0;
        }

        .user-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #60a5fa, var(--blue));
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700; color: white;
          flex-shrink: 0; box-shadow: 0 3px 10px var(--blue-glow);
        }

        .bubble { padding: 12px 16px; border-radius: 20px; font-size: 0.9rem; line-height: 1.65; }
        .bubble p { color: inherit; }
        .bubble time { display: block; font-size: 0.65rem; margin-top: 6px; opacity: 0.45; }

        .ai-bubble {
          background: var(--white); border: 1px solid var(--border);
          border-bottom-left-radius: 6px; color: var(--text); box-shadow: var(--shadow-sm);
        }
        .user-bubble {
          background: linear-gradient(135deg, var(--blue), #6baee8);
          border-bottom-right-radius: 6px; color: white;
          box-shadow: 0 4px 16px var(--blue-glow);
        }
        .user-bubble time { color: rgba(255,255,255,0.65); }

        .bubble-col { display: flex; flex-direction: column; gap: 6px; max-width: 68%; }

        .tts-row { display: flex; align-items: center; gap: 8px; padding-left: 4px; }

        .tts-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.76rem; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 6px 14px 6px 11px; border-radius: 20px;
          border: 1.5px solid var(--blue-mid); background: var(--white);
          color: var(--blue-dark); cursor: pointer; transition: all 0.15s ease;
          white-space: nowrap; box-shadow: 0 1px 4px rgba(37,99,168,0.10);
        }
        .tts-btn:hover {
          background: var(--blue-soft); border-color: var(--blue);
          transform: translateY(-1px); box-shadow: 0 3px 10px rgba(74,144,217,0.2);
        }
        .tts-btn.tts-playing {
          background: #f0fdf4; border-color: #86efac; color: #166534;
          animation: ttsGlow 2s ease-in-out infinite;
        }
        .tts-btn.tts-loading { opacity: 0.7; cursor: wait; }

        @keyframes ttsGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(134,239,172,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(134,239,172,0); }
        }
        @keyframes waveBar { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.7s linear infinite; }

        .tts-label { font-size: 0.64rem; color: var(--text-soft); letter-spacing: 0.02em; }

        /* ── Book recommendation cards ── */
        .book-recs { margin-top: 10px; }
        .book-recs-label {
          font-size: 0.72rem; font-weight: 600; color: var(--text-soft);
          margin-bottom: 8px; padding-left: 2px;
        }
        .book-recs-grid { display: flex; flex-direction: column; gap: 8px; }

        .book-rec-card {
          background: var(--blue-soft); border: 1.5px solid var(--blue-mid);
          border-radius: 14px; padding: 12px 14px; cursor: pointer;
          text-align: left; transition: all 0.15s; width: 100%;
          box-shadow: 0 1px 4px rgba(37,99,168,0.07);
        }
        .book-rec-card:hover {
          background: var(--blue-light); border-color: var(--blue);
          transform: translateY(-1px); box-shadow: 0 4px 12px rgba(74,144,217,0.15);
        }

        .book-rec-title {
          font-size: 0.84rem; font-weight: 700; color: var(--text);
          margin-bottom: 2px; line-height: 1.3;
        }
        .book-rec-author { font-size: 0.72rem; color: var(--text-soft); margin-bottom: 6px; }
        .book-rec-reason { font-size: 0.74rem; color: var(--text-mid); margin-bottom: 8px; font-style: italic; }
        .book-rec-cta {
          font-size: 0.72rem; font-weight: 600; color: var(--blue-dark);
          background: var(--white); padding: 4px 10px; border-radius: 20px;
          border: 1px solid var(--blue-mid); display: inline-block;
        }

        /* ── Typing dots ── */
        .typing-bubble { display: flex; align-items: center; gap: 5px; padding: 16px 18px; }
        .dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--blue);
          display: inline-block; animation: bounce 1.3s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-7px); opacity: 1; }
        }

        /* ── Input ── */
        .input-area { padding: 14px 0 22px; flex-shrink: 0; }

        .error-msg {
          font-size: 0.78rem; color: #b91c1c; background: var(--coral-light);
          border: 1px solid #fca5a5; border-radius: 10px; padding: 8px 14px;
          margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
        }

        .input-wrapper {
          display: flex; align-items: flex-end; gap: 10px;
          background: var(--white); border: 2px solid var(--border);
          border-radius: 20px; padding: 10px 10px 10px 20px;
          transition: border-color 0.2s, box-shadow 0.2s; box-shadow: var(--shadow-sm);
        }
        .input-wrapper:focus-within {
          border-color: var(--blue); box-shadow: 0 0 0 4px rgba(74,144,217,0.12);
        }

        textarea {
          flex: 1; border: none; outline: none; background: transparent;
          resize: none; font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem; color: var(--text); line-height: 1.5;
          min-height: 38px; max-height: 140px; padding: 6px 0; caret-color: var(--blue);
        }
        textarea::placeholder { color: var(--text-soft); }

        .input-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .icon-btn {
          width: 38px; height: 38px; border-radius: 12px; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.18s;
        }

        .voice-btn { background: var(--blue-soft); color: var(--blue-dark); border: 1.5px solid var(--blue-mid); }
        .voice-btn:hover { background: var(--blue-light); }
        .voice-btn.active {
          background: var(--coral-light); color: var(--coral); border-color: #fca5a5;
          animation: voicePulse 1.2s infinite;
        }

        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.35); }
          50%       { box-shadow: 0 0 0 6px rgba(248,113,113,0); }
        }

        .send-btn {
          background: linear-gradient(135deg, var(--blue), #6baee8);
          color: white; box-shadow: 0 4px 14px var(--blue-glow);
        }
        .send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(74,144,217,0.4); }
        .send-btn:disabled {
          background: var(--blue-light); color: var(--text-soft);
          box-shadow: none; cursor: not-allowed; transform: none;
        }

        .input-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 10px; padding: 0 4px;
        }
        .input-hint { font-size: 0.69rem; color: var(--text-soft); }
        .powered-by { font-size: 0.69rem; color: var(--text-soft); display: flex; align-items: center; gap: 4px; }
        .powered-by span { color: var(--blue-dark); font-weight: 600; }

        /* ── Reader modal ── */
        .reader-overlay {
          position: fixed; inset: 0; background: rgba(30,58,95,0.5);
          backdrop-filter: blur(6px); z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; animation: fadeUp 0.2s ease;
        }
        .reader-panel {
          background: var(--white); border-radius: 20px;
          width: 100%; max-width: 740px; max-height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: var(--shadow-md); overflow: hidden; border: 1px solid var(--border);
        }
        .reader-header {
          padding: 18px 20px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px; flex-shrink: 0;
        }
        .reader-header-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .reader-title {
          font-size: 0.95rem; font-weight: 700; color: var(--text); line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
        }
        .reader-author { font-size: 0.74rem; color: var(--text-soft); margin-top: 2px; }
        .reader-reason { font-size: 0.72rem; color: var(--blue-dark); margin-top: 3px; font-style: italic; }
        .reader-close-btn {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid var(--border); background: var(--bg);
          color: var(--text-mid); cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .reader-close-btn:hover { background: var(--blue-light); border-color: var(--blue); color: var(--blue-dark); }
        .reader-controls {
          padding: 12px 20px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap;
        }
        .reader-nav { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .reader-nav-btn { cursor: pointer !important; transition: all 0.15s; }
        .reader-nav-btn:hover:not(:disabled) { background: var(--blue-light) !important; border-color: var(--blue) !important; }
        .reader-nav-btn:disabled { opacity: 0.35; cursor: not-allowed !important; }
        .reader-section-label { font-size: 0.72rem; color: var(--text-soft); white-space: nowrap; }
        .reader-body { flex: 1; overflow-y: auto; padding: 28px; }
        .reader-body::-webkit-scrollbar { width: 5px; }
        .reader-body::-webkit-scrollbar-track { background: transparent; }
        .reader-body::-webkit-scrollbar-thumb { background: var(--blue-mid); border-radius: 3px; }
        .reader-text {
          white-space: pre-wrap; word-break: break-word;
          font-family: 'Georgia', serif; font-size: 0.97rem; line-height: 1.9; color: var(--text);
        }
        .reader-status { padding: 48px 0; text-align: center; color: var(--text-soft); font-size: 0.88rem; }
        .reader-error { color: #b91c1c; }

        @media (max-width: 768px) {
          .topnav { padding: 0 16px; }
          .main { padding: 0 16px; }
          .subheader-chips { display: none; }
          .bubble { max-width: 78%; }
          .bubble-col { max-width: 80%; }
        }
        @media (max-width: 480px) {
          .brand-name { display: none; }
          .nav-badge { display: none; }
          .nav-books-link span { display: none; }
          .bubble { max-width: 88%; font-size: 0.875rem; }
        }
      `}</style>

      <div className="page-wrap">
        <nav className="topnav">
          <Link href = "/" className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <span className="brand-name">At<span>las</span></span>
          </Link>
          <div className="nav-divider" />
          <div className="nav-badge">
            <span className="live-dot" />
            Session Active
          </div>
          <a href="/books" className="nav-books-link">📚 <span>Books</span></a>
          <div className="nav-spacer" />
          <div className="nav-user">
            <div className="nav-user-avatar">{USERNAME.charAt(0)}</div>
            <span className="nav-user-name">{USERNAME}</span>
          </div>
        </nav>

        <main className="main">
          <div className="chat-subheader">
            <div className="ai-avatar-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <div className="chat-subheader-text">
              <h2>Atlas · AI Therapist</h2>
              <p>Always here to listen and support you</p>
            </div>
            <div className="subheader-chips">
              <span className="chip chip-blue">Private Session</span>
              <span className="chip chip-coral">Call 03-76272929 (Befrienders KL)</span>
            </div>
          </div>

          <div className="messages-area">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} onOpenBook={setOpenBook} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            {error && (
              <p className="error-msg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
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
                  {isListening ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>
                <button
                  className="icon-btn send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  type="button"
                  title="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="input-footer">
              <span className="input-hint">Enter to send · Shift+Enter for new line</span>
              <span className="powered-by">Powered by <span>Gemini</span> &amp; <span>ElevenLabs</span></span>
            </div>
          </div>
        </main>
      </div>

      {openBook && <BookReader book={openBook} onClose={() => setOpenBook(null)} />}
    </>
  );
}