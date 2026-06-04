import { useEffect, useState } from 'react';
import {
  ImagePlus, Sparkles, Download, RefreshCw, AlertCircle, Plus, Check, ChevronLeft, Loader2, Palette, X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  generationApi, pollJob,
  type GenerationJob, type StylePreset,
} from '../lib/api/generation';
import { referenceApi, type TrainedReference } from '../lib/api/studio';
import { CreateReferenceModal } from '../components/CreateReferenceModal';
import { StylePickerModal } from '../components/StylePickerModal';

const ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

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
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [detailJob, setDetailJob] = useState<GenerationJob | null>(null);
  const [references, setReferences] = useState<TrainedReference[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [style, setStyle] = useState<StylePreset | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);

  const loadHistory = () => generationApi.list().then(setHistory).catch(() => {});
  const loadReferences = () => referenceApi.list().then(setReferences).catch(() => {});
  useEffect(() => {
    loadHistory();
    loadReferences();
  }, []);

  // While a reference is training, refresh so it flips to "ready" on its own.
  useEffect(() => {
    if (view !== 'create' || !references.some((r) => r.status === 'pending')) return;
    const t = setInterval(loadReferences, 8000);
    return () => clearInterval(t);
  }, [view, references]);

  const run = async (text: string, seed?: number) => {
    const content = text.trim();
    if (!content || running) return;
    setRunning(true);
    try {
      const created = await generationApi.createImage({ prompt: content, aspect, seed, reference: selectedRef, style: style?.id ?? null });
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
    loadReferences();
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

  // ---- LIST VIEW ----------------------------------------------------------
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
              <button key={h.id} onClick={() => openDetail(h)} className="group flex flex-col gap-2 text-left" title={h.prompt}>
                <div className="aspect-square rounded-xl overflow-hidden border border-white/[0.06] group-hover:border-[#9758FF]/40 transition-all bg-[#08080A] relative">
                  <img src={h.outputs[0].url} alt={h.prompt} className="w-full h-full object-cover" />
                  {h.outputs.length > 1 && (
                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-md">+{h.outputs.length - 1}</span>
                  )}
                </div>
                <span className="text-[12px] text-[#A1A1A5] line-clamp-1 px-0.5">{h.prompt}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="bg-[#9758FF]/10 p-4 rounded-2xl"><ImagePlus size={28} className="text-[#9758FF]" /></div>
            <div>
              <p className="text-white text-[15px] font-semibold">No images yet</p>
              <p className="text-[#7A7A80] text-[13px] mt-1">Create your first image — it’ll show up here.</p>
            </div>
            <button onClick={openCreate} className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2">
              <Plus size={18} /> New Generation
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- DETAIL VIEW --------------------------------------------------------
  if (view === 'detail' && detailJob) {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <button onClick={() => setView('list')} className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors">
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[14px] font-medium">Back to library</span>
          </button>
          <button onClick={() => reusePrompt(detailJob)} className="flex items-center gap-2 text-[13px] text-[#9758FF] font-semibold hover:gap-3 transition-all">
            <RefreshCw size={15} /> Make a variation
          </button>
        </div>
        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-2xl p-5 space-y-4">
          <p className="text-[#C4C4C8] text-[14px] leading-relaxed">{detailJob.prompt}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detailJob.outputs.map((img) => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/[0.06] bg-[#08080A]">
                <img src={img.url} alt={detailJob.prompt} className="w-full h-auto block" />
                <button onClick={() => downloadImage(img.url, `vidora-${img.id}.png`)} className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80" title="Download">
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- CREATE VIEW --------------------------------------------------------
  return (
    <div className="relative flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
      <motion.div aria-hidden className="pointer-events-none absolute -top-28 left-1/4 w-[520px] h-[300px] bg-[#9758FF]/15 blur-[130px] rounded-full -z-10"
        animate={{ x: [0, 50, 0], y: [0, 24, 0], opacity: [0.5, 0.85, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div aria-hidden className="pointer-events-none absolute -top-16 right-1/5 w-[420px] h-[260px] bg-[#C24DFF]/12 blur-[120px] rounded-full -z-10"
        animate={{ x: [0, -50, 0], y: [0, 32, 0], opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="mt-2 flex items-center gap-3">
        <button onClick={() => setView('list')} className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[14px] font-medium">Back to library</span>
        </button>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="absolute inset-0 bg-[#9758FF] blur-lg opacity-40 rounded-xl" />
          <div className="relative bg-gradient-to-br from-[#A06BFF] to-[#6D28D9] p-2.5 rounded-xl shadow-lg shadow-[#9758FF]/30">
            <ImagePlus size={20} className="text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight bg-gradient-to-r from-white via-white to-[#C9B8FF] bg-clip-text text-transparent">New Image</h1>
          <p className="text-[#8A8A90] text-[13px]">Turn a prompt into a stunning image — optionally guided by a trained reference.</p>
        </div>
      </div>

      {/* Composer */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative rounded-2xl p-[1px] bg-gradient-to-br from-[#9758FF]/35 via-white/[0.07] to-transparent shadow-[0_24px_70px_-28px_rgba(151,88,255,0.5)]">
      <div className="rounded-2xl bg-[#0F0F12]/92 backdrop-blur-xl border border-white/[0.04] p-5 flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to create…"
          className="w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl px-5 py-4 text-[15px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60 focus:shadow-[0_0_0_3px_rgba(151,88,255,0.12)] transition-all min-h-[150px] resize-y leading-relaxed"
        />

        {/* Reference (trained SoulId) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#7A7A80]">
              Reference <span className="text-[#5A5A60]">(optional · puts a trained subject/look into the image)</span>
            </span>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 text-[12px] text-[#9758FF] font-medium hover:gap-2.5 transition-all">
              <Plus size={14} /> New reference
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedRef(null)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all ${
                selectedRef === null ? 'bg-[#9758FF]/15 border-[#9758FF]/80 text-white' : 'bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40]'
              }`}
            >
              None
            </button>
            {references.map((r) => {
              const ready = r.status === 'ready';
              const sel = selectedRef === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => ready && setSelectedRef(sel ? null : r.id)}
                  disabled={!ready}
                  title={r.status === 'failed' ? r.error || 'Training failed' : r.name}
                  className={`px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all flex items-center gap-2 ${
                    sel ? 'bg-[#9758FF]/15 border-[#9758FF]/80 text-white shadow-[0_0_14px_rgba(151,88,255,0.25)]'
                       : 'bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40]'
                  } ${!ready ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {r.thumbnail_url
                    ? <img src={r.thumbnail_url} alt={r.name} className="h-5 w-5 rounded object-cover" />
                    : <span className="h-5 w-5 rounded bg-[#9758FF]/20 flex items-center justify-center"><ImagePlus size={11} className="text-[#9758FF]" /></span>}
                  <span className="truncate max-w-[120px]">{r.name}</span>
                  {r.status === 'pending' && <span className="flex items-center gap-1 text-[#7A7A80] text-[11px]"><Loader2 size={11} className="animate-spin" /> Training…</span>}
                  {r.status === 'failed' && <span className="text-[#F87171] text-[11px]">failed</span>}
                  {sel && <Check size={13} className="text-[#9758FF]" />}
                </button>
              );
            })}
            {references.length === 0 && (
              <span className="text-[12px] text-[#5A5A60]">No references yet — create one to put yourself or a subject into images.</span>
            )}
          </div>
        </div>

        {/* Style preset (built-in look) */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-[#7A7A80]">
            Style <span className="text-[#5A5A60]">(optional · a built-in look — combines with a reference)</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {style ? (
              <span className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-lg text-[12.5px] font-medium border bg-[#9758FF]/15 border-[#9758FF]/80 text-white shadow-[0_0_14px_rgba(151,88,255,0.25)]">
                <img src={style.preview_url} alt={style.name} className="h-5 w-5 rounded object-cover" />
                <span className="truncate max-w-[140px]">{style.name}</span>
                <button onClick={() => setStyle(null)} className="text-[#C9A8FF] hover:text-white p-0.5 rounded hover:bg-white/10" title="Clear style">
                  <X size={13} />
                </button>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium border bg-[#9758FF]/15 border-[#9758FF]/80 text-white">None</span>
            )}
            <button
              onClick={() => setStyleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40] transition-all"
            >
              <Palette size={14} className="text-[#9758FF]" /> {style ? 'Change style' : 'Browse styles'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[12px] text-[#7A7A80] mr-1">Aspect</span>
          {ASPECTS.map((a) => {
            const [w, h] = a.split(':').map(Number);
            const s = 13 / Math.max(w, h);
            const active = aspect === a;
            return (
              <button
                key={a}
                onClick={() => setAspect(a)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all flex items-center gap-1.5 ${
                  active ? 'bg-[#9758FF]/15 border-[#9758FF]/80 text-white shadow-[0_0_14px_rgba(151,88,255,0.25)]'
                         : 'bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40]'
                }`}
              >
                <span className={`block rounded-[2px] border ${active ? 'border-[#C9A8FF] bg-[#9758FF]/40' : 'border-[#5A5A60]'}`} style={{ width: `${w * s}px`, height: `${h * s}px` }} />
                {a}
              </button>
            );
          })}
          <button
            onClick={() => run(prompt)}
            disabled={!prompt.trim() || running}
            className="ml-auto group relative overflow-hidden bg-gradient-to-r from-[#9758FF] to-[#C24DFF] disabled:opacity-50 disabled:saturate-50 text-white px-7 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_10px_34px_-6px_rgba(151,88,255,0.6)] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            <Sparkles size={17} className={running ? 'animate-pulse' : ''} /> {running ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
      </motion.div>

      {/* Result */}
      {job && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative rounded-2xl p-[1px] bg-gradient-to-br from-white/[0.08] to-transparent">
        <div className="rounded-2xl bg-[#0F0F12]/80 backdrop-blur-xl border border-white/[0.04] p-5">
          {isWorking && (
            <div className="py-16 flex flex-col items-center justify-center gap-5">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-[#9758FF]/15" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#9758FF] animate-spin" />
                <div className="absolute inset-2 rounded-full bg-[#9758FF]/20 blur-md animate-pulse" />
                <Sparkles size={18} className="absolute inset-0 m-auto text-[#C9A8FF]" />
              </div>
              <div className="text-center">
                <p className="text-white text-[14px] font-medium">{STATUS_LABEL[job.status] ?? 'Working…'}</p>
                <p className="text-[#5A5A60] text-[12px] max-w-[420px] mt-1 truncate">{job.prompt}</p>
              </div>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="bg-[#F87171]/10 p-3 rounded-2xl"><AlertCircle size={26} className="text-[#F87171]" /></div>
              <p className="text-[#F87171] text-[14px] font-medium">Generation failed</p>
              <p className="text-[#7A7A80] text-[12.5px] max-w-[460px]">{job.error || 'Something went wrong.'}</p>
            </div>
          )}

          {job.status === 'succeeded' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {job.outputs.map((img) => (
                  <div key={img.id} className="relative group rounded-xl p-[1px] bg-gradient-to-br from-[#9758FF]/30 via-white/[0.06] to-transparent">
                    <div className="relative rounded-xl overflow-hidden bg-[#08080A]">
                      <img src={img.url} alt={job.prompt} className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]" />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button onClick={() => downloadImage(img.url, `vidora-${img.id}.png`)} className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-md border border-white/15 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20" title="Download">
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => run(job.prompt, Math.floor(Math.random() * 1_000_000_000))} disabled={running}
                className="flex items-center gap-2 bg-[#9758FF]/10 hover:bg-[#9758FF]/20 border border-[#9758FF]/30 text-[#C9A8FF] px-4 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50">
                <RefreshCw size={15} /> Make a variation
              </button>
            </div>
          )}
        </div>
        </motion.div>
      )}

      {createOpen && (
        <CreateReferenceModal onClose={() => setCreateOpen(false)} onCreated={loadReferences} />
      )}
      {styleOpen && (
        <StylePickerModal selectedId={style?.id ?? null} onPick={setStyle} onClose={() => setStyleOpen(false)} />
      )}
    </div>
  );
};
