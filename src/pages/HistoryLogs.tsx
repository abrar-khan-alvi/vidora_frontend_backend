import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PlaySquare, ImagePlus, Mic, Search, Filter, CheckCircle, AlertCircle, Clock3,
  Eye, X, ChevronDown, Check, Download, RefreshCw, Loader2,
} from 'lucide-react';
import { generationApi, type GenerationJob } from '../lib/api/generation';

type UIStatus = 'Completed' | 'Failed' | 'Processing';

const KIND_META: Record<string, { label: string; icon: React.FC<{ size?: number; className?: string }>; color: string }> = {
  image: { label: 'Image Generation', icon: ImagePlus, color: 'text-purple-400' },
  video: { label: 'Video Generation', icon: PlaySquare, color: 'text-blue-400' },
  audio: { label: 'VoiceSync AI', icon: Mic, color: 'text-green-400' },
};

const kindMeta = (kind: string) =>
  KIND_META[kind] ?? { label: kind, icon: ImagePlus, color: 'text-[#A1A1A5]' };

const uiStatus = (s: string): UIStatus => {
  if (s === 'succeeded') return 'Completed';
  if (s === 'failed' || s === 'canceled') return 'Failed';
  return 'Processing';
};

const SERVICE_TYPES = ['Image Generation', 'Video Generation', 'VoiceSync AI'];
const STATUSES: UIStatus[] = ['Completed', 'Failed', 'Processing'];

