import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import {
  Plus, ArrowUp, Copy, Check, Square, Trash2,
  MessageSquare,
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

export const PromptonContent = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PromptonMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    promptonApi.list().then(setConversations).catch(() => {});
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
    <div className="w-full relative">
      <div className="bg-[#101014] border border-white/[0.08] rounded-[24px] p-1.5 flex items-end gap-2 focus-within:border-white/[0.2] transition-colors shadow-lg">
        <textarea
          ref={taRef}
          value={input}
          onChange={handleInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Message Prompton..."
          className="flex-1 bg-transparent resize-none px-4 py-3 text-[14.5px] text-white placeholder-[#5A5A60] focus:outline-none max-h-52"
        />
        {streaming ? (
          <button
            onClick={stop}
            className="shrink-0 w-10 h-10 mb-0.5 mr-0.5 rounded-full bg-white/[0.1] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors"
            title="Stop"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="shrink-0 w-10 h-10 mb-0.5 mr-0.5 rounded-full bg-[#9758FF] hover:bg-[#854EE6] text-white disabled:opacity-30 disabled:hover:bg-[#9758FF] flex items-center justify-center transition-all shadow-[0_0_15px_rgba(151,88,255,0.4)]"
            title="Send"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#5A5A60] mt-3 text-center">
        Prompton is a personal assistant and may make mistakes.
      </p>
    </div>
  );

  return (
    <div className="flex-1 w-full flex gap-4 h-[calc(100vh-128px)] font-sans">
      {/* Conversation sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col gap-3">
        <button
          onClick={newChat}
          className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13.5px] font-medium transition-colors border border-white/[0.04]"
        >
          New chat
          <Plus size={16} className="opacity-60" />
        </button>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-3">
              <MessageSquare size={18} className="text-[#3A3A40]" />
              <p className="text-[12px] text-[#5A5A60]">No history</p>
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center rounded-xl transition-colors ${
                  c.id === activeId ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'
                }`}
              >
                <button
                  onClick={() => selectConversation(c.id)}
                  className={`flex-1 flex items-center text-left px-3 py-2.5 text-[13px] truncate ${
                    c.id === activeId ? 'text-white font-medium' : 'text-[#A1A1A5]'
                  }`}
                >
                  <span className="truncate">{c.title || 'New conversation'}</span>
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="pr-3 pl-1 text-[#5A5A60] hover:text-[#F87171] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0C] border border-white/[0.04] rounded-[32px] p-6 relative overflow-hidden">
        {/* Subtle top header gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9758FF] to-[#6A39C4] flex items-center justify-center shadow-[0_4px_14px_rgba(151,88,255,0.35)]">
            <span className="text-white font-bold text-[13px]">P</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-semibold text-white tracking-tight">Prompton</h1>
          </div>
          <button onClick={newChat} className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] text-white">
            <Plus size={16} />
          </button>
        </div>

        {showWelcome ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[680px] mx-auto px-4 gap-10 relative z-10">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9758FF] to-[#6A39C4] flex items-center justify-center shadow-[0_10px_30px_rgba(151,88,255,0.4)]">
                <span className="text-white font-medium text-[28px] tracking-tighter">P</span>
              </div>
              <div>
                <h2 className="text-[26px] font-medium text-white mb-2 tracking-tight">
                  Welcome, {user?.display_name || (user?.email ? user.email.split('@')[0] : 'User')}
                </h2>
                <p className="text-[#A1A1A5] text-[15px] max-w-[400px]">
                  How can I assist with your creative project today?
                </p>
              </div>
            </div>

            {composerEl}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2 w-full max-w-[760px] mx-auto relative z-10">
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
                        <span className="inline-block w-1.5 h-4 align-middle bg-white/40 ml-1 animate-pulse" />
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

            {error && <div className="mt-4 w-full max-w-[760px] mx-auto text-[13px] text-[#F87171] relative z-10">{error}</div>}

            <div className="mt-4 w-full max-w-[760px] mx-auto relative z-10">
              {composerEl}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
