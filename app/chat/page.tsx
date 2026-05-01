"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;

const USERNAME = "Admin"; // Default username for personalization, can be made dynamic later

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  content: `Hi, ${USERNAME}! I'm your AI therapist. I'm here to listen and support you. How are you feeling today?`,
  timestamp: new Date(),
};

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
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
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
      <div className={`bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
        <p>{message.content}</p>
        <time>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </div>
      {isUser && (
        <div className="user-avatar">
          {USERNAME.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!response.ok) throw new Error("Failed to get response");
      let data;
      try { 
        data = await response.json(); 
      } catch { throw new Error("Invalid response format"); }
      if (!data?.content) throw new Error("Invalid response format");
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
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
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setError("Voice recognition failed. Please try again."); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          /* Blue palette */
          --blue:        #4a90d9;
          --blue-dark:   #2563a8;
          --blue-deeper: #1a4a80;
          --blue-light:  #dbeafe;
          --blue-soft:   #eff6ff;
          --blue-mid:    #bfdbfe;
          --blue-glow:   rgba(74,144,217,0.25);

          /* Accent for voice/error */
          --coral:       #f87171;
          --coral-light: #fff5f5;
          --amber:       #fbbf24;

          /* Neutrals */
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
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          background-image:
            radial-gradient(ellipse 55% 40% at 90% 5%,  rgba(74,144,217,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 45% 45% at 5%  95%, rgba(74,144,217,0.08) 0%, transparent 60%);
        }

        /* ── Page layout ── */
        .page-wrap {
          display: grid;
          grid-template-rows: 64px 1fr;
          height: 100vh;
        }

        /* ── Top nav ── */
        .topnav {
          background: var(--white);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 32px;
          gap: 16px;
          box-shadow: var(--shadow-sm);
          z-index: 20;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px var(--blue-glow);
        }

        .brand-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .brand-name span { color: var(--blue); }

        .nav-divider {
          width: 1px;
          height: 24px;
          background: var(--border);
          margin: 0 4px;
        }

        .nav-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--blue-soft);
          color: var(--blue-dark);
          font-size: 0.72rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--blue-mid);
          letter-spacing: 0.02em;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--blue);
          animation: livePulse 2s infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,144,217,0.4); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 5px rgba(74,144,217,0); }
        }

        .nav-spacer { flex: 1; }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .nav-user:hover { background: var(--bg); }

        .nav-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 2px 8px var(--blue-glow);
        }

        .nav-user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
        }

        /* ── Main chat ── */
        .main {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Chat subheader */
        .chat-subheader {
          padding: 18px 0 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border);
        }

        .ai-avatar-lg {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px var(--blue-glow);
          flex-shrink: 0;
        }

        .chat-subheader-text h2 {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text);
        }

        .chat-subheader-text p {
          font-size: 0.74rem;
          color: var(--text-soft);
          margin-top: 2px;
        }

        .subheader-chips {
          margin-left: auto;
          display: flex;
          gap: 8px;
        }

        .chip {
          font-size: 0.71rem;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 20px;
          border: 1.5px solid;
          white-space: nowrap;
        }

        .chip-blue  {
          color: var(--blue-dark);
          background: var(--blue-soft);
          border-color: var(--blue-mid);
        }

        .chip-coral {
          color: #b91c1c;
          background: var(--coral-light);
          border-color: #fca5a5;
        }

        /* ── Messages ── */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0 12px;
          display: flex;
          flex-direction: column;
          scroll-behavior: smooth;
        }

        .messages-area::-webkit-scrollbar { width: 5px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: var(--blue-mid); border-radius: 3px; }

        .msg-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          margin-bottom: 16px;
          animation: fadeUp 0.28s cubic-bezier(0.22,1,0.36,1);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .user-row { flex-direction: row-reverse; }

        .ai-avatar {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px var(--blue-glow);
          flex-shrink: 0;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #60a5fa, var(--blue));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 3px 10px var(--blue-glow);
        }

        .bubble {
          max-width: 62%;
          padding: 12px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          line-height: 1.65;
        }

        .bubble p { color: inherit; }

        .bubble time {
          display: block;
          font-size: 0.65rem;
          margin-top: 6px;
          opacity: 0.45;
        }

        .ai-bubble {
          background: var(--white);
          border: 1px solid var(--border);
          border-bottom-left-radius: 6px;
          color: var(--text);
          box-shadow: var(--shadow-sm);
        }

        .user-bubble {
          background: linear-gradient(135deg, var(--blue), #6baee8);
          border-bottom-right-radius: 6px;
          color: white;
          box-shadow: 0 4px 16px var(--blue-glow);
        }

        .user-bubble time { color: rgba(255,255,255,0.65); }

        /* Typing dots */
        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 16px 18px;
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--blue);
          display: inline-block;
          animation: bounce 1.3s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-7px); opacity: 1; }
        }

        /* ── Input ── */
        .input-area {
          padding: 14px 0 22px;
          flex-shrink: 0;
        }

        .error-msg {
          font-size: 0.78rem;
          color: #b91c1c;
          background: var(--coral-light);
          border: 1px solid #fca5a5;
          border-radius: 10px;
          padding: 8px 14px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 20px;
          padding: 10px 10px 10px 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: var(--shadow-sm);
        }

        .input-wrapper:focus-within {
          border-color: var(--blue);
          box-shadow: 0 0 0 4px rgba(74,144,217,0.12);
        }

        textarea {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          resize: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          color: var(--text);
          line-height: 1.5;
          min-height: 38px;
          max-height: 140px;
          padding: 6px 0;
          caret-color: var(--blue);
        }

        textarea::placeholder { color: var(--text-soft); }

        .input-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s;
        }

        .voice-btn {
          background: var(--blue-soft);
          color: var(--blue-dark);
          border: 1.5px solid var(--blue-mid);
        }
        .voice-btn:hover { background: var(--blue-light); }
        .voice-btn.active {
          background: var(--coral-light);
          color: var(--coral);
          border-color: #fca5a5;
          animation: voicePulse 1.2s infinite;
        }

        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.35); }
          50%       { box-shadow: 0 0 0 6px rgba(248,113,113,0); }
        }

        .send-btn {
          background: linear-gradient(135deg, var(--blue), #6baee8);
          color: white;
          box-shadow: 0 4px 14px var(--blue-glow);
        }
        .send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(74,144,217,0.4); }
        .send-btn:disabled {
          background: var(--blue-light);
          color: var(--text-soft);
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        .input-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 4px;
        }

        .input-hint { font-size: 0.69rem; color: var(--text-soft); }

        .powered-by {
          font-size: 0.69rem;
          color: var(--text-soft);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .powered-by span { color: var(--blue-dark); font-weight: 600; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .topnav { padding: 0 16px; }
          .main { padding: 0 16px; }
          .subheader-chips { display: none; }
          .bubble { max-width: 78%; }
        }

        @media (max-width: 480px) {
          .brand-name { display: none; }
          .nav-badge { display: none; }
          .bubble { max-width: 88%; font-size: 0.875rem; }
        }
      `}</style>

      <div className="page-wrap">

        {/* ── Top nav ── */}
        <nav className="topnav">
          <div className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <span className="brand-name">At<span>las</span></span>
          </div>

          <div className="nav-divider" />

          <div className="nav-badge">
            <span className="live-dot" />
            Session Active
          </div>

          <div className="nav-spacer" />

          <div className="nav-user">
            <div className="nav-user-avatar">{USERNAME.charAt(0)}</div>
            <span className="nav-user-name">{USERNAME}</span>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="main">

          {/* Chat subheader */}
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

          {/* Messages */}
          <div className="messages-area">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            {error && (
              <p className="error-msg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </p>
            )}
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
              <span className="powered-by">Powered by <span>Gemini</span></span>
            </div>
          </div>
        </main>

      </div>
    </>
  );
}