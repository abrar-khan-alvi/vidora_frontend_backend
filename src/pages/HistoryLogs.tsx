import { useState } from 'react';
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
  Eye 
} from 'lucide-react';

const historyData = [
  { id: 1, type: 'Video Generation', icon: PlaySquare, color: 'text-blue-400', detail: 'A young woman holding a ceramic coffee cup while sitting at a wooden table', status: 'Completed', date: 'Oct 24, 2023', time: '14:30' },
  { id: 2, type: 'Image Generation', icon: ImagePlus, color: 'text-purple-400', detail: 'Cyberpunk city street at night with neon signs and rainy reflection', status: 'Completed', date: 'Oct 23, 2023', time: '09:15' },
  { id: 3, type: 'VoiceSync AI', icon: Mic, color: 'text-green-400', detail: 'Audio upload: presentation_vo.wav', status: 'Failed', date: 'Oct 21, 2023', time: '16:45' },
  { id: 4, type: 'Prompton', icon: Sparkles, color: 'text-pink-400', detail: 'Generate a script for a 30s product ad about organic coffee', status: 'Completed', date: 'Oct 20, 2023', time: '11:20' },
  { id: 5, type: 'Video Generation', icon: PlaySquare, color: 'text-blue-400', detail: 'Cinematic tracking shot of a sports car driving through a mountain pass', status: 'Processing', date: 'Oct 20, 2023', time: '10:05' },
  { id: 6, type: 'Image Generation', icon: ImagePlus, color: 'text-purple-400', detail: 'Minimalist logo design for a coffee shop with a steam icon', status: 'Completed', date: 'Oct 18, 2023', time: '15:10' },
];

export const HistoryLogsContent = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = historyData.filter(item => 
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.detail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-[1240px] flex flex-col pb-10 min-w-0">
      <div className="mb-8 mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-medium mb-1.5 text-white">History logs</h1>
          <p className="text-[#7A7A80] text-[15px]">View and manage your recently generated content and activities.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
          <button className="flex items-center justify-center gap-2 bg-[#1B1B21] hover:bg-[#24242B] border border-[#24242B] text-[#EAEAEA] px-5 py-2.5 rounded-full text-[14px] transition-colors w-full sm:w-auto">
            <Filter size={16} className="text-[#A1A1A5]" /> Filter
          </button>
        </div>
      </div>

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
                      <div className={`w-8 h-8 rounded-full bg-[#1B1B21] flex items-center justify-center border border-[#24242B]`}>
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
                      {item.status === 'Completed' && <CheckCircle size={15} className="text-[#10B981]" />}
                      {item.status === 'Failed' && <AlertCircle size={15} className="text-[#EF4444]" />}
                      {item.status === 'Processing' && <Clock3 size={15} className="text-[#F59E0B]" />}
                      <span className={`text-[13.5px] font-medium ${
                        item.status === 'Completed' ? 'text-[#10B981]' : 
                        item.status === 'Failed' ? 'text-[#EF4444]' : 'text-[#F59E0B]'
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
                       <button className="w-8 h-8 rounded-full bg-[#1B1B21] flex items-center justify-center text-[#A1A1A5] hover:text-white hover:bg-[#24242B] border border-[#24242B] hover:border-[#3A3A40] transition-all" title="View details">
                         <Eye size={15} />
                       </button>
                     </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#7A7A80] text-[14px]">
                    No logs found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
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
    </div>
  );
};
