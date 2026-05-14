import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useMotionValue, useInView, animate } from 'motion/react';
import {
  PlaySquare, ImagePlus, Mic, Sparkles, LayoutDashboard,
  CheckCircle2, ArrowRight, Play, Zap, Crown,
  Star, Menu, X, Camera, Cpu, Layers, Wand2,
} from 'lucide-react';

interface LandingPageProps {
  setScreen: (screen: string) => void;
}

const WAVEFORM_PARAMS = Array.from({ length: 28 }, (_, i) => ({
  peak: 12 + (((i * 7 + 3) * 13) % 40),
  duration: 0.7 + (i % 6) * 0.12,
  delay: i * 0.04,
}));

const HERO_PARTICLES = [
  { top: '18%', left: '8%',  size: 4, dur: 7,  del: 0   },
  { top: '28%', left: '88%', size: 3, dur: 9,  del: 1.2 },
  { top: '55%', left: '93%', size: 5, dur: 6,  del: 2.5 },
  { top: '72%', left: '6%',  size: 3, dur: 11, del: 0.7 },
  { top: '42%', left: '96%', size: 4, dur: 8,  del: 3.1 },
  { top: '82%', left: '18%', size: 3, dur: 10, del: 1.8 },
];

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const FadeUp: React.FC<FadeUpProps> = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  delay?: number;
  className?: string;
}

const SlideIn: React.FC<SlideInProps> = ({ children, direction = 'left', delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, x: direction === 'left' ? -50 : 50 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

interface StatItemProps {
  to: number;
  suffix: string;
  prefix?: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ to, suffix, prefix = '', label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v: number) => Math.round(v));

  useEffect(() => {
    if (inView) {
      animate(count, to, { duration: 1.8, ease: 'easeOut' });
    }
  }, [inView, count, to]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <div className="text-[44px] sm:text-[52px] font-black tracking-tight bg-gradient-to-br from-[#9758FF] to-[#c084fc] bg-clip-text text-transparent leading-none mb-2">
        {prefix}<motion.span>{rounded}</motion.span>{suffix}
      </div>
      <div className="text-[13px] text-[#5A5A60] font-medium">{label}</div>
    </div>
  );
};

