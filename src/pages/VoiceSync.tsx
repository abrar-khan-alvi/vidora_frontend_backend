import { useEffect, useState } from 'react';
import {
  Volume2, Plus, ChevronLeft, Mic, Sparkles, Download, RefreshCw, AlertCircle,
  Loader2, Check, Trash2, Music, Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { generationApi, pollJob, type GenerationJob } from '../lib/api/generation';
import { voiceApi, type Voice, type VoiceSelection } from '../lib/api/voice';
import { CloneVoiceModal } from '../components/CloneVoiceModal';
import { VoicePickerModal } from '../components/VoicePickerModal';

const MAX_CHARS = 5000;

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued…',
  submitted: 'Submitting…',
  processing: 'Synthesizing…',
};

async function downloadAudio(url: string, name: string) {
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

export const VoiceSyncContent = () => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selected, setSelected] = useState<VoiceSelection | null>(null);
  const [text, setText] = useState('');
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [detailJob, setDetailJob] = useState<GenerationJob | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadVoices = () => voiceApi.list().then(setVoices).catch(() => {});
  const loadHistory = () => generationApi.listAudio().then(setHistory).catch(() => {});
  useEffect(() => {
    loadVoices();
    loadHistory();
  }, []);

  // While a voice is still cloning, refresh so it flips to "ready" on its own.
  useEffect(() => {
    if (!voices.some((v) => v.status === 'pending')) return;
    const t = setInterval(loadVoices, 5000);
    return () => clearInterval(t);
  }, [voices]);

  const clips = history.filter((h) => h.status === 'succeeded' && h.outputs.length > 0);

  const run = async (speakText: string, sel: VoiceSelection | null) => {
    const content = speakText.trim();
    if (!content || !sel || running) return;
    setRunning(true);
    try {
      const body = sel.kind === 'cloned'
        ? { voice: sel.id, text: content }
        : { stock_voice_id: sel.id, text: content };
      const created = await generationApi.createTTS(body);
      setJob(created);
      await pollJob(created.id, setJob);
    } catch {
      setJob((j) => (j ? { ...j, status: 'failed', error: 'Request failed.' } : j));
    } finally {
      setRunning(false);
      loadHistory();
    }
  };

  const openCreate = () => {
    setJob(null);
    loadVoices();
    // Pre-select the first ready cloned voice if the user has one.
    setSelected((cur) => {
      if (cur) return cur;
      const r = voices.find((v) => v.status === 'ready');
      return r ? { kind: 'cloned', id: r.id, name: r.name } : null;
    });
    setView('create');
  };
  const openDetail = (h: GenerationJob) => {
    setDetailJob(h);
    setView('detail');
  };

  const isWorking = job && ['queued', 'submitted', 'processing'].includes(job.status);

  // ---- LIST VIEW ----------------------------------------------------------
  if (view === 'list') {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#9758FF]/10 p-2 rounded-lg"><Volume2 size={20} className="text-[#9758FF]" /></div>
            <div>
              <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">VoiceSync AI</h1>
              <p className="text-[#7A7A80] text-[13px]">Generate speech in a cloned voice from any script.</p>
            </div>
          </div>
          <button onClick={openCreate} className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]">
            <Plus size={18} /> New Speech
          </button>
        </div>

        {/* My Voices */}
        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-[14px] font-semibold">My Voices</h2>
            <button onClick={() => setCloneOpen(true)} className="flex items-center gap-1.5 text-[12px] text-[#9758FF] font-medium hover:gap-2.5 transition-all">
              <Plus size={14} /> Clone a voice
            </button>
          </div>
          {voices.length === 0 ? (
            <p className="text-[#5A5A60] text-[13px]">No cloned voices yet. Clone one from a short audio sample to get started.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {voices.map((v) => (
                <div key={v.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="h-9 w-9 rounded-lg bg-[#9758FF]/10 border border-[#9758FF]/20 flex items-center justify-center shrink-0"><Mic size={16} className="text-[#9758FF]" /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13.5px] font-medium truncate">{v.name}</p>
                    <p className="text-[12px] text-[#7A7A80]">
                      {v.status === 'ready' && <span className="text-[#34D399]">Ready</span>}
                      {v.status === 'pending' && <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Cloning…</span>}
                      {v.status === 'failed' && <span className="text-[#F87171]">{v.error || 'Cloning failed'}</span>}
                    </p>
                  </div>
                  <button onClick={() => voiceApi.remove(v.id).then(loadVoices).catch(() => {})} className="p-2 text-[#5A5A60] hover:text-[#F87171] transition-colors" title="Delete voice">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent audio */}
        <div>
          <h2 className="text-white text-[14px] font-semibold mb-3">Recent Audio</h2>
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="bg-[#9758FF]/10 p-4 rounded-2xl"><Volume2 size={26} className="text-[#9758FF]" /></div>
              <div>
                <p className="text-white text-[15px] font-semibold">No audio yet</p>
                <p className="text-[#7A7A80] text-[13px] mt-1">Generate your first voiceover — it’ll show up here.</p>
              </div>
              <button onClick={openCreate} className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2">
                <Plus size={18} /> New Speech
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clips.map((h) => (
                <div key={h.id} className="bg-[#131316]/40 border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => openDetail(h)} className="text-left text-[#C4C4C8] text-[13.5px] leading-relaxed line-clamp-2 hover:text-white transition-colors flex-1">
                      {h.prompt}
                    </button>
                    <button onClick={() => downloadAudio(h.outputs[0].url, `vidora-voice-${h.id}.mp3`)} className="p-2 text-[#7A7A80] hover:text-white transition-colors shrink-0" title="Download">
                      <Download size={16} />
                    </button>
                  </div>
                  <audio controls preload="none" src={h.outputs[0].url} className="w-full h-9" />
                </div>
              ))}
            </div>
          )}
        </div>

        {cloneOpen && <CloneVoiceModal onClose={() => setCloneOpen(false)} onCreated={loadVoices} />}
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
        </div>
        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 text-[#7A7A80] text-[12px]">
            <Clock size={13} /> {new Date(detailJob.created_at).toLocaleString()}
          </div>
          <p className="text-[#C4C4C8] text-[14px] leading-relaxed">{detailJob.prompt}</p>
          <audio controls src={detailJob.outputs[0].url} className="w-full" />
          <button onClick={() => downloadAudio(detailJob.outputs[0].url, `vidora-voice-${detailJob.id}.mp3`)}
            className="flex items-center gap-2 bg-[#9758FF]/10 hover:bg-[#9758FF]/20 border border-[#9758FF]/30 text-[#C9A8FF] px-4 py-2 rounded-xl text-[13px] font-semibold transition-all">
            <Download size={15} /> Download MP3
          </button>
        </div>
      </div>
    );
  }

  // ---- CREATE VIEW --------------------------------------------------------
  return (
    <div className="relative flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
      <motion.div aria-hidden className="pointer-events-none absolute -top-28 left-1/4 w-[520px] h-[300px] bg-[#9758FF]/15 blur-[130px] rounded-full -z-10"
        animate={{ x: [0, 50, 0], y: [0, 24, 0], opacity: [0.5, 0.85, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />

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
            <Volume2 size={20} className="text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight bg-gradient-to-r from-white via-white to-[#C9B8FF] bg-clip-text text-transparent">New Speech</h1>
          <p className="text-[#8A8A90] text-[13px]">Type a script and generate a voiceover in your cloned voice.</p>
        </div>
      </div>

      {/* Composer */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative rounded-2xl p-[1px] bg-gradient-to-br from-[#9758FF]/35 via-white/[0.07] to-transparent shadow-[0_24px_70px_-28px_rgba(151,88,255,0.5)]">
        <div className="rounded-2xl bg-[#0F0F12]/92 backdrop-blur-xl border border-white/[0.04] p-5 flex flex-col gap-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Type the script you want spoken aloud…"
              className="w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl px-5 py-4 text-[15px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60 focus:shadow-[0_0_0_3px_rgba(151,88,255,0.12)] transition-all min-h-[150px] resize-y leading-relaxed"
            />
            <span className="absolute bottom-3 right-4 text-[11px] text-[#5A5A60]">{text.length} / {MAX_CHARS}</span>
          </div>

          {/* Voice selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-[#7A7A80]">Voice <span className="text-[#5A5A60]">(clone your own, or pick a built-in voice)</span></span>
            <div className="flex flex-wrap items-center gap-2">
              {selected ? (
                <span className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg text-[12.5px] font-medium border bg-[#9758FF]/15 border-[#9758FF]/80 text-white shadow-[0_0_14px_rgba(151,88,255,0.25)]">
                  <span className="h-5 w-5 rounded bg-[#9758FF]/25 flex items-center justify-center"><Mic size={11} className="text-[#C9A8FF]" /></span>
                  <span className="truncate max-w-[160px]">{selected.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[#9F86D9]">{selected.kind === 'cloned' ? 'cloned' : 'built-in'}</span>
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-[12.5px] text-[#7A7A80] border border-dashed border-[#2E2E36]">No voice selected</span>
              )}
              <button
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border bg-[#08080A]/40 border-[#24242B] text-[#A1A1A5] hover:border-[#3A3A40] transition-all"
              >
                <Mic size={14} className="text-[#9758FF]" /> {selected ? 'Change voice' : 'Choose a voice'}
              </button>
            </div>
          </div>

          <div className="flex items-center pt-1">
            <button
              onClick={() => run(text, selected)}
              disabled={!text.trim() || !selected || running}
              className="ml-auto group relative overflow-hidden bg-gradient-to-r from-[#9758FF] to-[#C24DFF] disabled:opacity-50 disabled:saturate-50 text-white px-7 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_10px_34px_-6px_rgba(151,88,255,0.6)] active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              <Sparkles size={17} className={running ? 'animate-pulse' : ''} /> {running ? 'Generating…' : 'Generate Speech'}
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
              <div className="py-14 flex flex-col items-center justify-center gap-5">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-[#9758FF]/15" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#9758FF] animate-spin" />
                  <Mic size={18} className="absolute inset-0 m-auto text-[#C9A8FF]" />
                </div>
                <p className="text-white text-[14px] font-medium">{STATUS_LABEL[job.status] ?? 'Working…'}</p>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="bg-[#F87171]/10 p-3 rounded-2xl"><AlertCircle size={26} className="text-[#F87171]" /></div>
                <p className="text-[#F87171] text-[14px] font-medium">Generation failed</p>
                <p className="text-[#7A7A80] text-[12.5px] max-w-[460px]">{job.error || 'Something went wrong.'}</p>
              </div>
            )}

            {job.status === 'succeeded' && job.outputs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[12px] text-[#34D399]"><Check size={14} /> Audio ready</div>
                <div className="flex items-center gap-3 bg-[#08080A]/60 border border-white/[0.05] rounded-xl p-3">
                  <span className="h-10 w-10 rounded-lg bg-[#9758FF]/10 border border-[#9758FF]/20 flex items-center justify-center shrink-0"><Music size={18} className="text-[#9758FF]" /></span>
                  <audio controls src={job.outputs[0].url} className="flex-1 h-9" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => downloadAudio(job.outputs[0].url, `vidora-voice-${job.id}.mp3`)}
                    className="flex items-center gap-2 bg-[#9758FF] hover:bg-[#854EE6] text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-all">
                    <Download size={15} /> Download MP3
                  </button>
                  <button onClick={() => run(text, selected)} disabled={running}
                    className="flex items-center gap-2 bg-[#9758FF]/10 hover:bg-[#9758FF]/20 border border-[#9758FF]/30 text-[#C9A8FF] px-4 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50">
                    <RefreshCw size={15} /> Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {cloneOpen && <CloneVoiceModal onClose={() => setCloneOpen(false)} onCreated={loadVoices} />}
      {pickerOpen && (
        <VoicePickerModal
          voices={voices}
          selected={selected}
          onPick={setSelected}
          onClose={() => setPickerOpen(false)}
          onCloneClick={() => setCloneOpen(true)}
        />
      )}
    </div>
  );
};
