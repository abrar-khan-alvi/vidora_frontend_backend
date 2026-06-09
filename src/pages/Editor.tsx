import { useEffect, useRef, useState } from 'react';
import {
  Scissors, Upload, Mic, Play, Pause, SkipBack, Square, Plus, X, Download,
  ChevronLeft, ChevronRight, Sparkles, AlertCircle, Check, RefreshCw, Film,
  Volume2, Trash2, Clock, ListMusic, ScissorsLineDashed, Video as VideoIcon,
  Wand2, Loader2, Share2, Copy, ExternalLink, Music, AudioLines,
} from 'lucide-react';
import {
  generationApi, pollJob,
  type GenerationJob,
} from '../lib/api/generation';
import { studioApi, uploadMediaAsset, publicationApi, type UploadedAsset, type Publication } from '../lib/api/studio';
import { voiceApi, type Voice, type VoiceSelection } from '../lib/api/voice';
import { VoicePickerModal } from '../components/VoicePickerModal';
import { useCreationFlow } from '../lib/creationFlow';
import { useToast } from '../components/Toast';

type VoMode = 'replace' | 'mix';
type PlayMode = 'sequence' | 'selection' | 'record' | null;

interface Clip {
  id: string;
  assetId: string;
  url: string;
  name: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
}

interface Voiceover {
  id: string;
  url: string;
  name: string;
  duration: number;
}

interface AudioLayer {
  id: string;        // local id
  assetId: string;
  url: string;
  name: string;
  kind: 'music' | 'sfx';
  offset: number;    // seconds into the sequence
  volume: number;    // 0..2
  duration: number;
}

/** m:ss(.t) from seconds. */
function fmt(s: number, withTenths = false): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const base = `${m}:${sec.toString().padStart(2, '0')}`;
  if (!withTenths) return base;
  return `${base}.${Math.floor((s % 1) * 10)}`;
}

const trimmed = (c: Clip) => Math.max(0, c.trimEnd - c.trimStart);

/** Load a video's duration without mounting it. */
function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve(isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => resolve(0);
    v.src = url;
  });
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

