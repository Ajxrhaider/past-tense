"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Terminal, User, Cpu, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import TextareaAutosize from "react-textarea-autosize";
import { personas, generateSystemPrompt, Persona } from "@/lib/personas";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [activePersona, setActivePersona] = useState<Persona>(personas[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReceivingStream, setIsReceivingStream] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to load isolated chat histories per persona
  const loadSessionForPersona = (personaId: string) => {
    let storedSession = localStorage.getItem(`past_tense_session_${personaId}`);
    if (!storedSession) {
      storedSession = crypto.randomUUID();
      localStorage.setItem(`past_tense_session_${personaId}`, storedSession);
    }
    setSessionId(storedSession);

    fetch(`/api/history?sessionId=${storedSession}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
        } else {
          setMessages([]); // Clear chat UI if this persona has no history
        }
      })
      .catch((err) => {
        console.error("Could not load chat history:", err);
        setMessages([]);
      });
  };

  useEffect(() => {
    const storedPersonaId = localStorage.getItem("past_tense_persona_id");
    const foundPersona = personas.find((p) => p.id === storedPersonaId) || personas[0];
    setActivePersona(foundPersona);
    loadSessionForPersona(foundPersona.id);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isReceivingStream]);

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = personas.find((p) => p.id === e.target.value) || personas[0];
    setActivePersona(selected);
    localStorage.setItem("past_tense_persona_id", selected.id);
    loadSessionForPersona(selected.id); // Load the specific timeline for the newly selected persona
  };

  const clearChatHistory = async () => {
    if (!confirm(`Clear temporal communication history with ${activePersona.name}?`)) return;
    if (sessionId) {
      await fetch(`/api/history?sessionId=${sessionId}`, { method: "DELETE" });
    }
    setMessages([]);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    const newMessages: Message[] = [...messages, { role: "user", content: userMessageContent }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setIsReceivingStream(false);

    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: generateSystemPrompt(activePersona, currentYear),
          sessionId,
          personaId: activePersona.id,
        }),
      });

      if (!response.ok) throw new Error("Network response was not ok");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          setIsReceivingStream(true);
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = { 
              ...updated[lastIndex], 
              content: updated[lastIndex].content + chunk 
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Temporal synchronization failed:", error);
    } finally {
      setIsLoading(false);
      setIsReceivingStream(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const categories = Array.from(new Set(personas.map((p) => p.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a2e', color: '#e0e0e0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <header style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#2a2a3e', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            <img 
              src="/icon.png" 
              alt="Hizaki Labs Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Past-Tense
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: '#6366f1', textTransform: 'uppercase' }}>
              By Hizaki Labs
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#1a1a2e', border: '1px solid #444', borderRadius: '8px' }}>
            <Terminal size={16} color="#6366f1" />
            <select 
              style={{ backgroundColor: 'transparent', color: '#e0e0e0', fontSize: '0.875rem', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', maxWidth: '240px' }}
              value={activePersona.id}
              onChange={handlePersonaChange}
            >
              {categories.map((cat) => (
                <optgroup key={cat} label={cat} style={{ backgroundColor: '#2a2a3e', color: '#6366f1', fontWeight: 'bold' }}>
                  {personas
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <option key={p.id} value={p.id} style={{ backgroundColor: '#2a2a3e', color: '#e0e0e0', fontWeight: 'normal' }}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            onClick={clearChatHistory}
            title="Clear Chat History"
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #444', color: '#9ca3af', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', opacity: 0.8, gap: '16px' }}>
            <Cpu size={64} color="#6366f1" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Temporal Link Active</h2>
            <p style={{ margin: 0, maxWidth: '480px', color: '#9ca3af', lineHeight: 1.5 }}>
              Connected to <span style={{ fontWeight: 600, color: '#6366f1' }}>{activePersona.name}</span> ({activePersona.era}). They will speak from their own worldview, controversies, and language.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === "user" ? 'flex-end' : 'flex-start', width: '100%' }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                maxWidth: '85%',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: msg.role === "user" ? "#6366f1" : "#2a2a3e",
                color: msg.role === "user" ? "#ffffff" : "#e0e0e0",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "16px",
                border: msg.role === "assistant" ? "1px solid #444" : "none",
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {msg.role === "assistant" && (
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} color="#6366f1" />
                    </div>
                  </div>
                )}
                <div style={{ lineHeight: 1.6, fontSize: '0.95rem', width: '100%' }}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && !isReceivingStream && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '16px', backgroundColor: '#2a2a3e', border: '1px solid #444', color: '#9ca3af', fontSize: '0.875rem' }}>
              <Loader2 size={16} className="animate-spin" color="#6366f1" />
              <span>Synchronizing timeline across centuries...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer style={{ flexShrink: 0, padding: '16px 24px', backgroundColor: '#2a2a3e', borderTop: '1px solid #444' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', alignItems: 'flex-end' }}>
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            minRows={1}
            maxRows={6}
            placeholder={`Message ${activePersona.name}... (Press Enter to send, Shift+Enter for newline)`}
            style={{
              width: '100%',
              backgroundColor: '#1a1a2e',
              border: '1px solid #444',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 50px 14px 16px',
              fontSize: '1rem',
              outline: 'none',
              resize: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              lineHeight: 1.5
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '8px',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !input.trim()) ? 0.5 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
      
    </div>
  );
}