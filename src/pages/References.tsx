import { useEffect, useState } from 'react';
import {
  Smile, Plus, Trash2, AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { referenceApi, type TrainedReference } from '../lib/api/studio';
import { CreateReferenceModal } from '../components/CreateReferenceModal';
import { useToast } from '../components/Toast';

export const ReferencesContent = () => {
  const toast = useToast();
  const [references, setReferences] = useState<TrainedReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteRef, setConfirmDeleteRef] = useState<TrainedReference | null>(null);

  const load = () => {
    referenceApi.list()
      .then(setReferences)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Poll for status updates if any reference is in 'pending' status
  useEffect(() => {
    const hasPending = references.some((r) => r.status === 'pending');
    if (!hasPending) return;

    const timer = setInterval(() => {
      referenceApi.list().then(setReferences).catch(() => {});
    }, 6000);

    return () => clearInterval(timer);
  }, [references]);

  const executeDelete = async (id: string) => {
    setConfirmDeleteRef(null);
    setDeletingId(id);
    try {
      await referenceApi.remove(id);
      setReferences((prev) => prev.filter((r) => r.id !== id));
      toast.success('Custom reference deleted successfully.');
    } catch {
      toast.error('Failed to delete reference. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1040px] flex flex-col gap-6 pb-10 min-w-0">
      {/* Header */}
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#9758FF]/10 p-2.5 rounded-xl border border-[#9758FF]/10">
            <Smile size={22} className="text-[#9758FF]" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-white tracking-tight leading-tight">Custom References</h1>
            <p className="text-[#7A7A80] text-[13px] mt-0.5">Train unique faces, characters, or styles to guide your generations.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); load(); }}
            title="Refresh"
            className="flex items-center justify-center p-2.5 border border-[#24242B] bg-[#1B1B21] hover:bg-[#24242B] text-[#EAEAEA] rounded-full transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)] active:scale-[0.98]"
          >
            <Plus size={18} /> Train Reference
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading && references.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <Loader2 size={30} className="animate-spin text-[#9758FF]" />
          <p className="text-[#7A7A80] text-[14px]">Loading references...</p>
        </div>
      ) : references.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {references.map((r) => {
              const ready = r.status === 'ready';
              const pending = r.status === 'pending';
              const failed = r.status === 'failed';

              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#131316]/40 border border-white/[0.05] hover:border-white/[0.1] rounded-2xl overflow-hidden p-4 flex flex-col gap-4 shadow-lg group relative transition-all"
                >
                  {/* Thumbnail / Status Overlays */}
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#08080A] border border-white/[0.04] relative flex items-center justify-center">
                    {r.thumbnail_url ? (
                      <img src={r.thumbnail_url} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#9758FF]/5">
                        <Smile size={32} className="text-[#9758FF]/30 animate-pulse" />
                      </div>
                    )}

                    {pending && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-[#9758FF]" />
                        <span className="text-[12px] font-medium text-white">Training…</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata and Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-semibold text-[15px] truncate" title={r.name}>{r.name}</h3>
                      <p className="text-[#5A5A60] text-[11.5px] mt-0.5">
                        Created {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      disabled={deletingId === r.id}
                      onClick={() => setConfirmDeleteRef(r)}
                      className="text-[#7A7A80] hover:text-[#EF4444] disabled:opacity-50 p-1.5 rounded-lg hover:bg-white/5 transition-all self-center"
                      title="Delete reference"
                    >
                      {deletingId === r.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>

                  {/* Bottom Status bar */}
                  <div className="border-t border-white/[0.03] pt-3 flex items-center justify-between mt-auto">
                    {ready && (
                      <div className="flex items-center gap-1.5 text-[#10B981] text-[12px] font-semibold">
                        <CheckCircle2 size={14} />
                        <span>Ready</span>
                      </div>
                    )}
                    {pending && (
                      <div className="flex items-center gap-1.5 text-[#F59E0B] text-[12px] font-semibold animate-pulse">
                        <Clock3 size={14} />
                        <span>In Training</span>
                      </div>
                    )}
                    {failed && (
                      <div className="flex items-center gap-1.5 text-[#EF4444] text-[12px] font-semibold" title={r.error}>
                        <AlertCircle size={14} />
                        <span className="truncate max-w-[120px]">Failed</span>
                      </div>
                    )}

                    <span className="text-[11px] text-[#5A5A60] bg-[#1B1B21] px-2 py-0.5 rounded-md font-mono">
                      {r.id.substring(0, 8)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center border border-dashed border-[#24242B] rounded-2xl bg-[#131316]/10">
          <div className="bg-[#9758FF]/10 p-4 rounded-2xl border border-[#9758FF]/10">
            <Smile size={28} className="text-[#9758FF]" />
          </div>
          <div>
            <p className="text-white text-[15px] font-semibold">No custom references yet</p>
            <p className="text-[#7A7A80] text-[13px] mt-1 max-w-[340px]">
              Upload a few photos of yourself or a character, and we'll train a customized model for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] transition-all flex items-center gap-2 mx-auto"
          >
            <Plus size={18} /> Train First Reference
          </button>
        </div>
      )}

      {/* Train Modal */}
      {createOpen && (
        <CreateReferenceModal
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {confirmDeleteRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setConfirmDeleteRef(null)}>
          <div
            className="w-full max-w-[400px] bg-[#131316] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="bg-[#EF4444]/10 p-2.5 rounded-xl border border-[#EF4444]/10 text-[#EF4444] shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-bold text-[16px] leading-snug">Delete Custom Reference?</h3>
                <p className="text-[#A1A1A5] text-[13px] mt-1.5 leading-relaxed">
                  Are you sure you want to delete <span className="text-white font-semibold">"{confirmDeleteRef.name}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRef(null)}
                className="px-4 py-2 border border-white/[0.06] hover:bg-white/5 text-white rounded-xl text-[13px] font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(confirmDeleteRef.id)}
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

