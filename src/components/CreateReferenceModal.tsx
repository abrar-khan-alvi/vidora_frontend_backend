import { useEffect, useRef, useState } from 'react';
import { X, Plus, Loader2, Check, Sparkles } from 'lucide-react';
import { studioApi, referenceApi, uploadAsset, type UploadedAsset } from '../lib/api/studio';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const MAX_TRAINING = 6;

export const CreateReferenceModal = ({ onClose, onCreated }: Props) => {
  const [name, setName] = useState('');
  const [items, setItems] = useState<UploadedAsset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    studioApi.listReferences().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_TRAINING ? prev : [...prev, id],
    );

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      setError('Please choose image files only.');
      return;
    }
    setUploading(true);
    try {
      for (const file of images) {
        const asset = await uploadAsset(file);
        // New image → prepend. Already in the library (deduped by the server) →
        // move it to the front so the user sees it surface. Either way, select it.
        setItems((prev) => [asset, ...prev.filter((p) => p.id !== asset.id)]);
        setSelected((prev) =>
          prev.includes(asset.id) || prev.length >= MAX_TRAINING ? prev : [...prev, asset.id],
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — please try again.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const create = async () => {
    if (!name.trim() || selected.length === 0 || creating) return;
    setError('');
    setCreating(true);
    try {
      await referenceApi.create(name.trim(), selected);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start training — please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[640px] max-h-[86vh] bg-[#131316] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-[15px]">Create a reference</h3>
            <p className="text-[#7A7A80] text-[12px]">Pick 1–{MAX_TRAINING} photos of the same subject — we’ll train a reusable reference.</p>
          </div>
          <button onClick={onClose} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Reference name (e.g. “Me”, “Sarah”)"
            className="w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[#7A7A80]">Training photos</span>
              <span className="text-[11px] text-[#5A5A60]">{selected.length}/{MAX_TRAINING} selected</span>
            </div>
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-[#9758FF]" /></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border border-dashed border-[#2E2E36] hover:border-[#9758FF]/50 text-[#7A7A80] hover:text-[#9758FF] flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span className="text-[11px]">Upload</span>
                </button>
                {items.map((it) => {
                  const on = selected.includes(it.id);
                  const blocked = !on && selected.length >= MAX_TRAINING;
                  return (
                    <button
                      key={it.id}
                      onClick={() => !blocked && toggle(it.id)}
                      disabled={blocked}
                      className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                        on ? 'border-[#9758FF] ring-2 ring-[#9758FF]/30' : 'border-white/[0.08] hover:border-white/20'
                      } ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <img src={it.url} alt={it.name} className="w-full h-full object-cover" />
                      {on && (
                        <span className="absolute top-1.5 left-1.5 bg-[#9758FF] text-white rounded-md p-0.5"><Check size={12} /></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="text-center text-[#5A5A60] text-[12.5px] mt-3">No photos yet — upload one to get started.</p>
            )}
          </div>

          {error && (
            <p className="text-[12.5px] text-[#FF6B6B] bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-[11px] text-[#5A5A60]">Training takes a few minutes — you’ll see it appear as “Training…”.</p>
          <button
            onClick={create}
            disabled={!name.trim() || selected.length === 0 || creating}
            className="bg-gradient-to-r from-[#9758FF] to-[#C24DFF] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] flex items-center gap-2 transition-all"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Create reference
          </button>
        </div>

        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
    </div>
  );
};
