import { useEffect, useRef, useState } from 'react';
import {
  ImagePlus, Sparkles, Download, RefreshCw, AlertCircle, Plus, X, Library, Check, AtSign,
  ChevronLeft,
} from 'lucide-react';
import {
  generationApi, pollJob,
  type GenerationJob,
} from '../lib/api/generation';
import { studioApi, type UploadedAsset } from '../lib/api/studio';
import { ReferenceLibraryModal } from '../components/ReferenceLibraryModal';

const ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const MAX_REFS = 4;

interface RefImage {
  id: string;
  url: string;
  name: string;
}

// Detect an in-progress "@mention" ending at the caret: an "@" at the start of
// the text or after whitespace, followed by name characters. Returns the query
// (text after "@") and the index of the "@" so we can strip it on selection.
const MENTION_RE = /(?:^|\s)@([\w-]*)$/;
function findMention(text: string, caret: number): { query: string; start: number } | null {
  const match = text.slice(0, caret).match(MENTION_RE);
  if (!match) return null;
  const query = match[1];
  return { query, start: caret - query.length - 1 };
}

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued…',
  submitted: 'Submitting…',
  processing: 'Generating…',
};

async function downloadImage(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank');
  }
}

export const ImageGenerationContent = () => {
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [refs, setRefs] = useState<RefImage[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<UploadedAsset[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [detailJob, setDetailJob] = useState<GenerationJob | null>(null);

  const loadHistory = () => generationApi.list().then(setHistory).catch(() => {});
  const reloadLibrary = () => studioApi.listReferences().then(setLibrary).catch(() => {});
  useEffect(() => {
    loadHistory();
    reloadLibrary();
  }, []);
  // Pick up new/renamed references after the library modal closes.
  useEffect(() => {
    if (!libraryOpen) reloadLibrary();
  }, [libraryOpen]);

  const attachReference = (asset: { id: string; url: string; name: string }) =>
    setRefs((prev) =>
      prev.some((r) => r.id === asset.id) || prev.length >= MAX_REFS
        ? prev
        : [...prev, { id: asset.id, url: asset.url, name: asset.name }],
    );

  // Attach if not present (respecting the limit); detach if already attached.
  const toggleReference = (asset: UploadedAsset) =>
    setRefs((prev) => {
      if (prev.some((r) => r.id === asset.id)) return prev.filter((r) => r.id !== asset.id);
      if (prev.length >= MAX_REFS) return prev;
      return [...prev, { id: asset.id, url: asset.url, name: asset.name }];
    });

  const removeReference = (id: string) =>
    setRefs((prev) => prev.filter((r) => r.id !== id));

  const mentionMatches = mention
    ? library
        .filter((a) => a.name.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : [];

  const onPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    setMention(findMention(value, e.target.selectionStart ?? value.length));
    setActiveIdx(0);
  };

  // Selecting a mention: strip the "@query" from the text and attach the image.
  const pickMention = (asset: UploadedAsset) => {
    const ta = textareaRef.current;
    if (!mention || !ta) return;
    const caret = ta.selectionStart ?? prompt.length;
    const before = prompt.slice(0, mention.start);
    const after = prompt.slice(caret);
    setPrompt(before + after);
    setMention(null);
    attachReference(asset);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(before.length, before.length);
    });
  };

  const onPromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention || mentionMatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % mentionMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pickMention(mentionMatches[activeIdx]);
    } else if (e.key === 'Escape') {
      setMention(null);
    }
  };

  const run = async (text: string, seed?: number) => {
    const content = text.trim();
    if (!content || running) return;
    setRunning(true);
    try {
      const created = await generationApi.createImage({
        prompt: content,
        aspect,
        seed,
        references: refs.map((r) => r.id),
      });
      setJob(created);
      await pollJob(created.id, setJob);
    } catch {
      setJob((j) => (j ? { ...j, status: 'failed', error: 'Request failed.' } : j));
    } finally {
      setRunning(false);
      loadHistory();
    }
  };

  const isWorking = job && ['queued', 'submitted', 'processing'].includes(job.status);
  const gallery = history.filter((h) => h.status === 'succeeded' && h.outputs.length > 0);

  const openCreate = () => {
    setJob(null);
    setView('create');
  };
  const openDetail = (h: GenerationJob) => {
    setDetailJob(h);
    setView('detail');
  };
  const reusePrompt = (h: GenerationJob) => {
    setPrompt(h.prompt);
    setJob(null);
    setView('create');
  };

  // ---- LIST VIEW: gallery of generated images + "New Generation" ----------
  if (view === 'list') {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#9758FF]/10 p-2 rounded-lg">
              <ImagePlus size={20} className="text-[#9758FF]" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">Image Generation</h1>
              <p className="text-[#7A7A80] text-[13px]">Your generated images. Start a new one anytime.</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
          >
            <Plus size={18} /> New Generation
          </button>
        </div>

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((h) => (
              <button
                key={h.id}
                onClick={() => openDetail(h)}
                className="group flex flex-col gap-2 text-left"
                title={h.prompt}
              >
                <div className="aspect-square rounded-xl overflow-hidden border border-white/[0.06] group-hover:border-[#9758FF]/40 transition-all bg-[#08080A] relative">
                  <img src={h.outputs[0].url} alt={h.prompt} className="w-full h-full object-cover" />
                  {h.outputs.length > 1 && (
                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-md">
                      +{h.outputs.length - 1}
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-[#A1A1A5] line-clamp-1 px-0.5">{h.prompt}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="bg-[#9758FF]/10 p-4 rounded-2xl">
              <ImagePlus size={28} className="text-[#9758FF]" />
            </div>
            <div>
              <p className="text-white text-[15px] font-semibold">No images yet</p>
              <p className="text-[#7A7A80] text-[13px] mt-1">Create your first image — it’ll show up here.</p>
            </div>
            <button
              onClick={openCreate}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Generation
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- DETAIL VIEW: a single past generation -------------------------------
  if (view === 'detail' && detailJob) {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            onClick={() => setView('list')}
            className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[14px] font-medium">Back to library</span>
          </button>
          <button
            onClick={() => reusePrompt(detailJob)}
            className="flex items-center gap-2 text-[13px] text-[#9758FF] font-semibold hover:gap-3 transition-all"
          >
            <RefreshCw size={15} /> Make a variation
          </button>
        </div>

        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-2xl p-5 space-y-4">
          <p className="text-[#C4C4C8] text-[14px] leading-relaxed">{detailJob.prompt}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detailJob.outputs.map((img) => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/[0.06] bg-[#08080A]">
                <img src={img.url} alt={detailJob.prompt} className="w-full h-auto block" />
                <button
                  onClick={() => downloadImage(img.url, `vidora-${img.id}.png`)}
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  title="Download"
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- CREATE VIEW: the composer -------------------------------------------
  return (
    <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => setView('list')}
          className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[14px] font-medium">Back to library</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-[#9758FF]/10 p-2 rounded-lg">
          <ImagePlus size={20} className="text-[#9758FF]" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">New Image</h1>
          <p className="text-[#7A7A80] text-[13px]">Generate images from a prompt — optionally guided by reference images.</p>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-[#131316]/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={onPromptChange}
            onKeyDown={onPromptKeyDown}
            onBlur={() => setTimeout(() => setMention(null), 120)}
            placeholder="Describe the image you want to create…  (type @ to add a saved reference)"
            className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-xl px-4 py-3.5 text-[14.5px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 transition-all min-h-[88px] resize-none leading-relaxed"
          />

          {/* @-mention autocomplete */}
          {mention && (
            <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-[#16161A] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
              {mentionMatches.length > 0 ? (
                mentionMatches.map((a, i) => {
                  const attached = refs.some((r) => r.id === a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickMention(a); }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        i === activeIdx ? 'bg-[#9758FF]/15' : 'hover:bg-white/5'
                      }`}
                    >
                      <img src={a.url} alt={a.name} className="h-8 w-8 rounded-md object-cover border border-white/10" />
                      <span className="flex-1 text-[13px] text-white truncate">{a.name}</span>
                      {attached && <Check size={14} className="text-[#9758FF]" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2.5 text-[12.5px] text-[#7A7A80] flex items-center justify-between gap-2">
                  <span>No reference named “{mention.query}”.</span>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setMention(null); setLibraryOpen(true); }}
                    className="text-[#9758FF] font-medium whitespace-nowrap"
                  >
                    Upload one
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Reference images */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#7A7A80] flex items-center gap-1.5">
              Reference images <span className="text-[#5A5A60]">(optional · up to {MAX_REFS})</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[#5A5A60]">
                · <AtSign size={11} /> in prompt to add
              </span>
            </span>
            {refs.length > 0 && (
              <span className="text-[11px] text-[#5A5A60]">{refs.length}/{MAX_REFS}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {refs.map((r) => (
              <div key={r.id} className="relative h-16 w-16 rounded-lg overflow-hidden border border-white/[0.08] group">
                <img src={r.url} alt="reference" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeReference(r.id)}
                  className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {refs.length < MAX_REFS && (
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="h-16 w-16 rounded-lg border border-dashed border-[#2E2E36] hover:border-[#9758FF]/50 text-[#7A7A80] hover:text-[#9758FF] flex items-center justify-center transition-all"
                title="Add reference image"
              >
                <Plus size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="flex items-center gap-1.5 text-[12px] text-[#9758FF] hover:gap-2.5 transition-all ml-1"
            >
              <Library size={14} /> Browse library
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[#7A7A80] mr-1">Aspect</span>
          {ASPECTS.map((a) => (
            <button
              key={a}
              onClick={() => setAspect(a)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all ${
                aspect === a
                  ? 'bg-[#9758FF]/15 border-[#9758FF] text-white'
                  : 'bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40]'
              }`}
            >
              {a}
            </button>
          ))}
          <button
            onClick={() => run(prompt)}
            disabled={!prompt.trim() || running}
            className="ml-auto bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
          >
            <Sparkles size={17} /> {running ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Result */}
      {job && (
        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-2xl p-5">
          {isWorking && (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="h-9 w-9 rounded-full border-2 border-white/10 border-t-[#9758FF] animate-spin" />
              <p className="text-[#A1A1A5] text-[14px]">{STATUS_LABEL[job.status] ?? 'Working…'}</p>
              <p className="text-[#5A5A60] text-[12px] max-w-[420px] text-center truncate">{job.prompt}</p>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-[#F87171]" />
              <p className="text-[#F87171] text-[14px] font-medium">Generation failed</p>
              <p className="text-[#7A7A80] text-[12.5px] max-w-[460px]">{job.error || 'Something went wrong.'}</p>
            </div>
          )}

          {job.status === 'succeeded' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {job.outputs.map((img) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/[0.06] bg-[#08080A]">
                    <img src={img.url} alt={job.prompt} className="w-full h-auto block" />
                    <button
                      onClick={() => downloadImage(img.url, `vidora-${img.id}.png`)}
                      className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => run(job.prompt, Math.floor(Math.random() * 1_000_000_000))}
                disabled={running}
                className="flex items-center gap-2 text-[13px] text-[#9758FF] font-semibold hover:gap-3 transition-all disabled:opacity-50"
              >
                <RefreshCw size={15} /> Make a variation
              </button>
            </div>
          )}
        </div>
      )}

      {libraryOpen && (
        <ReferenceLibraryModal
          attachedIds={refs.map((r) => r.id)}
          max={MAX_REFS}
          onToggle={toggleReference}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
};
