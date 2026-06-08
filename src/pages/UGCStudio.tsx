import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clapperboard, Sparkles, Plus, ChevronLeft, Download, AlertCircle, X,
  Mic, User, Clock, Sliders, ChevronDown, Wand2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { generationApi, pollJob, type GenerationJob } from '../lib/api/generation';
import { uploadAsset, type UploadedAsset } from '../lib/api/studio';
import { voiceApi, type Voice, type VoiceSelection } from '../lib/api/voice';
import { ReferenceLibraryModal } from '../components/ReferenceLibraryModal';
import { VoicePickerModal } from '../components/VoicePickerModal';
import { useToast } from '../components/Toast';

const QUALITIES: { id: 'high' | 'mid'; label: string; hint: string }[] = [
  { id: 'high', label: 'High', hint: 'Best detail' },
  { id: 'mid', label: 'Mid', hint: 'Faster' },
];
const DURATIONS: (5 | 10 | 15)[] = [5, 10, 15];

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

export const UGCStudioContent = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Inputs
  const [avatar, setAvatar] = useState<UploadedAsset | null>(null);
  const [script, setScript] = useState('');
  const [voiceSel, setVoiceSel] = useState<VoiceSelection | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [scenario, setScenario] = useState('');

  // Higgsfield Speak parameters
  const [quality, setQuality] = useState<'high' | 'mid'>('high');
  const [duration, setDuration] = useState<5 | 10 | 15>(5);
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [seed, setSeed] = useState<number>(12345);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modals
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);

  // Job state
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [detailJob, setDetailJob] = useState<GenerationJob | null>(null);

  const loadHistory = () => generationApi.listUGC().then(setHistory).catch(() => { });
  const loadVoices = () => voiceApi.list().then(setVoices).catch(() => { });
  useEffect(() => {
    loadHistory();
    loadVoices();
  }, []);

  const uploadAvatar = async (file: File) => {
    try {
      const a = await uploadAsset(file);
      setAvatar(a);
    } catch {
      toast.error('Could not upload that image.');
    }
  };

  const run = async () => {
    if (!avatar) { toast.error('Pick an avatar image first.'); return; }
    if (!script.trim()) { toast.error('Write a script for the avatar to say.'); return; }
    if (!voiceSel) { toast.error('Choose a voice.'); return; }
    if (running) return;
    setRunning(true);
    try {
      const created = await generationApi.createUGC({
        image: avatar.id,
        text: script.trim(),
        voice: voiceSel.kind === 'cloned' ? voiceSel.id : null,
        stock_voice_id: voiceSel.kind === 'stock' ? voiceSel.id : null,
        scenario: scenario.trim(),
        quality,
        duration,
        enhance_prompt: enhancePrompt,
        seed: useRandomSeed ? null : seed,
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

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let t: any;
    if (isWorking) { setElapsed(0); t = setInterval(() => setElapsed((s) => s + 1), 1000); }
    return () => clearInterval(t);
  }, [isWorking]);

  const gallery = history.filter((h) => h.status === 'succeeded' && h.outputs.length > 0);

  const openCreate = () => { setJob(null); loadVoices(); setView('create'); };
  const openDetail = (h: GenerationJob) => { setDetailJob(h); setView('detail'); };

  // ---- LIST VIEW ----------------------------------------------------------
  if (view === 'list') {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#9758FF]/10 p-2 rounded-lg"><Clapperboard size={20} className="text-[#9758FF]" /></div>
            <div>
              <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">UGC Studio</h1>
              <p className="text-[#7A7A80] text-[13px]">Talking-avatar videos — an avatar speaks your script, lip-synced.</p>
            </div>
          </div>
          <button onClick={openCreate} className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]">
            <Plus size={18} /> New UGC Video
          </button>
        </div>

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((h) => (
              <button key={h.id} onClick={() => openDetail(h)} className="group flex flex-col gap-2 text-left" title={h.prompt || 'UGC video'}>
                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.06] group-hover:border-[#9758FF]/40 transition-all bg-black relative">
                  <video src={h.outputs[0].url} muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Mic size={15} className="text-white" /></div>
                  </div>
                </div>
                <span className="text-[12px] text-[#A1A1A5] line-clamp-1 px-0.5">{h.prompt || 'Untitled'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="bg-[#9758FF]/10 p-4 rounded-2xl"><Clapperboard size={28} className="text-[#9758FF]" /></div>
            <div>
              <p className="text-white text-[15px] font-semibold">No UGC videos yet</p>
              <p className="text-[#7A7A80] text-[13px] mt-1">Make an avatar talk — your videos will show up here.</p>
            </div>
            <button onClick={openCreate} className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2">
              <Plus size={18} /> New UGC Video
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- DETAIL VIEW --------------------------------------------------------
  if (view === 'detail' && detailJob && detailJob.outputs[0]) {
    const p = detailJob.input_params || {};
    return (
      <div className="flex-1 w-full max-w-[1140px] flex flex-col gap-6 pb-10">
        <button onClick={() => setView('list')} className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors mt-2 w-fit">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[14.5px] font-semibold">Back to Library</span>
        </button>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[58%] bg-[#131316]/40 border border-white/[0.05] rounded-3xl overflow-hidden p-3 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)]">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black flex items-center justify-center mx-auto w-fit">
              <video src={detailJob.outputs[0].url} controls autoPlay loop className="max-h-[70vh] w-auto max-w-full block" />
            </div>
          </div>
          <div className="w-full lg:w-[42%] flex flex-col gap-5 shrink-0">
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-3 shadow-lg">
              <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-wider">Script</span>
              <p className="text-[#EAEAEA] text-[14px] leading-relaxed bg-[#08080A]/60 border border-white/[0.03] rounded-2xl px-4 py-3.5 max-h-[160px] overflow-y-auto">{detailJob.prompt || '—'}</p>
            </div>
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4 shadow-lg">
              <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-wider">Speak Parameters</span>
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  ['Model', 'Speak v2'],
                  ['Quality', p.quality || 'high'],
                  ['Duration', `${p.duration ?? 5}s`],
                  ['Seed', p.seed ?? 'Random'],
                  ['Enhance', p.enhance_prompt ? 'On' : 'Off'],
                  ['Cost', `${detailJob.credits_cost || 6} cr`],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-3.5">
                    <div className="text-[11px] text-[#5A5A60] font-semibold uppercase">{k}</div>
                    <div className="text-[13.5px] font-semibold text-white mt-1 capitalize truncate">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => downloadVideo(detailJob.outputs[0].url, `vidora-ugc-${detailJob.outputs[0].id}.mp4`)} className="w-full bg-gradient-to-r from-[#6A39C4] to-[#8C4DE8] hover:shadow-[0_8px_25px_rgba(106,57,196,0.35)] text-white py-3.5 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              <Download size={16} /> Download video
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- CREATE VIEW --------------------------------------------------------
  const avatarFileInput = (
    <input type="file" accept="image/*" className="hidden" id="ugc-avatar-input"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
  );

  return (
    <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
      <button onClick={() => setView('list')} className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors mt-2 w-fit">
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[14px] font-medium">Back to library</span>
      </button>

      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="absolute inset-0 bg-[#9758FF] blur-lg opacity-40 rounded-xl" />
          <div className="relative bg-gradient-to-br from-[#A06BFF] to-[#6D28D9] p-2.5 rounded-xl shadow-lg shadow-[#9758FF]/30"><Clapperboard size={20} className="text-white" /></div>
        </div>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight bg-gradient-to-r from-white via-white to-[#C9B8FF] bg-clip-text text-transparent">UGC Studio</h1>
          <p className="text-[#8A8A90] text-[13px]">An avatar speaks your script — lip-synced with Higgsfield Speak.</p>
        </div>
      </div>

      <div className="bg-[#131316]/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-6">

        {/* 1 — Avatar */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#9758FF]/15 text-[#9758FF] text-[11px] font-bold flex items-center justify-center">1</span>
            <span className="text-[13px] font-semibold text-white">Avatar</span>
            <span className="text-[12px] text-[#5A5A60]">— the talking face (a generated image or your own photo)</span>
          </div>
          <div className="flex items-center gap-3">
            {avatar ? (
              <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-[#9758FF]/40 group">
                <img src={avatar.url} alt="avatar" className="h-full w-full object-cover" />
                <button onClick={() => setAvatar(null)} className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-md p-0.5" title="Remove"><X size={12} /></button>
              </div>
            ) : (
              <div className="h-24 w-24 rounded-xl border border-dashed border-[#2E2E36] flex items-center justify-center text-[#5A5A60]"><User size={26} /></div>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={() => setAvatarPickerOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#24242B] bg-[#08080A]/40 text-[#A1A1A5] hover:text-white hover:border-[#3A3A40] transition-all text-[13px] font-semibold">
                <Plus size={15} className="text-[#9758FF]" /> Choose from library
              </button>
              <label htmlFor="ugc-avatar-input" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#24242B] bg-[#08080A]/40 text-[#A1A1A5] hover:text-white hover:border-[#3A3A40] transition-all text-[13px] font-semibold cursor-pointer">
                <Plus size={15} className="text-[#9758FF]" /> Upload a photo
              </label>
              {avatarFileInput}
            </div>
          </div>
        </div>

        {/* 2 — Script + Voice */}
        <div className="flex flex-col gap-2.5 border-t border-white/[0.04] pt-5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#9758FF]/15 text-[#9758FF] text-[11px] font-bold flex items-center justify-center">2</span>
            <span className="text-[13px] font-semibold text-white">Script &amp; voice</span>
            <span className="text-[12px] text-[#5A5A60]">— what they say, and in whose voice</span>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="e.g. Honestly, this is the only serum I've used that actually cleared my skin in two weeks…"
            className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 transition-all min-h-[100px] resize-y leading-relaxed"
          />
          <div className="flex items-center gap-3">
            {voiceSel ? (
              <div className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-xl border border-[#9758FF]/40 bg-[#9758FF]/10 text-white w-fit">
                <span className="h-8 w-8 rounded-lg bg-[#9758FF]/20 flex items-center justify-center"><Mic size={15} className="text-[#9758FF]" /></span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold leading-tight">{voiceSel.name}</span>
                  <span className="text-[10px] text-[#A1A1A5] leading-none mt-0.5 capitalize">{voiceSel.kind} voice</span>
                </div>
                <button onClick={() => setVoicePickerOpen(true)} className="ml-3 text-[11px] text-[#C9A8FF] hover:text-white underline font-semibold">Change</button>
              </div>
            ) : (
              <button onClick={() => setVoicePickerOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#24242B] bg-[#08080A]/40 text-[#A1A1A5] hover:text-white hover:border-[#3A3A40] transition-all text-[13px] font-semibold">
                <Mic size={16} className="text-[#9758FF]" /> Choose a voice
              </button>
            )}
          </div>
        </div>

        {/* 3 — Scene prompt */}
        <div className="flex flex-col gap-2.5 border-t border-white/[0.04] pt-5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#9758FF]/15 text-[#9758FF] text-[11px] font-bold flex items-center justify-center">3</span>
            <span className="text-[13px] font-semibold text-white">Scene prompt</span>
            <span className="text-[12px] text-[#5A5A60]">— Speak's <span className="font-mono">prompt</span>: expression, mood, setting (optional)</span>
          </div>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="e.g. Speaking warmly and confidently to camera, soft natural light, subtle head movement, friendly smile"
            className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 transition-all min-h-[64px] resize-y leading-relaxed"
          />
        </div>

        {/* 4 — Speak parameters */}
        <div className="flex flex-col gap-4 border-t border-white/[0.04] pt-5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#9758FF]/15 text-[#9758FF] text-[11px] font-bold flex items-center justify-center">4</span>
            <span className="text-[13px] font-semibold text-white">Parameters</span>
            <span className="text-[12px] text-[#5A5A60]">— from Higgsfield Speak v2</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Quality */}
            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-[#7A7A80] font-medium">Quality</span>
              <div className="flex items-center gap-1.5 bg-[#08080A] border border-[#24242B] p-1 rounded-xl w-fit">
                {QUALITIES.map((qOpt) => (
                  <button key={qOpt.id} onClick={() => setQuality(qOpt.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold transition-all ${quality === qOpt.id ? 'bg-[#9758FF] text-white shadow-md' : 'text-[#A1A1A5] hover:text-white'}`}
                    title={qOpt.hint}>
                    {qOpt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Duration */}
            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-[#7A7A80] font-medium">Duration</span>
              <div className="flex items-center gap-1.5 bg-[#08080A] border border-[#24242B] p-1 rounded-xl w-fit">
                {DURATIONS.map((d) => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold transition-all ${duration === d ? 'bg-[#9758FF] text-white shadow-md' : 'text-[#A1A1A5] hover:text-white'}`}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div>
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-[13px] font-semibold text-[#A1A1A5] hover:text-white transition-colors">
              <Sliders size={14} className="text-[#9758FF]" /> Advanced
              <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180 text-white' : 'text-[#7A7A80]'}`} />
            </button>
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-5">
                <div className="flex items-center justify-between md:col-span-2">
                  <div>
                    <div className="text-[12.5px] text-white font-semibold flex items-center gap-1.5"><Wand2 size={13} className="text-[#9758FF]" /> Enhance prompt</div>
                    <div className="text-[11.5px] text-[#5A5A60]">Let Speak optimize expressions from your scene prompt.</div>
                  </div>
                  <input type="checkbox" checked={enhancePrompt} onChange={(e) => setEnhancePrompt(e.target.checked)} className="w-4 h-4 accent-[#9758FF]" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2 border-t border-white/[0.03] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-[#7A7A80] font-medium">Seed</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#A1A1A5] cursor-pointer">
                      <input type="checkbox" checked={useRandomSeed} onChange={(e) => setUseRandomSeed(e.target.checked)} className="accent-[#9758FF]" /> Random seed
                    </label>
                  </div>
                  {!useRandomSeed && (
                    <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                      className="bg-[#08080A] border border-white/[0.08] text-white rounded-lg px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-[#9758FF] max-w-[200px]" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate */}
        <div className="flex items-center pt-2 border-t border-white/[0.04]">
          <p className="text-[11.5px] text-[#5A5A60]">Lip-sync renders take a few minutes.</p>
          <button onClick={run} disabled={running || !avatar || !script.trim() || !voiceSel}
            className="ml-auto bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white px-7 py-3 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)] active:scale-[0.98]">
            <Sparkles size={17} /> {running ? 'Generating…' : 'Generate UGC video'}
          </button>
        </div>
      </div>

      {/* Result */}
      {job && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 max-w-[480px] mx-auto w-full shadow-lg">
          <p className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center">Generation Output</p>
          {isWorking && (
            <div className="py-8 flex flex-col items-center justify-center gap-4">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-[#9758FF]/15" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#9758FF] animate-spin" />
                <Mic size={18} className="absolute inset-0 m-auto text-[#C9A8FF]" />
              </div>
              <div className="text-center">
                <p className="text-white text-[14.5px] font-bold">
                  {job.status === 'queued' && 'Queued…'}
                  {job.status === 'submitted' && 'Recording the voiceover…'}
                  {job.status === 'processing' && 'Lip-syncing your avatar…'}
                </p>
                <p className="text-[#5A5A60] text-[12px] mt-1 max-w-[360px]">Voiceover → lip-sync → render. This usually takes a few minutes.</p>
                <div className="flex items-center justify-center gap-2 mt-3 bg-[#9758FF]/10 border border-[#9758FF]/20 text-[#C9A8FF] text-[11.5px] px-3 py-1 rounded-full w-fit mx-auto font-mono font-semibold">
                  <Clock size={12} className="animate-pulse" /> Elapsed: {elapsed}s
                </div>
              </div>
            </div>
          )}
          {job.status === 'failed' && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-[#F87171]" />
              <p className="text-[#F87171] text-[14px] font-medium">Generation failed</p>
              <p className="text-[#7A7A80] text-[12.5px] max-w-[400px]">{job.error || 'Something went wrong.'}</p>
            </div>
          )}
          {job.status === 'succeeded' && job.outputs[0] && (
            <div className="space-y-4 flex flex-col items-center">
              <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black w-full flex items-center justify-center">
                <video src={job.outputs[0].url} controls autoPlay loop className="max-h-[60vh] w-auto max-w-full block" />
              </div>
              <button onClick={() => downloadVideo(job.outputs[0].url, `vidora-ugc-${job.outputs[0].id}.mp4`)}
                className="w-full bg-[#1B1B21] hover:bg-[#24242B] border border-white/[0.05] text-[#C9A8FF] py-3 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2">
                <Download size={15} /> Download video
              </button>
            </div>
          )}
        </motion.div>
      )}

      {avatarPickerOpen && (
        <ReferenceLibraryModal onPick={(a) => { setAvatar(a); setAvatarPickerOpen(false); }} onClose={() => setAvatarPickerOpen(false)} />
      )}
      {voicePickerOpen && (
        <VoicePickerModal
          voices={voices}
          selected={voiceSel}
          onPick={setVoiceSel}
          onClose={() => setVoicePickerOpen(false)}
          onCloneClick={() => navigate('/dashboard/voicesync')}
        />
      )}
    </div>
  );
};
