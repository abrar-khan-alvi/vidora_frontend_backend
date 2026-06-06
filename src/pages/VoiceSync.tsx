import { useEffect, useState, useRef } from 'react';
import {
  Volume2, Plus, ChevronLeft, Mic, Sparkles, Download, RefreshCw, AlertCircle,
  Loader2, Check, Trash2, Music, Clock, Play, Pause, Copy, FileText, Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { generationApi, pollJob, type GenerationJob } from '../lib/api/generation';
import { voiceApi, type Voice, type VoiceSelection } from '../lib/api/voice';
import { CloneVoiceModal } from '../components/CloneVoiceModal';
import { VoicePickerModal } from '../components/VoicePickerModal';
import { useToast } from '../components/Toast';

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

const AudioPlayer = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const animRef = useRef<number | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const updateProgress = () => {
    if (audioRef.current && !audioRef.current.paused && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
      animRef.current = requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    if (isPlaying && !isSeeking) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [isPlaying, isSeeking]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    if (audio.readyState >= 1) {
      setDuration(audio.duration || 0);
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [url]);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  return (
    <div className="flex items-center gap-4 bg-[#08080A]/60 border border-white/[0.04] rounded-2xl p-4 w-full backdrop-blur-md">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave-bar-anim {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        .wave-bar-active {
          animation: wave-bar-anim 1s ease-in-out infinite;
        }
      `}} />

      <button
        onClick={togglePlay}
        className="w-11 h-11 rounded-full bg-[#9758FF] hover:bg-[#854EE6] text-white flex items-center justify-center transition-all shadow-lg shadow-[#9758FF]/20 shrink-0 hover:scale-105 active:scale-95"
      >
        {isPlaying ? (
          <Pause size={18} fill="currentColor" stroke="none" />
        ) : (
          <Play size={18} fill="currentColor" stroke="none" className="ml-1" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-3 text-[11px] text-[#7A7A80] font-medium">
          <span>{formatTime(currentTime)}</span>
          
          <div className="flex items-center gap-1 h-6 shrink-0">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full bg-[#9758FF]/60 transition-all duration-300 ${
                  isPlaying ? 'wave-bar-active' : ''
                }`}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  height: isPlaying ? undefined : '8px',
                  marginTop: isPlaying ? undefined : '7px'
                }}
              />
            ))}
          </div>

          <span>{formatTime(duration)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          onTouchStart={() => setIsSeeking(true)}
          onTouchEnd={() => setIsSeeking(false)}
          className="w-full h-1 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg appearance-none cursor-pointer accent-[#9758FF] outline-none transition-all"
        />
      </div>
    </div>
  );
};

