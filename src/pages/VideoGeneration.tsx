import React, { useState } from 'react';
import { 
  RefreshCw, 
  Video, 
  Play, 
  Download, 
  Share2, 
  Palette, 
  Maximize, 
  Clock, 
  Mic, 
  ChevronDown,
  ChevronLeft,
  Smartphone,
  BookOpen,
  ShoppingBag,
  Mic2,
  Film,
  Check,
  Plus,
  Search,
  MoreVertical,
  Twitter,
  Facebook,
  Wand2,
  Camera,
  Maximize2,
  Trash,
  Edit2,
  Copy,
  Sparkles,
  ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mockVideoProjects = [
  { id: 1, title: "Futuristic City Flyover", date: "2 hours ago", style: "Cinematic", duration: "15s", thumbnail: "https://images.unsplash.com/photo-1512413915582-74d3fc827e8a?q=80&w=2938&auto=format&fit=crop" },
  { id: 2, title: "Product Promo: Coffee", date: "5 hours ago", style: "Product Ad", duration: "10s", thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" },
  { id: 3, title: "Nature Documentary Intro", date: "1 day ago", style: "Storytelling", duration: "20s", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2564&auto=format&fit=crop" },
  { id: 4, title: "TikTok Dance Highlight", date: "3 days ago", style: "Social / TikTok", duration: "8s", thumbnail: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=2670&auto=format&fit=crop" },
];

const visualStyles = [
  { 
    id: 'cinematic', 
    name: 'Cinematic', 
    icon: Film, 
    desc: 'Epic visuals and dramatic storytelling with high-production value looks.', 
    badge: 'BEST FOR STORYTELLING',
    img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop' 
  },
  { 
    id: 'social', 
    name: 'Social / TikTok', 
    icon: Smartphone, 
    desc: 'Fast-paced, vertical content designed to capture attention instantly.', 
    badge: 'BEST FOR ENGAGEMENT',
    img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=600&fit=crop' 
  },
  { 
    id: 'storytelling', 
    name: 'Storytelling', 
    icon: BookOpen, 
    desc: 'Focus on narrative flow with professional voiceover and transitions.', 
    badge: 'BEST FOR DOCUMENTARIES',
    img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop' 
  },
  { 
    id: 'product', 
    name: 'Product Ad', 
    icon: ShoppingBag, 
    desc: 'Showcase products with high-end lighting and persuasive copy overlays.', 
    badge: 'BEST FOR SALES',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=600&fit=crop' 
  },
  { 
    id: 'talking', 
    name: 'Talking / Voiceover', 
    icon: Mic2, 
    desc: 'Perfect for educational content, podcasts, and personal commentaries.', 
    badge: 'BEST FOR TUTORIALS',
    img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=600&fit=crop' 
  },
];

export const VideoGenerationContent = () => {
  const [view, setView] = useState<'list' | 'input' | 'thinking' | 'result' | 'details'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // Selection states
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [selectedFrame, setSelectedFrame] = useState('Portrait (9:16)');
  const [selectedLength, setSelectedLength] = useState('15s');
  const [selectedVoice, setSelectedVoice] = useState('Select a voice');
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedProject = mockVideoProjects.find(p => p.id === selectedProjectId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = () => {
    if (!prompt) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt(prev => `${prev}, cinematic motion, drone shot, hyper-realistic, 4k 60fps, epic orchestral background`);
      setIsEnhancing(false);
    }, 1200);
  };

  const handleGenerate = () => {
    setView('thinking');
    setTimeout(() => setView('result'), 1500);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex-1 w-full max-w-[1100px] flex flex-col pb-10">
      <AnimatePresence mode="wait">
        
        {/* VIEW: LIST (Video Library) */}
        {view === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-8"
          >
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-[#9758FF]/10 p-2 rounded-lg">
                    <Video size={20} className="text-[#9758FF]" />
                  </div>
                  <h1 className="text-[28px] font-bold text-white tracking-tight">Video Library</h1>
                </div>
                <p className="text-[#A1A1A5] text-[16px]">Manage and play your AI-generated video projects.</p>
              </div>
              <button 
                onClick={() => setView('input')}
                className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
              >
                <Plus size={20} /> New Video Generation
              </button>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="w-full bg-[#131316] border border-white/5 rounded-full pl-11 pr-5 py-3 text-[14px] text-white focus:outline-none focus:border-[#9758FF]/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockVideoProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => { setSelectedProjectId(project.id); setView('details'); }}
                  className="bg-[#131316]/50 border border-white/5 rounded-2xl overflow-hidden hover:border-[#9758FF]/30 transition-all group cursor-pointer"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <Play className="text-white ml-1" size={24} fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[11px] font-bold text-white border border-white/10">
                      {project.duration}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#9758FF] bg-[#9758FF]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{project.style}</span>
                      <div className="flex items-center gap-1.5 text-[#5A5A60]">
                        <Clock size={12} />
                        <span className="text-[11px]">{project.date}</span>
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-[16px] truncate group-hover:text-[#9758FF] transition-colors">{project.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW: INPUT (Config Studio) */}
        {view === 'input' && (
          <motion.div 
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-8"
          >
            <div className="mt-2">
              <button 
                onClick={() => setView('list')} 
                className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors mb-6"
              >
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Library</span>
              </button>
              <h1 className="text-[32px] font-bold text-white tracking-tight mb-2">Video Generation</h1>
              <p className="text-[#A1A1A5] text-[16px]">Generate engaging videos from text, images, or concepts effortlessly.</p>
            </div>

            <div className="bg-[#131316]/30 border border-white/5 rounded-[32px] p-6 sm:p-10 flex flex-col gap-10">
              {/* Preview & Upload Area */}
              <div className="relative aspect-video rounded-[24px] overflow-hidden bg-[#08080A] group border border-white/[0.05]">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
                
                {uploadedImage ? (
                  <div className="w-full h-full relative">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2.5 rounded-full text-[14px] font-bold text-white hover:bg-white/20 transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={16} /> Change Image
                      </button>
                      <button 
                        onClick={() => setUploadedImage(null)}
                        className="bg-[#EF4444]/20 backdrop-blur-md border border-[#EF4444]/30 px-6 py-2.5 rounded-full text-[14px] font-bold text-[#EF4444] hover:bg-[#EF4444]/30 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-all"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#9758FF]/10 flex items-center justify-center border border-[#9758FF]/20 group-hover:scale-110 transition-transform">
                      <ImagePlus size={24} className="text-[#9758FF]" />
                    </div>
                    <div className="text-center">
                      <div className="text-[16px] font-bold text-white mb-1">Image-to-Video</div>
                      <div className="text-[13px] text-[#5A5A60]">Upload the starting frame for your video</div>
                    </div>
                  </div>
                )}
                
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#9758FF] shadow-[0_0_8px_#9758FF]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">Preview</span>
                </div>
              </div>

              {/* Prompt Section */}
              <div className="space-y-4">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your video idea in detail..."
                  className="w-full bg-transparent border-none text-[18px] text-white placeholder-[#5A5A60] focus:outline-none resize-none leading-relaxed min-h-[60px]"
                />
              </div>

              {/* Settings Sections */}
              <div className="space-y-10">
                {/* Visual Style */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Palette size={20} className="text-[#9758FF]" />
                    <span className="text-[15px] font-semibold text-white">Visual Style</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {visualStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`flex flex-col h-full rounded-2xl border transition-all text-left overflow-hidden group ${
                          selectedStyle === style.id 
                            ? 'bg-[#9758FF]/10 border-[#9758FF] shadow-[0_0_20px_rgba(151,88,255,0.1)]' 
                            : 'bg-[#131316]/50 border-[#24242B] hover:border-[#3A3A40]'
                        }`}
                      >
                        <div className="aspect-[4/5] relative overflow-hidden">
                          <img src={style.img} alt={style.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          {selectedStyle === style.id && (
                            <div className="absolute top-2 right-2 bg-[#9758FF] rounded-full p-1">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <style.icon size={14} className={selectedStyle === style.id ? 'text-[#9758FF]' : 'text-[#7A7A80]'} />
                            <span className="text-[13px] font-bold text-white">{style.name}</span>
                          </div>
                          <p className="text-[11px] text-[#5A5A60] leading-normal line-clamp-3">
                            {style.desc}
                          </p>
                          <div className="mt-auto pt-2">
                            <span className="text-[8px] font-black text-[#5A5A60] bg-[#1A1A20] px-2 py-1 rounded-[4px] uppercase tracking-widest group-hover:text-[#9758FF] transition-colors">
                              {style.badge}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Frame */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Maximize size={20} className="text-[#9758FF]" />
                    <span className="text-[15px] font-semibold text-white">Video Frame</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['Portrait (9:16)', 'Landscape (16:9)'].map((frame) => (
                      <button 
                        key={frame}
                        onClick={() => setSelectedFrame(frame)}
                        className={`px-6 py-2.5 rounded-full border text-[14px] font-medium transition-all ${
                          selectedFrame === frame 
                            ? 'bg-[#9758FF] border-[#9758FF] text-white shadow-[0_5px_15px_rgba(151,88,255,0.3)]' 
                            : 'bg-[#131316]/50 border-[#24242B] text-[#7A7A80] hover:border-[#3A3A40]'
                        }`}
                      >
                        {frame}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Length */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={20} className="text-[#9758FF]" />
                    <span className="text-[15px] font-semibold text-white">Video Length</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['Short (5-10s)', 'Long (10-20s)'].map((len) => (
                      <button 
                        key={len}
                        onClick={() => setSelectedLength(len)}
                        className={`px-6 py-2.5 rounded-full border text-[14px] font-medium transition-all ${
                          selectedLength === len 
                            ? 'bg-[#9758FF] border-[#9758FF] text-white shadow-[0_5px_15px_rgba(151,88,255,0.3)]' 
                            : 'bg-[#131316]/50 border-[#24242B] text-[#7A7A80] hover:border-[#3A3A40]'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Sync */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mic size={20} className="text-[#9758FF]" />
                    <span className="text-[15px] font-semibold text-white">Voice Sync (Optional)</span>
                  </div>
                  <div className="relative group">
                    <select 
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full bg-[#131316]/80 border border-white/5 text-[#EAEAEA] rounded-xl px-5 py-4 text-[15px] focus:outline-none focus:border-[#9758FF]/50 appearance-none transition-all cursor-pointer shadow-xl"
                    >
                      <option className="bg-[#131316] text-white">Select a voice</option>
                      <option className="bg-[#131316] text-white">Adam (Narrator)</option>
                      <option className="bg-[#131316] text-white">Luna (Professional)</option>
                      <option className="bg-[#131316] text-white">Xander (Energetic)</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#5A5A60] pointer-events-none group-hover:text-white transition-colors" />
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={handleGenerate}
                  disabled={!prompt}
                  className="w-full bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white py-5 rounded-2xl font-bold text-[16px] transition-all flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(151,88,255,0.2)] active:scale-[0.99] mt-4"
                >
                  <Video size={20} fill="currentColor" />
                  Generate video
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: THINKING */}
        {view === 'thinking' && (
          <motion.div 
            key="thinking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col items-center justify-center py-20"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 rounded-full border-2 border-dashed border-[#9758FF]/20"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border-2 border-dashed border-[#3B82F6]/20"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Video size={40} className="text-[#9758FF] animate-pulse" />
              </div>
            </div>
            <h2 className="text-white text-[22px] font-semibold mt-10 mb-2">Rendering Project</h2>
            <p className="text-[#7A7A80] text-[15px]">Stitching frames and syncing audio...</p>
          </motion.div>
        )}

        {/* VIEW: RESULT */}
        {view === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between mt-2">
              <button 
                onClick={() => setView('input')} 
                className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
              >
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Studio</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#10B981]/10 rounded-full border border-[#10B981]/20">
                <Check size={14} className="text-[#10B981]" />
                <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">Rendered</span>
              </div>
            </div>

            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[32px] p-8 sm:p-10">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-[#131316] border border-white/[0.05] shadow-2xl mb-10 group">
                <img src="https://images.unsplash.com/photo-1512413915582-74d3fc827e8a?q=80&w=2938&auto=format&fit=crop" className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                   <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:bg-white/30 transition-all scale-110">
                    <Play className="text-white ml-2" size={32} fill="currentColor" />
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                <div className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#9758FF]/10 p-2 rounded-lg text-[#9758FF]">
                        <Wand2 size={18} />
                      </div>
                      <h3 className="text-white font-bold text-[15px]">Subject Concept</h3>
                    </div>
                  </div>
                  <p className="text-[#A1A1A5] text-[14px] leading-relaxed italic">
                    "{prompt || "A cinematic journey through a futuristic metropolis at night, neon reflections on glass towers..."}"
                  </p>
                </div>
                <div className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#3B82F6]/10 p-2 rounded-lg text-[#3B82F6]">
                        <Camera size={18} />
                      </div>
                      <h3 className="text-white font-bold text-[15px]">Production Specs</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Resolution</span>
                      <span className="text-[#A1A1A5]">4K Cinematic</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Frame Rate</span>
                      <span className="text-[#A1A1A5]">60 FPS</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Style</span>
                      <span className="text-[#A1A1A5] font-bold uppercase text-[10px] tracking-widest">{selectedStyle}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-[#9758FF] text-white py-4.5 rounded-2xl font-bold text-[16px] hover:bg-[#854EE6] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(151,88,255,0.3)]">
                  <Download size={20} /> Download HD Video
                </button>
                <div className="flex gap-2">
                  <button className="p-4 bg-[#161619] border border-white/5 text-[#5A5A60] rounded-2xl hover:text-[#1DA1F2] transition-all">
                    <Twitter size={20} />
                  </button>
                  <button className="p-4 bg-[#161619] border border-white/5 text-[#5A5A60] rounded-2xl hover:text-[#4267B2] transition-all">
                    <Facebook size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: DETAILS */}
        {view === 'details' && selectedProject && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between mt-2">
              <button 
                onClick={() => setView('list')} 
                className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
              >
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Project Library</span>
              </button>
              <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-xl bg-[#1A1A20] text-[#7A7A80] hover:text-white transition-all border border-white/5 hover:border-white/10" title="Edit Project">
                  <Edit2 size={16} />
                </button>
                <button className="p-2.5 rounded-xl bg-[#1A1A20] text-[#EF4444] hover:bg-[#EF4444]/10 transition-all border border-white/5 hover:border-[#EF4444]/20" title="Delete Project">
                  <Trash size={16} />
                </button>
              </div>
            </div>

            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[40px] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              {/* Decorative background blur */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#9758FF]/5 blur-[120px] -z-10 rounded-full" />
              
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-black text-[#9758FF] bg-[#9758FF]/10 px-3 py-1.5 rounded-full uppercase tracking-[0.1em] border border-[#9758FF]/20">
                      {selectedProject.style}
                    </span>
                    <span className="text-[10px] font-black text-white/50 bg-white/5 px-3 py-1.5 rounded-full uppercase tracking-[0.1em] border border-white/10">
                      {selectedProject.duration}
                    </span>
                    <span className="text-[10px] font-black text-[#10B981] bg-[#10B981]/10 px-3 py-1.5 rounded-full uppercase tracking-[0.1em] border border-[#10B981]/20">
                      COMPLETED
                    </span>
                  </div>
                  <h1 className="text-[42px] font-bold text-white tracking-tight leading-[1.1]">{selectedProject.title}</h1>
                  <div className="flex items-center gap-4 text-[#5A5A60]">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span className="text-[14px]">Produced {selectedProject.date}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="flex items-center gap-2">
                      <Film size={16} />
                      <span className="text-[14px]">4K Cinematic Master</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-8 py-4 rounded-2xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(151,88,255,0.3)] active:scale-[0.98]">
                    <Download size={18} /> Export Project
                  </button>
                  <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-[15px] transition-all border border-white/5 flex items-center justify-center gap-2">
                    <RefreshCw size={18} /> Re-render
                  </button>
                </div>
              </div>

              {/* Cinematic Preview */}
              <div className="relative aspect-video rounded-[32px] overflow-hidden bg-[#08080A] shadow-[0_30px_60px_rgba(0,0,0,0.5)] mb-12 group cursor-pointer border border-white/5">
                <img src={selectedProject.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-all">
                   <div className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-[#9758FF] group-hover:border-[#9758FF]">
                    <Play className="text-white ml-2 transition-transform duration-500 group-hover:scale-110" size={40} fill="currentColor" />
                   </div>
                </div>
                {/* Duration Badge */}
                <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-[12px] font-bold text-white border border-white/10">
                  {selectedProject.duration}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#9758FF]/10 p-2.5 rounded-xl text-[#9758FF]">
                      <Wand2 size={20} />
                    </div>
                    <h3 className="text-white font-bold text-[16px]">Production Concept</h3>
                  </div>
                  <div className="relative">
                    <p className="text-[#A1A1A5] text-[15px] leading-relaxed italic pr-12">
                      "A professional cinematic sweep through a futuristic environment, utilizing high-dynamic range lighting and advanced camera interpolation to achieve a masterpiece-level production quality."
                    </p>
                    <button className="absolute top-0 right-0 p-2 text-[#5A5A60] hover:text-white transition-colors">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#3B82F6]/10 p-2.5 rounded-xl text-[#3B82F6]">
                      <Camera size={20} />
                    </div>
                    <h3 className="text-white font-bold text-[16px]">Export Specs</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Resolution</span>
                      <span className="text-white text-[13px] font-medium">4K Ultra HD</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Frame Rate</span>
                      <span className="text-white text-[13px] font-medium">60 FPS</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Bitrate</span>
                      <span className="text-white text-[13px] font-medium">50 Mbps</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Voiceover</span>
                      <span className="text-[#10B981] text-[11px] font-bold uppercase tracking-wider">Synced</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <span className="text-[#5A5A60] text-[13px] font-medium">Project Social Share:</span>
                  <div className="flex gap-3">
                    {[
                      { icon: Twitter, color: 'hover:text-[#1DA1F2]', label: 'X' },
                      { icon: Facebook, color: 'hover:text-[#4267B2]', label: 'Facebook' },
                      { icon: Share2, color: 'hover:text-[#9758FF]', label: 'Copy Link' }
                    ].map((social, i) => (
                      <button key={i} className={`p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[#5A5A60] transition-all group relative ${social.color}`}>
                        <social.icon size={18} />
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {social.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] rounded-lg border border-white/5">
                  <span className="text-[#5A5A60] text-[12px] font-mono">PROJECT_ID:</span>
                  <span className="text-[#A1A1A5] text-[12px] font-mono">VID-882-941-XJ</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