const DashboardMockup = () => (
  <div className="relative w-full max-w-[860px] mx-auto">
    <div className="absolute inset-0 bg-[#9758FF] opacity-[0.08] blur-[100px] rounded-full scale-75 translate-y-8 pointer-events-none" />
    <div className="relative rounded-[20px] border border-white/[0.08] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
      {/* Browser chrome */}
      <div className="bg-[#0F0F12] border-b border-white/[0.05] px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
          <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
        </div>
        <div className="flex-1 bg-[#1A1A20] rounded-md px-3 py-1.5 flex items-center justify-center max-w-[240px] mx-auto">
          <span className="text-[11px] text-[#5A5A60]">app.vidora.ai / video-generation</span>
        </div>
      </div>
      {/* App shell */}
      <div className="bg-[#08080A] flex" style={{ height: '380px' }}>
        {/* Sidebar */}
        <div className="w-[180px] shrink-0 bg-[#0A0A0C] border-r border-[#1e1e24] p-3 hidden sm:flex flex-col gap-1.5">
          <div className="flex items-center justify-center py-3 mb-1">
            <img src="/logo.png" alt="Vidora" className="h-7 w-auto object-contain" />
          </div>
          {[
            { icon: LayoutDashboard, label: 'Overview', active: false },
            { icon: Sparkles, label: 'Prompton', active: false },
            { icon: ImagePlus, label: 'Image Gen', active: false },
            { icon: PlaySquare, label: 'Video Gen', active: true },
            { icon: Mic, label: 'VoiceSync', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] ${active ? 'bg-gradient-to-r from-[#6A39C4] to-[#8C4DE8] text-white font-medium' : 'text-[#5A5A60]'}`}>
              <Icon size={14} />
              {label}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <div className="text-[13px] font-bold text-white mb-0.5">Video Generation</div>
              <div className="text-[10px] text-[#5A5A60]">Transform ideas into cinematic video</div>
            </div>
            <div className="bg-[#9758FF]/10 border border-[#9758FF]/20 rounded-lg px-3 py-1.5 text-[11px] text-[#9758FF] font-semibold">120 Credits</div>
          </div>
          <div className="bg-[#131316] border border-white/[0.04] rounded-xl p-4 flex-1 min-h-0">
            <div className="text-[10px] text-[#5A5A60] uppercase tracking-wider mb-2">Your Prompt</div>
            <div className="text-[11px] text-[#7A7A80] leading-relaxed mb-4">
              A cinematic drone shot flying over golden wheat fields at sunset, warm amber light casting long shadows...
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Cinematic', 'Social/TikTok', 'Storytelling', 'Product Ad'].map((s, i) => (
                <div key={s} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${i === 0 ? 'bg-[#9758FF]/20 text-[#9758FF] border border-[#9758FF]/30' : 'bg-white/[0.03] text-[#5A5A60] border border-white/[0.04]'}`}>{s}</div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1A1A20] to-[#0D0D10] border border-white/[0.04] rounded-xl p-3 flex items-center gap-3 shrink-0">
            <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-[#6A39C4]/40 to-[#9758FF]/20 flex items-center justify-center shrink-0">
              <Play size={13} className="text-[#9758FF] fill-[#9758FF] ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white mb-1">Generating preview...</div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#6A39C4] to-[#9758FF] rounded-full"
                  animate={{ width: ['15%', '78%', '15%'] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
            <div className="text-[10px] text-[#9758FF] font-bold shrink-0">4K</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ setScreen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const mockupY = useTransform(heroScroll, [0, 1], [0, -60]);

  const features = [
    { icon: PlaySquare, title: 'Video Generation', description: 'Transform text prompts into stunning 4K videos with cinematic quality.', bullets: ['5 visual styles · Portrait & Landscape', '4K 60FPS output · Voice sync', 'Instant preview · Commercial license'], color: '#9758FF' },
    { icon: ImagePlus, title: 'Image Generation', description: 'Craft professional AI images with pixel-perfect artistic control.', bullets: ['6 art styles · 5 aspect ratios', 'Reference image upload', 'Up to 2048px · Instant export'], color: '#3B82F6' },
    { icon: Mic, title: 'VoiceSync AI', description: 'Convert text to speech or clone any voice with studio quality.', bullets: ['4 professional voice models', 'Read & Mimic modes', '48kHz lossless WAV output'], color: '#10B981' },
    { icon: Sparkles, title: 'Prompton', description: 'Generate and engineer the perfect AI prompts every single time.', bullets: ['AI-powered prompt analysis', 'Style presets · Prompt library', 'One-click copy & regenerate'], color: '#F59E0B' },
    { icon: LayoutDashboard, title: 'Studio Dashboard', description: 'Your creative command center — everything in one place.', bullets: ['Credit tracking & usage stats', 'Full project history & logs', 'Organized media library'], color: '#c084fc' },
  ];

  const plans = [
    {
      name: 'Starter', icon: Zap,
      price: billingAnnual ? 23 : 29,
      description: 'For individuals who need high-quality AI visuals without the watermark.',
      features: ['10 High-Res Video Generations', 'No Watermarks', 'Commercial Usage Rights', 'HD Quality Export', 'Standard Rendering Speed'],
      cta: 'Get Started', highlight: false,
    },
    {
      name: 'Creator', icon: Crown,
      price: billingAnnual ? 78 : 97,
      description: 'Engineered for power creators making a mark in the digital landscape.',
      features: ['50 Premium Video Generations', '4K Ultra HD Exports', 'Full Commercial Rights', 'Advanced Motion Control', 'Priority Rendering Path', 'Beta Access to New Models'],
      cta: 'Go Creator', highlight: true,
    },
    {
      name: 'Pro', icon: Zap,
      price: billingAnnual ? 159 : 199,
      description: 'Ultimate production tier for studios and enterprise scaling.',
      features: ['Unlimited Standard Generations', '200 4K Master Generations', 'Custom Character References', 'Dedicated Server Support', 'Early API Access', 'Team Collaboration Seats'],
      cta: 'Get Pro', highlight: false,
    },
  ];

  const testimonials = [
    { quote: "Vidora replaced 3 separate tools I was paying for. The video quality is genuinely on par with what I was getting from $200/hr freelancers.", name: "Marcus Chen", role: "YouTube Creator · 2.1M subs", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
    { quote: "The VoiceSync AI is uncanny. I used it to dub my content into 3 voices for different audience personas. Conversion went up 40%.", name: "Aisha Okafor", role: "Social Media Strategist", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
    { quote: "Prompton alone is worth the subscription. I've been generating AI content for 2 years and my prompts are finally consistently good.", name: "Jake Rivera", role: "Digital Art Director", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
  ];

  return (
    <div className="bg-[#08080A] text-white font-sans overflow-x-hidden">

      {/* ── SCROLL PROGRESS ─────────────────────────────── */}
      <motion.div
        style={{ scaleX: progressScaleX, transformOrigin: 'left' }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6A39C4] to-[#9758FF] z-[100]"
      />

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#08080A]/90 backdrop-blur-md border-b border-white/[0.04]' : ''}`}>
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
          <img src="/logo.png" alt="Vidora" className="h-14 w-auto object-contain" />
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Pricing', 'Use Cases'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-[14px] text-[#A1A1A5] hover:text-white transition-colors">{link}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setScreen('LOGIN')} className="text-[14px] text-[#A1A1A5] hover:text-white transition-colors">Sign In</button>
            <motion.button
              onClick={() => setScreen('CREATE_ACCOUNT')}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-[0_4px_20px_rgba(151,88,255,0.3)]"
            >
              Start for Free →
            </motion.button>
          </div>
          <button className="md:hidden text-[#A1A1A5] hover:text-white" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-[#0A0A0C] border-l border-white/[0.06] z-[70] p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <img src="/logo.png" alt="Vidora" className="h-8 w-auto object-contain" />
                <button onClick={() => setMobileMenuOpen(false)} className="text-[#7A7A80] hover:text-white"><X size={20} /></button>
              </div>
              <div className="flex flex-col gap-6 flex-1">
                {['Features', 'Pricing', 'Use Cases'].map(link => (
                  <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} onClick={() => setMobileMenuOpen(false)} className="text-[16px] text-[#A1A1A5] hover:text-white transition-colors">{link}</a>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setMobileMenuOpen(false); setScreen('LOGIN'); }} className="w-full border border-white/10 text-white py-3 rounded-xl text-[15px] font-medium hover:bg-white/5 transition-colors">Sign In</button>
                <button onClick={() => { setMobileMenuOpen(false); setScreen('CREATE_ACCOUNT'); }} className="w-full bg-[#9758FF] hover:bg-[#854EE6] text-white py-3 rounded-xl text-[15px] font-semibold transition-colors">Start for Free →</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HERO ────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-24 px-6 overflow-hidden">
        <motion.div animate={{ x: [0, 24, 0], y: [0, -18, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-8%] left-[-4%] w-[600px] h-[600px] bg-[#673BA5] opacity-[0.12] rounded-full blur-[160px] pointer-events-none" />
        <motion.div animate={{ x: [0, -20, 0], y: [0, 22, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-8%] right-[-4%] w-[500px] h-[500px] bg-[#3B82F6] opacity-[0.07] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.022]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Floating particles */}
        {HERO_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#9758FF] pointer-events-none"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, opacity: 0.35 }}
            animate={{ y: [0, -18, 0], opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del, ease: 'easeInOut' }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center text-center max-w-[860px]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#9758FF]/10 border border-[#9758FF]/20 rounded-full px-4 py-2 mb-8">
            <Sparkles size={13} className="text-[#9758FF]" />
            <span className="text-[12px] font-bold text-[#9758FF] uppercase tracking-[0.15em]">The AI Studio for Creators</span>
          </motion.div>

          <div className="text-[50px] sm:text-[62px] lg:text-[74px] font-black tracking-tight leading-[1.05] mb-7 text-center">
            {[
              { text: 'Turn Ideas Into', gradient: false, delay: 0.1 },
              { text: 'Premium Content', gradient: true,  delay: 0.2 },
              { text: '— In Minutes.',   gradient: false, delay: 0.3 },
            ].map((line) => (
              <div key={line.text} className="overflow-hidden">
                <motion.div
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.75, delay: line.delay, ease: [0.22, 1, 0.36, 1] }}
                >
                  {line.gradient ? (
                    <span className="bg-gradient-to-r from-[#9758FF] via-[#c084fc] to-[#9758FF] bg-clip-text text-transparent">
                      {line.text}
                    </span>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </motion.div>
              </div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[18px] text-[#A1A1A5] max-w-[540px] leading-relaxed mb-10">
            Video. Image. Voice. Prompts. One studio — built for creators who demand quality without compromise.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-6">
            <motion.button onClick={() => setScreen('CREATE_ACCOUNT')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-8 py-4 rounded-2xl font-bold text-[16px] transition-colors shadow-[0_12px_40px_rgba(151,88,255,0.4)] flex items-center justify-center gap-2">
              Start Creating Free <ArrowRight size={18} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-white px-8 py-4 rounded-2xl font-bold text-[16px] transition-colors flex items-center justify-center gap-2">
              <Play size={15} fill="white" /> See How It Works
            </motion.button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="text-[13px] text-[#5A5A60]">
            No credit card required · 3 free videos every month · Cancel anytime
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
          style={{ y: mockupY }}
          transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full mt-20 px-4">
          <DashboardMockup />
        </motion.div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">What You Get</span>
            </div>
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-tight mb-4">
              Everything a serious creator needs.
            </h2>
            <p className="text-[#A1A1A5] text-[17px] max-w-[480px] mx-auto">
              Five professional-grade AI tools in one studio. No tab-switching. No subscriptions stacking.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FadeUp key={feature.title} delay={i * 0.07}
                className={i === 4 ? 'md:col-span-2 lg:col-span-1 lg:col-start-2' : ''}>
                <div className="relative bg-[#0D0D10] border border-white/[0.05] rounded-[24px] p-7 h-full flex flex-col hover:border-white/[0.1] hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                  <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 -skew-x-12" />
                  </div>
                  <div className="w-11 h-11 rounded-xl mb-5 flex items-center justify-center"
                    style={{ backgroundColor: `${feature.color}15`, border: `1px solid ${feature.color}25` }}>
                    <feature.icon size={20} style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-[18px] font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#7A7A80] leading-relaxed mb-5 flex-1">{feature.description}</p>
                  <div className="space-y-2.5">
                    {feature.bullets.map(bullet => (
                      <div key={bullet} className="flex items-start gap-2.5">
                        <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: feature.color }} />
                        <span className="text-[13px] text-[#A1A1A5]">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT 1: Video Generation ───────────────── */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <SlideIn direction="left">
            <div className="inline-flex items-center gap-2 bg-[#9758FF]/10 border border-[#9758FF]/20 rounded-full px-3.5 py-1.5 mb-6">
              <PlaySquare size={13} className="text-[#9758FF]" />
              <span className="text-[11px] font-bold text-[#9758FF] uppercase tracking-[0.15em]">Video Generation</span>
            </div>
            <h2 className="text-[38px] sm:text-[44px] font-black tracking-tight mb-5 leading-tight">
              From prompt to 4K video<br />
              <span className="text-[#9758FF]">in under 60 seconds.</span>
            </h2>
            <p className="text-[16px] text-[#A1A1A5] leading-relaxed mb-8 max-w-[420px]">
              Type your idea. Pick a style. Vidora handles the rest — cinematic lighting, motion physics, frame composition.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: Camera, label: '5 Visual Styles' },
                { icon: Zap, label: '4K 60FPS Output' },
                { icon: Mic, label: 'Built-in Voice Sync' },
                { icon: Layers, label: 'Portrait & Landscape' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#9758FF]/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#9758FF]" />
                  </div>
                  <span className="text-[13px] text-[#C4C4C8] font-medium">{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen('CREATE_ACCOUNT')} className="flex items-center gap-2 text-[#9758FF] font-bold text-[15px] hover:gap-3 transition-all group">
              Try Video Generation <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SlideIn>

          <SlideIn direction="right" delay={0.1}>
            <div className="relative">
              <div className="absolute inset-0 bg-[#9758FF] opacity-[0.06] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative bg-[#0D0D10] border border-white/[0.06] rounded-[24px] p-6 overflow-hidden">
                <div className="text-[11px] font-semibold text-[#5A5A60] uppercase tracking-wider mb-4">Output Preview</div>
                <div className="aspect-video bg-gradient-to-br from-[#1A0F2E] to-[#0A0A0C] rounded-2xl flex items-center justify-center mb-5 relative overflow-hidden border border-white/[0.04]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6A39C4]/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center border border-white/10">
                      <Play size={11} fill="white" className="text-white ml-0.5" />
                    </div>
                    <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[38%] bg-white/50 rounded-full" />
                    </div>
                    <span className="text-[10px] text-white/50 font-mono">0:08 / 0:20</span>
                  </div>
                  <Sparkles size={32} className="text-[#9758FF]/30" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['Cinematic', 'Social/TikTok', 'Storytelling', 'Product Ad'].map((s, i) => (
                    <div key={s} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${i === 0 ? 'bg-[#9758FF] text-white' : 'bg-white/[0.04] text-[#5A5A60]'}`}>{s}</div>
                  ))}
                </div>
              </div>
            </div>
          </SlideIn>
        </div>
      </section>

      {/* ── SPOTLIGHT 2: VoiceSync ───────────────────────── */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <SlideIn direction="left" delay={0.1} className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute inset-0 bg-[#10B981] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative bg-[#0D0D10] border border-white/[0.06] rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-[11px] font-semibold text-[#5A5A60] uppercase tracking-wider">Voice Output</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[11px] text-[#10B981] font-medium">Generating</span>
                  </div>
                </div>
                <div className="flex items-end gap-1 justify-center mb-5 h-14">
                  {WAVEFORM_PARAMS.map((p, i) => (
                    <motion.div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-[#6A39C4] to-[#10B981]"
                      animate={{ height: [8, p.peak, 8] }}
                      transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  {['Adam', 'Pixie', 'Marcus', 'Luna'].map((voice, i) => (
                    <div key={voice} className={`flex items-center gap-2.5 p-3 rounded-xl border ${i === 0 ? 'bg-[#9758FF]/10 border-[#9758FF]/30' : 'bg-white/[0.02] border-white/[0.04]'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-[#9758FF] text-white' : 'bg-white/[0.05] text-[#7A7A80]'}`}>{voice[0]}</div>
                      <span className={`text-[12px] font-medium ${i === 0 ? 'text-white' : 'text-[#5A5A60]'}`}>{voice}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[#5A5A60] text-center">48kHz · Stereo · WAV Lossless</div>
              </div>
            </div>
          </SlideIn>

          <SlideIn direction="right" className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-3.5 py-1.5 mb-6">
              <Mic size={13} className="text-[#10B981]" />
              <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.15em]">VoiceSync AI</span>
            </div>
            <h2 className="text-[38px] sm:text-[44px] font-black tracking-tight mb-5 leading-tight">
              Your voice. Any voice.<br />
              <span className="text-[#10B981]">Crystal clear.</span>
            </h2>
            <p className="text-[16px] text-[#A1A1A5] leading-relaxed mb-8 max-w-[420px]">
              Convert any text into studio-quality speech, or upload a voice sample and let Vidora replicate it with precision.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: Wand2, label: 'Read Text Mode' },
                { icon: Cpu, label: 'Mimic Any Voice' },
                { icon: Zap, label: 'Speed Control' },
                { icon: Layers, label: 'Lossless Export' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#10B981]" />
                  </div>
                  <span className="text-[13px] text-[#C4C4C8] font-medium">{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen('CREATE_ACCOUNT')} className="flex items-center gap-2 text-[#10B981] font-bold text-[15px] hover:gap-3 transition-all group">
              Explore VoiceSync <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SlideIn>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp>
            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[32px] p-10 sm:p-14 grid grid-cols-2 md:grid-cols-4 gap-10">
              <StatItem to={50}   suffix="K+" label="Creations Made"      />
              <StatItem to={4}    suffix="K"  label="Max Output Quality"  />
              <StatItem to={4}    suffix=""   label="AI Voice Models"     />
              <StatItem to={0}    suffix=""   prefix="$" label="To Start" />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">Pricing</span>
            </div>
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-tight mb-4">Premium access. Clear pricing.</h2>
            <p className="text-[#A1A1A5] text-[17px] max-w-[420px] mx-auto mb-8">
              Choose the plan that scales with your creative output.
            </p>
            <div className="inline-flex items-center gap-1 bg-[#131316] border border-white/[0.05] rounded-full p-1">
              <button onClick={() => setBillingAnnual(false)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all ${!billingAnnual ? 'bg-white text-black' : 'text-[#7A7A80] hover:text-white'}`}>
                Monthly
              </button>
              <button onClick={() => setBillingAnnual(true)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2 ${billingAnnual ? 'bg-white text-black' : 'text-[#7A7A80] hover:text-white'}`}>
                Annual
                <span className="bg-[#10B981] text-white text-[10px] font-black px-2 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-6">
            {plans.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 0.08}>
                <div className={`rounded-[32px] p-8 flex flex-col h-full relative transition-all ${plan.highlight ? 'bg-[#131316] border-2 border-[#9758FF] shadow-[0_0_60px_rgba(151,88,255,0.15)]' : 'bg-[#131316]/50 border border-white/5 hover:border-white/10'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 bg-[#9758FF] text-white px-8 py-2 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 whitespace-nowrap">
                      <Sparkles size={13} fill="currentColor" /> Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2.5 rounded-xl ${plan.highlight ? 'bg-[#9758FF]/10 text-[#9758FF]' : 'bg-white/5 text-[#7A7A80]'}`}>
                      <plan.icon size={20} />
                    </div>
                    <h3 className="text-[18px] text-white font-bold">{plan.name}</h3>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-[40px] font-black text-white leading-none">${plan.price}</span>
                    <span className="text-[14px] text-[#5A5A60] font-bold tracking-wider mb-1 uppercase">/ {billingAnnual ? 'mo' : 'Month'}</span>
                  </div>
                  {billingAnnual && (
                    <div className="text-[12px] text-[#10B981] font-medium mb-4">Billed annually · Save ~${Math.round(plan.price * 12 * 0.25)}/yr</div>
                  )}
                  <p className="text-[14px] text-[#A1A1A5] leading-relaxed mb-8 mt-2">{plan.description}</p>
                  <div className="flex flex-col gap-3.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-3">
                        <CheckCircle2 size={15} className="text-[#9758FF] shrink-0 mt-0.5" />
                        <span className={`text-[13px] ${plan.highlight ? 'text-white font-medium' : 'text-[#EAEAEA]'}`}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button onClick={() => setScreen('CREATE_ACCOUNT')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className={`w-full py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto ${plan.highlight ? 'bg-[#9758FF] hover:bg-[#854EE6] text-white shadow-[0_8px_24px_rgba(151,88,255,0.35)]' : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'}`}>
                    {plan.cta}
                  </motion.button>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp className="mt-10 text-center">
            <p className="text-[#5A5A60] text-[13px]">
              Running on a Free plan? Enjoy <span className="text-white font-bold">3 videos/month</span> with watermarks.{' '}
              <span className="text-[#9758FF] italic"></span>
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-14">
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-tight mb-3">Creators love Vidora.</h2>
            <p className="text-[#A1A1A5] text-[17px]">Don't take our word for it.</p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.1}>
                <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[24px] p-7 flex flex-col gap-5 h-full hover:border-white/[0.1] transition-all">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, si) => <Star key={si} size={14} className="text-[#F59E0B] fill-[#F59E0B]" />)}
                  </div>
                  <p className="text-[14px] text-[#A1A1A5] leading-relaxed flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <div className="text-[14px] font-semibold text-white">{t.name}</div>
                      <div className="text-[12px] text-[#5A5A60]">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[400px] bg-[#9758FF] opacity-[0.06] blur-[130px] rounded-full" />
        </div>
        <FadeUp>
          <div className="max-w-[680px] mx-auto text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#9758FF]/10 border border-[#9758FF]/20 mb-8">
              <Sparkles size={28} className="text-[#9758FF]" />
            </div>
            <h2 className="text-[44px] sm:text-[54px] font-black tracking-tight mb-6 leading-tight">
              Start creating premium<br />content today.
            </h2>
            <p className="text-[17px] text-[#A1A1A5] mb-10 max-w-[440px] mx-auto">
              Join thousands of creators already using Vidora to build, brand, and scale their content.
            </p>
            <motion.button onClick={() => setScreen('CREATE_ACCOUNT')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-10 py-5 rounded-2xl font-black text-[17px] transition-colors shadow-[0_16px_50px_rgba(151,88,255,0.4)] inline-flex items-center gap-3">
              Create Your Free Account <ArrowRight size={20} />
            </motion.button>
            <p className="mt-5 text-[13px] text-[#5A5A60]">No credit card required. Up and running in 60 seconds.</p>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <img src="/logo.png" alt="Vidora" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {['Features', 'Pricing', 'Use Cases', 'Blog', 'Support'].map(link => (
                <a key={link} href="#" className="text-[13px] text-[#5A5A60] hover:text-white transition-colors">{link}</a>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.03]">
            <p className="text-[12px] text-[#3A3A40]">© {new Date().getFullYear()} Vidora. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-[12px] text-[#3A3A40] hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-[12px] text-[#3A3A40] hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
