import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  Copy, 
  RefreshCw, 
  Image as ImageIcon,
  Cpu,
  Zap,
  Camera,
  Layers,
  Wand2,
  Check,
  Plus,
  Search,
  MoreVertical,
  Clock,
  ArrowRight,
  Edit2,
  Trash,
  PlaySquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', icon: Camera, description: 'Movie-like lighting and depth' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, description: 'Neon colors and futuristic' },
  { id: 'anime', label: 'Anime', icon: Wand2, description: 'Vibrant hand-drawn style' },
  { id: 'minimalist', label: 'Minimalist', icon: Layers, description: 'Clean lines and simple' },
  { id: '3d-render', label: '3D Render', icon: Cpu, description: 'Octane render / Unreal Engine' },
  { id: 'macro', label: 'Macro', icon: Sparkles, description: 'Ultra-close up details' },
];

const suggestionTags = [
  "Golden Hour", "Soft Shadows", "8k Resolution", "Masterpiece", "Hyper-detailed"
];

const mockPrompts = [
  { id: 1, title: "Golden Hour Coffee", date: "2 hours ago", tags: ["Cinematic", "Warm"], content: "A professional close-up shot of a ceramic coffee cup with steam sitting on a weathered wooden table with soft morning light." },
  { id: 2, title: "Neon Cyberpunk City", date: "5 hours ago", tags: ["Cyberpunk", "Neon"], content: "Cyberpunk city street at night with neon signs and rainy reflection..." },
  { id: 3, title: "Minimalist Logo", date: "1 day ago", tags: ["Minimalist", "Design"], content: "A minimalist logo design for a modern tech startup with clean lines..." },
  { id: 4, title: "Mountain Peak", date: "2 days ago", tags: ["Landscape", "Nature"], content: "Cinematic tracking shot of a snow-capped mountain peak at sunrise..." },
];

const resultSegments = [
  { 
    title: "Subject", 
    icon: Wand2, 
    content: "A professional close-up shot of a ceramic coffee cup with steam, sitting on a weathered wooden table with soft morning light." 
  },
  { 
    title: "Camera & Tech", 
    icon: Camera, 
    content: "Shot with a Sony A7R IV, 85mm f/1.4 lens, shallow depth of field, sharp focus on the rim of the cup." 
  },
  { 
    title: "Atmosphere", 
    icon: Zap, 
    content: "Warm golden hour lighting, dust particles visible in sunbeams, calm and minimalist kitchen background." 
  },
  { 
    title: "Style Tags", 
    icon: Layers, 
    content: "Cinematic, Professional, Warm, Minimalist, 8k, Detailed Texture" 
  }
];

