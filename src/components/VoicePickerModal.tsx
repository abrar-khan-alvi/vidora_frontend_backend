import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Check, Loader2, Mic, Play, Pause, Plus } from 'lucide-react';
import { voiceApi, type Voice, type StockVoice, type VoiceSelection } from '../lib/api/voice';

interface Props {
  voices: Voice[];
  selected: VoiceSelection | null;
  onPick: (sel: VoiceSelection) => void;
  onClose: () => void;
  onCloneClick: () => void;
}

// Animated waveform bars shown while a voice is playing
const WaveformBars = () => (
  <span className="flex items-end gap-[2px] h-4 shrink-0">
    {[3, 5, 7, 4, 6].map((h, i) => (
      <span
        key={i}
        className="w-[2.5px] rounded-full bg-[#9758FF]"
        style={{
          height: `${h * 2}px`,
          animation: `waveBar 0.7s ease-in-out ${i * 0.1}s infinite alternate`,
        }}
      />
    ))}
  </span>
);

/** Pick a voice for TTS: a cloned voice OR a built-in stock voice (with preview). */
export const VoicePickerModal = ({ voices, selected, onPick, onClose, onCloneClick }: Props) => {
  const [stock, setStock] = useState<StockVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceApi.listStock().then(setStock).catch(() => {}).finally(() => setLoading(false));
    return () => { audioRef.current?.pause(); };
  }, []);

  // Inject keyframe animation for waveform bars
  useEffect(() => {
    const id = 'wave-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes waveBar {
        from { transform: scaleY(0.4); }
        to   { transform: scaleY(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const readyClones = voices.filter((v) => v.status === 'ready');

  const filteredClones = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? readyClones.filter((v) => v.name.toLowerCase().includes(s)) : readyClones;
  }, [q, readyClones]);

  const filteredStock = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return stock;
    return stock.filter((v) => v.name.toLowerCase().includes(s) || v.description.toLowerCase().includes(s));
  }, [q, stock]);

  const togglePreview = (id: string, url: string) => {
    if (!url) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (playing === id) {
      a.pause();
      setPlaying(null);
      return;
    }
    // Stop whatever is currently playing
    a.pause();
    a.src = url;
    a.onended = () => setPlaying(null);
    a.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
  };

  const choose = (sel: VoiceSelection) => {
    audioRef.current?.pause();
    onPick(sel);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[740px] max-h-[90vh] bg-[#0E0E11] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-[15px]">Choose a Voice</h3>
            <p className="text-[#7A7A80] text-[12px] mt-0.5">
              Press <span className="text-[#A1A1A5]">▶</span> to preview before selecting
            </p>
          </div>
          <button onClick={onClose} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A60]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search voices…"
              autoFocus
              className="w-full bg-[#08080A] border border-[#24242B] rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60 focus:shadow-[0_0_0_3px_rgba(151,88,255,0.1)] transition-all"
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex flex-col gap-6 p-6 pt-4">

          {/* ── My (cloned) Voices ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#A1A1A5] uppercase tracking-[0.12em]">My Voices</span>
              <button
                onClick={() => { onClose(); onCloneClick(); }}
                className="flex items-center gap-1.5 text-[12px] text-[#9758FF] font-medium hover:gap-2.5 transition-all"
              >
                <Plus size={13} /> Clone a voice
              </button>
            </div>

            {filteredClones.length === 0 ? (
              <div className="py-5 px-4 bg-[#131316]/50 border border-dashed border-white/[0.07] rounded-xl">
                <p className="text-[12.5px] text-[#5A5A60] text-center">
                  {q ? 'No cloned voices match your search.' : 'You have no cloned voices yet. Clone one from an audio sample.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredClones.map((v) => {
                  const isSel = selected?.kind === 'cloned' && selected.id === v.id;
                  const isPlaying = playing === v.id;
                  const hasPreview = !!v.sample_url;

                  return (
                    <div
                      key={v.id}
                      onClick={() => choose({ kind: 'cloned', id: v.id, name: v.name })}
                      className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all cursor-pointer group ${
                        isSel
                          ? 'border-[#9758FF] ring-2 ring-[#9758FF]/25 bg-[#9758FF]/10'
                          : 'border-white/[0.07] hover:border-white/[0.18] hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Preview button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (hasPreview) togglePreview(v.id, v.sample_url); }}
                        title={hasPreview ? (isPlaying ? 'Pause preview' : 'Preview sample') : 'No sample available'}
                        disabled={!hasPreview}
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isPlaying
                            ? 'bg-[#9758FF] shadow-[0_0_14px_rgba(151,88,255,0.5)]'
                            : hasPreview
                              ? 'bg-[#9758FF]/15 hover:bg-[#9758FF]/30'
                              : 'bg-white/[0.04] opacity-30 cursor-not-allowed'
                        }`}
                      >
                        {isPlaying
                          ? <Pause size={14} className="text-white" />
                          : <Play size={14} className="text-[#9758FF] ml-0.5" />
                        }
                      </button>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] text-white font-medium truncate leading-tight">{v.name}</p>
                          {isPlaying && <WaveformBars />}
                        </div>
                        <p className="text-[11px] text-[#7A7A80] mt-0.5">Cloned voice</p>
                      </div>

                      {/* Selected badge */}
                      {isSel && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#9758FF] flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Built-in Voices ─────────────────────────────────────────────── */}
          <div>
            <span className="block mb-3 text-[11px] font-bold text-[#A1A1A5] uppercase tracking-[0.12em]">
              Built-in Voices
            </span>

            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 size={20} className="animate-spin text-[#9758FF]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredStock.map((v) => {
                  const isSel = selected?.kind === 'stock' && selected.id === v.id;
                  const isPlaying = playing === v.id;
                  const hasPreview = !!v.preview_url;
                  const meta = [v.gender, v.age].filter(Boolean).join(' · ') || v.description;

                  return (
                    <div
                      key={v.id}
                      onClick={() => choose({ kind: 'stock', id: v.id, name: v.name })}
                      className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#9758FF] ring-2 ring-[#9758FF]/25 bg-[#9758FF]/10'
                          : 'border-white/[0.07] hover:border-white/[0.18] hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Preview button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (hasPreview) togglePreview(v.id, v.preview_url); }}
                        title={hasPreview ? (isPlaying ? 'Pause preview' : 'Preview voice') : 'No preview available'}
                        disabled={!hasPreview}
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isPlaying
                            ? 'bg-[#9758FF] shadow-[0_0_14px_rgba(151,88,255,0.5)]'
                            : hasPreview
                              ? 'bg-[#9758FF]/15 hover:bg-[#9758FF]/30'
                              : 'bg-white/[0.04] opacity-30 cursor-not-allowed'
                        }`}
                      >
                        {isPlaying
                          ? <Pause size={14} className="text-white" />
                          : <Play size={14} className="text-[#9758FF] ml-0.5" />
                        }
                      </button>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] text-white font-medium truncate leading-tight">{v.name}</p>
                          {isPlaying && <WaveformBars />}
                        </div>
                        {meta && <p className="text-[11px] text-[#7A7A80] mt-0.5 truncate">{meta}</p>}
                      </div>

                      {/* Selected badge */}
                      {isSel && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#9758FF] flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && filteredStock.length === 0 && (
              <p className="text-center text-[#5A5A60] text-[13px] py-6">No voices match "{q}".</p>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-white/[0.05] bg-[#0A0A0D]">
          <p className="text-[11.5px] text-[#5A5A60] text-center">
            Click a card to select · Press <span className="text-[#9758FF]">▶</span> to hear the voice first
          </p>
        </div>
      </div>
    </div>
  );
};
