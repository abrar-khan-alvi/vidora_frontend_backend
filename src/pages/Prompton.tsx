import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  Sparkles, Plus, ArrowUp, Copy, Check, Square, Trash2,
  ImagePlus, PlaySquare, Mic, MessageSquare,
} from 'lucide-react';
import {
  promptonApi,
  streamMessage,
  type ConversationSummary,
  type PromptonMessage,
} from '../lib/api/prompton';

const SUGGESTIONS = [
  { icon: ImagePlus, label: 'Image prompt', accent: '#9758FF',
    text: 'Write a cinematic image prompt for a lone astronaut on a neon desert planet at dusk.' },
  { icon: PlaySquare, label: 'Video prompt', accent: '#3B82F6',
    text: 'Turn "cozy cabin in falling snow" into a detailed image-to-video prompt with camera motion.' },
  { icon: Mic, label: 'Voiceover script', accent: '#10B981',
    text: 'Draft a punchy 20-second voiceover script for a premium coffee brand.' },
];

const CodeBlock = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-3 rounded-xl border border-[#9758FF]/25 bg-[#0B0B0E] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06]">
        <span className="text-[11px] uppercase tracking-wider text-[#7A7A80]">Prompt</span>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-[11px] transition-colors ${copied ? 'text-[#34D399]' : 'text-[#9758FF] hover:text-[#B384FF]'}`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-[13.5px] text-[#E6E6EA] whitespace-pre-wrap break-words font-mono leading-relaxed">{text}</pre>
    </div>
  );
};

// Turn ```fenced``` segments into copyable blocks; keep the rest as wrapped text.
const renderContent = (content: string) => {
  const segments = content.split(/```/g);
  return segments.map((segment, i) =>
    i % 2 === 1 ? (
      <CodeBlock key={i} text={segment.replace(/^[a-zA-Z0-9]*\n/, '').replace(/\n$/, '')} />
    ) : (
      <span key={i} className="whitespace-pre-wrap">{segment}</span>
    ),
  );
};

const AssistantAvatar = () => (
  <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#9758FF] to-[#6A39C4] flex items-center justify-center shadow-[0_4px_12px_rgba(151,88,255,0.35)]">
    <Sparkles size={16} className="text-white" />
  </div>
);

const MessageRow = ({ message }: { message: PromptonMessage }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#9758FF] text-white px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] leading-relaxed text-[#E6E6EA]">{renderContent(message.content)}</div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#5A5A60] hover:text-[#A1A1A5] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy reply'}
        </button>
      </div>
    </div>
  );
};

