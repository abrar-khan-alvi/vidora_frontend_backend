import { useEffect, useState } from 'react';
import {
  Video, Sparkles, Download, AlertCircle, X, Plus, ArrowRight, ChevronLeft, ChevronRight, RefreshCw,
  Check, Film, Smartphone, BookOpen, ShoppingBag, Mic, RotateCcw, RotateCw, Globe, ZoomIn, ZoomOut, Zap, Activity, ArrowDown, Send, ArrowLeft, Clock
} from 'lucide-react';
import {
  generationApi, pollJob,
  type GenerationJob,
} from '../lib/api/generation';
import { type UploadedAsset } from '../lib/api/studio';
import { ReferenceLibraryModal } from '../components/ReferenceLibraryModal';
import { useToast } from '../components/Toast';

const QUALITIES: { id: 'lite' | 'standard' | 'turbo'; label: string }[] = [
  { id: 'lite', label: 'Lite' },
  { id: 'standard', label: 'Standard' },
  { id: 'turbo', label: 'Turbo' },
];

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued…',
  submitted: 'Submitting…',
  processing: 'Generating…',
};

interface Frame {
  id: string;
  url: string;
  name: string;
}

async function downloadVideo(url: string, name: string) {
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

/** A single start/end frame slot: thumbnail + change/remove, or an empty picker tile. */
const FrameSlot = ({
  label, hint, frame, onPick, onClear,
}: {
  label: string;
  hint?: string;
  frame: Frame | null;
  onPick: () => void;
  onClear: () => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[12px] text-[#7A7A80]">
      {label} {hint && <span className="text-[#5A5A60]">{hint}</span>}
    </span>
    {frame ? (
      <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-white/[0.08] group">
        <img src={frame.url} alt={frame.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={onPick} className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-md">Change</button>
        </div>
        <button
          onClick={onClear}
          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-md p-0.5"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
    ) : (
      <button
        onClick={onPick}
        className="h-24 w-24 rounded-xl border border-dashed border-[#2E2E36] hover:border-[#9758FF]/50 text-[#7A7A80] hover:text-[#9758FF] flex items-center justify-center transition-all"
        title={label}
      >
        <Plus size={20} />
      </button>
    )}
  </div>
);

export const VideoGenerationContent = () => {
  const toast = useToast();
  const [prompt, setPrompt] = useState('');
  const [modelType, setModelType] = useState<'dop' | 'seedance' | 'kling'>('dop');
  
  // DoP specific parameters
  const [dopModel, setDopModel] = useState<'dop-lite' | 'dop-preview' | 'dop-turbo'>('dop-preview');
  const [motionId, setMotionId] = useState('');
  const [motionStrength, setMotionStrength] = useState(0.8);
  const [dopEnhance, setDopEnhance] = useState(true);
  const [dopNsfw, setDopNsfw] = useState(true);

  // Seedance specific parameters
  const [sdResolution, setSdResolution] = useState<'720p' | '1080p'>('720p');
  const [sdAspectRatio, setSdAspectRatio] = useState('16:9');
  const [sdDuration, setSdDuration] = useState(5);
  const [sdEnhance, setSdEnhance] = useState(false);

  // Kling specific parameters
  const [klModel, setKlModel] = useState('kling-video/v2.6/pro/image-to-video');
  const [klDuration, setKlDuration] = useState(5);
  const [klAspectRatio, setKlAspectRatio] = useState('16:9');
  const [klNegativePrompt, setKlNegativePrompt] = useState('');
  const [klEnhance, setKlEnhance] = useState(true);

  // General parameters
  const [seed, setSeed] = useState<number>(12345);
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Frame assets
  const [start, setStart] = useState<Frame | null>(null);
  const [end, setEnd] = useState<Frame | null>(null);
  
  // Status states
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [detailJob, setDetailJob] = useState<GenerationJob | null>(null);

  const loadHistory = () => generationApi.listVideos().then(setHistory).catch(() => {});
  useEffect(() => {
    loadHistory();
  }, []);

  const run = async () => {
    // For DoP, start frame is required. For others, optional (turns into text-to-video if empty)
    if (modelType === 'dop' && !start) {
      toast.error("Start frame is required for Higgsfield DoP (Director of Photography) model.");
      return;
    }
    if (running) return;
    setRunning(true);
    try {
      // Build dynamic input params based on modelType
      let inputParams: Record<string, any> = {
        model_type: modelType,
        prompt: prompt.trim(),
        seed: useRandomSeed ? Math.floor(Math.random() * 999999) : seed,
      };

      if (modelType === 'dop') {
        inputParams = {
          ...inputParams,
          source: start?.id ?? null,
          end_frame: end?.id ?? null,
          quality: dopModel,
          motion_id: motionId || null,
          motion_strength: motionStrength,
          enhance_prompt: dopEnhance,
          check_nsfw: dopNsfw,
        };
      } else if (modelType === 'seedance') {
        inputParams = {
          ...inputParams,
          source: start?.id ?? null,
          resolution: sdResolution,
          aspect_ratio: sdAspectRatio,
          duration: sdDuration,
          enhance_prompt: sdEnhance,
        };
      } else if (modelType === 'kling') {
        inputParams = {
          ...inputParams,
          model: klModel,
          source: start?.id ?? null,
          end_frame: end?.id ?? null,
          duration: klDuration,
          aspect_ratio: klAspectRatio,
          negative_prompt: klNegativePrompt.trim() || null,
          enhance_prompt: klEnhance,
        };
      }

      const created = await generationApi.createVideo(inputParams);
      setJob(created);
      await pollJob(created.id, setJob);
    } catch {
      setJob((j) => (j ? { ...j, status: 'failed', error: 'Request failed.' } : j));
    } finally {
      setRunning(false);
      loadHistory();
    }
  };

  const onPick = (asset: UploadedAsset) => {
    const frame = { id: asset.id, url: asset.url, name: asset.name };
    if (pickerFor === 'start') setStart(frame);
    else if (pickerFor === 'end') setEnd(frame);
  };

  const isWorking = job && ['queued', 'submitted', 'processing'].includes(job.status);

  // Generation feedback states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const VIDEO_TIPS = [
    "Director of Photography (DoP) mode allows you to guide the camera motion presets directly.",
    "Inputs with start/end frames perform morph transitions between the two keys.",
    "Higher duration video generation takes longer to render, but creates longer cinematic clips.",
    "Prompt dynamic action keywords (e.g. 'speeding', 'exploding', 'jumping') to guide movement.",
    "Auto-Enhance automatically translates simple text prompts into highly-detailed cinematography instructions."
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
        setTipIndex((prev) => (prev + 1) % VIDEO_TIPS.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

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

  // ---- LIST VIEW: gallery of generated videos + "New Generation" ----------
  if (view === 'list') {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#9758FF]/10 p-2 rounded-lg">
              <Video size={20} className="text-[#9758FF]" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">Video Generation</h1>
              <p className="text-[#7A7A80] text-[13px]">Your generated videos. Start a new one anytime.</p>
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
                title={h.prompt || 'Video'}
              >
                <div className="aspect-video rounded-xl overflow-hidden border border-white/[0.06] group-hover:border-[#9758FF]/40 transition-all bg-black relative">
                  <video src={h.outputs[0].url} muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Video size={15} className="text-white" />
                    </div>
                  </div>
                </div>
                <span className="text-[12px] text-[#A1A1A5] line-clamp-1 px-0.5">{h.prompt || 'Untitled'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="bg-[#9758FF]/10 p-4 rounded-2xl">
              <Video size={28} className="text-[#9758FF]" />
            </div>
            <div>
              <p className="text-white text-[15px] font-semibold">No videos yet</p>
              <p className="text-[#7A7A80] text-[13px] mt-1">Animate a reference image — your videos will show up here.</p>
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

  // ---- DETAIL VIEW: a single past video ------------------------------------
  if (view === 'detail' && detailJob && detailJob.outputs[0]) {
    return (
      <div className="flex-1 w-full max-w-[1140px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setView('list')}
            className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[14.5px] font-semibold">Back to Library</span>
          </button>
        </div>

        {/* Content Container (Two columns on desktop) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT: Video Player Card (60%) */}
          <div className="w-full lg:w-[62%] bg-[#131316]/40 border border-white/[0.05] rounded-3xl overflow-hidden p-3 flex flex-col gap-3 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)]">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black shadow-inner flex items-center justify-center mx-auto w-fit">
              <video src={detailJob.outputs[0].url} controls autoPlay loop className="max-h-[70vh] w-auto max-w-full block" />
            </div>
          </div>

          {/* RIGHT: Detail Metadata (40%) */}
          <div className="w-full lg:w-[38%] flex flex-col gap-5 shrink-0">
            
            {/* Prompt Card */}
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-wider">Prompt / Instructions</span>
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
                  <div className="text-[13.5px] font-semibold text-white mt-1 capitalize">{detailJob.input_params?.model_type || 'DoP'}</div>
                </div>
                <div className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-3.5">
                  <div className="text-[11px] text-[#5A5A60] font-semibold uppercase">Cost</div>
                  <div className="text-[13.5px] font-semibold text-white mt-1">{detailJob.credits_cost || '5'} Credits</div>
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
              
              <button
                onClick={() => downloadVideo(detailJob.outputs[0].url, `vidora-${detailJob.outputs[0].id}.mp4`)}
                className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[#C9A8FF] py-3.5 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download video
              </button>
            </div>

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
          <Video size={20} className="text-[#9758FF]" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">New Video</h1>
          <p className="text-[#7A7A80] text-[13px]">Select a model and construct your generation parameters.</p>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-3">
        {[
          { id: 'dop', label: 'DoP (Director of Photography)', desc: 'Advanced camera presets' },
          { id: 'seedance', label: 'Seedance 2.0', desc: 'ByteDance cinematic physics' },
          { id: 'kling', label: 'Kling', desc: 'Photorealistic transitions' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setModelType(m.id as any)}
            className={`flex-1 text-left p-3.5 rounded-xl border transition-all ${
              modelType === m.id
                ? 'bg-[#9758FF]/15 border-[#9758FF] text-white shadow-[0_0_15px_rgba(151,88,255,0.15)]'
                : 'bg-[#0F0F12]/60 border-white/[0.04] text-[#7A7A80] hover:border-white/[0.1] hover:text-white'
            }`}
          >
            <div className="text-[14px] font-semibold">{m.label}</div>
            <div className="text-[11.5px] opacity-80 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="bg-[#131316]/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-6">
        
        {/* Model Meta info */}
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
          <div>
            <span className="text-[12px] uppercase tracking-wider text-[#9758FF] font-semibold">Active Model Config</span>
            <h3 className="text-white text-[15px] font-medium mt-0.5">
              {modelType === 'dop' && 'Higgsfield DoP'}
              {modelType === 'seedance' && 'Seedance 2.0 (by ByteDance)'}
              {modelType === 'kling' && 'Kling Video Model'}
            </h3>
          </div>
          
          {/* Quality selection for DoP */}
          {modelType === 'dop' && (
            <div className="flex items-center gap-1.5 bg-[#08080A]/85 p-1 rounded-lg border border-white/[0.05]">
              {(['dop-lite', 'dop-turbo', 'dop-preview'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDopModel(mode)}
                  className={`px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition-all ${
                    dopModel === mode
                      ? 'bg-[#9758FF] text-white shadow-sm'
                      : 'text-[#7A7A80] hover:text-white'
                  }`}
                >
                  {mode === 'dop-lite' && 'Lite'}
                  {mode === 'dop-turbo' && 'Turbo'}
                  {mode === 'dop-preview' && 'Studio Master'}
                </button>
              ))}
            </div>
          )}

          {/* Kling specific models */}
          {modelType === 'kling' && (
            <div className="select-wrap">
              <select
                value={klModel}
                onChange={(e) => setKlModel(e.target.value)}
                className="bg-[#08080A] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-[#9758FF]"
              >
                <option value="kling-video/v2.1/pro/image-to-video">Kling v2.1 Pro</option>
                <option value="kling-video/v2.5/turbo/image-to-video">Kling v2.5 Turbo</option>
                <option value="kling-video/v2.6/pro/image-to-video">Kling v2.6 Pro</option>
                <option value="kling-video/v3.0/pro/image-to-video">Kling v3.0 Pro</option>
                <option value="kling-video/v3.0/standard/image-to-video">Kling v3.0 Standard</option>
              </select>
            </div>
          )}
        </div>

        {/* Prompt section */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[#7A7A80] font-medium">Prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the motion and scene details..."
            className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 transition-all min-h-[90px] resize-y leading-relaxed"
          />
        </div>

        {/* Dynamic Image Slots */}
        <div className="flex items-center gap-4 flex-wrap">
          <FrameSlot
            label={modelType === 'dop' ? "Start Frame" : "Input Image"}
            hint={modelType === 'dop' ? "(required)" : "(optional — defaults to text-to-video)"}
            frame={start}
            onPick={() => setPickerFor('start')}
            onClear={() => setStart(null)}
          />
          
          {modelType !== 'seedance' && (
            <>
              <ArrowRight size={18} className="text-[#3A3A40] mb-8" />
              <FrameSlot
                label="End Frame"
                hint="(optional — morph transition)"
                frame={end}
                onPick={() => setPickerFor('end')}
                onClear={() => setEnd(null)}
              />
            </>
          )}
        </div>

        {/* DoP Motion Presets Selector Carousel */}
        {modelType === 'dop' && (() => {
          const presets = [
            {
              id: '',
              label: 'None (Auto)',
              desc: 'Let the prompt drive camera movements',
              category: 'Auto Direction',
              badge: 'AI DIRECTED',
              img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M50 15v70M15 50h70" className="animate-pulse" />
                  <circle cx="50" cy="50" r="10" fill="currentColor" className="opacity-30" />
                  <path d="M50 25l-10-10 10-10M85 50l-10 10 10 10" />
                </svg>
              )
            },
            {
              id: 'c5881721-05b1-47d9-94d6-0203863114e1',
              label: 'Arc Left',
              desc: 'Move the camera along a left curve around the subject',
              category: 'Orbits & Arcs',
              badge: 'BEST FOR STORYTELLING',
              img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-20" />
                  <path d="M80 50 A 30 30 0 0 0 20 50" strokeDasharray="4 4" />
                  <path d="M20 50l-5 5 5 5" fill="none" />
                  <path d="M80 44 L80 56 L68 50 Z" fill="currentColor" className="animate-bounce" />
                </svg>
              )
            },
            {
              id: 'a85cb3f2-f2be-4ee2-b3b9-808fc6a81acc',
              label: 'Arc Right',
              desc: 'Move the camera along a right curve around the subject',
              category: 'Orbits & Arcs',
              badge: 'BEST FOR DRAMA',
              img: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-20" />
                  <path d="M20 50 A 30 30 0 0 0 80 50" strokeDasharray="4 4" />
                  <path d="M80 50l5-5-5-5" fill="none" />
                  <path d="M20 44 L20 56 L32 50 Z" fill="currentColor" className="animate-bounce" />
                </svg>
              )
            },
            {
              id: 'ea035f68-b350-40f1-b7f4-7dff999fdd67',
              label: '360 Orbit',
              desc: 'Complete full circular rotation around the subject',
              category: 'Orbits & Arcs',
              badge: 'BEST FOR CHARACTERS',
              img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-20" />
                  <circle cx="50" cy="50" r="30" strokeDasharray="4 4" strokeLinecap="round" />
                  <g className="animate-spin" style={{ transformOrigin: '50px 50px', animationDuration: '6s' }}>
                    <path d="M50 20 L58 20 L54 12 Z" fill="currentColor" />
                  </g>
                </svg>
              )
            },
            {
              id: '2bae49e6-ffe7-42a8-a73f-d44632c4acaa',
              label: '3D Rotation',
              desc: 'Multi-axis spherical orbit for dynamic camera angles',
              category: 'Orbits & Arcs',
              badge: 'BEST FOR PRODUCTS',
              img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="50" cy="50" r="10" fill="currentColor" className="opacity-20" />
                  <ellipse cx="50" cy="50" rx="30" ry="12" strokeDasharray="4 4" strokeLinecap="round" transform="rotate(30 50 50)" />
                  <ellipse cx="50" cy="50" rx="30" ry="12" strokeDasharray="4 4" strokeLinecap="round" transform="rotate(-30 50 50)" />
                  <path d="M72 38l5 5-5 5" fill="none" />
                </svg>
              )
            },
            {
              id: 'dolly-in',
              label: 'Dolly In',
              desc: 'Move the camera physically closer to the subject',
              category: 'Dolly & Zoom',
              badge: 'BEST FOR FOCUS',
              img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 15l25 25M85 15L60 40M15 85l25-25M85 85L60 60" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="10" fill="currentColor" className="opacity-20" />
                  <path d="M50 35l15 15-15 15M50 35v30" fill="none" className="animate-pulse" />
                </svg>
              )
            },
            {
              id: 'dolly-out',
              label: 'Dolly Out',
              desc: 'Pull the camera physically backward from the subject',
              category: 'Dolly & Zoom',
              badge: 'BEST FOR REVEAL',
              img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 15l25 25M85 15L60 40M15 85l25-25M85 85L60 60" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="10" fill="currentColor" className="opacity-20" />
                  <path d="M50 65L35 50l15-15M50 65V35" fill="none" className="animate-pulse" />
                </svg>
              )
            },
            {
              id: 'zoom-in',
              label: 'Zoom In',
              desc: 'Magnify the focal point of the lens',
              category: 'Dolly & Zoom',
              badge: 'BEST FOR DETAILS',
              img: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="25" y="25" width="50" height="50" rx="5" strokeDasharray="4 4" />
                  <path d="M35 35h30v30H35Z" stroke="#9758FF" className="opacity-30" />
                  <path d="M20 20l10 10M80 20L70 30M20 80l10-10M80 80L70-70" />
                </svg>
              )
            },
            {
              id: 'crash-zoom',
              label: 'Crash Zoom',
              desc: 'Sudden, rapid focal magnification for dramatic impact',
              category: 'Dolly & Zoom',
              badge: 'BEST FOR IMPACT',
              img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="50" cy="50" r="10" fill="currentColor" className="opacity-20" />
                  <path d="M25 25l15 15M75 25L60 40M25 75l15-15M75 75L60 60" />
                  <path d="M40 40h20v20H40Z" fill="currentColor" className="animate-ping opacity-25" />
                </svg>
              )
            },
            {
              id: 'dc8d7d9c-ae0c-45fc-b780-7d470b171b45',
              label: 'Action Run',
              desc: 'Fast, forward-moving camera tracking following the motion',
              category: 'Tracking & Action',
              badge: 'BEST FOR RUNNING',
              img: 'https://images.unsplash.com/photo-1502224562085-639556652f33?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10 50h80" strokeDasharray="6 6" />
                  <path d="M70 40l10 10-10 10" />
                  <circle cx="25" cy="50" r="8" fill="currentColor" className="animate-pulse" />
                </svg>
              )
            },
            {
              id: '1b4c1b9a-898b-451c-bff8-7288382ccaf2',
              label: 'Dunk Shot',
              desc: 'Overhead downward tracking movement mimicking action shots',
              category: 'Tracking & Action',
              badge: 'BEST FOR SPORTS',
              img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M50 15v70" strokeDasharray="4 4" />
                  <path d="M40 70l10 10 10-10" />
                  <circle cx="50" cy="30" r="12" fill="currentColor" className="opacity-20 animate-bounce" />
                </svg>
              )
            },
            {
              id: 'fpv-drone',
              label: 'FPV Sweep',
              desc: 'Dynamic wide flying drone swoops and sweeps',
              category: 'Tracking & Action',
              badge: 'BEST FOR LANDSCAPES',
              img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 80c20-50 50-50 70 0" strokeDasharray="4 4" />
                  <path d="M85 80l-5-10 10-2" fill="currentColor" />
                  <circle cx="50" cy="45" r="8" fill="currentColor" className="opacity-20" />
                </svg>
              )
            },
            {
              id: 'pan-left',
              label: 'Pan Left',
              desc: 'Horizontally pivot the camera lens to the left',
              category: 'Pans & Tilts',
              badge: 'BEST FOR TRANSITIONS',
              img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M75 50H25" strokeDasharray="4 4" />
                  <path d="M25 50l10-10v20Z" fill="currentColor" />
                  <rect x="70" y="40" width="12" height="20" rx="2" fill="currentColor" className="opacity-30" />
                </svg>
              )
            },
            {
              id: 'pan-right',
              label: 'Pan Right',
              desc: 'Horizontally pivot the camera lens to the right',
              category: 'Pans & Tilts',
              badge: 'BEST FOR STORY PAN',
              img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M25 50h50" strokeDasharray="4 4" />
                  <path d="M75 50l-10-10v20Z" fill="currentColor" />
                  <rect x="18" y="40" width="12" height="20" rx="2" fill="currentColor" className="opacity-30" />
                </svg>
              )
            },
            {
              id: 'whip-pan',
              label: 'Whip Pan',
              desc: 'Extremely fast directional pan creating motion blur',
              category: 'Pans & Tilts',
              badge: 'BEST FOR FAST SPEED',
              img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
              svg: (
                <svg className="w-8 h-8 text-[#9758FF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 50h70M15 42h70M15 58h70" strokeOpacity="0.4" />
                  <path d="M80 50l-10-10v20Z" fill="currentColor" className="animate-pulse" />
                </svg>
              )
            }
          ];

          return (
            <div className="flex flex-col gap-3">
              <span className="text-[12px] text-[#7A7A80] font-medium">Cinematic Camera Motion</span>
              
              {/* Horizontal Scrollable Row */}
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth w-full select-none">
                {presets.map((p) => {
                  const active = motionId === p.id;
                  
                  // Helper to get Lucide icon for card header
                  const getIcon = () => {
                    const label = p.label.toLowerCase();
                    if (label.includes('none') || label.includes('auto')) return <Sparkles size={14} />;
                    if (label.includes('arc left')) return <RotateCcw size={14} />;
                    if (label.includes('arc right')) return <RotateCw size={14} />;
                    if (label.includes('360')) return <Globe size={14} />;
                    if (label.includes('3d')) return <Globe size={14} />;
                    if (label.includes('dolly in')) return <ZoomIn size={14} />;
                    if (label.includes('dolly out')) return <ZoomOut size={14} />;
                    if (label.includes('zoom in')) return <ZoomIn size={14} />;
                    if (label.includes('zoom out')) return <ZoomOut size={14} />;
                    if (label.includes('crash')) return <Zap size={14} />;
                    if (label.includes('run')) return <Activity size={14} />;
                    if (label.includes('dunk')) return <ArrowDown size={14} />;
                    if (label.includes('fpv') || label.includes('sweep')) return <Send size={14} />;
                    if (label.includes('pan left')) return <ArrowLeft size={14} />;
                    if (label.includes('pan right')) return <ArrowRight size={14} />;
                    if (label.includes('whip')) return <Zap size={14} />;
                    return <Film size={14} />;
                  };

                  const isAccentBadge = p.badge === 'BEST FOR STORYTELLING' || p.badge === 'AI DIRECTED';

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMotionId(p.id)}
                      className={`relative w-[215px] h-[315px] rounded-2xl overflow-hidden border flex flex-col bg-[#0e0e11]/90 text-left shrink-0 transition-all duration-300 ${
                        active
                          ? 'border-[#9758FF] shadow-[0_0_20px_rgba(151,88,255,0.18)] ring-1 ring-[#9758FF]/20'
                          : 'border-white/[0.05] hover:border-white/[0.12] hover:bg-[#131317]'
                      }`}
                    >
                      {/* Top Cover Image */}
                      <div className="h-[135px] w-full overflow-hidden bg-black/40 relative">
                        <img 
                          src={p.img} 
                          alt={p.label} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]" 
                        />
                        {active && (
                          <div className="absolute top-2.5 right-2.5 bg-[#9758FF] text-white p-1 rounded-full shadow-md animate-fade-in flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Bottom Info Section */}
                      <div className="p-4 flex flex-col justify-between flex-grow gap-2">
                        <div className="flex flex-col gap-2">
                          {/* Title and Icon */}
                          <div className="flex items-center gap-2">
                            <div className={`shrink-0 transition-colors duration-300 ${active ? 'text-[#9758FF]' : 'text-white/70'}`}>
                              {getIcon()}
                            </div>
                            <h4 className="text-white text-[13.5px] font-semibold tracking-tight truncate leading-tight">
                              {p.label}
                            </h4>
                          </div>

                          {/* Description */}
                          <p className="text-[#7A7A80] text-[11px] leading-relaxed line-clamp-3">
                            {p.desc}
                          </p>
                        </div>

                        {/* Badge */}
                        <div className={`text-[9px] font-black uppercase tracking-[0.08em] px-2.5 py-1 rounded-md w-fit border transition-all duration-300 ${
                          isAccentBadge || active
                            ? 'bg-[#9758FF]/10 text-[#9758FF] border-[#9758FF]/15'
                            : 'bg-white/[0.04] text-[#7A7A80] border-white/[0.02]'
                        }`}>
                          {p.badge}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Model configurations (Resolution, Aspect Ratio, Duration) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/[0.04] pt-5">
          {/* Aspect Ratio */}
          {modelType !== 'dop' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-[#7A7A80] font-medium">Aspect Ratio</span>
              <select
                value={modelType === 'seedance' ? sdAspectRatio : klAspectRatio}
                onChange={(e) => modelType === 'seedance' ? setSdAspectRatio(e.target.value) : setKlAspectRatio(e.target.value)}
                className="bg-[#08080A] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#9758FF]"
              >
                <option value="16:9">16:9 — landscape (YouTube)</option>
                <option value="9:16">9:16 — vertical (TikTok/Reels)</option>
                <option value="1:1">1:1 — square (Instagram)</option>
                <option value="4:3">4:3 — presentation format</option>
                <option value="21:9">21:9 — ultra-wide widescreen</option>
              </select>
            </div>
          )}

          {/* Resolution for Seedance */}
          {modelType === 'seedance' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-[#7A7A80] font-medium">Resolution</span>
              <select
                value={sdResolution}
                onChange={(e: any) => setSdResolution(e.target.value)}
                className="bg-[#08080A] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#9758FF]"
              >
                <option value="720p">720p — draft rendering</option>
                <option value="1080p">1080p — production delivery</option>
              </select>
            </div>
          )}

          {/* Duration slider */}
          {modelType !== 'dop' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-[#7A7A80] font-medium">
                Duration: <span className="text-white font-semibold">{modelType === 'seedance' ? sdDuration : klDuration}s</span>
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-[#5A5A60]">
                  {modelType === 'seedance' ? '4s' : '5s'}
                </span>
                <input
                  type="range"
                  min={modelType === 'seedance' ? 4 : 5}
                  max={modelType === 'seedance' ? 15 : 10}
                  step={modelType === 'seedance' ? 1 : 5}
                  value={modelType === 'seedance' ? sdDuration : klDuration}
                  onChange={(e) => modelType === 'seedance' ? setSdDuration(parseInt(e.target.value)) : setKlDuration(parseInt(e.target.value))}
                  className="flex-1 accent-[#9758FF]"
                />
                <span className="text-[11px] text-[#5A5A60]">
                  {modelType === 'seedance' ? '15s' : '10s'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Advanced Settings Accordion */}
        <div className="border-t border-white/[0.04] pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-[12.5px] text-[#A1A1A5] hover:text-white transition-all font-semibold"
          >
            <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
            Advanced Settings
          </button>
          
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 p-4 rounded-xl bg-[#08080A]/40 border border-white/[0.04]">
              {/* Seed Configuration */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#7A7A80] font-medium">Seed</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-[#A1A1A5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRandomSeed}
                      onChange={(e) => setUseRandomSeed(e.target.checked)}
                      className="accent-[#9758FF]"
                    />
                    Random seed
                  </label>
                </div>
                {!useRandomSeed && (
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                    placeholder="Enter seed number"
                    className="bg-[#08080A] border border-white/[0.08] text-white rounded-lg px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-[#9758FF]"
                  />
                )}
              </div>

              {/* DoP Motion Strength slider */}
              {modelType === 'dop' && (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-[#7A7A80] font-medium">
                    Motion Intensity: <span className="text-white font-semibold">{motionStrength.toFixed(1)}</span>
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#5A5A60]">Subtle</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={motionStrength}
                      onChange={(e) => setMotionStrength(parseFloat(e.target.value))}
                      className="flex-1 accent-[#9758FF]"
                    />
                    <span className="text-[10px] text-[#5A5A60]">Dynamic</span>
                  </div>
                </div>
              )}

              {/* Kling Negative Prompt */}
              {modelType === 'kling' && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-[12px] text-[#7A7A80] font-medium">Negative Prompt (what to avoid)</span>
                  <textarea
                    value={klNegativePrompt}
                    onChange={(e) => setKlNegativePrompt(e.target.value)}
                    placeholder="e.g. low resolution, blurred, text, watermarks..."
                    className="w-full bg-[#08080A]/60 border border-white/[0.08] rounded-lg px-3 py-2 text-[12.5px] text-white focus:outline-none focus:border-[#9758FF] min-h-[50px] resize-none"
                  />
                </div>
              )}

              {/* Toggles */}
              <div className="flex flex-col gap-3 md:col-span-2 pt-2 border-t border-white/[0.03] mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12.5px] text-white font-semibold">Auto-Enhance Prompt</div>
                    <div className="text-[11.5px] text-[#5A5A60]">Automatically rewrites basic prompts for richer details.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={modelType === 'dop' ? dopEnhance : modelType === 'seedance' ? sdEnhance : klEnhance}
                    onChange={(e) => {
                      if (modelType === 'dop') setDopEnhance(e.target.checked);
                      else if (modelType === 'seedance') setSdEnhance(e.target.checked);
                      else if (modelType === 'kling') setKlEnhance(e.target.checked);
                    }}
                    className="w-4 h-4 accent-[#9758FF]"
                  />
                </div>

                {modelType === 'dop' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12.5px] text-white font-semibold">Content NSFW Check</div>
                      <div className="text-[11.5px] text-[#5A5A60]">Filters out inappropriate or unsafe material.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dopNsfw}
                      onChange={(e) => setDopNsfw(e.target.checked)}
                      className="w-4 h-4 accent-[#9758FF]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Generate actions */}
        <div className="flex items-center pt-2 border-t border-white/[0.04]">
          <button
            onClick={() => run()}
            disabled={(modelType === 'dop' && !start) || running}
            className="ml-auto bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white px-7 py-3 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)] active:scale-[0.98]"
          >
            <Sparkles size={17} /> {running ? 'Generating…' : 'Generate video'}
          </button>
        </div>
      </div>

      {/* Result */}
      {job && (
        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 max-w-[560px] mx-auto w-full shadow-lg">
          <p className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center">Generation Output</p>
          {isWorking && (
            <div className="py-8 flex flex-col items-center justify-center gap-5 w-full">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-[#9758FF]/15" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#9758FF] animate-spin" />
                <div className="absolute inset-2 rounded-full bg-[#9758FF]/20 blur-md animate-pulse" />
                <Sparkles size={18} className="absolute inset-0 m-auto text-[#C9A8FF]" />
              </div>
              
              <div className="text-center flex flex-col gap-1 w-full">
                <p className="text-white text-[14.5px] font-bold tracking-tight">
                  {job.status === 'queued' && 'Queued in pipeline'}
                  {job.status === 'submitted' && 'Initializing weights'}
                  {job.status === 'processing' && 'Rendering video'}
                </p>
                
                <div className="flex items-center justify-center gap-2 mt-1 mb-4 bg-[#9758FF]/10 border border-[#9758FF]/20 text-[#C9A8FF] text-[11.5px] px-3 py-1 rounded-full w-fit mx-auto font-mono font-semibold">
                  <Clock size={12} className="animate-pulse" /> Elapsed: {elapsedSeconds}s
                </div>

                {/* Step checklist */}
                <div className="w-full bg-[#08080A]/60 border border-white/[0.03] rounded-2xl p-4 flex flex-col gap-3.5 text-left mb-2">
                  {/* Step 1: Queue */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {['submitted', 'processing'].includes(job.status) ? (
                        <div className="bg-emerald-500/20 text-emerald-400 p-0.5 rounded-full"><Check size={12} className="stroke-[3]" /></div>
                      ) : job.status === 'queued' ? (
                        <div className="text-[#9758FF] p-0.5 animate-spin"><RefreshCw size={12} /></div>
                      ) : (
                        <div className="bg-white/5 text-[#5A5A60] p-0.5 rounded-full"><Check size={12} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12.5px] font-semibold ${['submitted', 'processing'].includes(job.status) ? 'text-emerald-400/90' : job.status === 'queued' ? 'text-white' : 'text-[#7A7A80]'}`}>
                        Queue submission
                      </p>
                      <p className="text-[11px] text-[#5A5A60] mt-0.5">
                        {['submitted', 'processing'].includes(job.status)
                          ? 'Worker node successfully assigned.'
                          : 'Waiting in Celery queue for an idle GPU worker node...'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Initialize weights */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {job.status === 'processing' ? (
                        <div className="bg-emerald-500/20 text-emerald-400 p-0.5 rounded-full"><Check size={12} className="stroke-[3]" /></div>
                      ) : job.status === 'submitted' ? (
                        <div className="text-[#9758FF] p-0.5 animate-spin"><RefreshCw size={12} /></div>
                      ) : (
                        <div className="bg-white/5 text-[#5A5A60] p-0.5 rounded-full"><div className="w-[12px] h-[12px]" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12.5px] font-semibold ${job.status === 'processing' ? 'text-emerald-400/90' : job.status === 'submitted' ? 'text-white font-bold' : 'text-[#5A5A60]'}`}>
                        Initialize model parameters
                      </p>
                      <p className="text-[11px] text-[#5A5A60] mt-0.5">
                        {job.status === 'processing'
                          ? 'Model frames and weights initialized.'
                          : job.status === 'submitted'
                          ? 'Configuring aspect ratios and loading model weights (~10s)...'
                          : 'Pending queue allocation...'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Render temporal consistency */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {job.status === 'processing' ? (
                        <div className="text-[#9758FF] p-0.5 animate-spin"><RefreshCw size={12} /></div>
                      ) : (
                        <div className="bg-white/5 text-[#5A5A60] p-0.5 rounded-full"><div className="w-[12px] h-[12px]" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12.5px] font-semibold ${job.status === 'processing' ? 'text-white font-bold' : 'text-[#5A5A60]'}`}>
                        Render video frames
                      </p>
                      <p className="text-[11px] text-[#5A5A60] mt-0.5">
                        {job.status === 'processing'
                          ? 'Diffusion scheduler is running temporal consistency passes (~25s)...'
                          : 'Pending weight initialization...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips carousel */}
              <div className="border-t border-white/[0.04] pt-4 w-full text-center">
                <span className="text-[10px] text-[#9758FF] font-black uppercase tracking-[0.15em] block mb-1.5">Prompting Tip</span>
                <div className="min-h-[42px] flex items-center justify-center">
                  <p className="text-[#7A7A80] text-[12px] italic leading-relaxed px-6 transition-opacity duration-300 max-w-[420px]">
                    "{VIDEO_TIPS[tipIndex]}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-[#F87171]" />
              <p className="text-[#F87171] text-[14px] font-medium">Generation failed</p>
              <p className="text-[#7A7A80] text-[12.5px] max-w-[460px]">{job.error || 'Something went wrong.'}</p>
            </div>
          )}

          {job.status === 'succeeded' && job.outputs[0] && (
            <div className="space-y-4 flex flex-col items-center">
              <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black w-full flex items-center justify-center">
                <video src={job.outputs[0].url} controls autoPlay loop className="max-h-[50vh] w-auto max-w-full block" />
              </div>
              <button
                onClick={() => downloadVideo(job.outputs[0].url, `vidora-${job.outputs[0].id}.mp4`)}
                className="w-full bg-[#1B1B21] hover:bg-[#24242B] border border-white/[0.05] text-[#C9A8FF] py-3 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2"
              >
                <Download size={15} /> Download video
              </button>
            </div>
          )}
        </div>
      )}

      {pickerFor && (
        <ReferenceLibraryModal
          onPick={onPick}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
};