// --- A modal that lists the user's media Assets (video or audio) to pick from -
const MediaPickerModal = ({
  type, title, onPick, onClose,
}: {
  type: 'video' | 'audio';
  title: string;
  onPick: (a: UploadedAsset) => void;
  onClose: () => void;
}) => {
  const [items, setItems] = useState<UploadedAsset[] | null>(null);
  useEffect(() => {
    studioApi.listMedia(type).then(setItems).catch(() => setItems([]));
  }, [type]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#131316] border border-white/[0.08] rounded-2xl w-full max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-white font-semibold text-[15px]">{title}</h3>
          <button onClick={onClose} className="text-[#7A7A80] hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          {items === null ? (
            <div className="py-12 text-center text-[#7A7A80] text-[13px]">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-[#7A7A80] text-[13px]">
              Nothing here yet. {type === 'audio' ? 'Generate a voiceover or upload audio.' : 'Generate or upload a video first.'}
            </div>
          ) : type === 'video' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((a) => (
                <button key={a.id} onClick={() => { onPick(a); onClose(); }} className="group flex flex-col gap-1.5 text-left">
                  <div className="aspect-video rounded-lg overflow-hidden border border-white/[0.06] group-hover:border-[#9758FF]/50 bg-black">
                    <video src={a.url} muted className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] text-[#A1A1A5] line-clamp-1">{a.name || 'Video'}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { onPick(a); onClose(); }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-[#9758FF]/50 hover:bg-white/[0.02] text-left transition-all"
                >
                  <div className="bg-[#9758FF]/10 p-2 rounded-lg shrink-0"><Volume2 size={16} className="text-[#9758FF]" /></div>
                  <span className="text-[13px] text-white flex-1 line-clamp-1">{a.name || 'Audio clip'}</span>
                  <audio src={a.url} controls className="h-8 max-w-[200px]" onClick={(e) => e.stopPropagation()} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Per-clip trim bar: ruler + dim-outside-selection + drag handles ---------
const TrimBar = ({
  duration, trimStart, trimEnd, currentTime, onSeek, setTrimStart, setTrimEnd,
}: {
  duration: number;
  trimStart: number;
  trimEnd: number;
  currentTime: number;
  onSeek: (t: number) => void;
  setTrimStart: (t: number) => void;
  setTrimEnd: (t: number) => void;
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<null | 'start' | 'end'>(null);

  const pct = (t: number) => (duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0);
  const fracFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  // Drag via window listeners — survives re-renders (pointer capture on an
  // element does not, because the element can remount mid-drag). The opposite
  // bound is captured at press time; it's constant for the duration of a drag.
  const beginHandleDrag = (which: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!duration) return;
    setDragging(which);
    const otherStart = trimStart;
    const otherEnd = trimEnd;
    const move = (ev: PointerEvent) => {
      const t = fracFromX(ev.clientX) * duration;
      if (which === 'start') setTrimStart(Math.max(0, Math.min(t, otherEnd - 0.1)));
      else setTrimEnd(Math.min(duration, Math.max(t, otherStart + 0.1)));
    };
    const up = () => {
      setDragging(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const beginSeek = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!duration) return;
    onSeek(fracFromX(e.clientX) * duration);
    const move = (ev: PointerEvent) => onSeek(fracFromX(ev.clientX) * duration);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const step = duration <= 6 ? 1 : duration <= 20 ? 2 : duration <= 60 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 0.001; t += step) ticks.push(t);

  const handleClass = (which: 'start' | 'end') =>
    `absolute top-0 bottom-0 w-7 -ml-3.5 cursor-ew-resize flex items-center justify-center z-30 group touch-none ${dragging === which ? 'scale-y-105' : ''}`;
  const knobClass = (which: 'start' | 'end') =>
    `h-full w-1.5 rounded-full bg-[#9758FF] group-hover:bg-[#B98BFF] shadow-[0_0_8px_rgba(151,88,255,0.7)] transition-all ${dragging === which ? 'w-2 bg-[#B98BFF]' : ''}`;

  return (
    <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-xl p-3.5 select-none">
      <div className="flex items-center gap-2 mb-2.5">
        <ScissorsLineDashed size={13} className="text-[#9758FF]" />
        <span className="text-[10.5px] uppercase tracking-wider text-[#9758FF] font-semibold">Trim this clip</span>
        <span className="ml-auto text-[11px] text-[#A1A1A5] font-mono">
          In {fmt(trimStart, true)} · Out {fmt(trimEnd, true)} · <span className="text-white">{fmt(Math.max(0, trimEnd - trimStart), true)}</span>
        </span>
      </div>

      <div className="relative h-5 cursor-text touch-none" onPointerDown={beginSeek}>
        {ticks.map((t) => (
          <div key={t} className="absolute top-0 h-full pointer-events-none" style={{ left: `${pct(t)}%` }}>
            <div className="w-px h-2 bg-white/15" />
            <span className="text-[9px] text-[#5A5A60] font-mono mt-0.5 block -translate-x-1/2">{fmt(t)}</span>
          </div>
        ))}
      </div>

      {/* Wrapper is NOT clipped so the edge handles stay fully grabbable. */}
      <div className="relative mt-1">
        <div
          ref={trackRef}
          className="relative h-12 rounded-lg bg-[#08080A] border border-white/[0.05] overflow-hidden cursor-pointer touch-none"
          onPointerDown={beginSeek}
        >
          <div className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none" style={{ width: `${pct(trimStart)}%` }} />
          <div className="absolute inset-y-0 bg-black/55 pointer-events-none" style={{ left: `${pct(trimEnd)}%`, right: 0 }} />
          <div
            className="absolute inset-y-0 bg-gradient-to-b from-[#9758FF]/25 to-[#6A39C4]/20 border-x-2 border-[#9758FF] pointer-events-none"
            style={{ left: `${pct(trimStart)}%`, width: `${Math.max(0, pct(trimEnd) - pct(trimStart))}%` }}
          />
          <div className="absolute top-0 bottom-0 w-px bg-white pointer-events-none z-20" style={{ left: `${pct(currentTime)}%` }}>
            <div className="w-2 h-2 -ml-1 -mt-0.5 rotate-45 bg-white rounded-[2px]" />
          </div>
        </div>

        {/* Handles overlay the track but live outside the clipped box. */}
        <div onPointerDown={beginHandleDrag('start')} className={handleClass('start')} style={{ left: `${pct(trimStart)}%` }} title="Drag to set the start">
          <div className={knobClass('start')} />
        </div>
        <div onPointerDown={beginHandleDrag('end')} className={handleClass('end')} style={{ left: `${pct(trimEnd)}%` }} title="Drag to set the end">
          <div className={knobClass('end')} />
        </div>
      </div>
    </div>
  );
};

export const EditorContent = () => {
  const toast = useToast();
  const flow = useCreationFlow();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const voAudioRef = useRef<HTMLAudioElement | null>(null); // synced voiceover preview
  const layerAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({}); // music/SFX preview

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [history, setHistory] = useState<GenerationJob[]>([]);

  // Sequence of clips + which one is loaded in the monitor.
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0); // within the selected clip
  const [playing, setPlaying] = useState(false);

  // Voiceover
  const [voiceover, setVoiceover] = useState<Voiceover | null>(null);
  const [voMode, setVoMode] = useState<VoMode>('replace');
  const [voMenu, setVoMenu] = useState(false);
  const [voStart, setVoStart] = useState(0); // offset (s) into the sequence
  const voLaneRef = useRef<HTMLDivElement | null>(null);

  // Music / SFX layers
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  const [audioPanel, setAudioPanel] = useState<null | 'music' | 'sfx'>(null);
  const [fxPrompt, setFxPrompt] = useState('');
  const [fxLoading, setFxLoading] = useState(false);
  const [autoScoring, setAutoScoring] = useState(false); // AI is picking music + SFX
  const audioLaneRef = useRef<HTMLDivElement | null>(null);

  // Script → AI voiceover
  const [scriptPanel, setScriptPanel] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([]);
  const [voiceSel, setVoiceSel] = useState<VoiceSelection | null>(null);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [synthLoading, setSynthLoading] = useState(false);

  // Pickers — 'source-add' appends a clip; 'source-init' starts a new edit.
  const [picker, setPicker] = useState<null | 'source-init' | 'source-add' | 'audio'>(null);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<any>(null);

  // Playback control (refs so the inline timeupdate handler stays current)
  const playModeRef = useRef<PlayMode>(null);
  const pendingRef = useRef<{ seek: number; autoplay: boolean } | null>(null);

  // Render job
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [running, setRunning] = useState(false);
  // A past edit opened from the gallery for playback.
  const [previewEdit, setPreviewEdit] = useState<GenerationJob | null>(null);

  // Publish
  const [publishTitle, setPublishTitle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);

  const audioFileRef = useRef<HTMLInputElement | null>(null);

  const selectedClip = clips[selectedIndex] ?? null;
  const totalDuration = clips.reduce((sum, c) => sum + trimmed(c), 0);
  // Sequence position = clips before the selected one + offset within it.
  const seqOffset = clips.slice(0, selectedIndex).reduce((sum, c) => sum + trimmed(c), 0);
  const seqPos = selectedClip ? seqOffset + Math.max(0, currentTime - selectedClip.trimStart) : 0;

  const loadHistory = () => generationApi.listEdits().then(setHistory).catch(() => { });
  const loadPublications = () => publicationApi.list().then(setPublications).catch(() => { });
  useEffect(() => { loadHistory(); loadPublications(); }, []);
  useEffect(() => { voiceApi.list().then(setClonedVoices).catch(() => { }); }, []);

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  }, []);

  const resetEdit = () => {
    setClips([]);
    setSelectedIndex(0);
    setVoiceover(null);
    setVoMode('replace');
    setVoMenu(false);
    setVoStart(0);
    setScriptPanel(false);
    setScriptText('');
    setVoiceSel(null);
    setAudioLayers([]);
    setAudioPanel(null);
    setAutoScoring(false);
    setFxPrompt('');
    setCurrentTime(0);
    setPlaying(false);
    playModeRef.current = null;
    pendingRef.current = null;
    setJob(null);
  };

  const makeClip = async (a: UploadedAsset): Promise<Clip> => {
    const duration = await probeDuration(a.url);
    return {
      id: crypto.randomUUID(),
      assetId: a.id, url: a.url, name: a.name || 'Clip',
      duration, trimStart: 0, trimEnd: duration || 0,
    };
  };

  const startNewEdit = async (a: UploadedAsset) => {
    const clip = await makeClip(a);
    resetEdit();
    setClips([clip]);
    setSelectedIndex(0);
    pendingRef.current = { seek: 0, autoplay: false };
    setView('edit');
  };

  const addClip = async (a: UploadedAsset) => {
    const clip = await makeClip(a);
    setClips((prev) => [...prev, clip]);
  };

  // Video → edit handoff: arrive here with a finished video as the first clip.
  useEffect(() => {
    const h = flow.consumeEdit();
    if (h) startNewEdit({ id: h.sourceAssetId, url: h.sourceUrl, name: h.name || 'Clip' } as UploadedAsset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Monitor / playback --------------------------------------------------
  const applyPending = () => {
    const v = videoRef.current;
    const p = pendingRef.current;
    if (!v || !p) return;
    v.currentTime = p.seek;
    setCurrentTime(p.seek);
    if (p.autoplay) {
      v.muted = playModeRef.current === 'record';
      v.play().catch(() => { });
    }
    pendingRef.current = null;
  };

  const onMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (isFinite(d) && d > 0) {
      // The mounted video is the source of truth for duration. Reset the trim
      // only if it's uninitialized or invalid (self-heals a collapsed selection).
      setClips((prev) => prev.map((c, i) => {
        if (i !== selectedIndex) return c;
        const invalid = !c.duration || c.trimEnd <= c.trimStart || c.trimEnd > d + 0.1 || c.trimStart >= d;
        return invalid ? { ...c, duration: d, trimStart: 0, trimEnd: d } : { ...c, duration: d };
      }));
    }
    applyPending();
  };

  // Load clip `index`, seek to `localTime`, optionally autoplay.
  const goToClip = (index: number, localTime: number, autoplay: boolean) => {
    pendingRef.current = { seek: localTime, autoplay };
    if (index === selectedIndex) applyPending();
    else setSelectedIndex(index); // src changes → onMeta applies pending
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    const dur = selectedClip?.duration || 0;
    const clamped = Math.min(Math.max(0, t), dur);
    if (v) v.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Keep the voiceover audio playing in time with the sequence position,
  // honoring the start offset and replace/mix mode. Called every tick + on play.
  const syncVoiceover = () => {
    const v = videoRef.current;
    const a = voAudioRef.current;
    const clip = clips[selectedIndex];
    if (!v || !a || !voiceover || !clip) return;

    const previewing = playModeRef.current === 'sequence' || playModeRef.current === 'selection';
    if (!previewing || v.paused) {
      if (!a.paused) a.pause();
      return;
    }

    // How the original audio sits under the voiceover (mirrors the render).
    v.muted = voMode === 'replace';
    v.volume = voMode === 'mix' ? 0.3 : 1;

    const offset = clips.slice(0, selectedIndex).reduce((s, c) => s + trimmed(c), 0);
    const pos = offset + Math.max(0, v.currentTime - clip.trimStart);
    const desired = pos - voStart;
    const voDur = voiceover.duration || (isFinite(a.duration) ? a.duration : 0);

    if (desired >= 0 && (voDur === 0 || desired < voDur)) {
      if (Math.abs(a.currentTime - desired) > 0.25) a.currentTime = Math.max(0, desired);
      if (a.paused) a.play().catch(() => { });
    } else if (!a.paused) {
      a.pause();
    }
  };

  // Keep each music/SFX layer playing in time with the sequence position —
  // honoring its start offset, duration, and volume (mirrors the render mix).
  const syncLayers = () => {
    const v = videoRef.current;
    const clip = clips[selectedIndex];
    if (!v || !clip) return;
    const previewing = playModeRef.current === 'sequence' || playModeRef.current === 'selection';
    const offset = clips.slice(0, selectedIndex).reduce((s, c) => s + trimmed(c), 0);
    const pos = offset + Math.max(0, v.currentTime - clip.trimStart);
    for (const L of audioLayers) {
      const a = layerAudioRefs.current[L.id];
      if (!a) continue;
      if (!previewing || v.paused) { if (!a.paused) a.pause(); continue; }
      const desired = pos - L.offset;
      const dur = L.duration || (isFinite(a.duration) ? a.duration : 0);
      if (desired >= 0 && (dur === 0 || desired < dur)) {
        a.volume = Math.min(1, Math.max(0, L.volume));
        if (Math.abs(a.currentTime - desired) > 0.25) a.currentTime = Math.max(0, desired);
        if (a.paused) a.play().catch(() => { });
      } else if (!a.paused) {
        a.pause();
      }
    }
  };

  const pauseAllLayers = () => {
    for (const a of Object.values(layerAudioRefs.current)) {
      if (a && !a.paused) a.pause();
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    syncVoiceover();
    syncLayers();
    const clip = clips[selectedIndex];
    if (!clip) return;
    const mode = playModeRef.current;
    if (v.currentTime >= clip.trimEnd - 0.04) {
      if ((mode === 'sequence' || mode === 'record') && selectedIndex < clips.length - 1) {
        const next = clips[selectedIndex + 1];
        goToClip(selectedIndex + 1, next.trimStart, true);
      } else if (mode === 'selection' || mode === 'sequence' || mode === 'record') {
        v.pause();
        playModeRef.current = null;
      }
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !selectedClip) return;
    if (!v.paused) { v.pause(); playModeRef.current = null; return; }
    playModeRef.current = 'sequence';
    let t = currentTime;
    if (t < selectedClip.trimStart || t >= selectedClip.trimEnd - 0.04) t = selectedClip.trimStart;
    goToClip(selectedIndex, t, true);
  };

  // Preview just the selected clip's trimmed range.
  const previewTrim = () => {
    if (!selectedClip) return;
    playModeRef.current = 'selection';
    goToClip(selectedIndex, selectedClip.trimStart, true);
  };

  const selectClip = (index: number) => {
    playModeRef.current = null;
    goToClip(index, clips[index]?.trimStart ?? 0, false);
  };

  const moveClip = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= clips.length) return;
    setClips((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setSelectedIndex(j);
  };

  const removeClip = (index: number) => {
    setClips((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((cur) => Math.max(0, cur >= index ? cur - 1 : cur));
  };

  const setClipTrim = (which: 'start' | 'end', t: number) => {
    setClips((prev) => prev.map((c, i) => {
      if (i !== selectedIndex) return c;
      if (which === 'start') return { ...c, trimStart: Math.min(Math.max(0, t), c.trimEnd - 0.1) };
      return { ...c, trimEnd: Math.min(Math.max(t, c.trimStart + 0.1), c.duration || c.trimEnd) };
    }));
  };

  // --- Voiceover -----------------------------------------------------------
  const applyVoiceover = async (id: string, url: string, name: string) => {
    const duration = await probeDuration(url);
    setVoiceover({ id, url, name, duration });
    setVoMode('replace');
    setVoStart(0);
  };

  const onAudioUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const a = await uploadMediaAsset(file);
      await applyVoiceover(a.id, a.url, a.name || 'Voiceover');
    } catch {
      toast.error('Could not upload that audio.');
    }
  };

  // Open the "generate from script" panel, prefilling the assistant's script.
  const openScriptPanel = () => {
    if (!scriptText.trim() && flow.script) setScriptText(flow.script);
    setScriptPanel(true);
  };

  // Turn the script into speech (ElevenLabs TTS), then attach it as the voiceover.
  const generateScriptVoiceover = async () => {
    const text = scriptText.trim();
    if (!text) { toast.error('Write a script first.'); return; }
    if (!voiceSel) { toast.error('Choose a voice first.'); return; }
    setSynthLoading(true);
    try {
      const params = voiceSel.kind === 'cloned'
        ? { voice: voiceSel.id, text }
        : { stock_voice_id: voiceSel.id, text };
      const created = await generationApi.createTTS(params);
      const final = await pollJob(created.id, () => { });
      if (final.status === 'succeeded' && final.outputs[0]) {
        await applyVoiceover(final.outputs[0].id, final.outputs[0].url, 'Voiceover from script');
        setScriptPanel(false);
      } else {
        toast.error('Voiceover generation failed.');
      }
    } catch {
      toast.error('Could not generate the voiceover.');
    } finally {
      setSynthLoading(false);
    }
  };

  // Drag the voiceover block along the sequence to set when it starts.
  // Window listeners (not pointer capture) so it survives the re-renders that
  // every setVoStart triggers.
  const onVoDown = (e: React.PointerEvent) => {
    if (!voiceover) return;
    e.preventDefault();
    const el = voLaneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = Math.max(totalDuration, 0.001);
    const tAt = (cx: number) => ((cx - rect.left) / rect.width) * total;
    const grab = tAt(e.clientX) - voStart;
    const move = (ev: PointerEvent) =>
      setVoStart(Math.min(Math.max(0, tAt(ev.clientX) - grab), Math.max(0, totalDuration)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startRecording = async () => {
    if (!clips.length) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voiceover-${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          const a = await uploadMediaAsset(file);
          await applyVoiceover(a.id, a.url, 'Recorded voiceover');
          toast.success('Voiceover recorded.');
        } catch {
          toast.error('Could not save the recording.');
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);

      // Play the whole sequence (muted) from the top so the voiceover lines up.
      playModeRef.current = 'record';
      goToClip(0, clips[0].trimStart, true);
    } catch {
      toast.error('Microphone access was denied.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    playModeRef.current = null;
    const v = videoRef.current;
    if (v) { v.pause(); v.muted = false; }
  };

  // --- Music / SFX ---------------------------------------------------------
  const openAudioPanel = (kind: 'music' | 'sfx') => {
    setAudioPanel(kind);
    setFxPrompt(kind === 'music' ? (flow.musicPrompt || fxPrompt) : '');
  };

  const generateAudioFx = async () => {
    const prompt = fxPrompt.trim();
    if (!prompt || !audioPanel) { toast.error('Describe the sound first.'); return; }
    setFxLoading(true);
    try {
      const length = audioPanel === 'music'
        ? Math.max(10, Math.round(totalDuration) || 10)  // music floor is ~10s
        : undefined;
      const created = await generationApi.createAudioFx({ audio_type: audioPanel, prompt, length });
      const final = await pollJob(created.id, () => { });
      if (final.status === 'succeeded' && final.outputs[0]) {
        const out = final.outputs[0];
        const dur = await probeDuration(out.url);
        setAudioLayers((prev) => [...prev, {
          id: crypto.randomUUID(),
          assetId: out.id, url: out.url,
          name: audioPanel === 'music' ? 'Background music' : 'Sound effect',
          kind: audioPanel,
          offset: audioPanel === 'sfx' ? Math.max(0, seqPos) : 0,
          volume: audioPanel === 'music' ? 0.18 : 0.8,
          duration: dur,
        }]);
        setAudioPanel(null);
        setFxPrompt('');
      } else {
        toast.error('Audio generation failed.');
      }
    } catch {
      toast.error('Could not generate that audio.');
    } finally {
      setFxLoading(false);
    }
  };

  // Generate one music/SFX layer from a finished prompt and return it (or null).
  const genLayer = async (
    kind: 'music' | 'sfx', prompt: string, offset: number, length?: number,
  ): Promise<AudioLayer | null> => {
    const created = await generationApi.createAudioFx({ audio_type: kind, prompt, length });
    const final = await pollJob(created.id, () => { });
    if (final.status !== 'succeeded' || !final.outputs[0]) return null;
    const out = final.outputs[0];
    const dur = await probeDuration(out.url);
    return {
      id: crypto.randomUUID(),
      assetId: out.id, url: out.url,
      name: kind === 'music' ? 'Background music' : 'Sound effect',
      kind,
      offset: Math.max(0, offset),
      volume: kind === 'music' ? 0.18 : 0.8,
      duration: dur,
    };
  };

  // What the AI should know about the video to pick fitting audio.
  const buildAudioBrief = () => {
    const parts: string[] = [];
    if (flow.musicPrompt) parts.push(`Suggested music direction: ${flow.musicPrompt}`);
    if (flow.character) parts.push(`Featured character: ${flow.character.name}`);
    parts.push(flow.script ? `Voiceover script:\n${flow.script}` : 'This video has no voiceover.');
    if (clips.length) parts.push(`Clips in the edit: ${clips.map((c) => c.name).join(', ')}`);
    return parts.join('\n\n') || 'A short social video.';
  };

  // One click: the AI decides the music + sound effects and lays them under the
  // video — the creator never types an audio prompt.
  const autoScore = async () => {
    if (!clips.length) { toast.error('Add a clip first.'); return; }
    if (autoScoring || fxLoading) return;
    setAutoScoring(true);
    try {
      const plan = await generationApi.suggestAudio(buildAudioBrief(), totalDuration);
      const tasks: Promise<AudioLayer | null>[] = [];
      if (plan.music) {
        const musicLen = Math.max(10, Math.round(totalDuration) || 10);
        tasks.push(genLayer('music', plan.music, 0, musicLen));
      }
      for (const s of plan.sfx || []) {
        tasks.push(genLayer('sfx', s.description, Math.min(s.at, totalDuration)));
      }
      if (!tasks.length) { toast.error('The AI found no audio that fits this video.'); return; }
      const layers = (await Promise.all(tasks)).filter(Boolean) as AudioLayer[];
      if (!layers.length) { toast.error('Audio generation failed — please try again.'); return; }
      setAudioLayers((prev) => [...prev, ...layers]);
      toast.success(`AI scored your video — added ${layers.length} track${layers.length > 1 ? 's' : ''}.`);
    } catch {
      toast.error('Could not auto-score this video.');
    } finally {
      setAutoScoring(false);
    }
  };

  const removeLayer = (id: string) => setAudioLayers((prev) => prev.filter((l) => l.id !== id));
  const setLayerVolume = (id: string, v: number) =>
    setAudioLayers((prev) => prev.map((l) => (l.id === id ? { ...l, volume: v } : l)));

  // Drag an audio layer along the sequence to set when it starts.
  const onLayerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = audioLaneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = Math.max(totalDuration, 0.001);
    const tAt = (cx: number) => ((cx - rect.left) / rect.width) * total;
    const layer = audioLayers.find((l) => l.id === id);
    const grab = tAt(e.clientX) - (layer?.offset ?? 0);
    const move = (ev: PointerEvent) => {
      const off = Math.min(Math.max(0, tAt(ev.clientX) - grab), Math.max(0, totalDuration));
      setAudioLayers((prev) => prev.map((l) => (l.id === id ? { ...l, offset: off } : l)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // --- Render --------------------------------------------------------------
  const isWorking = job && ['queued', 'submitted', 'processing'].includes(job.status);

  const publish = async () => {
    if (!job?.outputs[0] || publishing) return;
    setPublishing(true);
    try {
      const pub = await publicationApi.create(job.outputs[0].id, publishTitle.trim());
      setPublication(pub);
      loadPublications();
      toast.success('Published — your share link is ready.');
    } catch {
      toast.error('Could not publish that video.');
    } finally {
      setPublishing(false);
    }
  };

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  const render = async () => {
    if (!clips.length || running) return;
    if (recording) { toast.error('Stop the recording first.'); return; }
    setRunning(true);
    setPublication(null);
    setPublishTitle('');
    try {
      const created = await generationApi.createEdit({
        clips: clips.map((c) => ({
          source: c.assetId,
          trim_start: c.trimStart,
          trim_end: c.trimEnd >= c.duration - 0.05 ? null : c.trimEnd,
        })),
        voiceover: voiceover?.id ?? null,
        voiceover_mode: voiceover ? voMode : 'keep',
        voiceover_offset: voiceover ? voStart : 0,
        audio_layers: audioLayers.map((l) => ({ source: l.assetId, offset: l.offset, volume: l.volume })),
      });
      setJob(created);
      await pollJob(created.id, setJob);
    } catch {
      setJob((j) => (j ? { ...j, status: 'failed', error: 'Request failed.' } : j));
      toast.error('Could not start the render.');
    } finally {
      setRunning(false);
      loadHistory();
    }
  };

  const gallery = history.filter((h) => h.status === 'succeeded' && h.outputs.length > 0);

  // ---- LIST VIEW -----------------------------------------------------------
  if (view === 'list') {
    return (
      <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10">
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#9758FF]/10 p-2 rounded-lg"><Scissors size={20} className="text-[#9758FF]" /></div>
            <div>
              <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">Edit &amp; Voiceover</h1>
              <p className="text-[#7A7A80] text-[13px]">Join &amp; trim your clips, then add a voiceover — record, upload, or reuse one.</p>
            </div>
          </div>
          <button
            onClick={() => setPicker('source-init')}
            className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
          >
            <Plus size={18} /> New Edit
          </button>
        </div>

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((h) => (
              <div key={h.id} className="group flex flex-col gap-2">
                <div
                  onClick={() => setPreviewEdit(h)}
                  className="aspect-video rounded-xl overflow-hidden border border-white/[0.06] hover:border-[#9758FF]/40 bg-black relative cursor-pointer transition-all"
                >
                  <video src={h.outputs[0].url} muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play size={15} className="text-white ml-0.5" />
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadVideo(h.outputs[0].url, `vidora-edit-${h.outputs[0].id}.mp4`); }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download"
                  >
                    <Download size={13} />
                  </button>
                </div>
                <span className="text-[12px] text-[#A1A1A5] line-clamp-1 px-0.5">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="bg-[#9758FF]/10 p-4 rounded-2xl"><Scissors size={28} className="text-[#9758FF]" /></div>
            <div>
              <p className="text-white text-[15px] font-semibold">No edits yet</p>
              <p className="text-[#7A7A80] text-[13px] mt-1">Pick clips, trim &amp; join them, drop a voiceover on top.</p>
            </div>
            <button
              onClick={() => setPicker('source-init')}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Edit
            </button>
          </div>
        )}

        {publications.length > 0 && (
          <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Share2 size={15} className="text-[#9758FF]" />
              <span className="text-[14px] font-semibold text-white">Published</span>
              <span className="text-[11px] text-[#5A5A60]">{publications.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {publications.map((p) => (
                <div key={p.id} className="group flex flex-col gap-2">
                  <div className="aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-black relative">
                    <video src={p.video_url} muted className="w-full h-full object-cover" />
                    <a
                      href={shareUrl(p.share_token)}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Open share page"
                    >
                      <span className="bg-white/20 backdrop-blur-sm rounded-full p-2.5"><ExternalLink size={15} className="text-white" /></span>
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 px-0.5">
                    <span className="text-[12px] text-[#A1A1A5] line-clamp-1 flex-1">{p.title || 'Untitled'}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl(p.share_token)); toast.success('Link copied'); }}
                      className="text-[#7A7A80] hover:text-[#9758FF] shrink-0"
                      title="Copy share link"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {picker === 'source-init' && (
          <MediaPickerModal type="video" title="Choose a video to start" onPick={startNewEdit} onClose={() => setPicker(null)} />
        )}

        {/* Play a past edit */}
        {previewEdit && previewEdit.outputs[0] && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewEdit(null)}
          >
            <div
              className="w-full max-w-[900px] bg-[#0E0E11] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Scissors size={15} className="text-[#9758FF]" />
                  <span className="text-white font-semibold text-[14px]">Edit · {new Date(previewEdit.created_at).toLocaleDateString()}</span>
                </div>
                <button onClick={() => setPreviewEdit(null)} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"><X size={18} /></button>
              </div>
              <div className="bg-black flex items-center justify-center">
                <video src={previewEdit.outputs[0].url} controls autoPlay loop className="max-h-[65vh] w-auto max-w-full block" />
              </div>
              <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-white/[0.06]">
                <button
                  onClick={() => downloadVideo(previewEdit.outputs[0].url, `vidora-edit-${previewEdit.outputs[0].id}.mp4`)}
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[#C4C4C8] px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                >
                  <Download size={15} /> Download
                </button>
                <button
                  onClick={() => {
                    const out = previewEdit.outputs[0];
                    setPreviewEdit(null);
                    startNewEdit({ id: out.id, url: out.url, name: 'Edit' } as UploadedAsset);
                  }}
                  className="flex items-center gap-2 bg-[#9758FF] hover:bg-[#854EE6] text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                >
                  <Scissors size={15} /> Edit again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- EDIT VIEW (NLE layout) ---------------------------------------------
  return (
    <div className="flex-1 w-full max-w-[1180px] flex flex-col gap-4 pb-10">
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => { setView('list'); resetEdit(); }}
          className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[14px] font-medium">Back to library</span>
        </button>
        <div className="ml-auto flex items-center gap-2 text-[#7A7A80]">
          <Scissors size={16} className="text-[#9758FF]" />
          <span className="text-[13px] font-semibold text-white">Edit &amp; Voiceover</span>
        </div>
      </div>

      {selectedClip && (
        <div className="flex flex-col gap-4">
          {/* Monitor + Inspector */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            {/* Monitor */}
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black flex items-center justify-center min-h-[280px]">
                <video
                  ref={videoRef}
                  src={selectedClip.url}
                  onLoadedMetadata={onMeta}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => { setPlaying(true); syncVoiceover(); syncLayers(); }}
                  onPause={() => {
                    setPlaying(false);
                    // Only stop the audio when playback truly ends — not on the
                    // transient pause that happens while switching clips.
                    if (playModeRef.current === null) {
                      if (voAudioRef.current && !voAudioRef.current.paused) voAudioRef.current.pause();
                      pauseAllLayers();
                    }
                  }}
                  onClick={togglePlay}
                  className="max-h-[44vh] w-auto max-w-full block cursor-pointer"
                />
                {voiceover && <audio ref={voAudioRef} src={voiceover.url} preload="auto" className="hidden" />}
                {audioLayers.map((L) => (
                  <audio
                    key={L.id}
                    ref={(el) => { layerAudioRefs.current[L.id] = el; }}
                    src={L.url}
                    preload="auto"
                    className="hidden"
                  />
                ))}
              </div>

              {/* Transport */}
              <div className="flex items-center gap-3 bg-[#131316]/70 border border-white/[0.06] rounded-xl px-4 py-2.5">
                <button onClick={() => seek(selectedClip.trimStart)} title="Jump to In point" className="text-[#A1A1A5] hover:text-white transition-colors">
                  <SkipBack size={16} />
                </button>
                <button onClick={togglePlay} className="bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-full p-2 transition-colors" title={playing ? 'Pause' : 'Play sequence'}>
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button onClick={previewTrim} className="text-[11.5px] text-[#C9A8FF] hover:text-white transition-colors flex items-center gap-1.5" title="Play just this clip's trim">
                  <Film size={13} /> Play clip
                </button>
                <span className="text-[11px] text-[#5A5A60]">Clip {selectedIndex + 1}/{clips.length}</span>
                <span className="ml-auto text-[12.5px] font-mono text-[#A1A1A5]">
                  {fmt(seqPos, true)} <span className="text-[#5A5A60]">/ {fmt(totalDuration)}</span>
                </span>
              </div>

              {/* Per-clip trim bar */}
              <TrimBar
                duration={selectedClip.duration}
                trimStart={selectedClip.trimStart}
                trimEnd={selectedClip.trimEnd}
                currentTime={currentTime}
                onSeek={seek}
                setTrimStart={(t) => setClipTrim('start', t)}
                setTrimEnd={(t) => setClipTrim('end', t)}
              />
            </div>

            {/* Inspector */}
            <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
              <div className="bg-[#131316]/70 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Mic size={15} className="text-[#9758FF]" />
                  <span className="text-[13px] font-semibold text-white">Voiceover</span>
                  <span className="text-[11px] text-[#5A5A60]">(optional)</span>
                </div>

                {recording ? (
                  <div className="bg-[#08080A]/60 border border-white/[0.05] rounded-xl p-4 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-[#F87171] text-[13px] font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F87171] animate-pulse" /> Recording… {fmt(recSeconds)}
                    </div>
                    <p className="text-[11px] text-[#7A7A80] text-center">Your sequence is playing muted so your voiceover lines up.</p>
                    <button onClick={stopRecording} className="flex items-center gap-2 bg-[#F87171]/15 hover:bg-[#F87171]/25 text-[#F87171] px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">
                      <Square size={14} /> Stop
                    </button>
                  </div>
                ) : scriptPanel ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] text-[#C9A8FF] uppercase tracking-wider font-semibold"><Wand2 size={12} /> Script → AI voice</span>
                      <button onClick={() => setScriptPanel(false)} className="text-[#7A7A80] hover:text-white" title="Cancel"><X size={14} /></button>
                    </div>
                    <textarea
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      placeholder="Write or paste the narration the AI should speak…"
                      className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 min-h-[120px] resize-y leading-relaxed"
                    />
                    <button
                      onClick={() => setVoicePickerOpen(true)}
                      className="flex items-center justify-between gap-2 bg-[#08080A]/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-[13px] hover:border-[#9758FF]/40 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#C4C4C8]"><Volume2 size={14} className="text-[#9758FF]" /> {voiceSel ? voiceSel.name : 'Choose a voice'}</span>
                      <ChevronRight size={14} className="text-[#5A5A60]" />
                    </button>
                    <button
                      onClick={generateScriptVoiceover}
                      disabled={synthLoading || !scriptText.trim() || !voiceSel}
                      className="w-full bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {synthLoading ? <><Loader2 size={15} className="animate-spin" /> Generating voice…</> : <><Wand2 size={15} /> Generate voiceover</>}
                    </button>
                  </div>
                ) : voiceover ? (
                  <>
                    <div className="flex items-center gap-3 bg-[#08080A]/60 border border-white/[0.05] rounded-xl p-3">
                      <div className="bg-[#22D3A5]/10 p-2 rounded-lg shrink-0"><Volume2 size={15} className="text-[#5BE3BE]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] text-white line-clamp-1">{voiceover.name}</p>
                        <audio src={voiceover.url} controls className="h-7 mt-1 w-full" />
                      </div>
                      <button
                        onClick={() => {
                          if (voAudioRef.current && !voAudioRef.current.paused) voAudioRef.current.pause();
                          if (videoRef.current) { videoRef.current.muted = false; videoRef.current.volume = 1; }
                          setVoiceover(null);
                          setVoStart(0);
                        }}
                        className="text-[#7A7A80] hover:text-[#F87171] shrink-0"
                        title="Remove"
                      ><Trash2 size={15} /></button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] text-[#7A7A80] uppercase tracking-wider">How to apply</span>
                      <div className="flex gap-2">
                        <button onClick={() => setVoMode('replace')} className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all ${voMode === 'replace' ? 'bg-[#9758FF]/15 border-[#9758FF] text-white' : 'bg-[#08080A]/60 border-white/[0.06] text-[#7A7A80] hover:text-white'}`}>Replace audio</button>
                        <button onClick={() => setVoMode('mix')} className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all ${voMode === 'mix' ? 'bg-[#9758FF]/15 border-[#9758FF] text-white' : 'bg-[#08080A]/60 border-white/[0.06] text-[#7A7A80] hover:text-white'}`}>Mix over original</button>
                      </div>
                      <p className="text-[11px] text-[#5A5A60]">
                        {voMode === 'replace' ? 'The clips’ original sound is removed; only your voiceover plays.' : 'Your voiceover plays over the original audio (ducked down).'}
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.05]">
                        <span className="text-[#7A7A80]">Starts at</span>
                        <span className="text-white font-mono">{fmt(voStart, true)}</span>
                      </div>
                      <p className="text-[10.5px] text-[#5A5A60] -mt-1.5">Drag the green block on the timeline below to move it.</p>
                    </div>
                  </>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setVoMenu((o) => !o)}
                      className="w-full flex items-center justify-center gap-2 bg-[#9758FF]/10 hover:bg-[#9758FF]/20 border border-[#9758FF]/30 text-[#C9A8FF] px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                    >
                      <Plus size={16} /> Add voiceover
                    </button>
                    {voMenu && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setVoMenu(false)} />
                        <div className="absolute left-0 right-0 mt-2 z-40 bg-[#161619] border border-[#24242B] rounded-xl shadow-xl overflow-hidden py-1.5">
                          <button onClick={() => { setVoMenu(false); openScriptPanel(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] text-[#EAEAEA] text-[13px]">
                            <Wand2 size={15} className="text-[#9758FF]" /> Generate from script (AI voice)
                          </button>
                          <button onClick={() => { setVoMenu(false); startRecording(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] text-[#EAEAEA] text-[13px]">
                            <Mic size={15} className="text-[#9758FF]" /> Start recording
                          </button>
                          <button onClick={() => { setVoMenu(false); audioFileRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] text-[#EAEAEA] text-[13px]">
                            <Upload size={15} className="text-[#9758FF]" /> Upload audio
                          </button>
                          <button onClick={() => { setVoMenu(false); setPicker('audio'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] text-[#EAEAEA] text-[13px]">
                            <ListMusic size={15} className="text-[#9758FF]" /> From library
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Music & SFX */}
              <div className="bg-[#131316]/70 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <AudioLines size={15} className="text-[#9758FF]" />
                  <span className="text-[13px] font-semibold text-white">Music &amp; SFX</span>
                  <span className="text-[11px] text-[#5A5A60]">(optional)</span>
                </div>

                {/* Let the AI score the video — no prompt typing needed. */}
                <button
                  onClick={autoScore}
                  disabled={autoScoring || fxLoading || !clips.length}
                  className="w-full bg-gradient-to-r from-[#9758FF] to-[#7C3AED] hover:opacity-90 disabled:opacity-50 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_4px_18px_rgba(151,88,255,0.25)]"
                >
                  {autoScoring
                    ? <><Loader2 size={15} className="animate-spin" /> AI is scoring your video…</>
                    : <><Wand2 size={15} /> Auto-score with AI</>}
                </button>
                <p className="text-[11px] text-[#7A7A80] -mt-1.5 leading-snug">
                  The AI picks the background music{flow.script ? ' & sound effects to match your script' : ' & sound effects for your video'} — no prompt needed.
                </p>
                <div className="flex items-center gap-2 text-[10.5px] text-[#5A5A60] uppercase tracking-wider">
                  <div className="h-px flex-1 bg-white/[0.06]" /> or add manually <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {audioPanel ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#C9A8FF] uppercase tracking-wider font-semibold">
                        {audioPanel === 'music' ? 'Generate music' : 'Generate sound effect'}
                      </span>
                      <button onClick={() => setAudioPanel(null)} className="text-[#7A7A80] hover:text-white"><X size={14} /></button>
                    </div>
                    <textarea
                      value={fxPrompt}
                      onChange={(e) => setFxPrompt(e.target.value)}
                      placeholder={audioPanel === 'music' ? 'e.g. warm lo-fi hip-hop, mellow, 90 BPM, no vocals' : 'e.g. soft whoosh transition'}
                      className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 min-h-[70px] resize-y leading-relaxed"
                    />
                    <button
                      onClick={generateAudioFx}
                      disabled={fxLoading || !fxPrompt.trim()}
                      className="w-full bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {fxLoading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Wand2 size={15} /> Generate</>}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => openAudioPanel('music')} className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[#C4C4C8] px-3 py-2.5 rounded-lg text-[12.5px] transition-all">
                      <Music size={14} className="text-[#9758FF]" /> Music
                    </button>
                    <button onClick={() => openAudioPanel('sfx')} className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[#C4C4C8] px-3 py-2.5 rounded-lg text-[12.5px] transition-all">
                      <AudioLines size={14} className="text-[#9758FF]" /> Sound FX
                    </button>
                  </div>
                )}

                {audioLayers.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.05]">
                    {audioLayers.map((l) => (
                      <div key={l.id} className="flex items-center gap-2">
                        {l.kind === 'music' ? <Music size={13} className="text-[#F59E0B] shrink-0" /> : <AudioLines size={13} className="text-[#38BDF8] shrink-0" />}
                        <span className="text-[12px] text-white flex-1 truncate">{l.name}</span>
                        <input
                          type="range" min={0} max={1} step={0.02} value={l.volume}
                          onChange={(e) => setLayerVolume(l.id, parseFloat(e.target.value))}
                          className="w-16 accent-[#9758FF]" title={`Volume ${Math.round(l.volume * 100)}%`}
                        />
                        <button onClick={() => removeLayer(l.id)} className="text-[#7A7A80] hover:text-[#F87171] shrink-0" title="Remove"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={render}
                disabled={running || !!isWorking}
                className="w-full bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)] active:scale-[0.98]"
              >
                <Sparkles size={17} /> {running || isWorking ? 'Rendering…' : `Render ${clips.length > 1 ? `${clips.length} clips` : 'edit'}`}
              </button>
            </div>
          </div>

          {/* Sequence track */}
          <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Film size={14} className="text-[#9758FF]" />
              <span className="text-[11px] uppercase tracking-wider text-[#9758FF] font-semibold">Sequence</span>
              <span className="text-[11px] text-[#5A5A60]">{clips.length} clip{clips.length !== 1 ? 's' : ''} · {fmt(totalDuration)}</span>
              <button
                onClick={() => setPicker('source-add')}
                className="ml-auto flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#C4C4C8] px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              >
                <Plus size={14} /> Add clip
              </button>
            </div>

            {/* proportional blocks + playhead */}
            <div className="relative">
              <div className="flex gap-1 h-[68px]">
                {clips.map((c, i) => {
                  const widthPct = totalDuration > 0 ? (trimmed(c) / totalDuration) * 100 : 100 / clips.length;
                  const active = i === selectedIndex;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectClip(i)}
                      style={{ width: `${widthPct}%` }}
                      className={`group relative h-full rounded-lg overflow-hidden border text-left shrink-0 transition-all ${active ? 'border-[#9758FF] ring-1 ring-[#9758FF]/40' : 'border-white/[0.06] hover:border-white/[0.18]'}`}
                    >
                      <video src={c.url} muted className="absolute inset-0 w-full h-full object-cover opacity-40" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-1.5 pt-1">
                        <span className="text-[9px] font-bold text-white/80 bg-black/40 rounded px-1">{i + 1}</span>
                        {active && (
                          <div className="flex items-center gap-0.5">
                            <span onClick={(e) => { e.stopPropagation(); moveClip(i, -1); }} className="p-0.5 rounded bg-black/50 hover:bg-black text-white/80 cursor-pointer" title="Move left"><ChevronLeft size={11} /></span>
                            <span onClick={(e) => { e.stopPropagation(); moveClip(i, 1); }} className="p-0.5 rounded bg-black/50 hover:bg-black text-white/80 cursor-pointer" title="Move right"><ChevronRight size={11} /></span>
                            {clips.length > 1 && (
                              <span onClick={(e) => { e.stopPropagation(); removeClip(i); }} className="p-0.5 rounded bg-black/50 hover:bg-[#F87171] text-white/80 cursor-pointer" title="Remove"><X size={11} /></span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1 flex items-center gap-1">
                        <VideoIcon size={10} className="text-[#C9A8FF] shrink-0" />
                        <span className="text-[9.5px] text-white/85 font-mono">{fmt(trimmed(c), true)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Voiceover lane — draggable block sets when the VO starts */}
              <div ref={voLaneRef} className="relative mt-1.5 h-8 rounded-lg bg-[#08080A] border border-white/[0.05] overflow-hidden">
                {voiceover ? (
                  <div
                    onPointerDown={onVoDown}
                    className="absolute inset-y-0 bg-gradient-to-b from-[#22D3A5]/25 to-[#0E9F77]/20 border border-[#22D3A5]/50 rounded-md flex items-center gap-1.5 px-2 cursor-grab active:cursor-grabbing touch-none"
                    style={{
                      left: `${(voStart / Math.max(totalDuration, 0.001)) * 100}%`,
                      width: `${Math.max(8, (voiceover.duration / Math.max(totalDuration, 0.001)) * 100)}%`,
                    }}
                    title="Drag to set when the voiceover starts"
                  >
                    <Volume2 size={11} className="text-[#5BE3BE] shrink-0" />
                    <span className="text-[10px] text-[#5BE3BE] font-medium truncate">{voiceover.name}</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center px-2.5 gap-1.5 text-[10px] text-[#5A5A60]"><Mic size={11} /> Voiceover track (empty)</div>
                )}
              </div>

              {/* Music / SFX lane — draggable layer blocks */}
              {audioLayers.length > 0 && (
                <div ref={audioLaneRef} className="relative mt-1.5 h-8 rounded-lg bg-[#08080A] border border-white/[0.05] overflow-hidden">
                  {audioLayers.map((l) => (
                    <div
                      key={l.id}
                      onPointerDown={onLayerDown(l.id)}
                      className={`absolute inset-y-0 rounded-md flex items-center gap-1 px-2 cursor-grab active:cursor-grabbing touch-none border ${l.kind === 'music'
                        ? 'bg-gradient-to-b from-[#F59E0B]/25 to-[#B45309]/20 border-[#F59E0B]/50'
                        : 'bg-gradient-to-b from-[#38BDF8]/25 to-[#0E7490]/20 border-[#38BDF8]/50'}`}
                      style={{
                        left: `${(l.offset / Math.max(totalDuration, 0.001)) * 100}%`,
                        width: `${Math.max(6, (l.duration / Math.max(totalDuration, 0.001)) * 100)}%`,
                      }}
                      title="Drag to move"
                    >
                      {l.kind === 'music' ? <Music size={10} className="text-[#FBBF24] shrink-0" /> : <AudioLines size={10} className="text-[#7DD3FC] shrink-0" />}
                      <span className={`text-[9.5px] font-medium truncate ${l.kind === 'music' ? 'text-[#FBBF24]' : 'text-[#7DD3FC]'}`}>{l.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sequence playhead */}
              {totalDuration > 0 && (
                <div className="absolute top-0 w-px bg-white pointer-events-none z-30" style={{ left: `${Math.min(100, (seqPos / totalDuration) * 100)}%`, height: '68px' }}>
                  <div className="w-2.5 h-2.5 -ml-[5px] -mt-1 rotate-45 bg-white rounded-[2px]" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#5A5A60] mt-3">
              Click a clip to load it · drag the purple handles above to trim it · use ◀ ▶ to reorder · “Add clip” to join more.
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {job && (
        <div className="bg-[#131316]/40 border border-white/[0.05] rounded-3xl p-6 max-w-[560px] mx-auto w-full shadow-lg mt-2">
          <p className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center">Render Output</p>
          {isWorking && (
            <div className="py-10 flex flex-col items-center justify-center gap-4">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-[#9758FF]/15" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#9758FF] animate-spin" />
                <Film size={18} className="absolute inset-0 m-auto text-[#C9A8FF]" />
              </div>
              <p className="text-white text-[14px] font-bold">
                {job.status === 'queued' && 'Queued…'}
                {job.status === 'submitted' && 'Starting render…'}
                {job.status === 'processing' && 'Trimming, joining & muxing…'}
              </p>
              <div className="flex items-center gap-2 text-[#C9A8FF] text-[11.5px] bg-[#9758FF]/10 border border-[#9758FF]/20 px-3 py-1 rounded-full font-mono">
                <Clock size={12} className="animate-pulse" /> FFmpeg working
              </div>
            </div>
          )}
          {job.status === 'failed' && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-[#F87171]" />
              <p className="text-[#F87171] text-[14px] font-medium">Render failed</p>
              <p className="text-[#7A7A80] text-[12.5px] max-w-[460px]">{job.error || 'Something went wrong.'}</p>
            </div>
          )}
          {job.status === 'succeeded' && job.outputs[0] && (
            <div className="space-y-4 flex flex-col items-center">
              <div className="flex items-center gap-2 text-emerald-400 text-[13px] font-semibold"><Check size={16} /> Done</div>
              <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black w-full flex items-center justify-center">
                <video src={job.outputs[0].url} controls autoPlay loop className="max-h-[50vh] w-auto max-w-full block" />
              </div>

              {/* Publish */}
              {publication ? (
                <div className="w-full bg-[#9758FF]/10 border border-[#9758FF]/25 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[#C9A8FF] text-[12.5px] font-semibold">
                    <Share2 size={14} /> Published — anyone with the link can watch
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl(publication.share_token)}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 bg-[#08080A]/70 border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-[#A1A1A5] font-mono truncate"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl(publication.share_token)); toast.success('Link copied'); }}
                      className="shrink-0 bg-[#9758FF] hover:bg-[#854EE6] text-white p-2 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      <Copy size={15} />
                    </button>
                    <a
                      href={shareUrl(publication.share_token)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 bg-white/[0.06] hover:bg-white/[0.12] text-white p-2 rounded-lg transition-colors"
                      title="Open share page"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <input
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    placeholder="Give it a title (optional)…"
                    className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50"
                  />
                  <button
                    onClick={publish}
                    disabled={publishing}
                    className="w-full bg-gradient-to-r from-[#6A39C4] to-[#8C4DE8] hover:shadow-[0_8px_25px_rgba(106,57,196,0.3)] disabled:opacity-50 text-white py-3 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2"
                  >
                    {publishing ? <><Loader2 size={15} className="animate-spin" /> Publishing…</> : <><Share2 size={15} /> Publish &amp; get link</>}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => downloadVideo(job.outputs[0].url, `vidora-edit-${job.outputs[0].id}.mp4`)} className="bg-[#1B1B21] hover:bg-[#24242B] border border-white/[0.05] text-[#C9A8FF] py-3 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2">
                  <Download size={15} /> Download
                </button>
                <button onClick={() => { setJob(null); setPublication(null); setPublishTitle(''); }} className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[#C4C4C8] py-3 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={15} /> Keep editing
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {picker === 'source-add' && (
        <MediaPickerModal type="video" title="Add a clip to the sequence" onPick={addClip} onClose={() => setPicker(null)} />
      )}
      {picker === 'audio' && (
        <MediaPickerModal type="audio" title="Choose a voiceover" onPick={(a) => { applyVoiceover(a.id, a.url, a.name || 'Voiceover'); }} onClose={() => setPicker(null)} />
      )}
      <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => onAudioUpload(e.target.files?.[0])} />

      {voicePickerOpen && (
        <VoicePickerModal
          voices={clonedVoices}
          selected={voiceSel}
          onPick={setVoiceSel}
          onClose={() => setVoicePickerOpen(false)}
          onCloneClick={() => setVoicePickerOpen(false)}
        />
      )}
    </div>
  );
};
