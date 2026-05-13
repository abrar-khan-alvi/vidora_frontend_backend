import React, { useState, useRef } from 'react';
import { 
  RefreshCw, 
  Image as ImageIcon,
  Maximize,
  Sparkles,
  Camera,
  Zap,
  Wand2,
  Layers,
  Cpu,
  Download,
  Maximize2,
  ChevronRight,
  Clock,
  Check,
  Plus,
  MoreVertical,
  Search,
  Edit2,
  Trash,
  Copy,
  Twitter,
  Facebook,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', icon: Camera, description: 'Photorealistic & Moody' },
  { id: 'digital-art', label: 'Digital Art', icon: Layers, description: 'Clean & Modern Vector' },
  { id: 'anime', label: 'Anime', icon: Wand2, description: 'Vibrant hand-drawn' },
  { id: '3d-render', label: '3D Render', icon: Cpu, description: 'Octane / Unreal Engine' },
  { id: 'oil-painting', label: 'Oil Painting', icon: Sparkles, description: 'Classical brush strokes' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, description: 'Neon & Futuristic' },
];

const mockGeneratedImages = [
  { id: 1, title: "Majestic Lion on Throne", date: "2 hours ago", style: "3D Render", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" },
  { id: 2, title: "Neon Cyberpunk City", date: "5 hours ago", style: "Cyberpunk", url: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=2670&auto=format&fit=crop" },
  { id: 3, title: "Ethereal Forest Spirit", date: "1 day ago", style: "Cinematic", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2564&auto=format&fit=crop" },
  { id: 4, title: "Minimalist Space Station", date: "3 days ago", style: "Digital Art", url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2672&auto=format&fit=crop" },
];

const ratios = [
  { id: '1:1', label: '1:1 Square' },
  { id: '16:9', label: '16:9 Cinema' },
  { id: '9:16', label: '9:16 Portrait' },
  { id: '4:3', label: '4:3 Classic' },
  { id: '21:9', label: '21:9 UltraWide' },
];

export const ImageGenerationContent = () => {
  const [view, setView] = useState<'list' | 'input' | 'thinking' | 'result' | 'details'>('list');
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = mockGeneratedImages.find(img => img.id === selectedImageId);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(URL.createObjectURL(file));
  };

  const handleEnhance = () => {
    if (!prompt) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt(prev => `${prev}, highly detailed, cinematic lighting, 8k resolution, masterwork, trending on artstation`);
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
    <div className="flex-1 w-full max-w-[1000px] flex flex-col pb-10">
      <AnimatePresence mode="wait">
        
        {/* VIEW: LIST (Image Gallery) */}
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
                    <ImageIcon size={20} className="text-[#9758FF]" />
                  </div>
                  <h1 className="text-[28px] font-bold text-white tracking-tight">Image Gallery</h1>
                </div>
                <p className="text-[#A1A1A5] text-[16px]">Browse and manage your AI-generated masterpieces.</p>
              </div>
              <button 
                onClick={() => setView('input')}
                className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
              >
                <Plus size={20} /> New Image Generation
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
                <input 
                  type="text" 
                  placeholder="Search your gallery..." 
                  className="w-full bg-[#131316] border border-white/5 rounded-full pl-11 pr-5 py-3 text-[14px] text-white focus:outline-none focus:border-[#9758FF]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {mockGeneratedImages.map((img) => (
                <div 
                  key={img.id}
                  onClick={() => { setSelectedImageId(img.id); setView('details'); }}
                  className="bg-[#131316]/50 border border-white/5 rounded-2xl overflow-hidden hover:border-[#9758FF]/30 transition-all group cursor-pointer"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <div className="flex gap-2 w-full">
                        <button className="flex-1 bg-white/10 backdrop-blur-md border border-white/10 text-white py-2 rounded-lg text-[12px] font-bold hover:bg-white/20 transition-all">View Details</button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); /* handle download */ }}
                          className="p-2 bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#9758FF] bg-[#9758FF]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{img.style}</span>
                      <div className="flex items-center gap-1.5 text-[#5A5A60]">
                        <Clock size={12} />
                        <span className="text-[11px]">{img.date}</span>
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-[16px] truncate group-hover:text-[#9758FF] transition-colors">{img.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW: INPUT */}
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
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Gallery</span>
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#9758FF]/10 p-2 rounded-lg">
                  <ImageIcon size={20} className="text-[#9758FF]" />
                </div>
                <h1 className="text-[28px] font-bold text-white tracking-tight">Image Studio</h1>
              </div>
              <p className="text-[#A1A1A5] text-[16px]">Transform your imagination into high-quality AI visuals.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Input and Styles */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#131316]/50 border border-white/[0.05] rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-[14px] font-medium text-[#EAEAEA] uppercase tracking-wider">Describe your vision</label>
                    <button 
                      onClick={handleEnhance}
                      disabled={!prompt || isEnhancing}
                      className="flex items-center gap-2 text-[12px] font-bold text-[#9758FF] hover:text-[#854EE6] transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={14} className={isEnhancing ? 'animate-spin' : ''} />
                      {isEnhancing ? 'Enhancing...' : 'Magic Enhance'}
                    </button>
                  </div>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g. A majestic lion sitting on a neon throne in a futuristic city..."
                    className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-2xl px-5 py-5 text-[15px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 transition-all min-h-[160px] resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#EAEAEA] mb-4 uppercase tracking-wider">Artistic Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stylePresets.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${
                          selectedStyle === style.id 
                            ? 'bg-[#9758FF]/10 border-[#9758FF] shadow-[0_0_15px_rgba(151,88,255,0.1)]' 
                            : 'bg-[#131316]/50 border-[#24242B] hover:border-[#3A3A40]'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mb-3 ${selectedStyle === style.id ? 'bg-[#9758FF] text-white' : 'bg-[#08080A] text-[#7A7A80] group-hover:text-white'}`}>
                          <style.icon size={18} />
                        </div>
                        <div className={`text-[14px] font-bold ${selectedStyle === style.id ? 'text-white' : 'text-[#A1A1A5]'}`}>{style.label}</div>
                        <div className="text-[11px] text-[#5A5A60] mt-1 line-clamp-1">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Settings and Reference */}
              <div className="space-y-8">
                <div>
                  <label className="block text-[14px] font-medium text-[#EAEAEA] mb-4 uppercase tracking-wider">Aspect Ratio</label>
                  <div className="flex flex-col gap-2.5">
                    {ratios.map((ratio) => (
                      <button 
                        key={ratio.id}
                        onClick={() => setSelectedRatio(ratio.id)}
                        className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all ${
                          selectedRatio === ratio.id 
                            ? 'bg-[#9758FF] border-[#9758FF] text-white' 
                            : 'bg-[#131316]/50 border-[#24242B] text-[#7A7A80] hover:border-[#3A3A40]'
                        }`}
                      >
                        <span className="text-[14px] font-medium">{ratio.label}</span>
                        {selectedRatio === ratio.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#EAEAEA] mb-4 uppercase tracking-wider">Image Reference</label>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  <div 
                    onClick={handleUploadClick}
                    className={`relative aspect-video rounded-2xl bg-[#131316]/50 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${selectedFile ? 'border-[#9758FF]/50 bg-[#9758FF]/5' : 'border-[#24242B] hover:border-[#3A3A40]'}`}
                  >
                    {selectedFile ? (
                      <>
                        <img src={selectedFile} alt="Reference" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-bold uppercase tracking-wider">Change Image</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Plus size={20} className="text-[#5A5A60] mb-2" />
                        <p className="text-[#7A7A80] text-[13px] font-medium">Add Image</p>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={!prompt}
                  className="w-full bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 text-white py-5 rounded-2xl font-bold text-[16px] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(151,88,255,0.3)] active:scale-[0.98] mt-4"
                >
                  <Zap size={20} fill="currentColor" />
                  Generate Masterpiece
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
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 rounded-full border-2 border-dashed border-[#9758FF]/30"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-2 border-dashed border-[#3B82F6]/30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon size={32} className="text-[#9758FF] animate-pulse" />
              </div>
            </div>
            <h2 className="text-white text-[20px] font-semibold mt-8 mb-2">Generating Image</h2>
            <p className="text-[#7A7A80] text-[14px]">Painting pixels with artificial intelligence...</p>
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
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Editor</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#10B981]/10 rounded-full border border-[#10B981]/20">
                <Check size={14} className="text-[#10B981]" />
                <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">Success</span>
              </div>
            </div>

            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[32px] p-8 sm:p-10">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-[#131316] border border-white/[0.05] shadow-2xl mb-10 group">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
                  alt="Generated Masterpiece" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <button className="absolute top-6 right-6 p-4 bg-black/50 backdrop-blur-md rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70">
                  <Maximize2 size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                <div className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#9758FF]/10 p-2 rounded-lg text-[#9758FF]">
                        <Wand2 size={18} />
                      </div>
                      <h3 className="text-white font-bold text-[15px]">Subject Prompt</h3>
                    </div>
                    <button 
                      onClick={() => handleCopy(prompt || "A majestic lion sitting on a neon throne...", 0)}
                      className={`p-2 rounded-lg transition-all ${copiedIndex === 0 ? 'bg-[#10B981] text-white' : 'text-[#5A5A60] hover:text-white'}`}
                    >
                      {copiedIndex === 0 ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-[#A1A1A5] text-[14px] leading-relaxed italic">
                    "{prompt || "A professional close-up shot of a ceramic coffee cup with steam sitting on a weathered wooden table with soft morning light."}"
                  </p>
                </div>

                <div className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#3B82F6]/10 p-2 rounded-lg text-[#3B82F6]">
                        <Camera size={18} />
                      </div>
                      <h3 className="text-white font-bold text-[15px]">Technical Specs</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Resolution</span>
                      <span className="text-[#A1A1A5]">{selectedRatio === '1:1' ? '1024 x 1024' : '2048 x 1152'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Style Applied</span>
                      <span className="text-[#A1A1A5] uppercase text-[11px] font-bold tracking-wider">{selectedStyle}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Model</span>
                      <span className="text-[#A1A1A5]">Vidora Vision v2.1</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-[#9758FF] text-white py-4.5 rounded-2xl font-bold text-[16px] hover:bg-[#854EE6] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(151,88,255,0.3)]">
                  <Download size={20} /> Download Masterpiece
                </button>
                <button 
                  onClick={handleGenerate}
                  className="flex-1 bg-[#161619] border border-white/5 text-white py-4.5 rounded-2xl font-bold text-[16px] hover:bg-[#1B1B21] transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCw size={18} /> Create Variation
                </button>
                <div className="flex gap-2">
                  <button className="p-4 bg-[#161619] border border-white/5 text-[#5A5A60] rounded-2xl hover:text-[#1DA1F2] transition-all" title="Share to X">
                    <Twitter size={20} />
                  </button>
                  <button className="p-4 bg-[#161619] border border-white/5 text-[#5A5A60] rounded-2xl hover:text-[#4267B2] transition-all" title="Share to Facebook">
                    <Facebook size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: DETAILS */}
        {view === 'details' && selectedImage && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between mt-2 mb-2">
              <button 
                onClick={() => setView('list')} 
                className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
              >
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Gallery</span>
              </button>
              <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-xl bg-[#1A1A20] text-[#7A7A80] hover:text-white transition-all border border-white/5">
                  <Edit2 size={16} />
                </button>
                <button className="p-2.5 rounded-xl bg-[#2A1616] text-[#EF4444] hover:bg-[#3A1A1A] transition-all border border-[#EF4444]/10">
                  <Trash size={16} />
                </button>
              </div>
            </div>

            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[32px] p-8 sm:p-10">
              <div className="mb-10">
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-[10px] font-bold text-[#9758FF] bg-[#9758FF]/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">{selectedImage.style}</span>
                  <span className="text-[10px] font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">16:9 Ratio</span>
                </div>
                <h1 className="text-[36px] font-bold text-white mb-3 tracking-tight">{selectedImage.title}</h1>
                <div className="flex items-center gap-2 text-[#5A5A60]">
                  <Clock size={15} />
                  <span className="text-[14px]">Generated {selectedImage.date}</span>
                </div>
              </div>

              <div className="relative aspect-video rounded-3xl overflow-hidden bg-[#131316] border border-white/[0.05] shadow-2xl mb-10 group">
                <img src={selectedImage.url} alt={selectedImage.title} className="w-full h-full object-cover" />
                <button className="absolute top-6 right-6 p-4 bg-black/50 backdrop-blur-md rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70">
                  <Maximize2 size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#9758FF]/10 p-2 rounded-lg text-[#9758FF]">
                        <Wand2 size={18} />
                      </div>
                      <h3 className="text-white font-bold text-[15px]">Subject Prompt</h3>
                    </div>
                    <button 
                      onClick={() => handleCopy("A majestic lion sitting on a neon throne in a futuristic city, reflections on wet pavement, cinematic lighting", 0)}
                      className={`p-2 rounded-lg transition-all ${copiedIndex === 0 ? 'bg-[#10B981] text-white' : 'text-[#5A5A60] hover:text-white'}`}
                    >
                      {copiedIndex === 0 ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-[#7A7A80] text-[14px] leading-relaxed">
                    A majestic lion sitting on a neon throne in a futuristic city, reflections on wet pavement, cinematic lighting, ultra-detailed fur, glowing eyes.
                  </p>
                </div>

                <div className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#3B82F6]/10 p-2 rounded-lg text-[#3B82F6]">
                        <Camera size={18} />
                      </div>
                      <h3 className="text-white font-bold text-[15px]">Technical Specs</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Model</span>
                      <span className="text-[#A1A1A5]">Vidora Vision v2.1</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Resolution</span>
                      <span className="text-[#A1A1A5]">2048 x 1152</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#5A5A60]">Sampling Steps</span>
                      <span className="text-[#A1A1A5]">50</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <button className="flex-1 bg-[#9758FF] hover:bg-[#854EE6] text-white py-4.5 rounded-2xl font-bold text-[16px] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(151,88,255,0.3)]">
                  <Download size={20} /> Download Masterpiece
                </button>
                <button 
                  onClick={handleGenerate}
                  className="flex-1 bg-[#161619] border border-white/5 text-white py-4.5 rounded-2xl font-bold text-[16px] hover:bg-[#1B1B21] transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCw size={18} /> Create Variation
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-[#5A5A60] text-[13px] font-medium">Share to:</span>
                  <div className="flex gap-2">
                    {[
                      { icon: Twitter, color: 'hover:text-[#1DA1F2]' },
                      { icon: Facebook, color: 'hover:text-[#4267B2]' },
                      { icon: Share2, color: 'hover:text-[#9758FF]' }
                    ].map((social, i) => (
                      <button key={i} className={`p-2.5 rounded-xl bg-[#131316] border border-white/5 text-[#5A5A60] transition-all ${social.color}`}>
                        <social.icon size={18} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[#5A5A60] text-[12px]">ID: #GEN-882-941</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