export const PromptonContent = () => {
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

    // Aborted by the user: keep whatever was generated so far as a local reply.
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

  // Single composer reused in both the welcome hero and the active thread.
  const composerEl = (
    <div className="w-full">
      <div className="bg-[#131316] border border-white/[0.08] rounded-2xl p-2 flex items-end gap-2 focus-within:border-[#9758FF]/50 focus-within:shadow-[0_0_0_3px_rgba(151,88,255,0.1)] transition-all">
        <textarea
          ref={taRef}
          value={input}
          onChange={handleInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Describe what you want to create…"
          className="flex-1 bg-transparent resize-none px-3 py-2.5 text-[14.5px] text-white placeholder-[#5A5A60] focus:outline-none max-h-52"
        />
        {streaming ? (
          <button
            onClick={stop}
            className="shrink-0 w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white flex items-center justify-center transition-colors"
            title="Stop"
          >
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#9758FF] to-[#7C3AED] hover:opacity-90 disabled:opacity-40 text-white flex items-center justify-center transition-all"
            title="Send"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#5A5A60] mt-2 text-center">
        Prompton can make mistakes. <span className="text-[#7A7A80]">Enter</span> to send · <span className="text-[#7A7A80]">Shift+Enter</span> for a new line
      </p>
    </div>
  );

  return (
    <div className="flex-1 w-full flex gap-4 h-[calc(100vh-128px)]">
      {/* Conversation sidebar */}
      <aside className="hidden lg:flex w-[208px] shrink-0 flex-col gap-3">
        <button
          onClick={newChat}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#9758FF] to-[#7C3AED] hover:opacity-90 text-white py-2.5 rounded-xl font-semibold text-[14px] transition-all shadow-[0_8px_20px_-6px_rgba(151,88,255,0.55)]"
        >
          <Plus size={18} /> New chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 bg-[#0D0D10]/50 border border-white/[0.05] rounded-2xl p-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-3">
              <MessageSquare size={20} className="text-[#3A3A40]" />
              <p className="text-[12px] text-[#5A5A60]">No conversations yet</p>
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center rounded-lg transition-colors ${
                  c.id === activeId ? 'bg-[#9758FF]/15' : 'hover:bg-white/[0.04]'
                }`}
              >
                <button
                  onClick={() => selectConversation(c.id)}
                  className={`flex-1 flex items-center gap-2 text-left px-3 py-2.5 text-[13px] truncate ${
                    c.id === activeId ? 'text-white' : 'text-[#A1A1A5]'
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0 opacity-60" />
                  <span className="truncate">{c.title || 'New conversation'}</span>
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="px-2 text-[#5A5A60] hover:text-[#F87171] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9758FF] to-[#6A39C4] flex items-center justify-center shadow-[0_4px_14px_rgba(151,88,255,0.35)]">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold text-white tracking-tight leading-tight">Prompton</h1>
            <p className="text-[#7A7A80] text-[12.5px]">Creative director for prompts &amp; scripts</p>
          </div>
          <button onClick={newChat} className="lg:hidden ml-auto flex items-center gap-1.5 text-[13px] text-[#9758FF] font-semibold">
            <Plus size={16} /> New
          </button>
        </div>

        {showWelcome ? (
          // Welcome: hero + composer + suggestions grouped together (no empty void)
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[760px] mx-auto px-2 gap-7">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9758FF] to-[#6A39C4] flex items-center justify-center shadow-[0_10px_30px_rgba(151,88,255,0.4)]">
                <Sparkles size={26} className="text-white" />
              </div>
              <div>
                <h2 className="text-[24px] font-bold text-white mb-1.5">What are we creating today?</h2>
                <p className="text-[#A1A1A5] text-[14.5px] max-w-[460px]">
                  Tell Prompton your idea — it writes production-ready image prompts, video prompts, and voiceover scripts.
                </p>
              </div>
            </div>

            {composerEl}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.text)}
                  className="text-left bg-[#131316] border border-white/[0.06] rounded-2xl p-4 hover:border-[#9758FF]/40 hover:bg-[#16161A] hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${s.accent}1A`, color: s.accent }}>
                    <s.icon size={18} />
                  </div>
                  <div className="text-white font-semibold text-[13.5px] mb-1">{s.label}</div>
                  <div className="text-[#7A7A80] text-[12px] leading-snug line-clamp-2">{s.text}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Active chat: scrolling thread + pinned composer
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-5 pr-1 w-full max-w-[820px] mx-auto">
              {messages.map((m) => (
                <MessageRow key={m.id} message={m} />
              ))}
              {streaming && (
                <div className="flex gap-3">
                  <AssistantAvatar />
                  <div className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-[#E6E6EA]">
                    {streamingText ? (
                      <>
                        {renderContent(streamingText)}
                        <span className="inline-block w-1.5 h-4 align-middle bg-[#9758FF] ml-0.5 animate-pulse" />
                      </>
                    ) : (
                      <span className="inline-flex gap-1 pt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9758FF] animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9758FF] animate-pulse [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9758FF] animate-pulse [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && <div className="mt-2 w-full max-w-[820px] mx-auto text-[13px] text-[#F87171]">{error}</div>}

            <div className="mt-3 w-full max-w-[820px] mx-auto">
              {composerEl}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
