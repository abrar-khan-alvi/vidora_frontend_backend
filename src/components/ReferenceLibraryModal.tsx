import { useEffect, useRef, useState } from 'react';
import { X, Plus, Loader2, Check, Trash2, Pencil } from 'lucide-react';
import { studioApi, uploadAsset, type UploadedAsset } from '../lib/api/studio';

interface Props {
  onClose: () => void;
  /** Multi-select mode: currently-attached ids + a toggle handler + a cap. */
  attachedIds?: string[];
  max?: number;
  onToggle?: (asset: UploadedAsset) => void;
  /** Single-pick mode: when set, clicking an image picks it and closes the modal. */
  onPick?: (asset: UploadedAsset) => void;
}

export const ReferenceLibraryModal = ({
  onClose,
  attachedIds = [],
  max = 4,
  onToggle,
  onPick,
}: Props) => {
  const single = !!onPick;
  const [items, setItems] = useState<UploadedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    studioApi
      .listReferences()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const atLimit = !single && attachedIds.length >= max;

  const choose = (asset: UploadedAsset) => {
    if (single) {
      onPick!(asset);
      onClose();
    } else if (!attachedIds.includes(asset.id) ? attachedIds.length < max : true) {
      onToggle?.(asset);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).filter((f) => f.type.startsWith('image/'))) {
        const asset = await uploadAsset(file);
        // Dedup returns an existing asset; avoid showing it twice.
        setItems((prev) => (prev.some((p) => p.id === asset.id) ? prev : [asset, ...prev]));
        if (single) {
          onPick!(asset);
          onClose();
          return;
        }
        if (!attachedIds.includes(asset.id) && attachedIds.length < max) onToggle?.(asset);
      }
    } catch {
      /* ignore failed upload */
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const saveRename = async (id: string) => {
    const name = draftName.trim();
    setEditing(null);
    if (!name) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, name } : it)));
    try {
      await studioApi.rename(id, name);
    } catch {
      /* keep optimistic value */
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (!single && attachedIds.includes(id)) {
      const asset = items.find((it) => it.id === id);
      if (asset) onToggle?.(asset); // detach
    }
    try {
      await studioApi.remove(id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[680px] max-h-[80vh] bg-[#131316] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-[15px]">Reference library</h3>
            <p className="text-[#7A7A80] text-[12px]">
              {single ? 'Pick one image' : `${attachedIds.length}/${max} attached`} · reusable across generations
            </p>
          </div>
          <button onClick={onClose} className="text-[#7A7A80] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 size={22} className="animate-spin text-[#9758FF]" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {/* Upload tile */}
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border border-dashed border-[#2E2E36] hover:border-[#9758FF]/50 text-[#7A7A80] hover:text-[#9758FF] flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                <span className="text-[11px]">Upload</span>
              </button>

              {items.map((it) => {
                const attached = !single && attachedIds.includes(it.id);
                const blocked = !single && !attached && atLimit;
                return (
                  <div key={it.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => !blocked && choose(it)}
                      disabled={blocked}
                      className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                        attached ? 'border-[#9758FF] ring-2 ring-[#9758FF]/30' : 'border-white/[0.08] hover:border-white/20'
                      } ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      title={blocked ? 'Attachment limit reached' : single ? 'Click to select' : attached ? 'Click to detach' : 'Click to attach'}
                    >
                      <img src={it.url} alt={it.name} className="w-full h-full object-cover" />
                      {attached && (
                        <span className="absolute top-1.5 left-1.5 bg-[#9758FF] text-white rounded-md p-0.5">
                          <Check size={12} />
                        </span>
                      )}
                      <span className="absolute top-1.5 right-1.5 flex gap-1">
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); setEditing(it.id); setDraftName(it.name); }}
                          className="bg-black/65 hover:bg-black text-white rounded-md p-1"
                          title="Rename"
                        >
                          <Pencil size={11} />
                        </span>
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); remove(it.id); }}
                          className="bg-black/65 hover:bg-red-500/80 text-white rounded-md p-1"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </span>
                      </span>
                    </button>
                    {editing === it.id ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => saveRename(it.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRename(it.id); if (e.key === 'Escape') setEditing(null); }}
                        className="bg-[#08080A] border border-[#9758FF]/50 rounded-md px-2 py-1 text-[11px] text-white focus:outline-none"
                      />
                    ) : (
                      <span className="text-[11px] text-[#A1A1A5] truncate px-0.5" title={it.name}>{it.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="text-center text-[#5A5A60] text-[12.5px] mt-4">No references yet — upload one to reuse it anytime.</p>
          )}
        </div>

        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
    </div>
  );
};
