import { useRef, useState } from 'react';
import { X, Mic, Loader2, Sparkles, Music } from 'lucide-react';
import { cloneVoice } from '../lib/api/voice';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export const CloneVoiceModal = ({ onClose, onCreated }: Props) => {
  const [name, setName] = useState('');
  const [sample, setSample] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      setError('Please choose an audio file (MP3, WAV, M4A).');
      return;
    }
    setError('');
    setSample(f);
  };

  const create = async () => {
    if (!name.trim() || !sample || creating) return;
    setError('');
    setCreating(true);
    try {
      await cloneVoice(name.trim(), sample);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start cloning — please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[560px] bg-[#131316] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-[15px]">Clone a voice</h3>
            <p className="text-[#7A7A80] text-[12px]">Upload a clean ~30s–2min sample — we’ll train a reusable voice.</p>
          </div>
          <button onClick={onClose} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Voice name (e.g. “My Voice”, “Narrator”)"
            className="w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60"
          />

          <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => pick(e.target.files)} />
          {sample ? (
            <div className="flex items-center justify-between gap-4 bg-[#08080A]/60 border border-[#24242B] rounded-xl p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#9758FF]/10 flex items-center justify-center border border-[#9758FF]/20 shrink-0">
                  <Music size={18} className="text-[#9758FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[13.5px] font-medium truncate">{sample.name}</p>
                  <p className="text-[#7A7A80] text-[12px]">{(sample.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button onClick={() => fileInput.current?.click()} className="text-[12.5px] text-[#A1A1A5] hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all shrink-0">
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-[#24242B] hover:border-[#9758FF]/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#9758FF]/10 flex items-center justify-center border border-[#9758FF]/20 group-hover:scale-110 transition-transform">
                <Mic size={22} className="text-[#9758FF]" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-[14px]">Upload a voice sample</p>
                <p className="text-[#5A5A60] text-[12px] mt-0.5">MP3, WAV, M4A</p>
              </div>
            </button>
          )}

          {error && (
            <p className="text-[12.5px] text-[#FF6B6B] bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-[11px] text-[#5A5A60]">Cloning takes a few seconds.</p>
          <button
            onClick={create}
            disabled={!name.trim() || !sample || creating}
            className="bg-gradient-to-r from-[#9758FF] to-[#C24DFF] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] flex items-center gap-2 transition-all"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Clone voice
          </button>
        </div>
      </div>
    </div>
  );
};
