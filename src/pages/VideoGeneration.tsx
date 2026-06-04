import { useEffect, useState } from 'react';
import {
  Video, Sparkles, Download, AlertCircle, X, Plus, ArrowRight, ChevronLeft, RefreshCw,
} from 'lucide-react';
import {
  generationApi, pollJob,
  type GenerationJob,
} from '../lib/api/generation';
import { type UploadedAsset } from '../lib/api/studio';
import { ReferenceLibraryModal } from '../components/ReferenceLibraryModal';

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
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<'lite' | 'standard' | 'turbo'>('standard');
  const [start, setStart] = useState<Frame | null>(null);
  const [end, setEnd] = useState<Frame | null>(null);
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

  const run = async (seed?: number) => {
    if (!start || running) return;
    setRunning(true);
    try {
      const created = await generationApi.createVideo({
        prompt: prompt.trim(),
        source: start.id,
        end_frame: end?.id ?? null,
        quality,
        seed,
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

  const onPick = (asset: UploadedAsset) => {
    const frame = { id: asset.id, url: asset.url, name: asset.name };
    if (pickerFor === 'start') setStart(frame);
    else if (pickerFor === 'end') setEnd(frame);
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
          {detailJob.prompt && <p className="text-[#C4C4C8] text-[14px] leading-relaxed">{detailJob.prompt}</p>}
          <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black">
            <video src={detailJob.outputs[0].url} controls autoPlay loop className="w-full h-auto block" />
          </div>
          <button
            onClick={() => downloadVideo(detailJob.outputs[0].url, `vidora-${detailJob.outputs[0].id}.mp4`)}
            className="flex items-center gap-2 text-[13px] text-[#9758FF] font-semibold hover:gap-3 transition-all"
          >
            <Download size={15} /> Download video
          </button>
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
          <p className="text-[#7A7A80] text-[13px]">Animate a reference image into a video. Add an end frame to morph between two.</p>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-[#131316]/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the motion — e.g. “slow cinematic push-in, hair moving in the wind”"
          className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-xl px-4 py-3.5 text-[14.5px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 transition-all min-h-[80px] resize-none leading-relaxed"
        />

        {/* Frames */}
        <div className="flex items-end gap-4 flex-wrap">
          <FrameSlot
            label="Start frame"
            hint="(required)"
            frame={start}
            onPick={() => setPickerFor('start')}
            onClear={() => setStart(null)}
          />
          <ArrowRight size={18} className="text-[#3A3A40] mb-8" />
          <FrameSlot
            label="End frame"
            hint="(optional)"
            frame={end}
            onPick={() => setPickerFor('end')}
            onClear={() => setEnd(null)}
          />
        </div>

        {/* Quality + Generate */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[#7A7A80] mr-1">Quality</span>
          {QUALITIES.map((q) => (
            <button
              key={q.id}
              onClick={() => setQuality(q.id)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all ${
                quality === q.id
                  ? 'bg-[#9758FF]/15 border-[#9758FF] text-white'
                  : 'bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40]'
              }`}
            >
              {q.label}
            </button>
          ))}
          <button
            onClick={() => run()}
            disabled={!start || running}
            className="ml-auto bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
          >
            <Sparkles size={17} /> {running ? 'Generating…' : 'Generate video'}
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
              <p className="text-[#5A5A60] text-[12px]">Video can take a couple of minutes — hang tight.</p>
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
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black">
                <video src={job.outputs[0].url} controls autoPlay loop className="w-full h-auto block" />
              </div>
              <button
                onClick={() => downloadVideo(job.outputs[0].url, `vidora-${job.outputs[0].id}.mp4`)}
                className="flex items-center gap-2 text-[13px] text-[#9758FF] font-semibold hover:gap-3 transition-all"
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
