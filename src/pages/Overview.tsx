import { 
  Video, 
  Wand2, 
  RefreshCw, 
  Layers, 
  Zap, 
  Film, 
  Folder, 
  Target, 
  Scissors, 
  Sparkles, 
  ArrowRight, 
  MoreVertical 
} from 'lucide-react';

export const OverviewContent = () => (
  <div className="flex-1 w-full max-w-[1100px]">
    {/* Header */}
    <div className="mb-8 mt-2">
      <h1 className="text-[28px] font-bold mb-1.5 text-white tracking-tight">
        Welcome back, <span className="text-[#9758FF] font-medium">TD</span> 👋
      </h1>
      <p className="text-[#A1A1A5] text-[15px]">
        Let's turn your ideas into high-performing content.
      </p>
    </div>

    {/* Creation Actions */}
    <div className="bg-[#131316] rounded-2xl border border-[#24242B] p-8 mb-6">
      <h2 className="text-[20px] font-semibold text-white mb-1">What do you want to create today?</h2>
      <p className="text-[#A1A1A5] text-[14px] mb-6">Start with a blank canvas or let AI do the heavy lifting.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Create Video */}
        <div className="bg-[#1B1B21] rounded-[14px] p-5 border border-[#24242B] hover:border-[#9758FF]/50 hover:shadow-[0_4px_15px_rgba(151,88,255,0.15)] transition-colors cursor-pointer group flex flex-col relative min-h-[160px] justify-between pb-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#9758FF] flex items-center justify-center mb-4">
              <Video size={24} className="text-white" strokeWidth={2} />
            </div>
            <h3 className="text-white font-medium text-[15px] mb-1">Create Video</h3>
            <p className="text-[#A1A1A5] text-[13px] leading-snug">Generate a video from a prompt</p>
          </div>
          <div className="absolute bottom-5 right-5 w-7 h-7 rounded-full bg-[#3A3A40] group-hover:bg-[#9758FF] flex items-center justify-center transition-colors">
            <ArrowRight size={14} className="text-white" />
          </div>
        </div>

        {/* Generate Prompt */}
        <div className="bg-[#1B1B21] rounded-[14px] p-5 border border-[#24242B] hover:border-[#9758FF]/50 hover:shadow-[0_4px_15px_rgba(151,88,255,0.15)] transition-colors cursor-pointer group flex flex-col relative min-h-[160px] justify-between pb-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#9758FF] flex items-center justify-center mb-4">
              <Wand2 size={24} className="text-white" strokeWidth={2} />
            </div>
            <h3 className="text-white font-medium text-[15px] mb-1">Generate Prompt</h3>
            <p className="text-[#A1A1A5] text-[13px] leading-snug">Get AI-powered prompt ideas</p>
          </div>
          <div className="absolute bottom-5 right-5 w-7 h-7 rounded-full bg-[#3A3A40] group-hover:bg-[#9758FF] flex items-center justify-center transition-colors">
            <ArrowRight size={14} className="text-white" />
          </div>
        </div>

        {/* Regenerate */}
        <div className="bg-[#1B1B21] rounded-[14px] p-5 border border-[#24242B] hover:border-[#9758FF]/50 hover:shadow-[0_4px_15px_rgba(151,88,255,0.15)] transition-colors cursor-pointer group flex flex-col relative min-h-[160px] justify-between pb-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#9758FF] flex items-center justify-center mb-4">
              <RefreshCw size={24} className="text-white" strokeWidth={2} />
            </div>
            <h3 className="text-white font-medium text-[15px] mb-1">Regenerate</h3>
            <p className="text-[#A1A1A5] text-[13px] leading-snug">Improve your existing content</p>
          </div>
          <div className="absolute bottom-5 right-5 w-7 h-7 rounded-full bg-[#3A3A40] group-hover:bg-[#9758FF] flex items-center justify-center transition-colors">
            <ArrowRight size={14} className="text-white" />
          </div>
        </div>

        {/* Templates */}
        <div className="bg-[#1B1B21] rounded-[14px] p-5 border border-[#24242B] hover:border-[#9758FF]/50 hover:shadow-[0_4px_15px_rgba(151,88,255,0.15)] transition-colors cursor-pointer group flex flex-col relative min-h-[160px] justify-between pb-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#9758FF] flex items-center justify-center mb-4">
              <Layers size={24} className="text-white" strokeWidth={2} />
            </div>
            <h3 className="text-white font-medium text-[15px] mb-1">Templates</h3>
            <p className="text-[#A1A1A5] text-[13px] leading-snug">Use proven templates that convert</p>
          </div>
          <div className="absolute bottom-5 right-5 w-7 h-7 rounded-full bg-[#3A3A40] group-hover:bg-[#9758FF] flex items-center justify-center transition-colors">
            <ArrowRight size={14} className="text-white" />
          </div>
        </div>
      </div>
    </div>

    {/* Metrics Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Primary Metric: Credits Remaining */}
      <div className="md:col-span-1 bg-[#131316] rounded-2xl p-6 flex flex-col border border-[#24242B] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-[#A1A1A5] text-[14.5px] font-medium">Credits Remaining</span>
          <Zap size={14} className="text-[#9758FF]" strokeWidth={2.5} />
        </div>
        <div className="flex items-center justify-between mb-2 mt-auto">
            <div className="flex flex-col">
                <div className="text-[42px] font-bold text-white leading-none tracking-tight">120</div>
                <div className="text-[13px] text-[#A1A1A5] mt-1 relative z-10">credits left</div>
            </div>
            {/* simple circle progress indicator mockup */}
            <div className="absolute bottom-16 right-6 w-[70px] h-[70px] rounded-full border-[6px] border-[#9758FF]/20 border-r-[#9758FF] border-b-[#9758FF] border-t-[#9758FF] flex items-center justify-center transform -rotate-45">
                <div className="transform rotate-45">
                    <Zap size={24} className="text-[#9758FF]" fill="#9758FF" />
                </div>
            </div>
        </div>
        <div className="mt-6">
            <div className="h-1 w-full bg-[#24242B] rounded-full mb-2 overflow-hidden">
                <div className="h-full bg-[#9758FF] w-[60%] rounded-full shadow-[0_0_10px_rgba(151,88,255,0.8)]"></div>
            </div>
            <span className="text-[12px] font-medium"><span className="text-[#c084fc]">60%</span> <span className="text-[#7A7A80]">of your plan</span></span>
        </div>
      </div>

      {/* Videos Created */}
      <div className="bg-[#131316] rounded-2xl p-6 flex flex-col border border-[#24242B] relative overflow-hidden group hover:border-[#3A3A40] transition-colors cursor-pointer">
        <div className="flex justify-between items-start mb-8">
          <span className="text-[#A1A1A5] text-[14.5px] font-medium">Videos Created</span>
          <Film size={20} className="text-[#c084fc]" strokeWidth={1.5} />
        </div>
        <div className="text-[42px] font-bold mb-1 text-white leading-none">28</div>
        <div className="text-[13px] text-[#A1A1A5] mb-5">total videos</div>
        <div className="mt-auto text-[13.5px] font-medium text-[#c084fc]">
          Keep creating!
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-[#131316] rounded-2xl p-6 flex flex-col border border-[#24242B] relative overflow-hidden group hover:border-[#3A3A40] transition-colors cursor-pointer">
        <div className="flex justify-between items-start mb-8">
          <span className="text-[#A1A1A5] text-[14.5px] font-medium">Active Projects</span>
          <Folder size={18} className="text-[#4ade80]" strokeWidth={1.5} />
        </div>
        <div className="text-[42px] font-bold mb-1 text-white leading-none">3</div>
        <div className="text-[13px] text-[#A1A1A5] mb-5">active projects</div>
        <div className="mt-auto text-[13.5px] font-medium text-[#4ade80]">
          Pick up where you left off
        </div>
      </div>
    </div>

    {/* What to do next */}
    <div className="bg-[#131316] rounded-2xl border border-[#24242B] p-8 mb-6">
      <h2 className="text-[18px] font-semibold text-white mb-1">What to do next</h2>
      <p className="text-[#A1A1A5] text-[14px] mb-6">Smart suggestions to help you get better results.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Suggestion 1 */}
        <div className="bg-[#1B1B21] rounded-xl p-5 border border-[#24242B] flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#312e81] flex shrink-0 items-center justify-center text-[#c7d2fe]">
            <Target size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col flex-1 h-full">
            <h4 className="text-[14px] font-semibold text-white mb-1.5">Improve your hooks</h4>
            <p className="text-[12.5px] text-[#A1A1A5] leading-snug mb-3">Create stronger first 3 seconds that grab attention.</p>
            <div className="mt-auto self-end w-6 h-6 rounded-full border border-[#3A3A40] flex items-center justify-center text-[#A1A1A5] hover:text-white hover:border-[#7A7A80] transition-colors cursor-pointer">
               <ArrowRight size={12} />
            </div>
          </div>
        </div>

        {/* Suggestion 2 */}
        <div className="bg-[#1B1B21] rounded-xl p-5 border border-[#24242B] flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#831843] flex shrink-0 items-center justify-center text-[#fbcfe8]">
            <Scissors size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col flex-1 h-full">
            <h4 className="text-[14px] font-semibold text-white mb-1.5">Try shorter videos</h4>
            <p className="text-[12.5px] text-[#A1A1A5] leading-snug mb-3">Videos under 30s are getting better results.</p>
            <div className="mt-auto self-end w-6 h-6 rounded-full border border-[#3A3A40] flex items-center justify-center text-[#A1A1A5] hover:text-white hover:border-[#7A7A80] transition-colors cursor-pointer">
               <ArrowRight size={12} />
            </div>
          </div>
        </div>

        {/* Suggestion 3 */}
        <div className="bg-[#1B1B21] rounded-xl p-5 border border-[#24242B] flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#064e3b] flex shrink-0 items-center justify-center text-[#6ee7b7]">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col flex-1 h-full">
            <h4 className="text-[14px] font-semibold text-white mb-1.5">Use your top style</h4>
            <p className="text-[12.5px] text-[#A1A1A5] leading-snug mb-3">Your cinematic style is your top performer.</p>
            <div className="mt-auto self-end w-6 h-6 rounded-full border border-[#3A3A40] flex items-center justify-center text-[#A1A1A5] hover:text-white hover:border-[#7A7A80] transition-colors cursor-pointer">
               <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Recent Projects */}
    <div className="mb-6">
      <div className="flex items-end justify-between mb-5 px-1">
        <div>
           <h2 className="text-[18px] font-semibold text-white mb-1">Recent Projects</h2>
           <p className="text-[#A1A1A5] text-[14px]">Jump back into your recent work.</p>
        </div>
        <button className="text-[14px] text-[#c084fc] hover:text-[#d8b4fe] font-medium transition-colors">View all</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Morning Motivation", time: "Edited 2 hours ago", duration: "00:28", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80" },
          { title: "Dream Big", time: "Edited 1 day ago", duration: "00:32", img: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&w=600&q=80" },
          { title: "Focus Discipline", time: "Edited 2 days ago", duration: "00:41", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80" }
        ].map((item, i) => (
          <div key={i} className="bg-[#131316] rounded-xl border border-[#24242B] overflow-hidden group cursor-pointer hover:border-[#3A3A40] transition-colors">
            <div className="relative h-[160px] w-full bg-[#1B1B21]">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-[4px] text-[12px] font-medium text-white shadow-sm border border-white/10">
                {item.duration}
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="text-[14.5px] font-medium text-white mb-0.5">{item.title}</h4>
                <p className="text-[12.5px] text-[#7A7A80]">{item.time}</p>
              </div>
              <button className="text-[#7A7A80] hover:text-white transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
