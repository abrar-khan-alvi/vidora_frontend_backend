import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, ArrowUp, Copy, Check, Square, Trash2,
  MessageSquare, History, ArrowLeft, X, Sparkles, Film, Mic
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  promptonApi,
  streamMessage,
  type ConversationSummary,
  type PromptonMessage,
} from '../lib/api/prompton';

const CodeBlock = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-3 rounded-xl border border-white/[0.08] bg-[#0A0A0C] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <span className="text-[11px] uppercase tracking-wider text-[#7A7A80]">Output</span>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-[11px] transition-colors ${copied ? 'text-white' : 'text-[#7A7A80] hover:text-white'}`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-[13.5px] text-[#E6E6EA] whitespace-pre-wrap break-words font-mono leading-relaxed">{text}</pre>
    </div>
  );
};

// ── Inline markdown (bold, italic, inline-code) ──────────────────────────────
const renderInline = (text: string): React.ReactNode[] => {
  // Process bold+italic, bold, italic, inline-code in one pass via regex
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const raw = m[0];
    if (raw.startsWith('`')) {
      parts.push(<code key={m.index} className="px-1.5 py-0.5 rounded-md bg-white/[0.07] font-mono text-[13px] text-[#D4B6FF]">{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith('***')) {
      parts.push(<strong key={m.index} className="font-bold italic">{m[2]}</strong>);
    } else if (raw.startsWith('**')) {
      parts.push(<strong key={m.index} className="font-semibold text-white">{m[3]}</strong>);
    } else {
      parts.push(<em key={m.index} className="italic text-[#C4C4CC]">{m[4] ?? m[5]}</em>);
    }
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

// ── Block-level markdown renderer ────────────────────────────────────────────
const renderContent = (content: string): React.ReactNode[] => {
  const output: React.ReactNode[] = [];
  // Split on fenced code blocks first
  const fenceSplit = content.split(/(```[\s\S]*?```)/g);

  fenceSplit.forEach((chunk, ci) => {
    if (chunk.startsWith('```')) {
      // Strip opening fence + optional language tag + closing fence
      const body = chunk.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/\n?```$/, '');
      output.push(<CodeBlock key={`cb-${ci}`} text={body} />);
      return;
    }

    // Process line-by-line for block elements
    const lines = chunk.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Headings
      const h3 = line.match(/^### (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h1 = line.match(/^# (.+)/);
      if (h1) { output.push(<h1 key={`h1-${ci}-${i}`} className="text-[20px] font-bold text-white mt-5 mb-2 tracking-tight">{renderInline(h1[1])}</h1>); i++; continue; }
      if (h2) { output.push(<h2 key={`h2-${ci}-${i}`} className="text-[17px] font-semibold text-white mt-4 mb-1.5 tracking-tight">{renderInline(h2[1])}</h2>); i++; continue; }
      if (h3) { output.push(<h3 key={`h3-${ci}-${i}`} className="text-[15px] font-semibold text-[#D4B6FF] mt-3 mb-1">{renderInline(h3[1])}</h3>); i++; continue; }

      // Horizontal rule
      if (/^(---+|\*\*\*+|___+)$/.test(line.trim())) {
        output.push(<hr key={`hr-${ci}-${i}`} className="my-4 border-white/[0.08]" />);
        i++; continue;
      }

      // Bullet list — collect consecutive bullet lines
      if (/^[-*+] /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*+] /.test(lines[i])) {
          items.push(lines[i].replace(/^[-*+] /, ''));
          i++;
        }
        output.push(
          <ul key={`ul-${ci}-${i}`} className="my-2 space-y-1.5 pl-5 list-none">
            {items.map((item, ii) => (
              <li key={ii} className="flex gap-2.5 text-[14.5px] leading-relaxed text-[#E6E6EA]">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#9758FF] shrink-0" />
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Numbered list
      if (/^\d+\. /.test(line)) {
        const items: string[] = [];
        let num = 1;
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\. /, ''));
          i++;
          num++;
        }
        output.push(
          <ol key={`ol-${ci}-${i}`} className="my-2 space-y-1.5 pl-1 list-none">
            {items.map((item, ii) => (
              <li key={ii} className="flex gap-3 text-[14.5px] leading-relaxed text-[#E6E6EA]">
                <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-[#9758FF]/20 text-[#9758FF] text-[11px] font-bold flex items-center justify-center">{ii + 1}</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Tables
      if (line.trim().startsWith('|')) {
        const tableLines: string[] = [];
        let tempI = i;
        while (tempI < lines.length && lines[tempI].trim().startsWith('|')) {
          tableLines.push(lines[tempI]);
          tempI++;
        }

        if (tableLines.length >= 2 && /\|[:-\s]+\|/.test(tableLines[1])) {
          const headers = tableLines[0].split('|').map(s => s.trim()).filter((col, idx, arr) => (idx > 0 && idx < arr.length - 1) || col.length > 0);
          const rows = tableLines.slice(2).map(row =>
            row.split('|').map(s => s.trim()).filter((col, idx, arr) => (idx > 0 && idx < arr.length - 1) || col.length > 0)
          );

          output.push(
            <div key={`table-${ci}-${i}`} className="my-4 overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-[14px] text-[#E6E6EA] border-collapse">
                <thead className="bg-white/[0.03] border-b border-white/[0.08]">
                  <tr>
                    {headers.map((h, hi) => (
                      <th key={hi} className="px-4 py-2.5 font-semibold text-white">{renderInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-white/[0.01] transition-colors">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 leading-relaxed">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = tempI;
          continue;
        }
      }

      // Bold standalone label line (e.g. "**IMAGE PROMPT**")
      if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
        const label = line.trim().replace(/\*\*/g, '');
        output.push(<p key={`p-${ci}-${i}`} className="mt-4 mb-1 text-[13px] font-black uppercase tracking-[0.15em] text-[#9758FF]">{label}</p>);
        i++; continue;
      }

      // Empty line → vertical breathing room
      if (line.trim() === '') {
        output.push(<div key={`sp-${ci}-${i}`} className="h-2" />);
        i++; continue;
      }

      // Normal paragraph
      output.push(
        <p key={`p-${ci}-${i}`} className="text-[14.5px] leading-[1.75] text-[#E6E6EA] my-0.5">
          {renderInline(line)}
        </p>
      );
      i++;
    }
  });

  return output;
};

const AssistantAvatar = () => (
  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#9758FF] to-[#6A39C4] flex items-center justify-center shadow-sm">
    <span className="text-white font-bold text-[14px]">P</span>
  </div>
);

const msgVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

const MessageRow = ({ message }: { message: PromptonMessage }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div className="flex justify-end" variants={msgVariants} initial="hidden" animate="visible">
        <div className="max-w-[80%] rounded-[20px] rounded-br-sm bg-[#1E1E22] border border-white/[0.06] text-white px-5 py-3.5 text-[14.5px] leading-relaxed whitespace-pre-wrap shadow-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex gap-4 group" variants={msgVariants} initial="hidden" animate="visible">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-1">
        <div className="text-[14.5px] leading-relaxed text-[#E6E6EA]">{renderContent(message.content)}</div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#5A5A60] hover:text-[#A1A1A5] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </motion.div>
  );
};

const TEMPLATES = [
  {
    icon: <Sparkles className="text-[#9758FF]" size={18} />,
    title: "Cinematic Scene Script",
    prompt: "Write a high-concept sci-fi movie scene description where an explorer discovers a hidden portal in a neon canyon."
  },
  {
    icon: <Film className="text-[#38BDF8]" size={18} />,
    title: "Video Generation Prompt",
    prompt: "Create a detailed prompt for generating a 4K drone shot of a futuristic city with flying vehicles during golden hour."
  },
  {
    icon: <Mic className="text-[#E11D48]" size={18} />,
    title: "Voiceover Script",
    prompt: "Draft a 30-second dramatic commercial voiceover script about a new AI assistant that bends gravity."
  }
];

export const PromptonContent = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PromptonMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    promptonApi.list().then(setConversations).catch(() => { });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  const resetComposer = () => {
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  };

  const selectConversation = async (id: string) => {
    if (streaming) return;
    setActiveId(id);
    setError('');
    setStreamingText('');
    try {
      const detail = await promptonApi.get(id);
      setMessages(detail.messages);
    } catch {
      setMessages([]);
    }
  };

  const newChat = () => {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setStreamingText('');
    setError('');
  };

  const deleteConversation = async (id: string) => {
    try {
      await promptonApi.remove(id);
    } catch {
      /* ignore */
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) newChat();
  };

  const stop = () => abortRef.current?.abort();

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;

    let convId = activeId;
    if (!convId) {
      try {
        const created = await promptonApi.create();
        setConversations((prev) => [created, ...prev]);
        setActiveId(created.id);
        convId = created.id;
      } catch {
        setError('Could not start a conversation.');
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() },
    ]);
    resetComposer();
    setError('');
    setStreaming(true);
    setStreamingText('');

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';

    await streamMessage(convId, content, {
      signal: controller.signal,
      onDelta: (t) => {
        acc += t;
        setStreamingText(acc);
      },
      onDone: async () => {
        setStreaming(false);
        setStreamingText('');
        try {
          const detail = await promptonApi.get(convId!);
          setMessages(detail.messages);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId ? { ...c, title: detail.title, updated_at: detail.updated_at } : c,
            ),
          );
        } catch {
          /* keep optimistic state */
        }
      },
      onError: (m) => {
        setStreaming(false);
        setStreamingText('');
        setError(m);
      },
    });

    if (controller.signal.aborted) {
      setStreaming(false);
      setStreamingText('');
      if (acc) {
        setMessages((prev) => [
          ...prev,
          { id: `tmp-a${Date.now()}`, role: 'assistant', content: acc, created_at: new Date().toISOString() },
        ]);
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const showWelcome = messages.length === 0 && !streamingText && !streaming;

  const composerEl = (
    <div className="w-full relative max-w-[1240px] mx-auto">
      <div className="bg-[#101014]/90 backdrop-blur-md border border-white/[0.08] rounded-[24px] p-2 flex items-end gap-2 focus-within:border-[#9758FF]/50 focus-within:shadow-[0_0_20px_rgba(151,88,255,0.15)] transition-all shadow-lg">
        <textarea
          ref={taRef}
          value={input}
          onChange={handleInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Type your creative ideas here..."
          className="flex-1 bg-transparent resize-none px-4 py-3.5 text-[14.5px] text-white placeholder-[#5A5A60] focus:outline-none max-h-52 leading-relaxed"
        />
        {streaming ? (
          <button
            onClick={stop}
            className="shrink-0 w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Stop generating"
          >
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-r from-[#9758FF] to-[#854EE6] hover:shadow-[0_8px_20px_rgba(151,88,255,0.4)] text-white disabled:opacity-20 disabled:hover:shadow-none flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Send Message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#5A5A60] mt-3.5 text-center font-medium">
        Prompton is a personal creative assistant and can make mistakes.
      </p>
    </div>
  );

  return (
    <div className="flex-1 w-full flex h-[calc(100vh-120px)] font-sans relative overflow-hidden">

      {/* Background gradients */}
      <motion.div aria-hidden className="pointer-events-none absolute -top-40 left-1/4 w-[600px] h-[350px] bg-[#9758FF]/10 blur-[140px] rounded-full -z-10"
        animate={{ x: [0, 60, 0], y: [0, 30, 0], opacity: [0.4, 0.75, 0.4] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div aria-hidden className="pointer-events-none absolute -bottom-40 right-1/4 w-[500px] h-[300px] bg-[#38BDF8]/6 bg-clip-border blur-[130px] rounded-full -z-10"
        animate={{ x: [0, -40, 0], y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />

      {/* Slide-out Drawer for History */}
      <AnimatePresence>
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setHistoryOpen(false)}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-80 max-w-[85vw] h-full bg-[#0F0F12] border-l border-white/[0.08] p-6 flex flex-col gap-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-[15px]">
                  <History size={16} className="text-[#9758FF]" />
                  <span>Chat History</span>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-[#7A7A80] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center px-4">
                    <MessageSquare size={22} className="text-[#3A3A40]" />
                    <p className="text-[12px] text-[#5A5A60]">No history found</p>
                  </div>
                ) : (
                  conversations.map((c) => {
                    const active = c.id === activeId;
                    return (
                      <div
                        key={c.id}
                        className={`group flex items-center rounded-xl transition-all ${active ? 'bg-[#9758FF]/15 border border-[#9758FF]/20' : 'hover:bg-white/[0.03] border border-transparent'
                          }`}
                      >
                        <button
                          onClick={() => {
                            selectConversation(c.id);
                            setHistoryOpen(false);
                          }}
                          className={`flex-1 text-left px-3.5 py-3 text-[13px] truncate ${active ? 'text-white font-bold' : 'text-[#A1A1A5] hover:text-white'
                            }`}
                        >
                          {c.title || 'Untitled Chat'}
                        </button>
                        <button
                          onClick={() => deleteConversation(c.id)}
                          className="pr-3.5 pl-1 text-[#5A5A60] hover:text-[#F87171] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete Chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col bg-[#0A0A0C]/80 border border-white/[0.04] rounded-[32px] p-6 relative overflow-hidden backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.5)]">

        {showWelcome ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1040px] mx-auto px-4 gap-8 relative z-10">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#9758FF] blur-xl opacity-40 rounded-full" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A06BFF] to-[#6D28D9] flex items-center justify-center shadow-lg shadow-[#9758FF]/20">
                  <Sparkles size={28} className="text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-[28px] font-bold text-white tracking-tight leading-tight">
                  Give life to your ideas
                </h2>
                <p className="text-[#8A8A90] text-[13.5px] mt-2 max-w-[460px] leading-relaxed">
                  Prompton is your dedicated co-creator. Draft scripts, design visuals, or map out directions for your studio projects.
                </p>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-3.5">
              <button
                onClick={newChat}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9758FF] hover:bg-[#854EE6] text-white font-semibold text-[13.5px] transition-all hover:scale-102 active:scale-98 shadow-[0_8px_25px_rgba(151,88,255,0.3)] cursor-pointer"
              >
                <Plus size={16} /> New Chat
              </button>
              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white font-semibold text-[13.5px] transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <History size={16} className="text-[#9758FF]" /> Chat History
              </button>
            </div>

            {/* Ideas / Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
              {TEMPLATES.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(t.prompt);
                    if (taRef.current) {
                      taRef.current.focus();
                      taRef.current.style.height = 'auto';
                      setTimeout(() => {
                        if (taRef.current) {
                          taRef.current.style.height = `${taRef.current.scrollHeight}px`;
                        }
                      }, 50);
                    }
                  }}
                  className="flex flex-col gap-2 p-4 text-left rounded-2xl bg-[#131316]/40 hover:bg-[#1E1E22]/60 border border-white/[0.04] hover:border-[#9758FF]/30 transition-all hover:scale-[1.01] group cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-white/[0.03] group-hover:bg-[#9758FF]/10 w-fit transition-colors">
                    {t.icon}
                  </div>
                  <span className="text-white text-[13.5px] font-bold">{t.title}</span>
                  <span className="text-[#7A7A80] text-[11.5px] leading-relaxed line-clamp-2">{t.prompt}</span>
                </button>
              ))}
            </div>

            <div className="w-full mt-6">
              {composerEl}
            </div>
          </div>
        ) : (
          <>
            {/* Premium Chat Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.04] mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={newChat}
                  className="group flex items-center gap-1.5 text-[13px] text-[#7A7A80] hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Exit Chat
                </button>
                <span className="text-[#3A3A40] font-bold">•</span>
                <span className="text-white font-bold text-[14px] truncate max-w-[200px] lg:max-w-[400px]">
                  {activeId ? conversations.find(c => c.id === activeId)?.title || 'Current Chat' : 'New Chat'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-[12.5px] text-[#A1A1A5] hover:text-white transition-all font-semibold cursor-pointer"
                >
                  <History size={14} className="text-[#9758FF]" /> History
                </button>
                <button
                  onClick={newChat}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#9758FF] hover:bg-[#854EE6] text-white text-[12.5px] font-semibold transition-all shadow-[0_4px_15px_rgba(151,88,255,0.25)] cursor-pointer"
                >
                  <Plus size={14} /> New Chat
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2 w-full max-w-[1240px] mx-auto relative z-10 scrollbar-thin scrollbar-thumb-white/5">
              {messages.map((m) => (
                <MessageRow key={m.id} message={m} />
              ))}
              {streaming && (
                <div className="flex gap-4">
                  <AssistantAvatar />
                  <div className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-[#E6E6EA] pt-1">
                    {streamingText ? (
                      <>
                        {renderContent(streamingText)}
                        <span className="inline-block w-1.5 h-4 align-middle bg-[#9758FF] ml-1 animate-pulse" />
                      </>
                    ) : (
                      <span className="inline-flex gap-1 pt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && <div className="mt-4 w-full max-w-[1240px] mx-auto text-[13px] text-[#F87171] relative z-10 font-semibold">{error}</div>}

            <div className="mt-4 w-full relative z-10">
              {composerEl}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