export const VoiceSyncContent = () => {
  const toast = useToast();
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
  const [deletingVoice, setDeletingVoice] = useState<Voice | null>(null);

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
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="absolute inset-0 bg-[#9758FF] blur-lg opacity-40 rounded-xl" />
              <div className="relative bg-gradient-to-br from-[#A06BFF] to-[#6D28D9] p-2.5 rounded-xl shadow-lg shadow-[#9758FF]/30">
                <Volume2 size={22} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-[26px] font-bold text-white tracking-tight leading-tight">VoiceSync AI</h1>
              <p className="text-[#8A8A90] text-[13px] mt-0.5">Create human-like speech in a cloned voice or select a built-in voice.</p>
            </div>
          </div>
          <button 
            onClick={openCreate} 
            className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} /> New Speech
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
          {/* My Voices Section */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-5 backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-wider">My Cloned Voices</span>
                <span className="text-[11px] text-[#9758FF] font-semibold bg-[#9758FF]/10 px-2 py-0.5 rounded-full">
                  {voices.length} Clones
                </span>
              </div>
              
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {voices.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/[0.05] rounded-2xl p-4 flex flex-col items-center gap-2">
                    <Mic size={20} className="text-[#5A5A60]" />
                    <p className="text-[#5A5A60] text-[12px] leading-relaxed">No cloned voices yet.</p>
                  </div>
                ) : (
                  voices.map((v) => (
                    <div 
                      key={v.id} 
                      className="group bg-[#08080A]/60 border border-white/[0.03] hover:border-white/[0.08] hover:bg-[#121215]/80 rounded-2xl p-3 flex items-center gap-3 transition-all duration-300"
                    >
                      <div className="h-9 w-9 rounded-xl bg-[#9758FF]/10 border border-[#9758FF]/20 flex items-center justify-center shrink-0">
                        <Mic size={15} className="text-[#9758FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[13px] font-semibold truncate leading-tight">{v.name}</p>
                        <div className="text-[11px] mt-0.5 leading-none">
                          {v.status === 'ready' && <span className="text-[#34D399] font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" /> Ready</span>}
                          {v.status === 'pending' && <span className="text-[#A06BFF] font-medium flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Cloning…</span>}
                          {v.status === 'failed' && <span className="text-[#F87171] font-medium truncate max-w-[130px] inline-block">{v.error || 'Failed'}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => setDeletingVoice(v)} 
                        className="p-1.5 text-[#5A5A60] hover:text-[#F87171] hover:bg-[#F87171]/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" 
                        title="Delete voice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setCloneOpen(true)} 
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-[#9758FF]/30 hover:border-[#9758FF]/60 hover:bg-[#9758FF]/5 text-[#9758FF] font-semibold text-[13px] transition-all cursor-pointer"
              >
                <Plus size={16} /> Clone New Voice
              </button>
            </div>
          </div>

          {/* Recent Audio Clips Section */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-wider">Recent Audio Clips</span>

              {clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="bg-[#9758FF]/10 p-4 rounded-2xl"><Volume2 size={26} className="text-[#9758FF]" /></div>
                  <div>
                    <p className="text-white text-[15px] font-semibold">No clips generated yet</p>
                    <p className="text-[#7A7A80] text-[13px] mt-1">Your speech generations will automatically show up here.</p>
                  </div>
                  <button 
                    onClick={openCreate} 
                    className="bg-[#9758FF]/10 hover:bg-[#9758FF]/20 border border-[#9758FF]/30 text-[#C9A8FF] px-5 py-2 rounded-xl font-semibold text-[13.5px] transition-all flex items-center gap-2"
                  >
                    <Plus size={16} /> New Speech
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {clips.map((h) => (
                    <div 
                      key={h.id} 
                      className="bg-[#08080A]/60 border border-white/[0.03] hover:border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 relative group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 text-[11px] text-[#5A5A60] mb-2 font-medium">
                            <span className="flex items-center gap-1"><Clock size={11} /> {new Date(h.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="bg-[#9758FF]/10 text-[#C9A8FF] px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                              <Mic size={10} /> Cloned Voice
                            </span>
                          </div>

                          <button 
                            onClick={() => openDetail(h)} 
                            className="text-left text-white font-medium text-[14px] leading-relaxed hover:text-[#9758FF] transition-colors line-clamp-2"
                          >
                            {h.prompt}
                          </button>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={() => openDetail(h)} 
                            className="p-2 text-[#7A7A80] hover:text-white hover:bg-white/[0.05] rounded-xl transition-all" 
                            title="View details"
                          >
                            <FileText size={15} />
                          </button>
                          <button 
                            onClick={() => downloadAudio(h.outputs[0].url, `vidora-voice-${h.id}.mp3`)} 
                            className="p-2 text-[#7A7A80] hover:text-white hover:bg-white/[0.05] rounded-xl transition-all" 
                            title="Download MP3"
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </div>

                      <AudioPlayer url={h.outputs[0].url} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {deletingVoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0f0f12] border border-white/[0.08] rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 text-[#F87171]">
                <div className="bg-[#F87171]/10 p-2.5 rounded-xl"><AlertCircle size={22} /></div>
                <h3 className="text-white text-[16px] font-bold">Delete Cloned Voice</h3>
              </div>
              <p className="text-[#7A7A80] text-[13px] leading-relaxed">
                Are you sure you want to delete "<span className="text-white font-medium">{deletingVoice.name}</span>"? This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setDeletingVoice(null)}
                  className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[#A1A1A5] py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    voiceApi.remove(deletingVoice.id)
                      .then(() => {
                        loadVoices();
                        toast.success("Voice deleted successfully");
                      })
                      .catch(() => {
                        toast.error("Failed to delete voice");
                      });
                    setDeletingVoice(null);
                  }}
                  className="flex-1 bg-[#F87171] hover:bg-[#EF4444] text-white py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-lg shadow-[#F87171]/10"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {cloneOpen && <CloneVoiceModal onClose={() => setCloneOpen(false)} onCreated={loadVoices} />}
      </div>
    );
  }

  // ---- DETAIL VIEW --------------------------------------------------------
  if (view === 'detail' && detailJob) {
    const wordCount = detailJob.prompt.split(/\s+/).filter(Boolean).length;
    const charCount = detailJob.prompt.length;

    const copyToClipboard = () => {
      navigator.clipboard.writeText(detailJob.prompt);
      toast.success("Script copied to clipboard!");
    };

    const handleReuseScript = () => {
      setText(detailJob.prompt);
      const targetVoiceId = detailJob.input_params?.voice || detailJob.input_params?.stock_voice_id;
      if (targetVoiceId) {
        const matchingCloned = voices.find(v => v.id === targetVoiceId);
        if (matchingCloned) {
          setSelected({ kind: 'cloned', id: matchingCloned.id, name: matchingCloned.name });
        }
      }
      setView('create');
    };

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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Script / Prompt details */}
          <div className="lg:col-span-7 bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-[#9758FF]" /> Script Transcript
              </span>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-[12px] text-[#9758FF] hover:text-[#a873ff] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#9758FF]/5 font-semibold"
              >
                <Copy size={13} /> Copy Script
              </button>
            </div>

            <div className="bg-[#08080A]/60 border border-white/[0.03] rounded-2xl p-5 min-h-[200px] max-h-[400px] overflow-y-auto">
              <p className="text-white text-[14.5px] leading-relaxed whitespace-pre-wrap font-normal">
                {detailJob.prompt || 'No prompt content.'}
              </p>
            </div>

            <div className="flex items-center gap-4 text-[12px] text-[#5A5A60] px-1 font-semibold">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
            </div>
          </div>

          {/* Right Column: Audio details */}
          <div className="lg:col-span-5 bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex flex-col gap-5">
            <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-wider font-semibold">Audio Output & Specs</span>

            <div className="flex flex-col gap-3">
              <AudioPlayer url={detailJob.outputs[0].url} />
            </div>

            <div className="bg-[#08080A]/40 border border-white/[0.03] rounded-2xl p-4 flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-[12.5px] py-0.5">
                <span className="text-[#5A5A60] font-semibold">Generated Date</span>
                <span className="text-white font-medium">{new Date(detailJob.created_at).toLocaleString()}</span>
              </div>
              <div className="h-[1px] bg-white/[0.03]" />
              <div className="flex justify-between items-center text-[12.5px] py-0.5">
                <span className="text-[#5A5A60] font-semibold">Cost</span>
                <span className="text-white font-medium">{detailJob.credits_cost || '5'} Credits</span>
              </div>
              <div className="h-[1px] bg-white/[0.03]" />
              <div className="flex justify-between items-center text-[12.5px] py-0.5">
                <span className="text-[#5A5A60] font-semibold">Service Type</span>
                <span className="text-[#9758FF] font-semibold flex items-center gap-1">
                  <Volume2 size={13} /> Text-to-Speech
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => downloadAudio(detailJob.outputs[0].url, `vidora-voice-${detailJob.id}.mp3`)}
                className="w-full bg-[#9758FF] hover:bg-[#854EE6] text-white py-3 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.25)] hover:scale-[1.01] active:scale-[0.99]"
              >
                <Download size={16} /> Download MP3
              </button>
              <button 
                onClick={handleReuseScript}
                className="w-full bg-[#9758FF]/10 hover:bg-[#9758FF]/15 border border-[#9758FF]/20 text-[#C9A8FF] py-3 rounded-2xl font-bold text-[13.5px] transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <RefreshCw size={15} /> Re-use Script / Prompt
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
                <div className="w-full">
                  <AudioPlayer url={job.outputs[0].url} />
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
