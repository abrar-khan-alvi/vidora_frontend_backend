import React, { useState, useRef, useEffect } from 'react';
import {
  PlaySquare,
  ImagePlus,
  Mic,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock3,
  Eye,
  X,
  ChevronDown,
  Check
} from 'lucide-react';

type HistoryItem = {
  id: number;
  type: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  detail: string;
  status: 'Completed' | 'Failed' | 'Processing';
  date: string;
  time: string;
};

const historyData: HistoryItem[] = [
  { id: 1, type: 'Video Generation', icon: PlaySquare, color: 'text-blue-400', detail: 'A young woman holding a ceramic coffee cup while sitting at a wooden table', status: 'Completed', date: 'Oct 24, 2023', time: '14:30' },
  { id: 2, type: 'Image Generation', icon: ImagePlus, color: 'text-purple-400', detail: 'Cyberpunk city street at night with neon signs and rainy reflection', status: 'Completed', date: 'Oct 23, 2023', time: '09:15' },
  { id: 3, type: 'VoiceSync AI', icon: Mic, color: 'text-green-400', detail: 'Audio upload: presentation_vo.wav', status: 'Failed', date: 'Oct 21, 2023', time: '16:45' },
  { id: 4, type: 'Prompton', icon: Sparkles, color: 'text-pink-400', detail: 'Generate a script for a 30s product ad about organic coffee', status: 'Completed', date: 'Oct 20, 2023', time: '11:20' },
  { id: 5, type: 'Video Generation', icon: PlaySquare, color: 'text-blue-400', detail: 'Cinematic tracking shot of a sports car driving through a mountain pass', status: 'Processing', date: 'Oct 20, 2023', time: '10:05' },
  { id: 6, type: 'Image Generation', icon: ImagePlus, color: 'text-purple-400', detail: 'Minimalist logo design for a coffee shop with a steam icon', status: 'Completed', date: 'Oct 18, 2023', time: '15:10' },
];

const SERVICE_TYPES = ['Video Generation', 'Image Generation', 'VoiceSync AI', 'Prompton'];
const STATUSES: HistoryItem['status'][] = ['Completed', 'Failed', 'Processing'];