export const PromptonContent = () => {
  const [view, setView] = useState<'list' | 'input' | 'thinking' | 'result' | 'details'>('list');
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [idea, setIdea] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPrompt = mockPrompts.find(p => p.id === selectedPromptId);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(URL.createObjectURL(file));
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  const handleEnhance = () => {
    if (!idea) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setIdea(prev => `${prev}, highly detailed, cinematic lighting, 8k resolution, masterwork, trending on artstation`);
      setIsEnhancing(false);
    }, 1500);
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
        
        {/* VIEW: LIST (Prompt Library) */}
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
                    <Sparkles size={20} className="text-[#9758FF]" />
                  </div>
                  <h1 className="text-[28px] font-bold text-white tracking-tight">Prompt Library</h1>
                </div>
                <p className="text-[#A1A1A5] text-[16px]">Manage and reuse your high-quality AI prompts.</p>
              </div>
              <button 
                onClick={() => setView('input')}
                className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
              >
                <Plus size={20} /> Create New Prompt
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
                <input 
                  type="text" 
                  placeholder="Search prompts..." 
                  className="w-full bg-[#131316] border border-white/5 rounded-full pl-11 pr-5 py-3 text-[14px] text-white focus:outline-none focus:border-[#9758FF]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockPrompts.map((prompt) => (
                <div 
                  key={prompt.id}
                  onClick={() => { setSelectedPromptId(prompt.id); setView('details'); }}
                  className="bg-[#131316]/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-[#9758FF]/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                      {prompt.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-[#9758FF] bg-[#9758FF]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">{tag}</span>
                      ))}
                    </div>
                    <button className="text-[#7A7A80] hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <h3 className="text-white font-bold text-[17px] mb-2 group-hover:text-[#9758FF] transition-colors">{prompt.title}</h3>
                  <p className="text-[#7A7A80] text-[13px] line-clamp-2 mb-6 leading-relaxed">
                    {prompt.content}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[#5A5A60]">
                      <Clock size={14} />
                      <span className="text-[12px]">{prompt.date}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#7A7A80] group-hover:bg-[#9758FF] group-hover:text-white transition-all">
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW: DETAILS */}
        {view === 'details' && selectedPrompt && (
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
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Library</span>
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
                  {selectedPrompt.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold text-[#9758FF] bg-[#9758FF]/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">{tag}</span>
                  ))}
                </div>
                <h1 className="text-[36px] font-bold text-white mb-3 tracking-tight">{selectedPrompt.title}</h1>
                <div className="flex items-center gap-2 text-[#5A5A60]">
                  <Clock size={15} />
                  <span className="text-[14px]">Generated {selectedPrompt.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {resultSegments.map((segment, idx) => (
                  <div 
                    key={segment.title}
                    className="bg-[#131316] border border-white/[0.04] rounded-2xl p-6 relative group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#9758FF]/10 p-2 rounded-lg text-[#9758FF]">
                          <segment.icon size={18} />
                        </div>
                        <h3 className="text-white font-bold text-[15px]">{segment.title}</h3>
                      </div>
                      <button 
                        onClick={() => handleCopy(segment.content, idx)}
                        className={`p-2 rounded-lg transition-all ${copiedIndex === idx ? 'bg-[#10B981] text-white' : 'text-[#5A5A60] hover:text-white'}`}
                      >
                        {copiedIndex === idx ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-[#7A7A80] text-[14px] leading-relaxed">
                      {segment.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <button 
                  onClick={() => handleCopy(resultSegments.map(s => s.content).join("\n"), 99)}
                  className="flex-1 bg-[#9758FF] hover:bg-[#854EE6] text-white py-4.5 rounded-2xl font-bold text-[16px] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(151,88,255,0.3)] hover:shadow-[0_10px_40px_rgba(151,88,255,0.4)] active:scale-[0.98]"
                >
                  <Copy size={18} /> Copy Master Prompt
                </button>
                <button className="flex-1 bg-[#161619] border border-white/5 text-white py-4.5 rounded-2xl font-bold text-[16px] hover:bg-[#1B1B21] transition-all flex items-center justify-center gap-3">
                  <RefreshCw size={18} /> Regenerate Variation
                </button>
              </div>
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
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Library</span>
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#9758FF]/10 p-2 rounded-lg">
                  <Sparkles size={20} className="text-[#9758FF]" />
                </div>
                <h1 className="text-[28px] font-bold text-white tracking-tight">Create New Prompt</h1>
              </div>
              <p className="text-[#A1A1A5] text-[16px]">Transform your vision into professional-grade AI prompts.</p>
            </div>

            <div className="bg-[#131316]/50 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9758FF]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#9758FF]/20 transition-colors duration-700" />
              
              <div className="space-y-8 relative z-10">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-[14px] font-medium text-[#EAEAEA] uppercase tracking-wider">Describe your idea</label>
                    <button 
                      onClick={handleEnhance}
                      disabled={!idea || isEnhancing}
                      className="flex items-center gap-2 text-[12px] font-bold text-[#9758FF] hover:text-[#854EE6] transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={14} className={isEnhancing ? 'animate-spin' : ''} />
                      {isEnhancing ? 'Enhancing...' : 'Magic Enhance'}
                    </button>
                  </div>
                  <textarea 
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Enter a concept (e.g. A futuristic robot holding a rose)..."
                    className="w-full bg-[#08080A]/60 border border-[#24242B] rounded-2xl px-5 py-5 text-[15px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/50 focus:ring-1 focus:ring-[#9758FF]/30 transition-all min-h-[120px] resize-none leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-2 mt-4">
                    {suggestionTags.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setIdea(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="text-[12px] px-3 py-1.5 rounded-full bg-[#1B1B21] border border-[#24242B] text-[#7A7A80] hover:text-white hover:border-[#9758FF]/50 transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#EAEAEA] mb-4 uppercase tracking-wider">Select Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stylePresets.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${
                          selectedStyle === style.id 
                            ? 'bg-[#9758FF]/10 border-[#9758FF] shadow-[0_0_15px_rgba(151,88,255,0.1)]' 
                            : 'bg-[#08080A]/40 border-[#24242B] hover:border-[#3A3A40]'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mb-3 ${selectedStyle === style.id ? 'bg-[#9758FF] text-white' : 'bg-[#131316] text-[#7A7A80] group-hover:text-white'}`}>
                          <style.icon size={18} />
                        </div>
                        <div className={`text-[14px] font-bold ${selectedStyle === style.id ? 'text-white' : 'text-[#A1A1A5]'}`}>{style.label}</div>
                        <div className="text-[11px] text-[#5A5A60] mt-1 line-clamp-1">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#EAEAEA] mb-4 uppercase tracking-wider">Reference (Optional)</label>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  <div 
                    onClick={handleUploadClick}
                    className={`relative aspect-[21/9] rounded-2xl bg-[#08080A]/40 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${selectedFile ? 'border-[#9758FF]/50 bg-[#9758FF]/5' : 'border-[#24242B] hover:border-[#3A3A40]'}`}
                  >
                    {selectedFile ? (
                      <>
                        <img src={selectedFile} alt="Preview" className="w-full h-full object-cover" />
                        {isScanning && (
                          <motion.div 
                            initial={{ top: '-10%' }}
                            animate={{ top: '110%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-[#9758FF] shadow-[0_0_15px_#9758FF] z-20"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-sm font-medium">Change Image</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-[#131316] flex items-center justify-center mb-3 border border-[#24242B] group-hover:scale-110 transition-transform">
                          <ImageIcon size={22} className="text-[#7A7A80]" />
                        </div>
                        <p className="text-[#EAEAEA] font-medium text-[15px]">Upload Reference</p>
                        <p className="text-[#7A7A80] text-[13px] mt-1">PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={!idea && !selectedFile}
                  className="w-full bg-[#9758FF] hover:bg-[#854EE6] disabled:opacity-50 disabled:hover:bg-[#9758FF] text-white py-4 rounded-xl font-semibold text-[16px] transition-all flex items-center justify-center gap-3 shadow-[0_8px_25px_rgba(151,88,255,0.3)] active:scale-[0.98]"
                >
                  <Cpu size={20} />
                  Analyze & Generate Prompt
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
                <Sparkles size={32} className="text-[#9758FF] animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-white text-[20px] font-semibold mt-8 mb-2">Architecting your prompt</h2>
            <motion.p 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[#7A7A80] text-[14px]"
            >
              Synthesizing visual metadata...
            </motion.p>
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
                <span className="text-[14px] font-medium">Back to Editor</span>
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1 bg-[#10B981]/10 rounded-full border border-[#10B981]/20">
                <Check size={14} className="text-[#10B981]" />
                <span className="text-[12px] font-semibold text-[#10B981] uppercase tracking-wider">Analysis Complete</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {resultSegments.map((segment, idx) => (
                <motion.div 
                  key={segment.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[#131316]/50 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 hover:border-[#9758FF]/30 transition-colors group relative"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#9758FF]/10 p-2 rounded-lg text-[#9758FF]">
                        <segment.icon size={18} />
                      </div>
                      <h3 className="text-[#EAEAEA] font-semibold text-[15px]">{segment.title}</h3>
                    </div>
                    <button 
                      onClick={() => handleCopy(segment.content, idx)}
                      className={`p-2 rounded-lg transition-all ${copiedIndex === idx ? 'bg-[#10B981] text-white' : 'hover:bg-white/5 text-[#7A7A80] hover:text-white'}`}
                    >
                      {copiedIndex === idx ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-[#A1A1A5] text-[14px] leading-relaxed">
                    {segment.content}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button 
                onClick={() => handleCopy(resultSegments.map(s => s.content).join("\n"), 99)}
                className="flex-2 bg-white text-black py-4.5 px-8 rounded-2xl font-bold text-[16px] hover:bg-[#EAEAEA] transition-all flex items-center justify-center gap-2"
              >
                <Copy size={18} /> Copy Master Prompt
              </button>
              <button 
                onClick={handleGenerate}
                className="flex-1 bg-[#161619] border border-white/5 text-white py-4.5 rounded-2xl font-bold text-[16px] hover:bg-[#1B1B21] transition-all flex items-center justify-center gap-3"
              >
                <RefreshCw size={18} /> Regenerate Variation
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