const statusConfig: Record<UIStatus, { icon: React.FC<{ size?: number; className?: string }>; color: string; bg: string; border: string }> = {
  Completed: { icon: CheckCircle, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/20' },
  Failed: { icon: AlertCircle, color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]/20' },
  Processing: { icon: Clock3, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/20' },
};

async function downloadFile(url: string, name: string) {
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

export const HistoryLogsContent = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selected, setSelected] = useState<GenerationJob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filterRef = useRef<HTMLDivElement>(null);

  const load = () => generationApi.listAll().then(setJobs).catch(() => { }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  // Auto-refresh while anything is still in flight.
  useEffect(() => {
    if (!jobs.some((j) => uiStatus(j.status) === 'Processing')) return;
    const t = setInterval(() => generationApi.listAll().then(setJobs).catch(() => { }), 5000);
    return () => clearInterval(t);
  }, [jobs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);
  const clearFilters = () => { setFilterType('all'); setFilterStatus('all'); };

  const rows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return jobs.filter((j) => {
      const meta = kindMeta(j.kind);
      const st = uiStatus(j.status);
      const matchesSearch = meta.label.toLowerCase().includes(q) || (j.prompt || '').toLowerCase().includes(q);
      const matchesType = filterType === 'all' || meta.label === filterType;
      const matchesStatus = filterStatus === 'all' || st === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [jobs, searchTerm, filterType, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(startIdx, startIdx + PAGE_SIZE);
  }, [rows, currentPage]);

  return (
    <div className="flex-1 w-full max-w-[1240px] flex flex-col pb-10 min-w-0">
      {/* Header */}
      <div className="mb-8 mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-medium mb-1.5 text-white">History logs</h1>
          <p className="text-[#7A7A80] text-[15px]">Every image, video, and voiceover you’ve generated — in one place.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
            <input
              type="text"
              placeholder="Search by prompt or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[240px] bg-[#1B1B21] border border-[#24242B] text-[#EAEAEA] text-[14px] rounded-full pl-9 pr-5 py-2.5 focus:outline-none focus:border-[#9758FF] transition-colors"
            />
          </div>

          <button
            onClick={() => { setLoading(true); load(); }}
            title="Refresh"
            className="flex items-center justify-center gap-2 border border-[#24242B] bg-[#1B1B21] hover:bg-[#24242B] text-[#EAEAEA] text-[14px] px-4 py-2.5 rounded-full transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <div ref={filterRef} className="relative">
            <button
              onClick={() => setIsFilterOpen((p) => !p)}
              className={`flex items-center justify-center gap-2 border text-[14px] transition-colors w-full sm:w-auto px-5 py-2.5 rounded-full ${isFilterOpen || activeFilterCount > 0 ? 'bg-[#9758FF]/10 border-[#9758FF]/40 text-white' : 'bg-[#1B1B21] hover:bg-[#24242B] border-[#24242B] text-[#EAEAEA]'
                }`}
            >
              <Filter size={16} className={activeFilterCount > 0 ? 'text-[#9758FF]' : 'text-[#A1A1A5]'} />
              Filter
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#9758FF] text-white text-[11px] font-black flex items-center justify-center">{activeFilterCount}</span>
              )}
              <ChevronDown size={14} className={`text-[#7A7A80] transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-[#161619] border border-[#24242B] rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#24242B]">
                  <span className="text-white font-semibold text-[14px]">Filters</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-[#9758FF] hover:text-[#854EE6] text-[13px] font-medium transition-colors">Clear all</button>
                  )}
                </div>
                <div className="px-5 py-4 border-b border-[#24242B]">
                  <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-3">Service</p>
                  <div className="flex flex-col gap-1.5">
                    {['all', ...SERVICE_TYPES].map((type) => (
                      <button key={type} onClick={() => setFilterType(type)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] transition-all text-left ${filterType === type ? 'bg-[#9758FF]/10 text-white' : 'text-[#A1A1A5] hover:bg-white/[0.03] hover:text-white'}`}>
                        <span>{type === 'all' ? 'All Services' : type}</span>
                        {filterType === type && <Check size={14} className="text-[#9758FF]" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-3">Status</p>
                  <div className="flex flex-col gap-1.5">
                    {(['all', ...STATUSES] as const).map((status) => (
                      <button key={status} onClick={() => setFilterStatus(status)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] transition-all text-left ${filterStatus === status ? 'bg-[#9758FF]/10 text-white' : 'text-[#A1A1A5] hover:bg-white/[0.03] hover:text-white'}`}>
                        <span>{status === 'all' ? 'All Statuses' : status}</span>
                        {filterStatus === status && <Check size={14} className="text-[#9758FF]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#121214] border border-[#24242B] rounded-[16px] overflow-hidden shadow-lg mt-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[#24242B]">
                <th className="py-5 px-6 text-[#7A7A80] font-medium text-[13.5px] whitespace-nowrap">Service</th>
                <th className="py-5 px-6 text-[#7A7A80] font-medium text-[13.5px]">Details</th>
                <th className="py-5 px-6 text-[#7A7A80] font-medium text-[13.5px]">Status</th>
                <th className="py-5 px-6 text-[#7A7A80] font-medium text-[13.5px] whitespace-nowrap">Date & Time</th>
                <th className="py-5 px-6 text-[#7A7A80] font-medium text-[13.5px] text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24242B]">
              {!loading && paginatedRows.map((job) => {
                const meta = kindMeta(job.kind);
                const st = uiStatus(job.status);
                const created = new Date(job.created_at);
                const Icon = meta.icon;
                return (
                  <tr key={job.id} className="hover:bg-[#1B1B21]/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1B1B21] flex items-center justify-center border border-[#24242B]">
                          <Icon size={15} className={meta.color} />
                        </div>
                        <span className="text-[#EAEAEA] text-[14.5px] font-medium whitespace-nowrap">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[#A1A1A5] text-[14px] line-clamp-1 max-w-[350px]" title={job.prompt}>{job.prompt || '—'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {st === 'Completed' && <CheckCircle size={15} className="text-[#10B981]" />}
                        {st === 'Failed' && <AlertCircle size={15} className="text-[#EF4444]" />}
                        {st === 'Processing' && <Clock3 size={15} className="text-[#F59E0B]" />}
                        <span className={`text-[13.5px] font-medium ${st === 'Completed' ? 'text-[#10B981]' : st === 'Failed' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>{st}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-[#EAEAEA] text-[14px] whitespace-nowrap">{created.toLocaleDateString()}</span>
                        <span className="text-[#7A7A80] text-[12.5px]">{created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelected(job)} className="w-8 h-8 rounded-full bg-[#1B1B21] flex items-center justify-center text-[#A1A1A5] hover:text-white hover:bg-[#24242B] border border-[#24242B] hover:border-[#3A3A40] transition-all" title="View details">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 size={22} className="animate-spin text-[#9758FF] mx-auto" /></td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Filter size={24} className="text-[#3A3A40]" />
                      <span className="text-[#7A7A80] text-[14px]">
                        {activeFilterCount > 0 || searchTerm ? 'No logs match your current filters.' : 'No generations yet — create an image, video, or voiceover to see it here.'}
                      </span>
                      {(activeFilterCount > 0 || searchTerm) && (
                        <button onClick={() => { clearFilters(); setSearchTerm(''); }} className="text-[#9758FF] hover:text-[#854EE6] text-[13px] font-medium mt-1 transition-colors">Clear filters</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#24242B] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[13.5px] text-[#7A7A80]">
            Showing {rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(rows.length, currentPage * PAGE_SIZE)} of {rows.length} entries
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1 || totalPages <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-lg border border-[#24242B] bg-[#1B1B21] hover:bg-[#24242B] text-[#A1A1A5] hover:text-white disabled:opacity-40 disabled:hover:bg-[#1B1B21] disabled:hover:text-[#A1A1A5] text-[13px] font-semibold transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                disabled={totalPages <= 1}
                className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-all ${currentPage === page
                    ? 'bg-[#9758FF] text-white'
                    : 'border border-[#24242B] bg-[#1B1B21] hover:bg-[#24242B] text-[#A1A1A5] hover:text-white'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages || totalPages <= 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3.5 py-1.5 rounded-lg border border-[#24242B] bg-[#1B1B21] hover:bg-[#24242B] text-[#A1A1A5] hover:text-white disabled:opacity-40 disabled:hover:bg-[#1B1B21] disabled:hover:text-[#A1A1A5] text-[13px] font-semibold transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (() => {
        const meta = kindMeta(selected.kind);
        const st = uiStatus(selected.status);
        const Icon = meta.icon;
        const StatusIcon = statusConfig[st].icon;
        const created = new Date(selected.created_at);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-[#161619] border border-[#24242B] rounded-[24px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-7 py-5 border-b border-[#24242B] sticky top-0 bg-[#161619] z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1B1B21] flex items-center justify-center border border-[#24242B]"><Icon size={16} className={meta.color} /></div>
                  <div>
                    <p className="text-white font-semibold text-[15px]">{meta.label}</p>
                    <p className="text-[#5A5A60] text-[12px]">{created.toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7A7A80] hover:text-white transition-all"><X size={16} /></button>
              </div>

              <div className="px-7 py-6 flex flex-col gap-5">
                <div className={`self-start flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-semibold ${statusConfig[st].bg} ${statusConfig[st].border}`}>
                  <StatusIcon size={14} className={statusConfig[st].color} />
                  <span className={statusConfig[st].color}>{st}</span>
                </div>

                {selected.prompt && (
                  <div>
                    <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-2">{selected.kind === 'audio' ? 'Script' : 'Prompt'}</p>
                    <p className="text-[#EAEAEA] text-[14.5px] leading-relaxed bg-[#1B1B21] border border-[#24242B] rounded-xl px-4 py-3">{selected.prompt}</p>
                  </div>
                )}

                {/* Output preview */}
                {st === 'Completed' && selected.outputs.length > 0 && (
                  <div>
                    <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-2">Output</p>
                    <div className="flex flex-col gap-3">
                      {selected.outputs.map((o, i) => (
                        <div key={o.id} className="relative group rounded-xl overflow-hidden border border-[#24242B] bg-[#08080A] flex items-center justify-center mx-auto w-fit">
                          {selected.kind === 'image' && <img src={o.url} alt={selected.prompt} className="max-h-[50vh] w-auto max-w-full block" />}
                          {selected.kind === 'video' && <video src={o.url} controls className="max-h-[50vh] w-auto max-w-full block" />}
                          {selected.kind === 'audio' && <audio src={o.url} controls className="w-full p-3" />}
                          <button
                            onClick={() => downloadFile(o.url, `vidora-${selected.kind}-${o.id}.${selected.kind === 'image' ? 'png' : selected.kind === 'video' ? 'mp4' : 'mp3'}`)}
                            className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80" title={`Download output ${i + 1}`}
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1B1B21] border border-[#24242B] rounded-xl px-4 py-3">
                    <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-1">Credits</p>
                    <p className="text-[#EAEAEA] text-[14px] font-medium">{selected.credits_cost}</p>
                  </div>
                  <div className="bg-[#1B1B21] border border-[#24242B] rounded-xl px-4 py-3">
                    <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-1">Completed</p>
                    <p className="text-[#EAEAEA] text-[14px] font-medium">{selected.completed_at ? new Date(selected.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                </div>

                {st === 'Failed' && (
                  <div className="flex items-start gap-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                    <p className="text-[#EF4444]/80 text-[13px] leading-relaxed">{selected.error || 'This generation failed. Please try again.'}</p>
                  </div>
                )}

                {st === 'Processing' && (
                  <div className="flex items-start gap-3 bg-[#F59E0B]/5 border border-[#F59E0B]/15 rounded-xl px-4 py-3">
                    <Clock3 size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                    <p className="text-[#F59E0B]/80 text-[13px] leading-relaxed">This generation is still in progress. It’ll update automatically when it’s done.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
