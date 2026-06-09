import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, ArrowUp, Copy, Check, Square, Trash2,
  MessageSquare, History, ArrowLeft, X, Sparkles, Film, Mic, ImagePlus, Smile, ChevronDown, Music
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCreationFlow } from '../lib/creationFlow';
import { uploadAsset, referenceApi, type TrainedReference } from '../lib/api/studio';
import {
  promptonApi,
  streamMessage,
  type ConversationSummary,
  type PromptonMessage,
} from '../lib/api/prompton';

const CodeBlock = ({ text, kind, aspect }: { text: string; kind?: string; aspect?: string }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const flow = useCreationFlow();
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isImage = kind === 'image-prompt';
  const isVideo = kind === 'video-prompt';
  const isScript = kind === 'script';
  const isMusic = kind === 'music';
  const accent = isImage || isVideo || isScript || isMusic;
  const label = isImage ? 'Image Prompt' : isVideo ? 'Video Prompt' : isScript ? 'Voiceover Script' : isMusic ? 'Music Prompt' : 'Output';

  return (
    <div className={`my-3 rounded-xl border bg-[#0A0A0C] overflow-hidden ${accent ? 'border-[#9758FF]/30' : 'border-white/[0.08]'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <span className={`text-[11px] uppercase tracking-wider font-semibold ${accent ? 'text-[#C9A8FF]' : 'text-[#7A7A80]'}`}>{label}</span>
        <div className="flex items-center gap-1">
          {isImage && (
            <button
              onClick={() => flow.startImage({ prompt: text.trim(), aspect })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#9758FF] hover:bg-[#854EE6] px-2.5 py-1 rounded-md transition-colors"
              title="Generate this image now"
            >
              <ImagePlus size={12} /> Create Image
            </button>
          )}
          {isVideo && (
            <button
              onClick={() => flow.startVideo({ prompt: text.trim(), modelType: 'kling' })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#9758FF] hover:bg-[#854EE6] px-2.5 py-1 rounded-md transition-colors"
              title="Generate this video now"
            >
              <Film size={12} /> Create Video
            </button>
          )}
          {isScript && (
            <button
              onClick={() => { flow.setScript(text.trim()); setSaved(true); setTimeout(() => setSaved(false), 1800); }}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#9758FF] hover:bg-[#854EE6] px-2.5 py-1 rounded-md transition-colors"
              title="Use this as the AI voiceover in the editor"
            >
              {saved ? <Check size={12} /> : <Mic size={12} />} {saved ? 'Saved for editor' : 'Use as voiceover'}
            </button>
          )}
          {isMusic && (
            <button
              onClick={() => { flow.setMusicPrompt(text.trim()); setSaved(true); setTimeout(() => setSaved(false), 1800); }}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#9758FF] hover:bg-[#854EE6] px-2.5 py-1 rounded-md transition-colors"
              title="Use this as the background music in the editor"
            >
              {saved ? <Check size={12} /> : <Music size={12} />} {saved ? 'Saved for editor' : 'Use as music'}
            </button>
          )}
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-colors ${copied ? 'text-white' : 'text-[#7A7A80] hover:text-white'}`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
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
      // Capture the fence info line (e.g. `image-prompt 16:9`) so the code block
      // can show a matching "Create" button and carry the target aspect ratio,
      // then strip the fences.
      const infoMatch = chunk.match(/^```([a-zA-Z0-9-]*)([^\n]*)\n?/);
      const lang = (infoMatch?.[1] || '').toLowerCase();
      const aspectMatch = (infoMatch?.[2] || '').match(/\b(\d{1,2}:\d{1,2})\b/);
      const aspect = aspectMatch?.[1];
      const body = chunk.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
      output.push(<CodeBlock key={`cb-${ci}`} text={body} kind={lang} aspect={aspect} />);
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
        <div className="max-w-[80%] flex flex-col items-end gap-2">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((a) => (
                <img key={a.id} src={a.url} alt="attachment" className="w-24 h-24 rounded-xl object-cover border border-white/[0.08]" />
              ))}
            </div>
          )}
          {message.content && (
            <div className="rounded-[20px] rounded-br-sm bg-[#1E1E22] border border-white/[0.06] text-white px-5 py-3.5 text-[14.5px] leading-relaxed whitespace-pre-wrap shadow-sm">
              {message.content}
            </div>
          )}
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
  useAuth();
  const flow = useCreationFlow();
  const [references, setReferences] = useState<TrainedReference[]>([]);
  const [charMenuOpen, setCharMenuOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PromptonMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const room = 4 - attachments.length;
    const toUpload = files.slice(0, Math.max(0, room));
    if (!toUpload.length) return;
    setUploading(true);
    setError('');
    for (const f of toUpload) {
      try {
        const a = await uploadAsset(f);
        setAttachments((prev) => [...prev, { id: a.id, url: a.url, name: a.name || f.name }]);
      } catch {
        setError('Could not upload an image.');
      }
    }
    setUploading(false);
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  useEffect(() => {
    promptonApi.list().then(setConversations).catch(() => { });
    referenceApi.list().then((r) => setReferences(r.filter((x) => x.status === 'ready'))).catch(() => { });
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
    if ((!content && attachments.length === 0) || streaming || uploading) return;

    const att = attachments;
    const attIds = att.map((a) => a.id);

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
      {
        id: `tmp-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
        attachments: att.map((a) => ({ id: a.id, url: a.url })),
      },
    ]);
    resetComposer();
    setAttachments([]);
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
    }, attIds);

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
      <div className="bg-[#101014]/90 backdrop-blur-md border border-white/[0.08] rounded-[24px] p-2 focus-within:border-[#9758FF]/50 focus-within:shadow-[0_0_20px_rgba(151,88,255,0.15)] transition-all shadow-lg">
        {/* Character to feature — kept and carried into image generation */}
        <div className="relative flex items-center gap-2 px-2 pt-1.5 pb-1">
          <span className="text-[11px] text-[#7A7A80] font-medium">Character:</span>
          {flow.character ? (
            <span className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg bg-[#9758FF]/12 border border-[#9758FF]/40 text-[12px] text-white">
              <Smile size={12} className="text-[#9758FF]" />
              {flow.character.name}
              <button onClick={() => flow.setCharacter(null)} className="text-[#C9A8FF] hover:text-white p-0.5 rounded hover:bg-white/10" title="Clear character">
                <X size={11} />
              </button>
            </span>
          ) : (
            <button
              onClick={() => setCharMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#24242B] bg-[#08080A]/40 text-[#A1A1A5] hover:text-white hover:border-[#3A3A40] text-[12px] transition-all"
            >
              <Smile size={13} className="text-[#9758FF]" /> Use a character <ChevronDown size={12} />
            </button>
          )}
          {charMenuOpen && !flow.character && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setCharMenuOpen(false)} />
              <div className="absolute left-0 bottom-full mb-2 z-40 w-64 max-h-64 overflow-y-auto bg-[#161619] border border-[#24242B] rounded-xl shadow-xl py-1.5">
                {references.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-[#7A7A80]">No trained characters yet. Train one under “Create Your Identity.”</p>
                ) : (
                  references.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { flow.setCharacter({ id: r.id, name: r.name }); setCharMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.04] text-[#EAEAEA] text-[13px]"
                    >
                      {r.thumbnail_url ? (
                        <img src={r.thumbnail_url} alt={r.name} className="h-7 w-7 rounded-md object-cover border border-white/[0.06]" />
                      ) : (
                        <span className="h-7 w-7 rounded-md bg-[#9758FF]/20 flex items-center justify-center"><Smile size={13} className="text-[#9758FF]" /></span>
                      )}
                      <span className="truncate">{r.name}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Attached images (e.g. a product) the assistant will see */}
        {(attachments.length > 0 || uploading) && (
          <div className="flex flex-wrap items-center gap-2 px-2 pt-1.5 pb-2">
            {attachments.map((a) => (
              <div key={a.id} className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/[0.1]">
                <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black text-white rounded-md p-0.5"
                  title="Remove"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {uploading && (
              <div className="w-14 h-14 rounded-xl border border-dashed border-[#9758FF]/40 flex items-center justify-center">
                <span className="w-4 h-4 rounded-full border-2 border-[#9758FF]/30 border-t-[#9758FF] animate-spin" />
              </div>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= 4 || streaming}
            className="shrink-0 w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#A1A1A5] hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
            title="Attach a product image"
          >
            <ImagePlus size={18} />
          </button>
          <textarea
            ref={taRef}
            value={input}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Type your idea, or attach a product image…"
            className="flex-1 bg-transparent resize-none px-2 py-3.5 text-[14.5px] text-white placeholder-[#5A5A60] focus:outline-none max-h-52 leading-relaxed"
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
              disabled={(!input.trim() && attachments.length === 0) || uploading}
              className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-r from-[#9758FF] to-[#854EE6] hover:shadow-[0_8px_20px_rgba(151,88,255,0.4)] text-white disabled:opacity-20 disabled:hover:shadow-none flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Send Message"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-[#5A5A60] mt-3.5 text-center font-medium">
        Your Assistant is here to support your creative process and can make mistakes.
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
                  Your Assistant
                </h2>
                <p className="text-[#8A8A90] text-[13.5px] mt-2 max-w-[460px] leading-relaxed">
                  Your Personal Creator Assistant is here to guide your 6-Step Creator Flow. Draft scripts, refine visual prompts, outline scenes, or polish copy to make it go viral.
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
