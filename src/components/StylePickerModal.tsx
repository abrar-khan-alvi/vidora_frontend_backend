import { useEffect, useMemo, useState } from 'react';
import { X, Search, Check, Loader2, Sparkles } from 'lucide-react';
import { generationApi, type StylePreset } from '../lib/api/generation';

interface Props {
  selectedId: string | null;
  onPick: (style: StylePreset | null) => void;
  onClose: () => void;
}

/** A gallery of Higgsfield's built-in Soul style presets (the "look").
 *  Previews load lazily — only when the modal is open. */
export const StylePickerModal = ({ selectedId, onPick, onClose }: Props) => {
  const [styles, setStyles] = useState<StylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    generationApi.listStyles().then(setStyles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return styles;
    return styles.filter((x) => x.name.toLowerCase().includes(s) || x.description.toLowerCase().includes(s));
  }, [q, styles]);

  const choose = (s: StylePreset | null) => {
    onPick(s);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[860px] max-h-[88vh] bg-[#131316] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-[15px]">Choose a style</h3>
            <p className="text-[#7A7A80] text-[12px]">A built-in look for your image — combine it with a reference for subject + style.</p>
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
              placeholder="Search styles…"
              className="w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60"
            />
          </div>
        </div>

        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-[#9758FF]" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <button
                onClick={() => choose(null)}
                className={`group relative aspect-[3/4] rounded-xl overflow-hidden border flex flex-col items-center justify-center gap-2 bg-[#08080A] transition-all ${
                  selectedId === null ? 'border-[#9758FF] ring-2 ring-[#9758FF]/30' : 'border-[#24242B] hover:border-white/20'
                }`}
              >
                <Sparkles size={20} className="text-[#7A7A80]" />
                <span className="text-[12px] text-[#A1A1A5]">No style</span>
                {selectedId === null && <span className="absolute top-2 right-2 bg-[#9758FF] text-white rounded-md p-0.5"><Check size={12} /></span>}
              </button>
              {filtered.map((s) => {
                const sel = selectedId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => choose(s)}
                    title={s.description}
                    className={`group relative aspect-[3/4] rounded-xl overflow-hidden border text-left transition-all ${
                      sel ? 'border-[#9758FF] ring-2 ring-[#9758FF]/30' : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <img src={s.preview_url} alt={s.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6">
                      <span className="block text-[12px] font-medium text-white line-clamp-1">{s.name}</span>
                    </div>
                    {sel && <span className="absolute top-2 right-2 bg-[#9758FF] text-white rounded-md p-0.5"><Check size={12} /></span>}
                  </button>
                );
              })}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-[#5A5A60] text-[13px] py-10">No styles match “{q}”.</p>
          )}
        </div>
      </div>
    </div>
  );
};
