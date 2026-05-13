import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  Play,
  Mic,
  Type,
  Upload,
  Trash2,
  Clipboard,
  Settings2,
  Volume2,
  Activity,
  Plus,
  Search,
  Clock,
  Download,
  Share2,
  MoreVertical,
  Pause,
  Copy,
  Wand2,
  Music,
  Check,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const voices = [
  { id: 'adam', name: 'Adam', desc: 'Deep Narrator', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop' },
  { id: 'pixie', name: 'Pixie', desc: 'Upbeat Anime', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' },
  { id: 'marcus', name: 'Marcus', desc: 'News Anchor', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop' },
  { id: 'luna', name: 'Luna', desc: 'Smooth Calming', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop' },
];

const mockVoiceProjects = [
  { id: 1, title: "Podcast Intro - Tech Weekly", date: "2 hours ago", voice: "Adam", duration: "0:45", mode: "Read Text" },
  { id: 2, title: "Anime Character Dialogue", date: "5 hours ago", voice: "Pixie", duration: "1:12", mode: "Mimic Voice" },
  { id: 3, title: "Meditation Guide", date: "1 day ago", voice: "Luna", duration: "5:30", mode: "Read Text" },
  { id: 4, title: "News Flash Update", date: "3 days ago", voice: "Marcus", duration: "2:15", mode: "Read Text" },
];

export const VoiceSyncContent = () => {
  const [view, setView] = useState<'list' | 'input' | 'thinking' | 'result' | 'details'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('adam');
  const [mode, setMode] = useState<'read' | 'mimic'>('read');
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [emphasis, setEmphasis] = useState(0.33);

  const audioInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = mockVoiceProjects.find(p => p.id === selectedProjectId);

  const isGenerateDisabled = mode === 'read' ? !text.trim() : !audioFile;

  const handleModeChange = (newMode: 'read' | 'mimic') => {
    setMode(newMode);
    // clear the other mode's input to avoid stale state
    if (newMode === 'read') setAudioFile(null);
    else setText('');
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  const handleCreateAudio = () => {
    setView('thinking');
    setTimeout(() => setView('result'), 2000);
  };

  return (
    <div className="flex-1 w-full max-w-[1000px] flex flex-col pb-20">

      <AnimatePresence mode="wait">
        {/* VIEW: LIST (Audio Gallery) */}
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
                    <Volume2 size={20} className="text-[#9758FF]" />
                  </div>
                  <h1 className="text-[28px] font-bold text-white tracking-tight">VoiceSync AI</h1>
                </div>
                <p className="text-[#A1A1A5] text-[16px]">Browse and manage your AI-generated audio assets.</p>
              </div>
              <button
                onClick={() => setView('input')}
                className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-6 py-3.5 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(151,88,255,0.3)]"
              >
                <Plus size={20} /> New Voice Generation
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
                <input
                  type="text"
                  placeholder="Search audio projects..."
                  className="w-full bg-[#131316] border border-white/5 rounded-full pl-11 pr-5 py-3 text-[14px] text-white focus:outline-none focus:border-[#9758FF]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockVoiceProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => { setSelectedProjectId(project.id); setView('details'); }}
                  className="bg-[#131316]/50 border border-white/5 rounded-2xl p-5 hover:border-[#9758FF]/30 transition-all group cursor-pointer flex items-center gap-5"
                >
                  <div className="w-16 h-16 rounded-xl bg-[#0D0D10] flex items-center justify-center border border-white/5 group-hover:bg-[#9758FF]/10 transition-colors">
                    <Play size={24} className="text-white group-hover:text-[#9758FF] transition-colors" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#9758FF] bg-[#9758FF]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{project.voice}</span>
                      <span className="text-[10px] font-bold text-[#A1A1A5] bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider">{project.duration}</span>
                    </div>
                    <h3 className="text-white font-bold text-[16px] truncate group-hover:text-[#9758FF] transition-colors">{project.title}</h3>
                    <p className="text-[#5A5A60] text-[12px] flex items-center gap-1.5 mt-1">
                      <Clock size={12} /> {project.date}
                    </p>
                  </div>
                  <button className="p-2 text-[#5A5A60] hover:text-white transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW: INPUT Flow */}
        {view === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col"
          >
            <div className="mb-10 mt-2">
              <button
                onClick={() => setView('list')}
                className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors mb-6"
              >
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Audio Library</span>
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#9758FF]/10 p-2 rounded-lg">
                  <Volume2 size={20} className="text-[#9758FF]" />
                </div>
                <h1 className="text-[28px] font-bold text-white tracking-tight">Voice Studio</h1>
              </div>
              <p className="text-[#A1A1A5] text-[16px]">Configure your AI voice generation parameters.</p>
            </div>

            <div className="space-y-16">
              {/* STEP 1: Choose a Voice */}
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#9758FF] flex items-center justify-center text-white font-bold text-sm">1</div>
                  <h2 className="text-[18px] font-semibold text-white">Choose a voice</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {voices.map((voice) => (
                    <motion.div
                      key={voice.id}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${selectedVoice === voice.id ? 'border-[#9758FF] bg-[#9758FF]/5' : 'border-white/[0.05] bg-[#131316]'}`}
                    >
                      <div className="aspect-square w-full relative">
                        <img src={voice.img} alt={voice.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                          <div>
                            <p className="text-white font-bold text-[15px]">{voice.name}</p>
                            <p className="text-[#A1A1A5] text-[11px]">{voice.desc}</p>
                          </div>
                          <button className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#9758FF] transition-colors">
                            <Play size={12} className="text-white ml-0.5" fill="currentColor" />
                          </button>
                        </div>
                        {selectedVoice === voice.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#9758FF] rounded-full flex items-center justify-center border border-white/20">
                            <div className="w-2 h-1 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* STEP 2: Choose a Mode */}
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#9758FF] flex items-center justify-center text-white font-bold text-sm">2</div>
                  <h2 className="text-[18px] font-semibold text-white">Choose a mode</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => handleModeChange('read')}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-5 ${mode === 'read' ? 'border-[#9758FF] bg-[#9758FF]/5' : 'border-white/[0.05] bg-[#131316] hover:border-white/10'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'read' ? 'bg-[#9758FF] text-white' : 'bg-white/5 text-[#7A7A80]'}`}>
                      <Type size={22} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-[16px]">Read Text</h3>
                      <p className="text-[#A1A1A5] text-[13px]">Generate audio from a provided text script.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => handleModeChange('mimic')}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-5 ${mode === 'mimic' ? 'border-[#9758FF] bg-[#9758FF]/5' : 'border-white/[0.05] bg-[#131316] hover:border-white/10'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'mimic' ? 'bg-[#9758FF] text-white' : 'bg-white/5 text-[#7A7A80]'}`}>
                      <Mic size={22} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-[16px]">Mimic Voice</h3>
                      <p className="text-[#A1A1A5] text-[13px]">Convert your own recording into the chosen voice.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* STEP 3: Input — conditionally Read or Mimic */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#9758FF] flex items-center justify-center text-white font-bold text-sm">3</div>
                    <h2 className="text-[18px] font-semibold text-white">Input</h2>
                  </div>
                  {mode === 'read' && (
                    <span className="text-[#7A7A80] text-[13px]">{text.length} / 5000</span>
                  )}
                </div>

                <div className="bg-[#131316] border border-white/[0.05] rounded-3xl p-8 shadow-xl">
                  {mode === 'read' ? (
                    <>
                      <textarea
                        value={text}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                        maxLength={5000}
                        placeholder="In the ever-evolving landscape of artificial intelligence, voice synthesis has emerged as one of the most compelling frontiers..."
                        className="w-full bg-transparent text-[16px] text-white placeholder-[#5A5A60] focus:outline-none min-h-[160px] resize-none leading-relaxed"
                      />
                      <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                          onClick={() => navigator.clipboard.readText().then(t => setText(t)).catch(() => {})}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#A1A1A5] hover:text-white transition-all text-[13px]"
                        >
                          <Clipboard size={14} /> Paste Text
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#A1A1A5] hover:text-white transition-all text-[13px]">
                          <Upload size={14} /> Import
                        </button>
                        <button
                          onClick={() => setText('')}
                          disabled={!text}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all text-[13px] disabled:opacity-40"
                        >
                          <Trash2 size={14} /> Clear
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="file"
                        ref={audioInputRef}
                        accept="audio/*"
                        className="hidden"
                        onChange={handleAudioFileChange}
                      />
                      {audioFile ? (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#9758FF]/10 flex items-center justify-center border border-[#9758FF]/20 shrink-0">
                              <Music size={22} className="text-[#9758FF]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-[15px] truncate">{audioFile.name}</p>
                              <p className="text-[#7A7A80] text-[13px] mt-0.5">{(audioFile.size / 1024).toFixed(0)} KB · Ready to convert</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => audioInputRef.current?.click()}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#A1A1A5] hover:text-white transition-all text-[13px]"
                            >
                              <Upload size={14} /> Change
                            </button>
                            <button
                              onClick={() => setAudioFile(null)}
                              className="p-2 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => audioInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-4 cursor-pointer py-8 rounded-2xl border-2 border-dashed border-[#24242B] hover:border-[#9758FF]/40 transition-all group"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-[#9758FF]/10 flex items-center justify-center border border-[#9758FF]/20 group-hover:scale-110 transition-transform">
                            <Mic size={26} className="text-[#9758FF]" />
                          </div>
                          <div className="text-center">
                            <p className="text-white font-bold text-[15px] mb-1">Upload Your Recording</p>
                            <p className="text-[#5A5A60] text-[13px]">MP3, WAV, M4A up to 50MB</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* STEP 4: Preview & Generate */}
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#9758FF] flex items-center justify-center text-white font-bold text-sm">4</div>
                  <h2 className="text-[18px] font-semibold text-white">Preview & generate</h2>
                </div>

                <div className="bg-[#131316] border border-white/[0.05] rounded-3xl p-8 shadow-xl">
                  {/* Waveform Mockup */}
                  <div className="w-full h-24 bg-[#08080A] rounded-2xl mb-8 flex items-center justify-center px-8 relative overflow-hidden">
                    <div className="flex items-center gap-1 w-full justify-center">
                      {[...Array(40)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={isPlayingPreview ? { height: [10, 40, 15, 35, 10] } : { height: 15 }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.05 }}
                          className="w-1 bg-[#9758FF]/40 rounded-full"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-8 w-full sm:w-auto">
                      <button
                        onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                      >
                        {isPlayingPreview ? <Activity size={24} className="text-[#9758FF]" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                      </button>

                      {/* Speed slider */}
                      <div className="flex-1 sm:w-40">
                        <div className="flex justify-between mb-2">
                          <span className="text-[12px] text-[#7A7A80]">Speed</span>
                          <span className="text-[12px] text-white font-medium">{speed.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={speed}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(parseFloat(e.target.value))}
                          className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                          style={{ background: `linear-gradient(to right, #9758FF ${((speed - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((speed - 0.5) / 1.5) * 100}%)` }}
                        />
                      </div>

                      {/* Emphasis slider */}
                      <div className="flex-1 sm:w-40">
                        <div className="flex justify-between mb-2">
                          <span className="text-[12px] text-[#7A7A80]">Emphasis</span>
                          <span className="text-[12px] text-white font-medium">{Math.round(emphasis * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={emphasis}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmphasis(parseFloat(e.target.value))}
                          className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                          style={{ background: `linear-gradient(to right, #9758FF ${emphasis * 100}%, rgba(255,255,255,0.1) ${emphasis * 100}%)` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCreateAudio}
                      disabled={isGenerateDisabled}
                      className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#9758FF] to-[#8C4DE8] text-white font-bold rounded-xl shadow-[0_8px_25px_rgba(151,88,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      Create Audio
                    </button>
                  </div>
                </div>
              </section>
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
                <Mic size={32} className="text-[#9758FF] animate-pulse" />
              </div>
            </div>
            <h2 className="text-white text-[22px] font-bold mt-10 mb-2">Synthesizing Voice</h2>
            <p className="text-[#7A7A80] text-[15px]">Crafting perfectly natural vocal patterns...</p>
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
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10B981]/10 rounded-full border border-[#10B981]/20">
                <Check size={14} className="text-[#10B981]" />
                <span className="text-[11px] font-black text-[#10B981] uppercase tracking-wider">Audio Ready</span>
              </div>
            </div>

            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[40px] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#9758FF]/5 blur-[80px] -z-10 rounded-full" />

              <div className="flex flex-col items-center text-center mb-12">
                <div className="w-24 h-24 rounded-3xl bg-[#9758FF]/10 flex items-center justify-center mb-6 border border-[#9758FF]/20">
                  <Music size={40} className="text-[#9758FF]" />
                </div>
                <h2 className="text-[32px] font-bold text-white mb-2">Generation Complete</h2>
                <p className="text-[#A1A1A5] text-[15px]">Your high-fidelity audio asset is ready for deployment.</p>
              </div>

              <div className="bg-[#131316] border border-white/5 rounded-3xl p-8 mb-10">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <button
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0 shadow-2xl"
                  >
                    {isPlayingPreview ? <Pause size={32} /> : <Play size={32} className="ml-1" fill="currentColor" />}
                  </button>

                  <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-[16px]">Untitled Project #882</span>
                      <span className="text-[#7A7A80] text-[13px]">02:45 / 02:45</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-full bg-[#9758FF] rounded-full" />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-[#5A5A60] text-[12px]">
                        <Activity size={14} /> 48kHz High-Res
                      </div>
                      <div className="flex items-center gap-2 text-[#5A5A60] text-[12px]">
                        <Volume2 size={14} /> Stereo Master
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-[#9758FF] hover:bg-[#854EE6] text-white py-4 rounded-2xl font-bold text-[16px] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(151,88,255,0.3)]">
                  <Download size={20} /> Download WAV
                </button>
                <button
                  onClick={() => { setIsPlayingPreview(false); setView('input'); }}
                  className="flex-1 bg-white/5 border border-white/5 text-white py-4 rounded-2xl font-bold text-[16px] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCw size={18} /> Generate New
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: DETAILS */}
        {view === 'details' && selectedProject && (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => setView('list')}
                className="group flex items-center gap-2 text-[#7A7A80] hover:text-white transition-colors"
              >
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[14px] font-medium">Back to Audio Library</span>
              </button>
              <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-xl bg-white/5 text-[#7A7A80] hover:text-white transition-all border border-white/5">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[40px] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#9758FF]/5 blur-[120px] -z-10 rounded-full" />

              <div className="mb-12">
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-[10px] font-black text-[#9758FF] bg-[#9758FF]/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-[#9758FF]/20">
                    {selectedProject.voice}
                  </span>
                  <span className="text-[10px] font-black text-[#3B82F6] bg-[#3B82F6]/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-[#3B82F6]/20">
                    {selectedProject.mode}
                  </span>
                </div>
                <h1 className="text-[42px] font-bold text-white tracking-tight leading-tight mb-4">{selectedProject.title}</h1>
                <div className="flex items-center gap-4 text-[#5A5A60]">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span className="text-[14px]">Created {selectedProject.date}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <div className="flex items-center gap-2">
                    <Activity size={16} />
                    <span className="text-[14px]">High Fidelity</span>
                  </div>
                </div>
              </div>

              {/* Audio Player Card */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-10 mb-10">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <button
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0 shadow-2xl group"
                  >
                    {isPlayingPreview ? <Pause size={40} /> : <Play size={40} className="ml-1" fill="currentColor" />}
                  </button>

                  <div className="flex-1 w-full space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="text-white font-bold text-[18px] mb-1">Project Master Output</h4>
                        <p className="text-[#7A7A80] text-[13px]">{selectedProject.voice} • 48kHz Stereo</p>
                      </div>
                      <span className="text-white font-mono text-[14px]">{selectedProject.duration} / {selectedProject.duration}</span>
                    </div>

                    <div className="h-3 bg-white/5 rounded-full relative">
                      <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-[#9758FF] to-[#3B82F6] rounded-full" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-2xl border-4 border-[#0D0D10]" />
                    </div>

                    <div className="flex items-center gap-6">
                      <button className="text-[#5A5A60] hover:text-white transition-colors flex items-center gap-2 text-[13px] font-medium">
                        <Download size={16} /> Download WAV
                      </button>
                      <button className="text-[#5A5A60] hover:text-white transition-colors flex items-center gap-2 text-[13px] font-medium">
                        <Share2 size={16} /> Share Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#9758FF]/10 p-2.5 rounded-xl text-[#9758FF]">
                      <Type size={20} />
                    </div>
                    <h3 className="text-white font-bold text-[16px]">Source Text</h3>
                  </div>
                  <div className="relative">
                    <p className="text-[#7A7A80] text-[14px] leading-relaxed italic pr-10">
                      "The future of voice synthesis is not just about mimicry, but about capturing the subtle nuances of human emotion..."
                    </p>
                    <button className="absolute top-0 right-0 p-2 text-[#5A5A60] hover:text-white transition-colors">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#3B82F6]/10 p-2.5 rounded-xl text-[#3B82F6]">
                      <Settings2 size={20} />
                    </div>
                    <h3 className="text-white font-bold text-[16px]">Technical Specs</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Sampling Rate</span>
                      <span className="text-white text-[13px] font-medium">48,000 Hz</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Bit Depth</span>
                      <span className="text-white text-[13px] font-medium">24-bit Float</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#5A5A60] text-[13px]">Encoding</span>
                      <span className="text-white text-[13px] font-medium">WAV / Lossless</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
