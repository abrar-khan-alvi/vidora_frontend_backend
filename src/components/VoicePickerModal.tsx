import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Check, Loader2, Mic, Play, Pause, Plus } from 'lucide-react';
import { voiceApi, type Voice, type StockVoice, type VoiceSelection } from '../lib/api/voice';

interface Props {
  voices: Voice[]; // the user's cloned voices (passed from parent)
  selected: VoiceSelection | null;
  onPick: (sel: VoiceSelection) => void;
  onClose: () => void;
  onCloneClick: () => void;
}

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
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (playing === id) {
      a.pause();
      setPlaying(null);
      return;
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[720px] max-h-[88vh] bg-[#131316] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-[15px]">Choose a voice</h3>
            <p className="text-[#7A7A80] text-[12px]">Use one of your cloned voices, or a built-in voice — no cloning needed.</p>
          </div>
          <button onClick={onClose} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A60]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search voices…"
              className="w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60"
            />
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {/* My voices */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-semibold text-[#A1A1A5] uppercase tracking-wide">My Voices</span>
              <button onClick={() => { onClose(); onCloneClick(); }} className="flex items-center gap-1.5 text-[12px] text-[#9758FF] font-medium hover:gap-2.5 transition-all">
                <Plus size={14} /> Clone a voice
              </button>
            </div>
            {filteredClones.length === 0 ? (
              <p className="text-[12.5px] text-[#5A5A60]">No cloned voices{q ? ' match' : ' yet'}.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredClones.map((v) => {
                  const sel = selected?.kind === 'cloned' && selected.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => choose({ kind: 'cloned', id: v.id, name: v.name })}
                      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        sel ? 'border-[#9758FF] ring-2 ring-[#9758FF]/30 bg-[#9758FF]/10' : 'border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <span className="h-8 w-8 rounded-lg bg-[#9758FF]/15 flex items-center justify-center shrink-0"><Mic size={15} className="text-[#9758FF]" /></span>
                      <span className="text-[13px] text-white truncate">{v.name}</span>
                      {sel && <span className="absolute top-1.5 right-1.5 bg-[#9758FF] text-white rounded-md p-0.5"><Check size={11} /></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stock voices */}
          <div>
            <span className="block mb-2.5 text-[12px] font-semibold text-[#A1A1A5] uppercase tracking-wide">Built-in Voices</span>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-[#9758FF]" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredStock.map((v) => {
                  const sel = selected?.kind === 'stock' && selected.id === v.id;
                  const isPlaying = playing === v.id;
                  return (
                    <div
                      key={v.id}
                      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        sel ? 'border-[#9758FF] ring-2 ring-[#9758FF]/30 bg-[#9758FF]/10' : 'border-white/[0.08] hover:border-white/20'
                      }`}
                      onClick={() => choose({ kind: 'stock', id: v.id, name: v.name })}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); if (v.preview_url) togglePreview(v.id, v.preview_url); }}
                        className="h-8 w-8 rounded-lg bg-[#9758FF]/15 hover:bg-[#9758FF]/30 flex items-center justify-center shrink-0 transition-colors"
                        title="Preview"
                      >
                        {isPlaying ? <Pause size={14} className="text-[#C9A8FF]" /> : <Play size={14} className="text-[#9758FF] ml-0.5" />}
                      </button>
                      <div className="min-w-0">
                        <p className="text-[13px] text-white truncate leading-tight">{v.name}</p>
                        <p className="text-[11px] text-[#7A7A80] truncate">{[v.gender, v.age].filter(Boolean).join(' · ') || v.description}</p>
                      </div>
                      {sel && <span className="absolute top-1.5 right-1.5 bg-[#9758FF] text-white rounded-md p-0.5"><Check size={11} /></span>}
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && filteredStock.length === 0 && (
              <p className="text-center text-[#5A5A60] text-[13px] py-6">No voices match “{q}”.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