const statusConfig = {
  Completed: { icon: CheckCircle, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/20' },
  Failed:    { icon: AlertCircle, color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]/20' },
  Processing:{ icon: Clock3,      color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/20' },
};

export const HistoryLogsContent = () => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
  };

  const filteredData = historyData.filter(item => {
    const matchesSearch = item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType   = filterType === 'all'   || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex-1 w-full max-w-[1240px] flex flex-col pb-10 min-w-0">

      {/* Header */}
      <div className="mb-8 mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-medium mb-1.5 text-white">History logs</h1>
          <p className="text-[#7A7A80] text-[15px]">View and manage your recently generated content and activities.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[240px] bg-[#1B1B21] border border-[#24242B] text-[#EAEAEA] text-[14px] rounded-full pl-9 pr-5 py-2.5 focus:outline-none focus:border-[#9758FF] transition-colors"
            />
          </div>

          {/* Filter button + dropdown */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setIsFilterOpen(prev => !prev)}
              className={`flex items-center justify-center gap-2 border text-[14px] transition-colors w-full sm:w-auto px-5 py-2.5 rounded-full ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-[#9758FF]/10 border-[#9758FF]/40 text-white'
                  : 'bg-[#1B1B21] hover:bg-[#24242B] border-[#24242B] text-[#EAEAEA]'
              }`}
            >
              <Filter size={16} className={activeFilterCount > 0 ? 'text-[#9758FF]' : 'text-[#A1A1A5]'} />
              Filter
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#9758FF] text-white text-[11px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`text-[#7A7A80] transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-[#161619] border border-[#24242B] rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#24242B]">
                  <span className="text-white font-semibold text-[14px]">Filters</span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-[#9758FF] hover:text-[#854EE6] text-[13px] font-medium transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Service filter */}
                <div className="px-5 py-4 border-b border-[#24242B]">
                  <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-3">Service</p>
                  <div className="flex flex-col gap-1.5">
                    {['all', ...SERVICE_TYPES].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] transition-all text-left ${
                          filterType === type
                            ? 'bg-[#9758FF]/10 text-white'
                            : 'text-[#A1A1A5] hover:bg-white/[0.03] hover:text-white'
                        }`}
                      >
                        <span>{type === 'all' ? 'All Services' : type}</span>
                        {filterType === type && <Check size={14} className="text-[#9758FF]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status filter */}
                <div className="px-5 py-4">
                  <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-3">Status</p>
                  <div className="flex flex-col gap-1.5">
                    {(['all', ...STATUSES] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] transition-all text-left ${
                          filterStatus === status
                            ? 'bg-[#9758FF]/10 text-white'
                            : 'text-[#A1A1A5] hover:bg-white/[0.03] hover:text-white'
                        }`}
                      >
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
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-[#1B1B21]/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1B1B21] flex items-center justify-center border border-[#24242B]">
                        <item.icon size={15} className={item.color} />
                      </div>
                      <span className="text-[#EAEAEA] text-[14.5px] font-medium whitespace-nowrap">{item.type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-[#A1A1A5] text-[14px] line-clamp-1 max-w-[350px]" title={item.detail}>
                      {item.detail}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {item.status === 'Completed'  && <CheckCircle size={15} className="text-[#10B981]" />}
                      {item.status === 'Failed'      && <AlertCircle size={15} className="text-[#EF4444]" />}
                      {item.status === 'Processing'  && <Clock3      size={15} className="text-[#F59E0B]" />}
                      <span className={`text-[13.5px] font-medium ${
                        item.status === 'Completed'  ? 'text-[#10B981]' :
                        item.status === 'Failed'     ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-[#EAEAEA] text-[14px] whitespace-nowrap">{item.date}</span>
                      <span className="text-[#7A7A80] text-[12.5px]">{item.time}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="w-8 h-8 rounded-full bg-[#1B1B21] flex items-center justify-center text-[#A1A1A5] hover:text-white hover:bg-[#24242B] border border-[#24242B] hover:border-[#3A3A40] transition-all"
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Filter size={24} className="text-[#3A3A40]" />
                      <span className="text-[#7A7A80] text-[14px]">
                        {activeFilterCount > 0 || searchTerm
                          ? 'No logs match your current filters.'
                          : 'No logs found.'}
                      </span>
                      {(activeFilterCount > 0 || searchTerm) && (
                        <button
                          onClick={() => { clearFilters(); setSearchTerm(''); }}
                          className="text-[#9758FF] hover:text-[#854EE6] text-[13px] font-medium mt-1 transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-[#24242B] px-6 py-4 flex items-center justify-between">
          <span className="text-[13.5px] text-[#7A7A80]">
            Showing {filteredData.length} of {historyData.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-[6px] border border-[#24242B] text-[#7A7A80] text-[13.5px] hover:bg-[#1B1B21] transition-colors disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1.5 rounded-[6px] bg-[#9758FF] text-white text-[13.5px] font-medium">1</button>
            <button className="px-3 py-1.5 rounded-[6px] border border-[#24242B] text-[#EAEAEA] text-[13.5px] hover:bg-[#1B1B21] transition-colors disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-[520px] bg-[#161619] border border-[#24242B] rounded-[24px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#24242B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1B1B21] flex items-center justify-center border border-[#24242B]">
                  <selectedItem.icon size={16} className={selectedItem.color} />
                </div>
                <div>
                  <p className="text-white font-semibold text-[15px]">{selectedItem.type}</p>
                  <p className="text-[#5A5A60] text-[12px]">Log #{String(selectedItem.id).padStart(4, '0')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7A7A80] hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-7 py-6 flex flex-col gap-5">
              {/* Status badge */}
              <div className={`self-start flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-semibold ${statusConfig[selectedItem.status].bg} ${statusConfig[selectedItem.status].border}`}>
                {selectedItem.status === 'Completed'  && <CheckCircle size={14} className="text-[#10B981]" />}
                {selectedItem.status === 'Failed'     && <AlertCircle size={14} className="text-[#EF4444]" />}
                {selectedItem.status === 'Processing' && <Clock3      size={14} className="text-[#F59E0B]" />}
                <span className={statusConfig[selectedItem.status].color}>{selectedItem.status}</span>
              </div>

              {/* Prompt / detail */}
              <div>
                <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-2">Prompt / Detail</p>
                <p className="text-[#EAEAEA] text-[14.5px] leading-relaxed bg-[#1B1B21] border border-[#24242B] rounded-xl px-4 py-3">
                  {selectedItem.detail}
                </p>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1B1B21] border border-[#24242B] rounded-xl px-4 py-3">
                  <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-1">Date</p>
                  <p className="text-[#EAEAEA] text-[14px] font-medium">{selectedItem.date}</p>
                </div>
                <div className="bg-[#1B1B21] border border-[#24242B] rounded-xl px-4 py-3">
                  <p className="text-[#7A7A80] text-[11px] font-bold uppercase tracking-wider mb-1">Time</p>
                  <p className="text-[#EAEAEA] text-[14px] font-medium">{selectedItem.time}</p>
                </div>
              </div>

              {/* Failed hint */}
              {selectedItem.status === 'Failed' && (
                <div className="flex items-start gap-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                  <p className="text-[#EF4444]/80 text-[13px] leading-relaxed">
                    This generation failed. The uploaded file may have been unsupported or the service timed out. Please retry.
                  </p>
                </div>
              )}

              {/* Processing hint */}
              {selectedItem.status === 'Processing' && (
                <div className="flex items-start gap-3 bg-[#F59E0B]/5 border border-[#F59E0B]/15 rounded-xl px-4 py-3">
                  <Clock3 size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                  <p className="text-[#F59E0B]/80 text-[13px] leading-relaxed">
                    This generation is still in progress. Results will appear once rendering is complete.
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-7 py-5 border-t border-[#24242B] flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#EAEAEA] text-[14px] font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
