"use client";

import { useState, useRef, useEffect } from "react";

const USERNAME = "Admin"; // Default is Admin

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  content: `Hi, ${USERNAME}! How are you today?`,
  timestamp: new Date(),
};

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a7a6a" strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
        </svg>
      </div>
      <div className="typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-end gap-3 mb-6 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a7a6a" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
          </svg>
        </div>
      )}
      <div className={`message-bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
        <p>{message.content}</p>
        <span className="msg-time">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-clay-200 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-clay-700">
            {USERNAME.charAt(0).toUpperCase()}
          </span>
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      let data;
    try {
      data = await response.json();
      } catch {
        throw new Error("Invalid response format");
      }

    if (!data?.content) {
      throw new Error("Invalid response format");
      }
      
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice recognition failed. Please try again.");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sage-50: #f4f7f4;
          --sage-100: #e4ede6;
          --sage-200: #c4d8c9;
          --sage-400: #7aaa87;
          --sage-600: #4d7d5a;
          --sage-700: #3a6147;
          --clay-100: #f5ede8;
          --clay-200: #ecd4c6;
          --clay-400: #c4866a;
          --clay-700: #7a4630;
          --warm-bg: #faf8f5;
          --text-primary: #2c2c2a;
          --text-muted: #7a7870;
          --border: rgba(0,0,0,0.08);
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--warm-bg);
          color: var(--text-primary);
          min-height: 100vh;
          background-image: radial-gradient(ellipse at 20% 0%, #e8f0e9 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 100%, #f5ede8 0%, transparent 50%);
        }

        .chat-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 760px;
          margin: 0 auto;
        }

        /* Header */
        .chat-header {
          padding: 1.5rem 2rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
          background: rgba(250,248,245,0.85);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--sage-200), var(--sage-400));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-text h1 {
          font-family: 'Lora', serif;
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .header-text p {
          font-size: 0.75rem;
          color: var(--sage-600);
          font-weight: 400;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          background: var(--sage-400);
          border-radius: 50%;
          display: inline-block;
          margin-right: 5px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Messages area */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 2rem 1rem;
          scroll-behavior: smooth;
        }

        .messages-area::-webkit-scrollbar { width: 4px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: var(--sage-200); border-radius: 2px; }

        /* Message bubbles */
        .message-bubble {
          max-width: 72%;
          padding: 0.85rem 1.1rem;
          border-radius: 18px;
          position: relative;
        }

        .message-bubble p {
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .ai-bubble {
          background: white;
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 8px rgba(0,0,0,0.04);
        }

        .user-bubble {
          background: var(--sage-600);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .user-bubble p { color: white; }

        .msg-time {
          font-size: 0.68rem;
          display: block;
          margin-top: 4px;
          opacity: 0.5;
        }

        /* Typing indicator */
        .typing-bubble {
          background: white;
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
          padding: 0.85rem 1.1rem;
          border-radius: 18px;
          display: flex;
          gap: 5px;
          align-items: center;
          box-shadow: 0 1px 8px rgba(0,0,0,0.04);
        }

        .dot {
          width: 7px;
          height: 7px;
          background: var(--sage-400);
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.3s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        /* Color helpers for avatar */
        .bg-sage-200 { background-color: var(--sage-200); }
        .bg-clay-200 { background-color: var(--clay-200); }
        .text-clay-700 { color: var(--clay-700); }

        /* Input area */
        .input-area {
          padding: 1rem 2rem 1.5rem;
          background: rgba(250,248,245,0.9);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--border);
        }

        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 8px 8px 8px 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-wrapper:focus-within {
          border-color: var(--sage-400);
          box-shadow: 0 2px 16px rgba(74,125,90,0.12);
        }

        textarea {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          resize: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          color: var(--text-primary);
          line-height: 1.5;
          min-height: 36px;
          max-height: 140px;
          padding: 6px 0;
        }

        textarea::placeholder { color: var(--text-muted); }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .voice-btn {
          background: var(--sage-50);
          color: var(--sage-600);
        }

        .voice-btn:hover { background: var(--sage-100); }

        .voice-btn.active {
          background: var(--clay-400);
          color: white;
          animation: voicePulse 1.2s infinite;
        }

        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196, 134, 106, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(196, 134, 106, 0); }
        }

        .send-btn {
          background: var(--sage-600);
          color: white;
        }

        .send-btn:hover { background: var(--sage-700); transform: scale(1.05); }
        .send-btn:disabled { background: var(--sage-200); cursor: not-allowed; transform: none; }

        .error-msg {
          font-size: 0.8rem;
          color: #c0392b;
          text-align: center;
          padding: 6px;
          margin-bottom: 8px;
        }

        .input-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 8px;
        }

        /* Message entry animation */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .flex { animation: fadeUp 0.3s ease; }
      `}</style>

      <div className="chat-layout">
        {/* Header */}
        <header className="chat-header">
          <div className="avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" fill="white" stroke="none"/>
            </svg>
          </div>
          <div className="header-text">
            <h1>Atlas</h1>
            <p><span className="status-dot" />Your AI Therapist · Always here</p>
          </div>
        </header>

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
          {error && <p className="error-msg">{error}</p>}
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
            <button
              className={`icon-btn voice-btn ${isListening ? "active" : ""}`}
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : "Voice input"}
              type="button"
            >
              {isListening ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <button
              className="icon-btn send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              type="button"
              title="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}