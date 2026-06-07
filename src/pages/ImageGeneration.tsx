import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImagePlus, Sparkles, Download, RefreshCw, AlertCircle, Plus, Check, ChevronLeft, Loader2, Palette, X, ChevronDown, Sliders, Smile, Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  generationApi, pollJob,
  type GenerationJob, type StylePreset,
} from '../lib/api/generation';
import { referenceApi, type TrainedReference } from '../lib/api/studio';
import { StylePickerModal } from '../components/StylePickerModal';
import { useToast } from '../components/Toast';

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
  const navigate = useNavigate();
  const toast = useToast();
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [detailJob, setDetailJob] = useState<GenerationJob | null>(null);
  const [references, setReferences] = useState<TrainedReference[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [refPickerOpen, setRefPickerOpen] = useState(false);
  const [style, setStyle] = useState<StylePreset | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);

  // Advanced configurations
  const [numOutputs, setNumOutputs] = useState<number>(1);
  const [seed, setSeed] = useState<string>('');
  const [referenceStrength, setReferenceStrength] = useState<number>(1.0);
  const [styleStrength, setStyleStrength] = useState<number>(1.0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const loadHistory = () => generationApi.list().then(setHistory).catch(() => { });
  const loadReferences = () => referenceApi.list().then(setReferences).catch(() => { });
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

  const run = async (text: string, customSeed?: number) => {
    const content = text.trim();
    if (!content || running) return;
    setRunning(true);

    let finalSeed: number | null = null;
    if (customSeed !== undefined) {
      finalSeed = customSeed;
    } else if (seed.trim()) {
      const parsed = parseInt(seed.trim(), 10);
      if (!isNaN(parsed)) {
        finalSeed = parsed;
      }
    }

    try {
      const created = await generationApi.createImage({
        prompt: content,
        aspect,
        seed: finalSeed,
        reference: selectedRef,
        reference_strength: selectedRef ? referenceStrength : undefined,
        style: style?.id ?? null,
        style_strength: style ? styleStrength : undefined,
        num_outputs: numOutputs,
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

  // Generation feedback states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const PROMPT_TIPS = [
    "Include descriptive keywords like 'cinematic lighting', 'volumetric fog', or 'soft focus' to elevate depth.",
    "Experiment with camera framing: specify 'wide shot', 'macro close-up', or 'low angle perspective'.",
    "Trained custom references work best when your prompt refers to them naturally as subjects.",
    "Style strength sliders control how heavily the AI applies the preset's aesthetic values.",
    "Shorter, descriptive prompts often lead to cleaner compositions and better coherence."
  ];

  useEffect(() => {
    let interval: any;
    if (isWorking) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

  useEffect(() => {
    let interval: any;
    if (isWorking) {
      setTipIndex(0);
      interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % PROMPT_TIPS.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

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
        <div className="mt-2 flex items-center justify-between">
          <button onClick={() => setView('list')} className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors">
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[14.5px] font-semibold">Back to Library</span>
          </button>
        </div>

        {/* Content Container (Two columns on desktop) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* LEFT: Image Card(s) (62%) */}
          <div className="w-full lg:w-[62%] bg-[#131316]/40 border border-white/[0.05] rounded-3xl overflow-hidden p-3 flex flex-col gap-4 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)]">
            <div className="flex flex-col gap-4">
              {detailJob.outputs.map((img) => (
                <div key={img.id} className="relative group rounded-2xl overflow-hidden border border-white/[0.06] bg-[#08080A] flex items-center justify-center mx-auto w-fit">
                  <img src={img.url} alt={detailJob.prompt} className="max-h-[70vh] w-auto max-w-full block" />
                  <button
                    onClick={() => downloadImage(img.url, `vidora-${img.id}.png`)}
                    className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 border border-white/10"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Detail Metadata (38%) */}
          <div className="w-full lg:w-[38%] flex flex-col gap-5 shrink-0 animate-fade-in">

            {/* Prompt Card */}
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-wider">Prompt</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(detailJob.prompt);
                    toast.success("Prompt copied to clipboard!");
                  }}
                  className="text-[12px] text-[#9758FF] hover:underline"
                >
                  Copy Prompt
                </button>
              </div>
              <p className="text-[#EAEAEA] text-[14px] leading-relaxed bg-[#08080A]/60 border border-white/[0.03] rounded-2xl px-4 py-3.5 max-h-[160px] overflow-y-auto">
                {detailJob.prompt || 'No prompt specified'}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-lg">
              <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-wider">Generation Specs</span>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-3.5">
                  <div className="text-[11px] text-[#5A5A60] font-semibold uppercase">Model Type</div>
                  <div className="text-[13.5px] font-semibold text-white mt-1">Soul Image</div>
                </div>
                <div className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-3.5">
                  <div className="text-[11px] text-[#5A5A60] font-semibold uppercase">Cost</div>
                  <div className="text-[13.5px] font-semibold text-white mt-1">{detailJob.credits_cost || '2'} Credits</div>
                </div>
                <div className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-3.5">
                  <div className="text-[11px] text-[#5A5A60] font-semibold uppercase">Seed</div>
                  <div className="text-[13.5px] font-semibold text-white mt-1 truncate">{detailJob.input_params?.seed ?? 'Random'}</div>
                </div>
                <div className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-3.5">
                  <div className="text-[11px] text-[#5A5A60] font-semibold uppercase">Created</div>
                  <div className="text-[13.5px] font-semibold text-white mt-1 truncate">
                    {new Date(detailJob.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions group */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => reusePrompt(detailJob)}
                className="w-full bg-gradient-to-r from-[#6A39C4] to-[#8C4DE8] hover:shadow-[0_8px_25px_rgba(106,57,196,0.3)] text-white py-3.5 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <RefreshCw size={16} /> Make a variation
              </button>
            </div>

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

          {/* Reference Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-[#7A7A80]">
              Reference <span className="text-[#5A5A60]">(optional · puts a trained subject/look into the image)</span>
            </span>
            <div className="flex items-center gap-3">
              {selectedRef ? (() => {
                const refItem = references.find((r) => r.id === selectedRef);
                return (
                  <div className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-xl border border-[#9758FF]/40 bg-[#9758FF]/10 text-white shadow-[0_0_14px_rgba(151,88,255,0.15)] w-fit">
                    {refItem?.thumbnail_url ? (
                      <img src={refItem.thumbnail_url} alt={refItem.name} className="h-8 w-8 rounded-lg object-cover border border-[#9758FF]/20" />
                    ) : (
                      <span className="h-8 w-8 rounded-lg bg-[#9758FF]/20 flex items-center justify-center"><Smile size={16} className="text-[#9758FF]" /></span>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold leading-tight">{refItem?.name || 'Selected'}</span>
                      <span className="text-[10px] text-[#A1A1A5] font-medium leading-none mt-0.5">Trained Subject</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRefPickerOpen(true)}
                      className="ml-3 text-[11px] text-[#C9A8FF] hover:text-white underline font-semibold transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRef(null)}
                      className="ml-1 text-[#7A7A80] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                      title="Remove reference"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })() : (
                <button
                  type="button"
                  onClick={() => setRefPickerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#24242B] bg-[#08080A]/40 text-[#A1A1A5] hover:text-white hover:border-[#3A3A40] transition-all text-[13px] font-semibold"
                >
                  <Smile size={16} className="text-[#9758FF]" />
                  Select Character Reference
                </button>
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

          {/* Advanced Settings Accordion */}
          <div className="border-t border-white/[0.04] pt-4 mt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[13px] font-semibold text-[#A1A1A5] hover:text-white transition-colors"
            >
              <Sliders size={14} className="text-[#9758FF]" />
              <span>Advanced Settings</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180 text-white' : 'text-[#7A7A80]'}`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-5">
                {/* Variations */}
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-[#7A7A80]">
                    Variations <span className="text-[#5A5A60]">(number of images to generate)</span>
                  </span>
                  <div className="flex items-center gap-1.5 bg-[#08080A] border border-[#24242B] p-1 rounded-xl w-fit">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNumOutputs(num)}
                        className={`px-3 py-1.5 rounded-lg text-[12.5px] font-bold transition-all ${numOutputs === num
                            ? 'bg-[#9758FF] text-white shadow-md'
                            : 'text-[#A1A1A5] hover:text-white'
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed */}
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-[#7A7A80]">
                    Seed <span className="text-[#5A5A60]">(optional · leave blank for random)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
                      placeholder="Random seed"
                      className="w-full max-w-[200px] bg-[#08080A]/70 border border-[#24242B] rounded-xl px-4 py-2 text-[13px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60 transition-all"
                    />
                    {seed && (
                      <button
                        type="button"
                        onClick={() => setSeed('')}
                        className="text-[12px] text-[#9758FF] hover:underline animate-fade-in"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Reference Strength (Only if a reference is selected) */}
                {selectedRef && (
                  <div className="flex flex-col gap-2 md:col-span-2 border-t border-white/[0.03] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#7A7A80]">
                        Reference Influence <span className="text-[#5A5A60]">(how close the image stays to your reference subject)</span>
                      </span>
                      <span className="text-[13px] font-bold text-[#9758FF]">{referenceStrength.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-[#5A5A60]">Subtle</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={referenceStrength}
                        onChange={(e) => setReferenceStrength(parseFloat(e.target.value))}
                        className="flex-1 accent-[#9758FF]"
                      />
                      <span className="text-[11px] text-[#5A5A60]">Strong</span>
                    </div>
                  </div>
                )}

                {/* Style Strength (Only if a style is selected) */}
                {style && (
                  <div className="flex flex-col gap-2 md:col-span-2 border-t border-white/[0.03] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#7A7A80]">
                        Style Influence <span className="text-[#5A5A60]">(how heavily the selected style preset is applied)</span>
                      </span>
                      <span className="text-[13px] font-bold text-[#9758FF]">{styleStrength.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-[#5A5A60]">Subtle</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={styleStrength}
                        onChange={(e) => setStyleStrength(parseFloat(e.target.value))}
                        className="flex-1 accent-[#9758FF]"
                      />
                      <span className="text-[11px] text-[#5A5A60]">Strong</span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all flex items-center gap-1.5 ${active ? 'bg-[#9758FF]/15 border-[#9758FF]/80 text-white shadow-[0_0_14px_rgba(151,88,255,0.25)]'
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
          className="relative rounded-2xl p-[1px] bg-gradient-to-br from-white/[0.08] to-transparent max-w-[560px] mx-auto w-full shadow-lg">
          <div className="rounded-2xl bg-[#0F0F12]/80 backdrop-blur-xl border border-white/[0.04] p-6">
            <p className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center">Generation Output</p>
            {isWorking && (
              <div className="py-12 flex flex-col items-center justify-center gap-5 w-full">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-[#9758FF]/15" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#9758FF] animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-[#9758FF]/20 blur-md animate-pulse" />
                  <Sparkles size={18} className="absolute inset-0 m-auto text-[#C9A8FF]" />
                </div>

                <div className="text-center flex flex-col gap-1">
                  <p className="text-white text-[14.5px] font-bold tracking-tight">
                    {job.status === 'queued' && 'Queued in pipeline'}
                    {job.status === 'submitted' && 'Initializing weights'}
                    {job.status === 'processing' && 'Rendering pixels'}
                  </p>
                  <p className="text-[#5A5A60] text-[12px] leading-relaxed max-w-[380px] mx-auto">
                    {job.status === 'queued' && 'Waiting in Celery queue for an idle GPU worker node...'}
                    {job.status === 'submitted' && 'Setting seeds, configuring aspect ratios, and preparing tensor weights...'}
                    {job.status === 'processing' && 'Diffusion scheduler is running denoising steps on the model...'}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2 bg-[#9758FF]/10 border border-[#9758FF]/20 text-[#C9A8FF] text-[11.5px] px-3 py-1 rounded-full w-fit mx-auto font-mono font-semibold">
                    <Clock size={12} className="animate-pulse" /> Elapsed: {elapsedSeconds}s
                  </div>
                </div>

                {/* Tips carousel */}
                <div className="mt-4 border-t border-white/[0.04] pt-5 w-full text-center">
                  <span className="text-[10px] text-[#9758FF] font-black uppercase tracking-[0.15em] block mb-1.5">Prompting Tip</span>
                  <div className="min-h-[42px] flex items-center justify-center">
                    <p className="text-[#7A7A80] text-[12px] italic leading-relaxed px-6 transition-opacity duration-300 max-w-[420px]">
                      "{PROMPT_TIPS[tipIndex]}"
                    </p>
                  </div>
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
              <div className="space-y-5 flex flex-col items-center">
                <div className={`w-full grid gap-4 ${job.outputs.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-[340px]'}`}>
                  {job.outputs.map((img) => (
                    <div key={img.id} className="relative group rounded-xl p-[1px] bg-gradient-to-br from-[#9758FF]/30 via-white/[0.06] to-transparent flex items-center justify-center">
                      <div className="relative rounded-xl overflow-hidden bg-[#08080A] w-full flex items-center justify-center">
                        <img src={img.url} alt={job.prompt} className="max-h-[50vh] w-auto max-w-full block transition-transform duration-500 group-hover:scale-[1.02]" />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button onClick={() => downloadImage(img.url, `vidora-${img.id}.png`)} className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-md border border-white/15 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20" title="Download">
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => run(job.prompt, Math.floor(Math.random() * 1_000_000_000))} disabled={running}
                  className="w-full bg-[#1B1B21] hover:bg-[#24242B] border border-white/[0.05] text-[#C9A8FF] py-3.5 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} /> Make a variation
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {refPickerOpen && (() => {
        const readyRefs = references.filter((r) => r.status === 'ready');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setRefPickerOpen(false)}>
            <div
              className="w-full max-w-[520px] max-h-[80vh] bg-[#131316] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-white font-semibold text-[15px]">Select Character Reference</h3>
                  <p className="text-[#7A7A80] text-[12px]">Choose a trained subject to guide this generation.</p>
                </div>
                <button onClick={() => setRefPickerOpen(false)} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex flex-col gap-4">
                {readyRefs.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {readyRefs.map((r) => {
                      const sel = selectedRef === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedRef(sel ? null : r.id);
                            setRefPickerOpen(false);
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${sel
                              ? 'bg-[#9758FF]/10 border-[#9758FF] text-white ring-2 ring-[#9758FF]/20'
                              : 'bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40] hover:text-white'
                            }`}
                        >
                          {r.thumbnail_url ? (
                            <img src={r.thumbnail_url} alt={r.name} className="h-10 w-10 rounded-lg object-cover border border-white/[0.05]" />
                          ) : (
                            <span className="h-10 w-10 rounded-lg bg-[#9758FF]/20 flex items-center justify-center"><Smile size={18} className="text-[#9758FF]" /></span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-bold truncate leading-tight">{r.name}</p>
                            <p className="text-[10px] text-[#5A5A60] mt-0.5 font-mono">{r.id.substring(0, 8)}</p>
                          </div>
                          {sel && <Check size={16} className="text-[#9758FF] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center flex flex-col items-center gap-2">
                    <Smile size={24} className="text-[#3A3A40]" />
                    <p className="text-[#7A7A80] text-[13.5px]">No trained references ready yet.</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] bg-[#0A0A0C]/40 flex items-center justify-between">
                <span className="text-[11.5px] text-[#5A5A60]">Need to train a new character?</span>
                <button
                  type="button"
                  onClick={() => {
                    setRefPickerOpen(false);
                    navigate('/dashboard/references');
                  }}
                  className="text-[12.5px] font-bold text-[#9758FF] hover:text-[#854EE6] flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Train new reference
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {styleOpen && (
        <StylePickerModal selectedId={style?.id ?? null} onPick={setStyle} onClose={() => setStyleOpen(false)} />
      )}
    </div>
  );
};
